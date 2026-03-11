import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy import select, func
from app.database import async_session, engine
from app.models.job import Job
from app.scrapers.remoteok import RemoteOKScraper
from app.scrapers.wuzzuf import WuzzufScraper
from app.scrapers.linkedin import LinkedInScraper
from app.scrapers.arbeitnow import ArbeitnowScraper
from app.scrapers.jobicy import JobicyScraper
from app.scrapers.himalayas import HimalayasScraper


async def main():
    scrapers = [
        RemoteOKScraper(),
        WuzzufScraper(),
        LinkedInScraper(),
        ArbeitnowScraper(),
        JobicyScraper(),
        HimalayasScraper(),
    ]

    search_terms = [
        "software engineer",
        "data scientist",
        "AI engineer",
        "backend developer",
        "frontend developer",
        "devops",
        "machine learning",
    ]

    print("=" * 60)
    print("  SCRAPE AND SAVE TO DATABASE")
    print("=" * 60)

    # Step 1: Scrape all sources
    all_scraped = []
    for scraper in scrapers:
        name = scraper.source_name
        print(f"\n[{name}] Scraping...")
        try:
            results = await scraper.scrape(search_terms, max_pages=2)
            all_scraped.extend(results)
            print(f"[{name}] Got {len(results)} jobs")
        except Exception as e:
            print(f"[{name}] ERROR: {e}")
        await asyncio.sleep(2)

    print(f"\nTotal scraped: {len(all_scraped)}")

    # Step 2: Save to database
    print("\n--- Saving to Database ---")
    async with async_session() as db:
        # Get existing URLs in one query
        existing_result = await db.execute(select(Job.job_url))
        existing_urls = {row[0] for row in existing_result.fetchall()}

        new_count = 0
        dup_count = 0
        error_count = 0

        for scraped in all_scraped:
            if not scraped.job_url or not scraped.title:
                error_count += 1
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
        print(f"  New jobs:    {new_count}")
        print(f"  Duplicates:  {dup_count}")
        print(f"  Skipped:     {error_count}")

    # Step 3: Database stats
    print("\n--- Database Stats ---")
    async with async_session() as db:
        total = await db.execute(select(func.count(Job.id)))
        print(f"  Total jobs in DB: {total.scalar()}")

        sources = await db.execute(
            select(Job.source, func.count(Job.id))
            .group_by(Job.source)
            .order_by(func.count(Job.id).desc())
        )
        print("\n  By source:")
        for source, count in sources.fetchall():
            print(f"    {source:15s}: {count}")

        countries = await db.execute(
            select(Job.country, func.count(Job.id))
            .where(Job.country.isnot(None))
            .group_by(Job.country)
            .order_by(func.count(Job.id).desc())
            .limit(15)
        )
        print("\n  By country:")
        for country, count in countries.fetchall():
            print(f"    {country:20s}: {count}")

    await engine.dispose()
    print("\nDone!")


asyncio.run(main())