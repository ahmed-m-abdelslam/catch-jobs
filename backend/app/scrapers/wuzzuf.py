import httpx
from bs4 import BeautifulSoup
from datetime import date, timedelta
import re
import asyncio
import json

from app.scrapers.base import BaseScraper, ScrapedJob


class WuzzufScraper(BaseScraper):
    source_name = "wuzzuf"
    BASE_URL = "https://wuzzuf.net/search/jobs"

    async def scrape(self, search_terms: list[str], max_pages: int = 3) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_urls: set[str] = set()

        async with httpx.AsyncClient(
            timeout=30,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "Referer": "https://wuzzuf.net/",
                "Connection": "keep-alive",
            },
            follow_redirects=True,
        ) as client:
            for term in search_terms:
                for page in range(max_pages):
                    try:
                        params = {"q": term, "start": page}
                        response = await client.get(self.BASE_URL, params=params)

                        if response.status_code != 200:
                            print(f"[Wuzzuf] Status {response.status_code} for '{term}' page {page}")
                            break

                        soup = BeautifulSoup(response.text, "html.parser")

                        # Method 1: Try JSON-LD structured data
                        json_jobs = self._parse_json_ld(soup)
                        if json_jobs:
                            for job in json_jobs:
                                if job.job_url not in seen_urls:
                                    seen_urls.add(job.job_url)
                                    jobs.append(job)
                            await asyncio.sleep(2)
                            continue

                        # Method 2: Find all job links with pattern
                        job_links = soup.find_all("a", href=re.compile(r"/jobs/p/"))
                        if not job_links:
                            job_links = soup.find_all("a", href=re.compile(r"/job/"))

                        if not job_links:
                            # Method 3: Try to find by common text patterns
                            all_links = soup.find_all("a", href=True)
                            job_links = [
                                a for a in all_links
                                if "/jobs/" in a.get("href", "") and a.get_text(strip=True)
                            ]

                        if not job_links:
                            print(f"[Wuzzuf] No jobs found for '{term}' page {page}")
                            break

                        for link in job_links:
                            parsed = self._parse_link_and_parent(link)
                            if parsed and parsed.job_url not in seen_urls:
                                seen_urls.add(parsed.job_url)
                                jobs.append(parsed)

                        await asyncio.sleep(2)

                    except Exception as e:
                        print(f"[Wuzzuf] Error for '{term}' page {page}: {e}")
                        break

        print(f"[Wuzzuf] Scraped {len(jobs)} jobs total")
        return jobs

    def _parse_json_ld(self, soup: BeautifulSoup) -> list[ScrapedJob]:
        jobs = []
        scripts = soup.find_all("script", type="application/ld+json")
        for script in scripts:
            try:
                data = json.loads(script.string)
                items = []
                if isinstance(data, dict):
                    if data.get("@type") == "JobPosting":
                        items = [data]
                    elif "itemListElement" in data:
                        for el in data["itemListElement"]:
                            item = el.get("item", el) if isinstance(el, dict) else None
                            if item:
                                items.append(item)
                elif isinstance(data, list):
                    items = [d for d in data if isinstance(d, dict) and d.get("@type") == "JobPosting"]

                for item in items:
                    title = item.get("title", "")
                    if not title:
                        continue

                    org = item.get("hiringOrganization", {})
                    company = org.get("name") if isinstance(org, dict) else None

                    loc = item.get("jobLocation", {})
                    location = None
                    country = None
                    if isinstance(loc, dict):
                        addr = loc.get("address", {})
                        if isinstance(addr, dict):
                            locality = addr.get("addressLocality", "")
                            country_name = addr.get("addressCountry", "")
                            if isinstance(country_name, dict):
                                country_name = country_name.get("name", "")
                            location = ", ".join(filter(None, [locality, country_name]))
                            country = country_name or "Egypt"
                    elif isinstance(loc, list) and loc:
                        first = loc[0] if isinstance(loc[0], dict) else {}
                        addr = first.get("address", {})
                        location = addr.get("addressLocality", "")
                        country = addr.get("addressCountry", "Egypt")

                    job_url = item.get("url", "")
                    if not job_url:
                        continue
                    if not job_url.startswith("http"):
                        job_url = f"https://wuzzuf.net{job_url}"

                    description = self._clean_text(item.get("description", ""))

                    posted_date = None
                    date_str = item.get("datePosted", "")
                    if date_str:
                        try:
                            posted_date = date.fromisoformat(date_str[:10])
                        except ValueError:
                            pass

                    jobs.append(ScrapedJob(
                        title=title,
                        company_name=company,
                        location=location,
                        country=country or "Egypt",
                        description=description,
                        job_url=job_url,
                        source=self.source_name,
                        posted_date=posted_date,
                    ))
            except (json.JSONDecodeError, TypeError):
                continue
        return jobs

    def _parse_link_and_parent(self, link_el) -> ScrapedJob | None:
        try:
            href = link_el.get("href", "")
            title = link_el.get_text(strip=True)

            if not href or not title or len(title) < 3:
                return None

            job_url = href if href.startswith("http") else f"https://wuzzuf.net{href}"

            # Try to get company and location from surrounding elements
            parent = link_el.parent
            if parent:
                parent = parent.parent or parent

            company = None
            location = None

            if parent:
                all_text = parent.get_text(" ", strip=True)
                # Try to find company link
                company_links = parent.find_all("a", href=re.compile(r"/jobs/careers"))
                if company_links:
                    company = company_links[0].get_text(strip=True)

                # Location detection
                spans = parent.find_all("span")
                for span in spans:
                    txt = span.get_text(strip=True)
                    if any(c in txt.lower() for c in ["cairo", "giza", "alex", "egypt", "remote"]):
                        location = txt
                        break

            return ScrapedJob(
                title=title,
                company_name=company,
                location=location,
                country=self._detect_country(location) or "Egypt",
                description=None,
                job_url=job_url,
                source=self.source_name,
            )
        except Exception:
            return None

    def _detect_country(self, location: str | None) -> str | None:
        if not location:
            return None
        loc = location.lower()
        mapping = {
            "cairo": "Egypt", "giza": "Egypt", "egypt": "Egypt",
            "alexandria": "Egypt", "remote": "Remote",
            "dubai": "UAE", "saudi": "Saudi Arabia", "riyadh": "Saudi Arabia",
        }
        for key, val in mapping.items():
            if key in loc:
                return val
        return None
