import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import get_current_admin, get_password_hash
from backend.app.models.user import User, UserRole
from backend.app.models.question import Question, TestCase, QuestionDifficulty
from backend.app.models.exam import Exam, ExamQuestionPool
from backend.app.schemas.exam import (
    ExamCreate,
    ExamUpdate,
    ExamResponse,
    MonitoringStudentView
)
from backend.app.schemas.question import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    TestCaseCreate,
    TestCaseResponse
)
from backend.app.schemas.submission import AdminPlaygroundRunRequest, RunCodeResponse
from backend.app.schemas.auth import UserResponse
from backend.app.services.exam_service import get_live_exam_monitoring
from backend.app.services.submission_service import execute_judge0_test_cases

router = APIRouter(prefix="/admin", tags=["admin"])


# ==================== EXAMS ====================

@router.get("/exams", response_model=List[ExamResponse])
async def list_all_exams(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Exam).order_by(Exam.id.desc())
    exams = (await db.execute(stmt)).scalars().all()

    response = []
    for exam in exams:
        count_stmt = select(func.count(ExamQuestionPool.id)).where(ExamQuestionPool.exam_id == exam.id)
        pool_count = (await db.execute(count_stmt)).scalar() or 0
        resp_item = ExamResponse.model_validate(exam)
        resp_item.pool_count = pool_count
        response.append(resp_item)
    return response


@router.post("/exams", response_model=ExamResponse)
async def create_exam(
    body: ExamCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    exam = Exam(
        title=body.title,
        duration_minutes=body.duration_minutes,
        start_time=body.start_time,
        end_time=body.end_time,
        easy_weight=body.easy_weight,
        medium_weight=body.medium_weight,
        hard_weight=body.hard_weight,
        is_published=body.is_published,
    )
    db.add(exam)
    await db.flush()

    if body.question_ids:
        for q_id in body.question_ids:
            q = (await db.execute(select(Question).where(Question.id == q_id))).scalar_one_or_none()
            if q:
                pool_entry = ExamQuestionPool(
                    exam_id=exam.id,
                    question_id=q.id,
                    difficulty=q.difficulty
                )
                db.add(pool_entry)

    await db.commit()
    await db.refresh(exam)
    resp = ExamResponse.model_validate(exam)
    resp.pool_count = len(body.question_ids or [])
    return resp


@router.get("/exams/{exam_id}", response_model=ExamResponse)
async def get_admin_exam(
    exam_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    exam = (await db.execute(select(Exam).where(Exam.id == exam_id))).scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    count_stmt = select(func.count(ExamQuestionPool.id)).where(ExamQuestionPool.exam_id == exam.id)
    pool_count = (await db.execute(count_stmt)).scalar() or 0
    resp = ExamResponse.model_validate(exam)
    resp.pool_count = pool_count
    return resp


@router.put("/exams/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    body: ExamUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    exam = (await db.execute(select(Exam).where(Exam.id == exam_id))).scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if body.title is not None:
        exam.title = body.title
    if body.duration_minutes is not None:
        exam.duration_minutes = body.duration_minutes
    if body.start_time is not None:
        exam.start_time = body.start_time
    if body.end_time is not None:
        exam.end_time = body.end_time
    if body.easy_weight is not None:
        exam.easy_weight = body.easy_weight
    if body.medium_weight is not None:
        exam.medium_weight = body.medium_weight
    if body.hard_weight is not None:
        exam.hard_weight = body.hard_weight
    if body.is_published is not None:
        exam.is_published = body.is_published

    if body.question_ids is not None:
        # Clear existing pool and replace
        del_stmt = select(ExamQuestionPool).where(ExamQuestionPool.exam_id == exam.id)
        existing = (await db.execute(del_stmt)).scalars().all()
        for e in existing:
            await db.delete(e)

        for q_id in body.question_ids:
            q = (await db.execute(select(Question).where(Question.id == q_id))).scalar_one_or_none()
            if q:
                db.add(ExamQuestionPool(
                    exam_id=exam.id,
                    question_id=q.id,
                    difficulty=q.difficulty
                ))

    await db.commit()
    await db.refresh(exam)
    count_stmt = select(func.count(ExamQuestionPool.id)).where(ExamQuestionPool.exam_id == exam.id)
    pool_count = (await db.execute(count_stmt)).scalar() or 0
    resp = ExamResponse.model_validate(exam)
    resp.pool_count = pool_count
    return resp


@router.delete("/exams/{exam_id}")
async def delete_exam(
    exam_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    exam = (await db.execute(select(Exam).where(Exam.id == exam_id))).scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    await db.delete(exam)
    await db.commit()
    return {"message": f"Exam {exam_id} deleted successfully"}


@router.get("/exams/{exam_id}/pool", response_model=List[QuestionResponse])
async def get_exam_pool_questions(
    exam_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Question)
        .join(ExamQuestionPool, ExamQuestionPool.question_id == Question.id)
        .where(ExamQuestionPool.exam_id == exam_id)
        .options(selectinload(Question.test_cases))
    )
    questions = (await db.execute(stmt)).scalars().all()
    return questions


@router.post("/exams/{exam_id}/pool/{question_id}")
async def add_question_to_pool(
    exam_id: int,
    question_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    q = (await db.execute(select(Question).where(Question.id == question_id))).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    existing = (await db.execute(
        select(ExamQuestionPool).where(
            ExamQuestionPool.exam_id == exam_id,
            ExamQuestionPool.question_id == question_id
        )
    )).scalar_one_or_none()

    if not existing:
        db.add(ExamQuestionPool(
            exam_id=exam_id,
            question_id=question_id,
            difficulty=q.difficulty
        ))
        await db.commit()
    return {"message": "Question added to exam pool"}


@router.delete("/exams/{exam_id}/pool/{question_id}")
async def remove_question_from_pool(
    exam_id: int,
    question_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    existing = (await db.execute(
        select(ExamQuestionPool).where(
            ExamQuestionPool.exam_id == exam_id,
            ExamQuestionPool.question_id == question_id
        )
    )).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
    return {"message": "Question removed from exam pool"}


# ==================== PLAYGROUND ====================

@router.post("/playground/run", response_model=RunCodeResponse)
async def run_playground_code(
    body: AdminPlaygroundRunRequest,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Execute code against arbitrary test cases provided in the request body.
    Used for testing new questions before they are saved to the database.
    """
    cpu_limit = float(body.time_limit_ms) / 1000.0
    mem_limit = body.memory_limit_kb

    return await execute_judge0_test_cases(
        test_cases=body.test_cases,
        code=body.code,
        language=body.language,
        cpu_limit=cpu_limit,
        mem_limit=mem_limit,
        question_id=0
    )


# ==================== QUESTIONS ====================

@router.get("/questions", response_model=List[QuestionResponse])
async def list_questions(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Question).options(selectinload(Question.test_cases)).order_by(Question.id.asc())
    questions = (await db.execute(stmt)).scalars().all()
    return [QuestionResponse.model_validate(q) for q in questions]


@router.post("/questions", response_model=QuestionResponse)
async def create_question(
    body: QuestionCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    q = Question(
        title=body.title,
        description=body.description,
        difficulty=body.difficulty,
        time_limit_ms=body.time_limit_ms,
        memory_limit_kb=body.memory_limit_kb,
        sample_input=body.sample_input,
        sample_output=body.sample_output,
    )
    db.add(q)
    await db.flush()

    if body.test_cases:
        for tc_data in body.test_cases:
            tc = TestCase(
                question_id=q.id,
                input=tc_data.input,
                expected_output=tc_data.expected_output,
                is_hidden=tc_data.is_hidden,
                weight=tc_data.weight
            )
            db.add(tc)

    await db.commit()

    q_stmt = select(Question).options(selectinload(Question.test_cases)).where(Question.id == q.id)
    q_with_tc = (await db.execute(q_stmt)).scalar_one()
    return QuestionResponse.model_validate(q_with_tc)


@router.get("/questions/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Question).options(selectinload(Question.test_cases)).where(Question.id == question_id)
    q = (await db.execute(stmt)).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return QuestionResponse.model_validate(q)


@router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: int,
    body: QuestionUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Question).where(Question.id == question_id)
    q = (await db.execute(stmt)).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if body.title is not None:
        q.title = body.title
    if body.description is not None:
        q.description = body.description
    if body.difficulty is not None:
        q.difficulty = body.difficulty
    if body.time_limit_ms is not None:
        q.time_limit_ms = body.time_limit_ms
    if body.memory_limit_kb is not None:
        q.memory_limit_kb = body.memory_limit_kb
    if body.sample_input is not None:
        q.sample_input = body.sample_input
    if body.sample_output is not None:
        q.sample_output = body.sample_output

    await db.commit()

    q_stmt = select(Question).options(selectinload(Question.test_cases)).where(Question.id == q.id)
    q_with_tc = (await db.execute(q_stmt)).scalar_one()
    return QuestionResponse.model_validate(q_with_tc)


@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    q = (await db.execute(select(Question).where(Question.id == question_id))).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.delete(q)
    await db.commit()
    return {"message": f"Question {question_id} deleted successfully"}


# ==================== TEST CASES ====================

@router.post("/questions/{question_id}/test-cases", response_model=TestCaseResponse)
async def add_test_case(
    question_id: int,
    body: TestCaseCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    q = (await db.execute(select(Question).where(Question.id == question_id))).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    tc = TestCase(
        question_id=question_id,
        input=body.input,
        expected_output=body.expected_output,
        is_hidden=body.is_hidden,
        weight=body.weight
    )
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    return TestCaseResponse.model_validate(tc)


@router.delete("/test-cases/{test_case_id}")
async def delete_test_case(
    test_case_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    tc = (await db.execute(select(TestCase).where(TestCase.id == test_case_id))).scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    await db.delete(tc)
    await db.commit()
    return {"message": f"Test case {test_case_id} deleted successfully"}


# ==================== BULK STUDENT IMPORT ====================

@router.post("/students/import-csv")
async def bulk_student_import_csv(
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Accepts CSV with columns: name, email, roll_no, password
    Creates student users with hashed passwords, skipping duplicates gracefully.
    """
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = contents.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    created_count = 0
    skipped_count = 0
    errors = []

    for row_idx, row in enumerate(reader, start=2):
        name = row.get("name", "").strip()
        email = row.get("email", "").strip().lower()
        roll_no = row.get("roll_no", "").strip() or None
        password = row.get("password", "").strip()

        if not name or not email or not password:
            errors.append(f"Row {row_idx}: Missing required fields (name, email, password)")
            skipped_count += 1
            continue

        # Check existing email
        stmt = select(User).where(User.email == email)
        exists = (await db.execute(stmt)).scalar_one_or_none()
        if exists:
            skipped_count += 1
            continue

        # Check roll_no if provided
        if roll_no:
            stmt_r = select(User).where(User.roll_no == roll_no)
            exists_r = (await db.execute(stmt_r)).scalar_one_or_none()
            if exists_r:
                skipped_count += 1
                continue

        hashed = get_password_hash(password)
        new_user = User(
            name=name,
            email=email,
            roll_no=roll_no,
            password_hash=hashed,
            role=UserRole.STUDENT
        )
        db.add(new_user)
        created_count += 1

    await db.commit()
    return {
        "created_count": created_count,
        "skipped_count": skipped_count,
        "errors": errors
    }


@router.get("/students", response_model=List[UserResponse])
async def list_students(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.role == UserRole.STUDENT).order_by(User.id.asc())
    students = (await db.execute(stmt)).scalars().all()
    return [UserResponse.model_validate(s) for s in students]


# ==================== LIVE EXAM MONITORING ====================

@router.get("/exams/{exam_id}/monitoring", response_model=List[MonitoringStudentView])
async def monitor_exam(
    exam_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Live exam monitoring: tracks student session states, remaining time,
    number of submissions, and current scores in real time.
    """
    return await get_live_exam_monitoring(db, exam_id)
