from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.job import Job

router = APIRouter(redirect_slashes=False, prefix="/admin", tags=["Admin"])


@router.get("/stats")
async def get_full_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed job statistics."""
    # Total
    total_result = await db.execute(select(func.count(Job.id)))
    total = total_result.scalar()

    # By source
    source_result = await db.execute(
        select(Job.source, func.count(Job.id))
        .group_by(Job.source)
        .order_by(func.count(Job.id).desc())
    )
    by_source = {row[0]: row[1] for row in source_result.fetchall()}

    # By country
    country_result = await db.execute(
        select(Job.country, func.count(Job.id))
        .where(Job.country.isnot(None))
        .group_by(Job.country)
        .order_by(func.count(Job.id).desc())
        .limit(20)
    )
    by_country = {row[0]: row[1] for row in country_result.fetchall()}

    # Recent jobs count (last 24 hours)
    from datetime import datetime, timedelta, timezone
    yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_result = await db.execute(
        select(func.count(Job.id)).where(Job.created_at >= yesterday)
    )
    recent = recent_result.scalar()

    return {
        "total_jobs": total,
        "jobs_last_24h": recent,
        "by_source": by_source,
        "by_country": by_country,
    }


@router.post("/scrape-now")
async def trigger_scrape(
    source: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a scraping job."""
    from app.tasks.scrape_tasks import scrape_all_jobs, scrape_single_source

    if source:
        valid = ["remoteok", "wuzzuf", "linkedin", "arbeitnow", "jobicy"]
        if source not in valid:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Valid sources: {valid}")
        task = scrape_single_source.delay(source)
    else:
        task = scrape_all_jobs.delay()

    return {
        "message": "Scraping task started",
        "task_id": str(task.id),
        "source": source or "all",
    }


@router.get("/task-status/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Check the status of a scraping task."""
    from app.tasks.celery_app import celery_app

    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    }
