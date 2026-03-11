import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.scrapers.remoteok import RemoteOKScraper
from app.scrapers.wuzzuf import WuzzufScraper
from app.scrapers.linkedin import LinkedInScraper
from app.scrapers.arbeitnow import ArbeitnowScraper
from app.scrapers.jobicy import JobicyScraper
from app.scrapers.himalayas import HimalayasScraper


async def test_scraper(scraper, terms):
    name = scraper.source_name
    try:
        jobs = await scraper.scrape(search_terms=terms, max_pages=1)
        status = "OK" if len(jobs) > 0 else "EMPTY"
        print(f"  {name:15s} -> {len(jobs):4d} jobs  [{status}]")
        if jobs:
            j = jobs[0]
            print(f"                    Title:   {j.title[:55]}")
            if j.company_name:
                print(f"                    Company: {j.company_name[:40]}")
            if j.country:
                print(f"                    Country: {j.country}")
        return name, len(jobs), status
    except Exception as e:
        print(f"  {name:15s} -> ERROR: {str(e)[:80]}")
        return name, 0, f"ERROR: {str(e)[:50]}"


async def main():
    print("=" * 60)
    print("  TESTING ALL SCRAPERS")
    print("=" * 60)
    print()

    scrapers = [
        RemoteOKScraper(),
        WuzzufScraper(),
        LinkedInScraper(),
        ArbeitnowScraper(),
        JobicyScraper(),
        HimalayasScraper(),
    ]

    search_terms = ["software engineer", "data scientist"]
    results = []

    for scraper in scrapers:
        result = await test_scraper(scraper, search_terms)
        results.append(result)
        print()
        await asyncio.sleep(2)

    # Summary
    print("=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    total = 0
    working = []
    failed = []
    for name, count, status in results:
        icon = "OK" if count > 0 else "FAIL"
        print(f"  [{icon:4s}] {name:15s}: {count:4d} jobs")
        total += count
        if count > 0:
            working.append(name)
        else:
            failed.append(name)

    print(f"\n  Total jobs found: {total}")
    print(f"  Working: {len(working)}/6 scrapers -> {working}")
    if failed:
        print(f"  Failed:  {failed}")


asyncio.run(main())
