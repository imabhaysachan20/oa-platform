"""add_question_signature_and_drivers

Revision ID: 004_signature_and_drivers
Revises: 003_proctoring_logs
Create Date: 2026-09-17 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "004_signature_and_drivers"
down_revision: Union[str, None] = "003_proctoring_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS function_name VARCHAR(100)")
    op.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS function_signature VARCHAR(255)")
    op.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS parameters JSON")
    op.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS return_type VARCHAR(50)")
    op.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS starter_code JSON")
    op.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS driver_code JSON")


def downgrade() -> None:
    op.execute("ALTER TABLE questions DROP COLUMN IF EXISTS driver_code")
    op.execute("ALTER TABLE questions DROP COLUMN IF EXISTS starter_code")
    op.execute("ALTER TABLE questions DROP COLUMN IF EXISTS return_type")
    op.execute("ALTER TABLE questions DROP COLUMN IF EXISTS parameters")
    op.execute("ALTER TABLE questions DROP COLUMN IF EXISTS function_signature")
    op.execute("ALTER TABLE questions DROP COLUMN IF EXISTS function_name")
