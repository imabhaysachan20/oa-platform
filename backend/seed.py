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
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import AsyncSessionLocal, engine
from backend.app.core.security import get_password_hash
from backend.app.models.base import Base
from backend.app.models.user import User, UserRole
from backend.app.models.question import Question, TestCase, MCQOption, QuestionDifficulty
from backend.app.models.exam import Exam, ExamQuestionPool, ExamAssignment, AssignedQuestion, AssignmentStatus
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
    created_exams = []
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
        created_exams.append(exam)

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

    return created_exams


async def seed_leaderboard_candidates(db: AsyncSession, exams: list[Exam]):
    """Seed realistic candidates, scores, ranks, and violation logs for exams."""
    print("Seeding realistic candidate leaderboard results for assessments...")
    now = datetime.now(timezone.utc)
    candidates_data = [
        {"name": "Aarav Sharma", "email": "aarav.sharma@iitd.ac.in", "roll_no": "2022CSB101", "college": "IIT Delhi", "group": "Batch-2026", "score": 96.5, "rank": 1, "status": AssignmentStatus.SUBMITTED, "time_mins": 38, "cq_solved": 3, "mcq_correct": 10, "violations": [("TAB_SWITCH", "Switched to browser search")]},
        {"name": "Diya Patel", "email": "diya.patel@bits-pilani.ac.in", "roll_no": "2022A7PS002", "college": "BITS Pilani", "group": "Batch-2026", "score": 88.0, "rank": 2, "status": AssignmentStatus.SUBMITTED, "time_mins": 42, "cq_solved": 3, "mcq_correct": 8, "violations": []},
        {"name": "Rohan Verma", "email": "rohan.verma@nitk.edu.in", "roll_no": "22NITK045", "college": "NIT Surathkal", "group": "Batch-2026", "score": 74.5, "rank": 3, "status": AssignmentStatus.SUBMITTED, "time_mins": 51, "cq_solved": 2, "mcq_correct": 7, "violations": [("WINDOW_BLUR", "Lost window focus"), ("FULLSCREEN_EXIT", "Exited fullscreen")]},
        {"name": "Ananya Iyer", "email": "ananya.iyer@iiitb.ac.in", "roll_no": "2022IIIT089", "college": "IIIT Bangalore", "group": "Batch-2025", "score": 62.0, "rank": 4, "status": AssignmentStatus.AUTO_SUBMITTED, "time_mins": 60, "cq_solved": 2, "mcq_correct": 5, "violations": [("TAB_SWITCH", "Switched tab"), ("PASTE_ATTEMPT", "Clipboard paste detected")]},
        {"name": "Vikramaditya Rao", "email": "vikram.rao@dtu.ac.in", "roll_no": "2K22/CO/412", "college": "Delhi Technological University", "group": "Batch-2026", "score": 45.0, "rank": 5, "status": AssignmentStatus.SUBMITTED, "time_mins": 58, "cq_solved": 1, "mcq_correct": 4, "violations": [("DEVTOOLS_SHORTCUT", "F12 pressed"), ("TAB_SWITCH", "Tab switch")]},
        {"name": "Sneha Mukherjee", "email": "sneha.m@jaduniv.edu.in", "roll_no": "JU/CSE/22/019", "college": "Jadavpur University", "group": "Batch-2026", "score": None, "rank": None, "status": AssignmentStatus.IN_PROGRESS, "time_mins": None, "cq_solved": 1, "mcq_correct": 3, "violations": []},
        {"name": "Kabir Nair", "email": "kabir.nair@coep.ac.in", "roll_no": "112203055", "college": "COEP Pune", "group": "Batch-2025", "score": None, "rank": None, "status": AssignmentStatus.NOT_STARTED, "time_mins": None, "cq_solved": 0, "mcq_correct": 0, "violations": []}
    ]

    for exam in exams:
        pool_q_stmt = select(ExamQuestionPool.question_id).where(ExamQuestionPool.exam_id == exam.id)
        pool_q_ids = (await db.execute(pool_q_stmt)).scalars().all()
        coding_ids = pool_q_ids[:5] if len(pool_q_ids) >= 5 else pool_q_ids
        mcq_ids = pool_q_ids[5:20] if len(pool_q_ids) >= 20 else pool_q_ids

        for c in candidates_data:
            c_email = f"{c['email'].split('@')[0]}_{exam.id}@{c['email'].split('@')[1]}"
            u_stmt = select(User).where(User.email == c_email)
            user = (await db.execute(u_stmt)).scalar_one_or_none()
            if not user:
                user = User(
                    name=c["name"],
                    email=c_email,
                    roll_no=f"{c['roll_no']}-{exam.id}",
                    college=c["college"],
                    candidate_group=c["group"],
                    role=UserRole.STUDENT,
                    password_hash=get_password_hash("password123")
                )
                db.add(user)
                await db.flush()

            start_time = (now - timedelta(minutes=c["time_mins"] + 10)) if c["time_mins"] else (now - timedelta(minutes=15) if c["status"] == AssignmentStatus.IN_PROGRESS else None)
            sub_time = (start_time + timedelta(minutes=c["time_mins"])) if (start_time and c["time_mins"]) else None

            assign = ExamAssignment(
                exam_id=exam.id,
                user_id=user.id,
                status=c["status"],
                started_at=start_time,
                submitted_at=sub_time,
                is_active=True
            )
            db.add(assign)
            await db.flush()

            if c["score"] is not None:
                res = ExamResult(
                    assignment_id=assign.id,
                    total_score=c["score"],
                    rank=c["rank"]
                )
                db.add(res)

            for idx in range(min(c["cq_solved"], len(coding_ids))):
                sub = Submission(
                    assignment_id=assign.id,
                    question_id=coding_ids[idx],
                    code="def solution():\n    return True",
                    language="python",
                    status="Accepted",
                    test_cases_passed=4,
                    total_test_cases=4,
                    is_final=True
                )
                db.add(sub)

            for idx in range(min(c["mcq_correct"], len(mcq_ids))):
                mr = MCQResponse(
                    assignment_id=assign.id,
                    question_id=mcq_ids[idx],
                    selected_option_ids=[],
                    is_correct=True,
                    marks_awarded=2.0
                )
                db.add(mr)

            for v_type, v_desc in c["violations"]:
                v_log = ExamProctoringLog(
                    assignment_id=assign.id,
                    event_type=v_type,
                    title=v_type,
                    description=v_desc
                )
                db.add(v_log)

        await db.flush()
        print(f"Seeded 7 candidate leaderboard entries for Exam #{exam.id}: '{exam.title}'")


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
        created_exams = await seed_exams(db, easy_questions, medium_questions, hard_questions, mcq_questions)

        # Step 6: Seed Leaderboard Candidates for all exams
        await seed_leaderboard_candidates(db, created_exams)

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
