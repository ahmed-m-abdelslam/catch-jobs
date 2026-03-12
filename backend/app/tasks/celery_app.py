from celery import Celery
from celery.schedules import crontab
import os
import ssl

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Configure SSL for Upstash Redis
broker_use_ssl = None
backend_use_ssl = None

if redis_url.startswith("rediss://"):
    broker_use_ssl = {
        'ssl_cert_reqs': ssl.CERT_NONE
    }
    backend_use_ssl = {
        'ssl_cert_reqs': ssl.CERT_NONE
    }

celery_app = Celery(
    "catchjobs",
    broker=redis_url,
    backend=redis_url,
    include=["app.tasks.scrape_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_hijack_root_logger=False,
    broker_connection_retry_on_startup=True,
)

if broker_use_ssl:
    celery_app.conf.update(
        broker_use_ssl=broker_use_ssl,
        redis_backend_use_ssl=backend_use_ssl,
    )

# Schedule scraping every 10 minutes
scrape_interval = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "10"))

celery_app.conf.beat_schedule = {
    "scrape-all-jobs": {
        "task": "app.tasks.scrape_tasks.scrape_all_jobs",
        "schedule": scrape_interval * 60,
        "options": {"queue": "default"},
    },
}
