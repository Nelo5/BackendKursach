from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from .auth import get_current_user
from . import models

security = HTTPBearer()

def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    return get_current_user(token, db)

def get_current_active_user(
    current_user: models.User = Depends(get_current_user_dependency)
):
    if current_user.status != models.UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="User is blocked")
    return current_user

def get_teacher_user(
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in [models.UserRole.TEACHER, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Teacher or admin privileges required")
    return current_user

def get_admin_user(
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user