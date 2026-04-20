from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, ForeignKey,
    Float, Boolean, Table, JSON
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


# ===================== ENUMS =====================

class UserRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class QuestionType(str, enum.Enum):
    open = "open"
    single_choice = "single_choice"
    multiple_choice = "multiple_choice"


class TestStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    blocked = "blocked"


class UserStatus(str, enum.Enum):
    active = "active"
    blocked = "blocked"


test_question_association = Table(
    'test_question',
    Base.metadata,
    Column('test_id', Integer, ForeignKey('tests.id', ondelete="CASCADE")),
    Column('question_id', Integer, ForeignKey('questions.id', ondelete="CASCADE"))
)

# ===================== ASSOCIATION TABLE =====================

student_test_access = Table(
    'student_test',
    Base.metadata,
    Column('student_id', Integer, ForeignKey('users.id')),
    Column('test_id', Integer, ForeignKey('tests.id'))
)


# ===================== USERS =====================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    surname = Column(String, nullable=False)
    password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.active, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_tests = relationship("Test", back_populates="author")
    test_attempts = relationship("TestAttempt", back_populates="student")
    accessible_tests = relationship(
        "Test",
        secondary=student_test_access,
        back_populates="accessible_by"
    )


# ===================== TESTS =====================

class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    description = Column(String)
    max_score = Column(Float, nullable=False)
    status = Column(Enum(TestStatus), default=TestStatus.draft, nullable=False)

    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    author = relationship("User", back_populates="created_tests")
    questions = relationship(
        "Question",
        secondary=test_question_association,
        back_populates="tests"  
    )
    attempts = relationship("TestAttempt", back_populates="test")
    accessible_by = relationship(
        "User",
        secondary=student_test_access,
        back_populates="accessible_tests"
    )


# ===================== QUESTIONS =====================

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    question_text = Column(String, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    points = Column(Float, nullable=False)
    data = Column(JSON, nullable=False)

    tests = relationship(
        "Test",
        secondary=test_question_association,
        back_populates="questions"
    )
    answers = relationship(
        "Answer",
        back_populates="question",
        cascade="all, delete-orphan"
    )


# ===================== TEST ATTEMPTS =====================

class TestAttempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)

    score = Column(Float, nullable=False, default=0)

    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    is_completed = Column(Boolean, default=False)

    student = relationship("User", back_populates="test_attempts")
    test = relationship("Test", back_populates="attempts")
    answers = relationship(
        "Answer",
        back_populates="attempt",
        cascade="all, delete-orphan"
    )

    @property
    def test_title(self) -> str:
        return self.test.title if self.test else "Unknown Test"


# ===================== ANSWERS =====================

class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(
        Integer,
        ForeignKey("attempts.id", ondelete="CASCADE"),
        nullable=False
    )
    question_id = Column(
        Integer,
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False
    )

    answer_data = Column(JSON, nullable=True)

    is_correct = Column(Boolean, default=False)
    points_earned = Column(Float, default=0)

    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("Question", back_populates="answers")