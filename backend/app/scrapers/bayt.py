import httpx
from bs4 import BeautifulSoup
from datetime import date, timedelta
import re
import asyncio
import json

from app.scrapers.base import BaseScraper, ScrapedJob


class BaytScraper(BaseScraper):
    source_name = "bayt"

    async def scrape(self, search_terms: list[str], max_pages: int = 3) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_urls: set[str] = set()

        async with httpx.AsyncClient(
            timeout=30,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Cache-Control": "no-cache",
                "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
            },
            follow_redirects=True,
        ) as client:
            for term in search_terms:
                for page in range(1, max_pages + 1):
                    try:
                        # Method 1: Try the search URL
                        keyword_slug = term.replace(" ", "-").lower()
                        url = f"https://www.bayt.com/en/international/jobs/{keyword_slug}-jobs/"

                        params = {}
                        if page > 1:
                            params["page"] = page

                        # First visit the homepage to get cookies
                        if page == 1:
                            await client.get("https://www.bayt.com/en/")
                            await asyncio.sleep(1)

                        response = await client.get(url, params=params)

                        if response.status_code == 403:
                            # Try alternative URL format
                            url2 = f"https://www.bayt.com/en/uae/jobs/{keyword_slug}-jobs/"
                            response = await client.get(url2, params=params)

                        if response.status_code == 403:
                            # Try with Referer
                            headers_extra = {"Referer": "https://www.bayt.com/en/international/jobs/"}
                            response = await client.get(url, params=params, headers=headers_extra)

                        if response.status_code != 200:
                            print(f"[Bayt] Status {response.status_code} for '{term}' page {page}")
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

                        # Method 2: HTML parsing - find job links
                        job_links = soup.find_all("a", href=re.compile(r"/en/.+/jobs/.+-\d+/"))
                        if not job_links:
                            job_links = soup.find_all("a", href=re.compile(r"/job/"))

                        parsed_count = 0
                        for link in job_links:
                            parsed = self._parse_job_link(link)
                            if parsed and parsed.job_url not in seen_urls:
                                seen_urls.add(parsed.job_url)
                                jobs.append(parsed)
                                parsed_count += 1

                        if parsed_count == 0:
                            # Method 3: Find all links and filter
                            all_links = soup.find_all("a", href=True)
                            for a in all_links:
                                href = a.get("href", "")
                                text = a.get_text(strip=True)
                                if ("/jobs/" in href and text and len(text) > 5
                                    and "search" not in href.lower()
                                    and "careers" not in href.lower()):
                                    full_url = href if href.startswith("http") else f"https://www.bayt.com{href}"
                                    if full_url not in seen_urls:
                                        seen_urls.add(full_url)
                                        jobs.append(ScrapedJob(
                                            title=text,
                                            company_name=None,
                                            location=None,
                                            country=self._detect_country_from_url(href),
                                            description=None,
                                            job_url=full_url,
                                            source=self.source_name,
                                        ))

                        await asyncio.sleep(3)

                    except Exception as e:
                        print(f"[Bayt] Error for '{term}' page {page}: {e}")
                        break

        print(f"[Bayt] Scraped {len(jobs)} jobs total")
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
                            country = country_name

                    job_url = item.get("url", "")
                    if not job_url:
                        continue
                    if not job_url.startswith("http"):
                        job_url = f"https://www.bayt.com{job_url}"

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

    def _parse_job_link(self, link) -> ScrapedJob | None:
        try:
            href = link.get("href", "")
            title = link.get_text(strip=True)
            if not href or not title or len(title) < 3:
                return None

            job_url = href if href.startswith("http") else f"https://www.bayt.com{href}"

            parent = link.parent
            company = None
            location = None

            if parent:
                parent = parent.parent or parent
                company_el = parent.find("a", href=re.compile(r"/company/"))
                if company_el:
                    company = company_el.get_text(strip=True)

                spans = parent.find_all("span")
                for span in spans:
                    txt = span.get_text(strip=True)
                    if any(c in txt.lower() for c in ["dubai", "riyadh", "cairo", "qatar", "kuwait"]):
                        location = txt
                        break

            return ScrapedJob(
                title=title,
                company_name=company,
                location=location,
                country=self._detect_country_from_url(href) or self._detect_country(location),
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
            "uae": "UAE", "dubai": "UAE", "abu dhabi": "UAE",
            "saudi": "Saudi Arabia", "riyadh": "Saudi Arabia", "jeddah": "Saudi Arabia",
            "qatar": "Qatar", "doha": "Qatar",
            "kuwait": "Kuwait", "bahrain": "Bahrain",
            "egypt": "Egypt", "cairo": "Egypt",
            "oman": "Oman",
        }
        for key, val in mapping.items():
            if key in loc:
                return val
        return None

    def _detect_country_from_url(self, url: str) -> str | None:
        url = url.lower()
        mapping = {
            "/uae/": "UAE", "/ksa/": "Saudi Arabia", "/saudi-arabia/": "Saudi Arabia",
            "/egypt/": "Egypt", "/qatar/": "Qatar", "/kuwait/": "Kuwait",
            "/bahrain/": "Bahrain", "/oman/": "Oman", "/jordan/": "Jordan",
            "/international/": None,
        }
        for key, val in mapping.items():
            if key in url:
                return val
        return None
