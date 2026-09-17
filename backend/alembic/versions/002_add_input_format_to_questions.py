"""add_input_format_to_questions

Revision ID: 002_input_format
Revises: 001_initial
Create Date: 2026-09-16 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_input_format"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS input_format TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE questions DROP COLUMN IF EXISTS input_format")
