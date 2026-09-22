"""add_leaderboard_indexes

Revision ID: 016_leaderboard_indexes
Revises: 015_target_colleges_to_exams
Create Date: 2026-09-20 22:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "016_leaderboard_indexes"
down_revision: Union[str, None] = "015_target_colleges_to_exams"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_exam_proctoring_logs_assignment_event_type "
        "ON exam_proctoring_logs (assignment_id, event_type);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_exam_results_assignment_id "
        "ON exam_results (assignment_id);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_exam_proctoring_logs_assignment_event_type;")
    op.execute("DROP INDEX IF EXISTS ix_exam_results_assignment_id;")
