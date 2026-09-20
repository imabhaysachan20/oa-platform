import asyncio
import logging
from datetime import datetime, timezone
import uuid
from typing import Set
from sqlalchemy import select, and_

from backend.app.core.database import AsyncSessionLocal
from backend.app.models.exam import ExamAssignment, AssignedQuestion, AssignmentStatus, Exam
from backend.app.models.question import Question, MCQOption
from backend.app.models.submission import MCQResponse
from backend.app.services.scoring_service import compute_and_save_exam_scores
from backend.app.tasks.celery_app import celery_app

logger = logging.getLogger("celery.auto_submit")


async def _process_expired_mcq_questions():
    """
    Scans for assigned_questions rows where question_deadline_at has passed
    and the corresponding mcq_responses row is not yet locked.
    Locks and grades them using whatever was last selected (or empty, scoring 0).
    """
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        try:
            stmt = (
                select(AssignedQuestion, Question, Exam)
                .join(Question, AssignedQuestion.question_id == Question.id)
                .join(ExamAssignment, AssignedQuestion.assignment_id == ExamAssignment.id)
                .join(Exam, ExamAssignment.exam_id == Exam.id)
                .where(
                    ExamAssignment.status == AssignmentStatus.IN_PROGRESS,
                    Question.question_type == "mcq",
                    AssignedQuestion.question_deadline_at != None,
                    AssignedQuestion.question_deadline_at <= now
                )
            )
            expired_assigned = (await db.execute(stmt)).all()
            if not expired_assigned:
                return 0

            locked_count = 0
            for assigned_q, q, exam in expired_assigned:
                resp_stmt = select(MCQResponse).where(
                    MCQResponse.assignment_id == assigned_q.assignment_id,
                    MCQResponse.question_id == q.id
                )
                mcq_resp = (await db.execute(resp_stmt)).scalar_one_or_none()

                if mcq_resp and mcq_resp.is_locked:
                    continue

                # Fetch correct option IDs
                opt_stmt = select(MCQOption.id).where(
                    MCQOption.question_id == q.id,
                    MCQOption.is_correct == True
                )
                correct_ids: Set[uuid.UUID] = set((await db.execute(opt_stmt)).scalars().all())
                mcq_weight = float(getattr(exam, 'mcq_weight', 2.0) if getattr(exam, 'mcq_weight', None) is not None else 2.0)

                if mcq_resp:
                    selected_set = set(mcq_resp.selected_option_ids or [])
                    is_correct = (selected_set == correct_ids)
                    mcq_resp.is_correct = is_correct
                    mcq_resp.marks_awarded = mcq_weight if is_correct else 0.0
                    mcq_resp.is_locked = True
                else:
                    new_resp = MCQResponse(
                        assignment_id=assigned_q.assignment_id,
                        question_id=q.id,
                        selected_option_ids=[],
                        is_correct=False,
                        marks_awarded=0.0,
                        is_locked=True
                    )
                    db.add(new_resp)

                locked_count += 1

            if locked_count > 0:
                await db.commit()
                logger.info(f"Locked {locked_count} expired MCQ question responses.")
            return locked_count
        except Exception as e:
            logger.error(f"Error checking expired MCQ questions: {e}")
            await db.rollback()
            return 0


async def _process_expired_assignments():
    """
    Finds all exam assignments that are currently in_progress but past their deadline_at.
    Auto-finalizes them and computes their scores.
    """
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        try:
            stmt = (
                select(ExamAssignment)
                .where(
                    ExamAssignment.status == AssignmentStatus.IN_PROGRESS,
                    ExamAssignment.is_active == True,
                    ExamAssignment.deadline_at != None,
                    ExamAssignment.deadline_at <= now
                )
            )
            assignments = (await db.execute(stmt)).scalars().all()

            if not assignments:
                return 0

            logger.info(f"Found {len(assignments)} expired exam assignments to auto-submit.")
            processed_count = 0

            for assignment in assignments:
                assignment.status = AssignmentStatus.AUTO_SUBMITTED
                assignment.submitted_at = assignment.deadline_at or now
                await db.commit()

                try:
                    await compute_and_save_exam_scores(db, assignment.id)
                    processed_count += 1
                    logger.info(f"Auto-submitted and scored assignment {assignment.id} successfully.")
                except Exception as exc:
                    logger.error(f"Failed to score auto-submitted assignment {assignment.id}: {exc}")

            return processed_count
        except Exception as e:
            logger.error(f"Error querying expired assignments: {e}")
            await db.rollback()
            return 0


@celery_app.task(name="backend.app.tasks.auto_submit.check_and_auto_submit_expired_exams")
def check_and_auto_submit_expired_exams():
    """
    Celery Beat periodic task executed every 10 seconds.
    Processes both individual expired MCQ timers and whole-exam deadline expirations.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    mcq_count = loop.run_until_complete(_process_expired_mcq_questions())
    exam_count = loop.run_until_complete(_process_expired_assignments())
    return f"Processed {mcq_count} expired MCQs and {exam_count} expired assignments"
