"""
Database seed script:
1. Cleans existing questions, test cases, MCQ options, exams, assignments, and results.
2. Seeds default admin and student users.
3. Seeds 30 Easy DSA problems (10 test cases each: 2 visible, 8 hidden with edge cases) with full multi-language driver code.
4. Seeds 40 Medium DSA problems (10 test cases each: 2 visible, 8 hidden with edge cases) with full multi-language driver code.
5. Seeds 20 Hard DSA problems (10 test cases each: 2 visible, 8 hidden with edge cases) with full multi-language driver code.
6. Seeds 150 Computer Science fundamental MCQs (CN, OS, DBMS, OOPs) with accurate timers (7s-13s) and options.
7. Creates 6 distinct exams with dynamic pooling quotas and populated question pools.
"""

import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import AsyncSessionLocal, engine
from backend.app.core.security import get_password_hash
from backend.app.models.base import Base
from backend.app.models.user import User, UserRole
from backend.app.models.question import Question, TestCase, MCQOption, QuestionDifficulty
from backend.app.models.exam import Exam, ExamQuestionPool, ExamAssignment, AssignedQuestion
from backend.app.models.submission import Submission, MCQResponse
from backend.app.models.result import ExamResult, QuestionScore
from backend.app.models.proctoring import ExamProctoringLog
from backend.app.models.network_incident import ExamNetworkIncident
from backend.app.services.universal_driver_service import generate_all_templates, generate_universal_driver

from backend.seeds.dsa_easy import DSA_EASY_QUESTIONS
from backend.seeds.dsa_medium import DSA_MEDIUM_QUESTIONS
from backend.seeds.dsa_hard import DSA_HARD_QUESTIONS
from backend.seeds.mcqs import ALL_MCQS
from backend.seeds.exams_data import EXAMS_DATA


async def clean_database(db: AsyncSession):
    """Purge existing questions, exams, assignments and cascade references in safe FK order."""
    print("Cleaning existing examination and question records...")
    await db.execute(delete(ExamNetworkIncident))
    await db.execute(delete(ExamProctoringLog))
    await db.execute(delete(QuestionScore))
    await db.execute(delete(ExamResult))
    await db.execute(delete(Submission))
    await db.execute(delete(MCQResponse))
    await db.execute(delete(AssignedQuestion))
    await db.execute(delete(ExamAssignment))
    await db.execute(delete(ExamQuestionPool))
    await db.execute(delete(Exam))
    await db.execute(delete(TestCase))
    await db.execute(delete(MCQOption))
    await db.execute(delete(Question))
    await db.flush()
    print("All previous questions, test cases, MCQs, exams, and results cleared.")


async def seed_users(db: AsyncSession):
    """Seed default admin and student users if they don't already exist."""
    print("Seeding default platform users...")
    admin_email = "admin@usefulbi.com"
    admin = (await db.execute(select(User).where(User.email == admin_email))).scalar_one_or_none()
    if not admin:
        admin = User(
            name="UBI Administrator",
            email=admin_email,
            roll_no="ADMIN001",
            password_hash=get_password_hash("Admin@12345"),
            role=UserRole.ADMIN
        )
        db.add(admin)
        print(f"Created admin: {admin_email}")

    students = [
        ("Alex Chen", "student1@usefulbi.com", "UBI2026001", "Student@12345"),
        ("Priya Sharma", "student2@usefulbi.com", "UBI2026002", "Student@12345"),
        ("Michael Brown", "student3@usefulbi.com", "UBI2026003", "Student@12345"),
    ]
    for name, email, roll_no, password in students:
        std = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if not std:
            std = User(
                name=name,
                email=email,
                roll_no=roll_no,
                password_hash=get_password_hash(password),
                role=UserRole.STUDENT
            )
            db.add(std)
            print(f"Created student: {email}")

    await db.flush()


async def seed_dsa_questions(db: AsyncSession, questions_data: list, category_label: str) -> list[Question]:
    """Seed DSA questions with generated templates, drivers, and 10 test cases each."""
    created_questions = []
    for q_data in questions_data:
        tmpl = generate_all_templates(
            q_data["function_name"],
            q_data["parameters"],
            q_data["return_type"]
        )
        driver_code = {
            lang: generate_universal_driver(
                q_data["function_name"],
                q_data["parameters"],
                q_data["return_type"],
                lang
            )
            for lang in ["python", "javascript", "cpp", "java"]
        }

        q = Question(
            title=q_data["title"],
            description=q_data["description"],
            difficulty=q_data["difficulty"],
            question_type="coding",
            time_limit_ms=2000,
            memory_limit_kb=128000,
            sample_input=q_data.get("sample_input"),
            sample_output=q_data.get("sample_output"),
            input_format=q_data.get("input_format"),
            function_name=q_data["function_name"],
            function_signature=tmpl.get("function_signature"),
            parameters=q_data["parameters"],
            return_type=q_data["return_type"],
            starter_code=tmpl.get("starter"),
            driver_code=driver_code,
        )
        db.add(q)
        await db.flush()

        for tc_data in q_data["test_cases"]:
            tc = TestCase(
                question_id=q.id,
                input=tc_data["input"],
                expected_output=tc_data["expected_output"],
                is_hidden=tc_data["is_hidden"],
                weight=tc_data["weight"]
            )
            db.add(tc)

        created_questions.append(q)

    await db.flush()
    print(f"Seeded {len(created_questions)} {category_label} DSA questions (each with 10 test cases & multi-lang drivers).")
    return created_questions


async def seed_mcqs(db: AsyncSession) -> list[Question]:
    """Seed 150 computer science MCQs with options and timers."""
    created_mcqs = []
    for q_data in ALL_MCQS:
        q = Question(
            title=q_data["title"],
            description=q_data["description"],
            difficulty=q_data["difficulty"],
            question_type="mcq",
            mcq_time_limit_seconds=q_data["mcq_time_limit_seconds"],
            is_multi_select=q_data["is_multi_select"],
            marks=1.0,
            time_limit_ms=2000,
            memory_limit_kb=128000,
        )
        db.add(q)
        await db.flush()

        for idx, opt_data in enumerate(q_data["options"]):
            opt = MCQOption(
                question_id=q.id,
                option_text=opt_data["text"],
                is_correct=opt_data["is_correct"],
                order_index=idx
            )
            db.add(opt)

        created_mcqs.append(q)

    await db.flush()
    print(f"Seeded {len(created_mcqs)} Computer Science MCQs (CN, OS, DBMS, OOPs) with accurate timers.")
    return created_mcqs


async def seed_exams(
    db: AsyncSession,
    easy_dsa: list[Question],
    med_dsa: list[Question],
    hard_dsa: list[Question],
    mcqs: list[Question]
):
    """Seed 6 configured exams and populate their question pools."""
    print("Creating exams and populating question pools...")
    for ex_data in EXAMS_DATA:
        exam = Exam(
            title=ex_data["title"],
            duration_minutes=ex_data["duration_minutes"],
            easy_weight=ex_data["easy_weight"],
            medium_weight=ex_data["medium_weight"],
            hard_weight=ex_data["hard_weight"],
            mcq_weight=ex_data["mcq_weight"],
            mcq_count=ex_data["mcq_count"],
            easy_count=ex_data["easy_count"],
            medium_count=ex_data["medium_count"],
            hard_count=ex_data["hard_count"],
            is_published=ex_data["is_published"],
            target_groups=ex_data["target_groups"]
        )
        db.add(exam)
        await db.flush()

        # Populate Pool
        selector = ex_data["pool_selector"]
        e_start, e_end = selector["easy_slice"]
        m_start, m_end = selector["medium_slice"]
        h_start, h_end = selector["hard_slice"]
        mcq_start, mcq_end = selector["mcq_slice"]

        pool_questions = []
        if e_end > e_start:
            pool_questions.extend(easy_dsa[e_start:e_end])
        if m_end > m_start:
            pool_questions.extend(med_dsa[m_start:m_end])
        if h_end > h_start:
            pool_questions.extend(hard_dsa[h_start:h_end])
        if mcq_end > mcq_start:
            pool_questions.extend(mcqs[mcq_start:mcq_end])

        for q in pool_questions:
            pool_entry = ExamQuestionPool(
                exam_id=exam.id,
                question_id=q.id,
                difficulty=q.difficulty,
                selection_mode="random"
            )
            db.add(pool_entry)

        await db.flush()
        print(f"Created Exam #{exam.id}: '{exam.title}' with {len(pool_questions)} pooled questions.")


async def seed_database():
    """Main database seeding routine."""
    print("=" * 70)
    print("STARTING DATABASE SEED PROCESS")
    print("=" * 70)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Step 1: Clean database
        await clean_database(db)

        # Step 2: Seed users
        await seed_users(db)

        # Step 3: Seed DSA questions
        easy_questions = await seed_dsa_questions(db, DSA_EASY_QUESTIONS, "Easy")
        medium_questions = await seed_dsa_questions(db, DSA_MEDIUM_QUESTIONS, "Medium")
        hard_questions = await seed_dsa_questions(db, DSA_HARD_QUESTIONS, "Hard")

        # Step 4: Seed MCQs
        mcq_questions = await seed_mcqs(db)

        # Step 5: Seed Exams & Question Pools
        await seed_exams(db, easy_questions, medium_questions, hard_questions, mcq_questions)

        # Final commit
        await db.commit()

    print("=" * 70)
    print("DATABASE SEED COMPLETED SUCCESSFULLY")
    print(f"Summary:")
    print(f"- Easy DSA Questions:   {len(easy_questions)}")
    print(f"- Medium DSA Questions: {len(medium_questions)}")
    print(f"- Hard DSA Questions:   {len(hard_questions)}")
    print(f"- Total DSA Questions:  {len(easy_questions) + len(medium_questions) + len(hard_questions)}")
    print(f"- Total MCQs:           {len(mcq_questions)}")
    print(f"- Total Questions:      {len(easy_questions) + len(medium_questions) + len(hard_questions) + len(mcq_questions)}")
    print(f"- Total Exams Created:  {len(EXAMS_DATA)}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(seed_database())
