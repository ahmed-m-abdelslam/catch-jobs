import asyncio
import os
import ssl
import logging
from celery import shared_task
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

def get_db_url():
    url = os.getenv("DATABASE_URL", "postgresql+asyncpg://jobuser:jobpass@localhost:5432/jobmatcher")
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("?ssl=require", "?sslmode=require")
    if "sslmode" not in url and "supabase" in url:
        url += "?sslmode=require" if "?" not in url else "&sslmode=require"
    return url

def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

async def save_jobs_to_db(jobs, source_name):
    """Save jobs from a single source and generate embeddings."""
    import asyncpg
    if not jobs:
        return 0, []

    url = get_db_url()
    conn = await asyncpg.connect(url, ssl=get_ssl_context())

    try:
        existing = await conn.fetch("SELECT job_url FROM jobs")
        existing_urls = {r["job_url"] for r in existing}

        new_count = 0
        new_job_ids = []
        for j in jobs:
            if j.job_url not in existing_urls:
                try:
                    row = await conn.fetchrow("""
                        INSERT INTO jobs (id, title, company_name, location, country, description, job_url, source, posted_date, created_at)
                        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
                        RETURNING id
                    """, j.title, j.company_name, j.location, j.country,
                        getattr(j, 'description', None), j.job_url, j.source,
                        j.posted_date)
                    existing_urls.add(j.job_url)
                    new_count += 1
                    new_job_ids.append({
                        "id": str(row["id"]),
                        "title": j.title,
                        "company": j.company_name,
                        "description": getattr(j, 'description', None),
                    })
                except Exception as e:
                    logger.warning(f"Skip duplicate: {e}")

        logger.warning(f"[DB] {source_name}: +{new_count} new jobs saved")
        return new_count, new_job_ids
    finally:
        await conn.close()


async def generate_embeddings_for_new_jobs(new_job_ids):
    """Generate OpenAI embeddings for newly added jobs."""
    import asyncpg
    from app.services.embedding import generate_embedding_for_job

    if not new_job_ids:
        return 0

    url = get_db_url()
    conn = await asyncpg.connect(url, ssl=get_ssl_context())

    embedded = 0
    try:
        for job in new_job_ids:
            try:
                embedding = generate_embedding_for_job(
                    title=job["title"] or "",
                    company=job["company"] or "",
                    description=(job["description"] or "")[:500],
                )

                if all(x == 0.0 for x in embedding[:10]):
                    continue

                await conn.execute("""
                    INSERT INTO job_embeddings (id, job_id, embedding)
                    VALUES (gen_random_uuid(), $1, $2)
                    ON CONFLICT (job_id) DO NOTHING
                """, job["id"], str(embedding))
                embedded += 1

            except Exception as e:
                logger.warning(f"Embedding error for {job['id']}: {e}")

        logger.warning(f"[Embeddings] Generated {embedded}/{len(new_job_ids)} embeddings")
    finally:
        await conn.close()

    return embedded


async def create_notifications_for_new_jobs(new_job_ids):
    """Match new jobs with user preferences and create notifications."""
    import asyncpg
    from app.services.embedding import generate_embedding_for_preference

    if not new_job_ids:
        return 0

    url = get_db_url()
    conn = await asyncpg.connect(url, ssl=get_ssl_context())

    notif_count = 0
    try:
        # Get all user preferences
        prefs = await conn.fetch("SELECT id, user_id, job_title, country FROM user_preferences")
        if not prefs:
            return 0

        for pref in prefs:
            try:
                pref_embedding = generate_embedding_for_preference(
                    pref["job_title"], pref["country"]
                )
                emb_str = "[" + ",".join(str(x) for x in pref_embedding) + "]"

                # Find matching new jobs
                for job in new_job_ids:
                    try:
                        result = await conn.fetchrow("""
                            SELECT 1 - (je.embedding <=> $1::vector) AS score
                            FROM job_embeddings je
                            WHERE je.job_id = $2
                        """, emb_str, job["id"])

                        if result and result["score"] >= 0.65:
                            # Create notification
                            await conn.execute("""
                                INSERT INTO user_notifications (id, user_id, job_id, is_read, created_at)
                                VALUES (gen_random_uuid(), $1, $2, false, NOW())
                                ON CONFLICT DO NOTHING
                            """, pref["user_id"], job["id"])
                            notif_count += 1
                            # Send email notification
                            try:
                                user_row = await conn.fetchrow("SELECT email, full_name FROM users WHERE id = $1", pref["user_id"])
                                job_row = await conn.fetchrow("SELECT title, company, job_url FROM jobs WHERE id = $1", job["id"])
                                if user_row and job_row and user_row["email"]:
                                    from app.services.notification import send_email_notification
                                    await send_email_notification(
                                        user_row["email"],
                                        user_row["full_name"] or "User",
                                        job_row["title"],
                                        job_row["company"] or "",
                                        job_row["job_url"] or ""
                                    )
                            except Exception:
                                pass
                    except Exception as e:
                        pass

            except Exception as e:
                logger.warning(f"Notification matching error: {e}")

        logger.warning(f"[Notifications] Created {notif_count} notifications")
    finally:
        await conn.close()

    return notif_count


async def scrape_source(scraper, terms, max_pages=2):
    """Scrape a single source, save, and generate embeddings."""
    all_jobs = []
    for term in terms:
        try:
            # Pass term as list since scrapers expect list[str]
            jobs = await scraper.scrape([term], max_pages=max_pages)
            all_jobs.extend(jobs)
        except Exception as e:
            logger.warning(f"[{scraper.__class__.__name__}] Error '{term}': {e}")

    source_name = scraper.__class__.__name__.replace("Scraper", "").lower()
    logger.warning(f"[{source_name}] Scraped {len(all_jobs)} jobs")

    new_count, new_job_ids = await save_jobs_to_db(all_jobs, source_name)

    # Generate embeddings for new jobs
    embedded = await generate_embeddings_for_new_jobs(new_job_ids)

    # Create notifications for matching users
    notifs = await create_notifications_for_new_jobs(new_job_ids)

    return {"source": source_name, "scraped": len(all_jobs), "new": new_count, "embedded": embedded, "notifications": notifs}


async def _run_scrape(sources=None):
    from app.scrapers.remoteok import RemoteOKScraper
    from app.scrapers.wuzzuf import WuzzufScraper
    from app.scrapers.linkedin import LinkedInScraper
    from app.scrapers.arbeitnow import ArbeitnowScraper
    from app.scrapers.jobicy import JobicyScraper

    all_scrapers = {
        "remoteok": RemoteOKScraper(),
        "wuzzuf": WuzzufScraper(),
        "linkedin": LinkedInScraper(),
        "arbeitnow": ArbeitnowScraper(),
        "jobicy": JobicyScraper(),
    }

    if sources:
        scrapers = {k: v for k, v in all_scrapers.items() if k in sources}
    else:
        scrapers = all_scrapers

    # Default search terms
    terms = [
        "software engineer", "data scientist", "frontend developer",
        "backend developer", "devops engineer", "data analyst",
        "product manager", "UI/UX designer", "machine learning engineer",
        "AI engineer", "full stack developer", "cloud engineer",
        "cybersecurity", "mobile developer", "QA engineer",
        "data engineer", "python developer", "java developer",
        "system administrator", "network engineer",
    ]

    # Add user preference terms dynamically
    try:
        import asyncpg
        url = get_db_url()
        conn = await asyncpg.connect(url, ssl=get_ssl_context())
        prefs = await conn.fetch("SELECT DISTINCT job_title FROM user_preferences")
        await conn.close()
        user_terms = [p["job_title"] for p in prefs if p["job_title"]]
        terms = list(set(terms + user_terms))
        logger.warning(f"[Terms] {len(terms)} search terms ({len(user_terms)} from user preferences)")
    except Exception as e:
        logger.warning(f"[Terms] Could not load user prefs: {e}")

    results = []
    total_new = 0
    total_embedded = 0

    for name, scraper in scrapers.items():
        try:
            result = await scrape_source(scraper, terms)
            results.append(result)
            total_new += result["new"]
            total_embedded += result.get("embedded", 0)
            logger.warning(f"[Done] {name}: {result['new']} new, {result.get('embedded', 0)} embedded")
        except Exception as e:
            logger.warning(f"[Error] {name}: {e}")
            results.append({"source": name, "scraped": 0, "new": 0, "embedded": 0, "error": str(e)})

    logger.warning(f"[Complete] Total: {total_new} new jobs, {total_embedded} embeddings")
    return {"results": results, "total_new": total_new, "total_embedded": total_embedded}


@celery_app.task(name="app.tasks.scrape_tasks.scrape_all_jobs")
def scrape_all_jobs():
    logger.warning("[Celery] Starting scheduled scrape...")
    result = asyncio.run(_run_scrape())
    logger.warning(f"[Celery] Scrape complete: {result}")
    return result


@celery_app.task(name="app.tasks.scrape_tasks.scrape_single_source")
def scrape_single_source(source_name):
    logger.warning(f"[Celery] Scraping {source_name}...")
    result = asyncio.run(_run_scrape(sources=[source_name]))
    logger.warning(f"[Celery] {source_name} complete: {result}")
    return result
