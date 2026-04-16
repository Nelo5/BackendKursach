from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, get_teacher_user
from app.tests.utils import (  # импортируем функции из utils
    get_all_users_logic,
    create_test_logic,
    update_test_logic,
    grant_test_access_logic,
    get_available_tests_logic,
    get_unique_subjects_logic,
    get_test_details_logic,
    get_my_tests_with_statistics_logic,
)

router = APIRouter(prefix="/tests", tags=["Tests"])


# ===================== USERS =====================
@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    admin: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    return get_all_users_logic(db, skip, limit)


# ===================== CREATE =====================
@router.post("/", response_model=schemas.TestResponse)
def create_test(
    test_data: schemas.TestCreate,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    return create_test_logic(db, teacher, test_data)


# ===================== UPDATE =====================
@router.patch("/{test_id}", response_model=schemas.TestResponse)
def update_test(
    test_id: int,
    test_data: schemas.TestUpdate,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    return update_test_logic(db, teacher, test_id, test_data)


# ===================== ACCESS =====================
@router.post("/{test_id}/grant-access")
def grant_test_access(
    test_id: int,
    access_data: schemas.TestAccessGrant,
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    return grant_test_access_logic(db, teacher, test_id, access_data)


# ===================== STUDENT =====================
@router.get("/", response_model=List[schemas.TestListItem])
def get_available_tests(
    subject: Optional[str] = Query(None),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return get_available_tests_logic(db, current_user, subject)


@router.get("/subjects")
def get_unique_subjects(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return get_unique_subjects_logic(db)


@router.get("/{test_id}", response_model=schemas.TestResponse)
def get_test_details(
    test_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return get_test_details_logic(db, current_user, test_id)

@router.get("/teacher/my-tests-with-stats")
def get_my_tests_with_statistics(
    teacher: models.User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    return get_my_tests_with_statistics_logic(db, teacher)