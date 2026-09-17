"""initial_schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-09-13 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("roll_no", sa.String(length=100), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("student", "admin", name="userrole"), nullable=False, server_default="student"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_roll_no", "users", ["roll_no"], unique=True)

    # 2. questions
    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.Enum("easy", "medium", "hard", name="questiondifficulty"), nullable=False),
        sa.Column("time_limit_ms", sa.Integer(), nullable=False, server_default="2000"),
        sa.Column("memory_limit_kb", sa.Integer(), nullable=False, server_default="128000"),
        sa.Column("sample_input", sa.Text(), nullable=True),
        sa.Column("sample_output", sa.Text(), nullable=True),
        sa.Column("input_format", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_questions_id", "questions", ["id"])
    op.create_index("ix_questions_difficulty", "questions", ["difficulty"])

    # 3. test_cases
    op.create_table(
        "test_cases",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("input", sa.Text(), nullable=False),
        sa.Column("expected_output", sa.Text(), nullable=False),
        sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("weight", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_test_cases_id", "test_cases", ["id"])
    op.create_index("ix_test_cases_question_id", "test_cases", ["question_id"])

    # 4. exams
    op.create_table(
        "exams",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("easy_weight", sa.Float(), nullable=False, server_default="10.0"),
        sa.Column("medium_weight", sa.Float(), nullable=False, server_default="20.0"),
        sa.Column("hard_weight", sa.Float(), nullable=False, server_default="30.0"),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_exams_id", "exams", ["id"])

    # 5. exam_question_pool
    op.create_table(
        "exam_question_pool",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("difficulty", sa.Enum("easy", "medium", "hard", name="questiondifficulty", create_type=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("exam_id", "question_id", name="uq_exam_question_pool"),
    )
    op.create_index("ix_exam_question_pool_id", "exam_question_pool", ["id"])
    op.create_index("ix_exam_question_pool_exam_id_difficulty", "exam_question_pool", ["exam_id", "difficulty"])

    # 6. exam_assignments
    op.create_table(
        "exam_assignments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.Enum("not_started", "in_progress", "submitted", "auto_submitted", name="assignmentstatus"), nullable=False, server_default="not_started"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("exam_id", "user_id", name="uq_exam_user_assignment"),
    )
    op.create_index("ix_exam_assignments_id", "exam_assignments", ["id"])
    op.create_index("ix_exam_assignments_exam_id_status", "exam_assignments", ["exam_id", "status"])

    # 7. assigned_questions
    op.create_table(
        "assigned_questions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("exam_assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("difficulty", sa.Enum("easy", "medium", "hard", name="questiondifficulty", create_type=False), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("assignment_id", "question_id", name="uq_assignment_question"),
    )
    op.create_index("ix_assigned_questions_id", "assigned_questions", ["id"])
    op.create_index("ix_assigned_questions_assignment_id", "assigned_questions", ["assignment_id"])

    # 8. submissions
    op.create_table(
        "submissions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("exam_assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("language", sa.String(length=50), nullable=False),
        sa.Column("judge0_token", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="Pending"),
        sa.Column("test_cases_passed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_test_cases", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("exec_time_ms", sa.Float(), nullable=True),
        sa.Column("is_final", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_submissions_id", "submissions", ["id"])
    op.create_index("ix_submissions_assignment_question", "submissions", ["assignment_id", "question_id"])
    op.create_index("ix_submissions_is_final", "submissions", ["is_final"])

    # 9. question_scores
    op.create_table(
        "question_scores",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("exam_assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("correctness", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("time_taken_sec", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("difficulty_weight", sa.Float(), nullable=False, server_default="10.0"),
        sa.Column("time_bonus", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("final_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("assignment_id", "question_id", name="uq_assignment_question_score"),
    )
    op.create_index("ix_question_scores_id", "question_scores", ["id"])
    op.create_index("ix_question_scores_assignment_id", "question_scores", ["assignment_id"])

    # 10. exam_results
    op.create_table(
        "exam_results",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("exam_assignments.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("total_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_exam_results_id", "exam_results", ["id"])
    op.create_index("ix_exam_results_total_score", "exam_results", ["total_score"])


def downgrade() -> None:
    op.drop_table("exam_results")
    op.drop_table("question_scores")
    op.drop_table("submissions")
    op.drop_table("assigned_questions")
    op.drop_table("exam_assignments")
    op.drop_table("exam_question_pool")
    op.drop_table("exams")
    op.drop_table("test_cases")
    op.drop_table("questions")
    op.drop_table("users")

    # Drop enums
    sa.Enum(name="assignmentstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="questiondifficulty").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
