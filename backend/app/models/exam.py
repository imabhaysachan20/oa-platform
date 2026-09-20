import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String, Text, Integer, Float, Boolean, ForeignKey, Enum, DateTime,
    UniqueConstraint, Index, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin
from backend.app.models.question import QuestionDifficulty


class AssignmentStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    AUTO_SUBMITTED = "auto_submitted"


class Exam(Base, TimestampMixin):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    easy_weight: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    medium_weight: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    hard_weight: Mapped[float] = mapped_column(Float, default=30.0, nullable=False)
    mcq_weight: Mapped[float] = mapped_column(Float, default=2.0, nullable=False)
    mcq_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    easy_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    medium_count: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    hard_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    late_entry_window_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    target_colleges: Mapped[Optional[list[str]]] = mapped_column(JSON, default=list, nullable=True)
    target_groups: Mapped[Optional[list[str]]] = mapped_column(JSON, default=list, nullable=True)

    # Relationships
    question_pool = relationship("ExamQuestionPool", back_populates="exam", cascade="all, delete-orphan")
    assignments = relationship("ExamAssignment", back_populates="exam", cascade="all, delete-orphan")


class ExamQuestionPool(Base, TimestampMixin):
    __tablename__ = "exam_question_pool"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    difficulty: Mapped[QuestionDifficulty] = mapped_column(
        Enum(QuestionDifficulty, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    selection_mode: Mapped[str] = mapped_column(String(20), default="random", nullable=False)

    __table_args__ = (
        Index("ix_exam_question_pool_exam_id_difficulty", "exam_id", "difficulty"),
        UniqueConstraint("exam_id", "question_id", name="uq_exam_question_pool"),
    )

    # Relationships
    exam = relationship("Exam", back_populates="question_pool")
    question = relationship("Question", back_populates="pool_entries")


class ExamAssignment(Base, TimestampMixin):
    __tablename__ = "exam_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    reset_by_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reset_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verification_photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus, values_callable=lambda x: [e.value for e in x]),
        default=AssignmentStatus.NOT_STARTED,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("exam_id", "user_id", "attempt_number", name="uq_exam_user_assignment_attempt"),
        Index("ix_exam_assignments_exam_id_status", "exam_id", "status"),
        Index("ix_exam_assignments_user_active", "exam_id", "user_id", "is_active"),
    )

    # Relationships
    exam = relationship("Exam", back_populates="assignments")
    user = relationship("User", back_populates="assignments")
    assigned_questions = relationship(
        "AssignedQuestion",
        back_populates="assignment",
        cascade="all, delete-orphan",
        order_by="AssignedQuestion.order_index"
    )
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")
    mcq_responses = relationship("MCQResponse", back_populates="assignment", cascade="all, delete-orphan")
    question_scores = relationship("QuestionScore", back_populates="assignment", cascade="all, delete-orphan")
    result = relationship("ExamResult", back_populates="assignment", uselist=False, cascade="all, delete-orphan")
    proctoring_logs = relationship("ExamProctoringLog", back_populates="assignment", cascade="all, delete-orphan")
    network_incidents = relationship("ExamNetworkIncident", back_populates="assignment", cascade="all, delete-orphan")


class AssignedQuestion(Base, TimestampMixin):
    __tablename__ = "assigned_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("exam_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    difficulty: Mapped[QuestionDifficulty] = mapped_column(
        Enum(QuestionDifficulty, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    question_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    question_deadline_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("assignment_id", "question_id", name="uq_assignment_question"),
    )

    # Relationships
    assignment = relationship("ExamAssignment", back_populates="assigned_questions")
    question = relationship("Question", back_populates="assigned_instances")
