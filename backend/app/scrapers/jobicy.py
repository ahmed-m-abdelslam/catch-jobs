import httpx
from datetime import datetime, date
import asyncio

from app.scrapers.base import BaseScraper, ScrapedJob


class JobicyScraper(BaseScraper):
    """
    Scrapes from Jobicy API (jobicy.com).
    Free public JSON API for remote jobs.
    """

    source_name = "jobicy"
    API_URL = "https://jobicy.com/api/v2/remote-jobs"

    async def scrape(self, search_terms: list[str], max_pages: int = 3) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_urls: set[str] = set()

        async with httpx.AsyncClient(
            timeout=30,
            headers={"User-Agent": "JobMatcher/1.0"},
            follow_redirects=True,
        ) as client:
            for term in search_terms:
                try:
                    params = {
                        "count": 50,
                        "tag": term.replace(" ", "+"),
                    }

                    response = await client.get(self.API_URL, params=params)

                    if response.status_code != 200:
                        print(f"[Jobicy] Status {response.status_code} for '{term}'")
                        continue

                    data = response.json()
                    job_list = data.get("jobs", [])

                    for item in job_list:
                        title = item.get("jobTitle", "")
                        if not title:
                            continue

                        job_url = item.get("url", "")
                        if not job_url or job_url in seen_urls:
                            continue
                        seen_urls.add(job_url)

                        # Location
                        geo = item.get("jobGeo", "")
                        location = geo if geo else "Remote"

                        # Date
                        posted_date = None
                        date_str = item.get("pubDate", "")
                        if date_str:
                            try:
                                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                                posted_date = dt.date()
                            except ValueError:
                                try:
                                    posted_date = date.fromisoformat(date_str[:10])
                                except ValueError:
                                    pass

                        # Job type
                        job_type = item.get("jobType", "")

                        # Salary
                        salary_raw = item.get("annualSalaryMin")
                        salary_max = item.get("annualSalaryMax")
                        salary_currency = item.get("salaryCurrency", "USD")
                        salary = None
                        if salary_raw and salary_max:
                            salary = f"{salary_currency} {salary_raw}-{salary_max}"

                        jobs.append(ScrapedJob(
                            title=title,
                            company_name=item.get("companyName"),
                            location=location,
                            country=self._detect_country(geo),
                            description=self._clean_text(item.get("jobExcerpt", "")),
                            job_url=job_url,
                            source=self.source_name,
                            posted_date=posted_date,
                            job_type=job_type,
                            salary=salary,
                        ))

                    await asyncio.sleep(1)

                except Exception as e:
                    print(f"[Jobicy] Error for '{term}': {e}")
                    continue

        print(f"[Jobicy] Scraped {len(jobs)} jobs total")
        return jobs

    def _detect_country(self, geo: str | None) -> str | None:
        if not geo:
            return "Remote"
        geo_lower = geo.lower().strip()
        if geo_lower in ["anywhere", "worldwide", "", "remote"]:
            return "Remote"

        mapping = {
            "usa": "United States", "united states": "United States",
            "uk": "United Kingdom", "united kingdom": "United Kingdom",
            "canada": "Canada", "germany": "Germany",
            "france": "France", "netherlands": "Netherlands",
            "australia": "Australia", "india": "India",
            "europe": "Europe", "latam": "Latin America",
            "emea": "EMEA",
        }
        for key, val in mapping.items():
            if key in geo_lower:
                return val
        return geo.strip()
