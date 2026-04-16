from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, get_teacher_user

from app.questions.utils import (
    create_question_logic,
    get_questions_logic,
    get_question_logic,
    update_question_logic,
    delete_question_logic,
)

# Можно создать отдельный роутер для вопросов
router = APIRouter(prefix="/questions", tags=["Questions"])

@router.post("/", response_model=schemas.QuestionResponse)
def create_question(
    question_data: schemas.QuestionCreate,
    teacher: models.User = Depends(get_teacher_user),  # только учитель/админ
    db: Session = Depends(get_db)
):
    return create_question_logic(db, question_data)

@router.get("/", response_model=List[schemas.QuestionResponse])
def list_questions(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),  # любой авторизованный
    db: Session = Depends(get_db)
):
    return get_questions_logic(db, skip, limit)

@router.get("/{question_id}", response_model=schemas.QuestionResponse)
def get_question(
    question_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return get_question_logic(db, question_id)

@router.patch("/{question_id}", response_model=schemas.QuestionResponse)
def update_question(
    question_id: int,
    question_data: schemas.QuestionUpdate,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    return update_question_logic(db, question_id, question_data)

@router.delete("/{question_id}")
def delete_question(
    question_id: int,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    delete_question_logic(db, question_id)
    return {"message": "Question deleted successfully"}