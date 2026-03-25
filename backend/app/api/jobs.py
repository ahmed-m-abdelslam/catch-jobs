import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.job import Job, JobEmbedding
from app.services.embedding import generate_embedding
from app.models.preference import UserPreference
from app.models.notification import SavedJob
from app.schemas.job import JobResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    source_result = await db.execute(
        select(Job.source, func.count(Job.id)).group_by(Job.source)
    )
    by_source = {row[0]: row[1] for row in source_result.fetchall()}

    country_result = await db.execute(
        select(Job.country, func.count(Job.id))
        .where(Job.country.isnot(None))
        .group_by(Job.country)
        .order_by(func.count(Job.id).desc())
        .limit(20)
    )
    by_country = {row[0]: row[1] for row in country_result.fetchall()}

    total_result = await db.execute(select(func.count(Job.id)))
    total = total_result.scalar()

    return {
        "total_jobs": total,
        "by_source": by_source,
        "by_country": by_country,
    }


@router.get("/filters")
async def get_available_filters(db: AsyncSession = Depends(get_db)):
    """Get all available filter options."""
    # Countries
    country_result = await db.execute(
        select(Job.country, func.count(Job.id))
        .where(Job.country.isnot(None))
        .group_by(Job.country)
        .order_by(func.count(Job.id).desc())
    )
    countries = [{"name": row[0], "count": row[1]} for row in country_result.fetchall()]

    # Sources
    source_result = await db.execute(
        select(Job.source, func.count(Job.id))
        .group_by(Job.source)
        .order_by(func.count(Job.id).desc())
    )
    sources = [{"name": row[0], "count": row[1]} for row in source_result.fetchall()]

    return {
        "countries": countries,
        "sources": sources,
    }


@router.get("/recommended", response_model=list[JobResponse])
async def get_recommended(
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.matching import get_recommended_jobs_for_user

    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    preferences = result.scalars().all()

    if not preferences:
        result = await db.execute(
            select(Job).order_by(Job.created_at.desc()).limit(limit)
        )
        jobs = result.scalars().all()
        return [JobResponse.model_validate(j) for j in jobs]

    # Try AI-powered matching first
    try:
        ai_jobs = await get_recommended_jobs_for_user(current_user.id, db, limit)
        if ai_jobs:
            return [JobResponse(**job) for job in ai_jobs]
    except Exception as e:
        print(f"AI matching failed, falling back to keyword matching: {e}")
        await db.rollback()

    # Fallback: keyword matching
    all_jobs = []
    seen_ids = set()

    for pref in preferences:
        query = select(Job)
        title_words = pref.job_title.lower().split()
        for word in title_words:
            if len(word) > 2:
                query = query.where(Job.title.ilike(f"%{word}%"))

        if pref.country and pref.country.lower() != "remote":
            query = query.where(Job.country.ilike(f"%{pref.country}%"))

        query = query.order_by(Job.created_at.desc()).limit(limit)

        result = await db.execute(query)
        for job in result.scalars().all():
            if job.id not in seen_ids:
                seen_ids.add(job.id)
                all_jobs.append(job)

    if preferences and preferences[0].remote_allowed:
        result = await db.execute(
            select(Job)
            .where(Job.country.ilike("%remote%"))
            .order_by(Job.created_at.desc())
            .limit(10)
        )
        for job in result.scalars().all():
            if job.id not in seen_ids:
                seen_ids.add(job.id)
                all_jobs.append(job)

    return [JobResponse.model_validate(j) for j in all_jobs[:limit]]


@router.get("/saved", response_model=list[JobResponse])
async def get_saved_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Job)
        .join(SavedJob, SavedJob.job_id == Job.id)
        .where(SavedJob.user_id == current_user.id)
        .order_by(SavedJob.created_at.desc())
    )
    jobs = result.scalars().all()
    return [JobResponse.model_validate(j) for j in jobs]


@router.get("")
@router.get("/")
async def list_jobs(
    country: str | None = Query(default=None),
    source: str | None = Query(default=None),
    search: str | None = Query(default=None),
    days: int | None = Query(default=None, description="Filter by days: 1, 2, 3, 7, 14, 30"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List jobs with filters: country, source, search, days."""
    query = select(Job)

    if country:
        query = query.where(Job.country.ilike(f"%{country}%"))
    if source:
        query = query.where(Job.source == source)
    if search:
        query = query.where(
            Job.title.ilike(f"%{search}%") | Job.company_name.ilike(f"%{search}%")
        )
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.where(Job.created_at >= cutoff)

    # Total count for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Job.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    jobs = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total else 1

    return {
        "jobs": [JobResponse.model_validate(j) for j in jobs],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }



@router.get("/ai-search")
async def ai_search_jobs(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(default=20, le=50),
    country: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """AI-powered semantic job search using embeddings."""
    import asyncpg
    import ssl as _ssl

    # Generate embedding for the search query
    query_embedding = generate_embedding(f"Job: {q}")
    if not query_embedding:
        # Fallback to text search
        query = select(Job).where(
            Job.title.ilike(f"%{q}%") | Job.company_name.ilike(f"%{q}%")
        )
        if country:
            query = query.where(Job.country.ilike(f"%{country}%"))
        query = query.order_by(Job.created_at.desc()).limit(limit)
        result = await db.execute(query)
        jobs = result.scalars().all()
        return [_job_to_dict(j) for j in jobs]

    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    # Use raw asyncpg for pgvector query
    import os, traceback as _tb
    db_url = os.getenv("DATABASE_URL", "")
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    try:
        conn = await asyncpg.connect(db_url, ssl='require')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB connect error: {str(e)}")

    try:
        if country:
            rows = await conn.fetch("""
                SELECT j.id, j.title, j.company_name, j.location, j.country,
                       j.description, j.job_url, j.source, j.posted_date, j.created_at,
                       1 - (je.embedding <=> $1::vector) AS similarity
                FROM jobs j
                JOIN job_embeddings je ON je.job_id = j.id
                WHERE j.country ILIKE $2
                AND 1 - (je.embedding <=> $1::vector) >= 0.55
                ORDER BY similarity DESC
                LIMIT $3
            """, embedding_str, f"%{country}%", limit)
        else:
            rows = await conn.fetch("""
                SELECT j.id, j.title, j.company_name, j.location, j.country,
                       j.description, j.job_url, j.source, j.posted_date, j.created_at,
                       1 - (je.embedding <=> $1::vector) AS similarity
                FROM jobs j
                JOIN job_embeddings je ON je.job_id = j.id
                WHERE 1 - (je.embedding <=> $1::vector) >= 0.55
                ORDER BY similarity DESC
                LIMIT $2
            """, embedding_str, limit)
    except Exception as e:
        await conn.close()
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")
    finally:
        try:
            await conn.close()
        except:
            pass

    # Deduplicate by title+company
    seen = {}
    jobs = []
    for row in rows:
        title = row["title"] or ""
        company = row["company_name"] or ""
        key = (title.strip().lower(), company.strip().lower())
        if key not in seen:
            seen[key] = True
            jobs.append({
                "id": str(row["id"]),
                "title": title,
                "company_name": company,
                "location": row["location"],
                "country": row["country"],
                "description": row["description"],
                "job_url": row["job_url"],
                "source": row["source"],
                "posted_date": str(row["posted_date"]) if row["posted_date"] else None,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "similarity_score": round(float(row["similarity"]), 4),
            })

    return jobs


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse.model_validate(job)


@router.post("/save/{job_id}")
async def save_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(SavedJob).where(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
    )
    if existing.scalar_one_or_none():
        return {"detail": "Already saved"}

    saved = SavedJob(user_id=current_user.id, job_id=job_id)
    db.add(saved)
    return {"detail": "Job saved"}


@router.delete("/save/{job_id}")
async def unsave_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedJob).where(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
    )
    saved = result.scalar_one_or_none()
    if saved:
        await db.delete(saved)
    return {"detail": "Removed"}


