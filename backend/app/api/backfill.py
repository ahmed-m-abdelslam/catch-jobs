from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.database import get_db, async_session
from app.models.job import Job, JobEmbedding
from app.services.embedding import generate_embedding_for_job
import uuid

router = APIRouter(prefix="/backfill", tags=["Backfill"])


@router.get("/embedding-stats")
async def embedding_stats(db: AsyncSession = Depends(get_db)):
    total = await db.scalar(select(func.count(Job.id)))
    with_emb = await db.scalar(select(func.count(JobEmbedding.id)))
    return {
        "total_jobs": total or 0,
        "with_embeddings": with_emb or 0,
        "without_embeddings": (total or 0) - (with_emb or 0),
    }


@router.post("/backfill-embeddings")
async def backfill_embeddings(batch_size: int = 10):
    """Generate embeddings one by one with individual commits."""
    from app.database import async_session

    total_done = 0
    total_errors = 0
    max_jobs = batch_size * 50  # Process up to 500 jobs per call

    # Get list of job IDs without embeddings using a fresh session
    async with async_session() as session:
        result = await session.execute(
            text("""
                SELECT j.id, j.title, j.company_name, j.description
                FROM jobs j
                LEFT JOIN job_embeddings je ON j.id = je.job_id
                WHERE je.id IS NULL
                LIMIT :lim
            """),
            {"lim": max_jobs}
        )
        jobs_to_process = result.fetchall()

    if not jobs_to_process:
        return {"embedded": 0, "errors": 0, "message": "All jobs already have embeddings!"}

    print(f"Starting backfill for {len(jobs_to_process)} jobs...")

    for i, job in enumerate(jobs_to_process):
        # Each job gets its own session and transaction
        async with async_session() as session:
            try:
                embedding = generate_embedding_for_job(
                    title=job.title or "",
                    company=job.company_name or "",
                    description=(job.description or "")[:500],
                )

                # Use ORM insert instead of raw SQL
                job_emb = JobEmbedding(
                    id=uuid.uuid4(),
                    job_id=job.id,
                    embedding=embedding,
                )
                session.add(job_emb)
                await session.commit()
                total_done += 1

                if (total_done) % 50 == 0:
                    print(f"  Progress: {total_done}/{len(jobs_to_process)} done")

            except Exception as e:
                await session.rollback()
                total_errors += 1
                print(f"  Error embedding {job.id}: {type(e).__name__}: {str(e)[:100]}")

    msg = f"Done! Embedded {total_done} jobs with {total_errors} errors. Remaining: {len(jobs_to_process) - total_done - total_errors}"
    print(msg)
    return {"embedded": total_done, "errors": total_errors, "message": msg}
