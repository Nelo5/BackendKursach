from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


# ===================== ENUMS =====================

class UserRole(str, Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class UserStatus(str, Enum):
    active = "active"
    blocked = "blocked"


class QuestionType(str, Enum):
    open = "open"
    single_choice = "single_choice"
    multiple_choice = "multiple_choice"


class TestStatus(str, Enum):
    draft = "draft"
    published = "published"
    blocked = "blocked"


# ===================== USERS =====================

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    role: UserRole
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRole(BaseModel):
    role: UserRole


class UserUpdateStatus(BaseModel):
    status: UserStatus



class QuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=1)
    question_type: QuestionType
    points: float = Field(..., gt=0)
    data: Dict[str, Any]

    @model_validator(mode="after")
    def validate_data(self):
        qtype = self.question_type
        data = self.data

        if qtype == QuestionType.single_choice:
            if "options" not in data or "correct" not in data:
                raise ValueError("single_choice requires options and correct")
            if len(data["correct"]) != 1:
                raise ValueError("single_choice must have exactly 1 correct answer")

        elif qtype == QuestionType.multiple_choice:
            if "options" not in data:
                raise ValueError("multiple_choice requires options")
            for opt in data["options"]:
                if "weight" not in opt:
                    raise ValueError("each option must have weight")

        elif qtype == QuestionType.open:
            if "keywords" not in data:
                raise ValueError("open question requires keywords")

        return self


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[QuestionType] = None
    points: Optional[float] = None
    data: Optional[Dict[str, Any]] = None


class QuestionResponse(BaseModel):
    id: int
    question_text: str
    question_type: QuestionType
    points: float
    data: Dict[str, Any]
    
    class Config:
        from_attributes = True

# ===================== TESTS =====================

class TestBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1)
    description: Optional[str] = None
    max_score: float = Field(..., gt=0)


class TestCreate(TestBase):
    question_ids: List[int]  # вместо questions: List[QuestionCreate]


class TestUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    max_score: Optional[float] = None
    status: Optional[TestStatus] = None
    question_ids: Optional[List[int]] = None  # вместо questions


class TestResponse(TestBase):
    id: int
    version: int
    status: TestStatus
    author_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    questions: List[QuestionResponse] = []

    class Config:
        from_attributes = True


class TestListItem(TestBase):
    id: int
    version: int
    status: TestStatus
    author_id: int





class TestAccessGrant(BaseModel):
    student_ids: List[int]


# ===================== ANSWERS =====================

class AnswerSubmit(BaseModel):
    answer_data: Optional[Dict[str, Any]]

    @model_validator(mode="after")
    def validate_answer_data(self):
        if "text" not in self.answer_data and "selected_options" not in self.answer_data:
            raise ValueError("answer_data must contain 'text' or 'selected_options'")
        # Дополнительно можно проверять соответствие типу вопроса, но это лучше делать в сервисе
        return self

class AnswerResponse(BaseModel):
    question_id: int
    answer_data: Optional[Dict[str, Any]]
    is_correct: bool = False
    points_earned: float = 0.0
 

class AttemptStart(BaseModel):
    test_id: int


class AttemptSubmit(BaseModel):
    attempt_id: int
    answers: List[AnswerSubmit]




class AttemptResponse(BaseModel):
    id: int
    test_id: int
    test_title: str
    score: Optional[float]
    started_at: datetime
    completed_at: Optional[datetime]
    is_completed: bool
    answers: List[AnswerResponse] = []

    class Config:
        from_attributes = True


# ===================== ATTEMPTS (СТАТИСТИКА) =====================

class AttemptListItem(BaseModel):
    attempt_id: int
    attempt_number: int
    started_at: datetime
    completed_at: Optional[datetime]
    score: Optional[float]
    percentage: Optional[float] = None

    class Config:
        from_attributes = True


class StudentAttemptListItem(AttemptListItem):
    pass


class TeacherAttemptListItem(AttemptListItem):
    student_id: int
    student_name: str


class TestAttemptsSummary(BaseModel):
    test_id: int
    test_title: str
    total_attempts: int
    average_score: float
    highest_score: float
    lowest_score: float
    attempts: List[TeacherAttemptListItem]


class StudentTestAttemptsSummary(BaseModel):
    test_id: int
    test_title: str
    best_score: Optional[float]
    average_score: float
    total_attempts: int
    attempts: List[StudentAttemptListItem]


# ===================== DETAIL =====================

class AnswerDetail(BaseModel):
    question_id: int
    question_text: str
    question_type: QuestionType
    points: float
    points_earned: float
    is_correct: bool
    answer_data: Optional[Dict[str, Any]]


class AttemptDetailResponse(BaseModel):
    attempt_id: int
    attempt_number: int
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    test_id: int
    test_title: str
    score: float = 0
    percentage: float
    started_at: datetime
    completed_at: Optional[datetime] = None
    time_spent_minutes: Optional[float] = None
    answers: List[AnswerDetail]


class AttemptHistoryResponse(BaseModel):
    test_id: int
    test_title: str
    best_score: float
    best_score_percentage: float
    attempts_count: int
    last_attempt_date: Optional[datetime]


# ===================== AUTH =====================

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    role: UserRole


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[UserRole] = None

