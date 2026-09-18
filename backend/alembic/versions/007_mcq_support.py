"""mcq_support

Revision ID: 007_mcq_support
Revises: 006_target_groups_to_exams
Create Date: 2026-09-18 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "007_mcq_support"
down_revision: Union[str, None] = "006_target_groups_to_exams"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Alter questions table
    op.execute("""
        ALTER TABLE questions 
        ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'coding' CHECK (question_type IN ('coding', 'mcq')),
        ADD COLUMN IF NOT EXISTS marks FLOAT NULL,
        ADD COLUMN IF NOT EXISTS mcq_time_limit_seconds INT NULL,
        ADD COLUMN IF NOT EXISTS is_multi_select BOOLEAN NOT NULL DEFAULT false;
    """)
    op.execute("UPDATE questions SET question_type = 'coding' WHERE question_type IS NULL;")

    # 2. Create mcq_options table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mcq_options (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            option_text TEXT NOT NULL,
            is_correct BOOLEAN NOT NULL DEFAULT false,
            order_index INT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_mcq_options_question_id ON mcq_options(question_id);")

    # 3. Create mcq_responses table
    op.execute("""
        CREATE TABLE IF NOT EXISTS mcq_responses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            assignment_id INTEGER NOT NULL REFERENCES exam_assignments(id) ON DELETE CASCADE,
            question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            selected_option_ids UUID[] NOT NULL DEFAULT '{}',
            is_correct BOOLEAN NULL,
            marks_awarded FLOAT NULL,
            answered_at TIMESTAMPTZ NULL,
            is_locked BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_mcq_responses_assignment_question UNIQUE (assignment_id, question_id)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_mcq_responses_assignment_question ON mcq_responses(assignment_id, question_id);")

    # 4. Alter exam_question_pool table
    op.execute("""
        ALTER TABLE exam_question_pool
        ADD COLUMN IF NOT EXISTS selection_mode TEXT NOT NULL DEFAULT 'random' CHECK (selection_mode IN ('random', 'fixed'));
    """)
    op.execute("UPDATE exam_question_pool SET selection_mode = 'random' WHERE selection_mode IS NULL;")

    # 5. Alter assigned_questions table
    op.execute("""
        ALTER TABLE assigned_questions
        ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS question_deadline_at TIMESTAMPTZ NULL;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE assigned_questions DROP COLUMN IF EXISTS question_deadline_at;")
    op.execute("ALTER TABLE assigned_questions DROP COLUMN IF EXISTS question_started_at;")
    op.execute("ALTER TABLE exam_question_pool DROP COLUMN IF EXISTS selection_mode;")
    op.execute("DROP TABLE IF EXISTS mcq_responses;")
    op.execute("DROP TABLE IF EXISTS mcq_options;")
    op.execute("""
        ALTER TABLE questions 
        DROP COLUMN IF EXISTS is_multi_select,
        DROP COLUMN IF EXISTS mcq_time_limit_seconds,
        DROP COLUMN IF EXISTS marks,
        DROP COLUMN IF EXISTS question_type;
    """)
