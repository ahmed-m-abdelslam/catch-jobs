import asyncio
import ssl as ssl_module
from celery import shared_task
from app.tasks.celery_app import celery_app


def get_ssl_context():
    ctx = ssl_module.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl_module.CERT_NONE
    return ctx


@celery_app.task(name="app.tasks.scrape_tasks.scrape_all_jobs")
def scrape_all_jobs():
    print("[Celery] Starting scheduled scrape...")
    result = asyncio.run(_run_scrape())
    print(f"[Celery] Done: {result}")
    return result


@celery_app.task(name="app.tasks.scrape_tasks.scrape_single_source")
def scrape_single_source(source_name):
    print(f"[Celery] Scraping {source_name}...")
    result = asyncio.run(_run_scrape(sources=[source_name]))
    print(f"[Celery] Done: {result}")
    return result


async def _run_scrape(sources=None):
    from app.scrapers.remoteok import RemoteOKScraper
    from app.scrapers.wuzzuf import WuzzufScraper
    from app.scrapers.linkedin import LinkedInScraper
    from app.scrapers.arbeitnow import ArbeitnowScraper
    from app.scrapers.jobicy import JobicyScraper
    import asyncpg
    from app.config import get_settings

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

    terms = ["software engineer", "data scientist", "frontend developer", "backend developer",
             "devops engineer", "data analyst", "product manager", "UI/UX designer"]
    all_jobs = []

    for name, scraper in scrapers.items():
        try:
            jobs = await scraper.scrape(terms, max_pages=2)
            print(f"  {name}: {len(jobs)} jobs")
            all_jobs.extend(jobs)
        except Exception as e:
            print(f"  {name}: ERROR {e}")
        await asyncio.sleep(2)

    print(f"  Total scraped: {len(all_jobs)}")

    # Connect to database
    settings = get_settings()
    db_url = settings.database_url

    # Parse connection from SQLAlchemy URL to asyncpg format
    # postgresql+asyncpg://user:pass@host:port/db?ssl=require
    import re
    match = re.match(r"postgresql\+asyncpg://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)", db_url)
    if not match:
        print("  ERROR: Could not parse DATABASE_URL")
        return {"error": "bad db url"}

    user, password, host, port, dbname = match.groups()
    # URL decode password
    from urllib.parse import unquote
    password = unquote(password)

    ssl_ctx = get_ssl_context()
    conn = await asyncpg.connect(
        host=host, port=int(port), user=user,
        password=password, database=dbname, ssl=ssl_ctx
    )

    existing = await conn.fetch("SELECT job_url FROM jobs")
    existing_urls = set(r["job_url"] for r in existing)

    new_count = 0
    for j in all_jobs:
        if j.job_url not in existing_urls:
            try:
                await conn.execute(
                    """INSERT INTO jobs (title, company_name, location, country, description, job_url, source, posted_date)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                    j.title, j.company_name, j.location, j.country,
                    j.description, j.job_url, j.source, j.posted_date
                )
                existing_urls.add(j.job_url)
                new_count += 1
            except:
                pass

    total = await conn.fetchval("SELECT COUNT(*) FROM jobs")
    await conn.close()

    result = {
        "total_scraped": len(all_jobs),
        "new_jobs": new_count,
        "total_in_db": total,
    }
    print(f"  New: {new_count}, Total in DB: {total}")
    return result
