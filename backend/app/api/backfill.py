from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.database import get_db, async_session
from app.models.job import Job, JobEmbedding
from app.services.embedding import generate_embedding_for_job
import uuid
import asyncio

router = APIRouter(prefix="/backfill", tags=["Backfill"])

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


async def _backfill_worker(job_data: list):
    global _status
    _status["running"] = True
    _status["done"] = 0
    _status["errors"] = 0
    _status["total"] = len(job_data)

    for i, job in enumerate(job_data):
        try:
            embedding = generate_embedding_for_job(
                title=job["title"] or "",
                company=job["company"] or "",
                description=(job["description"] or "")[:500],
            )

            # Skip if embedding is all zeros (error)
            if all(x == 0.0 for x in embedding[:10]):
                _status["errors"] += 1
                continue

            async with async_session() as session:
                job_emb = JobEmbedding(
                    id=uuid.uuid4(),
                    job_id=job["id"],
                    embedding=embedding,
                )
                session.add(job_emb)
                await session.commit()

            _status["done"] += 1

            if (_status["done"]) % 100 == 0:
                print(f"  Backfill progress: {_status['done']}/{_status['total']}")

        except Exception as e:
            _status["errors"] += 1
            print(f"  Error {job['id']}: {type(e).__name__}: {str(e)[:100]}")

        # Rate limit for OpenAI API (3000 RPM = 50/sec)
        if (i + 1) % 50 == 0:
            await asyncio.sleep(1)

    _status["running"] = False
    print(f"Backfill complete: {_status['done']} done, {_status['errors']} errors")


@router.post("/backfill-embeddings")
async def backfill_embeddings(limit: int = 2000):
    global _status

    if _status["running"]:
        return {"message": "Backfill already running", "status": _status}

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

    asyncio.create_task(_backfill_worker(job_data))

    return {"message": f"Backfill started for {len(job_data)} jobs.", "total": len(job_data)}


@router.post("/clear-embeddings")
async def clear_embeddings():
    """Delete all embeddings to start fresh."""
    async with async_session() as session:
        await session.execute(text("DELETE FROM job_embeddings"))
        await session.commit()
    return {"message": "All embeddings deleted!"}
