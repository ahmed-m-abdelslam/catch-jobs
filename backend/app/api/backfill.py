from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.database import get_db, async_session
from app.models.job import Job, JobEmbedding
from app.services.embedding import get_model
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


def _build_text(title, company, description):
    parts = []
    if title:
        parts.append(f"Job Title: {title}")
    if company:
        parts.append(f"Company: {company}")
    if description:
        parts.append(f"Description: {description[:500]}")
    return " | ".join(parts) if parts else "Unknown Job"


async def _backfill_worker(job_data: list):
    global _status
    _status["running"] = True
    _status["done"] = 0
    _status["errors"] = 0
    _status["total"] = len(job_data)

    model = get_model()
    batch_size = 32

    for i in range(0, len(job_data), batch_size):
        batch = job_data[i:i + batch_size]

        try:
            texts = [_build_text(j["title"], j["company"], j["description"]) for j in batch]
            embeddings = model.encode(texts, show_progress_bar=False)

            # One session for the entire batch
            async with async_session() as session:
                for j, emb in zip(batch, embeddings):
                    try:
                        job_emb = JobEmbedding(
                            id=uuid.uuid4(),
                            job_id=j["id"],
                            embedding=emb.tolist(),
                        )
                        session.add(job_emb)
                        _status["done"] += 1
                    except Exception as e:
                        _status["errors"] += 1
                        print(f"  Error adding {j['id']}: {e}")

                await session.commit()

            print(f"  Batch {i//batch_size + 1}: {_status['done']}/{_status['total']} done")

        except Exception as e:
            _status["errors"] += len(batch)
            print(f"  Batch error: {type(e).__name__}: {str(e)[:100]}")

        # Small pause to let other requests use the connection pool
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
