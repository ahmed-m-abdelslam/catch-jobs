from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from app.database import get_db, engine
from app.models.job import Job, JobEmbedding
from app.services.embedding import generate_embedding_for_job

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
async def backfill_embeddings(batch_size: int = 20):
    """Generate embeddings in small batches with fresh DB sessions."""
    from app.database import async_session
    
    total_done = 0
    total_errors = 0
    
    for batch_num in range(500):  # Max 500 batches = 10000 jobs
        async with async_session() as session:
            try:
                # Get jobs without embeddings
                result = await session.execute(
                    text("""
                        SELECT j.id, j.title, j.company_name, j.description
                        FROM jobs j
                        LEFT JOIN job_embeddings je ON j.id = je.job_id
                        WHERE je.id IS NULL
                        LIMIT :limit
                    """),
                    {"limit": batch_size}
                )
                jobs = result.fetchall()
                
                if not jobs:
                    break
                
                for job in jobs:
                    try:
                        embedding = generate_embedding_for_job(
                            title=job.title or "",
                            company=job.company_name or "",
                            description=(job.description or "")[:500],
                        )
                        await session.execute(
                            text("""
                                INSERT INTO job_embeddings (id, job_id, embedding)
                                VALUES (gen_random_uuid(), :job_id, :embedding)
                                ON CONFLICT (job_id) DO NOTHING
                            """),
                            {"job_id": str(job.id), "embedding": str(embedding)}
                        )
                        total_done += 1
                    except Exception as e:
                        total_errors += 1
                        print(f"Error embedding {job.id}: {e}")
                
                await session.commit()
                print(f"Batch {batch_num + 1}: {total_done} done, {total_errors} errors")
                
            except Exception as e:
                print(f"Batch {batch_num + 1} failed: {e}")
                await session.rollback()
                total_errors += 1
    
    return {
        "embedded": total_done,
        "errors": total_errors,
        "message": f"Done! Embedded {total_done} jobs with {total_errors} errors"
    }
