# attempts.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime

from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, get_teacher_user
from app.attempts.utils import (
    calculate_question_score,
    get_attempt_number,
    calculate_time_spent,
    build_answer_detail
)

router = APIRouter(prefix="/attempts", tags=["Attempts"])


# ==================== СТУДЕНТ: УПРАВЛЕНИЕ ПОПЫТКАМИ ====================

@router.post("/start", response_model=dict)
def start_attempt(
    attempt_data: schemas.AttemptStart,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Начать прохождение теста (создать или вернуть незавершённую попытку)."""
    if current_user.role != models.UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can take tests")

    test = db.query(models.Test).filter(models.Test.id == attempt_data.test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test.status != models.TestStatus.published:
        raise HTTPException(status_code=403, detail="Test not available")
    if test not in current_user.accessible_tests:
        raise HTTPException(status_code=403, detail="No access to this test")

    # Проверяем существующую незавершённую попытку
    unfinished = db.query(models.TestAttempt).filter(
        models.TestAttempt.student_id == current_user.id,
        models.TestAttempt.test_id == test.id,
        models.TestAttempt.is_completed == False
    ).first()
    if unfinished:
        return {"attempt_id": unfinished.id, "message": "Continuing existing attempt"}

    # Создаём новую попытку
    attempt = models.TestAttempt(
        student_id=current_user.id,
        test_id=test.id
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return {"attempt_id": attempt.id, "message": "Attempt started"}


@router.post("/{attempt_id}/submit", response_model=dict)
def submit_attempt(
    attempt_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Завершить попытку, пересчитать баллы по сохранённым ответам.
       Все вопросы, на которые нет ответа, получают пустой ответ с 0 баллов.
    """
    # 1. Проверяем существование активной попытки
    attempt = db.query(models.TestAttempt).filter(
        models.TestAttempt.id == attempt_id,
        models.TestAttempt.student_id == current_user.id,
        models.TestAttempt.is_completed == False
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Active attempt not found")

    # 2. Загружаем тест и его вопросы (связь questions уже настроена)
    test = attempt.test
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # 3. Загружаем существующие ответы с привязкой к вопросам
    existing_answers = db.query(models.Answer).filter(
        models.Answer.attempt_id == attempt.id
    ).options(joinedload(models.Answer.question)).all()
    answers_by_qid = {ans.question_id: ans for ans in existing_answers}

    # 4. Для каждого вопроса теста создаём ответ, если его ещё нет
    for question in test.questions:
        if question.id not in answers_by_qid:
            empty_answer = models.Answer(
                attempt_id=attempt.id,
                question_id=question.id,
                answer_data={},      # пустой ответ
                points_earned=0.0,
                is_correct=False
            )
            db.add(empty_answer)
            answers_by_qid[question.id] = empty_answer

    # 5. Пересчитываем баллы по всем вопросам (используем свежесозданные ответы)
    total_score = 0.0
    for question in test.questions:
        answer = answers_by_qid.get(question.id)
        if answer:
            points = calculate_question_score(question, answer.answer_data)
            answer.points_earned = points
            answer.is_correct = (points == question.points)
            total_score += points
            db.add(answer)

    # 6. Завершаем попытку
    attempt.score = total_score
    attempt.is_completed = True
    attempt.completed_at = datetime.utcnow()
    db.commit()

    return {
        "attempt_id": attempt.id,
        "score": total_score,
        "max_score": test.max_score,
        "percentage": (total_score / test.max_score) * 100 if test.max_score else 0
    }


@router.get("/my", response_model=List[schemas.AttemptListItem])
def get_my_attempts(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Список всех попыток текущего студента (краткая информация)."""
    if current_user.role != models.UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    attempts = db.query(models.TestAttempt).filter(
        models.TestAttempt.student_id == current_user.id
    ).order_by(models.TestAttempt.started_at.desc()).all()

    result = []
    for attempt in attempts:
        attempt_number = get_attempt_number(attempt.id, current_user.id, attempt.test_id, db)
        test = attempt.test
        percentage = (attempt.score / test.max_score) * 100 if attempt.score and test.max_score else None
        result.append(schemas.AttemptListItem(
            attempt_id=attempt.id,
            attempt_number=attempt_number,
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
            score=attempt.score,
            percentage=percentage
        ))
    return result



# ==================== ПРЕПОДАВАТЕЛЬ: ПРОСМОТР ПОПЫТОК ====================

# @router.get("/teacher/test/{test_id}/summary", response_model=schemas.TestAttemptsSummary)
# def get_test_attempts_summary(
#     test_id: int,
#     teacher: models.User = Depends(get_teacher_user),
#     db: Session = Depends(get_db)
# ):
#     """Сводка по всем попыткам теста (для преподавателя)."""
#     test = db.query(models.Test).filter(models.Test.id == test_id).first()
#     if not test:
#         raise HTTPException(status_code=404, detail="Test not found")
#     if test.author_id != teacher.id and teacher.role != models.UserRole.admin:
#         raise HTTPException(status_code=403, detail="Not authorized to view this test")

#     attempts = db.query(models.TestAttempt).filter(
#         models.TestAttempt.test_id == test_id,
#         models.TestAttempt.is_completed == True
#     ).options(
#         joinedload(models.TestAttempt.student),
#         joinedload(models.TestAttempt.test)
#     ).order_by(models.TestAttempt.completed_at.desc()).all()

#     if not attempts:
#         return schemas.TestAttemptsSummary(
#             test_id=test_id,
#             test_title=test.title,
#             total_attempts=0,
#             average_score=0,
#             highest_score=0,
#             lowest_score=0,
#             attempts=[]
#         )

#     attempt_items = []
#     scores = []
#     for attempt in attempts:
#         attempt_number = get_attempt_number(attempt.id, attempt.student_id, test_id, db)
#         percentage = (attempt.score / test.max_score) * 100 if attempt.score else 0
#         scores.append(attempt.score or 0)
#         attempt_items.append(schemas.TeacherAttemptListItem(
#             attempt_id=attempt.id,
#             attempt_number=attempt_number,
#             student_id=attempt.student_id,
#             student_name=attempt.student.username,
#             started_at=attempt.started_at,
#             completed_at=attempt.completed_at,
#             score=attempt.score,
#             percentage=percentage
#         ))

#     avg_score = sum(scores) / len(scores) if scores else 0
#     return schemas.TestAttemptsSummary(
#         test_id=test_id,
#         test_title=test.title,
#         total_attempts=len(attempts),
#         average_score=round(avg_score, 2),
#         highest_score=max(scores) if scores else 0,
#         lowest_score=min(scores) if scores else 0,
#         attempts=attempt_items
#     )


# @router.get("/teacher/student/{student_id}/test/{test_id}/attempts", response_model=schemas.StudentTestAttemptsSummary)
# def get_student_test_attempts(
#     student_id: int,
#     test_id: int,
#     teacher: models.User = Depends(get_teacher_user),
#     db: Session = Depends(get_db)
# ):
#     """Все попытки конкретного студента по конкретному тесту."""
#     student = db.query(models.User).filter(
#         models.User.id == student_id,
#         models.User.role == models.UserRole.student
#     ).first()
#     if not student:
#         raise HTTPException(status_code=404, detail="Student not found")

#     test = db.query(models.Test).filter(models.Test.id == test_id).first()
#     if not test:
#         raise HTTPException(status_code=404, detail="Test not found")
#     if test.author_id != teacher.id and teacher.role != models.UserRole.admin:
#         raise HTTPException(status_code=403, detail="Not authorized to view this test")

#     attempts = db.query(models.TestAttempt).filter(
#         models.TestAttempt.student_id == student_id,
#         models.TestAttempt.test_id == test_id,
#         models.TestAttempt.is_completed == True
#     ).order_by(models.TestAttempt.completed_at.desc()).all()

#     if not attempts:
#         raise HTTPException(status_code=404, detail="No attempts found for this student")

#     attempt_items = []
#     scores = []
#     for attempt in attempts:
#         attempt_number = get_attempt_number(attempt.id, student_id, test_id, db)
#         percentage = (attempt.score / test.max_score) * 100 if attempt.score else 0
#         scores.append(attempt.score or 0)
#         attempt_items.append(schemas.StudentAttemptListItem(
#             attempt_id=attempt.id,
#             attempt_number=attempt_number,
#             started_at=attempt.started_at,
#             completed_at=attempt.completed_at,
#             score=attempt.score,
#             percentage=percentage
#         ))

#     best_score = max(scores) if scores else None
#     avg_score = sum(scores) / len(scores) if scores else 0

#     return schemas.StudentTestAttemptsSummary(
#         test_id=test_id,
#         test_title=test.title,
#         best_score=best_score,
#         average_score=avg_score,
#         total_attempts=len(attempts),
#         attempts=attempt_items
#     )


@router.get("/{attempt_id}", response_model=schemas.AttemptDetailResponse)
def get_attempt_detail(
    attempt_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить детальную информацию о попытке (для студента – свои, для преподавателя/админа – любые доступные)."""
    # 1. Загружаем попытку со всеми связями
    attempt = db.query(models.TestAttempt).filter(
        models.TestAttempt.id == attempt_id,  # можно убрать, если нужны и незавершённые
    ).options(
        joinedload(models.TestAttempt.student),
        joinedload(models.TestAttempt.test),
        joinedload(models.TestAttempt.answers).joinedload(models.Answer.question)
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # 2. Проверка прав доступа
    if current_user.role == models.UserRole.student:
        # Студент видит только свои попытки
        if attempt.student_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == models.UserRole.teacher:
        # Преподаватель видит попытки только своих тестов
        if attempt.test.author_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this attempt")
    elif current_user.role == models.UserRole.admin:
        # Администратор имеет полный доступ
        pass
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # 3. Формируем ответ (единый для всех ролей)
    attempt_number = get_attempt_number(attempt.id, attempt.student_id, attempt.test_id, db)
    answers_detail = [build_answer_detail(ans, ans.question) for ans in attempt.answers if ans.question]

    percentage = (attempt.score / attempt.test.max_score) * 100 if attempt.score else 0
    time_spent = calculate_time_spent(attempt.started_at, attempt.completed_at)

    # Для студента student_id и student_name можно не возвращать (или вернуть его же имя)
    return schemas.AttemptDetailResponse(
        attempt_id=attempt.id,
        attempt_number=attempt_number,
        student_id=attempt.student_id if current_user.role != models.UserRole.student else None,
        student_name=attempt.student.name + " " + attempt.student.surname if current_user.role != models.UserRole.student else None,
        test_id=attempt.test_id,
        test_title=attempt.test.title,
        score=attempt.score,
        percentage=percentage,
        started_at=attempt.started_at,
        completed_at=attempt.completed_at,
        time_spent_minutes=time_spent,
        answers=answers_detail
    )