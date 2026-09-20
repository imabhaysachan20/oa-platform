"""add_verification_photo_url

Revision ID: 014_verification_photo_url
Revises: 013_late_entry_attempts
Create Date: 2026-09-20 17:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "014_verification_photo_url"
down_revision: Union[str, None] = "013_late_entry_attempts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE exam_assignments ADD COLUMN IF NOT EXISTS verification_photo_url TEXT;")


def downgrade() -> None:
    op.execute("ALTER TABLE exam_assignments DROP COLUMN IF EXISTS verification_photo_url;")
