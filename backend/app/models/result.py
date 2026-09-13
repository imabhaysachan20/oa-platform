from typing import Optional
from sqlalchemy import (
    Float, Integer, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin


class QuestionScore(Base, TimestampMixin):
    __tablename__ = "question_scores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("exam_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    correctness: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0 to 1
    time_taken_sec: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    difficulty_weight: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    time_bonus: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    final_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    __table_args__ = (
        UniqueConstraint("assignment_id", "question_id", name="uq_assignment_question_score"),
    )

    # Relationships
    assignment = relationship("ExamAssignment", back_populates="question_scores")
    question = relationship("Question")


class ExamResult(Base, TimestampMixin):
    __tablename__ = "exam_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("exam_assignments.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)
    rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    assignment = relationship("ExamAssignment", back_populates="result")
