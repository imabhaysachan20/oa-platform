from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.core.limiter import limiter
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.models.submission import Submission, MCQResponse
from backend.app.models.exam import ExamAssignment, AssignedQuestion
from backend.app.models.question import Question, MCQOption
from backend.app.schemas.submission import (
    RunCodeRequest,
    RunCodeResponse,
    SubmitCodeRequest,
    SubmitCodeResponse,
    SubmissionHistoryItem,
    SubmitMCQResponseRequest,
    SubmitMCQResponseResponse
)
from backend.app.services.submission_service import (
    run_code_samples,
    submit_code_solution
)

router = APIRouter(prefix="/submissions", tags=["submissions"])
mcq_router = APIRouter(tags=["mcq"])


@router.post("/run", response_model=RunCodeResponse)
@limiter.limit(settings.RUN_RATE_LIMIT)
async def run_code(
    request: Request,
    body: RunCodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Runs code against visible sample test cases only.
    Rate limited per user IP/account.
    """
    return await run_code_samples(
        db=db,
        question_id=body.question_id,
        code=body.code,
        language=body.language
    )


@router.post("/submit", response_model=SubmitCodeResponse)
async def submit_code(
    body: SubmitCodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits code to Judge0 against all test cases (visible + hidden).
    Stores submission and treats latest submission as final for scoring.
    """
    return await submit_code_solution(
        db=db,
        user_id=current_user.id,
        exam_id=body.exam_id,
        question_id=body.question_id,
        code=body.code,
        language=body.language
    )


@router.get("/{submission_id}/status", response_model=SubmissionHistoryItem)
async def get_submission_status(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Poll for submission result and status.
    """
    stmt = (
        select(Submission)
        .join(ExamAssignment, Submission.assignment_id == ExamAssignment.id)
        .where(Submission.id == submission_id)
    )
    sub = (await db.execute(stmt)).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Authorize: user must own the submission unless admin
    if sub.assignment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this submission")

    return sub


async def _handle_submit_mcq_response(
    body: SubmitMCQResponseRequest,
    current_user: User,
    db: AsyncSession
) -> SubmitMCQResponseResponse:
    now = datetime.now(timezone.utc)

    # 1. Fetch assignment
    assign_stmt = select(ExamAssignment).where(ExamAssignment.id == body.assignment_id)
    assignment = (await db.execute(assign_stmt)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Authorize
    if assignment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to submit for this assignment")

    if assignment.status in ["submitted", "auto_submitted"]:
        raise HTTPException(status_code=400, detail="Exam has already been submitted")

    if assignment.deadline_at and now > assignment.deadline_at:
        raise HTTPException(status_code=400, detail="Exam deadline has passed")

    # 2. Fetch assigned question and question
    stmt = (
        select(AssignedQuestion, Question)
        .join(Question, AssignedQuestion.question_id == Question.id)
        .where(
            AssignedQuestion.assignment_id == body.assignment_id,
            AssignedQuestion.question_id == body.question_id
        )
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=400, detail="Question is not assigned to this exam")

    assigned_q, question = row

    # Reject if question deadline passed
    if assigned_q.question_deadline_at and now > assigned_q.question_deadline_at:
        raise HTTPException(status_code=400, detail="Time limit for this question has expired")

    # 3. Check if response is already locked
    resp_stmt = select(MCQResponse).where(
        MCQResponse.assignment_id == body.assignment_id,
        MCQResponse.question_id == body.question_id
    )
    existing_resp = (await db.execute(resp_stmt)).scalar_one_or_none()
    if existing_resp and existing_resp.is_locked:
        raise HTTPException(status_code=400, detail="This response is locked and cannot be modified")

    # 4. Validate selected_option_ids belong to question_id
    if body.selected_option_ids:
        valid_opts_stmt = (
            select(MCQOption.id)
            .where(
                MCQOption.question_id == body.question_id,
                MCQOption.id.in_(body.selected_option_ids)
            )
        )
        valid_opts = set((await db.execute(valid_opts_stmt)).scalars().all())
        if len(valid_opts) != len(set(body.selected_option_ids)):
            raise HTTPException(status_code=400, detail="One or more selected options do not belong to this question")

    # 5. Enforce single-select constraint
    if not question.is_multi_select and len(body.selected_option_ids) > 1:
        raise HTTPException(status_code=400, detail="This question only allows a single option to be selected")

    # 6. Upsert selection
    if existing_resp:
        existing_resp.selected_option_ids = body.selected_option_ids
        existing_resp.answered_at = now
        await db.commit()
        await db.refresh(existing_resp)
        resp_obj = existing_resp
    else:
        new_resp = MCQResponse(
            assignment_id=body.assignment_id,
            question_id=body.question_id,
            selected_option_ids=body.selected_option_ids,
            answered_at=now,
            is_locked=False
        )
        db.add(new_resp)
        await db.commit()
        await db.refresh(new_resp)
        resp_obj = new_resp

    return SubmitMCQResponseResponse(
        assignment_id=resp_obj.assignment_id,
        question_id=resp_obj.question_id,
        selected_option_ids=resp_obj.selected_option_ids,
        answered_at=resp_obj.answered_at,
        is_locked=resp_obj.is_locked
    )


@mcq_router.post("/mcq-responses", response_model=SubmitMCQResponseResponse)
async def submit_mcq_response(
    body: SubmitMCQResponseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits or updates an MCQ answer selection.
    """
    return await _handle_submit_mcq_response(body, current_user, db)


@router.post("/mcq", response_model=SubmitMCQResponseResponse)
async def submit_mcq_response_alias(
    body: SubmitMCQResponseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Alias endpoint under /api/submissions/mcq.
    """
    return await _handle_submit_mcq_response(body, current_user, db)
