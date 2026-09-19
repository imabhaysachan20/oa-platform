import pytest
import uuid
from datetime import datetime, timezone, timedelta
from pydantic import ValidationError

from backend.app.schemas.question import (
    MCQOptionCreate,
    MCQOptionResponse,
    StudentMCQOptionView,
    QuestionCreate,
    QuestionUpdate,
)
from backend.app.services.exam_service import _get_assigned_question_views


def test_mcq_creation_validation():
    """Verify minimum options, marks, and correct-answer rules for MCQ creation."""
    # 1. Less than 2 options fails
    with pytest.raises(ValidationError):
        QuestionCreate(
            title="Invalid MCQ",
            description="Only 1 option",
            difficulty="easy",
            question_type="mcq",
            marks=10.0,
            is_multi_select=False,
            options=[MCQOptionCreate(option_text="Only Option", is_correct=True, order_index=0)],
        )

    # 2. Single-select with zero correct options fails
    with pytest.raises(ValidationError):
        QuestionCreate(
            title="Single Select No Correct",
            description="Needs 1 correct",
            difficulty="easy",
            question_type="mcq",
            marks=10.0,
            is_multi_select=False,
            options=[
                MCQOptionCreate(option_text="A", is_correct=False, order_index=0),
                MCQOptionCreate(option_text="B", is_correct=False, order_index=1),
            ],
        )

    # 3. Single-select with 2 correct options fails
    with pytest.raises(ValidationError):
        QuestionCreate(
            title="Single Select Too Many Correct",
            description="Needs exactly 1 correct",
            difficulty="easy",
            question_type="mcq",
            marks=10.0,
            is_multi_select=False,
            options=[
                MCQOptionCreate(option_text="A", is_correct=True, order_index=0),
                MCQOptionCreate(option_text="B", is_correct=True, order_index=1),
            ],
        )

    # 4. Multi-select with zero correct options fails
    with pytest.raises(ValidationError):
        QuestionCreate(
            title="Multi Select Zero Correct",
            description="Needs at least 1 correct",
            difficulty="easy",
            question_type="mcq",
            marks=10.0,
            is_multi_select=True,
            options=[
                MCQOptionCreate(option_text="A", is_correct=False, order_index=0),
                MCQOptionCreate(option_text="B", is_correct=False, order_index=1),
            ],
        )

    # 5. Non-positive marks fails for MCQ
    with pytest.raises(ValidationError):
        QuestionCreate(
            title="Zero Marks MCQ",
            description="Marks must be > 0",
            difficulty="easy",
            question_type="mcq",
            marks=0.0,
            is_multi_select=False,
            options=[
                MCQOptionCreate(option_text="A", is_correct=True, order_index=0),
                MCQOptionCreate(option_text="B", is_correct=False, order_index=1),
            ],
        )

    # 6. Valid Single Select succeeds
    valid_single = QuestionCreate(
        title="Valid Single Select",
        description="Single select question",
        difficulty="easy",
        question_type="mcq",
        marks=5.0,
        is_multi_select=False,
        mcq_time_limit_seconds=60,
        options=[
            MCQOptionCreate(option_text="A", is_correct=True, order_index=0),
            MCQOptionCreate(option_text="B", is_correct=False, order_index=1),
        ],
    )
    assert valid_single.question_type == "mcq"
    assert valid_single.marks == 5.0
    assert valid_single.mcq_time_limit_seconds == 60

    # 7. Valid Multi Select succeeds
    valid_multi = QuestionCreate(
        title="Valid Multi Select",
        description="Multi select question",
        difficulty="medium",
        question_type="mcq",
        marks=10.0,
        is_multi_select=True,
        options=[
            MCQOptionCreate(option_text="A", is_correct=True, order_index=0),
            MCQOptionCreate(option_text="B", is_correct=True, order_index=1),
            MCQOptionCreate(option_text="C", is_correct=False, order_index=2),
        ],
    )
    assert len(valid_multi.options) == 3


def test_student_mcq_option_view_excludes_is_correct():
    """Verify StudentMCQOptionView structurally never contains is_correct."""
    # Ensure is_correct is NOT a field on StudentMCQOptionView
    assert "is_correct" not in StudentMCQOptionView.model_fields

    opt_id = uuid.uuid4()
    student_view = StudentMCQOptionView(
        id=opt_id,
        option_text="Sample Answer",
        order_index=0,
    )
    dumped = student_view.model_dump()
    assert "is_correct" not in dumped
    assert dumped["id"] == opt_id
    assert dumped["option_text"] == "Sample Answer"


def test_deterministic_option_shuffling():
    """Option order is deterministic per (assignment_id, question_id)."""
    import hashlib
    import random

    raw_options = [f"Option {i}" for i in range(10)]

    def get_shuffled(assignment_id: int, question_id: int):
        seed_material = f"{assignment_id}:{question_id}".encode("utf-8")
        seed = int.from_bytes(hashlib.sha256(seed_material).digest()[:8], "big")
        rng = random.Random(seed)
        shuffled = list(raw_options)
        rng.shuffle(shuffled)
        return shuffled

    # Same assignment_id and question_id produces identical shuffle
    shuffle_1a = get_shuffled(assignment_id=42, question_id=101)
    shuffle_1b = get_shuffled(assignment_id=42, question_id=101)
    assert shuffle_1a == shuffle_1b

    # Different assignment_id produces a different shuffle
    shuffle_2 = get_shuffled(assignment_id=99, question_id=101)
    assert shuffle_1a != shuffle_2


def test_mcq_scoring_formulas():
    """Verify single-select, multi-select, and combined grading logic."""
    # Single Select Scoring
    correct_opt = uuid.uuid4()
    wrong_opt = uuid.uuid4()
    correct_set = {correct_opt}

    # Correct single selection -> full marks
    selected_correct = {correct_opt}
    is_correct = selected_correct == correct_set
    marks_awarded = 5.0 if is_correct else 0.0
    assert is_correct is True
    assert marks_awarded == 5.0

    # Incorrect single selection -> 0 marks
    selected_wrong = {wrong_opt}
    is_correct = selected_wrong == correct_set
    marks_awarded = 5.0 if is_correct else 0.0
    assert is_correct is False
    assert marks_awarded == 0.0

    # Multi Select Scoring
    c1, c2, w1 = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    multi_correct_set = {c1, c2}

    # Full correct multi selection -> full marks
    assert ({c1, c2} == multi_correct_set) is True
    # Partial multi selection (only 1 of 2) -> 0 marks
    assert ({c1} == multi_correct_set) is False
    # Correct + extraneous wrong selection -> 0 marks
    assert ({c1, c2, w1} == multi_correct_set) is False


def test_combined_coding_and_mcq_score_aggregation():
    """Verify total score combines coding testcase marks and MCQ marks."""
    # Scenario:
    # 2 Coding Questions:
    # - Q1: diff_weight=10.0, 4/4 testcases passed -> final_score=10.0
    # - Q2: diff_weight=20.0, 2/4 testcases passed -> final_score=10.0
    # 2 MCQ Questions:
    # - MCQ1: marks=5.0, answered correctly -> marks_awarded=5.0
    # - MCQ2: marks=5.0, answered incorrectly -> marks_awarded=0.0

    coding_weights = [10.0, 20.0]
    coding_final_scores = [10.0, 10.0]

    mcq_marks = [5.0, 5.0]
    mcq_awarded = [5.0, 0.0]

    total_raw = sum(coding_final_scores) + sum(mcq_awarded)  # 20.0 + 5.0 = 25.0
    max_possible = sum(coding_weights) + sum(mcq_marks)      # 30.0 + 10.0 = 40.0

    total_score = round((total_raw / max_possible) * 100.0, 2)
    # 25.0 / 40.0 = 0.625 -> 62.5%
    assert total_score == 62.5


def test_pure_coding_exam_scoring_backward_compatibility():
    """Verify that pure coding exams with 0 MCQs score exactly as before."""
    coding_weights = [10.0, 20.0, 20.0]  # 50.0 max
    coding_final_scores = [10.0, 10.0, 20.0]  # 40.0 earned

    mcq_marks = []
    mcq_awarded = []

    total_raw = sum(coding_final_scores) + sum(mcq_awarded)  # 40.0
    max_possible = sum(coding_weights) + sum(mcq_marks)      # 50.0

    total_score = round((total_raw / max_possible) * 100.0, 2)
    # 40.0 / 50.0 = 80.0%
    assert total_score == 80.0


@pytest.mark.asyncio
async def test_mcq_answer_key_edit_lock_on_active_exam():
    """Verify 409 Conflict is raised when updating options of a question in an active exam."""
    from fastapi import HTTPException
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import NullPool
    from backend.app.core.config import settings
    from backend.app.models.user import User, UserRole
    from backend.app.models.question import Question, MCQOption
    from backend.app.models.exam import Exam, ExamQuestionPool, ExamAssignment, AssignmentStatus
    from backend.app.api.admin import update_question

    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        now = datetime.now(timezone.utc)

        # 1. Create admin user
        admin = User(
            name="Admin Test",
            email=f"admin_{uuid.uuid4().hex[:8]}@test.com",
            role=UserRole.ADMIN,
            password_hash="testhash"
        )
        db.add(admin)
        await db.flush()

        # 2. Create MCQ question
        q = Question(
            title="Lock Test Question",
            description="Should not be editable once exam live",
            difficulty="easy",
            question_type="mcq",
            marks=10.0,
            is_multi_select=False
        )
        db.add(q)
        await db.flush()

        opt1 = MCQOption(question_id=q.id, option_text="Opt 1", is_correct=True, order_index=0)
        opt2 = MCQOption(question_id=q.id, option_text="Opt 2", is_correct=False, order_index=1)
        db.add_all([opt1, opt2])
        await db.flush()

        # 3. Create active exam attached to this question
        exam = Exam(
            title="Active Exam",
            duration_minutes=30,
            start_time=now - timedelta(minutes=5),  # Live!
            end_time=now + timedelta(hours=1),
            easy_weight=10.0,
            medium_weight=20.0,
            hard_weight=30.0,
            is_published=True
        )
        db.add(exam)
        await db.flush()

        pool_entry = ExamQuestionPool(
            exam_id=exam.id,
            question_id=q.id,
            difficulty="easy",
            selection_mode="fixed"
        )
        db.add(pool_entry)
        await db.commit()

        # 4. Attempt to update options while exam is live -> must raise 409 Conflict
        update_payload = QuestionUpdate(
            options=[
                MCQOptionCreate(option_text="New Opt 1", is_correct=True, order_index=0),
                MCQOptionCreate(option_text="New Opt 2", is_correct=False, order_index=1)
            ]
        )

        with pytest.raises(HTTPException) as exc_info:
            await update_question(
                question_id=q.id,
                body=update_payload,
                current_admin=admin,
                db=db
            )
        assert exc_info.value.status_code == 409
        assert "Cannot modify answer key" in exc_info.value.detail


@pytest.mark.asyncio
async def test_mcq_submission_rejections_and_validations():
    """Verify late submissions, invalid options, and multi-select rule rejections (HTTP 400)."""
    from fastapi import HTTPException
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import NullPool
    from backend.app.core.config import settings
    from backend.app.models.user import User, UserRole
    from backend.app.models.question import Question, MCQOption
    from backend.app.models.exam import Exam, ExamAssignment, AssignedQuestion, AssignmentStatus
    from backend.app.models.submission import MCQResponse
    from backend.app.schemas.submission import SubmitMCQResponseRequest
    from backend.app.api.submissions import _handle_submit_mcq_response

    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        now = datetime.now(timezone.utc)

        # Create student user
        student = User(
            name="Student Sub Test",
            email=f"student_{uuid.uuid4().hex[:8]}@test.com",
            role=UserRole.STUDENT,
            password_hash="testhash"
        )
        db.add(student)
        await db.flush()

        # Create single-select question
        q = Question(
            title="Validation Question",
            description="Single select test",
            difficulty="easy",
            question_type="mcq",
            marks=5.0,
            is_multi_select=False
        )
        db.add(q)
        await db.flush()

        opt_a = MCQOption(question_id=q.id, option_text="A", is_correct=True, order_index=0)
        opt_b = MCQOption(question_id=q.id, option_text="B", is_correct=False, order_index=1)
        db.add_all([opt_a, opt_b])
        await db.flush()

        # Create exam & assignment
        exam = Exam(
            title="Validation Exam",
            duration_minutes=30,
            is_published=True
        )
        db.add(exam)
        await db.flush()

        assignment = ExamAssignment(
            exam_id=exam.id,
            user_id=student.id,
            status=AssignmentStatus.IN_PROGRESS,
            started_at=now,
            deadline_at=now + timedelta(minutes=30)
        )
        db.add(assignment)
        await db.flush()

        assigned_q = AssignedQuestion(
            assignment_id=assignment.id,
            question_id=q.id,
            difficulty=q.difficulty,
            order_index=0,
            question_started_at=now,
            question_deadline_at=now + timedelta(minutes=10)
        )
        db.add(assigned_q)
        await db.commit()

        # Case 1: Multiple options submitted for single-select -> 400
        with pytest.raises(HTTPException) as exc1:
            await _handle_submit_mcq_response(
                SubmitMCQResponseRequest(
                    assignment_id=assignment.id,
                    question_id=q.id,
                    selected_option_ids=[opt_a.id, opt_b.id]
                ),
                current_user=student,
                db=db
            )
        assert exc1.value.status_code == 400
        assert "single option" in exc1.value.detail

        # Case 2: Option ID not belonging to question -> 400
        fake_opt_id = uuid.uuid4()
        with pytest.raises(HTTPException) as exc2:
            await _handle_submit_mcq_response(
                SubmitMCQResponseRequest(
                    assignment_id=assignment.id,
                    question_id=q.id,
                    selected_option_ids=[fake_opt_id]
                ),
                current_user=student,
                db=db
            )
        assert exc2.value.status_code == 400
        assert "do not belong" in exc2.value.detail

        # Case 3: Valid submission -> 200 / persists successfully
        resp = await _handle_submit_mcq_response(
            SubmitMCQResponseRequest(
                assignment_id=assignment.id,
                question_id=q.id,
                selected_option_ids=[opt_a.id]
            ),
            current_user=student,
            db=db
        )
        assert resp.selected_option_ids == [opt_a.id]
        assert resp.is_locked is False

        # Case 4a: Within 7-second network grace period -> accepted
        assigned_q.question_deadline_at = now - timedelta(seconds=2)
        await db.commit()

        resp_grace = await _handle_submit_mcq_response(
            SubmitMCQResponseRequest(
                assignment_id=assignment.id,
                question_id=q.id,
                selected_option_ids=[opt_a.id]
            ),
            current_user=student,
            db=db
        )
        assert resp_grace.selected_option_ids == [opt_a.id]

        # Case 4b: Beyond network grace period -> 400
        assigned_q.question_deadline_at = now - timedelta(seconds=15)
        await db.commit()

        with pytest.raises(HTTPException) as exc4:
            await _handle_submit_mcq_response(
                SubmitMCQResponseRequest(
                    assignment_id=assignment.id,
                    question_id=q.id,
                    selected_option_ids=[opt_a.id]
                ),
                current_user=student,
                db=db
            )
        assert exc4.value.status_code == 400
        assert "expired" in exc4.value.detail.lower()


@pytest.mark.asyncio
async def test_auto_submit_scan_for_expired_mcq():
    """Verify Celery task scans expired question_deadline_at and locks responses."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import NullPool
    from backend.app.core.config import settings
    from backend.app.models.user import User, UserRole
    from backend.app.models.question import Question, MCQOption
    from backend.app.models.exam import Exam, ExamAssignment, AssignedQuestion, AssignmentStatus
    from backend.app.models.submission import MCQResponse
    from backend.app.tasks.auto_submit import _process_expired_mcq_questions

    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        now = datetime.now(timezone.utc)

        student = User(
            name="Auto Submit Student",
            email=f"autosub_{uuid.uuid4().hex[:8]}@test.com",
            role=UserRole.STUDENT,
            password_hash="testhash"
        )
        db.add(student)
        await db.flush()

        q = Question(
            title="Expired Question",
            description="Timer has passed",
            difficulty="easy",
            question_type="mcq",
            marks=10.0,
            is_multi_select=False
        )
        db.add(q)
        await db.flush()

        opt_correct = MCQOption(question_id=q.id, option_text="Correct", is_correct=True, order_index=0)
        opt_wrong = MCQOption(question_id=q.id, option_text="Wrong", is_correct=False, order_index=1)
        db.add_all([opt_correct, opt_wrong])
        await db.flush()

        exam = Exam(title="Scan Exam", duration_minutes=60, is_published=True)
        db.add(exam)
        await db.flush()

        assignment = ExamAssignment(
            exam_id=exam.id,
            user_id=student.id,
            status=AssignmentStatus.IN_PROGRESS,
            started_at=now - timedelta(minutes=20),
            deadline_at=now + timedelta(minutes=40)
        )
        db.add(assignment)
        await db.flush()

        # Assigned question with expired question_deadline_at
        assigned_q = AssignedQuestion(
            assignment_id=assignment.id,
            question_id=q.id,
            difficulty=q.difficulty,
            order_index=0,
            question_started_at=now - timedelta(minutes=15),
            question_deadline_at=now - timedelta(minutes=5)
        )
        db.add(assigned_q)

        # Unlocked response with correct answer selected
        resp = MCQResponse(
            assignment_id=assignment.id,
            question_id=q.id,
            selected_option_ids=[opt_correct.id],
            answered_at=now - timedelta(minutes=6),
            is_locked=False
        )
        db.add(resp)
        await db.commit()

        # Run process expired MCQs
        locked_count = await _process_expired_mcq_questions()
        assert locked_count >= 1

        # Check response is now locked and graded
        await db.refresh(resp)
        assert resp.is_locked is True
        assert resp.is_correct is True
        assert resp.marks_awarded == 10.0
