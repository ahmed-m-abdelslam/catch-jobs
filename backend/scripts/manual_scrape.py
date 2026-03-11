import sys, os, asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.config import get_settings
from app.models.job import Job
from app.scrapers.remoteok import RemoteOKScraper
from app.scrapers.wuzzuf import WuzzufScraper
from app.scrapers.linkedin import LinkedInScraper
from app.scrapers.arbeitnow import ArbeitnowScraper
from app.scrapers.jobicy import JobicyScraper


async def main():
    settings = get_settings()
    eng = create_async_engine(settings.database_url, pool_size=5)
    Session = sessionmaker(eng, class_=AsyncSession, expire_on_commit=False)

    scrapers = [
        RemoteOKScraper(),
        WuzzufScraper(),
        LinkedInScraper(),
        ArbeitnowScraper(),
        JobicyScraper(),
    ]
    terms = ["software engineer", "data scientist", "frontend developer", "backend developer"]
    all_jobs = []

    for s in scrapers:
        try:
            jobs = await s.scrape(terms, max_pages=2)
            print(f"{s.source_name}: {len(jobs)} jobs")
            all_jobs.extend(jobs)
        except Exception as e:
            print(f"{s.source_name}: ERROR {e}")
        await asyncio.sleep(2)

    print(f"\nTotal scraped: {len(all_jobs)}")

    # Save to DB
    async with Session() as db:
        result = await db.execute(select(Job.job_url))
        existing = set(row for row in result.scalars().all())

        new_count = 0
        for j in all_jobs:
            if j.job_url not in existing:
                job = Job(
                    title=j.title,
                    company_name=j.company_name,
                    location=j.location,
                    country=j.country,
                    description=j.description,
                    job_url=j.job_url,
                    source=j.source,
                    posted_date=j.posted_date,
                )
                db.add(job)
                existing.add(j.job_url)
                new_count += 1

        await db.commit()
        print(f"New jobs added: {new_count}")
        print(f"Duplicates skipped: {len(all_jobs) - new_count}")

        # Show totals
        from sqlalchemy import func
        total = await db.execute(select(func.count(Job.id)))
        print(f"Total jobs in DB: {total.scalar()}")

        by_country = await db.execute(
            select(Job.country, func.count(Job.id))
            .group_by(Job.country)
            .order_by(func.count(Job.id).desc())
            .limit(15)
        )
        print("\nTop countries:")
        for country, count in by_country.fetchall():
            print(f"  {country}: {count}")

    await eng.dispose()

asyncio.run(main())
