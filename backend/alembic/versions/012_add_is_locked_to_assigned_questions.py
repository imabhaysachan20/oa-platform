"""add_is_locked_to_assigned_questions

Revision ID: 012_assigned_q_lock
Revises: 011_mcq_count
Create Date: 2026-09-20 05:04:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "012_assigned_q_lock"
down_revision: Union[str, None] = "011_mcq_count"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE assigned_questions ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;")


def downgrade() -> None:
    op.execute("ALTER TABLE assigned_questions DROP COLUMN IF EXISTS is_locked;")
