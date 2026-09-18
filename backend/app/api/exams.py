from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis
from backend.app.core.database import get_db
from backend.app.core.redis import get_redis
from backend.app.core.security import get_current_user, get_current_admin
from backend.app.models.user import User, UserRole
from backend.app.models.exam import Exam, ExamAssignment, AssignmentStatus
from backend.app.models.proctoring import ExamProctoringLog
from backend.app.models.network_incident import ExamNetworkIncident
from backend.app.schemas.exam import (
    ExamResponse,
    ExamStartResponse,
    MyQuestionsResponse,
    LeaderboardEntry,
    ExamResultDetail,
    BatchProctoringLogRequest,
    CandidateHeartbeatRequest,
    CandidateHeartbeatResponse
)
from backend.app.services.exam_service import (
    start_exam_for_student,
    get_student_exam_questions,
    finish_exam_for_student,
    get_exam_leaderboard,
    get_exam_result_detail,
    mark_question_viewed
)

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=List[ExamResponse])
async def list_available_exams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List published exams available for students, including assignment and completion state.
    """
    stmt = select(Exam).where(Exam.is_published == True).order_by(Exam.id.desc())
    exams = (await db.execute(stmt)).scalars().all()
    if not exams:
        return []

    # If student, only show exams open to all or targeted to their candidate group
    if current_user.role == UserRole.STUDENT:
        filtered = []
        for e in exams:
            if not e.target_groups or len(e.target_groups) == 0:
                filtered.append(e)
            elif current_user.candidate_group and current_user.candidate_group in e.target_groups:
                filtered.append(e)
        exams = filtered

    if not exams:
        return []

    exam_ids = [e.id for e in exams]
    assign_stmt = select(ExamAssignment).where(
        ExamAssignment.user_id == current_user.id,
        ExamAssignment.exam_id.in_(exam_ids)
    )
    assignments = (await db.execute(assign_stmt)).scalars().all()
    assignments_by_exam_id = {a.exam_id: a for a in assignments}

    now = datetime.now(timezone.utc)
    results = []
    for exam in exams:
        resp = ExamResponse.model_validate(exam)
        resp.server_time = now
        resp.is_upcoming = bool(exam.start_time and now < exam.start_time)
        resp.is_expired = bool(exam.end_time and now > exam.end_time)

        assign = assignments_by_exam_id.get(exam.id)
        if assign:
            is_done = (
                assign.status in [AssignmentStatus.SUBMITTED, AssignmentStatus.AUTO_SUBMITTED]
                or bool(assign.deadline_at and assign.deadline_at <= now)
            )
            resp.is_completed = is_done
            resp.assignment_status = (
                AssignmentStatus.AUTO_SUBMITTED
                if (is_done and assign.status == AssignmentStatus.IN_PROGRESS)
                else assign.status
            )
        else:
            resp.is_completed = False
            resp.assignment_status = AssignmentStatus.NOT_STARTED
        results.append(resp)

    return results


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam_details(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Exam).where(Exam.id == exam_id)
    exam = (await db.execute(stmt)).scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    now = datetime.now(timezone.utc)
    resp = ExamResponse.model_validate(exam)
    resp.server_time = now
    resp.is_upcoming = bool(exam.start_time and now < exam.start_time)
    resp.is_expired = bool(exam.end_time and now > exam.end_time)

    assign_stmt = select(ExamAssignment).where(
        ExamAssignment.user_id == current_user.id,
        ExamAssignment.exam_id == exam.id
    )
    assign = (await db.execute(assign_stmt)).scalar_one_or_none()
    if assign:
        is_done = (
            assign.status in [AssignmentStatus.SUBMITTED, AssignmentStatus.AUTO_SUBMITTED]
            or bool(assign.deadline_at and assign.deadline_at <= now)
        )
        resp.is_completed = is_done
        resp.assignment_status = (
            AssignmentStatus.AUTO_SUBMITTED
            if (is_done and assign.status == AssignmentStatus.IN_PROGRESS)
            else assign.status
        )
    else:
        resp.is_completed = False
        resp.assignment_status = AssignmentStatus.NOT_STARTED

    return resp


@router.post("/{exam_id}/start", response_model=ExamStartResponse)
async def start_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Idempotently assigns 3 questions (1 easy + 2 medium) and starts the timer.
    """
    return await start_exam_for_student(
        db=db,
        exam_id=exam_id,
        user_id=current_user.id
    )


@router.get("/{exam_id}/my-questions", response_model=MyQuestionsResponse)
async def get_my_questions(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns locked questions + server deadline_at.
    Handles reconnect/resume so browser refreshes mid-exam retain exact state.
    """
    return await get_student_exam_questions(
        db=db,
        exam_id=exam_id,
        user_id=current_user.id
    )


@router.post("/{exam_id}/finish", response_model=ExamResultDetail)
async def finish_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Student manually finishes exam, locking answers and computing final score.
    """
    return await finish_exam_for_student(
        db=db,
        exam_id=exam_id,
        user_id=current_user.id
    )


@router.get("/{exam_id}/result", response_model=ExamResultDetail)
async def get_my_exam_result(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the student's result and question score breakdown for this exam.
    Rank is hidden from students; only admins can view rankings.
    """
    stmt = (
        select(ExamAssignment)
        .where(ExamAssignment.exam_id == exam_id, ExamAssignment.user_id == current_user.id)
    )
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Exam assignment not found")

    is_admin = (current_user.role == UserRole.ADMIN)
    return await get_exam_result_detail(db, assignment.id, is_admin=is_admin)


@router.get("/{exam_id}/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    exam_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Leaderboard of finalized student results for the exam. Admin only.
    """
    return await get_exam_leaderboard(db, exam_id)


@router.get("/{exam_id}/results", response_model=List[LeaderboardEntry])
async def get_all_results_admin(
    exam_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin only: fetch all results and rankings for the exam.
    """
    return await get_exam_leaderboard(db, exam_id)


@router.post("/{exam_id}/proctoring-logs")
async def batch_save_proctoring_logs(
    exam_id: int,
    body: BatchProctoringLogRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    High-throughput batch ingestion for proctoring logs & flags from candidate's browser.
    Validates assignment ownership and inserts logs in a single batch.
    """
    if not body.logs:
        return {"saved": 0}

    stmt = (
        select(ExamAssignment)
        .where(
            ExamAssignment.id == body.assignment_id,
            ExamAssignment.user_id == current_user.id,
            ExamAssignment.exam_id == exam_id
        )
    )
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=403, detail="Invalid assignment for proctoring logs")

    log_records = [
        ExamProctoringLog(
            assignment_id=assignment.id,
            event_type=item.event_type[:50],
            title=item.title[:150],
            description=item.description,
            occurred_at=item.occurred_at,
            meta_data=item.meta_data
        )
        for item in body.logs
    ]
    db.add_all(log_records)
    await db.commit()
    return {"saved": len(log_records)}


<<<<<<< Updated upstream
@router.post("/{exam_id}/questions/{question_id}/view")
async def mark_question_as_viewed(
    exam_id: int,
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marks a question as viewed by the student and starts its individual timer if applicable.
    Idempotent: if already set, does not reset the timer.
    """
    deadline = await mark_question_viewed(db, exam_id, question_id, current_user.id)
    return {"question_deadline_at": deadline}
=======
@router.post("/{exam_id}/heartbeat", response_model=CandidateHeartbeatResponse)
async def record_candidate_heartbeat(
    exam_id: int,
    body: CandidateHeartbeatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    High-throughput, low-latency candidate heartbeat for 1,000+ concurrent users.
    Stores last seen timestamp in Redis in-memory hash.
    Automatically detects disconnections/shutdowns (>30s) upon reconnection and
    logs an incident into exam_network_incidents (without altering cheating flags).
    """
    now = datetime.now(timezone.utc)
    now_ts = int(now.timestamp())

    stmt = (
        select(ExamAssignment)
        .where(
            ExamAssignment.id == body.assignment_id,
            ExamAssignment.user_id == current_user.id,
            ExamAssignment.exam_id == exam_id
        )
    )
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=403, detail="Invalid exam assignment for heartbeat")

    # Only process heartbeats if exam assignment is in progress
    if assignment.status != AssignmentStatus.IN_PROGRESS:
        return CandidateHeartbeatResponse(
            status="ok",
            server_time=now,
            network_status="not_in_progress",
            incident_logged=False
        )

    redis_hb_key = f"exam:{exam_id}:heartbeats"
    prev_ts_str = await redis.hget(redis_hb_key, str(assignment.id))

    incident_logged = False
    if prev_ts_str is not None:
        try:
            prev_ts = int(prev_ts_str)
            gap = now_ts - prev_ts
            # If gap >= 30 seconds, candidate was disconnected or machine was shut down!
            if gap >= 30:
                disconnected_at = datetime.fromtimestamp(prev_ts, tz=timezone.utc)
                incident = ExamNetworkIncident(
                    assignment_id=assignment.id,
                    disconnected_at=disconnected_at,
                    reconnected_at=now,
                    duration_seconds=gap,
                    reason=f"Heartbeat Timeout ({gap}s)"
                )
                db.add(incident)
                await db.commit()
                incident_logged = True
        except (ValueError, TypeError):
            pass

    # Save current heartbeat in Redis with 24-hour expiration
    await redis.hset(redis_hb_key, str(assignment.id), str(now_ts))
    await redis.expire(redis_hb_key, 86400)

    return CandidateHeartbeatResponse(
        status="ok",
        server_time=now,
        network_status="online",
        incident_logged=incident_logged
    )
>>>>>>> Stashed changes

