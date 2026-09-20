"""add_target_colleges_to_exams

Revision ID: 015_target_colleges_to_exams
Revises: 014_verification_photo_url
Create Date: 2026-09-20 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "015_target_colleges_to_exams"
down_revision: Union[str, None] = "014_verification_photo_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_colleges JSONB DEFAULT '[]'::jsonb")


def downgrade() -> None:
    op.execute("ALTER TABLE exams DROP COLUMN IF EXISTS target_colleges")
