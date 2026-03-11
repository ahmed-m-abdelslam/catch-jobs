import httpx
from bs4 import BeautifulSoup
from datetime import date, timedelta
import re
import asyncio
import json

from app.scrapers.base import BaseScraper, ScrapedJob


class NaukriGulfScraper(BaseScraper):
    source_name = "naukrigulf"
    BASE_URL = "https://www.naukrigulf.com"

    async def scrape(self, search_terms: list[str], max_pages: int = 3) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_urls: set[str] = set()

        async with httpx.AsyncClient(
            timeout=30,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Referer": "https://www.naukrigulf.com/",
                "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
            },
            follow_redirects=True,
        ) as client:
            # Visit homepage first for cookies
            try:
                await client.get(self.BASE_URL)
                await asyncio.sleep(1)
            except Exception:
                pass

            for term in search_terms:
                for page in range(1, max_pages + 1):
                    try:
                        # NaukriGulf URL patterns
                        keyword_slug = term.replace(" ", "-").lower()

                        # Try multiple URL formats
                        urls_to_try = [
                            f"{self.BASE_URL}/{keyword_slug}-jobs",
                            f"{self.BASE_URL}/{keyword_slug}-jobs-in-gulf",
                            f"{self.BASE_URL}/search?keyword={term.replace(' ', '+')}",
                        ]

                        if page > 1:
                            urls_to_try = [
                                f"{self.BASE_URL}/{keyword_slug}-jobs-{page}",
                                f"{self.BASE_URL}/search?keyword={term.replace(' ', '+')}&pageNo={page}",
                            ]

                        response = None
                        for url in urls_to_try:
                            try:
                                resp = await client.get(url)
                                if resp.status_code == 200 and len(resp.text) > 1000:
                                    response = resp
                                    break
                            except Exception:
                                continue

                        if not response:
                            print(f"[NaukriGulf] No valid response for '{term}' page {page}")
                            break

                        soup = BeautifulSoup(response.text, "html.parser")

                        # Method 1: JSON-LD
                        json_jobs = self._parse_json_ld(soup)
                        if json_jobs:
                            for job in json_jobs:
                                if job.job_url not in seen_urls:
                                    seen_urls.add(job.job_url)
                                    jobs.append(job)
                            await asyncio.sleep(2)
                            continue

                        # Method 2: Find job listing elements
                        page_jobs = self._parse_html(soup)
                        for job in page_jobs:
                            if job.job_url not in seen_urls:
                                seen_urls.add(job.job_url)
                                jobs.append(job)

                        # Method 3: Find any job-like links
                        if not page_jobs:
                            all_links = soup.find_all("a", href=True)
                            for a in all_links:
                                href = a.get("href", "")
                                text = a.get_text(strip=True)
                                if (text and len(text) > 5 and len(text) < 200
                                    and ("job" in href.lower() or "career" in href.lower())
                                    and href.count("/") >= 2
                                    and "search" not in href.lower()
                                    and "login" not in href.lower()):
                                    full_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"
                                    if full_url not in seen_urls:
                                        seen_urls.add(full_url)
                                        jobs.append(ScrapedJob(
                                            title=text,
                                            company_name=None,
                                            location=None,
                                            country=None,
                                            description=None,
                                            job_url=full_url,
                                            source=self.source_name,
                                        ))

                        await asyncio.sleep(3)

                    except Exception as e:
                        print(f"[NaukriGulf] Error for '{term}' page {page}: {e}")
                        break

        print(f"[NaukriGulf] Scraped {len(jobs)} jobs total")
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
                    items = [d for d in data if isinstance(d, dict)]

                for item in items:
                    title = item.get("title", "")
                    if not title:
                        continue

                    org = item.get("hiringOrganization", {})
                    company = org.get("name") if isinstance(org, dict) else None

                    location = None
                    country = None
                    loc = item.get("jobLocation", {})
                    if isinstance(loc, dict):
                        addr = loc.get("address", {})
                        if isinstance(addr, dict):
                            locality = addr.get("addressLocality", "")
                            country_name = addr.get("addressCountry", "")
                            if isinstance(country_name, dict):
                                country_name = country_name.get("name", "")
                            location = ", ".join(filter(None, [locality, country_name]))
                            country = country_name

                    job_url = item.get("url", "")
                    if not job_url:
                        continue
                    if not job_url.startswith("http"):
                        job_url = f"{self.BASE_URL}{job_url}"

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
                        country=country,
                        description=description,
                        job_url=job_url,
                        source=self.source_name,
                        posted_date=posted_date,
                    ))
            except (json.JSONDecodeError, TypeError):
                continue
        return jobs

    def _parse_html(self, soup: BeautifulSoup) -> list[ScrapedJob]:
        jobs = []

        # Try common NaukriGulf job card selectors
        selectors = [
            "article.jobTuple",
            "div.srp-job",
            "div.list-item",
            "div[class*='job-card']",
            "div[class*='jobTuple']",
        ]

        cards = []
        for sel in selectors:
            cards = soup.select(sel)
            if cards:
                break

        for card in cards:
            try:
                title_el = card.select_one("a[class*='title'], h2 a, a[href*='job']")
                if not title_el:
                    continue

                title = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                if not href or not title:
                    continue

                job_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"

                company_el = card.select_one("[class*='company'], [class*='org']")
                company = company_el.get_text(strip=True) if company_el else None

                loc_el = card.select_one("[class*='location'], [class*='loc']")
                location = loc_el.get_text(strip=True) if loc_el else None

                jobs.append(ScrapedJob(
                    title=title,
                    company_name=company,
                    location=location,
                    country=self._detect_country(location),
                    description=None,
                    job_url=job_url,
                    source=self.source_name,
                ))
            except Exception:
                continue

        return jobs

    def _detect_country(self, location: str | None) -> str | None:
        if not location:
            return None
        loc = location.lower()
        mapping = {
            "uae": "UAE", "dubai": "UAE", "abu dhabi": "UAE",
            "saudi": "Saudi Arabia", "riyadh": "Saudi Arabia",
            "qatar": "Qatar", "doha": "Qatar",
            "kuwait": "Kuwait", "bahrain": "Bahrain",
            "oman": "Oman", "egypt": "Egypt",
        }
        for key, val in mapping.items():
            if key in loc:
                return val
        return None
