from datetime import datetime, timezone
from typing import List, Set
import uuid
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.exam import Exam, ExamAssignment, AssignedQuestion, AssignmentStatus
from backend.app.models.question import Question, QuestionDifficulty, MCQOption
from backend.app.models.submission import Submission, MCQResponse
from backend.app.models.result import QuestionScore, ExamResult


def calculate_difficulty_weight(exam: Exam, difficulty: QuestionDifficulty) -> float:
    if difficulty == QuestionDifficulty.EASY:
        return exam.easy_weight
    elif difficulty == QuestionDifficulty.MEDIUM:
        return exam.medium_weight
    elif difficulty == QuestionDifficulty.HARD:
        return exam.hard_weight
    return 10.0


async def compute_and_save_exam_scores(db: AsyncSession, assignment_id: int) -> ExamResult:
    """
    Computes scores for all assigned questions (coding and MCQ) for a finished assignment,
    saves QuestionScore and ExamResult, and updates ranks for the exam.
    """
    # 1. Load assignment and exam
    stmt = (
        select(ExamAssignment)
        .where(ExamAssignment.id == assignment_id)
    )
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise ValueError(f"Assignment {assignment_id} not found")

    stmt_exam = select(Exam).where(Exam.id == assignment.exam_id)
    res_exam = await db.execute(stmt_exam)
    exam = res_exam.scalar_one_or_none()
    if not exam:
        raise ValueError(f"Exam {assignment.exam_id} not found")

    # 2. Get all assigned questions
    stmt_assigned = (
        select(AssignedQuestion, Question)
        .join(Question, AssignedQuestion.question_id == Question.id)
        .where(AssignedQuestion.assignment_id == assignment_id)
        .order_by(AssignedQuestion.order_index)
    )
    res_assigned = await db.execute(stmt_assigned)
    assigned_rows = res_assigned.all()

    # Time calculations
    started_at = assignment.started_at or datetime.now(timezone.utc)
    submitted_at = assignment.submitted_at or assignment.deadline_at or datetime.now(timezone.utc)
    overall_time_taken_sec = max(0.0, (submitted_at - started_at).total_seconds())

    # Calculate score per assigned question
    total_earned_score = 0.0
    max_possible_score = 0.0

    # Delete existing question scores if recalculating
    existing_scores_stmt = select(QuestionScore).where(QuestionScore.assignment_id == assignment_id)
    existing_scores_res = await db.execute(existing_scores_stmt)
    for existing_s in existing_scores_res.scalars().all():
        await db.delete(existing_s)

    for assigned_q, q in assigned_rows:
        if q.question_type == "mcq":
            mcq_weight = float(q.marks if q.marks is not None else 10.0)
            max_possible_score += mcq_weight

            # Fetch correct options for this MCQ
            stmt_correct = (
                select(MCQOption.id)
                .where(MCQOption.question_id == q.id, MCQOption.is_correct == True)
            )
            correct_option_ids: Set[uuid.UUID] = set((await db.execute(stmt_correct)).scalars().all())

            # Fetch student's response
            stmt_mcq_resp = (
                select(MCQResponse)
                .where(
                    MCQResponse.assignment_id == assignment_id,
                    MCQResponse.question_id == q.id
                )
            )
            mcq_resp = (await db.execute(stmt_mcq_resp)).scalar_one_or_none()

            if mcq_resp:
                selected_set = set(mcq_resp.selected_option_ids or [])
                is_correct = (selected_set == correct_option_ids)
                marks_awarded = mcq_weight if is_correct else 0.0
                mcq_resp.is_correct = is_correct
                mcq_resp.marks_awarded = marks_awarded
                mcq_resp.is_locked = True
                time_taken_sec = (
                    max(0.0, (mcq_resp.answered_at - started_at).total_seconds())
                    if mcq_resp.answered_at else overall_time_taken_sec
                )
            else:
                is_correct = False
                marks_awarded = 0.0
                time_taken_sec = overall_time_taken_sec
                # Create empty locked response for consistency
                mcq_resp = MCQResponse(
                    assignment_id=assignment_id,
                    question_id=q.id,
                    selected_option_ids=[],
                    is_correct=False,
                    marks_awarded=0.0,
                    is_locked=True
                )
                db.add(mcq_resp)

            correctness = 1.0 if is_correct else 0.0
            q_score = round(marks_awarded, 2)
            total_earned_score += q_score

            question_score_obj = QuestionScore(
                assignment_id=assignment_id,
                question_id=q.id,
                correctness=correctness,
                time_taken_sec=time_taken_sec,
                difficulty_weight=mcq_weight,
                time_bonus=0.0,
                final_score=q_score,
            )
            db.add(question_score_obj)

        else:
            # Coding question scoring (unchanged)
            diff_weight = calculate_difficulty_weight(exam, assigned_q.difficulty)
            max_possible_score += diff_weight

            # Find latest final submission for this question
            stmt_sub = (
                select(Submission)
                .where(
                    Submission.assignment_id == assignment_id,
                    Submission.question_id == q.id,
                    Submission.is_final == True
                )
                .order_by(desc(Submission.submitted_at))
                .limit(1)
            )
            res_sub = await db.execute(stmt_sub)
            latest_sub = res_sub.scalar_one_or_none()

            if latest_sub and latest_sub.total_test_cases > 0:
                correctness = float(latest_sub.test_cases_passed) / float(latest_sub.total_test_cases)
                time_taken_sec = max(0.0, (latest_sub.submitted_at - started_at).total_seconds())
            else:
                correctness = 0.0
                time_taken_sec = overall_time_taken_sec

            q_score = round(diff_weight * correctness, 2)
            total_earned_score += q_score

            question_score_obj = QuestionScore(
                assignment_id=assignment_id,
                question_id=q.id,
                correctness=correctness,
                time_taken_sec=time_taken_sec,
                difficulty_weight=diff_weight,
                time_bonus=0.0,
                final_score=q_score,
            )
            db.add(question_score_obj)

    # total_score = (sum of question_scores / max_possible) * 100
    if max_possible_score > 0:
        normalized_total_score = round((total_earned_score / max_possible_score) * 100.0, 2)
    else:
        normalized_total_score = 0.0

    # Upsert ExamResult
    stmt_res = select(ExamResult).where(ExamResult.assignment_id == assignment_id)
    res_obj = (await db.execute(stmt_res)).scalar_one_or_none()
    if res_obj:
        res_obj.total_score = normalized_total_score
    else:
        res_obj = ExamResult(
            assignment_id=assignment_id,
            total_score=normalized_total_score,
            rank=None
        )
        db.add(res_obj)

    await db.flush()

    # Recalculate ranks for the entire exam
    await recalculate_exam_ranks(db, exam.id)
    await db.commit()
    await db.refresh(res_obj)
    return res_obj


async def recalculate_exam_ranks(db: AsyncSession, exam_id: int):
    """
    Recalculates leaderboard ranks for all finished assignments in an exam.
    Ordered by total_score desc, submitted_at asc.
    """
    stmt = (
        select(ExamResult, ExamAssignment)
        .join(ExamAssignment, ExamResult.assignment_id == ExamAssignment.id)
        .where(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.status.in_([AssignmentStatus.SUBMITTED, AssignmentStatus.AUTO_SUBMITTED])
        )
        .order_by(
            desc(ExamResult.total_score),
            ExamAssignment.submitted_at.asc()
        )
    )
    rows = (await db.execute(stmt)).all()

    current_rank = 1
    for res_obj, assign in rows:
        res_obj.rank = current_rank
        current_rank += 1

    await db.flush()
