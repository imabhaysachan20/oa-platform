"""add_question_counts_to_exams

Revision ID: 009_question_counts
Revises: 008_network_incidents
Create Date: 2026-09-19 23:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "009_question_counts"
down_revision: Union[str, None] = "008_network_incidents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE exams ADD COLUMN IF NOT EXISTS easy_count INTEGER NOT NULL DEFAULT 1")
    op.execute("ALTER TABLE exams ADD COLUMN IF NOT EXISTS medium_count INTEGER NOT NULL DEFAULT 2")
    op.execute("ALTER TABLE exams ADD COLUMN IF NOT EXISTS hard_count INTEGER NOT NULL DEFAULT 0")


def downgrade() -> None:
    op.execute("ALTER TABLE exams DROP COLUMN IF EXISTS easy_count")
    op.execute("ALTER TABLE exams DROP COLUMN IF EXISTS medium_count")
    op.execute("ALTER TABLE exams DROP COLUMN IF EXISTS hard_count")
