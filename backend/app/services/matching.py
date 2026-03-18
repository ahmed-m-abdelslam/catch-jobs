import uuid
from datetime import datetime, timedelta
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.job import Job, JobEmbedding
from app.models.preference import UserPreference
from app.services.embedding import generate_embedding_for_preference

# Minimum similarity to include a job
MIN_THRESHOLD = 0.65

# Bonus for title keyword match
TITLE_KEYWORD_BOOST = 0.10


def _extract_keywords(text_str: str) -> set:
    """Extract meaningful keywords from preference title."""
    if not text_str:
        return set()
    stop_words = {"the", "a", "an", "and", "or", "in", "at", "of", "for", "to", "is", "with", "on", "by"}
    words = re.findall(r'[a-zA-Z]+', text_str.lower())
    return {w for w in words if len(w) > 2 and w not in stop_words}


# Generic words that shouldn't boost on their own
GENERIC_WORDS = {"engineer", "manager", "senior", "junior", "lead", "specialist", "analyst", "developer", "consultant", "director", "officer", "associate", "assistant", "intern", "head", "chief", "staff"}


def _calculate_boosted_score(base_score: float, job_title: str, pref_keywords: set) -> float:
    """Boost score if job title contains preference keywords."""
    if not pref_keywords or not job_title:
        return base_score

    job_words = set(re.findall(r'[a-zA-Z]+', job_title.lower()))
    matching = pref_keywords & job_words

    if not matching:
        return base_score

    # Filter out generic words from matching
    meaningful_matches = matching - GENERIC_WORDS
    meaningful_pref = pref_keywords - GENERIC_WORDS

    if not meaningful_pref:
        # All pref keywords are generic, use full match ratio
        match_ratio = len(matching) / len(pref_keywords)
    elif meaningful_matches:
        # Boost based on meaningful keyword matches
        match_ratio = len(meaningful_matches) / len(meaningful_pref)
    else:
        # Only generic words matched — no boost
        return base_score

    if match_ratio >= 0.8:
        boost = TITLE_KEYWORD_BOOST
    elif match_ratio >= 0.5:
        boost = TITLE_KEYWORD_BOOST * 0.5
    else:
        boost = TITLE_KEYWORD_BOOST * 0.1

    return min(base_score + boost, 1.0)


async def get_recommended_jobs_for_user(
    user_id: uuid.UUID,
    db: AsyncSession,
    limit: int = 100,
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
        fetch_limit = limit * 10

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

    # Deduplicate by ID first
    seen_ids = {}
    for job in all_jobs:
        jid = job["id"]
        if jid not in seen_ids or job["similarity_score"] > seen_ids[jid]["similarity_score"]:
            seen_ids[jid] = job

    # Then deduplicate by title+company (keep newest)
    seen_title = {}
    for job in seen_ids.values():
        key = (job.get("title", "").strip().lower(), job.get("company", "").strip().lower())
        if key not in seen_title:
            seen_title[key] = job
        else:
            existing = seen_title[key]
            # Keep the newer one
            if (job.get("created_at") or "") > (existing.get("created_at") or ""):
                seen_title[key] = job

    # Sort by date (newest first) after AI filtering
    return sorted(seen_title.values(), key=lambda x: x.get("created_at") or "", reverse=True)[:limit]
