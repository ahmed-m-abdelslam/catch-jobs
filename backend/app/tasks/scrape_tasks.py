import asyncio
import os
import ssl
import logging
from celery import shared_task
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

def get_db_url():
    url = os.getenv("DATABASE_URL", "postgresql+asyncpg://jobuser:jobpass@localhost:5432/jobmatcher")
    # Convert to raw asyncpg format
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
    """Save jobs from a single source immediately"""
    import asyncpg
    if not jobs:
        return 0
    
    url = get_db_url()
    conn = await asyncpg.connect(url, ssl=get_ssl_context())
    
    try:
        existing = await conn.fetch("SELECT job_url FROM jobs")
        existing_urls = {r["job_url"] for r in existing}
        
        new_count = 0
        for j in jobs:
            if j.job_url not in existing_urls:
                try:
                    await conn.execute("""
                        INSERT INTO jobs (id, title, company_name, location, country, description, job_url, source, posted_date, created_at)
                        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
                    """, j.title, j.company_name, j.location, j.country,
                        getattr(j, 'description', None), j.job_url, j.source,
                        j.posted_date)
                    existing_urls.add(j.job_url)
                    new_count += 1
                except Exception as e:
                    logger.warning(f"Skip duplicate: {e}")
        
        logger.warning(f"[DB] {source_name}: +{new_count} new jobs saved immediately")
        return new_count
    finally:
        await conn.close()

async def scrape_source(scraper, terms, max_pages=2):
    """Scrape a single source and save immediately"""
    all_jobs = []
    for term in terms:
        try:
            jobs = await scraper.scrape(term, max_pages=max_pages)
            all_jobs.extend(jobs)
        except Exception as e:
            logger.warning(f"[{scraper.__class__.__name__}] Error '{term}': {e}")
    
    source_name = scraper.__class__.__name__.replace("Scraper", "").lower()
    logger.warning(f"[{source_name}] Scraped {len(all_jobs)} jobs")
    
    # Save to DB immediately after this source finishes
    new_count = await save_jobs_to_db(all_jobs, source_name)
    
    return {"source": source_name, "scraped": len(all_jobs), "new": new_count}

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
    
    terms = [
        "software engineer", "data scientist", "frontend developer",
        "backend developer", "devops engineer", "data analyst",
        "product manager", "UI/UX designer"
    ]
    
    results = []
    total_new = 0
    
    # Scrape each source and save immediately
    for name, scraper in scrapers.items():
        try:
            result = await scrape_source(scraper, terms)
            results.append(result)
            total_new += result["new"]
            logger.warning(f"[Done] {name}: {result['scraped']} scraped, {result['new']} new → saved to DB")
        except Exception as e:
            logger.warning(f"[Error] {name}: {e}")
            results.append({"source": name, "scraped": 0, "new": 0, "error": str(e)})
    
    logger.warning(f"[Complete] Total new jobs added: {total_new}")
    return {"results": results, "total_new": total_new}

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
