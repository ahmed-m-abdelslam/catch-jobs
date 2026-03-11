import httpx
from datetime import datetime
from app.scrapers.base import BaseScraper, ScrapedJob


class RemotiveScraper(BaseScraper):
    source_name = "remotive"
    BASE_URL = "https://remotive.com/api/remote-jobs"

    async def scrape(self, search_terms: list[str], max_pages: int = 3) -> list[ScrapedJob]:
        jobs = []

        async with httpx.AsyncClient(timeout=30) as client:
            for term in search_terms:
                try:
                    response = await client.get(
                        self.BASE_URL,
                        params={"search": term, "limit": 50},
                    )
                    response.raise_for_status()
                    data = response.json()

                    for item in data.get("jobs", []):
                        posted = None
                        if item.get("publication_date"):
                            try:
                                posted = datetime.fromisoformat(
                                    item["publication_date"].replace("Z", "+00:00")
                                ).date()
                            except (ValueError, AttributeError):
                                pass

                        jobs.append(ScrapedJob(
                            title=item.get("title", ""),
                            company_name=item.get("company_name"),
                            location=item.get("candidate_required_location", "Remote"),
                            country=self._extract_country(
                                item.get("candidate_required_location", "")
                            ),
                            description=item.get("description", ""),
                            job_url=item.get("url", ""),
                            source=self.source_name,
                            posted_date=posted,
                        ))
                except Exception as e:
                    print(f"Remotive scrape error for '{term}': {e}")

        return jobs

    def _extract_country(self, location: str) -> str | None:
        if not location:
            return None
        location_lower = location.lower()
        if "worldwide" in location_lower or "anywhere" in location_lower:
            return "Remote"
        # Simple heuristic: take the last part after comma
        parts = location.split(",")
        return parts[-1].strip() if parts else None
