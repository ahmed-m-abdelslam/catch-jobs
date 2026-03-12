import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.scrapers.remoteok import RemoteOKScraper
from app.scrapers.wuzzuf import WuzzufScraper
from app.scrapers.linkedin import LinkedInScraper
from app.scrapers.arbeitnow import ArbeitnowScraper
from app.scrapers.jobicy import JobicyScraper
import asyncpg
import ssl as ssl_module

async def main():
    scrapers = [RemoteOKScraper(), WuzzufScraper(), LinkedInScraper(), ArbeitnowScraper(), JobicyScraper()]
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

    ssl_ctx = ssl_module.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl_module.CERT_NONE

    conn = await asyncpg.connect(
        host="aws-1-eu-west-1.pooler.supabase.com",
        port=5432,
        user="postgres.jwaqymocwbkfwllxhlpi",
        password="Ahmed1999Mahmoud",
        database="postgres",
        ssl=ssl_ctx
    )
    print("Connected to Supabase!")

    existing = await conn.fetch("SELECT job_url FROM jobs")
    existing_urls = set(r["job_url"] for r in existing)
    print(f"Existing jobs: {len(existing_urls)}")

    new_count = 0
    for j in all_jobs:
        if j.job_url not in existing_urls:
            try:
                await conn.execute(
                    """INSERT INTO jobs (title, company_name, location, country, description, job_url, source, posted_date)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                    j.title, j.company_name, j.location, j.country, j.description, j.job_url, j.source, j.posted_date
                )
                existing_urls.add(j.job_url)
                new_count += 1
            except Exception as e:
                pass

    total = await conn.fetchval("SELECT COUNT(*) FROM jobs")
    print(f"New jobs added: {new_count}")
    print(f"Total jobs in Supabase: {total}")

    await conn.close()

asyncio.run(main())
