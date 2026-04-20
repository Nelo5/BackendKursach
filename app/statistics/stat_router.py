# routers/statistics.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func as sql_func
from typing import List, Dict, Any
from collections import defaultdict

from app.database import get_db
from app.models import User, Test, TestAttempt, Answer, Question, UserRole, UserStatus
from app.schemas import (
    TestAttemptsSummary, 
    TeacherAttemptListItem,
    UserResponse
)
from app.dependencies import get_teacher_user

router = APIRouter(prefix="/statistics", tags=["statistics"])


# ===================== HELPER FUNCTIONS =====================

def check_teacher_access(current_user: User, test_id: int, db: Session):
    """Проверяет, имеет ли учитель доступ к тесту"""
 
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found"
        )
    
    if test.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this test's statistics"
        )
    
    return True


# ===================== ENDPOINTS =====================

@router.get("/test/{test_id}/summary", response_model=TestAttemptsSummary)
async def get_test_statistics_summary(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """
    Эндпоинт 1: Общая статистика по тесту
    
    Возвращает:
    - Количество попыток
    - Средний балл
    - Максимальный балл
    - Минимальный балл
    - Список всех попыток с деталями о студентах
    """
    # Проверяем права доступа
    check_teacher_access(current_user, test_id, db)
    
    # Получаем тест
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found"
        )
    
    # Получаем все завершенные попытки по тесту
    attempts = db.query(TestAttempt).filter(
        TestAttempt.test_id == test_id,
        TestAttempt.is_completed == True
    ).options(
        joinedload(TestAttempt.student)
    ).all()
    
    if not attempts:
        return TestAttemptsSummary(
            test_id=test_id,
            test_title=test.title,
            total_attempts=0,
            average_score=0.0,
            highest_score=0.0,
            lowest_score=0.0,
            attempts=[]
        )
    
    # Вычисляем статистику
    scores = [attempt.score for attempt in attempts if attempt.score is not None]
    
    total_attempts = len(attempts)
    average_score = sum(scores) / len(scores) if scores else 0.0
    highest_score = max(scores) if scores else 0.0
    lowest_score = min(scores) if scores else 0.0
    
    # Формируем список попыток
    attempts_list = []
    for idx, attempt in enumerate(attempts, start=1):
        student_name = attempt.student.name + " "+attempt.student.surname if attempt.student else "Unknown"
        percentage = (attempt.score / test.max_score * 100) if attempt.score and test.max_score > 0 else None
        
        attempts_list.append(TeacherAttemptListItem(
            attempt_id=attempt.id,
            attempt_number=idx,
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
            score=attempt.score,
            percentage=percentage,
            student_id=attempt.student_id,
            student_name=student_name
        ))
    
    return TestAttemptsSummary(
        test_id=test_id,
        test_title=test.title,
        total_attempts=total_attempts,
        average_score=round(average_score, 2),
        highest_score=round(highest_score, 2),
        lowest_score=round(lowest_score, 2),
        attempts=attempts_list
    )


@router.get("/test/{test_id}/questions-analysis")
async def get_test_questions_analysis(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    """
    Эндпоинт 2: Статистика ответов на вопросы теста
    
    Возвращает для каждого вопроса:
    - ID и текст вопроса
    - Тип вопроса
    - Максимальное количество баллов
    - Количество ответов
    - Средний балл за вопрос
    - Процент правильных ответов
    - Детальный анализ ответов (в зависимости от типа вопроса)
    """
    # Проверяем права доступа
    check_teacher_access(current_user, test_id, db)
    
    # Получаем тест с вопросами
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found"
        )
    
    # Получаем все завершенные попытки по тесту
    attempts = db.query(TestAttempt).filter(
        TestAttempt.test_id == test_id,
        TestAttempt.is_completed == True
    ).all()
    
    if not attempts:
        return {
            "test_id": test_id,
            "test_title": test.title,
            "total_attempts": 0,
            "questions_analysis": []
        }
    
    attempt_ids = [attempt.id for attempt in attempts]
    
    # Получаем все ответы на вопросы теста
    answers = db.query(Answer).filter(
        Answer.attempt_id.in_(attempt_ids)
    ).options(
        joinedload(Answer.question)
    ).all()
    
    # Получаем вопросы теста
    questions = test.questions
    
    # Анализируем каждый вопрос
    questions_analysis = []
    
    for question in questions:
        # Фильтруем ответы для текущего вопроса
        question_answers = [a for a in answers if a.question_id == question.id]
        
        if not question_answers:
            questions_analysis.append({
                "question_id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type.value,
                "max_points": question.points,
                "total_answers": 0,
                "average_score": 0.0,
                "correct_percentage": 0.0
            })
            continue
        
        # Базовая статистика
        total_answers = len(question_answers)
        total_points_earned = sum(a.points_earned for a in question_answers)
        average_score = total_points_earned / total_answers
        correct_count = sum(1 for a in question_answers if a.is_correct)
        correct_percentage = (correct_count / total_answers) * 100
        
        # Детальный анализ в зависимости от типа вопрос
        
        questions_analysis.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "question_type": question.question_type.value,
            "max_points": question.points,
            "total_answers": total_answers,
            "average_score": round(average_score, 2),
            "correct_percentage": round(correct_percentage, 2)
        })
    
    # Сортируем вопросы по проценту правильных ответов (самые сложные в начале)
    questions_analysis.sort(key=lambda x: x["correct_percentage"])
    
    return {
        "test_id": test_id,
        "test_title": test.title,
        "total_attempts": len(attempts),
        "questions_analysis": questions_analysis
    }




