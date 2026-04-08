from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class UserStatus(str, Enum):
    ACTIVE = "active"
    BLOCKED = "blocked"

class QuestionType(str, Enum):
    OPEN = "open"
    CLOSED = "closed"

class TestStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    BLOCKED = "blocked"

# Схемы пользователей
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role: UserRole

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

# Схемы для вопросов
class ClosedQuestionData(BaseModel):
    options: List[str] = Field(..., min_items=2)
    correct: List[int] = Field(..., min_items=1)

class OpenQuestionData(BaseModel):
    keywords: List[str] = Field(..., min_items=1)
    case_sensitive: bool = False

class QuestionBase(BaseModel):
    question_text: str = Field(..., min_length=1)
    question_type: QuestionType
    points: float = Field(..., gt=0)
    order_number: int

class QuestionCreate(QuestionBase):
    closed_question_data: Optional[ClosedQuestionData] = None
    open_question_data: Optional[OpenQuestionData] = None

    @validator('closed_question_data')
    def validate_closed_data(cls, v, values):
        if values.get('question_type') == QuestionType.CLOSED and not v:
            raise ValueError('Closed question requires closed_question_data')
        return v

    @validator('open_question_data')
    def validate_open_data(cls, v, values):
        if values.get('question_type') == QuestionType.OPEN and not v:
            raise ValueError('Open question requires open_question_data')
        return v

class QuestionResponse(QuestionBase):
    id: int
    test_id: int
    closed_question_data: Optional[Dict[str, Any]] = None
    open_question_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# Схемы для тестов
class TestBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1)
    description: Optional[str] = None
    max_score: float = Field(..., gt=0)

class TestCreate(TestBase):
    questions: List[QuestionCreate]

class TestUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    max_score: Optional[float] = None
    questions: Optional[List[QuestionCreate]] = None

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

class TestStatusUpdate(BaseModel):
    status: TestStatus

class TestAccessGrant(BaseModel):
    student_ids: List[int]

# Схемы для ответов
class AnswerSubmit(BaseModel):
    question_id: int
    answer_text: Optional[str] = None
    selected_options: Optional[List[int]] = None

class AttemptStart(BaseModel):
    test_id: int

class AttemptSubmit(BaseModel):
    attempt_id: int
    answers: List[AnswerSubmit]

class AnswerResponse(BaseModel):
    question_id: int
    answer_text: Optional[str]
    selected_options: Optional[List[int]]
    is_correct: bool
    points_earned: float

class AttemptResponse(BaseModel):
    id: int
    test_id: int
    test_title: str
    score: Optional[float]
    max_possible_score: float
    started_at: datetime
    completed_at: Optional[datetime]
    is_completed: bool
    answers: List[AnswerResponse] = []

    class Config:
        from_attributes = True

class AttemptDetailResponse(AttemptResponse):
    pass

# Фильтры
class TestFilter(BaseModel):
    subject: Optional[str] = None
    status: Optional[TestStatus] = None

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

# ... (предыдущие схемы остаются без изменений)

# Схемы для списка попыток (краткая информация)
class AttemptListItem(BaseModel):
    """Краткая информация о попытке для списка"""
    attempt_id: int
    attempt_number: int  # Номер попытки (1, 2, 3...)
    started_at: datetime
    completed_at: Optional[datetime]
    score: Optional[float]
    max_possible_score: float
    percentage: Optional[float] = None

    class Config:
        from_attributes = True

class StudentAttemptListItem(AttemptListItem):
    """Для студента - список его попыток по тесту"""
    pass

class TeacherAttemptListItem(AttemptListItem):
    """Для преподавателя - список попыток студентов с именем"""
    student_id: int
    student_name: str

class TestAttemptsSummary(BaseModel):
    """Сводка по попыткам теста для преподавателя"""
    test_id: int
    test_title: str
    total_attempts: int
    average_score: float
    highest_score: float
    lowest_score: float
    attempts: List[TeacherAttemptListItem]

class StudentTestAttemptsSummary(BaseModel):
    """Сводка по попыткам студента по конкретному тесту"""
    test_id: int
    test_title: str
    best_score: Optional[float]
    average_score: float
    total_attempts: int
    attempts: List[StudentAttemptListItem]

# Детальная информация о попытке (расширенная)
class AnswerDetail(BaseModel):
    """Детальный ответ на вопрос"""
    question_id: int
    question_text: str
    question_type: QuestionType
    points: float
    points_earned: float
    is_correct: bool
    user_answer: Optional[str] = None  # Для открытых вопросов
    selected_options: Optional[List[int]] = None  # Для закрытых вопросов
    correct_answer: Optional[str] = None  # Правильный ответ для отображения
    correct_options: Optional[List[int]] = None  # Правильные варианты для закрытых

class AttemptDetailResponse(BaseModel):
    """Детальная информация о попытке"""
    attempt_id: int
    attempt_number: int
    student_id: Optional[int] = None  # Для преподавателя
    student_name: Optional[str] = None  # Для преподавателя
    test_id: int
    test_title: str
    score: float
    max_possible_score: float
    percentage: float
    started_at: datetime
    completed_at: datetime
    time_spent_minutes: Optional[float] = None  # Время в минутах
    answers: List[AnswerDetail]

class AttemptHistoryResponse(BaseModel):
    """История попыток студента по всем тестам"""
    test_id: int
    test_title: str
    best_score: float
    best_score_percentage: float
    attempts_count: int
    last_attempt_date: Optional[datetime]