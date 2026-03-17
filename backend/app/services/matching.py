import uuid
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.job import Job, JobEmbedding
from app.models.preference import UserPreference
from app.services.embedding import generate_embedding_for_preference

# Minimum similarity to include a job
MIN_THRESHOLD = 0.45

# Bonus for title keyword match
TITLE_KEYWORD_BOOST = 0.15


def _extract_keywords(text_str: str) -> set:
    """Extract meaningful keywords from preference title."""
    if not text_str:
        return set()
    stop_words = {"the", "a", "an", "and", "or", "in", "at", "of", "for", "to", "is", "with", "on", "by"}
    words = re.findall(r'[a-zA-Z]+', text_str.lower())
    return {w for w in words if len(w) > 2 and w not in stop_words}


def _calculate_boosted_score(base_score: float, job_title: str, pref_keywords: set) -> float:
    """Boost score if job title contains preference keywords."""
    if not pref_keywords or not job_title:
        return base_score

    job_words = set(re.findall(r'[a-zA-Z]+', job_title.lower()))
    matching = pref_keywords & job_words

    if matching:
        # Boost proportional to how many keywords match
        match_ratio = len(matching) / len(pref_keywords)
        boost = TITLE_KEYWORD_BOOST * match_ratio
        return min(base_score + boost, 1.0)

    return base_score


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
        pref_keywords = _extract_keywords(pref.job_title)

        # Fetch more candidates than needed, then filter
        fetch_limit = limit * 3

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
            rows_result = await db.execute(query, {"emb": embedding_str, "country": f"%{pref.country}%", "lim": fetch_limit})
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
            rows_result = await db.execute(query, {"emb": embedding_str, "lim": fetch_limit})

        rows = rows_result.fetchall()

        for row in rows:
            base_score = float(row.similarity_score)

            # Skip low-relevance jobs
            if base_score < MIN_THRESHOLD:
                continue

            # Boost score based on keyword match
            boosted_score = _calculate_boosted_score(base_score, row.title, pref_keywords)

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
                "similarity_score": round(boosted_score, 4),
            })

    # Deduplicate keeping highest score
    seen = {}
    for job in all_jobs:
        jid = job["id"]
        if jid not in seen or job["similarity_score"] > seen[jid]["similarity_score"]:
            seen[jid] = job

    return sorted(seen.values(), key=lambda x: x["similarity_score"], reverse=True)[:limit]
