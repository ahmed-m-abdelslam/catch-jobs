from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.models.job import JobEmbedding
from app.services.embedding import generate_embedding_for_job

router = APIRouter(prefix="/backfill", tags=["Backfill"])


@router.post("/backfill-embeddings")
async def backfill_embeddings(
    batch_size: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = text("""
        SELECT j.id, j.title, j.company_name, j.description
        FROM jobs j
        LEFT JOIN job_embeddings je ON je.job_id = j.id
        WHERE je.id IS NULL
        LIMIT :batch_size
    """)
    result = await db.execute(query, {"batch_size": batch_size})
    jobs = result.fetchall()

    if not jobs:
        return {"message": "All jobs already have embeddings", "processed": 0}

    count = 0
    errors = 0
    for job in jobs:
        try:
            embedding = generate_embedding_for_job(
                title=job.title,
                company=job.company_name,
                description=job.description,
            )
            job_emb = JobEmbedding(job_id=job.id, embedding=embedding)
            db.add(job_emb)
            count += 1
            if count % 50 == 0:
                await db.flush()
                print(f"Backfill progress: {count}/{len(jobs)}")
        except Exception as e:
            errors += 1
            print(f"Error embedding job {job.id}: {e}")

    await db.commit()

    rem_result = await db.execute(text(
        "SELECT COUNT(*) FROM jobs j LEFT JOIN job_embeddings je ON je.job_id = j.id WHERE je.id IS NULL"
    ))
    remaining_count = rem_result.scalar_one()

    return {
        "processed": count,
        "errors": errors,
        "remaining": remaining_count,
    }


@router.get("/embedding-stats")
async def embedding_stats(db: AsyncSession = Depends(get_db)):
    total_result = await db.execute(text("SELECT COUNT(*) FROM jobs"))
    total = total_result.scalar_one()

    emb_result = await db.execute(text("SELECT COUNT(*) FROM job_embeddings"))
    with_emb = emb_result.scalar_one()

    return {
        "total_jobs": total,
        "with_embeddings": with_emb,
        "without_embeddings": total - with_emb,
    }
