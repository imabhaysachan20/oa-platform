import json
import hashlib
import random
import io
import re
import math
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import select, func, desc, and_, or_, case, String
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

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
    LeaderboardResponse,
    ExamResultDetail,
    QuestionScoreBreakdown,
    MonitoringStudentView,
    CandidateDossierResponse,
    CandidateQuestionSubmissionDossier,
    ProctoringLogItem,
    NetworkIncidentItem,
    DeviceTelemetryPayload,
    ResumeExamRequest,
    ResumeExamResponse,
    FreshRestartResponse,
    CandidateAttemptItem
)
from backend.app.services.scoring_service import compute_and_save_exam_scores, calculate_difficulty_weight
from backend.app.services.question_templates import (
    get_question_starter_templates,
    get_question_signature
)
from backend.app.core.config import settings
from backend.app.services.s3_service import (
    upload_verification_photo_to_s3,
    get_presigned_view_url,
    generate_presigned_upload_url
)


async def sync_unsubmitted_assignments_for_exam(db: AsyncSession, exam_id: int):
    """
    Synchronizes active (unsubmitted) student assignments when an admin modifies an exam's
    question pool, question pattern counts (easy, medium, hard, mcq), or weight rules.

    - Preserves student progress (draft code, MCQ selections) for questions that remain valid.
    - Removes assigned questions that were removed from the exam pool by admin.
    - Adds new pool questions to complete the exam's pattern for active candidates.
    """
    exam = (await db.execute(select(Exam).where(Exam.id == exam_id))).scalar_one_or_none()
    if not exam:
        return

    # Pool questions currently assigned to this exam
    pool_stmt = select(ExamQuestionPool.question_id).where(ExamQuestionPool.exam_id == exam_id)
    pool_q_ids = set((await db.execute(pool_stmt)).scalars().all())

    # Get all unsubmitted assignments for this exam
    assign_stmt = (
        select(ExamAssignment)
        .where(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.status.in_([AssignmentStatus.NOT_STARTED, AssignmentStatus.IN_PROGRESS])
        )
    )
    assignments = (await db.execute(assign_stmt)).scalars().all()
    if not assignments:
        return

    easy_target = getattr(exam, 'easy_count', 1)
    if easy_target is None:
        easy_target = 1
    med_target = getattr(exam, 'medium_count', 2)
    if med_target is None:
        med_target = 2
    hard_target = getattr(exam, 'hard_count', 0)
    if hard_target is None:
        hard_target = 0
    mcq_target = getattr(exam, 'mcq_count', 0)
    if mcq_target is None:
        mcq_target = 0

    for assignment in assignments:
        # Get current assigned question objects for this candidate
        aq_stmt = (
            select(AssignedQuestion)
            .where(AssignedQuestion.assignment_id == assignment.id)
            .order_by(AssignedQuestion.order_index.asc())
        )
        assigned_qs = list((await db.execute(aq_stmt)).scalars().all())

        # Remove assigned questions that are no longer in pool
        if pool_q_ids:
            for aq in assigned_qs:
                if aq.question_id not in pool_q_ids:
                    await db.delete(aq)
                    await db.flush()

        # Re-query remaining assigned question IDs
        rem_aq_stmt = (
            select(AssignedQuestion.question_id)
            .where(AssignedQuestion.assignment_id == assignment.id)
        )
        current_assigned_q_ids = set((await db.execute(rem_aq_stmt)).scalars().all())

        # Determine missing questions per category (MCQs and Coding)
        # 1. MCQs missing count
        curr_mcq_stmt = (
            select(AssignedQuestion.question_id)
            .join(Question, AssignedQuestion.question_id == Question.id)
            .where(
                AssignedQuestion.assignment_id == assignment.id,
                Question.question_type == "mcq"
            )
        )
        curr_mcq_ids = set((await db.execute(curr_mcq_stmt)).scalars().all())
        missing_mcqs = max(0, mcq_target - len(curr_mcq_ids))

        new_mcq_ids = []
        if missing_mcqs > 0:
            avail_mcq_stmt = (
                select(ExamQuestionPool.question_id)
                .join(Question, ExamQuestionPool.question_id == Question.id)
                .where(
                    ExamQuestionPool.exam_id == exam_id,
                    Question.question_type == "mcq",
                    ExamQuestionPool.question_id.not_in(current_assigned_q_ids) if current_assigned_q_ids else True
                )
                .order_by(func.random())
                .limit(missing_mcqs)
            )
            new_mcq_ids = list((await db.execute(avail_mcq_stmt)).scalars().all())

        # 2. Coding missing counts (Easy, Med, Hard)
        async def get_missing_coding(difficulty_val: QuestionDifficulty, target_count: int, exclude_set: set) -> List[int]:
            if target_count <= 0:
                return []
            curr_c_stmt = (
                select(AssignedQuestion.question_id)
                .join(Question, AssignedQuestion.question_id == Question.id)
                .where(
                    AssignedQuestion.assignment_id == assignment.id,
                    Question.question_type != "mcq",
                    Question.difficulty == difficulty_val
                )
            )
            curr_c_ids = set((await db.execute(curr_c_stmt)).scalars().all())
            missing = max(0, target_count - len(curr_c_ids))
            if missing <= 0:
                return []
            avail_c_stmt = (
                select(ExamQuestionPool.question_id)
                .join(Question, ExamQuestionPool.question_id == Question.id)
                .where(
                    ExamQuestionPool.exam_id == exam_id,
                    Question.question_type != "mcq",
                    ExamQuestionPool.difficulty == difficulty_val,
                    ExamQuestionPool.question_id.not_in(exclude_set) if exclude_set else True
                )
                .order_by(func.random())
                .limit(missing)
            )
            return list((await db.execute(avail_c_stmt)).scalars().all())

        all_exclude = set(current_assigned_q_ids).union(set(new_mcq_ids))
        new_easy_ids = await get_missing_coding(QuestionDifficulty.EASY, easy_target, all_exclude)
        all_exclude.update(new_easy_ids)
        new_med_ids = await get_missing_coding(QuestionDifficulty.MEDIUM, med_target, all_exclude)
        all_exclude.update(new_med_ids)
        new_hard_ids = await get_missing_coding(QuestionDifficulty.HARD, hard_target, all_exclude)
        all_exclude.update(new_hard_ids)

        new_q_ids_to_add = new_mcq_ids + new_easy_ids + new_med_ids + new_hard_ids

        # If total coding target is still not met (due to difficulty shortage in pool), pick fallback coding questions
        total_coding_target = easy_target + med_target + hard_target
        curr_total_coding_stmt = (
            select(AssignedQuestion.question_id)
            .join(Question, AssignedQuestion.question_id == Question.id)
            .where(
                AssignedQuestion.assignment_id == assignment.id,
                Question.question_type != "mcq"
            )
        )
        curr_total_coding_count = len((await db.execute(curr_total_coding_stmt)).scalars().all()) + len(new_easy_ids) + len(new_med_ids) + len(new_hard_ids)
        if curr_total_coding_count < total_coding_target:
            shortage = total_coding_target - curr_total_coding_count
            fb_stmt = (
                select(ExamQuestionPool.question_id)
                .join(Question, ExamQuestionPool.question_id == Question.id)
                .where(
                    ExamQuestionPool.exam_id == exam_id,
                    Question.question_type != "mcq",
                    ExamQuestionPool.question_id.not_in(all_exclude) if all_exclude else True
                )
                .order_by(func.random())
                .limit(shortage)
            )
            fb_ids = list((await db.execute(fb_stmt)).scalars().all())
            new_q_ids_to_add.extend(fb_ids)

        # Add newly assigned questions
        if new_q_ids_to_add:
            existing_count = len(current_assigned_q_ids)
            for idx, q_id in enumerate(new_q_ids_to_add):
                q_stmt = select(Question.difficulty).where(Question.id == q_id)
                q_diff = (await db.execute(q_stmt)).scalar_one_or_none() or QuestionDifficulty.EASY
                db.add(AssignedQuestion(
                    assignment_id=assignment.id,
                    question_id=q_id,
                    difficulty=q_diff,
                    order_index=existing_count + idx
                ))
            await db.flush()

        # Re-index order_index for all assigned questions cleanly
        final_aq_stmt = (
            select(AssignedQuestion)
            .where(AssignedQuestion.assignment_id == assignment.id)
            .order_by(AssignedQuestion.id.asc())
        )
        final_aqs = list((await db.execute(final_aq_stmt)).scalars().all())
        for idx, aq in enumerate(final_aqs):
            aq.order_index = idx

    await db.commit()


async def _draw_exam_questions(db: AsyncSession, exam: Exam) -> List[int]:
    """
    Randomly draws question IDs from the exam question pool according to the
    exam's MCQ quotas and difficulty distribution (easy_count, medium_count, hard_count).
    Returns an ordered list of question IDs: timed MCQs first, untimed MCQs, then coding questions.
    """
    exam_id = exam.id
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
        stmt_fixed = (
            select(ExamQuestionPool.question_id)
            .join(Question, ExamQuestionPool.question_id == Question.id)
            .where(
                ExamQuestionPool.exam_id == exam_id,
                ExamQuestionPool.selection_mode == "fixed",
                Question.question_type == "mcq"
            )
        )
        mcq_q_ids = list((await db.execute(stmt_fixed)).scalars().all())

    # Fetch coding questions based on dynamic exam quotas
    easy_target = getattr(exam, 'easy_count', None) or 0
    med_target = getattr(exam, 'medium_count', None) or 0
    hard_target = getattr(exam, 'hard_count', None) or 0
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

    # Partition MCQs: Timed MCQs first, then untimed MCQs
    timed_mcq_ids = []
    untimed_mcq_ids = []
    if mcq_q_ids:
        stmt_timed = (
            select(Question.id, Question.mcq_time_limit_seconds)
            .where(Question.id.in_(mcq_q_ids))
        )
        mcq_time_rows = (await db.execute(stmt_timed)).all()
        timed_set = {r[0] for r in mcq_time_rows if r[1] and r[1] > 0}
        for q_id in mcq_q_ids:
            if q_id in timed_set:
                timed_mcq_ids.append(q_id)
            else:
                untimed_mcq_ids.append(q_id)

    final_assigned_q_ids = timed_mcq_ids + untimed_mcq_ids + coding_selected_ids
    if not final_assigned_q_ids:
        raise HTTPException(
            status_code=400,
            detail="No questions available in the exam pool. Please contact administrator."
        )
    return final_assigned_q_ids


async def start_exam_for_student(
    db: AsyncSession,
    exam_id: int,
    user_id: int,
    telemetry: Optional[DeviceTelemetryPayload] = None,
    client_ip: Optional[str] = None,
    redis: Optional[aioredis.Redis] = None,
    verification_photo: Optional[str] = None,
    s3_key: Optional[str] = None
) -> ExamStartResponse:
    """
    Idempotently starts the exam for a student:
    - If already assigned, returns existing assignment and locked questions, and records resume telemetry.
    - If not assigned:
      - Randomly picks coding questions based on dynamic exam pattern (easy_count, medium_count, hard_count)
      - Fetches ALL fixed/MCQ questions (selection_mode='fixed') for this exam
      - Every student gets all fixed MCQs in the pool + the random coding draw
      - Sets started_at and deadline_at = started_at + duration_minutes.
      - Logs initial device & geolocation telemetry in the proctoring audit log.
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

    # 2. Check for existing active assignment
    stmt_assign = (
        select(ExamAssignment)
        .where(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.user_id == user_id,
            ExamAssignment.is_active == True
        )
    )
    assignment = (await db.execute(stmt_assign)).scalar_one_or_none()

    # Late Entry Window Enforcement:
    # If exam has start_time and duration_minutes > late_entry_window_minutes (default 15):
    # Candidate cannot enter if now > start_time + late_entry_window_minutes
    # Exceptions:
    # 1) If exam duration <= late_entry_window_minutes: candidates can enter anytime within exam window.
    # 2) If assignment was already started during the entry window (in_progress resume)
    # 3) If assignment was explicitly reset/waived by admin (reset_by_admin == True)
    late_window = getattr(exam, 'late_entry_window_minutes', 15) or 15
    if exam.start_time and exam.duration_minutes > late_window:
        entry_cutoff = exam.start_time + timedelta(minutes=late_window)
        is_waived = assignment is not None and getattr(assignment, 'reset_by_admin', False)
        is_already_started = assignment is not None and assignment.status == AssignmentStatus.IN_PROGRESS
        if not is_waived and not is_already_started and now > entry_cutoff:
            cutoff_str = entry_cutoff.strftime("%H:%M UTC")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The late entry window for this assessment closed at {cutoff_str} ({late_window} minutes after start time). Late entry is not permitted."
            )

    if assignment:
        # If assignment was in NOT_STARTED state (e.g. from fresh restart), start the clock now
        if assignment.status == AssignmentStatus.NOT_STARTED:
            assignment.started_at = now
            assignment.deadline_at = now + timedelta(minutes=exam.duration_minutes)
            assignment.status = AssignmentStatus.IN_PROGRESS
            await db.commit()
            await db.refresh(assignment)

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

        # Sync assigned questions if exam pool/pattern changed by admin
        await sync_unsubmitted_assignments_for_exam(db, exam_id)

        # If already started, record resume telemetry or photo if provided
        if telemetry or verification_photo or s3_key:
            await record_exam_resume_telemetry(
                db=db,
                exam_id=exam_id,
                user_id=user_id,
                assignment_id=assignment.id,
                telemetry=telemetry,
                client_ip=client_ip,
                redis=redis,
                verification_photo=verification_photo,
                s3_key=s3_key
            )

        # Return existing locked questions
        assigned_views = await _get_assigned_question_views(db, assignment.id)
        return ExamStartResponse(
            assignment_id=assignment.id,
            exam_id=exam.id,
            status=assignment.status,
            started_at=assignment.started_at or now,
            deadline_at=assignment.deadline_at or (now + timedelta(minutes=exam.duration_minutes)),
            duration_minutes=exam.duration_minutes,
            attempt_number=getattr(assignment, 'attempt_number', 1),
            verification_photo_url=get_presigned_view_url(getattr(assignment, 'verification_photo_url', None)),
            questions=assigned_views
        )

    # 3. Create new assignment (initial attempt)
    final_assigned_q_ids = await _draw_exam_questions(db, exam)

    started_at = now
    deadline_at = started_at + timedelta(minutes=exam.duration_minutes)

    max_att_stmt = select(func.coalesce(func.max(ExamAssignment.attempt_number), 0)).where(
        ExamAssignment.exam_id == exam.id,
        ExamAssignment.user_id == user_id
    )
    max_attempt = (await db.execute(max_att_stmt)).scalar() or 0
    attempt_num = max_attempt + 1

    assignment = ExamAssignment(
        exam_id=exam.id,
        user_id=user_id,
        attempt_number=attempt_num,
        is_active=True,
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

    # Device and location telemetry parsing
    browser_str = telemetry.browser if (telemetry and telemetry.browser) else "Unknown Browser"
    os_str = telemetry.os if (telemetry and telemetry.os) else "Unknown OS"
    res_str = telemetry.screen_resolution if (telemetry and telemetry.screen_resolution) else "Unknown Res"
    ip_str = client_ip or "Unknown IP"
    fp_str = telemetry.device_fingerprint if (telemetry and telemetry.device_fingerprint) else "N/A"

    loc_str = "Location: Unavailable"
    if telemetry and telemetry.latitude is not None and telemetry.longitude is not None:
        acc = f" (±{telemetry.accuracy:.1f}m)" if telemetry.accuracy is not None else ""
        loc_str = f"Location: {telemetry.latitude:.6f}, {telemetry.longitude:.6f}{acc}"
    elif telemetry and telemetry.location_status:
        loc_str = f"Location: {telemetry.location_status.capitalize()}"

    start_meta = {
        "event": "EXAM_START_DEVICE",
        "browser": browser_str,
        "os": os_str,
        "device_type": telemetry.device_type if telemetry else "Desktop",
        "screen_resolution": res_str,
        "ip_address": ip_str,
        "device_fingerprint": fp_str,
        "latitude": telemetry.latitude if telemetry else None,
        "longitude": telemetry.longitude if telemetry else None,
        "accuracy": telemetry.accuracy if telemetry else None,
        "location_status": telemetry.location_status if telemetry else "unknown",
    }

    start_log = ExamProctoringLog(
        assignment_id=assignment.id,
        event_type="EXAM_START_DEVICE",
        title="Assessment Started - Device & Location Verified",
        description=f"Assessment started on {browser_str} ({os_str}), Screen: {res_str}, IP: {ip_str}. {loc_str}.",
        occurred_at=now,
        meta_data=json.dumps(start_meta)
    )
    db.add(start_log)

    # Verification Photo: Prefer direct S3 key (enterprise-scale direct upload)
    if s3_key:
        expected_prefix = f"{settings.S3_PHOTO_PREFIX}/exam_{exam.id}/user_{user_id}/"
        if s3_key.startswith(expected_prefix) or settings.S3_PHOTO_PREFIX in s3_key:
            assignment.verification_photo_url = s3_key
            photo_log = ExamProctoringLog(
                assignment_id=assignment.id,
                event_type="VERIFICATION_SNAPSHOT",
                title="Candidate Identity Photo (Start)",
                description="Identity verification webcam snapshot captured and stored directly in S3 bucket ubi-code",
                occurred_at=now,
                meta_data=json.dumps({"s3_key": s3_key, "event": "start"})
            )
            db.add(photo_log)
        else:
            logger.warning(f"[S3] Mismatched s3_key prefix '{s3_key}' for exam {exam.id}, user {user_id}")
    elif verification_photo:
        upload_res = upload_verification_photo_to_s3(
            base64_data=verification_photo,
            exam_id=exam.id,
            user_id=user_id,
            attempt_number=attempt_num,
            event_type="start"
        )
        if upload_res:
            s3_key_res, photo_url = upload_res
            assignment.verification_photo_url = s3_key_res
            photo_log = ExamProctoringLog(
                assignment_id=assignment.id,
                event_type="VERIFICATION_SNAPSHOT",
                title="Candidate Identity Photo (Start)",
                description="Identity verification webcam snapshot captured and stored in S3 bucket ubi-code",
                occurred_at=now,
                meta_data=json.dumps({"s3_key": s3_key_res, "photo_url": photo_url, "event": "start"})
            )
            db.add(photo_log)

    await db.commit()
    await db.refresh(assignment)

    # Store initial device fingerprint & metadata in Redis for session tracking
    if redis:
        try:
            device_data = {
                "fingerprint": fp_str,
                "ip": ip_str,
                "browser": browser_str,
                "os": os_str,
                "screen_resolution": res_str,
                "latitude": telemetry.latitude if telemetry else None,
                "longitude": telemetry.longitude if telemetry else None,
                "last_seen": str(now.isoformat()),
            }
            await redis.set(
                f"exam:{exam_id}:assignment:{assignment.id}:device",
                json.dumps(device_data),
                ex=86400
            )
        except Exception:
            pass

    assigned_views = await _get_assigned_question_views(db, assignment.id)
    return ExamStartResponse(
        assignment_id=assignment.id,
        exam_id=exam.id,
        status=assignment.status,
        started_at=assignment.started_at,
        deadline_at=assignment.deadline_at,
        duration_minutes=exam.duration_minutes,
        attempt_number=getattr(assignment, 'attempt_number', 1),
        verification_photo_url=get_presigned_view_url(getattr(assignment, 'verification_photo_url', None)),
        questions=assigned_views
    )


async def record_exam_resume_telemetry(
    db: AsyncSession,
    exam_id: int,
    user_id: int,
    assignment_id: int,
    telemetry: Optional[DeviceTelemetryPayload],
    client_ip: Optional[str] = None,
    redis: Optional[aioredis.Redis] = None,
    verification_photo: Optional[str] = None,
    s3_key: Optional[str] = None
) -> ResumeExamResponse:
    """
    Records device details and geolocation each time a candidate resumes, refreshes, or reconnects.
    Detects if the candidate resumed from a different device fingerprint or IP and logs a warning.
    """
    now = datetime.now(timezone.utc)
    stmt = (
        select(ExamAssignment)
        .where(
            ExamAssignment.id == assignment_id,
            ExamAssignment.user_id == user_id,
            ExamAssignment.exam_id == exam_id
        )
    )
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Exam assignment not found")

    if assignment.status != AssignmentStatus.IN_PROGRESS:
        return ResumeExamResponse(
            status="ok",
            device_switch_detected=False,
            message="Assessment is not in progress."
        )

    browser_str = telemetry.browser if (telemetry and telemetry.browser) else "Unknown Browser"
    os_str = telemetry.os if (telemetry and telemetry.os) else "Unknown OS"
    res_str = telemetry.screen_resolution if (telemetry and telemetry.screen_resolution) else "Unknown Res"
    ip_str = client_ip or "Unknown IP"
    fp_str = telemetry.device_fingerprint if (telemetry and telemetry.device_fingerprint) else "N/A"

    loc_str = "Location: Unavailable"
    if telemetry and telemetry.latitude is not None and telemetry.longitude is not None:
        acc = f" (±{telemetry.accuracy:.1f}m)" if telemetry.accuracy is not None else ""
        loc_str = f"Location: {telemetry.latitude:.6f}, {telemetry.longitude:.6f}{acc}"
    elif telemetry and telemetry.location_status:
        loc_str = f"Location: {telemetry.location_status.capitalize()}"

    device_switch_detected = False
    old_device = None

    if redis:
        try:
            stored_str = await redis.get(f"exam:{exam_id}:assignment:{assignment.id}:device")
            if stored_str:
                old_device = json.loads(stored_str)
                stored_fp = old_device.get("fingerprint")
                stored_ip = old_device.get("ip")
                # Flag if device fingerprint or IP changed
                if (stored_fp and fp_str != "N/A" and stored_fp != "N/A" and stored_fp != fp_str) or \
                   (stored_ip and ip_str != "Unknown IP" and stored_ip != "Unknown IP" and stored_ip != ip_str):
                    device_switch_detected = True
        except Exception:
            pass

    if device_switch_detected and old_device:
        switch_meta = {
            "event": "DEVICE_SWITCH_DETECTED",
            "previous_device": old_device,
            "current_device": {
                "browser": browser_str,
                "os": os_str,
                "screen_resolution": res_str,
                "ip_address": ip_str,
                "device_fingerprint": fp_str,
                "latitude": telemetry.latitude if telemetry else None,
                "longitude": telemetry.longitude if telemetry else None,
                "accuracy": telemetry.accuracy if telemetry else None,
            }
        }
        switch_log = ExamProctoringLog(
            assignment_id=assignment.id,
            event_type="DEVICE_SWITCH_DETECTED",
            title="Potential Device Switch / IP Mismatch Detected",
            description=(
                f"Candidate resumed assessment from a different device or network. "
                f"Previous: {old_device.get('browser', 'Unknown')} ({old_device.get('ip', 'Unknown IP')}) -> "
                f"Current: {browser_str} ({ip_str}). {loc_str}."
            ),
            occurred_at=now,
            meta_data=json.dumps(switch_meta)
        )
        db.add(switch_log)

    resume_meta = {
        "event": "EXAM_RESUME_DEVICE",
        "browser": browser_str,
        "os": os_str,
        "device_type": telemetry.device_type if telemetry else "Desktop",
        "screen_resolution": res_str,
        "ip_address": ip_str,
        "device_fingerprint": fp_str,
        "latitude": telemetry.latitude if telemetry else None,
        "longitude": telemetry.longitude if telemetry else None,
        "accuracy": telemetry.accuracy if telemetry else None,
        "location_status": telemetry.location_status if telemetry else "unknown",
        "device_switch_detected": device_switch_detected
    }
    resume_log = ExamProctoringLog(
        assignment_id=assignment.id,
        event_type="EXAM_RESUME_DEVICE",
        title="Assessment Resumed - Device & Location Verified",
        description=f"Assessment resumed on {browser_str} ({os_str}), Screen: {res_str}, IP: {ip_str}. {loc_str}.",
        occurred_at=now,
        meta_data=json.dumps(resume_meta)
    )
    db.add(resume_log)

    # Verification Photo on resume: Prefer direct S3 key
    if s3_key:
        expected_prefix = f"{settings.S3_PHOTO_PREFIX}/exam_{exam_id}/user_{user_id}/"
        if s3_key.startswith(expected_prefix) or settings.S3_PHOTO_PREFIX in s3_key:
            assignment.verification_photo_url = s3_key
            photo_log = ExamProctoringLog(
                assignment_id=assignment.id,
                event_type="VERIFICATION_SNAPSHOT",
                title="Candidate Identity Photo (Resume)",
                description="Identity verification webcam snapshot captured on resume and stored directly in S3 bucket ubi-code",
                occurred_at=now,
                meta_data=json.dumps({"s3_key": s3_key, "event": "resume"})
            )
            db.add(photo_log)
        else:
            logger.warning(f"[S3] Mismatched s3_key prefix '{s3_key}' on resume for exam {exam_id}, user {user_id}")
    elif verification_photo:
        upload_res = upload_verification_photo_to_s3(
            base64_data=verification_photo,
            exam_id=exam_id,
            user_id=user_id,
            attempt_number=getattr(assignment, 'attempt_number', 1),
            event_type="resume"
        )
        if upload_res:
            s3_key_res, photo_url = upload_res
            assignment.verification_photo_url = s3_key_res
            photo_log = ExamProctoringLog(
                assignment_id=assignment.id,
                event_type="VERIFICATION_SNAPSHOT",
                title="Candidate Identity Photo (Resume)",
                description="Identity verification webcam snapshot captured on resume and stored in S3 bucket ubi-code",
                occurred_at=now,
                meta_data=json.dumps({"s3_key": s3_key_res, "photo_url": photo_url, "event": "resume"})
            )
            db.add(photo_log)

    await db.commit()

    if redis:
        try:
            device_data = {
                "fingerprint": fp_str,
                "ip": ip_str,
                "browser": browser_str,
                "os": os_str,
                "screen_resolution": res_str,
                "latitude": telemetry.latitude if telemetry else None,
                "longitude": telemetry.longitude if telemetry else None,
                "last_seen": str(now.isoformat()),
            }
            await redis.set(
                f"exam:{exam_id}:assignment:{assignment.id}:device",
                json.dumps(device_data),
                ex=86400
            )
        except Exception:
            pass

    return ResumeExamResponse(
        status="ok",
        device_switch_detected=device_switch_detected,
        verification_photo_url=get_presigned_view_url(getattr(assignment, 'verification_photo_url', None)),
        message="Device switch recorded" if device_switch_detected else "Assessment resumed telemetry logged."
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

    # 1. Fetch assignment (prioritize active assignment / latest attempt)
    assign_stmt = (
        select(ExamAssignment)
        .where(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.user_id == user_id,
            ExamAssignment.is_active == True
        )
        .order_by(desc(ExamAssignment.attempt_number))
    )
    assignment = (await db.execute(assign_stmt)).scalars().first()
    if not assignment:
        assign_stmt_fallback = (
            select(ExamAssignment)
            .where(
                ExamAssignment.exam_id == exam_id,
                ExamAssignment.user_id == user_id
            )
            .order_by(desc(ExamAssignment.attempt_number))
        )
        assignment = (await db.execute(assign_stmt_fallback)).scalars().first()
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


async def lock_assigned_question(
    db: AsyncSession,
    exam_id: int,
    question_id: int,
    user_id: int
) -> dict:
    """
    Explicitly locks a timed MCQ when the candidate advances to the next question or when its timer expires.
    Sets assigned_questions.is_locked = True, adjusts question_deadline_at to now,
    and also updates mcq_responses.is_locked = True if a response exists.
    """
    now = datetime.now(timezone.utc)

    # 1. Fetch assignment (prioritize active assignment / latest attempt)
    assign_stmt = (
        select(ExamAssignment)
        .where(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.user_id == user_id,
            ExamAssignment.is_active == True
        )
        .order_by(desc(ExamAssignment.attempt_number))
    )
    assignment = (await db.execute(assign_stmt)).scalars().first()
    if not assignment:
        assign_stmt_fallback = (
            select(ExamAssignment)
            .where(
                ExamAssignment.exam_id == exam_id,
                ExamAssignment.user_id == user_id
            )
            .order_by(desc(ExamAssignment.attempt_number))
        )
        assignment = (await db.execute(assign_stmt_fallback)).scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Exam assignment not found")

    # 2. Fetch assigned question
    stmt = select(AssignedQuestion).where(
        AssignedQuestion.assignment_id == assignment.id,
        AssignedQuestion.question_id == question_id
    )
    assigned_q = (await db.execute(stmt)).scalar_one_or_none()
    if not assigned_q:
        raise HTTPException(status_code=404, detail="Question is not assigned to this exam")

    assigned_q.is_locked = True
    if assigned_q.question_deadline_at is None or assigned_q.question_deadline_at > now:
        assigned_q.question_deadline_at = now

    # Also lock mcq_responses row if present
    from backend.app.models.submission import MCQResponse
    stmt_resp = select(MCQResponse).where(
        MCQResponse.assignment_id == assignment.id,
        MCQResponse.question_id == question_id
    )
    mcq_resp = (await db.execute(stmt_resp)).scalar_one_or_none()
    if mcq_resp:
        mcq_resp.is_locked = True

    await db.commit()
    return {"locked": True, "question_id": question_id}


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
        .where(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.user_id == user_id,
            ExamAssignment.is_active == True
        )
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
    # Sync assignment questions if admin updated pool/pattern
    if assignment.status in [AssignmentStatus.NOT_STARTED, AssignmentStatus.IN_PROGRESS]:
        await sync_unsubmitted_assignments_for_exam(db, exam_id)

    assigned_views = await _get_assigned_question_views(db, assignment.id)

    return MyQuestionsResponse(
        assignment_id=assignment.id,
        exam_id=exam.id,
        exam_title=exam.title,
        status=assignment.status,
        started_at=assignment.started_at,
        deadline_at=assignment.deadline_at,
        duration_minutes=exam.duration_minutes,
        attempt_number=getattr(assignment, 'attempt_number', 1),
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
        .where(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.user_id == user_id,
            ExamAssignment.is_active == True
        )
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
            is_locked = (mcq_resp.is_locked if mcq_resp else False) or assigned_q.is_locked

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

    raw_score = round(sum(b.final_score for b in breakdown), 2) if breakdown else None
    max_score = round(sum(b.difficulty_weight for b in breakdown), 2) if breakdown else None

    return ExamResultDetail(
        assignment_id=assignment.id,
        exam_id=exam.id,
        exam_title=exam.title,
        student_name=user.name,
        roll_no=user.roll_no,
        status=assignment.status.value,
        total_score=result.total_score if result else 0.0,
        raw_score=raw_score,
        max_score=max_score,
        rank=result.rank if result else None,
        submitted_at=assignment.submitted_at,
        question_scores=breakdown
    )


async def get_exam_leaderboard_paginated(
    db: AsyncSession,
    exam_id: int,
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "rank",
    sort_dir: str = "asc",
    search: Optional[str] = None,
    college: Optional[str] = None,
    candidate_group: Optional[str] = None,
    status: Optional[str] = None,
) -> LeaderboardResponse:
    """
    Returns paginated leaderboard and proctoring/scoring metrics for an exam (admin only).
    Uses a single SQLAlchemy query with grouped subqueries to eliminate N+1 overhead.
    """
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    page = max(1, page)
    page_size = max(1, min(page_size, 100))

    total_coding_cfg = (exam.easy_count or 0) + (exam.medium_count or 0) + (exam.hard_count or 0)
    total_mcq_cfg = (exam.mcq_count or 0)

    # 1. Grouped subquery for proctoring violations
    violations_subq = (
        select(
            ExamProctoringLog.assignment_id.label("assignment_id"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type).not_in([
                    "EXAM_START_DEVICE", "EXAM_RESUME_DEVICE", "VERIFICATION_SNAPSHOT",
                    "ADMIN_FRESH_RESTART_ARCHIVED", "ADMIN_FRESH_RESTART_GRANTED", "START", "RESUME"
                ])
            ).label("total_violation_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type) == "TAB_SWITCH"
            ).label("tab_switch_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type) == "FULLSCREEN_EXIT"
            ).label("fullscreen_exit_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type).in_(["WINDOW_BLUR", "BLUR"])
            ).label("blur_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type).in_(["CLIPBOARD_BLOCK", "PASTE_ATTEMPT", "COPY_ATTEMPT", "CLIPBOARD"])
            ).label("clipboard_block_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type).in_(["DEVTOOLS_ATTEMPT", "DEVTOOLS_SHORTCUT", "DEVTOOLS_DOCK_OPENED", "PRINT_SAVE_SHORTCUT"])
            ).label("devtools_attempt_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type).in_(["NAVIGATION_BLOCK", "NAVIGATION_BLOCKED"])
            ).label("navigation_block_count"),
        )
        .group_by(ExamProctoringLog.assignment_id)
        .subquery("violations_subq")
    )

    # 2. Coding questions solved subquery (correctness == 1.0 on final submission)
    coding_solved_subq = (
        select(
            Submission.assignment_id.label("assignment_id"),
            func.count(func.distinct(Submission.question_id)).label("questions_solved_count")
        )
        .where(
            Submission.is_final == True,
            Submission.total_test_cases > 0,
            Submission.test_cases_passed == Submission.total_test_cases
        )
        .group_by(Submission.assignment_id)
        .subquery("coding_solved_subq")
    )

    # 3. MCQ questions answered correctly subquery
    mcq_correct_subq = (
        select(
            MCQResponse.assignment_id.label("assignment_id"),
            func.count(func.distinct(MCQResponse.question_id)).label("mcq_correct_count")
        )
        .where(MCQResponse.is_correct == True)
        .group_by(MCQResponse.assignment_id)
        .subquery("mcq_correct_subq")
    )

    # 4. Assigned question counts by type subquery
    assigned_counts_subq = (
        select(
            AssignedQuestion.assignment_id.label("assignment_id"),
            func.count(func.distinct(case((Question.question_type == "coding", AssignedQuestion.question_id), else_=None))).label("total_coding_questions"),
            func.count(func.distinct(case((Question.question_type == "mcq", AssignedQuestion.question_id), else_=None))).label("total_mcq_questions"),
        )
        .join(Question, AssignedQuestion.question_id == Question.id)
        .group_by(AssignedQuestion.assignment_id)
        .subquery("assigned_counts_subq")
    )

    filters = [
        ExamAssignment.exam_id == exam_id,
        or_(ExamAssignment.is_active == True, ExamAssignment.is_active.is_(None))
    ]

    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                User.name.ilike(term),
                User.email.ilike(term),
                User.roll_no.ilike(term)
            )
        )

    if college and college.strip():
        filters.append(func.lower(User.college) == college.strip().lower())

    if candidate_group and candidate_group.strip():
        filters.append(func.lower(User.candidate_group) == candidate_group.strip().lower())

    if status and status.strip():
        filters.append(func.lower(func.cast(ExamAssignment.status, String)) == status.strip().lower())

    # Total Count for Pagination
    count_stmt = (
        select(func.count(ExamAssignment.id))
        .join(User, ExamAssignment.user_id == User.id)
        .where(*filters)
    )
    total_count = (await db.execute(count_stmt)).scalar() or 0
    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 0
    offset = (page - 1) * page_size

    order_clauses = []
    if sort_by == "score":
        order_clauses.append(ExamResult.total_score.asc().nullslast() if sort_dir == "asc" else ExamResult.total_score.desc().nullslast())
        order_clauses.append((ExamAssignment.submitted_at - ExamAssignment.started_at).asc().nullslast())
        order_clauses.append(ExamAssignment.submitted_at.asc().nullslast())
    elif sort_by == "name":
        order_clauses.append(User.name.asc() if sort_dir == "asc" else User.name.desc())
    elif sort_by == "violations":
        violation_cnt_col = func.coalesce(violations_subq.c.total_violation_count, 0)
        order_clauses.append(violation_cnt_col.asc() if sort_dir == "asc" else violation_cnt_col.desc())
        order_clauses.append(ExamResult.rank.asc().nullslast())
    else:  # default "rank"
        order_clauses.append(ExamResult.rank.asc().nullslast() if sort_dir == "asc" else ExamResult.rank.desc().nullslast())
        order_clauses.append((ExamAssignment.submitted_at - ExamAssignment.started_at).asc().nullslast())
        order_clauses.append(ExamAssignment.submitted_at.asc().nullslast())
    order_clauses.append(ExamAssignment.id.asc())

    stmt = (
        select(
            ExamAssignment,
            User,
            ExamResult.total_score.label("res_total_score"),
            ExamResult.rank.label("res_rank"),
            func.coalesce(coding_solved_subq.c.questions_solved_count, 0).label("solved_coding"),
            func.coalesce(mcq_correct_subq.c.mcq_correct_count, 0).label("correct_mcq"),
            assigned_counts_subq.c.total_coding_questions.label("assigned_coding"),
            assigned_counts_subq.c.total_mcq_questions.label("assigned_mcq"),
            func.coalesce(violations_subq.c.total_violation_count, 0).label("v_total"),
            func.coalesce(violations_subq.c.tab_switch_count, 0).label("v_tab"),
            func.coalesce(violations_subq.c.fullscreen_exit_count, 0).label("v_fs"),
            func.coalesce(violations_subq.c.blur_count, 0).label("v_blur"),
            func.coalesce(violations_subq.c.clipboard_block_count, 0).label("v_clip"),
            func.coalesce(violations_subq.c.devtools_attempt_count, 0).label("v_dev"),
            func.coalesce(violations_subq.c.navigation_block_count, 0).label("v_nav"),
        )
        .join(User, ExamAssignment.user_id == User.id)
        .outerjoin(ExamResult, ExamAssignment.id == ExamResult.assignment_id)
        .outerjoin(violations_subq, ExamAssignment.id == violations_subq.c.assignment_id)
        .outerjoin(coding_solved_subq, ExamAssignment.id == coding_solved_subq.c.assignment_id)
        .outerjoin(mcq_correct_subq, ExamAssignment.id == mcq_correct_subq.c.assignment_id)
        .outerjoin(assigned_counts_subq, ExamAssignment.id == assigned_counts_subq.c.assignment_id)
        .where(*filters)
        .order_by(*order_clauses)
        .offset(offset)
        .limit(page_size)
    )

    rows = (await db.execute(stmt)).all()

    items: List[LeaderboardEntry] = []
    for row in rows:
        assign = row[0]
        user = row[1]
        res_score = row[2]
        res_rank = row[3]
        solved_coding = int(row[4] or 0)
        correct_mcq = int(row[5] or 0)
        assigned_coding = row[6]
        assigned_mcq = row[7]
        v_total = int(row[8] or 0)
        v_tab = int(row[9] or 0)
        v_fs = int(row[10] or 0)
        v_blur = int(row[11] or 0)
        v_clip = int(row[12] or 0)
        v_dev = int(row[13] or 0)
        v_nav = int(row[14] or 0)

        total_coding = assigned_coding if (assigned_coding is not None and assigned_coding > 0) else total_coding_cfg
        total_mcq = assigned_mcq if (assigned_mcq is not None and assigned_mcq > 0) else total_mcq_cfg

        time_taken = None
        if assign.submitted_at and assign.started_at:
            time_taken = max(0.0, (assign.submitted_at - assign.started_at).total_seconds())

        status_val = assign.status.value if hasattr(assign.status, "value") else str(assign.status)

        items.append(LeaderboardEntry(
            assignment_id=assign.id,
            user_id=user.id,
            name=user.name,
            student_name=user.name,
            email=user.email,
            roll_no=user.roll_no,
            college=user.college,
            candidate_group=user.candidate_group,
            status=status_val,
            started_at=assign.started_at,
            submitted_at=assign.submitted_at,
            time_taken_seconds=time_taken,
            total_score=float(res_score) if res_score is not None else None,
            rank=int(res_rank) if res_rank is not None else None,
            questions_solved_count=solved_coding,
            total_coding_questions=total_coding,
            mcq_correct_count=correct_mcq,
            total_mcq_questions=total_mcq,
            total_violation_count=v_total,
            tab_switch_count=v_tab,
            fullscreen_exit_count=v_fs,
            blur_count=v_blur,
            clipboard_block_count=v_clip,
            devtools_attempt_count=v_dev,
            navigation_block_count=v_nav,
        ))

    return LeaderboardResponse(
        exam_id=exam.id,
        exam_title=exam.title,
        total_count=total_count,
        total_pages=total_pages,
        current_page=page,
        page_size=page_size,
        items=items,
    )


async def export_exam_leaderboard_excel(
    db: AsyncSession,
    exam_id: int,
    sort_by: str = "rank",
    sort_dir: str = "asc",
    search: Optional[str] = None,
    college: Optional[str] = None,
    candidate_group: Optional[str] = None,
    status: Optional[str] = None,
) -> StreamingResponse:
    """
    Generates and streams a styled .xlsx report for the filtered exam leaderboard (admin only).
    """
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    total_coding_cfg = (exam.easy_count or 0) + (exam.medium_count or 0) + (exam.hard_count or 0)
    total_mcq_cfg = (exam.mcq_count or 0)

    violations_subq = (
        select(
            ExamProctoringLog.assignment_id.label("assignment_id"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type).not_in([
                    "EXAM_START_DEVICE", "EXAM_RESUME_DEVICE", "VERIFICATION_SNAPSHOT",
                    "ADMIN_FRESH_RESTART_ARCHIVED", "ADMIN_FRESH_RESTART_GRANTED", "START", "RESUME"
                ])
            ).label("total_violation_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type) == "TAB_SWITCH"
            ).label("tab_switch_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type) == "FULLSCREEN_EXIT"
            ).label("fullscreen_exit_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type).in_(["WINDOW_BLUR", "BLUR"])
            ).label("blur_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type).in_(["CLIPBOARD_BLOCK", "PASTE_ATTEMPT", "COPY_ATTEMPT", "CLIPBOARD"])
            ).label("clipboard_block_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type).in_(["DEVTOOLS_ATTEMPT", "DEVTOOLS_SHORTCUT", "DEVTOOLS_DOCK_OPENED", "PRINT_SAVE_SHORTCUT"])
            ).label("devtools_attempt_count"),
            func.count().filter(
                func.upper(ExamProctoringLog.event_type).in_(["NAVIGATION_BLOCK", "NAVIGATION_BLOCKED"])
            ).label("navigation_block_count"),
        )
        .group_by(ExamProctoringLog.assignment_id)
        .subquery("violations_subq")
    )

    coding_solved_subq = (
        select(
            Submission.assignment_id.label("assignment_id"),
            func.count(func.distinct(Submission.question_id)).label("questions_solved_count")
        )
        .where(
            Submission.is_final == True,
            Submission.total_test_cases > 0,
            Submission.test_cases_passed == Submission.total_test_cases
        )
        .group_by(Submission.assignment_id)
        .subquery("coding_solved_subq")
    )

    mcq_correct_subq = (
        select(
            MCQResponse.assignment_id.label("assignment_id"),
            func.count(func.distinct(MCQResponse.question_id)).label("mcq_correct_count")
        )
        .where(MCQResponse.is_correct == True)
        .group_by(MCQResponse.assignment_id)
        .subquery("mcq_correct_subq")
    )

    assigned_counts_subq = (
        select(
            AssignedQuestion.assignment_id.label("assignment_id"),
            func.count(func.distinct(case((Question.question_type == "coding", AssignedQuestion.question_id), else_=None))).label("total_coding_questions"),
            func.count(func.distinct(case((Question.question_type == "mcq", AssignedQuestion.question_id), else_=None))).label("total_mcq_questions"),
        )
        .join(Question, AssignedQuestion.question_id == Question.id)
        .group_by(AssignedQuestion.assignment_id)
        .subquery("assigned_counts_subq")
    )

    filters = [
        ExamAssignment.exam_id == exam_id,
        or_(ExamAssignment.is_active == True, ExamAssignment.is_active.is_(None))
    ]

    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                User.name.ilike(term),
                User.email.ilike(term),
                User.roll_no.ilike(term)
            )
        )

    if college and college.strip():
        filters.append(func.lower(User.college) == college.strip().lower())

    if candidate_group and candidate_group.strip():
        filters.append(func.lower(User.candidate_group) == candidate_group.strip().lower())

    if status and status.strip():
        filters.append(func.lower(func.cast(ExamAssignment.status, String)) == status.strip().lower())

    order_clauses = []
    if sort_by == "score":
        order_clauses.append(ExamResult.total_score.asc().nullslast() if sort_dir == "asc" else ExamResult.total_score.desc().nullslast())
        order_clauses.append((ExamAssignment.submitted_at - ExamAssignment.started_at).asc().nullslast())
        order_clauses.append(ExamAssignment.submitted_at.asc().nullslast())
    elif sort_by == "name":
        order_clauses.append(User.name.asc() if sort_dir == "asc" else User.name.desc())
    elif sort_by == "violations":
        violation_cnt_col = func.coalesce(violations_subq.c.total_violation_count, 0)
        order_clauses.append(violation_cnt_col.asc() if sort_dir == "asc" else violation_cnt_col.desc())
        order_clauses.append(ExamResult.rank.asc().nullslast())
    else:
        order_clauses.append(ExamResult.rank.asc().nullslast() if sort_dir == "asc" else ExamResult.rank.desc().nullslast())
        order_clauses.append((ExamAssignment.submitted_at - ExamAssignment.started_at).asc().nullslast())
        order_clauses.append(ExamAssignment.submitted_at.asc().nullslast())
    order_clauses.append(ExamAssignment.id.asc())

    stmt = (
        select(
            ExamAssignment,
            User,
            ExamResult.total_score.label("res_total_score"),
            ExamResult.rank.label("res_rank"),
            func.coalesce(coding_solved_subq.c.questions_solved_count, 0).label("solved_coding"),
            func.coalesce(mcq_correct_subq.c.mcq_correct_count, 0).label("correct_mcq"),
            assigned_counts_subq.c.total_coding_questions.label("assigned_coding"),
            assigned_counts_subq.c.total_mcq_questions.label("assigned_mcq"),
            func.coalesce(violations_subq.c.total_violation_count, 0).label("v_total"),
            func.coalesce(violations_subq.c.tab_switch_count, 0).label("v_tab"),
            func.coalesce(violations_subq.c.fullscreen_exit_count, 0).label("v_fs"),
            func.coalesce(violations_subq.c.blur_count, 0).label("v_blur"),
            func.coalesce(violations_subq.c.clipboard_block_count, 0).label("v_clip"),
            func.coalesce(violations_subq.c.devtools_attempt_count, 0).label("v_dev"),
            func.coalesce(violations_subq.c.navigation_block_count, 0).label("v_nav"),
        )
        .join(User, ExamAssignment.user_id == User.id)
        .outerjoin(ExamResult, ExamAssignment.id == ExamResult.assignment_id)
        .outerjoin(violations_subq, ExamAssignment.id == violations_subq.c.assignment_id)
        .outerjoin(coding_solved_subq, ExamAssignment.id == coding_solved_subq.c.assignment_id)
        .outerjoin(mcq_correct_subq, ExamAssignment.id == mcq_correct_subq.c.assignment_id)
        .outerjoin(assigned_counts_subq, ExamAssignment.id == assigned_counts_subq.c.assignment_id)
        .where(*filters)
        .order_by(*order_clauses)
    )

    rows = (await db.execute(stmt)).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Leaderboard Results"

    headers = [
        "Rank",
        "Name",
        "Email",
        "Roll No",
        "College",
        "Group",
        "Status",
        "Total Score",
        "Coding Solved",
        "MCQ Correct",
        "Time Taken",
        "Started At",
        "Submitted At",
        "Total Violations",
        "Tab Switches",
        "Fullscreen Exits",
        "Window Blurs",
        "Clipboard Blocks",
        "DevTools Attempts",
        "Navigation Blocks"
    ]

    header_fill = PatternFill(start_color="191B82", end_color="191B82", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0")
    )
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")

    ws.append(headers)
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = thin_border
    ws.row_dimensions[1].height = 28

    row_font = Font(name="Segoe UI", size=10)

    for row_idx, row in enumerate(rows, start=2):
        assign = row[0]
        user = row[1]
        res_score = row[2]
        res_rank = row[3]
        solved_coding = int(row[4] or 0)
        correct_mcq = int(row[5] or 0)
        assigned_coding = row[6]
        assigned_mcq = row[7]
        v_total = int(row[8] or 0)
        v_tab = int(row[9] or 0)
        v_fs = int(row[10] or 0)
        v_blur = int(row[11] or 0)
        v_clip = int(row[12] or 0)
        v_dev = int(row[13] or 0)
        v_nav = int(row[14] or 0)

        total_coding = assigned_coding if (assigned_coding is not None and assigned_coding > 0) else total_coding_cfg
        total_mcq = assigned_mcq if (assigned_mcq is not None and assigned_mcq > 0) else total_mcq_cfg

        time_taken_str = "-"
        if assign.submitted_at and assign.started_at:
            secs = max(0, int((assign.submitted_at - assign.started_at).total_seconds()))
            m, s = divmod(secs, 60)
            h, m = divmod(m, 60)
            time_taken_str = f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"

        started_str = assign.started_at.strftime("%Y-%m-%d %H:%M:%S") if assign.started_at else "-"
        submitted_str = assign.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if assign.submitted_at else "-"
        status_str = assign.status.value if hasattr(assign.status, "value") else str(assign.status)

        row_vals = [
            res_rank if res_rank is not None else "-",
            user.name,
            user.email,
            user.roll_no or "-",
            user.college or "-",
            user.candidate_group or "-",
            status_str.upper(),
            round(float(res_score), 2) if res_score is not None else "-",
            f"{solved_coding}/{total_coding}",
            f"{correct_mcq}/{total_mcq}",
            time_taken_str,
            started_str,
            submitted_str,
            v_total,
            v_tab,
            v_fs,
            v_blur,
            v_clip,
            v_dev,
            v_nav
        ]

        ws.append(row_vals)
        ws.row_dimensions[row_idx].height = 20

        for col_idx in range(1, len(row_vals) + 1):
            c = ws.cell(row=row_idx, column=col_idx)
            c.font = row_font
            c.border = thin_border
            if col_idx in [1, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]:
                c.alignment = center_align
            else:
                c.alignment = left_align

    # Freeze the header row
    ws.freeze_panes = "A2"

    # Enable autofilter across data range
    ws.auto_filter.ref = ws.dimensions

    # Auto-size columns reasonably
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    clean_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', exam.title.strip())[:40] or "exam"
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    filename = f"{clean_title}_results_{date_str}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


async def get_exam_leaderboard(db: AsyncSession, exam_id: int) -> List[LeaderboardEntry]:
    """
    Returns leaderboard for an exam, ordered by rank ascending (admin only).
    Maintained for backward compatibility.
    """
    res = await get_exam_leaderboard_paginated(db=db, exam_id=exam_id, page=1, page_size=1000)
    return res.items


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

    # 3. Fetch Exam details for difficulty weights
    stmt_exam = select(Exam).where(Exam.id == exam_id)
    exam = (await db.execute(stmt_exam)).scalar_one_or_none()

    # 4. Fetch QuestionScores aggregated (raw_score and max_score)
    scores_stmt = (
        select(
            QuestionScore.assignment_id,
            func.coalesce(func.sum(QuestionScore.final_score), 0.0).label("raw_score"),
            func.coalesce(func.sum(QuestionScore.difficulty_weight), 0.0).label("max_score")
        )
        .join(ExamAssignment, QuestionScore.assignment_id == ExamAssignment.id)
        .where(ExamAssignment.exam_id == exam_id)
        .group_by(QuestionScore.assignment_id)
    )
    scores_res = (await db.execute(scores_stmt)).all()
    scores_map = {r[0]: (float(r[1]), float(r[2])) for r in scores_res}

    # 5. Fetch assigned questions to compute max_score for every candidate
    assigned_stmt = (
        select(
            AssignedQuestion.assignment_id,
            AssignedQuestion.difficulty,
            Question.question_type
        )
        .join(Question, AssignedQuestion.question_id == Question.id)
        .join(ExamAssignment, AssignedQuestion.assignment_id == ExamAssignment.id)
        .where(ExamAssignment.exam_id == exam_id)
    )
    assigned_res = (await db.execute(assigned_stmt)).all()
    assigned_max_map = {}
    mcq_w = float(getattr(exam, 'mcq_weight', 2.0) if exam and getattr(exam, 'mcq_weight', None) is not None else 2.0)
    for a_id, diff, q_type in assigned_res:
        if a_id not in assigned_max_map:
            assigned_max_map[a_id] = 0.0
        if q_type == "mcq":
            assigned_max_map[a_id] += mcq_w
        else:
            assigned_max_map[a_id] += calculate_difficulty_weight(exam, diff) if exam else 10.0

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

        # Count proctoring flags / infractions (PURE ANTI-CHEAT ONLY, excluding device audit logs)
        flags_stmt = select(func.count(ExamProctoringLog.id)).where(
            ExamProctoringLog.assignment_id == assign.id,
            ExamProctoringLog.event_type.not_in(["EXAM_START_DEVICE", "EXAM_RESUME_DEVICE"])
        )
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

        raw_s = None
        max_s = assigned_max_map.get(assign.id, None)
        cur_s = result.total_score if result else None

        if assign.id in scores_map:
            raw_s, computed_max = scores_map[assign.id]
            if computed_max > 0:
                max_s = computed_max
            if cur_s is None and max_s and max_s > 0:
                cur_s = round((raw_s / max_s) * 100.0, 1)
        elif result and max_s:
            raw_s = round((result.total_score / 100.0) * max_s, 1)

        monitoring_list.append(MonitoringStudentView(
            assignment_id=assign.id,
            user_id=user.id,
            name=user.name,
            email=user.email,
            roll_no=user.roll_no,
            college=user.college,
            candidate_group=user.candidate_group,
            status=assign.status.value,
            attempt_number=getattr(assign, 'attempt_number', 1),
            is_active=getattr(assign, 'is_active', True),
            reset_by_admin=getattr(assign, 'reset_by_admin', False),
            reset_reason=getattr(assign, 'reset_reason', None),
            started_at=assign.started_at,
            deadline_at=assign.deadline_at,
            submitted_at=assign.submitted_at,
            verification_photo_url=get_presigned_view_url(getattr(assign, 'verification_photo_url', None)),
            time_remaining_sec=remaining_sec,
            submissions_count=submission_count,
            flags_count=flags_count,
            current_score=cur_s,
            raw_score=raw_s,
            max_score=max_s,
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

    # Filter actual cheating/infraction flags (exclude normal informational device audit events)
    INFRACTION_EVENT_TYPES = {
        "TAB_SWITCH", "WINDOW_BLUR", "FULLSCREEN_EXIT", "PASTE_ATTEMPT",
        "COPY_ATTEMPT", "DEVTOOLS_SHORTCUT", "PRINT_SAVE_SHORTCUT",
        "DEVTOOLS_DOCK_OPENED", "MOUSE_LEAVE", "CONTEXT_MENU",
        "DEVICE_SWITCH_DETECTED", "NO_FACE", "MULTIPLE_FACES"
    }
    infraction_rows = [l for l in log_rows if l.event_type in INFRACTION_EVENT_TYPES]
    total_flags = len(infraction_rows)

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

            diff_w = q_score.difficulty_weight if q_score else calculate_difficulty_weight(exam, assigned_q.difficulty)
            corr = q_score.correctness if q_score else (float(sub.test_cases_passed) / float(sub.total_test_cases) if sub and sub.total_test_cases else 0.0)
            fin_score = q_score.final_score if q_score else round(diff_w * corr, 2)

            question_dossiers.append(CandidateQuestionSubmissionDossier(
                question_id=q.id,
                question_title=q.title,
                difficulty=assigned_q.difficulty.value,
                order_index=assigned_q.order_index,
                correctness=corr,
                difficulty_weight=diff_w,
                final_score=fin_score,
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

    raw_score = round(sum(qd.final_score for qd in question_dossiers), 2)
    max_score = round(sum(qd.difficulty_weight for qd in question_dossiers), 2)
    computed_percentage = round((raw_score / max_score) * 100.0, 2) if max_score > 0 else 0.0
    total_score = result.total_score if result else (computed_percentage if assignment.status in (AssignmentStatus.SUBMITTED, AssignmentStatus.AUTO_SUBMITTED) else None)

    attempts_stmt = (
        select(ExamAssignment)
        .where(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.user_id == user.id
        )
        .order_by(ExamAssignment.attempt_number.asc())
    )
    attempts_records = (await db.execute(attempts_stmt)).scalars().all()
    available_attempts = [
        CandidateAttemptItem(
            assignment_id=att.id,
            attempt_number=att.attempt_number,
            is_active=att.is_active,
            status=att.status.value if hasattr(att.status, "value") else str(att.status)
        )
        for att in attempts_records
    ]

    enriched_logs = []
    for l in log_rows:
        log_item = ProctoringLogItem.model_validate(l)
        if log_item.meta_data:
            try:
                meta_dict = json.loads(log_item.meta_data)
                if isinstance(meta_dict, dict):
                    photo_key = meta_dict.get("photo_url") or meta_dict.get("s3_key")
                    if photo_key:
                        presigned = get_presigned_view_url(photo_key)
                        if presigned:
                            meta_dict["photo_url"] = presigned
                            log_item.meta_data = json.dumps(meta_dict)
            except Exception:
                pass
        enriched_logs.append(log_item)

    return CandidateDossierResponse(
        assignment_id=assignment.id,
        exam_id=exam.id,
        exam_title=exam.title,
        user_id=user.id,
        student_name=user.name,
        email=user.email,
        roll_no=user.roll_no,
        status=assignment.status.value,
        attempt_number=getattr(assignment, 'attempt_number', 1),
        is_active=getattr(assignment, 'is_active', True),
        reset_by_admin=getattr(assignment, 'reset_by_admin', False),
        reset_reason=getattr(assignment, 'reset_reason', None),
        available_attempts=available_attempts,
        verification_photo_url=get_presigned_view_url(getattr(assignment, 'verification_photo_url', None)),
        started_at=assignment.started_at,
        submitted_at=assignment.submitted_at,
        total_time_sec=round(total_time_sec, 1) if total_time_sec is not None else None,
        total_score=total_score,
        raw_score=raw_score,
        max_score=max_score,
        rank=result.rank if result else None,
        total_flags=total_flags,
        flag_counts_by_type=flag_counts_by_type,
        integrity_status=integrity_status,
        proctoring_logs=enriched_logs,
        questions=question_dossiers,
        network_status=network_status,
        disconnect_incidents_count=disconnect_incidents_count,
        total_offline_seconds=total_offline_seconds,
        network_incidents=[NetworkIncidentItem.model_validate(inc) for inc in incident_rows]
    )


async def fresh_restart_candidate_exam(
    db: AsyncSession,
    exam_id: int,
    assignment_id: int,
    admin_user: User,
    reason: Optional[str] = None
) -> FreshRestartResponse:
    """
    Manually restarts an exam attempt for a candidate in genuine emergency/technical cases.
    - Archives the previous attempt by marking is_active = False (preserving all submissions, logs, scores).
    - Issues a brand-new ExamAssignment (attempt_number = prev + 1, is_active = True).
    - Randomly draws a fresh set of questions from the exam pool following dynamic quotas.
    - Resets timer to full duration, with status NOT_STARTED and admin waiver so late entry is permitted.
    - Logs audit proctoring events on both previous and new assignments.
    """
    now = datetime.now(timezone.utc)

    # 1. Fetch current assignment
    stmt = (
        select(ExamAssignment, Exam, User)
        .join(Exam, ExamAssignment.exam_id == Exam.id)
        .join(User, ExamAssignment.user_id == User.id)
        .where(
            ExamAssignment.id == assignment_id,
            ExamAssignment.exam_id == exam_id
        )
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Candidate assignment not found for this exam")

    assignment, exam, user = row

    # 2. Deactivate previous assignment (preserves all submissions, scores, logs)
    assignment.is_active = False

    # 3. Next attempt number
    next_attempt = assignment.attempt_number + 1

    # 4. Draw brand-new question set
    final_assigned_q_ids = await _draw_exam_questions(db, exam)

    # 5. Create fresh new assignment with full duration
    new_assignment = ExamAssignment(
        exam_id=exam.id,
        user_id=user.id,
        attempt_number=next_attempt,
        is_active=True,
        reset_by_admin=True,
        reset_reason=reason or f"Fresh restart granted by administrator {admin_user.email}",
        status=AssignmentStatus.NOT_STARTED,
        started_at=None,
        deadline_at=None,
        submitted_at=None
    )
    db.add(new_assignment)
    await db.flush()

    # 6. Link newly drawn questions to new assignment
    for idx, q_id in enumerate(final_assigned_q_ids):
        q_stmt = select(Question.difficulty).where(Question.id == q_id)
        q_diff = (await db.execute(q_stmt)).scalar_one_or_none() or QuestionDifficulty.EASY
        assigned_q = AssignedQuestion(
            assignment_id=new_assignment.id,
            question_id=q_id,
            difficulty=q_diff,
            order_index=idx
        )
        db.add(assigned_q)

    # 7. Add proctoring audit log on both old and new assignments
    old_log = ExamProctoringLog(
        assignment_id=assignment.id,
        event_type="ADMIN_FRESH_RESTART_ARCHIVED",
        title="Attempt Archived via Admin Fresh Restart",
        description=f"Attempt #{assignment.attempt_number} was archived by admin {admin_user.email}. Reason: {reason or 'Not specified'}",
        occurred_at=now
    )
    db.add(old_log)

    new_log = ExamProctoringLog(
        assignment_id=new_assignment.id,
        event_type="ADMIN_FRESH_RESTART_GRANTED",
        title="Fresh Restart Issued by Admin",
        description=f"Attempt #{next_attempt} initialized with fresh randomized question pool and full time allowance by admin {admin_user.email}. Reason: {reason or 'Not specified'}",
        occurred_at=now
    )
    db.add(new_log)

    await db.commit()

    return FreshRestartResponse(
        old_assignment_id=assignment.id,
        new_assignment_id=new_assignment.id,
        user_id=user.id,
        exam_id=exam.id,
        attempt_number=next_attempt,
        status="not_started",
        message=f"Successfully issued Fresh Restart (Attempt #{next_attempt}) for candidate {user.name}."
    )
