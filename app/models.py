from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Float, Boolean, Table, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class QuestionType(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"

class TestStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    BLOCKED = "blocked"

class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    BLOCKED = "blocked"

# Связующая таблица для доступа студентов к тестам
student_test_access = Table(
    'student_test_access',
    Base.metadata,
    Column('student_id', Integer, ForeignKey('users.id')),
    Column('test_id', Integer, ForeignKey('tests.id'))
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Отношения
    created_tests = relationship("Test", back_populates="author", foreign_keys="Test.author_id")
    test_attempts = relationship("TestAttempt", back_populates="student")
    accessible_tests = relationship("Test", secondary=student_test_access, back_populates="accessible_by")

class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    description = Column(String)
    version = Column(Integer, default=1)
    max_score = Column(Float, nullable=False)
    status = Column(Enum(TestStatus), default=TestStatus.DRAFT, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Отношения
    author = relationship("User", back_populates="created_tests", foreign_keys=[author_id])
    questions = relationship("Question", back_populates="test", cascade="all, delete-orphan")
    attempts = relationship("TestAttempt", back_populates="test")
    accessible_by = relationship("User", secondary=student_test_access, back_populates="accessible_tests")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(String, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    points = Column(Float, nullable=False)
    order_number = Column(Integer, nullable=False)
    
    # Для закрытых вопросов (JSON с вариантами ответов и правильными ответами)
    # Структура: {"options": ["вариант1", "вариант2"], "correct": [0, 1]}
    closed_question_data = Column(JSON, nullable=True)
    
    # Для открытых вопросов (ключевые слова для проверки)
    # Структура: {"keywords": ["слово1", "слово2"], "case_sensitive": false}
    open_question_data = Column(JSON, nullable=True)
    
    # Отношения
    test = relationship("Test", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")

class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    score = Column(Float, nullable=True)
    max_possible_score = Column(Float, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    is_completed = Column(Boolean, default=False)
    
    # Отношения
    student = relationship("User", back_populates="test_attempts")
    test = relationship("Test", back_populates="attempts")
    answers = relationship("Answer", back_populates="attempt", cascade="all, delete-orphan")
    
    @property
    def test_title(self) -> str:
        """Свойство для получения названия теста"""
        return self.test.title if self.test else "Unknown Test"
    
class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("test_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    answer_text = Column(String, nullable=True)
    selected_options = Column(JSON, nullable=True)
    is_correct = Column(Boolean, default=False)
    points_earned = Column(Float, default=0)
    
    # Отношения
    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("Question", back_populates="answers")