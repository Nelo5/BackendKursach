from copy import deepcopy
import copy
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app import models, schemas
from app.database import get_db  # если нужен импорт, но здесь не используется


# ===================== USERS =====================
def get_all_users_logic(db: Session, skip: int, limit: int) -> List[models.User]:
    """Получить всех студентов (для учителя/админа)"""
    return db.query(models.User)\
        .filter(models.User.role == models.UserRole.student)\
        .offset(skip)\
        .limit(limit)\
        .all()


# ===================== CREATE =====================
def create_test_logic(db: Session, teacher: models.User, test_data: schemas.TestCreate) -> models.Test:
    """Создать новый тест"""

    questions = db.query(models.Question).filter(models.Question.id.in_(test_data.question_ids)).all()
    if len(questions) != len(test_data.question_ids):
        raise HTTPException(400, "One or more question IDs are invalid")

    total_points = sum(q.points for q in questions)
    if abs(total_points - test_data.max_score) > 0.01:
        raise HTTPException(400, "Sum of question points must equal max_score")

    db_test = models.Test(
        title=test_data.title,
        subject=test_data.subject,
        description=test_data.description,
        max_score=test_data.max_score,
        author_id=teacher.id,
        status=models.TestStatus.draft
    )
    db.add(db_test)
    db.flush()

    db_test.questions = questions

    db.commit()
    db.refresh(db_test)
    return db_test


# ===================== UPDATE =====================
def update_test_logic(db: Session, teacher: models.User, test_id: int, test_data: schemas.TestUpdate) -> models.Test:
    """Обновить тест – можно изменить список вопросов (с версионированием)"""
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(404, "Test not found")
    
    # Проверка прав: только автор может изменять тест
    if test.author_id != teacher.id:
        raise HTTPException(403, "Not authorized")
    
    # Проверка статуса: только черновик можно редактировать
    if test.status != models.TestStatus.draft:
        raise HTTPException(403, "Cannot update test that is not in draft status")

    # Обновляем вопросы (без версионирования, так как это черновик)
    if test_data.question_ids is not None:
        new_questions = db.query(models.Question).filter(models.Question.id.in_(test_data.question_ids)).all()
        if len(new_questions) != len(test_data.question_ids):
            raise HTTPException(400, "One or more question IDs are invalid")
        test.questions = new_questions

    # Обновляем скалярные поля
    for field, value in test_data.dict(exclude_unset=True).items():
        if field != "question_ids":
            setattr(test, field, value)

    db.commit()
    db.refresh(test)
    return test


# # ===================== STATUS =====================
# def update_test_status_logic(db: Session, teacher: models.User, test_id: int, status_update: schemas.TestStatusUpdate) -> dict:
#     """Изменить статус теста"""
#     test = db.query(models.Test).filter(models.Test.id == test_id).first()
#     if not test:
#         raise HTTPException(404, "Test not found")

#     if test.author_id != teacher.id and teacher.role != models.UserRole.ADMIN:
#         raise HTTPException(403, "Not authorized")

#     if status_update.status == models.TestStatus.PUBLISHED and not test.questions:
#         raise HTTPException(400, "Cannot publish empty test")

#     test.status = status_update.status
#     db.commit()

#     return {"message": f"Status updated to {status_update.status.value}"}


# ===================== ACCESS =====================
def grant_test_access_logic(db: Session, teacher: models.User, test_id: int, access_data: schemas.TestAccessGrant) -> dict:
    """Предоставить доступ к тесту студентам"""
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(404, "Test not found")

    if test.author_id != teacher.id:
        raise HTTPException(403, "Not authorized")

    students = db.query(models.User).filter(
        models.User.id.in_(access_data.student_ids),
        models.User.role == models.UserRole.student
    ).all()

    test.accessible_by.extend(students)
    db.commit()

    return {"message": f"Access granted to {len(students)} students"}


# ===================== STUDENT =====================
def get_available_tests_logic(db: Session, current_user: models.User, subject: Optional[str] = None) -> List[models.Test]:
    """Список тестов, доступных пользователю (для студента – только опубликованные и с доступом)"""
    query = db.query(models.Test)

    if current_user.role == models.UserRole.student:
        query = query.filter(models.Test.status == models.TestStatus.published).filter(models.Test.accessible_by.any(id=current_user.id))
    
    elif current_user.role == models.UserRole.teacher:
        query = query.filter(models.Test.author_id == current_user.id)

    if subject:
        query = query.filter(models.Test.subject == subject)

    return query.all()


def get_unique_subjects_logic(db: Session) -> List[str]:
    """Получить уникальные предметы из тестов"""
    return [s[0] for s in db.query(models.Test.subject).distinct().all()]


def get_test_details_logic(db: Session, current_user: models.User, test_id: int) -> models.Test:
    """Детали теста с проверкой прав и очисткой ответов для студента."""
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(404, "Test not found")

    if current_user.role == models.UserRole.student:
        if test.status != models.TestStatus.published:
            raise HTTPException(403, "Test not available")
        if test not in current_user.accessible_tests:
            raise HTTPException(403, "No access")

        # Очищаем правильные ответы в каждом вопросе
        for question in test.questions:
            sanitize_question_for_student(question)

    return test



def sanitize_question_for_student(question: models.Question) -> None:
    """Удаляет из вопроса правильные ответы (correct, weight, keywords) для студента."""
    if not question.data:
        return
    safe_data = copy.deepcopy(question.data)  # не мутируем оригинал
    qtype = question.question_type

    if qtype == models.QuestionType.single_choice:
        safe_data.pop("correct", None)
    elif qtype == models.QuestionType.multiple_choice:
        for opt in safe_data.get("options", []):
            opt.pop("weight", None)
    elif qtype == models.QuestionType.open:
        safe_data.pop("keywords", None)

    question.data = safe_data

    
# ===================== TEACHER =====================
def get_my_tests_logic(db: Session, teacher: models.User) -> List[models.Test]:
    """Список тестов текущего учителя"""
    return db.query(models.Test).filter(models.Test.author_id == teacher.id).all()


def get_my_tests_with_statistics_logic(db: Session, teacher: models.User) -> List[dict]:
    """Тесты учителя со статистикой по попыткам"""
    tests = db.query(models.Test).filter(models.Test.author_id == teacher.id).all()
    result = []

    for test in tests:
        stats = db.query(
            func.count(models.TestAttempt.id),
            func.avg(models.TestAttempt.score),
            func.max(models.TestAttempt.score),
            func.min(models.TestAttempt.score)
        ).filter(
            models.TestAttempt.test_id == test.id,
            models.TestAttempt.is_completed == True
        ).first()

        unique_students = db.query(
            func.count(models.TestAttempt.student_id.distinct())
        ).filter(
            models.TestAttempt.test_id == test.id,
            models.TestAttempt.is_completed == True
        ).scalar()

        result.append({
            "test_id": test.id,
            "title": test.title,
            "subject": test.subject,
            "status": test.status,
            "total_attempts": stats[0] or 0,
            "unique_students": unique_students or 0,
            "average_score": round(stats[1], 2) if stats[1] else 0,
            "highest_score": stats[2] or 0,
            "lowest_score": stats[3] or 0
        })

    return result