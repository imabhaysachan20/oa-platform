"""add_target_groups_to_exams

Revision ID: 006_target_groups_to_exams
Revises: 005_college_and_group
Create Date: 2026-09-17 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "006_target_groups_to_exams"
down_revision: Union[str, None] = "005_college_and_group"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_groups JSONB DEFAULT '[]'::jsonb")


def downgrade() -> None:
    op.execute("ALTER TABLE exams DROP COLUMN IF EXISTS target_groups")
