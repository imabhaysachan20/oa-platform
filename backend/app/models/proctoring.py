from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Text, Integer, ForeignKey, DateTime, Index, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin


class ExamProctoringLog(Base, TimestampMixin):
    __tablename__ = "exam_proctoring_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("exam_assignments.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True
    )
    meta_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_proctoring_logs_assignment_time", "assignment_id", "occurred_at"),
    )

    # Relationships
    assignment = relationship("ExamAssignment", back_populates="proctoring_logs")
