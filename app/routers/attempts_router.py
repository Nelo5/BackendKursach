from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from .. import models, schemas
from ..dependencies import get_current_active_user, get_teacher_user

router = APIRouter(prefix="/attempts", tags=["Attempts"])

def calculate_closed_question_score(question: models.Question, selected_options: List[int]) -> float:
    """Оценка закрытого вопроса"""
    correct_options = set(question.closed_question_data["correct"])
    selected = set(selected_options) if selected_options else set()
    
    if selected == correct_options:
        return question.points
    return 0

def calculate_open_question_score(question: models.Question, answer_text: str) -> float:
    """Оценка открытого вопроса по ключевым словам"""
    keywords = question.open_question_data["keywords"]
    case_sensitive = question.open_question_data.get("case_sensitive", False)
    
    if not case_sensitive:
        answer_text = answer_text.lower()
        keywords = [k.lower() for k in keywords]
    
    found_keywords = sum(1 for kw in keywords if kw in answer_text)
    if found_keywords == 0:
        return 0
    return (found_keywords / len(keywords)) * question.points

def get_attempt_number(attempt_id: int, student_id: int, test_id: int, db: Session) -> int:
    """Получить номер попытки для студента по конкретному тесту"""
    attempts = db.query(models.TestAttempt).filter(
        models.TestAttempt.student_id == student_id,
        models.TestAttempt.test_id == test_id,
        models.TestAttempt.is_completed == True,
        models.TestAttempt.id <= attempt_id
    ).count()
    return attempts

def calculate_time_spent(started_at: datetime, completed_at: datetime) -> float:
    """Рассчитать время в минутах между началом и завершением"""
    if not completed_at:
        return None
    delta = completed_at - started_at
    return round(delta.total_seconds() / 60, 2)

def get_answer_detail(answer: models.Answer, question: models.Question) -> schemas.AnswerDetail:
    """Сформировать детальную информацию об ответе"""
    correct_answer_text = None
    correct_options = None
    
    if question.question_type == models.QuestionType.CLOSED:
        correct_options = question.closed_question_data["correct"]
        correct_answer_text = ", ".join(
            [question.closed_question_data["options"][i] for i in correct_options]
        )
    else:  # OPEN
        correct_answer_text = ", ".join(question.open_question_data["keywords"])
    
    return schemas.AnswerDetail(
        question_id=question.id,
        question_text=question.question_text,
        question_type=question.question_type,
        points=question.points,
        points_earned=answer.points_earned,
        is_correct=answer.is_correct,
        user_answer=answer.answer_text,
        selected_options=answer.selected_options,
        correct_answer=correct_answer_text,
        correct_options=correct_options
    )

# ==================== Эндпоинты для студентов ====================

@router.get("/my-tests-history", response_model=List[schemas.AttemptHistoryResponse])
def get_my_tests_history(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получить историю попыток студента по всем тестам.
    Показывает сводку по каждому тесту: лучший результат, количество попыток и т.д.
    """
    if current_user.role != models.UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    # Получаем все завершенные попытки студента
    attempts = db.query(models.TestAttempt).filter(
        models.TestAttempt.student_id == current_user.id,
        models.TestAttempt.is_completed == True
    ).options(joinedload(models.TestAttempt.test)).all()
    
    # Группируем по тестам
    tests_history = {}
    for attempt in attempts:
        test_id = attempt.test_id
        if test_id not in tests_history:
            tests_history[test_id] = {
                "test_id": test_id,
                "test_title": attempt.test.title,
                "scores": [],
                "attempts_count": 0,
                "last_attempt_date": None
            }
        
        tests_history[test_id]["scores"].append(attempt.score)
        tests_history[test_id]["attempts_count"] += 1
        if not tests_history[test_id]["last_attempt_date"] or \
           attempt.completed_at > tests_history[test_id]["last_attempt_date"]:
            tests_history[test_id]["last_attempt_date"] = attempt.completed_at
    
    # Формируем ответ
    result = []
    for test_id, data in tests_history.items():
        best_score = max(data["scores"])
        best_score_percentage = (best_score / data["scores"][0] * 100) if data["scores"] else 0
        # Находим максимальный балл за тест
        max_score = db.query(models.Test).filter(models.Test.id == test_id).first().max_score
        
        result.append(schemas.AttemptHistoryResponse(
            test_id=test_id,
            test_title=data["test_title"],
            best_score=best_score,
            best_score_percentage=(best_score / max_score) * 100,
            attempts_count=data["attempts_count"],
            last_attempt_date=data["last_attempt_date"]
        ))
    
    return result

@router.get("/my-attempts/{test_id}", response_model=schemas.StudentTestAttemptsSummary)
def get_my_test_attempts(
    test_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получить список всех попыток студента по конкретному тесту.
    Видит: номер попытки, время прохождения, набранные баллы.
    """
    if current_user.role != models.UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    # Проверяем существование теста
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Получаем все завершенные попытки студента по этому тесту
    attempts = db.query(models.TestAttempt).filter(
        models.TestAttempt.student_id == current_user.id,
        models.TestAttempt.test_id == test_id,
        models.TestAttempt.is_completed == True
    ).order_by(models.TestAttempt.completed_at.desc()).all()
    
    if not attempts:
        raise HTTPException(status_code=404, detail="No attempts found for this test")
    
    # Формируем список попыток с номерами
    attempt_list = []
    scores = []
    
    for idx, attempt in enumerate(attempts, 1):
        attempt_number = get_attempt_number(attempt.id, current_user.id, test_id, db)
        percentage = (attempt.score / attempt.max_possible_score) * 100 if attempt.score else 0
        scores.append(attempt.score if attempt.score else 0)
        
        attempt_list.append(schemas.StudentAttemptListItem(
            attempt_id=attempt.id,
            attempt_number=attempt_number,
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
            score=attempt.score,
            max_possible_score=attempt.max_possible_score,
            percentage=percentage
        ))
    
    # Рассчитываем статистику
    best_score = max(scores) if scores else None
    average_score = sum(scores) / len(scores) if scores else 0
    
    return schemas.StudentTestAttemptsSummary(
        test_id=test_id,
        test_title=test.title,
        best_score=best_score,
        average_score=average_score,
        total_attempts=len(attempts),
        attempts=attempt_list
    )

@router.get("/my-attempt-detail/{attempt_id}", response_model=schemas.AttemptDetailResponse)
def get_my_attempt_detail(
    attempt_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получить детальную информацию о конкретной попытке студента.
    Видит: все ответы, правильные ответы, набранные баллы по каждому вопросу.
    """
    if current_user.role != models.UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    # Получаем попытку с связанными данными
    attempt = db.query(models.TestAttempt).filter(
        models.TestAttempt.id == attempt_id,
        models.TestAttempt.student_id == current_user.id,
        models.TestAttempt.is_completed == True
    ).options(
        joinedload(models.TestAttempt.test),
        joinedload(models.TestAttempt.answers).joinedload(models.Answer.question)
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # Получаем номер попытки
    attempt_number = get_attempt_number(attempt.id, current_user.id, attempt.test_id, db)
    
    # Формируем детальные ответы
    answers_detail = []
    for answer in attempt.answers:
        if answer.question:
            answers_detail.append(get_answer_detail(answer, answer.question))
    
    # Рассчитываем процент
    percentage = (attempt.score / attempt.max_possible_score) * 100 if attempt.score else 0
    time_spent = calculate_time_spent(attempt.started_at, attempt.completed_at)
    
    return schemas.AttemptDetailResponse(
        attempt_id=attempt.id,
        attempt_number=attempt_number,
        test_id=attempt.test_id,
        test_title=attempt.test.title,
        score=attempt.score,
        max_possible_score=attempt.max_possible_score,
        percentage=percentage,
        started_at=attempt.started_at,
        completed_at=attempt.completed_at,
        time_spent_minutes=time_spent,
        answers=answers_detail
    )

# ==================== Эндпоинты для преподавателей ====================

@router.get("/teacher/test/{test_id}/summary", response_model=schemas.TestAttemptsSummary)
def get_test_attempts_summary(
    test_id: int,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """
    Получить сводку по всем попыткам теста (для преподавателя).
    Видит: имя студента, номер попытки, время прохождения, баллы.
    """
    # Проверяем доступ к тесту
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test.author_id != teacher.id and teacher.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to view this test")
    
    # Получаем все завершенные попытки по тесту
    attempts = db.query(models.TestAttempt).filter(
        models.TestAttempt.test_id == test_id,
        models.TestAttempt.is_completed == True
    ).options(
        joinedload(models.TestAttempt.student),
        joinedload(models.TestAttempt.test)
    ).order_by(
        models.TestAttempt.completed_at.desc()
    ).all()
    
    if not attempts:
        return schemas.TestAttemptsSummary(
            test_id=test_id,
            test_title=test.title,
            total_attempts=0,
            average_score=0,
            highest_score=0,
            lowest_score=0,
            attempts=[]
        )
    
    # Формируем список попыток для преподавателя
    attempt_list = []
    scores = []
    
    for attempt in attempts:
        # Получаем номер попытки для этого студента по этому тесту
        attempt_number = get_attempt_number(attempt.id, attempt.student_id, test_id, db)
        percentage = (attempt.score / attempt.max_possible_score) * 100 if attempt.score else 0
        scores.append(attempt.score if attempt.score else 0)
        
        attempt_list.append(schemas.TeacherAttemptListItem(
            attempt_id=attempt.id,
            attempt_number=attempt_number,
            student_id=attempt.student_id,
            student_name=attempt.student.username,
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
            score=attempt.score,
            max_possible_score=attempt.max_possible_score,
            percentage=percentage
        ))
    
    # Рассчитываем статистику
    average_score = sum(scores) / len(scores) if scores else 0
    highest_score = max(scores) if scores else 0
    lowest_score = min(scores) if scores else 0
    
    return schemas.TestAttemptsSummary(
        test_id=test_id,
        test_title=test.title,
        total_attempts=len(attempts),
        average_score=round(average_score, 2),
        highest_score=highest_score,
        lowest_score=lowest_score,
        attempts=attempt_list
    )

@router.get("/teacher/student/{student_id}/test/{test_id}/attempts", response_model=schemas.StudentTestAttemptsSummary)
def get_student_test_attempts(
    student_id: int,
    test_id: int,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """
    Получить все попытки конкретного студента по конкретному тесту (для преподавателя).
    """
    # Проверяем существование студента
    student = db.query(models.User).filter(
        models.User.id == student_id,
        models.User.role == models.UserRole.STUDENT
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Проверяем доступ к тесту
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test.author_id != teacher.id and teacher.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to view this test")
    
    # Получаем попытки студента
    attempts = db.query(models.TestAttempt).filter(
        models.TestAttempt.student_id == student_id,
        models.TestAttempt.test_id == test_id,
        models.TestAttempt.is_completed == True
    ).order_by(models.TestAttempt.completed_at.desc()).all()
    
    if not attempts:
        raise HTTPException(status_code=404, detail="No attempts found for this student")
    
    # Формируем список попыток
    attempt_list = []
    scores = []
    
    for attempt in attempts:
        attempt_number = get_attempt_number(attempt.id, student_id, test_id, db)
        percentage = (attempt.score / attempt.max_possible_score) * 100 if attempt.score else 0
        scores.append(attempt.score if attempt.score else 0)
        
        attempt_list.append(schemas.StudentAttemptListItem(
            attempt_id=attempt.id,
            attempt_number=attempt_number,
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
            score=attempt.score,
            max_possible_score=attempt.max_possible_score,
            percentage=percentage
        ))
    
    best_score = max(scores) if scores else None
    average_score = sum(scores) / len(scores) if scores else 0
    
    return schemas.StudentTestAttemptsSummary(
        test_id=test_id,
        test_title=test.title,
        best_score=best_score,
        average_score=average_score,
        total_attempts=len(attempts),
        attempts=attempt_list
    )

@router.get("/teacher/attempt-detail/{attempt_id}", response_model=schemas.AttemptDetailResponse)
def get_attempt_detail_for_teacher(
    attempt_id: int,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """
    Получить детальную информацию о попытке студента (для преподавателя).
    Видит: все ответы студента, правильные ответы, баллы по каждому вопросу.
    """
    # Получаем попытку с связанными данными
    attempt = db.query(models.TestAttempt).filter(
        models.TestAttempt.id == attempt_id,
        models.TestAttempt.is_completed == True
    ).options(
        joinedload(models.TestAttempt.student),
        joinedload(models.TestAttempt.test),
        joinedload(models.TestAttempt.answers).joinedload(models.Answer.question)
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # Проверяем доступ преподавателя к тесту
    test = attempt.test
    if test.author_id != teacher.id and teacher.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to view this attempt")
    
    # Получаем номер попытки
    attempt_number = get_attempt_number(attempt.id, attempt.student_id, attempt.test_id, db)
    
    # Формируем детальные ответы
    answers_detail = []
    for answer in attempt.answers:
        if answer.question:
            answers_detail.append(get_answer_detail(answer, answer.question))
    
    # Рассчитываем процент и время
    percentage = (attempt.score / attempt.max_possible_score) * 100 if attempt.score else 0
    time_spent = calculate_time_spent(attempt.started_at, attempt.completed_at)
    
    return schemas.AttemptDetailResponse(
        attempt_id=attempt.id,
        attempt_number=attempt_number,
        student_id=attempt.student_id,
        student_name=attempt.student.username,
        test_id=attempt.test_id,
        test_title=test.title,
        score=attempt.score,
        max_possible_score=attempt.max_possible_score,
        percentage=percentage,
        started_at=attempt.started_at,
        completed_at=attempt.completed_at,
        time_spent_minutes=time_spent,
        answers=answers_detail
    )

@router.get("/teacher/student/{student_id}/summary")
def get_student_overall_summary(
    student_id: int,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """
    Получить общую сводку по всем тестам для конкретного студента.
    """
    student = db.query(models.User).filter(
        models.User.id == student_id,
        models.User.role == models.UserRole.STUDENT
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Получаем все попытки студента
    attempts = db.query(models.TestAttempt).filter(
        models.TestAttempt.student_id == student_id,
        models.TestAttempt.is_completed == True
    ).options(joinedload(models.TestAttempt.test)).all()
    
    # Группируем по тестам
    tests_summary = []
    tests_data = {}
    
    for attempt in attempts:
        test_id = attempt.test_id
        if test_id not in tests_data:
            # Проверяем доступ преподавателя к тесту
            if attempt.test.author_id != teacher.id and teacher.role != models.UserRole.ADMIN:
                continue
                
            tests_data[test_id] = {
                "test_title": attempt.test.title,
                "scores": [],
                "attempts_count": 0,
                "best_score": 0
            }
        
        tests_data[test_id]["scores"].append(attempt.score)
        tests_data[test_id]["attempts_count"] += 1
    
    # Формируем результат
    for test_id, data in tests_data.items():
        best_score = max(data["scores"]) if data["scores"] else 0
        average_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0
        
        tests_summary.append({
            "test_id": test_id,
            "test_title": data["test_title"],
            "best_score": best_score,
            "average_score": round(average_score, 2),
            "attempts_count": data["attempts_count"]
        })
    
    return {
        "student_id": student_id,
        "student_name": student.username,
        "total_tests": len(tests_summary),
        "tests_summary": tests_summary
    }

# ==================== Существующие эндпоинты ====================

@router.post("/start")
def start_attempt(
    attempt_data: schemas.AttemptStart,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Начать прохождение теста"""
    if current_user.role != models.UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can take tests")
    
    test = db.query(models.Test).filter(models.Test.id == attempt_data.test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test.status != models.TestStatus.PUBLISHED:
        raise HTTPException(status_code=403, detail="Test not available")
    
    if test not in current_user.accessible_tests:
        raise HTTPException(status_code=403, detail="No access to this test")
    
    # Проверяем незавершенные попытки
    unfinished = db.query(models.TestAttempt).filter(
        models.TestAttempt.student_id == current_user.id,
        models.TestAttempt.test_id == test.id,
        models.TestAttempt.is_completed == False
    ).first()
    
    if unfinished:
        return {"attempt_id": unfinished.id, "message": "Continuing existing attempt"}
    
    # Создаем новую попытку
    attempt = models.TestAttempt(
        student_id=current_user.id,
        test_id=test.id,
        max_possible_score=test.max_score
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    return {"attempt_id": attempt.id, "message": "Attempt started"}

@router.post("/submit")
def submit_attempt(
    submission: schemas.AttemptSubmit,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Завершить тест и отправить ответы"""
    attempt = db.query(models.TestAttempt).filter(
        models.TestAttempt.id == submission.attempt_id,
        models.TestAttempt.student_id == current_user.id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.is_completed:
        raise HTTPException(status_code=400, detail="Attempt already completed")
    
    test = attempt.test
    total_score = 0
    
    # Сохраняем ответы и считаем баллы
    for answer_data in submission.answers:
        question = db.query(models.Question).filter(models.Question.id == answer_data.question_id).first()
        if not question or question.test_id != test.id:
            continue
        
        is_correct = False
        points_earned = 0
        
        if question.question_type == models.QuestionType.CLOSED:
            points_earned = calculate_closed_question_score(question, answer_data.selected_options)
            is_correct = points_earned == question.points
        else:  # OPEN
            points_earned = calculate_open_question_score(question, answer_data.answer_text or "")
            is_correct = points_earned == question.points
        
        answer = models.Answer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_text=answer_data.answer_text,
            selected_options=answer_data.selected_options,
            is_correct=is_correct,
            points_earned=points_earned
        )
        db.add(answer)
        total_score += points_earned
    
    # Завершаем попытку
    attempt.score = total_score
    attempt.is_completed = True
    attempt.completed_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "attempt_id": attempt.id,
        "score": total_score,
        "max_score": test.max_score,
        "percentage": (total_score / test.max_score) * 100
    }