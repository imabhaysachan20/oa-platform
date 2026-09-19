"""add_mcq_weight_to_exams

Revision ID: 010_mcq_weight
Revises: 009_question_counts
Create Date: 2026-09-19 23:53:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "010_mcq_weight"
down_revision: Union[str, None] = "009_question_counts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE exams ADD COLUMN IF NOT EXISTS mcq_weight FLOAT NOT NULL DEFAULT 2.0")


def downgrade() -> None:
    op.execute("ALTER TABLE exams DROP COLUMN IF EXISTS mcq_weight")
