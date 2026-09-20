import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from backend.app.core.config import settings
from backend.app.models.user import User, UserRole
from backend.app.models.question import Question, QuestionDifficulty
from backend.app.models.exam import Exam, ExamQuestionPool, ExamAssignment, AssignedQuestion, AssignmentStatus
from backend.app.models.submission import Submission
from backend.app.models.proctoring import ExamProctoringLog
from backend.app.models.result import ExamResult, QuestionScore
from backend.app.services.exam_service import (
    start_exam_for_student,
    fresh_restart_candidate_exam,
    get_candidate_dossier,
)
from backend.app.services.submission_service import submit_code_solution


@pytest.mark.asyncio
async def test_late_entry_lockout_after_window():
    """Verify candidate cannot enter a timed assessment after the late entry grace window expires."""
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        now = datetime.now(timezone.utc)

        # 1. Create student
        student = User(
            name="Late Student",
            email=f"late_student_{uuid.uuid4().hex[:8]}@test.com",
            password_hash="pw",
            role=UserRole.STUDENT,
        )
        db.add(student)
        await db.flush()

        # 2. Create question
        q = Question(
            title=f"Sample Question {uuid.uuid4().hex[:4]}",
            description="Sample",
            difficulty=QuestionDifficulty.EASY,
            question_type="coding",
        )
        db.add(q)
        await db.flush()

        # 3. Create exam started 20 mins ago, late entry window 15 mins (duration 60 mins)
        exam = Exam(
            title=f"Timed Exam {uuid.uuid4().hex[:6]}",
            duration_minutes=60,
            late_entry_window_minutes=15,
            start_time=now - timedelta(minutes=20),
            end_time=now + timedelta(minutes=40),
            easy_count=1,
            medium_count=0,
            hard_count=0,
            mcq_count=0,
            is_published=True,
        )
        db.add(exam)
        await db.flush()

        pool_entry = ExamQuestionPool(
            exam_id=exam.id,
            question_id=q.id,
            difficulty=q.difficulty,
            selection_mode="random",
        )
        db.add(pool_entry)
        await db.commit()

        # 4. Attempt to start exam - should raise HTTPException 403
        with pytest.raises(HTTPException) as exc_info:
            await start_exam_for_student(db=db, exam_id=exam.id, user_id=student.id)
        assert exc_info.value.status_code == 403
        assert "late entry window" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_short_exam_exempt_from_lockout():
    """Verify tests with duration <= late_entry_window_minutes allow candidate entry anytime within window."""
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        now = datetime.now(timezone.utc)

        # 1. Create student
        student = User(
            name="Short Exam Student",
            email=f"short_student_{uuid.uuid4().hex[:8]}@test.com",
            password_hash="pw",
            role=UserRole.STUDENT,
        )
        db.add(student)
        await db.flush()

        # 2. Create question
        q = Question(
            title=f"Short Exam Question {uuid.uuid4().hex[:4]}",
            description="Sample",
            difficulty=QuestionDifficulty.EASY,
            question_type="coding",
        )
        db.add(q)
        await db.flush()

        # 3. Exam: duration 10 mins <= late_entry_window 15 mins. Started 20 mins ago, ends in 40 mins.
        exam = Exam(
            title=f"Short Exam {uuid.uuid4().hex[:6]}",
            duration_minutes=10,
            late_entry_window_minutes=15,
            start_time=now - timedelta(minutes=20),
            end_time=now + timedelta(minutes=40),
            easy_count=1,
            medium_count=0,
            hard_count=0,
            mcq_count=0,
            is_published=True,
        )
        db.add(exam)
        await db.flush()

        pool_entry = ExamQuestionPool(
            exam_id=exam.id,
            question_id=q.id,
            difficulty=q.difficulty,
            selection_mode="random",
        )
        db.add(pool_entry)
        await db.commit()

        # 4. Student should be allowed to enter because duration <= late_entry_window
        resp = await start_exam_for_student(db=db, exam_id=exam.id, user_id=student.id)
        assert resp is not None
        assert resp.assignment_id is not None
        assert len(resp.questions) == 1


@pytest.mark.asyncio
async def test_admin_fresh_restart_preserves_old_and_creates_new():
    """Verify admin fresh restart archives attempt 1, preserves logs/submissions, and grants attempt 2 with fresh questions."""
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        now = datetime.now(timezone.utc)

        # 1. Create admin and student
        admin = User(
            name="Test Admin",
            email=f"admin_{uuid.uuid4().hex[:8]}@test.com",
            password_hash="pw",
            role=UserRole.ADMIN,
        )
        student = User(
            name="Restart Candidate",
            email=f"restart_{uuid.uuid4().hex[:8]}@test.com",
            password_hash="pw",
            role=UserRole.STUDENT,
        )
        db.add_all([admin, student])
        await db.flush()

        # 2. Create 4 questions so randomization draws from pool
        questions = []
        for i in range(4):
            q = Question(
                title=f"Pool Question {i+1} {uuid.uuid4().hex[:4]}",
                description="Sample problem",
                difficulty=QuestionDifficulty.EASY,
                question_type="coding",
            )
            db.add(q)
            questions.append(q)
        await db.flush()

        # 3. Create exam with start_time in the past, late entry window expired
        exam = Exam(
            title=f"Restart Test Exam {uuid.uuid4().hex[:6]}",
            duration_minutes=60,
            late_entry_window_minutes=15,
            start_time=now - timedelta(minutes=40),
            end_time=now + timedelta(minutes=80),
            easy_count=2,
            medium_count=0,
            hard_count=0,
            mcq_count=0,
            is_published=True,
        )
        db.add(exam)
        await db.flush()

        for q in questions:
            db.add(
                ExamQuestionPool(
                    exam_id=exam.id,
                    question_id=q.id,
                    difficulty=q.difficulty,
                    selection_mode="random",
                )
            )
        await db.commit()

        # 4. Create initial assignment (attempt 1) that was started
        assignment_1 = ExamAssignment(
            exam_id=exam.id,
            user_id=student.id,
            attempt_number=1,
            is_active=True,
            status=AssignmentStatus.IN_PROGRESS,
            started_at=now - timedelta(minutes=35),
        )
        db.add(assignment_1)
        await db.flush()

        # Add an assigned question and submission to attempt 1 to verify preservation
        aq1 = AssignedQuestion(
            assignment_id=assignment_1.id,
            question_id=questions[0].id,
            difficulty=QuestionDifficulty.EASY,
            order_index=0,
        )
        db.add(aq1)

        qs1 = QuestionScore(
            assignment_id=assignment_1.id,
            question_id=questions[0].id,
            correctness=1.0,
            difficulty_weight=10.0,
            final_score=10.0,
        )
        db.add(qs1)

        res1 = ExamResult(
            assignment_id=assignment_1.id,
            total_score=50.0,
        )
        db.add(res1)

        sub1 = Submission(
            assignment_id=assignment_1.id,
            question_id=questions[0].id,
            code="print('attempt 1')",
            language="python",
            status="accepted",
            test_cases_passed=2,
            total_test_cases=2,
            is_final=True,
        )
        db.add(sub1)

        log1 = ExamProctoringLog(
            assignment_id=assignment_1.id,
            event_type="TAB_SWITCH",
            title="Tab Switch Detected",
            description="Candidate switched browser tabs",
            meta_data='{"info": "switched tabs"}',
        )
        db.add(log1)
        await db.commit()

        # 5. Admin performs Fresh Restart
        restart_resp = await fresh_restart_candidate_exam(
            db=db,
            exam_id=exam.id,
            assignment_id=assignment_1.id,
            admin_user=admin,
            reason="Verified machine freeze / blue screen during attempt 1",
        )

        assert restart_resp.user_id == student.id
        assert restart_resp.old_assignment_id == assignment_1.id
        assert restart_resp.attempt_number == 2
        assert restart_resp.new_assignment_id != assignment_1.id

        # 6. Verify Attempt 1 state in DB
        await db.refresh(assignment_1)
        assert assignment_1.is_active is False

        # Verify Attempt 1 score result, submissions, and logs still exist
        res_check = await db.scalar(
            select(ExamResult).where(ExamResult.assignment_id == assignment_1.id)
        )
        assert res_check is not None
        assert res_check.total_score == 50.0

        sub_check = await db.scalar(
            select(Submission).where(Submission.assignment_id == assignment_1.id)
        )
        assert sub_check is not None
        assert sub_check.code == "print('attempt 1')"

        # 7. Verify Attempt 2 state in DB
        new_assign_stmt = select(ExamAssignment).where(
            ExamAssignment.id == restart_resp.new_assignment_id
        )
        assignment_2 = await db.scalar(new_assign_stmt)
        assert assignment_2.is_active is True
        assert assignment_2.attempt_number == 2
        assert assignment_2.reset_by_admin is True
        assert "machine freeze" in assignment_2.reset_reason
        assert assignment_2.status == AssignmentStatus.NOT_STARTED

        # 8. Verify student can start Attempt 2 even though exam entry window is closed
        start_attempt_2 = await start_exam_for_student(
            db=db, exam_id=exam.id, user_id=student.id
        )
        assert start_attempt_2.assignment_id == assignment_2.id
        assert len(start_attempt_2.questions) == 2

        # 9. Verify Candidate Dossier contains attempt tracking and available_attempts
        dossier_2 = await get_candidate_dossier(
            db=db, exam_id=exam.id, assignment_id=assignment_2.id
        )
        assert dossier_2.attempt_number == 2
        assert dossier_2.is_active is True
        assert dossier_2.reset_by_admin is True
        assert len(dossier_2.available_attempts) == 2
        assert dossier_2.available_attempts[0].attempt_number == 1
        assert dossier_2.available_attempts[0].is_active is False
        assert dossier_2.available_attempts[1].attempt_number == 2
        assert dossier_2.available_attempts[1].is_active is True

        # Dossier for Attempt 1 can still be retrieved and inspected
        dossier_1 = await get_candidate_dossier(
            db=db, exam_id=exam.id, assignment_id=assignment_1.id
        )
        assert dossier_1.attempt_number == 1
        assert dossier_1.is_active is False
        assert dossier_1.raw_score == 10.0

        # 10. Verify student can submit code solutions in Attempt 2 without MultipleResultsFound error
        sub_resp = await submit_code_solution(
            db=db,
            user_id=student.id,
            exam_id=exam.id,
            question_id=questions[0].id,
            code="print('attempt 2 code solution')",
            language="python",
            assignment_id=assignment_2.id,
        )
        assert sub_resp.assignment_id == assignment_2.id
        assert sub_resp.question_id == questions[0].id

        # Also test without explicit assignment_id (should auto-detect active attempt)
        sub_resp_auto = await submit_code_solution(
            db=db,
            user_id=student.id,
            exam_id=exam.id,
            question_id=questions[0].id,
            code="print('attempt 2 auto-detected assignment')",
            language="python",
        )
        assert sub_resp_auto.assignment_id == assignment_2.id
