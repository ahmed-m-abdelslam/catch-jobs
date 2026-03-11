from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "jobmatcher",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.scrape_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "scrape-all-sources-every-10-min": {
            "task": "app.tasks.scrape_tasks.scrape_all_jobs",
            "schedule": 600,
        },
    },
)
