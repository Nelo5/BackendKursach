from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app import models, schemas
from app.database import get_db  # если нужен импорт, но здесь не используется



def create_question_logic(db: Session, question_data: schemas.QuestionCreate) -> models.Question:
    """Создать новый вопрос (не привязанный к тесту)"""
    db_question = models.Question(
        question_text=question_data.question_text,
        question_type=question_data.question_type,
        points=question_data.points,
        data=question_data.data
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question


def get_questions_logic(db: Session, skip: int = 0, limit: int = 100) -> List[models.Question]:
    """Получить список всех вопросов (для учителя/админа)"""
    return db.query(models.Question).offset(skip).limit(limit).all()


def get_question_logic(db: Session, question_id: int) -> models.Question:
    """Получить один вопрос по ID"""
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(404, "Question not found")
    return question


def update_question_logic(db: Session, question_id: int, question_data: schemas.QuestionUpdate) -> models.Question:
    """Обновить вопрос"""
    question = get_question_logic(db, question_id)
    for field, value in question_data.dict(exclude_unset=True).items():
        setattr(question, field, value)
    db.commit()
    db.refresh(question)
    return question


def delete_question_logic(db: Session, question_id: int) -> None:
    """Удалить вопрос (если он не используется в тестах)"""
    question = get_question_logic(db, question_id)
    if question.tests:
        raise HTTPException(400, "Cannot delete question that is used in tests")
    db.delete(question)
    db.commit()