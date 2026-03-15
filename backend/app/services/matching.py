import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, bindparam
from app.models.job import Job, JobEmbedding
from app.models.preference import UserPreference
from app.services.embedding import generate_embedding_for_preference


async def get_recommended_jobs_for_user(
    user_id: uuid.UUID,
    db: AsyncSession,
    limit: int = 50,
) -> list[dict]:
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == user_id)
    )
    preferences = result.scalars().all()

    if not preferences:
        return []

    count_result = await db.execute(text("SELECT COUNT(*) FROM job_embeddings"))
    embedding_count = count_result.scalar()
    if not embedding_count or embedding_count == 0:
        print("No embeddings found in database")
        return []

    all_jobs = []

    for pref in preferences:
        pref_embedding = generate_embedding_for_preference(
            pref.job_title, pref.country, getattr(pref, 'experience_level', None)
        )

        embedding_str = "[" + ",".join(str(x) for x in pref_embedding) + "]"

        if pref.country:
            query = text(
                "SELECT j.id, j.title, j.company_name, j.location, j.country, "
                "j.description, j.job_url, j.source, j.posted_date, j.created_at, "
                "1 - (je.embedding <=> cast(:emb as vector)) AS similarity_score "
                "FROM jobs j "
                "JOIN job_embeddings je ON je.job_id = j.id "
                "WHERE j.country ILIKE :country "
                "ORDER BY je.embedding <=> cast(:emb as vector) "
                "LIMIT :lim"
            )
            rows_result = await db.execute(query, {"emb": embedding_str, "country": f"%{pref.country}%", "lim": limit})
        else:
            query = text(
                "SELECT j.id, j.title, j.company_name, j.location, j.country, "
                "j.description, j.job_url, j.source, j.posted_date, j.created_at, "
                "1 - (je.embedding <=> cast(:emb as vector)) AS similarity_score "
                "FROM jobs j "
                "JOIN job_embeddings je ON je.job_id = j.id "
                "ORDER BY je.embedding <=> cast(:emb as vector) "
                "LIMIT :lim"
            )
            rows_result = await db.execute(query, {"emb": embedding_str, "lim": limit})

        rows = rows_result.fetchall()

        for row in rows:
            all_jobs.append({
                "id": row.id,
                "title": row.title,
                "company_name": row.company_name,
                "location": row.location,
                "country": row.country,
                "description": row.description,
                "job_url": row.job_url,
                "source": row.source,
                "posted_date": row.posted_date,
                "created_at": row.created_at,
                "similarity_score": round(float(row.similarity_score), 4),
            })

    seen = {}
    for job in all_jobs:
        jid = job["id"]
        if jid not in seen or job["similarity_score"] > seen[jid]["similarity_score"]:
            seen[jid] = job

    return sorted(seen.values(), key=lambda x: x["similarity_score"], reverse=True)[:limit]
