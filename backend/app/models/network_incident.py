from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, ForeignKey, DateTime, Index, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin


class ExamNetworkIncident(Base, TimestampMixin):
    """
    Tracks candidate network connectivity drops, outages, and sudden shutdowns
    during an examination session. This is strictly separated from anti-cheat integrity flags.
    """
    __tablename__ = "exam_network_incidents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("exam_assignments.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    disconnected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    reconnected_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    reason: Mapped[str] = mapped_column(
        String(100),
        default="Heartbeat Timeout (>30s)",
        nullable=False
    )

    __table_args__ = (
        Index("ix_network_incidents_assignment_time", "assignment_id", "disconnected_at"),
    )

    # Relationships
    assignment = relationship("ExamAssignment", back_populates="network_incidents")
