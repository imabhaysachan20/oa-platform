import os
from celery import Celery
from backend.app.core.config import settings

broker_url = os.getenv("CELERY_BROKER_URL", settings.REDIS_URL)
result_backend = os.getenv("CELERY_RESULT_BACKEND", settings.REDIS_URL)

celery_app = Celery(
    "ubicode",
    broker=broker_url,
    backend=result_backend,
    include=["backend.app.tasks.auto_submit"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-auto-submit-every-10s": {
            "task": "backend.app.tasks.auto_submit.check_and_auto_submit_expired_exams",
            "schedule": 10.0,
        },
    },
)
