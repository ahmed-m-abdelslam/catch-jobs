import httpx
from bs4 import BeautifulSoup
from datetime import date
import re
import asyncio
import json

from app.scrapers.base import BaseScraper, ScrapedJob


class GlassdoorScraper(BaseScraper):
    source_name = "glassdoor"

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
                "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
                "Referer": "https://www.google.com/",
            },
            follow_redirects=True,
        ) as client:
            for term in search_terms:
                for page in range(1, max_pages + 1):
                    try:
                        keyword_slug = term.replace(" ", "-").lower()

                        # Multiple URL patterns
                        urls_to_try = [
                            f"https://www.glassdoor.com/Job/{keyword_slug}-jobs-SRCH_KO0,{len(term)}.htm",
                            f"https://www.glassdoor.co.in/Job/{keyword_slug}-jobs-SRCH_KO0,{len(term)}.htm",
                        ]

                        if page > 1:
                            urls_to_try = [
                                f"https://www.glassdoor.com/Job/{keyword_slug}-jobs-SRCH_KO0,{len(term)}_IP{page}.htm",
                            ]

                        response = None
                        for url in urls_to_try:
                            try:
                                resp = await client.get(url)
                                if resp.status_code == 200:
                                    response = resp
                                    break
                                elif resp.status_code == 403:
                                    print(f"[Glassdoor] 403 blocked for {url[:60]}...")
                                    continue
                            except Exception:
                                continue

                        if not response:
                            print(f"[Glassdoor] No valid response for '{term}' page {page}")
                            break

                        soup = BeautifulSoup(response.text, "html.parser")

                        # Method 1: JSON-LD
                        json_jobs = self._parse_json_ld(soup)
                        for job in json_jobs:
                            if job.job_url not in seen_urls:
                                seen_urls.add(job.job_url)
                                jobs.append(job)

                        # Method 2: HTML
                        if not json_jobs:
                            html_jobs = self._parse_html(soup)
                            for job in html_jobs:
                                if job.job_url not in seen_urls:
                                    seen_urls.add(job.job_url)
                                    jobs.append(job)

                        await asyncio.sleep(5)

                    except Exception as e:
                        print(f"[Glassdoor] Error for '{term}' page {page}: {e}")
                        break

        print(f"[Glassdoor] Scraped {len(jobs)} jobs total")
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
                        for el in data.get("itemListElement", []):
                            if isinstance(el, dict):
                                item = el.get("item", el)
                                if isinstance(item, dict):
                                    items.append(item)
                elif isinstance(data, list):
                    items = [d for d in data if isinstance(d, dict) and d.get("@type") == "JobPosting"]

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
                            parts = filter(None, [
                                addr.get("addressLocality", ""),
                                addr.get("addressRegion", ""),
                                addr.get("addressCountry", ""),
                            ])
                            location = ", ".join(parts)
                            c = addr.get("addressCountry", "")
                            country = c.get("name", c) if isinstance(c, dict) else c
                    elif isinstance(loc, list) and loc:
                        first = loc[0] if isinstance(loc[0], dict) else {}
                        addr = first.get("address", {})
                        location = addr.get("addressLocality", "")
                        country = addr.get("addressCountry", "")

                    job_url = item.get("url", "")
                    if not job_url:
                        continue
                    if not job_url.startswith("http"):
                        job_url = f"https://www.glassdoor.com{job_url}"

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
                        country=country if isinstance(country, str) else None,
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
        # Find job links
        job_links = soup.find_all("a", href=re.compile(r"/job-listing/|/partner/jobListing"))
        if not job_links:
            job_links = soup.find_all("a", attrs={"data-test": "job-link"})

        for link in job_links:
            try:
                title = link.get_text(strip=True)
                href = link.get("href", "")
                if not title or not href or len(title) < 3:
                    continue

                job_url = href if href.startswith("http") else f"https://www.glassdoor.com{href}"

                jobs.append(ScrapedJob(
                    title=title,
                    company_name=None,
                    location=None,
                    country=None,
                    description=None,
                    job_url=job_url,
                    source=self.source_name,
                ))
            except Exception:
                continue
        return jobs
