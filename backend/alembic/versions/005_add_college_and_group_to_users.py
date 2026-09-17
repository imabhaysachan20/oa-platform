"""add_college_and_group_to_users

Revision ID: 005_college_and_group
Revises: 004_signature_and_drivers
Create Date: 2026-09-17 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "005_college_and_group"
down_revision: Union[str, None] = "004_signature_and_drivers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS college VARCHAR(255)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS candidate_group VARCHAR(100)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_college ON users (college)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_candidate_group ON users (candidate_group)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_candidate_group")
    op.execute("DROP INDEX IF EXISTS ix_users_college")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS temp_password")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS candidate_group")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS college")
