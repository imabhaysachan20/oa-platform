"""add_mcq_count_to_exams

Revision ID: 011_mcq_count
Revises: 010_mcq_weight
Create Date: 2026-09-20 00:37:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "011_mcq_count"
down_revision: Union[str, None] = "010_mcq_weight"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE exams ADD COLUMN IF NOT EXISTS mcq_count INTEGER NOT NULL DEFAULT 0")
    # Backfill mcq_count for existing exams that have MCQs in their pool
    op.execute("""
        UPDATE exams
        SET mcq_count = sub.cnt
        FROM (
            SELECT eqp.exam_id, COUNT(*) as cnt
            FROM exam_question_pool eqp
            JOIN questions q ON eqp.question_id = q.id
            WHERE q.question_type = 'mcq'
            GROUP BY eqp.exam_id
        ) sub
        WHERE exams.id = sub.exam_id
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE exams DROP COLUMN IF EXISTS mcq_count")
