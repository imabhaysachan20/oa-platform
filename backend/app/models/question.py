import uuid
from typing import Optional, List, Dict, Any
import enum
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin


class QuestionDifficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[QuestionDifficulty] = mapped_column(
        Enum(QuestionDifficulty, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True
    )
    time_limit_ms: Mapped[int] = mapped_column(Integer, default=2000, nullable=False)
    memory_limit_kb: Mapped[int] = mapped_column(Integer, default=128000, nullable=False)
    sample_input: Mapped[str] = mapped_column(Text, nullable=True)
    sample_output: Mapped[str] = mapped_column(Text, nullable=True)
    input_format: Mapped[str] = mapped_column(Text, nullable=True)

    # MCQ Support Fields
    question_type: Mapped[str] = mapped_column(String(20), default="coding", nullable=False, index=True)
    marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mcq_time_limit_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_multi_select: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # LeetCode Signature & Code Execution Engine Fields
    function_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    function_signature: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    parameters: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    return_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    starter_code: Mapped[Optional[Dict[str, str]]] = mapped_column(JSON, nullable=True)
    driver_code: Mapped[Optional[Dict[str, str]]] = mapped_column(JSON, nullable=True)

    # Relationships
    test_cases = relationship("TestCase", back_populates="question", cascade="all, delete-orphan")
    pool_entries = relationship("ExamQuestionPool", back_populates="question", cascade="all, delete-orphan")
    assigned_instances = relationship("AssignedQuestion", back_populates="question")
    mcq_options = relationship("MCQOption", back_populates="question", cascade="all, delete-orphan", order_by="MCQOption.order_index")
    mcq_responses = relationship("MCQResponse", back_populates="question", cascade="all, delete-orphan")


class MCQOption(Base, TimestampMixin):
    __tablename__ = "mcq_options"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationship
    question = relationship("Question", back_populates="mcq_options")


class TestCase(Base, TimestampMixin):
    __tablename__ = "test_cases"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    input: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    # Relationship
    question = relationship("Question", back_populates="test_cases")
