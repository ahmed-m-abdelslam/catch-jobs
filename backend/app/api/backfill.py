from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.database import get_db, async_session
from app.models.job import Job, JobEmbedding
from app.services.embedding import generate_embedding_for_job
import uuid
import asyncio

router = APIRouter(prefix="/backfill", tags=["Backfill"])

# Track background task status
_status = {"running": False, "done": 0, "errors": 0, "total": 0}


@router.get("/embedding-stats")
async def embedding_stats(db: AsyncSession = Depends(get_db)):
    total = await db.scalar(select(func.count(Job.id)))
    with_emb = await db.scalar(select(func.count(JobEmbedding.id)))
    return {
        "total_jobs": total or 0,
        "with_embeddings": with_emb or 0,
        "without_embeddings": (total or 0) - (with_emb or 0),
        "backfill_status": _status,
    }


async def _backfill_worker(job_ids_and_data: list):
    """Background worker that embeds jobs one at a time with pauses."""
    global _status
    _status["running"] = True
    _status["done"] = 0
    _status["errors"] = 0
    _status["total"] = len(job_ids_and_data)

    for i, job in enumerate(job_ids_and_data):
        try:
            embedding = generate_embedding_for_job(
                title=job["title"] or "",
                company=job["company"] or "",
                description=(job["description"] or "")[:500],
            )

            async with async_session() as session:
                job_emb = JobEmbedding(
                    id=uuid.uuid4(),
                    job_id=job["id"],
                    embedding=embedding,
                )
                session.add(job_emb)
                await session.commit()

            _status["done"] += 1

        except Exception as e:
            _status["errors"] += 1
            print(f"  Error {job['id']}: {type(e).__name__}")

        # Pause every job to avoid hogging resources
        if (i + 1) % 5 == 0:
            await asyncio.sleep(0.1)

        if (i + 1) % 100 == 0:
            print(f"  Backfill progress: {_status['done']}/{_status['total']}")

    _status["running"] = False
    print(f"Backfill complete: {_status['done']} done, {_status['errors']} errors")


@router.post("/backfill-embeddings")
async def backfill_embeddings(limit: int = 500):
    """Start background backfill. Returns immediately."""
    global _status

    if _status["running"]:
        return {"message": "Backfill already running", "status": _status}

    # Fetch job data
    async with async_session() as session:
        result = await session.execute(
            text("""
                SELECT j.id, j.title, j.company_name, j.description
                FROM jobs j
                LEFT JOIN job_embeddings je ON j.id = je.job_id
                WHERE je.id IS NULL
                LIMIT :lim
            """),
            {"lim": limit}
        )
        rows = result.fetchall()

    if not rows:
        return {"message": "All jobs already have embeddings!", "status": _status}

    job_data = [
        {"id": r.id, "title": r.title, "company": r.company_name, "description": r.description}
        for r in rows
    ]

    # Start background task
    asyncio.create_task(_backfill_worker(job_data))

    return {
        "message": f"Backfill started for {len(job_data)} jobs. Check /backfill/embedding-stats for progress.",
        "total": len(job_data),
    }
