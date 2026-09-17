"""add_exam_proctoring_logs

Revision ID: 003_proctoring_logs
Revises: 002_input_format
Create Date: 2026-09-17 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003_proctoring_logs"
down_revision: Union[str, None] = "002_input_format"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "exam_proctoring_logs" not in tables:
        op.create_table(
            "exam_proctoring_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("exam_assignments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("event_type", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=150), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("meta_data", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("ix_exam_proctoring_logs_id", "exam_proctoring_logs", ["id"])
        op.create_index("ix_exam_proctoring_logs_assignment_id", "exam_proctoring_logs", ["assignment_id"])
        op.create_index("ix_exam_proctoring_logs_event_type", "exam_proctoring_logs", ["event_type"])
        op.create_index("ix_exam_proctoring_logs_occurred_at", "exam_proctoring_logs", ["occurred_at"])
        op.create_index("ix_proctoring_logs_assignment_time", "exam_proctoring_logs", ["assignment_id", "occurred_at"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "exam_proctoring_logs" in tables:
        op.drop_table("exam_proctoring_logs")
