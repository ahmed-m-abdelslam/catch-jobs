import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.job import Job, JobEmbedding
from app.models.preference import UserPreference
from app.scrapers.base import BaseScraper, ScrapedJob
from app.scrapers.wuzzuf import WuzzufScraper
from app.scrapers.linkedin import LinkedInScraper
from app.scrapers.glassdoor import GlassdoorScraper
from app.scrapers.bayt import BaytScraper
from app.scrapers.naukrigulf import NaukriGulfScraper
from app.scrapers.remoteok import RemoteOKScraper
from app.services.embedding import generate_embedding_for_job
from app.services.matching import find_matching_users_for_job
from app.services.notification import notify_matched_users


# Default search terms to scrape
DEFAULT_SEARCH_TERMS = [
    "software engineer",
    "data scientist",
    "machine learning engineer",
    "AI engineer",
    "backend developer",
    "frontend developer",
    "full stack developer",
    "devops engineer",
    "cloud engineer",
    "data analyst",
    "product manager",
    "cybersecurity",
    "mobile developer",
    "QA engineer",
    "UI/UX designer",
]


def get_all_scrapers() -> list[BaseScraper]:
    """
    Return all active scraper instances.
    Comment out any scraper that requires special setup (proxies, API keys, etc.)
    """
    return [
        RemoteOKScraper(),        # Most reliable — public JSON API
        WuzzufScraper(),          # MENA region — server-rendered HTML
        BaytScraper(),            # Middle East — server-rendered HTML
        NaukriGulfScraper(),      # Gulf region — HTML + internal API
        LinkedInScraper(),        # Global — public guest pages (rate-limited)
        GlassdoorScraper(),       # Global — aggressive anti-bot (may need proxies)
    ]


async def run_scraping_pipeline(
    db: AsyncSession,
    search_terms: list[str] | None = None,
    sources: list[str] | None = None,
    max_pages: int = 3,
    generate_embeddings: bool = True,
    run_matching: bool = True,
):
    """
    Full scraping pipeline:
    1. Scrape from all configured sources
    2. Deduplicate and insert new jobs
    3. Generate embeddings for new jobs
    4. Match new jobs with user preferences
    5. Send notifications to matched users

    Args:
        db: Database session
        search_terms: Custom search terms (uses defaults if None)
        sources: List of source names to scrape (scrapes all if None)
        max_pages: Max pages to scrape per search term per source
        generate_embeddings: Whether to generate embeddings (requires OpenAI key)
        run_matching: Whether to run user matching after scraping
    """
    start_time = datetime.utcnow()
    print(f"\n{'='*60}")
    print(f"Starting scraping pipeline at {start_time}")
    print(f"{'='*60}\n")

    if search_terms is None:
        search_terms = DEFAULT_SEARCH_TERMS

    # Optionally enrich search terms with user preferences
    user_terms = await _get_user_search_terms(db)
    all_terms = list(set(search_terms + user_terms))
    print(f"Search terms: {len(all_terms)} total ({len(user_terms)} from user preferences)")

    # Get scrapers
    all_scrapers = get_all_scrapers()
    if sources:
        scrapers = [s for s in all_scrapers if s.source_name in sources]
    else:
        scrapers = all_scrapers

    print(f"Active scrapers: {[s.source_name for s in scrapers]}\n")

    # Step 1: Scrape from all sources
    all_scraped: list[ScrapedJob] = []
    scraper_stats: dict[str, dict] = {}

    for scraper in scrapers:
        scraper_name = scraper.source_name
        print(f"--- Scraping {scraper_name} ---")

        try:
            results = await scraper.scrape(all_terms, max_pages=max_pages)
            all_scraped.extend(results)
            scraper_stats[scraper_name] = {
                "scraped": len(results),
                "status": "success",
            }
            print(f"  Found {len(results)} jobs\n")
        except Exception as e:
            scraper_stats[scraper_name] = {
                "scraped": 0,
                "status": f"error: {str(e)[:100]}",
            }
            print(f"  ERROR: {e}\n")

    total_scraped = len(all_scraped)
    print(f"Total scraped across all sources: {total_scraped}")

    # Step 2: Deduplicate and insert new jobs
    new_jobs: list[Job] = []
    duplicate_count = 0

    # Batch check existing URLs for efficiency
    existing_urls = set()
    if all_scraped:
        urls_to_check = [s.job_url for s in all_scraped if s.job_url]
        # Check in batches of 500 to avoid huge IN queries
        for i in range(0, len(urls_to_check), 500):
            batch = urls_to_check[i:i + 500]
            result = await db.execute(
                select(Job.job_url).where(Job.job_url.in_(batch))
            )
            existing_urls.update(row[0] for row in result.fetchall())

    for scraped in all_scraped:
        if not scraped.job_url or not scraped.title:
            continue

        if scraped.job_url in existing_urls:
            duplicate_count += 1
            continue

        # Mark as seen to avoid duplicates within this batch
        existing_urls.add(scraped.job_url)

        job = Job(
            title=scraped.title,
            company_name=scraped.company_name,
            location=scraped.location,
            country=scraped.country,
            description=scraped.description,
            job_url=scraped.job_url,
            source=scraped.source,
            posted_date=scraped.posted_date,
        )
        db.add(job)
        new_jobs.append(job)

    await db.flush()
    print(f"\nInserted {len(new_jobs)} new jobs (skipped {duplicate_count} duplicates)")

    # Step 3: Generate embeddings
    embedding_count = 0
    embedding_errors = 0

    if generate_embeddings and new_jobs:
        print(f"\nGenerating embeddings for {len(new_jobs)} new jobs...")

        for i, job in enumerate(new_jobs):
            try:
                embedding = generate_embedding_for_job(
                    title=job.title,
                    company=job.company_name,
                    description=job.description,
                )
                job_embedding = JobEmbedding(job_id=job.id, embedding=embedding)
                db.add(job_embedding)
                embedding_count += 1

                # Progress logging
                if (i + 1) % 50 == 0:
                    print(f"  Generated {i + 1}/{len(new_jobs)} embeddings")
                    await db.flush()  # Flush periodically





            except Exception as e:
                embedding_errors += 1
                print(f"  Embedding error for '{job.title}': {e}")

        await db.flush()
        print(f"  Embeddings: {embedding_count} generated, {embedding_errors} errors")

    # Step 4 & 5: Match and notify
    match_count = 0
    notification_count = 0

    if run_matching and new_jobs:
        print(f"\nMatching {len(new_jobs)} new jobs with user preferences...")

        for job in new_jobs:
            try:
                result = await db.execute(
                    select(JobEmbedding).where(JobEmbedding.job_id == job.id)
                )
                job_emb = result.scalar_one_or_none()
                if not job_emb:
                    continue

                matched_users = await find_matching_users_for_job(
                    job=job,
                    job_embedding=list(job_emb.embedding),
                    db=db,
                )

                if matched_users:
                    match_count += 1
                    notification_count += len(matched_users)
                    await notify_matched_users(job, matched_users, db)

            except Exception as e:
                print(f"  Matching error for '{job.title}': {e}")

        print(f"  Matched: {match_count} jobs → {notification_count} notifications")

    # Commit everything
    await db.commit()

    # Summary
    elapsed = (datetime.utcnow() - start_time).total_seconds()
    print(f"\n{'='*60}")
    print(f"Pipeline complete in {elapsed:.1f}s")
    print(f"{'='*60}")
    print(f"Sources scraped: {len(scrapers)}")
    print(f"Total jobs found: {total_scraped}")
    print(f"New jobs inserted: {len(new_jobs)}")
    print(f"Duplicates skipped: {duplicate_count}")
    print(f"Embeddings generated: {embedding_count}")
    print(f"Jobs matched: {match_count}")
    print(f"Notifications sent: {notification_count}")
    print()

    for source, stats in scraper_stats.items():
        print(f"  {source}: {stats['scraped']} jobs ({stats['status']})")

    return {
        "total_scraped": total_scraped,
        "new_jobs": len(new_jobs),
        "duplicates": duplicate_count,
        "embeddings": embedding_count,
        "matches": match_count,
        "notifications": notification_count,
        "elapsed_seconds": elapsed,
        "scraper_stats": scraper_stats,
    }


async def _get_user_search_terms(db: AsyncSession) -> list[str]:
    """Extract unique job titles from all user preferences to use as search terms."""
    result = await db.execute(
        select(UserPreference.job_title).distinct()
    )
    return [row[0] for row in result.fetchall() if row[0]]


async def run_single_source(
    db: AsyncSession,
    source_name: str,
    search_terms: list[str] | None = None,
    max_pages: int = 3,
):
    """Run scraping pipeline for a single source only."""
    return await run_scraping_pipeline(
        db=db,
        search_terms=search_terms,
        sources=[source_name],
        max_pages=max_pages,
    )
