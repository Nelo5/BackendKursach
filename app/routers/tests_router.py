from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import func

from ..database import get_db
from .. import models, schemas
from ..dependencies import get_current_active_user, get_teacher_user

router = APIRouter(prefix="/tests", tags=["Tests"])


@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    admin: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    users = db.query(models.User).filter(models.User.role == "student").offset(skip).limit(limit).all()
    return users

# Преподавательские эндпоинты
@router.post("/create", response_model=schemas.TestResponse)
def create_test(
    test_data: schemas.TestCreate,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """Создать новый тест (только преподаватели и админы)"""
    # Проверяем сумму баллов
    total_points = sum(q.points for q in test_data.questions)
    if abs(total_points - test_data.max_score) > 0.01:
        raise HTTPException(status_code=400, detail="Sum of question points must equal max_score")
    
    db_test = models.Test(
        title=test_data.title,
        subject=test_data.subject,
        description=test_data.description,
        max_score=test_data.max_score,
        author_id=teacher.id,
        status=models.TestStatus.DRAFT
    )
    db.add(db_test)
    db.flush()
    
    # Добавляем вопросы
    for q in test_data.questions:
        db_question = models.Question(
            test_id=db_test.id,
            question_text=q.question_text,
            question_type=q.question_type,
            points=q.points,
            order_number=q.order_number,
            closed_question_data=q.closed_question_data.dict() if q.closed_question_data else None,
            open_question_data=q.open_question_data.dict() if q.open_question_data else None
        )
        db.add(db_question)
    
    db.commit()
    db.refresh(db_test)
    return db_test

@router.put("/{test_id}", response_model=schemas.TestResponse)
def update_test(
    test_id: int,
    test_data: schemas.TestUpdate,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """Обновить тест (только автор или админ)"""
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test.author_id != teacher.id and teacher.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to edit this test")
    
    # Проверяем, есть ли уже завершенные попытки по этому тесту
    completed_attempts = db.query(models.TestAttempt).filter(
        models.TestAttempt.test_id == test_id,
        models.TestAttempt.is_completed == True
    ).first()
    
    # Если есть попытки, создаем новую версию вместо обновления существующего теста
    if completed_attempts and test_data.questions is not None:
        # Создаем новый тест как новую версию
        new_test = models.Test(
            title=test_data.title or test.title,
            subject=test_data.subject or test.subject,
            description=test_data.description or test.description,
            max_score=test_data.max_score or test.max_score,
            author_id=teacher.id,
            status=models.TestStatus.DRAFT,
            version=test.version + 1
        )
        db.add(new_test)
        db.flush()
        
        # Копируем вопросы с обновлениями
        if test_data.questions:
            for q in test_data.questions:
                db_question = models.Question(
                    test_id=new_test.id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    points=q.points,
                    order_number=q.order_number,
                    closed_question_data=q.closed_question_data.dict() if q.closed_question_data else None,
                    open_question_data=q.open_question_data.dict() if q.open_question_data else None
                )
                db.add(db_question)
        
        db.commit()
        db.refresh(new_test)
        
        # Опционально: пометить старый тест как архивный
        test.status = models.TestStatus.BLOCKED
        
        db.commit()
        return new_test
    
    # Если нет попыток, можно обновлять существующий тест
    # Обновляем поля
    for field, value in test_data.dict(exclude_unset=True).items():
        if field != "questions":
            setattr(test, field, value)
    
    # Обновляем вопросы если нужно
    if test_data.questions is not None:
        # Удаляем старые вопросы (каскадно удалятся и ответы, если они есть)
        # Но мы уже проверили, что завершенных попыток нет
        db.query(models.Question).filter(models.Question.test_id == test_id).delete()
        
        # Добавляем новые
        for q in test_data.questions:
            db_question = models.Question(
                test_id=test.id,
                question_text=q.question_text,
                question_type=q.question_type,
                points=q.points,
                order_number=q.order_number,
                closed_question_data=q.closed_question_data.dict() if q.closed_question_data else None,
                open_question_data=q.open_question_data.dict() if q.open_question_data else None
            )
            db.add(db_question)
    
    db.commit()
    db.refresh(test)
    return test

@router.put("/{test_id}/status")
def update_test_status(
    test_id: int,
    status_update: schemas.TestStatusUpdate,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """Опубликовать или закрыть тест"""
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test.author_id != teacher.id and teacher.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if status_update.status == models.TestStatus.PUBLISHED and not test.questions:
        raise HTTPException(status_code=400, detail="Cannot publish test without questions")
    
    test.status = status_update.status
    db.commit()
    return {"message": f"Test status updated to {status_update.status.value}"}

@router.post("/{test_id}/grant-access")
def grant_test_access(
    test_id: int,
    access_data: schemas.TestAccessGrant,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """Предоставить доступ к тесту студентам"""
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test.author_id != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    students = db.query(models.User).filter(
        models.User.id.in_(access_data.student_ids),
        models.User.role == models.UserRole.STUDENT
    ).all()
    
    test.accessible_by.extend(students)
    db.commit()
    return {"message": f"Access granted to {len(students)} students"}

# Студенческие эндпоинты
@router.get("/available", response_model=List[schemas.TestListItem])
def get_available_tests(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список доступных тестов (только опубликованные)"""
    query = db.query(models.Test).filter(
        models.Test.status == models.TestStatus.PUBLISHED
    )
    
    if current_user.role == models.UserRole.STUDENT:
        query = query.filter(models.Test.accessible_by.any(id=current_user.id))
    
    if subject:
        query = query.filter(models.Test.subject == subject)
    
    return query.all()

@router.get("/subjects")
def get_unique_subjects(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список всех предметов"""
    subjects = db.query(models.Test.subject).distinct().all()
    return [s[0] for s in subjects]

@router.get("/{test_id}", response_model=schemas.TestResponse)
def get_test_details(
    test_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить детали теста"""
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Проверяем доступ
    if current_user.role == models.UserRole.STUDENT:
        if test.status != models.TestStatus.PUBLISHED:
            raise HTTPException(status_code=403, detail="Test not available")
        if test not in current_user.accessible_tests:
            raise HTTPException(status_code=403, detail="No access to this test")
    
    return test

@router.get("/teacher/my-tests", response_model=List[schemas.TestListItem])
def get_my_tests(
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """Получить все тесты преподавателя"""
    tests = db.query(models.Test).filter(models.Test.author_id == teacher.id).all()
    return tests


@router.get("/teacher/my-tests-with-stats")
def get_my_tests_with_statistics(
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """
    Получить все тесты преподавателя со статистикой по попыткам.
    """
    tests = db.query(models.Test).filter(models.Test.author_id == teacher.id).all()
    
    result = []
    for test in tests:
        # Получаем статистику по попыткам
        attempts_stats = db.query(
            func.count(models.TestAttempt.id).label('total_attempts'),
            func.avg(models.TestAttempt.score).label('avg_score'),
            func.max(models.TestAttempt.score).label('max_score'),
            func.min(models.TestAttempt.score).label('min_score')
        ).filter(
            models.TestAttempt.test_id == test.id,
            models.TestAttempt.is_completed == True
        ).first()
        
        # Количество уникальных студентов
        unique_students = db.query(func.count(models.TestAttempt.student_id.distinct())).filter(
            models.TestAttempt.test_id == test.id,
            models.TestAttempt.is_completed == True
        ).scalar()
        
        result.append({
            "test_id": test.id,
            "title": test.title,
            "subject": test.subject,
            "status": test.status,
            "version": test.version,
            "total_attempts": attempts_stats.total_attempts or 0,
            "unique_students": unique_students or 0,
            "average_score": round(attempts_stats.avg_score, 2) if attempts_stats.avg_score else 0,
            "highest_score": attempts_stats.max_score or 0,
            "lowest_score": attempts_stats.min_score or 0
        })
    
    return result