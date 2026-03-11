import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.scrapers.remoteok import RemoteOKScraper


async def test():
    scraper = RemoteOKScraper()
    print(f"Testing {scraper.source_name}...")
    print("=" * 50)

    jobs = await scraper.scrape(
        search_terms=["software engineer", "data scientist"],
        max_pages=1
    )

    print(f"\nFound {len(jobs)} jobs\n")

    for i, job in enumerate(jobs[:5]):
        print(f"--- Job {i+1} ---")
        print(f"  Title:    {job.title}")
        print(f"  Company:  {job.company_name}")
        print(f"  Location: {job.location}")
        print(f"  Country:  {job.country}")
        print(f"  URL:      {job.job_url[:80]}")
        print(f"  Date:     {job.posted_date}")
        print()

    if len(jobs) == 0:
        print("No jobs found. Check your internet connection.")


asyncio.run(test())
