from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.core.limiter import limiter
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.models.submission import Submission
from backend.app.models.exam import ExamAssignment
from backend.app.schemas.submission import (
    RunCodeRequest,
    RunCodeResponse,
    SubmitCodeRequest,
    SubmitCodeResponse,
    SubmissionHistoryItem
)
from backend.app.services.submission_service import (
    run_code_samples,
    submit_code_solution
)

router = APIRouter(prefix="/submissions", tags=["submissions"])


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
