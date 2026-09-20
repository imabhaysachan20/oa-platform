"""add_late_entry_and_attempt_tracking

Revision ID: 013_late_entry_attempts
Revises: 012_assigned_q_lock
Create Date: 2026-09-20 09:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "013_late_entry_attempts"
down_revision: Union[str, None] = "012_assigned_q_lock"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add late_entry_window_minutes to exams
    op.execute("ALTER TABLE exams ADD COLUMN IF NOT EXISTS late_entry_window_minutes INTEGER NOT NULL DEFAULT 15;")

    # 2. Add attempt tracking columns to exam_assignments
    op.execute("ALTER TABLE exam_assignments ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1;")
    op.execute("ALTER TABLE exam_assignments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;")
    op.execute("ALTER TABLE exam_assignments ADD COLUMN IF NOT EXISTS reset_by_admin BOOLEAN NOT NULL DEFAULT FALSE;")
    op.execute("ALTER TABLE exam_assignments ADD COLUMN IF NOT EXISTS reset_reason TEXT;")

    # 3. Drop old unique constraint and create new attempt-scoped unique constraint
    op.execute("ALTER TABLE exam_assignments DROP CONSTRAINT IF EXISTS uq_exam_user_assignment;")
    op.execute("ALTER TABLE exam_assignments DROP CONSTRAINT IF EXISTS uq_exam_user_assignment_attempt;")
    op.execute("ALTER TABLE exam_assignments ADD CONSTRAINT uq_exam_user_assignment_attempt UNIQUE (exam_id, user_id, attempt_number);")

    # 4. Create active attempt index
    op.execute("CREATE INDEX IF NOT EXISTS ix_exam_assignments_user_active ON exam_assignments (exam_id, user_id, is_active);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_exam_assignments_user_active;")
    op.execute("ALTER TABLE exam_assignments DROP CONSTRAINT IF EXISTS uq_exam_user_assignment_attempt;")
    op.execute("ALTER TABLE exam_assignments ADD CONSTRAINT uq_exam_user_assignment UNIQUE (exam_id, user_id);")
    op.execute("ALTER TABLE exam_assignments DROP COLUMN IF EXISTS reset_reason;")
    op.execute("ALTER TABLE exam_assignments DROP COLUMN IF EXISTS reset_by_admin;")
    op.execute("ALTER TABLE exam_assignments DROP COLUMN IF EXISTS is_active;")
    op.execute("ALTER TABLE exam_assignments DROP COLUMN IF EXISTS attempt_number;")
    op.execute("ALTER TABLE exams DROP COLUMN IF EXISTS late_entry_window_minutes;")
