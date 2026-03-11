import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, func
from app.tasks.celery_app import celery_app
from app.config import get_settings

settings = get_settings()


def _get_async_session():
    engine = create_async_engine(settings.database_url, pool_size=5)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False), engine


@celery_app.task(
    name="app.tasks.scrape_tasks.scrape_all_jobs",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
)
def scrape_all_jobs(self):
    """Celery task: scrape all sources and save new jobs."""

    async def _run():
        from app.models.job import Job
        from app.scrapers.remoteok import RemoteOKScraper
        from app.scrapers.wuzzuf import WuzzufScraper
        from app.scrapers.linkedin import LinkedInScraper
        from app.scrapers.arbeitnow import ArbeitnowScraper
        from app.scrapers.jobicy import JobicyScraper

        session_factory, engine = _get_async_session()

        scrapers = [
            RemoteOKScraper(),
            WuzzufScraper(),
            LinkedInScraper(),
            ArbeitnowScraper(),
            JobicyScraper(),
        ]

        search_terms = [
            "software engineer",
            "data scientist",
            "AI engineer",
            "backend developer",
            "frontend developer",
            "devops",
            "machine learning",
            "data analyst",
            "product manager",
            "full stack developer",
        ]

        # Also add user preference terms
        async with session_factory() as db:
            from app.models.preference import UserPreference
            result = await db.execute(
                select(UserPreference.job_title).distinct()
            )
            user_terms = [row[0] for row in result.fetchall() if row[0]]
            all_terms = list(set(search_terms + user_terms))

        print(f"\n{'='*60}")
        print(f"[Celery] Starting scheduled scrape")
        print(f"[Celery] Search terms: {len(all_terms)}")
        print(f"{'='*60}")

        # Scrape all sources
        all_scraped = []
        scraper_results = {}

        for scraper in scrapers:
            name = scraper.source_name
            try:
                results = await scraper.scrape(all_terms, max_pages=2)
                all_scraped.extend(results)
                scraper_results[name] = len(results)
                print(f"[Celery] {name}: {len(results)} jobs")
            except Exception as e:
                scraper_results[name] = 0
                print(f"[Celery] {name}: ERROR - {str(e)[:80]}")
            await asyncio.sleep(3)

        # Save to database
        async with session_factory() as db:
            # Get existing URLs
            existing_result = await db.execute(select(Job.job_url))
            existing_urls = {row[0] for row in existing_result.fetchall()}

            new_count = 0
            dup_count = 0

            for scraped in all_scraped:
                if not scraped.job_url or not scraped.title:
                    continue

                if scraped.job_url in existing_urls:
                    dup_count += 1
                    continue

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
                new_count += 1

            await db.commit()

            # Get total count
            total_result = await db.execute(select(func.count(Job.id)))
            total = total_result.scalar()

        await engine.dispose()

        summary = {
            "total_scraped": len(all_scraped),
            "new_jobs": new_count,
            "duplicates": dup_count,
            "total_in_db": total,
            "by_source": scraper_results,
        }

        print(f"\n[Celery] Done: {new_count} new, {dup_count} duplicates, {total} total in DB")
        return summary

    try:
        return asyncio.run(_run())
    except Exception as exc:
        print(f"[Celery] Task failed: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(name="app.tasks.scrape_tasks.scrape_single_source")
def scrape_single_source(source_name: str):
    """Scrape a single source."""

    async def _run():
        from app.models.job import Job
        from app.scrapers.remoteok import RemoteOKScraper
        from app.scrapers.wuzzuf import WuzzufScraper
        from app.scrapers.linkedin import LinkedInScraper
        from app.scrapers.arbeitnow import ArbeitnowScraper
        from app.scrapers.jobicy import JobicyScraper

        scraper_map = {
            "remoteok": RemoteOKScraper,
            "wuzzuf": WuzzufScraper,
            "linkedin": LinkedInScraper,
            "arbeitnow": ArbeitnowScraper,
            "jobicy": JobicyScraper,
        }

        if source_name not in scraper_map:
            return {"error": f"Unknown source: {source_name}"}

        scraper = scraper_map[source_name]()
        session_factory, engine = _get_async_session()

        search_terms = ["software engineer", "data scientist", "AI engineer"]
        results = await scraper.scrape(search_terms, max_pages=2)

        async with session_factory() as db:
            existing_result = await db.execute(select(Job.job_url))
            existing_urls = {row[0] for row in existing_result.fetchall()}

            new_count = 0
            for scraped in results:
                if not scraped.job_url or scraped.job_url in existing_urls:
                    continue
                existing_urls.add(scraped.job_url)
                db.add(Job(
                    title=scraped.title,
                    company_name=scraped.company_name,
                    location=scraped.location,
                    country=scraped.country,
                    description=scraped.description,
                    job_url=scraped.job_url,
                    source=scraped.source,
                    posted_date=scraped.posted_date,
                ))
                new_count += 1

            await db.commit()

        await engine.dispose()
        return {"source": source_name, "scraped": len(results), "new": new_count}

    return asyncio.run(_run())
