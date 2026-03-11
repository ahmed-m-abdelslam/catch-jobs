import httpx
from datetime import datetime, date
import asyncio

from app.scrapers.base import BaseScraper, ScrapedJob


class ArbeitnowScraper(BaseScraper):
    source_name = "arbeitnow"
    API_URL = "https://www.arbeitnow.com/api/job-board-api"

    async def scrape(self, search_terms: list[str], max_pages: int = 3) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_urls: set[str] = set()

        async with httpx.AsyncClient(
            timeout=30,
            headers={"User-Agent": "JobMatcher/1.0"},
            follow_redirects=True,
        ) as client:
            for page in range(1, max_pages + 1):
                try:
                    response = await client.get(self.API_URL, params={"page": page})

                    if response.status_code != 200:
                        print(f"[Arbeitnow] Status {response.status_code} page {page}")
                        break

                    data = response.json()
                    job_list = data.get("data", [])

                    if not job_list:
                        break

                    # Build word list from search terms for flexible matching
                    search_words = set()
                    for term in search_terms:
                        for word in term.lower().split():
                            if len(word) > 2:
                                search_words.add(word)

                    for item in job_list:
                        title = item.get("title", "")
                        description = item.get("description", "")
                        tags = item.get("tags", [])
                        if isinstance(tags, list):
                            tags_text = " ".join(str(t) for t in tags)
                        else:
                            tags_text = str(tags)

                        searchable = f"{title} {tags_text}".lower()

                        # Match if any word from search terms appears
                        if not any(word in searchable for word in search_words):
                            continue

                        job_url = item.get("url", "")
                        if not job_url or job_url in seen_urls:
                            continue
                        seen_urls.add(job_url)

                        location = item.get("location", "")
                        remote = item.get("remote", False)
                        if remote and not location:
                            location = "Remote"

                        posted_date = None
                        created = item.get("created_at")
                        if created:
                            try:
                                if isinstance(created, (int, float)):
                                    posted_date = datetime.fromtimestamp(created).date()
                                else:
                                    posted_date = date.fromisoformat(str(created)[:10])
                            except (ValueError, TypeError, OSError):
                                pass

                        jobs.append(ScrapedJob(
                            title=title,
                            company_name=item.get("company_name"),
                            location=location if location else None,
                            country=self._detect_country(location, remote),
                            description=self._clean_text(description),
                            job_url=job_url,
                            source=self.source_name,
                            posted_date=posted_date,
                            tags=tags if isinstance(tags, list) else [],
                        ))

                    await asyncio.sleep(1)

                except Exception as e:
                    print(f"[Arbeitnow] Error page {page}: {e}")
                    break

        print(f"[Arbeitnow] Scraped {len(jobs)} jobs total")
        return jobs

    def _detect_country(self, location: str | None, remote: bool = False) -> str | None:
        if remote and not location:
            return "Remote"
        if not location:
            return None
        loc = location.lower()
        mapping = {
            "germany": "Germany", "berlin": "Germany", "munich": "Germany",
            "hamburg": "Germany", "frankfurt": "Germany",
            "united states": "United States", "usa": "United States",
            "new york": "United States", "san francisco": "United States",
            "united kingdom": "United Kingdom", "london": "United Kingdom",
            "france": "France", "paris": "France",
            "netherlands": "Netherlands", "amsterdam": "Netherlands",
            "spain": "Spain", "canada": "Canada",
            "australia": "Australia", "india": "India",
            "uae": "UAE", "dubai": "UAE",
            "egypt": "Egypt", "cairo": "Egypt",
            "remote": "Remote",
        }
        for key, val in mapping.items():
            if key in loc:
                return val
        parts = location.split(",")
        return parts[-1].strip() if len(parts) > 1 else None
