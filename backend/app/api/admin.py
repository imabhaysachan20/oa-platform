import csv
import io
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis
from backend.app.core.database import get_db
from backend.app.core.redis import get_redis
from backend.app.core.security import get_current_admin, get_password_hash
from backend.app.models.user import User, UserRole
from backend.app.models.question import Question, TestCase, QuestionDifficulty, MCQOption
from backend.app.models.exam import Exam, ExamQuestionPool, AssignedQuestion, ExamAssignment, AssignmentStatus
from backend.app.models.submission import Submission
from backend.app.models.result import QuestionScore
from backend.app.schemas.exam import (
    ExamCreate,
    ExamUpdate,
    ExamResponse,
    MonitoringStudentView,
    CandidateDossierResponse
)
from backend.app.schemas.question import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    TestCaseCreate,
    TestCaseResponse
)
from backend.app.schemas.submission import AdminPlaygroundRunRequest, RunCodeResponse
from backend.app.schemas.auth import UserResponse, CandidateImportResponse, ImportedCandidateCredential
from backend.app.services.exam_service import get_live_exam_monitoring, get_candidate_dossier
from backend.app.services.submission_service import execute_judge0_test_cases
from backend.app.services.universal_driver_service import generate_all_templates
from backend.app.services.question_templates import wrap_code_with_driver
from backend.app.services.credential_service import (
    parse_candidates_file,
    generate_unique_roll_number,
    generate_readable_password
)

router = APIRouter(prefix="/admin", tags=["admin"])


class TemplateGenerateRequest(BaseModel):
    function_name: str
    parameters: List[Dict[str, Any]]
    return_type: str = "void"


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
        mcq_weight=body.mcq_weight if body.mcq_weight is not None else 2.0,
        mcq_count=body.mcq_count if body.mcq_count is not None else 0,
        easy_count=body.easy_count if body.easy_count is not None else 1,
        medium_count=body.medium_count if body.medium_count is not None else 2,
        hard_count=body.hard_count if body.hard_count is not None else 0,
        is_published=body.is_published,
        target_groups=body.target_groups or [],
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
                    difficulty=q.difficulty,
                    selection_mode="random"
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
    if body.mcq_weight is not None:
        exam.mcq_weight = body.mcq_weight
    if body.mcq_count is not None:
        exam.mcq_count = body.mcq_count
    if body.easy_count is not None:
        exam.easy_count = body.easy_count
    if body.medium_count is not None:
        exam.medium_count = body.medium_count
    if body.hard_count is not None:
        exam.hard_count = body.hard_count
    if body.is_published is not None:
        exam.is_published = body.is_published
    if body.target_groups is not None:
        exam.target_groups = body.target_groups

    if body.question_ids is not None:
        # Clear existing pool using direct SQL delete and flush before inserting
        await db.execute(delete(ExamQuestionPool).where(ExamQuestionPool.exam_id == exam.id))
        await db.flush()

        unique_q_ids = list(dict.fromkeys(body.question_ids))
        for q_id in unique_q_ids:
            q_obj = (await db.execute(select(Question).where(Question.id == q_id))).scalar_one_or_none()
            if q_obj is not None:
                db.add(ExamQuestionPool(
                    exam_id=exam.id,
                    question_id=q_id,
                    difficulty=q_obj.difficulty,
                    selection_mode="random"
                ))
        await db.flush()

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
        selection_mode = "fixed" if q.question_type == "mcq" else "random"
        db.add(ExamQuestionPool(
            exam_id=exam_id,
            question_id=question_id,
            difficulty=q.difficulty,
            selection_mode=selection_mode
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
    Supports dynamic driver wrapping for LeetCode-style questions.
    """
    cpu_limit = float(body.time_limit_ms) / 1000.0
    mem_limit = body.memory_limit_kb

    code_to_run = wrap_code_with_driver(
        title=body.title or "",
        code=body.code,
        language=body.language,
        function_name=body.function_name,
        parameters=body.parameters,
        return_type=body.return_type,
        driver_code=body.driver_code
    )

    return await execute_judge0_test_cases(
        test_cases=body.test_cases,
        code=code_to_run,
        language=body.language,
        cpu_limit=cpu_limit,
        mem_limit=mem_limit,
        question_id=body.question_id or 0
    )


@router.post("/questions/generate-templates")
async def generate_templates_endpoint(
    body: TemplateGenerateRequest,
    current_admin: User = Depends(get_current_admin),
):
    """
    Auto-generates clean starter code for all 4 languages (Python, JS, C++, Java)
    and formats the LeetCode description signature based on function name & parameter types.
    """
    return generate_all_templates(body.function_name, body.parameters, body.return_type)


# ==================== QUESTIONS ====================

@router.get("/questions", response_model=List[QuestionResponse])
async def list_questions(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Question)
        .options(selectinload(Question.test_cases), selectinload(Question.mcq_options))
        .order_by(Question.id.asc())
    )
    questions = (await db.execute(stmt)).scalars().all()
    return [QuestionResponse.model_validate(q) for q in questions]


@router.post("/questions", response_model=QuestionResponse)
async def create_question(
    body: QuestionCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    if body.question_type == "mcq":
        if not body.options or len(body.options) < 2:
            raise HTTPException(status_code=400, detail="MCQ questions require at least 2 options.")
        correct_count = sum(1 for o in body.options if o.is_correct)
        if not body.is_multi_select and correct_count != 1:
            raise HTTPException(status_code=400, detail="Single-select MCQ must have exactly one correct option.")
        if body.is_multi_select and correct_count < 1:
            raise HTTPException(status_code=400, detail="Multi-select MCQ must have at least one correct option.")
        if body.marks is not None and body.marks <= 0:
            raise HTTPException(status_code=400, detail="MCQ marks must be greater than 0.")
        if body.mcq_time_limit_seconds is not None and body.mcq_time_limit_seconds <= 0:
            raise HTTPException(status_code=400, detail="MCQ time limit seconds must be greater than 0.")

    starters = body.starter_code
    sig = body.function_signature
    if body.question_type != "mcq" and body.function_name and body.parameters is not None and not starters:
        gen = generate_all_templates(body.function_name, body.parameters, body.return_type or "void")
        starters = gen["starter"]
        sig = sig or gen["function_signature"]

    q = Question(
        title=body.title,
        description=body.description,
        difficulty=body.difficulty,
        time_limit_ms=body.time_limit_ms,
        memory_limit_kb=body.memory_limit_kb,
        sample_input=body.sample_input,
        sample_output=body.sample_output,
        input_format=body.input_format,
        question_type=body.question_type or "coding",
        marks=body.marks,
        mcq_time_limit_seconds=body.mcq_time_limit_seconds,
        is_multi_select=body.is_multi_select,
        function_name=body.function_name,
        function_signature=sig,
        parameters=body.parameters,
        return_type=body.return_type,
        starter_code=starters,
        driver_code=body.driver_code,
    )
    db.add(q)
    await db.flush()

    if body.question_type == "mcq" and body.options:
        for idx, opt_data in enumerate(body.options):
            db.add(MCQOption(
                question_id=q.id,
                option_text=opt_data.option_text,
                is_correct=opt_data.is_correct,
                order_index=opt_data.order_index if opt_data.order_index is not None else idx
            ))
    elif body.test_cases:
        for tc_data in body.test_cases:
            db.add(TestCase(
                question_id=q.id,
                input=tc_data.input,
                expected_output=tc_data.expected_output,
                is_hidden=tc_data.is_hidden,
                weight=tc_data.weight
            ))

    await db.commit()

    q_stmt = (
        select(Question)
        .options(selectinload(Question.test_cases), selectinload(Question.mcq_options))
        .where(Question.id == q.id)
    )
    q_with_tc = (await db.execute(q_stmt)).scalar_one()
    return QuestionResponse.model_validate(q_with_tc)


@router.get("/questions/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Question)
        .options(selectinload(Question.test_cases), selectinload(Question.mcq_options))
        .where(Question.id == question_id)
    )
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
    stmt = select(Question).options(selectinload(Question.mcq_options)).where(Question.id == question_id)
    q = (await db.execute(stmt)).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    # If modifying options or answer key, verify exam is not live or already started
    if body.options is not None:
        now = datetime.now(timezone.utc)
        attached_exams_stmt = (
            select(Exam)
            .join(ExamQuestionPool, ExamQuestionPool.exam_id == Exam.id)
            .where(ExamQuestionPool.question_id == question_id)
        )
        attached_exams = (await db.execute(attached_exams_stmt)).scalars().all()
        for ex in attached_exams:
            if ex.start_time and ex.start_time <= now:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot modify answer key: this question is already in use in an active or completed exam"
                )
            active_assign_stmt = select(ExamAssignment).where(
                ExamAssignment.exam_id == ex.id,
                ExamAssignment.status != AssignmentStatus.NOT_STARTED
            )
            has_started = (await db.execute(active_assign_stmt)).first()
            if has_started:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot modify answer key: this question is already in use in an active or completed exam"
                )

        if len(body.options) < 2:
            raise HTTPException(status_code=400, detail="MCQ questions require at least 2 options.")
        is_multi = body.is_multi_select if body.is_multi_select is not None else q.is_multi_select
        correct_count = sum(1 for o in body.options if o.is_correct)
        if not is_multi and correct_count != 1:
            raise HTTPException(status_code=400, detail="Single-select MCQ must have exactly one correct option.")
        if is_multi and correct_count < 1:
            raise HTTPException(status_code=400, detail="Multi-select MCQ must have at least one correct option.")

        # Update options
        await db.execute(delete(MCQOption).where(MCQOption.question_id == question_id))
        for idx, opt_data in enumerate(body.options):
            db.add(MCQOption(
                question_id=question_id,
                option_text=opt_data.option_text,
                is_correct=opt_data.is_correct,
                order_index=opt_data.order_index if opt_data.order_index is not None else idx
            ))

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
    if body.input_format is not None:
        q.input_format = body.input_format
    if body.question_type is not None:
        q.question_type = body.question_type
    if body.marks is not None:
        if body.marks <= 0:
            raise HTTPException(status_code=400, detail="Marks must be greater than 0.")
        q.marks = body.marks
    if body.mcq_time_limit_seconds is not None:
        if body.mcq_time_limit_seconds <= 0:
            raise HTTPException(status_code=400, detail="MCQ time limit seconds must be greater than 0.")
        q.mcq_time_limit_seconds = body.mcq_time_limit_seconds
    if body.is_multi_select is not None:
        q.is_multi_select = body.is_multi_select
    if body.function_name is not None:
        q.function_name = body.function_name
    if body.function_signature is not None:
        q.function_signature = body.function_signature
    if body.parameters is not None:
        q.parameters = body.parameters
    if body.return_type is not None:
        q.return_type = body.return_type
    if body.starter_code is not None:
        q.starter_code = body.starter_code
    if body.driver_code is not None:
        q.driver_code = body.driver_code

    await db.commit()

    q_stmt = (
        select(Question)
        .options(selectinload(Question.test_cases), selectinload(Question.mcq_options))
        .where(Question.id == q.id)
    )
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

    await db.execute(delete(ExamQuestionPool).where(ExamQuestionPool.question_id == question_id))
    await db.execute(delete(AssignedQuestion).where(AssignedQuestion.question_id == question_id))
    await db.execute(delete(QuestionScore).where(QuestionScore.question_id == question_id))
    await db.execute(delete(Submission).where(Submission.question_id == question_id))
    await db.execute(delete(MCQOption).where(MCQOption.question_id == question_id))
    await db.execute(delete(TestCase).where(TestCase.question_id == question_id))

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


# ==================== BULK CANDIDATE IMPORT & GROUPS ====================

@router.post("/students/import", response_model=CandidateImportResponse)
@router.post("/students/import-csv", response_model=CandidateImportResponse)
async def bulk_candidate_import(
    file: UploadFile = File(...),
    candidate_group: Optional[str] = Form(None),
    default_college: Optional[str] = Form(None),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Accepts .csv or .xlsx spreadsheets with columns: name, email, college (optional roll_no, password).
    Dynamically generates unique roll numbers and passwords when omitted.
    Assigns candidates to the designated college and candidate_group.
    Returns generated credentials for download and stores them for future email pipelines.
    """
    contents = await file.read()
    records = parse_candidates_file(contents, file.filename or "candidates.csv")

    # Fetch existing roll numbers and emails to avoid collisions
    existing_rolls_stmt = select(User.roll_no).where(User.roll_no != None)
    existing_rolls = set((await db.execute(existing_rolls_stmt)).scalars().all())

    existing_emails_stmt = select(User.email)
    existing_emails = set((await db.execute(existing_emails_stmt)).scalars().all())

    created_count = 0
    skipped_count = 0
    errors: List[str] = []
    credentials: List[ImportedCandidateCredential] = []

    group_tag = candidate_group.strip() if candidate_group and candidate_group.strip() else None
    college_default = default_college.strip() if default_college and default_college.strip() else None

    for row_idx, row in enumerate(records, start=2):
        name = row.get("name", "").strip()
        email = row.get("email", "").strip().lower()

        if not name or not email:
            errors.append(f"Row {row_idx}: Missing name or email")
            skipped_count += 1
            continue

        if email in existing_emails:
            skipped_count += 1
            continue

        # College and Group
        row_college = row.get("college", "").strip() or college_default or group_tag or None
        row_group = row.get("candidate_group", "").strip() or group_tag or row_college or None

        # Dynamic Roll No generation
        roll_no = row.get("roll_no", "").strip()
        if not roll_no or roll_no in existing_rolls:
            roll_no = generate_unique_roll_number(row_college, row_group, existing_rolls)
        existing_rolls.add(roll_no)

        # Dynamic Password generation
        plain_password = row.get("password", "").strip() or generate_readable_password()
        hashed = get_password_hash(plain_password)

        new_user = User(
            name=name,
            email=email,
            roll_no=roll_no,
            password_hash=hashed,
            role=UserRole.STUDENT,
            college=row_college,
            candidate_group=row_group,
            temp_password=plain_password,
        )
        db.add(new_user)
        existing_emails.add(email)
        created_count += 1

        credentials.append(ImportedCandidateCredential(
            name=name,
            email=email,
            college=row_college,
            candidate_group=row_group,
            roll_no=roll_no,
            password=plain_password
        ))

    await db.commit()
    return CandidateImportResponse(
        created_count=created_count,
        skipped_count=skipped_count,
        errors=errors,
        credentials=credentials
    )


@router.get("/students", response_model=List[UserResponse])
async def list_students(
    group: Optional[str] = None,
    college: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Lists registered students with optional group or college filters."""
    stmt = select(User).where(User.role == UserRole.STUDENT)
    if group:
        stmt = stmt.where(User.candidate_group == group.strip())
    if college:
        stmt = stmt.where(User.college == college.strip())
    stmt = stmt.order_by(User.id.asc())
    students = (await db.execute(stmt)).scalars().all()
    return [UserResponse.model_validate(s) for s in students]


@router.get("/students/groups")
async def list_student_groups(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Returns distinct candidate groups and colleges enrolled in the platform."""
    groups_stmt = select(User.candidate_group).where(
        User.role == UserRole.STUDENT,
        User.candidate_group != None,
        User.candidate_group != ""
    ).distinct()
    colleges_stmt = select(User.college).where(
        User.role == UserRole.STUDENT,
        User.college != None,
        User.college != ""
    ).distinct()

    groups = (await db.execute(groups_stmt)).scalars().all()
    colleges = (await db.execute(colleges_stmt)).scalars().all()
    return {
        "groups": sorted([g for g in groups if g]),
        "colleges": sorted([c for c in colleges if c])
    }


# ==================== LIVE EXAM MONITORING ====================

@router.get("/exams/{exam_id}/monitoring", response_model=List[MonitoringStudentView])
async def monitor_exam(
    exam_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Live exam monitoring: tracks student session states, remaining time,
    number of submissions, flags count, network connectivity health, and current scores in real time.
    """
    return await get_live_exam_monitoring(db, exam_id, redis)


@router.get("/exams/{exam_id}/candidates/{assignment_id}/dossier", response_model=CandidateDossierResponse)
async def get_candidate_dossier_detail(
    exam_id: int,
    assignment_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Candidate inspection dossier for admins:
    - Integrity flags and full proctoring audit log
    - Submitted code per question, language, status, execution time
    - Time spent per question and score calculation
    - Network connectivity health and disconnection incident logs
    """
    return await get_candidate_dossier(db, exam_id, assignment_id, redis)

