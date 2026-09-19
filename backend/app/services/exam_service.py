import hashlib
import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from backend.app.models.exam import (
    Exam,
    ExamQuestionPool,
    ExamAssignment,
    AssignedQuestion,
    AssignmentStatus
)
from backend.app.models.question import Question, QuestionDifficulty, MCQOption
from backend.app.models.submission import Submission, MCQResponse
from backend.app.models.user import User
from backend.app.models.result import ExamResult, QuestionScore
import redis.asyncio as aioredis
from backend.app.models.proctoring import ExamProctoringLog
from backend.app.models.network_incident import ExamNetworkIncident
from backend.app.schemas.question import StudentQuestionView, StudentMCQOptionView

from backend.app.schemas.exam import (
    ExamStartResponse,
    MyQuestionsResponse,
    LeaderboardEntry,
    ExamResultDetail,
    QuestionScoreBreakdown,
    MonitoringStudentView,
    CandidateDossierResponse,
    CandidateQuestionSubmissionDossier,
    ProctoringLogItem,
    NetworkIncidentItem
)
from backend.app.services.scoring_service import compute_and_save_exam_scores
from backend.app.services.question_templates import (
    get_question_starter_templates,
    get_question_signature
)


async def start_exam_for_student(
    db: AsyncSession,
    exam_id: int,
    user_id: int
) -> ExamStartResponse:
    """
    Idempotently starts the exam for a student:
    - If already assigned, returns existing assignment and locked questions.
    - If not assigned:
      - Randomly picks coding questions based on dynamic exam pattern (easy_count, medium_count, hard_count)
      - Fetches ALL fixed/MCQ questions (selection_mode='fixed') for this exam
      - Every student gets all fixed MCQs in the pool + the random coding draw
      - Sets started_at and deadline_at = started_at + duration_minutes.
    """
    now = datetime.now(timezone.utc)

    # 1. Fetch exam
    stmt_exam = select(Exam).where(Exam.id == exam_id)
    exam = (await db.execute(stmt_exam)).scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if not exam.is_published:
        raise HTTPException(status_code=400, detail="Exam is not published")

    if exam.start_time and now < exam.start_time:
        raise HTTPException(status_code=400, detail="Exam has not started yet")

    if exam.end_time and now > exam.end_time:
        raise HTTPException(status_code=400, detail="Exam window has expired")

    # Check candidate group eligibility
    if exam.target_groups and len(exam.target_groups) > 0:
        student = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not student or not student.candidate_group or student.candidate_group not in exam.target_groups:
            allowed_groups_str = ", ".join(exam.target_groups)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This assessment is restricted to specific candidate batches/groups ({allowed_groups_str})."
            )

    # 2. Check for existing assignment
    stmt_assign = (
        select(ExamAssignment)
        .where(ExamAssignment.exam_id == exam_id, ExamAssignment.user_id == user_id)
    )
    assignment = (await db.execute(stmt_assign)).scalar_one_or_none()

    if assignment:
        # If already completed or expired, reject starting again
        if assignment.status in [AssignmentStatus.SUBMITTED, AssignmentStatus.AUTO_SUBMITTED]:
            raise HTTPException(
                status_code=400,
                detail="You have already completed and submitted this assessment."
            )

        if assignment.deadline_at and now > assignment.deadline_at:
            assignment.status = AssignmentStatus.AUTO_SUBMITTED
            assignment.submitted_at = assignment.deadline_at
            await db.commit()
            await compute_and_save_exam_scores(db, assignment.id)
            raise HTTPException(
                status_code=400,
                detail="Assessment time limit has expired and your test has been submitted."
            )

        # If already started, return existing locked questions
        assigned_views = await _get_assigned_question_views(db, assignment.id)
        return ExamStartResponse(
            assignment_id=assignment.id,
            exam_id=exam.id,
            status=assignment.status,
            started_at=assignment.started_at or now,
            deadline_at=assignment.deadline_at or (now + timedelta(minutes=exam.duration_minutes)),
            duration_minutes=exam.duration_minutes,
            questions=assigned_views
        )

    # 3. Create new assignment
    # A. Fetch MCQ questions based on exam configuration (mcq_count)
    mcq_target = getattr(exam, 'mcq_count', None)
    mcq_q_ids = []
    if mcq_target is not None and mcq_target > 0:
        stmt_mcq = (
            select(ExamQuestionPool.question_id)
            .join(Question, ExamQuestionPool.question_id == Question.id)
            .where(
                ExamQuestionPool.exam_id == exam_id,
                Question.question_type == "mcq"
            )
            .order_by(func.random())
            .limit(mcq_target)
        )
        mcq_q_ids = list((await db.execute(stmt_mcq)).scalars().all())
    elif mcq_target is None:
        # Fallback for unconfigured legacy exams: all fixed MCQs
        stmt_fixed = (
            select(ExamQuestionPool.question_id)
            .join(Question, ExamQuestionPool.question_id == Question.id)
            .where(
                ExamQuestionPool.exam_id == exam_id,
                Question.question_type == "mcq"
            )
            .order_by(ExamQuestionPool.id.asc())
        )
        mcq_q_ids = list((await db.execute(stmt_fixed)).scalars().all())

    # B. Fetch random coding questions based on exam configuration (easy_count, medium_count, hard_count)
    easy_target = getattr(exam, 'easy_count', 1)
    if easy_target is None:
        easy_target = 1
    med_target = getattr(exam, 'medium_count', 2)
    if med_target is None:
        med_target = 2
    hard_target = getattr(exam, 'hard_count', 0)
    if hard_target is None:
        hard_target = 0
    total_coding_target = easy_target + med_target + hard_target

    easy_q_ids = []
    if easy_target > 0:
        stmt_easy = (
            select(ExamQuestionPool.question_id)
            .join(Question, ExamQuestionPool.question_id == Question.id)
            .where(
                ExamQuestionPool.exam_id == exam_id,
                Question.question_type != "mcq",
                ExamQuestionPool.difficulty == QuestionDifficulty.EASY
            )
            .order_by(func.random())
            .limit(easy_target)
        )
        easy_q_ids = list((await db.execute(stmt_easy)).scalars().all())

    med_q_ids = []
    if med_target > 0:
        stmt_med = (
            select(ExamQuestionPool.question_id)
            .join(Question, ExamQuestionPool.question_id == Question.id)
            .where(
                ExamQuestionPool.exam_id == exam_id,
                Question.question_type != "mcq",
                ExamQuestionPool.difficulty == QuestionDifficulty.MEDIUM
            )
            .order_by(func.random())
            .limit(med_target)
        )
        med_q_ids = list((await db.execute(stmt_med)).scalars().all())

    hard_q_ids = []
    if hard_target > 0:
        stmt_hard = (
            select(ExamQuestionPool.question_id)
            .join(Question, ExamQuestionPool.question_id == Question.id)
            .where(
                ExamQuestionPool.exam_id == exam_id,
                Question.question_type != "mcq",
                ExamQuestionPool.difficulty == QuestionDifficulty.HARD
            )
            .order_by(func.random())
            .limit(hard_target)
        )
        hard_q_ids = list((await db.execute(stmt_hard)).scalars().all())

    coding_selected_ids = list(easy_q_ids) + list(med_q_ids) + list(hard_q_ids)

    # Check if there are any random coding pool questions available to fallback from
    stmt_random_pool = (
        select(ExamQuestionPool.question_id)
        .join(Question, ExamQuestionPool.question_id == Question.id)
        .where(
            ExamQuestionPool.exam_id == exam_id,
            Question.question_type != "mcq"
        )
    )
    all_random_count = len((await db.execute(stmt_random_pool)).scalars().all())

    if all_random_count > 0 and len(coding_selected_ids) < total_coding_target:
        stmt_fallback = (
            select(ExamQuestionPool.question_id)
            .join(Question, ExamQuestionPool.question_id == Question.id)
            .where(
                ExamQuestionPool.exam_id == exam_id,
                Question.question_type != "mcq",
                ExamQuestionPool.question_id.not_in(coding_selected_ids) if coding_selected_ids else True
            )
            .order_by(func.random())
            .limit(total_coding_target - len(coding_selected_ids))
        )
        fallback_ids = (await db.execute(stmt_fallback)).scalars().all()
        coding_selected_ids.extend(fallback_ids)

    # Total assigned questions: selected random MCQs + selected coding questions
    final_assigned_q_ids = mcq_q_ids + coding_selected_ids

    if not final_assigned_q_ids:
        raise HTTPException(
            status_code=400,
            detail="No questions available in the exam pool. Please contact administrator."
        )

    started_at = now
    deadline_at = started_at + timedelta(minutes=exam.duration_minutes)

    assignment = ExamAssignment(
        exam_id=exam.id,
        user_id=user_id,
        started_at=started_at,
        deadline_at=deadline_at,
        status=AssignmentStatus.IN_PROGRESS
    )
    db.add(assignment)
    await db.flush()

    # Link questions to assignment with fixed order
    for idx, q_id in enumerate(final_assigned_q_ids):
        q_stmt = select(Question.difficulty).where(Question.id == q_id)
        q_diff = (await db.execute(q_stmt)).scalar_one_or_none() or QuestionDifficulty.EASY

        assigned_q = AssignedQuestion(
            assignment_id=assignment.id,
            question_id=q_id,
            difficulty=q_diff,
            order_index=idx
        )
        db.add(assigned_q)

    await db.commit()
    await db.refresh(assignment)

    assigned_views = await _get_assigned_question_views(db, assignment.id)
    return ExamStartResponse(
        assignment_id=assignment.id,
        exam_id=exam.id,
        status=assignment.status,
        started_at=assignment.started_at,
        deadline_at=assignment.deadline_at,
        duration_minutes=exam.duration_minutes,
        questions=assigned_views
    )


async def mark_question_viewed(
    db: AsyncSession,
    exam_id: int,
    question_id: int,
    user_id: int
) -> Optional[datetime]:
    """
    Marks a question as viewed by the student:
    - If assigned_questions.question_started_at is already set, does nothing (idempotent).
    - If not yet set: sets question_started_at = now(). If question has mcq_time_limit_seconds,
      computes and stores question_deadline_at = question_started_at + timedelta(seconds=mcq_time_limit_seconds).
    - Returns question_deadline_at.
    """
    now = datetime.now(timezone.utc)

    # 1. Fetch assignment
    assign_stmt = select(ExamAssignment).where(
        ExamAssignment.exam_id == exam_id,
        ExamAssignment.user_id == user_id
    )
    assignment = (await db.execute(assign_stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Exam assignment not found")

    # 2. Fetch assigned question and question
    stmt = (
        select(AssignedQuestion, Question)
        .join(Question, AssignedQuestion.question_id == Question.id)
        .where(
            AssignedQuestion.assignment_id == assignment.id,
            AssignedQuestion.question_id == question_id
        )
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Question is not assigned to this exam")

    assigned_q, q = row

    if assigned_q.question_started_at is not None:
        return assigned_q.question_deadline_at

    assigned_q.question_started_at = now
    if q.question_type == "mcq" and q.mcq_time_limit_seconds and q.mcq_time_limit_seconds > 0:
        assigned_q.question_deadline_at = now + timedelta(seconds=q.mcq_time_limit_seconds)

    await db.commit()
    await db.refresh(assigned_q)
    return assigned_q.question_deadline_at


async def get_student_exam_questions(
    db: AsyncSession,
    exam_id: int,
    user_id: int
) -> MyQuestionsResponse:
    """
    Returns locked questions + server deadline_at + server_time.
    Auto-finalizes if past deadline.
    """
    now = datetime.now(timezone.utc)

    # 1. Fetch exam and assignment
    stmt = (
        select(ExamAssignment, Exam)
        .join(Exam, ExamAssignment.exam_id == Exam.id)
        .where(ExamAssignment.exam_id == exam_id, ExamAssignment.user_id == user_id)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Exam not started yet. Please start the exam first.")

    assignment, exam = row

    # 2. Check if deadline passed mid-session
    if (
        assignment.status == AssignmentStatus.IN_PROGRESS
        and assignment.deadline_at
        and now > assignment.deadline_at
    ):
        assignment.status = AssignmentStatus.AUTO_SUBMITTED
        assignment.submitted_at = assignment.deadline_at
        await db.commit()
        await compute_and_save_exam_scores(db, assignment.id)
        await db.refresh(assignment)

    assigned_views = await _get_assigned_question_views(db, assignment.id)

    return MyQuestionsResponse(
        assignment_id=assignment.id,
        exam_id=exam.id,
        exam_title=exam.title,
        status=assignment.status,
        started_at=assignment.started_at,
        deadline_at=assignment.deadline_at,
        duration_minutes=exam.duration_minutes,
        server_time=now,
        questions=assigned_views
    )


async def finish_exam_for_student(
    db: AsyncSession,
    exam_id: int,
    user_id: int
) -> ExamResultDetail:
    """
    Manually finishes student exam, locks submission, and calculates final scores.
    """
    now = datetime.now(timezone.utc)

    stmt = (
        select(ExamAssignment)
        .where(ExamAssignment.exam_id == exam_id, ExamAssignment.user_id == user_id)
    )
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.status in [AssignmentStatus.SUBMITTED, AssignmentStatus.AUTO_SUBMITTED]:
        return await get_exam_result_detail(db, assignment.id)

    assignment.status = AssignmentStatus.SUBMITTED
    assignment.submitted_at = now
    await db.commit()

    await compute_and_save_exam_scores(db, assignment.id)
    return await get_exam_result_detail(db, assignment.id)


async def _get_assigned_question_views(db: AsyncSession, assignment_id: int) -> List[StudentQuestionView]:
    """
    Loads the locked questions for an assignment.
    For MCQ questions:
      - Deterministically shuffles options per (assignment_id, question_id).
      - Returns StudentMCQOptionView (strictly excludes is_correct).
      - Includes previously selected_option_ids and lock status.
    For coding questions:
      - Includes the latest code draft/submission.
    """
    assign_stmt = select(ExamAssignment).where(ExamAssignment.id == assignment_id)
    assignment = (await db.execute(assign_stmt)).scalar_one_or_none()
    exam = None
    if assignment:
        exam_stmt = select(Exam).where(Exam.id == assignment.exam_id)
        exam = (await db.execute(exam_stmt)).scalar_one_or_none()
    mcq_weight = float(exam.mcq_weight) if exam and getattr(exam, "mcq_weight", None) is not None else 2.0

    stmt = (
        select(AssignedQuestion, Question)
        .join(Question, AssignedQuestion.question_id == Question.id)
        .where(AssignedQuestion.assignment_id == assignment_id)
        .order_by(AssignedQuestion.order_index)
    )
    rows = (await db.execute(stmt)).all()

    views = []
    for assigned_q, q in rows:
        if q.question_type == "mcq":
            # 1. Fetch options
            opt_stmt = (
                select(MCQOption)
                .where(MCQOption.question_id == q.id)
                .order_by(MCQOption.order_index.asc(), MCQOption.id.asc())
            )
            raw_options = list((await db.execute(opt_stmt)).scalars().all())

            # 2. Deterministic shuffle based on hash of assignment_id and question_id
            seed_material = f"{assignment_id}:{q.id}".encode("utf-8")
            seed = int.from_bytes(hashlib.sha256(seed_material).digest()[:8], "big")
            rng = random.Random(seed)
            shuffled_options = list(raw_options)
            rng.shuffle(shuffled_options)

            student_options = [
                StudentMCQOptionView(
                    id=opt.id,
                    option_text=opt.option_text,
                    order_index=idx
                )
                for idx, opt in enumerate(shuffled_options)
            ]

            # 3. Check for previous response
            resp_stmt = select(MCQResponse).where(
                MCQResponse.assignment_id == assignment_id,
                MCQResponse.question_id == q.id
            )
            mcq_resp = (await db.execute(resp_stmt)).scalar_one_or_none()

            selected_ids = mcq_resp.selected_option_ids if mcq_resp else None
            is_locked = mcq_resp.is_locked if mcq_resp else False

            # Check if per-question deadline has passed (with 7s grace period for network transit)
            now = datetime.now(timezone.utc)
            MCQ_NETWORK_GRACE_PERIOD = timedelta(seconds=7)
            if assigned_q.question_deadline_at and now > (assigned_q.question_deadline_at + MCQ_NETWORK_GRACE_PERIOD):
                is_locked = True

            views.append(StudentQuestionView(
                id=q.id,
                title=q.title,
                description=q.description,
                difficulty=q.difficulty,
                time_limit_ms=q.time_limit_ms,
                memory_limit_kb=q.memory_limit_kb,
                sample_input=q.sample_input,
                sample_output=q.sample_output,
                input_format=q.input_format,
                order_index=assigned_q.order_index,
                last_code=None,
                last_language=None,
                starter_code=None,
                function_signature=None,
                status="submitted" if (selected_ids and len(selected_ids) > 0) else "unattempted",
                question_type="mcq",
                marks=mcq_weight,
                mcq_time_limit_seconds=q.mcq_time_limit_seconds,
                is_multi_select=q.is_multi_select,
                question_started_at=assigned_q.question_started_at,
                question_deadline_at=assigned_q.question_deadline_at,
                mcq_options=student_options,
                selected_option_ids=selected_ids,
                is_mcq_locked=is_locked
            ))

        else:
            # Coding question
            stmt_sub = (
                select(Submission)
                .where(
                    Submission.assignment_id == assignment_id,
                    Submission.question_id == q.id
                )
                .order_by(desc(Submission.submitted_at))
                .limit(1)
            )
            latest_sub = (await db.execute(stmt_sub)).scalar_one_or_none()

            views.append(StudentQuestionView(
                id=q.id,
                title=q.title,
                description=q.description,
                difficulty=q.difficulty,
                time_limit_ms=q.time_limit_ms,
                memory_limit_kb=q.memory_limit_kb,
                sample_input=q.sample_input,
                sample_output=q.sample_output,
                input_format=q.input_format,
                order_index=assigned_q.order_index,
                last_code=latest_sub.code if latest_sub else None,
                last_language=latest_sub.language if latest_sub else None,
                starter_code=get_question_starter_templates(q.title, question=q),
                function_signature=get_question_signature(q.title, question=q),
                status=latest_sub.status if latest_sub else "unattempted",
                question_type="coding",
                marks=None,
                mcq_time_limit_seconds=None,
                is_multi_select=False,
                question_started_at=assigned_q.question_started_at,
                question_deadline_at=assigned_q.question_deadline_at,
                mcq_options=None,
                selected_option_ids=None,
                is_mcq_locked=False
            ))
    return views


async def get_exam_result_detail(
    db: AsyncSession,
    assignment_id: int,
    is_admin: bool = False
) -> ExamResultDetail:
    """
    Returns full score breakdown for an assignment.
    Marks, scores, and rankings are strictly reserved for admins (is_admin=True).
    Students receive a secure submission confirmation without any scores.
    """
    stmt = (
        select(ExamAssignment, Exam, User, ExamResult)
        .join(Exam, ExamAssignment.exam_id == Exam.id)
        .join(User, ExamAssignment.user_id == User.id)
        .outerjoin(ExamResult, ExamResult.assignment_id == ExamAssignment.id)
        .where(ExamAssignment.id == assignment_id)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment, exam, user, result = row

    if not is_admin:
        return ExamResultDetail(
            assignment_id=assignment.id,
            exam_id=exam.id,
            exam_title=exam.title,
            student_name=user.name,
            roll_no=user.roll_no,
            status=assignment.status.value,
            total_score=None,
            rank=None,
            submitted_at=assignment.submitted_at,
            question_scores=[]
        )

    # For Admins: include score breakdown
    stmt_scores = (
        select(QuestionScore, Question)
        .join(Question, QuestionScore.question_id == Question.id)
        .where(QuestionScore.assignment_id == assignment_id)
        .order_by(QuestionScore.id)
    )
    score_rows = (await db.execute(stmt_scores)).all()

    breakdown = []
    for qs, q in score_rows:
        diff_str = q.difficulty.value if hasattr(q.difficulty, 'value') else str(q.difficulty)
        breakdown.append(QuestionScoreBreakdown(
            question_id=q.id,
            question_title=q.title,
            difficulty=diff_str,
            difficulty_weight=qs.difficulty_weight,
            correctness=qs.correctness,
            time_taken_sec=qs.time_taken_sec,
            time_bonus=getattr(qs, 'time_bonus', 0.0) or 0.0,
            final_score=qs.final_score
        ))

    return ExamResultDetail(
        assignment_id=assignment.id,
        exam_id=exam.id,
        exam_title=exam.title,
        student_name=user.name,
        roll_no=user.roll_no,
        status=assignment.status.value,
        total_score=result.total_score if result else 0.0,
        rank=result.rank if result else None,
        submitted_at=assignment.submitted_at,
        question_scores=breakdown
    )


async def get_exam_leaderboard(db: AsyncSession, exam_id: int) -> List[LeaderboardEntry]:
    """
    Returns leaderboard for an exam, ordered by rank ascending (admin only).
    """
    stmt = (
        select(ExamResult, ExamAssignment, User)
        .join(ExamAssignment, ExamResult.assignment_id == ExamAssignment.id)
        .join(User, ExamAssignment.user_id == User.id)
        .where(ExamAssignment.exam_id == exam_id)
        .order_by(ExamResult.rank.asc().nullslast())
    )
    rows = (await db.execute(stmt)).all()

    leaderboard = []
    for res_obj, assign, user in rows:
        leaderboard.append(LeaderboardEntry(
            rank=res_obj.rank or 9999,
            student_name=user.name,
            roll_no=user.roll_no,
            total_score=res_obj.total_score,
            submitted_at=assign.submitted_at
        ))
    return leaderboard


async def get_live_exam_monitoring(
    db: AsyncSession,
    exam_id: int,
    redis: Optional[aioredis.Redis] = None
) -> List[MonitoringStudentView]:
    """
    Fetches real-time status of all students for an exam.
    Includes in-memory Redis heartbeat liveness check and network incident logs.
    """
    now = datetime.now(timezone.utc)
    now_ts = int(now.timestamp())

    # 1. Fetch heartbeats in bulk from Redis (O(1) in-memory)
    heartbeats = {}
    if redis:
        try:
            heartbeats = await redis.hgetall(f"exam:{exam_id}:heartbeats")
        except Exception:
            heartbeats = {}

    # 2. Fetch network incidents summary per assignment
    stmt_incidents = (
        select(
            ExamNetworkIncident.assignment_id,
            func.count(ExamNetworkIncident.id).label("cnt"),
            func.coalesce(func.sum(ExamNetworkIncident.duration_seconds), 0).label("total_sec")
        )
        .join(ExamAssignment, ExamNetworkIncident.assignment_id == ExamAssignment.id)
        .where(ExamAssignment.exam_id == exam_id)
        .group_by(ExamNetworkIncident.assignment_id)
    )
    inc_rows = (await db.execute(stmt_incidents)).all()
    inc_counts = {r[0]: int(r[1]) for r in inc_rows}
    inc_durations = {r[0]: int(r[2]) for r in inc_rows}

    stmt_assigns = (
        select(ExamAssignment, User, ExamResult)
        .join(User, ExamAssignment.user_id == User.id)
        .outerjoin(ExamResult, ExamResult.assignment_id == ExamAssignment.id)
        .where(ExamAssignment.exam_id == exam_id)
        .order_by(ExamAssignment.id.desc())
    )
    rows = (await db.execute(stmt_assigns)).all()
    monitoring_list = []

    for assign, user, result in rows:
        count_stmt = select(func.count(Submission.id)).where(Submission.assignment_id == assign.id)
        submission_count = (await db.execute(count_stmt)).scalar() or 0

        # Count proctoring flags / infractions (PURE ANTI-CHEAT ONLY)
        flags_stmt = select(func.count(ExamProctoringLog.id)).where(ExamProctoringLog.assignment_id == assign.id)
        flags_count = (await db.execute(flags_stmt)).scalar() or 0

        remaining_sec = None
        if assign.status == AssignmentStatus.IN_PROGRESS and assign.deadline_at:
            delta = (assign.deadline_at - now).total_seconds()
            remaining_sec = max(0.0, delta)

        # Network liveness calculation
        network_status = "not_started"
        seconds_since_last_ping = None
        if assign.status == AssignmentStatus.IN_PROGRESS:
            last_ts_str = heartbeats.get(str(assign.id))
            if last_ts_str:
                try:
                    last_ts = int(last_ts_str)
                    lag = max(0, now_ts - last_ts)
                    seconds_since_last_ping = float(lag)
                    if lag <= 18:
                        network_status = "online"
                    elif lag <= 30:
                        network_status = "unstable"
                    else:
                        network_status = "offline"
                except (ValueError, TypeError):
                    network_status = "offline"
            else:
                # In progress but no recent heartbeat
                network_status = "offline"
        elif assign.status in (AssignmentStatus.SUBMITTED, AssignmentStatus.AUTO_SUBMITTED):
            network_status = "submitted"

        monitoring_list.append(MonitoringStudentView(
            assignment_id=assign.id,
            user_id=user.id,
            name=user.name,
            email=user.email,
            roll_no=user.roll_no,
            college=user.college,
            candidate_group=user.candidate_group,
            status=assign.status.value,
            started_at=assign.started_at,
            deadline_at=assign.deadline_at,
            submitted_at=assign.submitted_at,
            time_remaining_sec=remaining_sec,
            submissions_count=submission_count,
            flags_count=flags_count,
            current_score=result.total_score if result else None,
            network_status=network_status,
            seconds_since_last_ping=seconds_since_last_ping,
            disconnect_incidents_count=inc_counts.get(assign.id, 0),
            total_offline_seconds=inc_durations.get(assign.id, 0)
        ))

    return monitoring_list


async def get_candidate_dossier(
    db: AsyncSession,
    exam_id: int,
    assignment_id: int,
    redis: Optional[aioredis.Redis] = None
) -> CandidateDossierResponse:
    """
    Detailed inspector for admin: code submissions, MCQ answers, proctoring log,
    and network connectivity health with disconnection incident logs (separate from anti-cheat).
    """

    stmt = (
        select(ExamAssignment, User, Exam, ExamResult)
        .join(User, ExamAssignment.user_id == User.id)
        .join(Exam, ExamAssignment.exam_id == Exam.id)
        .outerjoin(ExamResult, ExamResult.assignment_id == ExamAssignment.id)
        .where(
            ExamAssignment.id == assignment_id,
            ExamAssignment.exam_id == exam_id
        )
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Candidate assignment not found for this exam")

    assignment, user, exam, result = row

    total_time_sec = None
    if assignment.started_at:
        end_time = assignment.submitted_at or assignment.deadline_at or datetime.now(timezone.utc)
        total_time_sec = max(0.0, (end_time - assignment.started_at).total_seconds())

    # Proctoring logs (Pure Anti-Cheat)
    stmt_logs = (
        select(ExamProctoringLog)
        .where(ExamProctoringLog.assignment_id == assignment_id)
        .order_by(ExamProctoringLog.occurred_at.asc())
    )
    log_rows = (await db.execute(stmt_logs)).scalars().all()

    total_flags = len(log_rows)
    flag_counts_by_type = {}
    for l in log_rows:
        flag_counts_by_type[l.event_type] = flag_counts_by_type.get(l.event_type, 0) + 1

    if total_flags == 0:
        integrity_status = "Clean"
    elif total_flags <= 2:
        integrity_status = "Warning"
    else:
        integrity_status = "High Risk"

    # Network Incidents (Non-punitive network & system outages)
    stmt_incidents = (
        select(ExamNetworkIncident)
        .where(ExamNetworkIncident.assignment_id == assignment_id)
        .order_by(ExamNetworkIncident.disconnected_at.desc())
    )
    incident_rows = (await db.execute(stmt_incidents)).scalars().all()
    disconnect_incidents_count = len(incident_rows)
    total_offline_seconds = sum(inc.duration_seconds or 0 for inc in incident_rows)

    # Current network status
    network_status = "not_started"
    if assignment.status == AssignmentStatus.IN_PROGRESS:
        network_status = "offline"
        if redis:
            try:
                last_ping_str = await redis.hget(f"exam:{exam_id}:heartbeats", str(assignment_id))
                if last_ping_str:
                    now_ts = int(datetime.now(timezone.utc).timestamp())
                    lag = max(0, now_ts - int(last_ping_str))
                    if lag <= 18:
                        network_status = "online"
                    elif lag <= 30:
                        network_status = "unstable"
                    else:
                        network_status = "offline"
            except Exception:
                pass
    elif assignment.status in (AssignmentStatus.SUBMITTED, AssignmentStatus.AUTO_SUBMITTED):
        network_status = "submitted"

    # Assigned questions, scores, and submissions
    stmt_assigned = (
        select(AssignedQuestion, Question, QuestionScore)
        .join(Question, AssignedQuestion.question_id == Question.id)
        .outerjoin(
            QuestionScore,
            and_(
                QuestionScore.assignment_id == assignment_id,
                QuestionScore.question_id == Question.id
            )
        )
        .where(AssignedQuestion.assignment_id == assignment_id)
        .order_by(AssignedQuestion.order_index)
    )
    assigned_rows = (await db.execute(stmt_assigned)).all()

    question_dossiers = []
    for assigned_q, q, q_score in assigned_rows:
        if q.question_type == "mcq":
            resp_stmt = select(MCQResponse).where(
                MCQResponse.assignment_id == assignment_id,
                MCQResponse.question_id == q.id
            )
            mcq_resp = (await db.execute(resp_stmt)).scalar_one_or_none()

            opts_stmt = select(MCQOption).where(MCQOption.question_id == q.id).order_by(MCQOption.order_index)
            opts_rows = (await db.execute(opts_stmt)).scalars().all()
            mcq_options_list = [
                {
                    "id": str(opt.id),
                    "option_text": opt.option_text,
                    "is_correct": opt.is_correct,
                    "order_index": opt.order_index,
                }
                for opt in opts_rows
            ]

            selected_ids = [str(o) for o in (mcq_resp.selected_option_ids if mcq_resp else [])]

            time_taken = q_score.time_taken_sec if q_score else 0.0
            if not time_taken and mcq_resp and mcq_resp.answered_at and assignment.started_at:
                time_taken = max(0.0, (mcq_resp.answered_at - assignment.started_at).total_seconds())

            is_correct = bool(mcq_resp and mcq_resp.is_correct)
            status = "Correct" if is_correct else ("Wrong" if selected_ids else "Unattempted")

            question_dossiers.append(CandidateQuestionSubmissionDossier(
                question_id=q.id,
                question_title=q.title,
                difficulty=assigned_q.difficulty.value,
                order_index=assigned_q.order_index,
                correctness=q_score.correctness if q_score else (1.0 if is_correct else 0.0),
                difficulty_weight=q_score.difficulty_weight if q_score else float(getattr(exam, 'mcq_weight', 2.0) if getattr(exam, 'mcq_weight', None) is not None else 2.0),
                final_score=q_score.final_score if q_score else (mcq_resp.marks_awarded if mcq_resp and mcq_resp.marks_awarded is not None else 0.0),
                time_taken_sec=round(time_taken, 1),
                has_submission=bool(selected_ids),
                code=None,
                language="MCQ",
                status=status,
                test_cases_passed=1 if is_correct else 0,
                total_test_cases=1,
                exec_time_ms=None,
                submitted_at=mcq_resp.answered_at if mcq_resp else None,
                question_type="mcq",
                description=q.description,
                mcq_options=mcq_options_list,
                selected_option_ids=selected_ids,
                is_multi_select=bool(q.is_multi_select),
            ))
        else:
            stmt_sub = (
                select(Submission)
                .where(
                    Submission.assignment_id == assignment_id,
                    Submission.question_id == q.id
                )
                .order_by(desc(Submission.is_final), desc(Submission.submitted_at))
                .limit(1)
            )
            sub = (await db.execute(stmt_sub)).scalar_one_or_none()

            time_taken = q_score.time_taken_sec if q_score else 0.0
            if not time_taken and sub and assignment.started_at:
                time_taken = max(0.0, (sub.submitted_at - assignment.started_at).total_seconds())

            question_dossiers.append(CandidateQuestionSubmissionDossier(
                question_id=q.id,
                question_title=q.title,
                difficulty=assigned_q.difficulty.value,
                order_index=assigned_q.order_index,
                correctness=q_score.correctness if q_score else (float(sub.test_cases_passed) / float(sub.total_test_cases) if sub and sub.total_test_cases else 0.0),
                difficulty_weight=q_score.difficulty_weight if q_score else 10.0,
                final_score=q_score.final_score if q_score else 0.0,
                time_taken_sec=round(time_taken, 1),
                has_submission=bool(sub),
                code=sub.code if sub else None,
                language=sub.language if sub else None,
                status=sub.status if sub else "Unattempted",
                test_cases_passed=sub.test_cases_passed if sub else 0,
                total_test_cases=sub.total_test_cases if sub else 0,
                exec_time_ms=sub.exec_time_ms if sub else None,
                submitted_at=sub.submitted_at if sub else None,
                question_type="coding",
                description=q.description,
                is_multi_select=False,
            ))

    return CandidateDossierResponse(
        assignment_id=assignment.id,
        exam_id=exam.id,
        exam_title=exam.title,
        user_id=user.id,
        student_name=user.name,
        email=user.email,
        roll_no=user.roll_no,
        status=assignment.status.value,
        started_at=assignment.started_at,
        submitted_at=assignment.submitted_at,
        total_time_sec=round(total_time_sec, 1) if total_time_sec is not None else None,
        total_score=result.total_score if result else None,
        rank=result.rank if result else None,
        total_flags=total_flags,
        flag_counts_by_type=flag_counts_by_type,
        integrity_status=integrity_status,
        proctoring_logs=[ProctoringLogItem.model_validate(l) for l in log_rows],
        questions=question_dossiers,
        network_status=network_status,
        disconnect_incidents_count=disconnect_incidents_count,
        total_offline_seconds=total_offline_seconds,
        network_incidents=[NetworkIncidentItem.model_validate(inc) for inc in incident_rows]
    )
