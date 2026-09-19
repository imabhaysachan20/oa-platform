import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from backend.app.core.config import settings
from backend.app.models.user import User, UserRole
from backend.app.models.question import Question, QuestionDifficulty, MCQOption
from backend.app.models.exam import Exam, ExamQuestionPool, AssignedQuestion
from backend.app.schemas.exam import ExamCreate, ExamUpdate
from backend.app.services.exam_service import start_exam_for_student


def test_exam_schema_defaults_and_custom_pattern():
    """Verify default values and custom patterns in Exam schemas."""
    # Defaults should be 1 easy, 2 medium, 0 hard, 0 mcq
    exam_default = ExamCreate(title="Default Exam")
    assert exam_default.easy_count == 1
    assert exam_default.medium_count == 2
    assert exam_default.hard_count == 0
    assert exam_default.mcq_count == 0

    # Custom pattern
    exam_custom = ExamCreate(
        title="Custom Exam",
        easy_count=2,
        medium_count=3,
        hard_count=1,
        mcq_count=5
    )
    assert exam_custom.easy_count == 2
    assert exam_custom.medium_count == 3
    assert exam_custom.hard_count == 1
    assert exam_custom.mcq_count == 5

    # Update schema
    update = ExamUpdate(easy_count=0, medium_count=1, hard_count=2, mcq_count=4)
    assert update.easy_count == 0
    assert update.medium_count == 1
    assert update.hard_count == 2
    assert update.mcq_count == 4


@pytest.mark.asyncio
async def test_dynamic_pattern_assignment():
    """Verify that start_exam_for_student assigns the exact difficulty pattern configured by admin."""
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        now = datetime.now(timezone.utc)

        # 1. Create a student user
        student = User(
            name="Pattern Student",
            email=f"pattern_student_{uuid.uuid4().hex[:8]}@test.com",
            password_hash="pw",
            role=UserRole.STUDENT
        )
        db.add(student)
        await db.flush()

        # 2. Create questions: 3 easy, 3 medium, 2 hard
        questions = []
        for diff, count in [
            (QuestionDifficulty.EASY, 3),
            (QuestionDifficulty.MEDIUM, 3),
            (QuestionDifficulty.HARD, 2),
        ]:
            for i in range(count):
                q = Question(
                    title=f"{diff.value.capitalize()} Question {i+1} - {uuid.uuid4().hex[:4]}",
                    description="Problem description",
                    difficulty=diff,
                    question_type="coding"
                )
                db.add(q)
                questions.append(q)

        await db.flush()

        # 3. Create exam with dynamic pattern: 2 Easy, 1 Medium, 1 Hard (total 4)
        exam = Exam(
            title=f"Dynamic Exam {uuid.uuid4().hex[:6]}",
            duration_minutes=60,
            easy_weight=10.0,
            medium_weight=20.0,
            hard_weight=30.0,
            easy_count=2,
            medium_count=1,
            hard_count=1,
            is_published=True
        )
        db.add(exam)
        await db.flush()

        # 4. Attach all questions to the exam pool
        for q in questions:
            pool_entry = ExamQuestionPool(
                exam_id=exam.id,
                question_id=q.id,
                difficulty=q.difficulty,
                selection_mode="random"
            )
            db.add(pool_entry)
        await db.commit()

        # 5. Start exam for student
        start_resp = await start_exam_for_student(db=db, exam_id=exam.id, user_id=student.id)

        # Verify candidate gets exactly 4 questions
        assert len(start_resp.questions) == 4

        # Verify exact counts per difficulty in assigned questions
        stmt = (
            select(AssignedQuestion)
            .where(AssignedQuestion.assignment_id == start_resp.assignment_id)
        )
        assigned = (await db.execute(stmt)).scalars().all()
        assert len(assigned) == 4

        easy_assigned = [a for a in assigned if a.difficulty == QuestionDifficulty.EASY]
        med_assigned = [a for a in assigned if a.difficulty == QuestionDifficulty.MEDIUM]
        hard_assigned = [a for a in assigned if a.difficulty == QuestionDifficulty.HARD]

        assert len(easy_assigned) == 2, f"Expected 2 easy questions, got {len(easy_assigned)}"
        assert len(med_assigned) == 1, f"Expected 1 medium question, got {len(med_assigned)}"
        assert len(hard_assigned) == 1, f"Expected 1 hard question, got {len(hard_assigned)}"


@pytest.mark.asyncio
async def test_dynamic_pattern_fallback():
    """Verify fallback if pool has fewer questions of a specific difficulty than the requested count."""
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        student = User(
            name="Fallback Student",
            email=f"fallback_student_{uuid.uuid4().hex[:8]}@test.com",
            password_hash="pw",
            role=UserRole.STUDENT
        )
        db.add(student)
        await db.flush()

        # Pool has only 1 easy question, and 2 medium questions
        q_easy = Question(
            title=f"Solo Easy {uuid.uuid4().hex[:4]}",
            description="desc",
            difficulty=QuestionDifficulty.EASY,
            question_type="coding"
        )
        q_med1 = Question(
            title=f"Med 1 {uuid.uuid4().hex[:4]}",
            description="desc",
            difficulty=QuestionDifficulty.MEDIUM,
            question_type="coding"
        )
        q_med2 = Question(
            title=f"Med 2 {uuid.uuid4().hex[:4]}",
            description="desc",
            difficulty=QuestionDifficulty.MEDIUM,
            question_type="coding"
        )
        db.add_all([q_easy, q_med1, q_med2])
        await db.flush()

        # Exam config requests 3 Easy questions (target 3), but pool only has 1 Easy
        exam = Exam(
            title=f"Fallback Exam {uuid.uuid4().hex[:6]}",
            duration_minutes=45,
            easy_count=3,
            medium_count=0,
            hard_count=0,
            is_published=True
        )
        db.add(exam)
        await db.flush()

        for q in [q_easy, q_med1, q_med2]:
            db.add(ExamQuestionPool(
                exam_id=exam.id,
                question_id=q.id,
                difficulty=q.difficulty,
                selection_mode="random"
            ))
        await db.commit()

        # Student starts exam -> total target is 3. System picks the 1 available easy and falls back to pick the 2 available mediums.
        start_resp = await start_exam_for_student(db=db, exam_id=exam.id, user_id=student.id)
        assert len(start_resp.questions) == 3


@pytest.mark.asyncio
async def test_dynamic_mcq_pool_and_random_sampling():
    """Verify that mcq_count draws a random subset from the MCQ pool without mixing with coding questions."""
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_session() as db:
        student = User(
            name="MCQ Pool Student",
            email=f"mcq_pool_student_{uuid.uuid4().hex[:8]}@test.com",
            password_hash="pw",
            role=UserRole.STUDENT
        )
        db.add(student)
        await db.flush()

        # 1. Create 6 MCQ questions
        mcq_questions = []
        for i in range(6):
            q = Question(
                title=f"MCQ Question {i+1} - {uuid.uuid4().hex[:4]}",
                description="MCQ prompt",
                difficulty=QuestionDifficulty.EASY,
                question_type="mcq",
                is_multi_select=False
            )
            db.add(q)
            mcq_questions.append(q)
        await db.flush()

        for q in mcq_questions:
            db.add(MCQOption(question_id=q.id, option_text="Opt A", is_correct=True, order_index=0))
            db.add(MCQOption(question_id=q.id, option_text="Opt B", is_correct=False, order_index=1))
        await db.flush()

        # 2. Create 2 Coding questions
        q_code1 = Question(
            title=f"Code 1 {uuid.uuid4().hex[:4]}",
            description="Code desc",
            difficulty=QuestionDifficulty.EASY,
            question_type="coding"
        )
        q_code2 = Question(
            title=f"Code 2 {uuid.uuid4().hex[:4]}",
            description="Code desc",
            difficulty=QuestionDifficulty.MEDIUM,
            question_type="coding"
        )
        db.add_all([q_code1, q_code2])
        await db.flush()

        # 3. Create Exam: pool has 6 MCQs + 2 coding questions.
        # Admin configures: mcq_count = 3 (out of 6), easy_count = 1, medium_count = 1
        exam = Exam(
            title=f"MCQ Pool Exam {uuid.uuid4().hex[:6]}",
            duration_minutes=60,
            mcq_count=3,
            easy_count=1,
            medium_count=1,
            hard_count=0,
            mcq_weight=2.5,
            is_published=True
        )
        db.add(exam)
        await db.flush()

        # Add all 6 MCQs and 2 coding questions to the exam pool
        all_pool_questions = mcq_questions + [q_code1, q_code2]
        for q in all_pool_questions:
            db.add(ExamQuestionPool(
                exam_id=exam.id,
                question_id=q.id,
                difficulty=q.difficulty,
                selection_mode="random"
            ))
        await db.commit()

        # 4. Start exam for student
        start_resp = await start_exam_for_student(db=db, exam_id=exam.id, user_id=student.id)

        # Expected total: 3 MCQs + 1 Easy Code + 1 Medium Code = 5 questions
        assert len(start_resp.questions) == 5

        # Verify exact question types
        assigned_mcqs = [q for q in start_resp.questions if q.question_type == "mcq"]
        assigned_codes = [q for q in start_resp.questions if q.question_type != "mcq"]

        assert len(assigned_mcqs) == 3, f"Expected 3 MCQs drawn from pool, got {len(assigned_mcqs)}"
        assert len(assigned_codes) == 2, f"Expected 2 coding questions, got {len(assigned_codes)}"

        # Verify the MCQs drawn are from the pool and have exam's mcq_weight
        pool_mcq_ids = {q.id for q in mcq_questions}
        for amcq in assigned_mcqs:
            assert amcq.id in pool_mcq_ids
            assert amcq.marks == 2.5
