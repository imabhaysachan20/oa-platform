from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, get_current_admin
from backend.app.models.user import User, UserRole
from backend.app.models.exam import Exam, ExamAssignment
from backend.app.schemas.exam import (
    ExamResponse,
    ExamStartResponse,
    MyQuestionsResponse,
    LeaderboardEntry,
    ExamResultDetail
)
from backend.app.services.exam_service import (
    start_exam_for_student,
    get_student_exam_questions,
    finish_exam_for_student,
    get_exam_leaderboard,
    get_exam_result_detail
)

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=List[ExamResponse])
async def list_available_exams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List published exams available for students.
    """
    stmt = select(Exam).where(Exam.is_published == True).order_by(Exam.id.desc())
    exams = (await db.execute(stmt)).scalars().all()
    return exams


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
    return exam


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
