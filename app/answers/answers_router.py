# answers.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/answers", tags=["Answers"])


@router.post("/{attempt_id}/questions/{question_id}", response_model=schemas.AnswerResponse, status_code=201)
def create_answer(
    attempt_id: int,
    question_id: int,
    answer_data: schemas.AnswerSubmit,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Создать новый ответ на вопрос в рамках незавершённой попытки.
    Если ответ уже существует, возвращает 409 Conflict.
    """
    # Проверяем попытку
    attempt = db.query(models.TestAttempt).filter(
        models.TestAttempt.id == attempt_id,
        models.TestAttempt.student_id == current_user.id,
        models.TestAttempt.is_completed == False
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Active attempt not found")

    # Проверяем принадлежность вопроса тесту
    test = attempt.test
    question_ids = [q.id for q in test.questions]
    if question_id not in question_ids:
        raise HTTPException(status_code=400, detail="Question is not part of this test")

    # Проверяем, нет ли уже ответа
    existing = db.query(models.Answer).filter(
        models.Answer.attempt_id == attempt_id,
        models.Answer.question_id == question_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Answer already exists. Use PATCH to update.")

    # Создаём новый ответ
    new_answer = models.Answer(
        attempt_id=attempt_id,
        question_id=question_id,
        answer_data=answer_data.answer_data 
        # is_correct и points_earned будут вычислены при submit
    )
    db.add(new_answer)
    db.commit()
    db.refresh(new_answer)

    return schemas.AnswerResponse(
        question_id=new_answer.question_id,
        answer_data=answer_data.answer_data,
        is_correct=False,  # пока не оценено
        points_earned=0.0
    )


@router.patch("/{attempt_id}/questions/{question_id}", response_model=schemas.AnswerResponse)
def update_answer(
    attempt_id: int,
    question_id: int,
    answer_data: schemas.AnswerSubmit,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Частично обновить существующий ответ на вопрос.
    Если ответ не найден, возвращает 404.
    """
    attempt = db.query(models.TestAttempt).filter(
        models.TestAttempt.id == attempt_id,
        models.TestAttempt.student_id == current_user.id,
        models.TestAttempt.is_completed == False
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Active attempt not found")

    # Находим существующий ответ
    answer = db.query(models.Answer).filter(
        models.Answer.attempt_id == attempt_id,
        models.Answer.question_id == question_id
    ).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")

    # Обновляем только переданные поля
    if answer_data.answer_data is not None:
        answer.answer_data = answer_data.answer_data

    db.commit()
    db.refresh(answer)

    return schemas.AnswerResponse(
        question_id=answer.question_id,
        answer_data=answer.answer_data,
        is_correct=False,  # пока не оценено
        points_earned=0.0
    )


@router.get("/{attempt_id}/questions/{question_id}", response_model=schemas.AnswerResponse)
def get_answer(
    attempt_id: int,
    question_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить текущий сохранённый ответ на вопрос."""
    attempt = db.query(models.TestAttempt).filter(
        models.TestAttempt.id == attempt_id,
        models.TestAttempt.student_id == current_user.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    answer = db.query(models.Answer).filter(
        models.Answer.attempt_id == attempt_id,
        models.Answer.question_id == question_id
    ).first()

    if not answer:
        # Возвращаем ответ с пустыми значениями
        return schemas.AnswerResponse(
            question_id=question_id,
            answer_data = None,
            is_correct=False,
            points_earned=0.0
        )

    # Для завершённых попыток показываем реальные is_correct и points_earned
    is_correct = answer.is_correct if attempt.is_completed else False
    points_earned = answer.points_earned if attempt.is_completed else 0.0

    return schemas.AnswerResponse(
        question_id=answer.question_id,
        answer_data=answer.answer_data or {},
        is_correct=answer.is_correct if attempt.is_completed else False,
        points_earned=answer.points_earned if attempt.is_completed else 0.0
    )


@router.delete("/{attempt_id}/questions/{question_id}", response_model=dict)
def delete_answer(
    attempt_id: int,
    question_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить сохранённый ответ (сбросить)."""
    attempt = db.query(models.TestAttempt).filter(
        models.TestAttempt.id == attempt_id,
        models.TestAttempt.student_id == current_user.id,
        models.TestAttempt.is_completed == False
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Active attempt not found")

    answer = db.query(models.Answer).filter(
        models.Answer.attempt_id == attempt_id,
        models.Answer.question_id == question_id
    ).first()
    if answer:
        db.delete(answer)
        db.commit()
    return {"message": "Answer deleted", "attempt_id": attempt_id, "question_id": question_id}