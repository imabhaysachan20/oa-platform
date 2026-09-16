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
from backend.app.models.question import Question, QuestionDifficulty
from backend.app.models.submission import Submission
from backend.app.models.user import User
from backend.app.models.result import ExamResult, QuestionScore
from backend.app.schemas.question import StudentQuestionView
from backend.app.schemas.exam import (
    ExamStartResponse,
    MyQuestionsResponse,
    LeaderboardEntry,
    ExamResultDetail,
    QuestionScoreBreakdown,
    MonitoringStudentView
)
from backend.app.services.scoring_service import compute_and_save_exam_scores


async def start_exam_for_student(
    db: AsyncSession,
    exam_id: int,
    user_id: int
) -> ExamStartResponse:
    """
    Idempotently starts the exam for a student:
    - If already assigned, returns existing assignment and locked questions.
    - If not assigned, randomly picks 1 easy + 2 medium from exam_question_pool,
      sets started_at and deadline_at = started_at + duration_minutes.
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

    # 2. Check for existing assignment
    stmt_assign = (
        select(ExamAssignment)
        .where(ExamAssignment.exam_id == exam_id, ExamAssignment.user_id == user_id)
    )
    assignment = (await db.execute(stmt_assign)).scalar_one_or_none()

    if assignment:
        # If already started or completed, return existing locked questions
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

    # 3. Create new assignment with random questions (1 easy + 2 medium)
    # Easy question selection
    stmt_easy = (
        select(ExamQuestionPool.question_id)
        .where(
            ExamQuestionPool.exam_id == exam_id,
            ExamQuestionPool.difficulty == QuestionDifficulty.EASY
        )
        .order_by(func.random())
        .limit(1)
    )
    easy_q_ids = (await db.execute(stmt_easy)).scalars().all()

    # Medium question selection
    stmt_med = (
        select(ExamQuestionPool.question_id)
        .where(
            ExamQuestionPool.exam_id == exam_id,
            ExamQuestionPool.difficulty == QuestionDifficulty.MEDIUM
        )
        .order_by(func.random())
        .limit(2)
    )
    med_q_ids = (await db.execute(stmt_med)).scalars().all()

    selected_ids = list(easy_q_ids) + list(med_q_ids)

    # If the pool doesn't have enough easy/medium questions, pick remaining from any difficulty
    if len(selected_ids) < 3:
        stmt_fallback = (
            select(ExamQuestionPool.question_id)
            .where(
                ExamQuestionPool.exam_id == exam_id,
                ExamQuestionPool.question_id.not_in(selected_ids) if selected_ids else True
            )
            .order_by(func.random())
            .limit(3 - len(selected_ids))
        )
        fallback_ids = (await db.execute(stmt_fallback)).scalars().all()
        selected_ids.extend(fallback_ids)

    if not selected_ids:
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
    for idx, q_id in enumerate(selected_ids):
        # Fetch question difficulty
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
        # Already finalized
        return await get_exam_result_detail(db, assignment.id)

    assignment.status = AssignmentStatus.SUBMITTED
    assignment.submitted_at = now
    await db.commit()

    await compute_and_save_exam_scores(db, assignment.id)
    return await get_exam_result_detail(db, assignment.id)


async def _get_assigned_question_views(db: AsyncSession, assignment_id: int) -> List[StudentQuestionView]:
    """
    Loads the locked questions for an assignment and includes the latest code if available.
    """
    stmt = (
        select(AssignedQuestion, Question)
        .join(Question, AssignedQuestion.question_id == Question.id)
        .where(AssignedQuestion.assignment_id == assignment_id)
        .order_by(AssignedQuestion.order_index)
    )
    rows = (await db.execute(stmt)).all()

    views = []
    for assigned_q, q in rows:
        # Find latest submission
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
            order_index=assigned_q.order_index,
            last_code=latest_sub.code if latest_sub else None,
            last_language=latest_sub.language if latest_sub else None,
            status=latest_sub.status if latest_sub else "unattempted"
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
        raise HTTPException(status_code=404, detail="Assignment result not found")

    assignment, exam, user, result = row

    if is_admin:
        # Fetch question scores for admin only
        stmt_scores = (
            select(QuestionScore, Question)
            .join(Question, QuestionScore.question_id == Question.id)
            .where(QuestionScore.assignment_id == assignment_id)
        )
        score_rows = (await db.execute(stmt_scores)).all()

        scores_breakdown = [
            QuestionScoreBreakdown(
                question_id=q.id,
                question_title=q.title,
                difficulty=q.difficulty.value,
                correctness=qs.correctness,
                time_taken_sec=qs.time_taken_sec,
                difficulty_weight=qs.difficulty_weight,
                time_bonus=qs.time_bonus,
                final_score=qs.final_score,
            )
            for qs, q in score_rows
        ]
        total_score_val = result.total_score if result else 0.0
        rank_val = result.rank if result else None
    else:
        # For students, all scores are withheld and fully controlled by admin
        scores_breakdown = []
        total_score_val = None
        rank_val = None

    return ExamResultDetail(
        assignment_id=assignment.id,
        exam_id=exam.id,
        exam_title=exam.title,
        student_name=user.name,
        roll_no=user.roll_no,
        status=assignment.status.value,
        total_score=total_score_val,
        rank=rank_val,
        submitted_at=assignment.submitted_at,
        question_scores=scores_breakdown
    )


async def get_exam_leaderboard(db: AsyncSession, exam_id: int) -> List[LeaderboardEntry]:
    """
    Returns ranked leaderboard for an exam.
    """
    stmt = (
        select(ExamResult, ExamAssignment, User)
        .join(ExamAssignment, ExamResult.assignment_id == ExamAssignment.id)
        .join(User, ExamAssignment.user_id == User.id)
        .where(ExamAssignment.exam_id == exam_id)
        .order_by(
            desc(ExamResult.total_score),
            ExamAssignment.submitted_at.asc().nulls_last()
        )
    )
    rows = (await db.execute(stmt)).all()

    leaderboard = []
    for rank_idx, (res, assignment, user) in enumerate(rows, start=1):
        leaderboard.append(LeaderboardEntry(
            rank=res.rank or rank_idx,
            student_name=user.name,
            roll_no=user.roll_no,
            total_score=res.total_score,
            status=assignment.status.value,
            submitted_at=assignment.submitted_at
        ))
    return leaderboard


async def get_live_exam_monitoring(db: AsyncSession, exam_id: int) -> List[MonitoringStudentView]:
    """
    Admin endpoint to view real-time status of all students in an exam.
    """
    now = datetime.now(timezone.utc)
    stmt = (
        select(ExamAssignment, User, ExamResult)
        .join(User, ExamAssignment.user_id == User.id)
        .outerjoin(ExamResult, ExamResult.assignment_id == ExamAssignment.id)
        .where(ExamAssignment.exam_id == exam_id)
        .order_by(ExamAssignment.started_at.desc().nulls_last())
    )
    rows = (await db.execute(stmt)).all()

    monitoring_list = []
    for assignment, user, result in rows:
        # Count submissions
        sub_count_stmt = (
            select(func.count(Submission.id))
            .where(Submission.assignment_id == assignment.id)
        )
        sub_count = (await db.execute(sub_count_stmt)).scalar() or 0

        time_remaining = None
        if assignment.status == AssignmentStatus.IN_PROGRESS and assignment.deadline_at:
            delta = (assignment.deadline_at - now).total_seconds()
            time_remaining = max(0.0, delta)

        monitoring_list.append(MonitoringStudentView(
            assignment_id=assignment.id,
            user_id=user.id,
            name=user.name,
            email=user.email,
            roll_no=user.roll_no,
            status=assignment.status.value,
            started_at=assignment.started_at,
            deadline_at=assignment.deadline_at,
            submitted_at=assignment.submitted_at,
            time_remaining_sec=time_remaining,
            submissions_count=sub_count,
            current_score=result.total_score if result else None
        ))

    return monitoring_list
