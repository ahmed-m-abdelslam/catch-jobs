import httpx
from datetime import datetime, date
import asyncio

from app.scrapers.base import BaseScraper, ScrapedJob


class RemoteOKScraper(BaseScraper):
    """
    Scrapes job listings from RemoteOK (remoteok.com).

    RemoteOK provides a public JSON API at /api, making it the most
    reliable source to scrape. No authentication or special headers needed.

    Rate limit: Be respectful, max 1 request per second.
    """

    source_name = "remoteok"
    API_URL = "https://remoteok.com/api"

    async def scrape(self, search_terms: list[str], max_pages: int = 3) -> list[ScrapedJob]:
        """
        RemoteOK's API returns all jobs at once (no pagination).
        We fetch once, then filter by search terms locally.
        """
        jobs: list[ScrapedJob] = []
        seen_urls: set[str] = set()

        async with httpx.AsyncClient(
            timeout=30,
            headers={
                "User-Agent": "JobMatcher/1.0 (job aggregator)",
                "Accept": "application/json",
            },
            follow_redirects=True,
        ) as client:
            try:
                response = await client.get(self.API_URL)

                if response.status_code == 429:
                    print("[RemoteOK] Rate limited. Waiting 30s...")
                    await asyncio.sleep(30)
                    response = await client.get(self.API_URL)

                if response.status_code != 200:
                    print(f"[RemoteOK] Status {response.status_code}")
                    return jobs

                data = response.json()

                # The first item is a legal notice/metadata, skip it
                job_listings = [
                    item for item in data
                    if isinstance(item, dict) and item.get("slug")
                ]

                # Filter by search terms
                search_lower = [term.lower() for term in search_terms]

                for item in job_listings:
                    if not self._matches_search(item, search_lower):
                        continue

                    job = self._parse_job(item)
                    if job and job.job_url not in seen_urls:
                        seen_urls.add(job.job_url)
                        jobs.append(job)

            except Exception as e:
                print(f"[RemoteOK] Error: {e}")

        print(f"[RemoteOK] Scraped {len(jobs)} jobs total")
        return jobs

    def _matches_search(self, item: dict, search_terms: list[str]) -> bool:
        """Check if a job matches any of the search terms."""
        # If no search terms, include everything
        if not search_terms:
            return True

        # Build searchable text from job fields
        searchable = " ".join([
            item.get("position", ""),
            item.get("company", ""),
            item.get("description", ""),
            " ".join(item.get("tags", [])),
        ]).lower()

        return any(term in searchable for term in search_terms)

    def _parse_job(self, item: dict) -> ScrapedJob | None:
        """Parse a single RemoteOK job entry."""
        try:
            position = item.get("position", "")
            if not position:
                return None

            slug = item.get("slug", "")
            job_url = item.get("url", "")
            if not job_url:
                job_url = f"https://remoteok.com/remote-jobs/{slug}" if slug else ""
            if not job_url:
                return None

            # If the URL is a redirect through RemoteOK
            apply_url = item.get("apply_url", "")

            # Company
            company = item.get("company", None)

            # Location
            location_raw = item.get("location", "")
            location = location_raw if location_raw else "Remote"
            country = self._detect_country(location)

            # Description (HTML content)
            description = self._clean_text(item.get("description", ""))

            # Tags
            tags = item.get("tags", [])

            # Date
            posted_date = None
            epoch = item.get("epoch")
            if epoch:
                try:
                    posted_date = datetime.fromtimestamp(int(epoch)).date()
                except (ValueError, TypeError, OSError):
                    pass

            if not posted_date:
                date_str = item.get("date", "")
                if date_str:
                    try:
                        posted_date = datetime.fromisoformat(
                            date_str.replace("Z", "+00:00")
                        ).date()
                    except ValueError:
                        pass

            # Salary
            salary_min = item.get("salary_min")
            salary_max = item.get("salary_max")
            salary = None
            if salary_min and salary_max:
                salary = f"${salary_min:,} - ${salary_max:,}"
            elif salary_min:
                salary = f"${salary_min:,}+"

            return ScrapedJob(
                title=position,
                company_name=company,
                location=location,
                country=country or "Remote",
                description=description,
                job_url=job_url,
                source=self.source_name,
                posted_date=posted_date,
                tags=tags if tags else [],
                salary=salary,
            )

        except Exception as e:
            print(f"[RemoteOK] Parse error: {e}")
            return None

    def _detect_country(self, location: str | None) -> str | None:
        if not location:
            return "Remote"

        loc = location.lower().strip()

        if not loc or loc == "remote" or "worldwide" in loc or "anywhere" in loc:
            return "Remote"

        countries = {
            "usa": "United States", "us": "United States", "united states": "United States",
            "uk": "United Kingdom", "united kingdom": "United Kingdom",
            "canada": "Canada",
            "germany": "Germany",
            "france": "France",
            "netherlands": "Netherlands",
            "spain": "Spain",
            "australia": "Australia",
            "india": "India",
            "brazil": "Brazil",
            "europe": "Europe",
            "eu": "Europe",
            "latam": "Latin America",
            "asia": "Asia",
        }

        for key, val in countries.items():
            if key in loc:
                return val

        # If it's a specific location but not matched, return as-is
        return location.strip() if location.strip() else "Remote"
