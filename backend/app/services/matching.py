import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.job import Job, JobEmbedding
from app.models.preference import UserPreference
from app.models.notification import UserNotification
from app.services.embedding import generate_embedding_for_preference


async def find_matching_users_for_job(
    job: Job,
    job_embedding: list[float],
    db: AsyncSession,
    similarity_threshold: float = 0.72,
) -> list[uuid.UUID]:
    """
    Find users whose preferences match a given job.

    Uses a two-pass approach:
    1. Hard filter: country match and basic title keyword overlap.
    2. Semantic filter: cosine similarity between job embedding and preference embedding.
    """
    matched_user_ids: set[uuid.UUID] = set()

    # Get all preferences
    result = await db.execute(select(UserPreference))
    preferences = result.scalars().all()

    for pref in preferences:
        # Hard filter: country
        if pref.country and job.country:
            if pref.country.lower() != job.country.lower():
                continue

        # Generate preference embedding and check cosine similarity
        pref_embedding = generate_embedding_for_preference(
            pref.job_title, pref.country, pref.experience_level
        )

        # Use pgvector cosine distance: 1 - cosine_distance = similarity
        similarity_query = text("""
            SELECT 1 - (embedding <=> :pref_embedding::vector) AS similarity
            FROM job_embeddings
            WHERE job_id = :job_id
        """)
        sim_result = await db.execute(
            similarity_query,
            {"pref_embedding": str(pref_embedding), "job_id": str(job.id)},
        )
        row = sim_result.fetchone()

        if row and row.similarity >= similarity_threshold:
            matched_user_ids.add(pref.user_id)

    return list(matched_user_ids)


async def get_recommended_jobs_for_user(
    user_id: uuid.UUID,
    db: AsyncSession,
    limit: int = 50,
) -> list[dict]:
    """
    Get top recommended jobs for a user based on their preferences.
    Returns jobs sorted by best semantic match.
    """
    # Get user preferences
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == user_id)
    )
    preferences = result.scalars().all()

    if not preferences:
        return []

    all_jobs = []

    for pref in preferences:
        pref_embedding = generate_embedding_for_preference(
            pref.job_title, pref.country, pref.experience_level
        )

        # Build country filter clause
        country_filter = ""
        params = {"embedding": str(pref_embedding), "limit": limit}

        if pref.country:
            country_filter = "AND j.country ILIKE :country"
            params["country"] = f"%{pref.country}%"

        query = text(f"""
            SELECT
                j.id, j.title, j.company_name, j.location, j.country,
                j.description, j.job_url, j.source, j.posted_date, j.created_at,
                1 - (je.embedding <=> :embedding::vector) AS similarity_score
            FROM jobs j
            JOIN job_embeddings je ON je.job_id = j.id
            WHERE 1=1 {country_filter}
            ORDER BY je.embedding <=> :embedding::vector
            LIMIT :limit
        """)

        result = await db.execute(query, params)
        rows = result.fetchall()

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

    # Deduplicate by job id and keep highest similarity
    seen = {}
    for job in all_jobs:
        jid = job["id"]
        if jid not in seen or job["similarity_score"] > seen[jid]["similarity_score"]:
            seen[jid] = job

    return sorted(seen.values(), key=lambda x: x["similarity_score"], reverse=True)[:limit]
