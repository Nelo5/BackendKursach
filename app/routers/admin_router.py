from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas
from ..dependencies import get_current_active_user, get_admin_user

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Проверяем права доступа: только admin или teacher
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.TEACHER]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions"
        )
    
    # Формируем запрос в зависимости от роли
    query = db.query(models.User)
    if current_user.role == models.UserRole.TEACHER:
        # Учитель видит только студентов
        query = query.filter(models.User.role == models.UserRole.STUDENT)
    # Администратор видит всех, фильтр не нужен
    
    users = query.offset(skip).limit(limit).all()
    return users

@router.put("/users/{user_id}/role", response_model=schemas.UserResponse)
def change_user_role(
    user_id: int,
    role_update: schemas.UserUpdateRole,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    return user

@router.put("/users/{user_id}/status", response_model=schemas.UserResponse)
def change_user_status(
    user_id: int,
    status_update: schemas.UserUpdateStatus,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id and status_update.status == models.UserStatus.BLOCKED:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    user.status = status_update.status
    db.commit()
    db.refresh(user)
    return user

@router.get("/tests/blocked", response_model=List[schemas.TestListItem])
def get_blocked_tests(
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    tests = db.query(models.Test).filter(models.Test.status == models.TestStatus.BLOCKED).all()
    return tests

@router.post("/tests/{test_id}/block")
def block_test(
    test_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    test.status = models.TestStatus.BLOCKED
    db.commit()
    return {"message": "Test blocked successfully"}

@router.post("/tests/{test_id}/unblock")
def unblock_test(
    test_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    test.status = models.TestStatus.PUBLISHED
    db.commit()
    return {"message": "Test unblocked successfully"}