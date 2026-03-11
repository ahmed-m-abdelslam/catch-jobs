import httpx
from bs4 import BeautifulSoup
from datetime import date
from app.scrapers.base import BaseScraper, ScrapedJob


class IndeedScraper(BaseScraper):
    """
    Scrapes Indeed job listings.

    NOTE: Indeed actively blocks automated scraping. In production,
    you would need to use their API partner program or a proxy service.
    This is a structural example that shows the parsing logic.
    """

    source_name = "indeed"
    BASE_URL = "https://www.indeed.com/jobs"

    async def scrape(self, search_terms: list[str], max_pages: int = 3) -> list[ScrapedJob]:
        jobs = []

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }

        async with httpx.AsyncClient(timeout=30, headers=headers, follow_redirects=True) as client:
            for term in search_terms:
                for page in range(max_pages):
                    try:
                        params = {
                            "q": term,
                            "start": page * 10,
                        }
                        response = await client.get(self.BASE_URL, params=params)
                        if response.status_code != 200:
                            continue

                        soup = BeautifulSoup(response.text, "html.parser")
                        job_cards = soup.find_all("div", class_="job_seen_beacon")

                        for card in job_cards:
                            title_el = card.find("h2", class_="jobTitle")
                            company_el = card.find("span", attrs={"data-testid": "company-name"})
                            location_el = card.find("div", attrs={"data-testid": "text-location"})
                            link_el = card.find("a", href=True)

                            title = title_el.get_text(strip=True) if title_el else None
                            if not title:
                                continue

                            job_url = ""
                            if link_el and link_el.get("href"):
                                href = link_el["href"]
                                job_url = f"https://www.indeed.com{href}" if href.startswith("/") else href

                            if not job_url:
                                continue

                            jobs.append(ScrapedJob(
                                title=title,
                                company_name=company_el.get_text(strip=True) if company_el else None,
                                location=location_el.get_text(strip=True) if location_el else None,
                                country=None,  # Would need geo parsing
                                description=None,  # Would need to visit individual pages
                                job_url=job_url,
                                source=self.source_name,
                                posted_date=None,
                            ))
                    except Exception as e:
                        print(f"Indeed scrape error for '{term}' page {page}: {e}")

        return jobs
