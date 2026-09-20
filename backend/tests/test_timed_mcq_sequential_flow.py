import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from backend.app.core.config import settings
from backend.app.models.user import User, UserRole
from backend.app.models.question import Question, QuestionDifficulty, MCQOption
from backend.app.models.exam import Exam, ExamAssignment, AssignedQuestion, ExamQuestionPool, AssignmentStatus
from backend.app.services.exam_service import (
    start_exam_for_student,
    lock_assigned_question,
    _get_assigned_question_views,
)
from backend.app.api.submissions import _handle_submit_mcq_response
from backend.app.schemas.submission import SubmitMCQResponseRequest
from backend.app.schemas.exam import DeviceTelemetryPayload


@pytest.mark.asyncio
async def test_timed_mcq_ordered_first_in_exam():
    """Verify start_exam_for_student partitions questions: Timed MCQs first, then Untimed MCQs, then Coding questions."""
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        # Create student
        student = User(
            name="Sequential Test Student",
            email=f"seq_{uuid.uuid4().hex[:8]}@test.com",
            role=UserRole.STUDENT,
            password_hash="hash"
        )
        db.add(student)
        await db.flush()

        # Create 1 Timed MCQ, 1 Untimed MCQ, 1 Coding question
        q_untimed_mcq = Question(
            title="Untimed MCQ",
            description="Untimed prompt",
            difficulty=QuestionDifficulty.EASY,
            question_type="mcq",
            mcq_time_limit_seconds=None
        )
        q_timed_mcq = Question(
            title="Timed MCQ",
            description="Timed prompt",
            difficulty=QuestionDifficulty.EASY,
            question_type="mcq",
            mcq_time_limit_seconds=45
        )
        q_coding = Question(
            title="Coding Problem",
            description="Coding prompt",
            difficulty=QuestionDifficulty.EASY,
            question_type="coding"
        )
        db.add_all([q_untimed_mcq, q_timed_mcq, q_coding])
        await db.flush()

        # Add options to MCQs
        opt1 = MCQOption(question_id=q_untimed_mcq.id, option_text="A", is_correct=True, order_index=0)
        opt2 = MCQOption(question_id=q_untimed_mcq.id, option_text="B", is_correct=False, order_index=1)
        opt3 = MCQOption(question_id=q_timed_mcq.id, option_text="A", is_correct=True, order_index=0)
        opt4 = MCQOption(question_id=q_timed_mcq.id, option_text="B", is_correct=False, order_index=1)
        db.add_all([opt1, opt2, opt3, opt4])
        await db.flush()

        # Create Exam with all 3 in pool
        exam = Exam(
            title=f"Sequential Exam {uuid.uuid4().hex[:6]}",
            duration_minutes=60,
            is_published=True,
            mcq_count=2,
            easy_count=1,
            medium_count=0,
            hard_count=0,
        )
        db.add(exam)
        await db.flush()

        pool_entries = [
            ExamQuestionPool(exam_id=exam.id, question_id=q_untimed_mcq.id, difficulty=QuestionDifficulty.EASY),
            ExamQuestionPool(exam_id=exam.id, question_id=q_timed_mcq.id, difficulty=QuestionDifficulty.EASY),
            ExamQuestionPool(exam_id=exam.id, question_id=q_coding.id, difficulty=QuestionDifficulty.EASY),
        ]
        db.add_all(pool_entries)
        await db.commit()

        # Start exam for student
        telemetry = DeviceTelemetryPayload(
            browser="Chrome 120",
            os="Windows",
            device_type="Desktop",
            screen_resolution="1920x1080",
            device_fingerprint="fp_seq_1",
            latitude=28.6139,
            longitude=77.2090,
            accuracy=15.0,
            location_status="granted"
        )
        start_res = await start_exam_for_student(
            db=db,
            exam_id=exam.id,
            user_id=student.id,
            telemetry=telemetry
        )

        assert len(start_res.questions) == 3
        # Timed MCQ must be first (index 0)
        assert start_res.questions[0].id == q_timed_mcq.id
        assert start_res.questions[0].mcq_time_limit_seconds == 45

        # Untimed MCQ must be second (index 1)
        assert start_res.questions[1].id == q_untimed_mcq.id
        assert start_res.questions[1].question_type == "mcq"

        # Coding question must be third (index 2)
        assert start_res.questions[2].id == q_coding.id
        assert start_res.questions[2].question_type == "coding"


@pytest.mark.asyncio
async def test_lock_assigned_question_and_rejection():
    """Verify lock_assigned_question seals the question and rejects subsequent updates."""
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        student = User(
            name="Lock Test Student",
            email=f"lock_{uuid.uuid4().hex[:8]}@test.com",
            role=UserRole.STUDENT,
            password_hash="hash"
        )
        db.add(student)
        await db.flush()

        q = Question(
            title="Timed Lock MCQ",
            description="Prompt",
            difficulty=QuestionDifficulty.EASY,
            question_type="mcq",
            mcq_time_limit_seconds=60
        )
        db.add(q)
        await db.flush()

        opt1 = MCQOption(question_id=q.id, option_text="A", is_correct=True, order_index=0)
        opt2 = MCQOption(question_id=q.id, option_text="B", is_correct=False, order_index=1)
        db.add_all([opt1, opt2])
        await db.flush()

        exam = Exam(
            title=f"Lock Exam {uuid.uuid4().hex[:6]}",
            duration_minutes=60,
            is_published=True
        )
        db.add(exam)
        await db.flush()

        assignment = ExamAssignment(
            exam_id=exam.id,
            user_id=student.id,
            started_at=datetime.now(timezone.utc),
            status=AssignmentStatus.IN_PROGRESS
        )
        db.add(assignment)
        await db.flush()

        assigned_q = AssignedQuestion(
            assignment_id=assignment.id,
            question_id=q.id,
            difficulty=QuestionDifficulty.EASY,
            order_index=0,
            question_started_at=datetime.now(timezone.utc),
            question_deadline_at=datetime.now(timezone.utc) + timedelta(seconds=60),
            is_locked=False
        )
        db.add(assigned_q)
        await db.commit()

        # 1. Normal submission before lock succeeds
        sub_res = await _handle_submit_mcq_response(
            body=SubmitMCQResponseRequest(
                assignment_id=assignment.id,
                question_id=q.id,
                selected_option_ids=[opt1.id]
            ),
            current_user=student,
            db=db
        )
        assert sub_res.assignment_id == assignment.id
        assert sub_res.is_locked is False

        # 2. Call lock_assigned_question
        lock_res = await lock_assigned_question(
            db=db,
            exam_id=exam.id,
            question_id=q.id,
            user_id=student.id
        )
        assert lock_res["locked"] is True
        assert lock_res["question_id"] == q.id

        # 3. Question view now has is_mcq_locked = True
        views = await _get_assigned_question_views(db, assignment.id)
        assert len(views) == 1
        assert views[0].is_mcq_locked is True

        # 4. Subsequent submission attempt MUST be rejected with 400
        with pytest.raises(HTTPException) as exc_info:
            await _handle_submit_mcq_response(
                body=SubmitMCQResponseRequest(
                    assignment_id=assignment.id,
                    question_id=q.id,
                    selected_option_ids=[opt2.id]
                ),
                current_user=student,
                db=db
            )
        assert exc_info.value.status_code == 400
        assert "locked" in exc_info.value.detail.lower()
