import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select

from backend.app.core.database import AsyncSessionLocal
from backend.app.models.exam import ExamAssignment, AssignmentStatus
from backend.app.services.scoring_service import compute_and_save_exam_scores
from backend.app.tasks.celery_app import celery_app

logger = logging.getLogger("celery.auto_submit")


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
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    count = loop.run_until_complete(_process_expired_assignments())
    return f"Processed {count} expired assignments"
