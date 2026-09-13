import enum
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, Enum
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

    # Relationships
    test_cases = relationship("TestCase", back_populates="question", cascade="all, delete-orphan")
    pool_entries = relationship("ExamQuestionPool", back_populates="question", cascade="all, delete-orphan")
    assigned_instances = relationship("AssignedQuestion", back_populates="question")


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
