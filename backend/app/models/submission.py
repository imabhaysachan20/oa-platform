from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Text, Integer, Float, Boolean, ForeignKey, DateTime, Index, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin


class Submission(Base, TimestampMixin):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("exam_assignments.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False)  # python, cpp, java
    judge0_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)  # Accepted, Wrong Answer, etc.
    test_cases_passed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_test_cases: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    exec_time_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_final: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    __table_args__ = (
        Index("ix_submissions_assignment_question", "assignment_id", "question_id"),
        Index("ix_submissions_is_final", "is_final"),
    )

    # Relationships
    assignment = relationship("ExamAssignment", back_populates="submissions")
    question = relationship("Question")
