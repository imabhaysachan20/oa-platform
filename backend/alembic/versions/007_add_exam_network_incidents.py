"""add_exam_network_incidents

Revision ID: 007_network_incidents
Revises: 006_target_groups_to_exams
Create Date: 2026-09-18 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007_network_incidents"
down_revision: Union[str, None] = "006_target_groups_to_exams"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "exam_network_incidents" not in tables:
        op.create_table(
            "exam_network_incidents",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("exam_assignments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("disconnected_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("reconnected_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("duration_seconds", sa.Integer(), nullable=True),
            sa.Column("reason", sa.String(length=100), server_default="Heartbeat Timeout (>30s)", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("ix_exam_network_incidents_id", "exam_network_incidents", ["id"])
        op.create_index("ix_exam_network_incidents_assignment_id", "exam_network_incidents", ["assignment_id"])
        op.create_index("ix_exam_network_incidents_disconnected_at", "exam_network_incidents", ["disconnected_at"])
        op.create_index("ix_network_incidents_assignment_time", "exam_network_incidents", ["assignment_id", "disconnected_at"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "exam_network_incidents" in tables:
        op.drop_table("exam_network_incidents")
