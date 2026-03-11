import httpx
from bs4 import BeautifulSoup
from datetime import date, timedelta
import re
import asyncio

from app.scrapers.base import BaseScraper, ScrapedJob


class LinkedInScraper(BaseScraper):
    source_name = "linkedin"
    BASE_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"

    GEO_IDS = {
        "Egypt": "106155005",
        "Saudi Arabia": "100459316",
        "UAE": "104305776",
        "Qatar": "104035893",
        "Kuwait": "104539077",
        "Bahrain": "104076658",
        "Germany": "101282230",
        "United States": "103644278",
        "United Kingdom": "101165590",
        "Canada": "101174742",
        "India": "102713980",
        "Remote": "",
    }

    # Default countries to search
    DEFAULT_LOCATIONS = ["Egypt", "Saudi Arabia", "UAE", "Remote", "Germany", "United States"]

    async def scrape(self, search_terms: list[str], max_pages: int = 2, locations: list[str] | None = None) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_urls: set[str] = set()
        target_locations = locations or self.DEFAULT_LOCATIONS

        async with httpx.AsyncClient(
            timeout=30,
            headers={
                **self.DEFAULT_HEADERS,
                "Accept": "text/html",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
            },
            follow_redirects=True,
        ) as client:
            for term in search_terms:
                for loc_name in target_locations:
                    geo_id = self.GEO_IDS.get(loc_name, "")

                    for page in range(max_pages):
                        try:
                            start = page * 25
                            params = {
                                "keywords": term,
                                "start": start,
                                "sortBy": "DD",
                                "f_TPR": "r604800",
                            }

                            if geo_id:
                                params["geoId"] = geo_id
                            else:
                                params["f_WT"] = "2"

                            response = await client.get(self.BASE_URL, params=params)

                            if response.status_code == 429:
                                print(f"[LinkedIn] Rate limited on {loc_name}. Waiting 60s...")
                                await asyncio.sleep(60)
                                continue

                            if response.status_code != 200:
                                print(f"[LinkedIn] Status {response.status_code} for '{term}' in {loc_name}")
                                break

                            soup = BeautifulSoup(response.text, "html.parser")
                            job_cards = soup.find_all("li")

                            if not job_cards:
                                break

                            parsed_count = 0
                            for card in job_cards:
                                parsed = self._parse_job_card(card, loc_name)
                                if parsed and parsed.job_url not in seen_urls:
                                    seen_urls.add(parsed.job_url)
                                    jobs.append(parsed)
                                    parsed_count += 1

                            if parsed_count == 0:
                                break

                            await asyncio.sleep(5)

                        except Exception as e:
                            print(f"[LinkedIn] Error '{term}' in {loc_name} page {page}: {e}")
                            break

                    await asyncio.sleep(3)

                await asyncio.sleep(2)

        print(f"[LinkedIn] Scraped {len(jobs)} jobs total across {len(target_locations)} locations")
        return jobs

    def _parse_job_card(self, card, fallback_country: str = None) -> ScrapedJob | None:
        try:
            title_el = card.select_one("h3.base-search-card__title, h3[class*='title']")
            if not title_el:
                return None
            title = title_el.get_text(strip=True)

            link_el = card.select_one("a.base-card__full-link, a[class*='base-card']")
            if not link_el:
                link_el = card.find("a", href=re.compile(r"/jobs/view/"))
            if not link_el:
                return None

            job_url = link_el.get("href", "").split("?")[0]
            if not job_url:
                return None

            company_el = card.select_one("h4.base-search-card__subtitle a, a[class*='subtitle'], h4[class*='subtitle']")
            company = company_el.get_text(strip=True) if company_el else None

            location_el = card.select_one("span.job-search-card__location, span[class*='location']")
            location = location_el.get_text(strip=True) if location_el else None

            time_el = card.select_one("time")
            posted_date = None
            if time_el:
                dt = time_el.get("datetime")
                if dt:
                    try:
                        posted_date = date.fromisoformat(dt)
                    except ValueError:
                        pass
                if not posted_date:
                    posted_date = self._parse_relative_date(time_el.get_text(strip=True))

            country = self._detect_country(location) or fallback_country

            return ScrapedJob(
                title=title,
                company_name=company,
                location=location,
                country=country,
                description=None,
                job_url=job_url,
                source=self.source_name,
                posted_date=posted_date,
            )
        except Exception as e:
            print(f"[LinkedIn] Parse error: {e}")
            return None

    def _detect_country(self, location: str | None) -> str | None:
        if not location:
            return None
        loc = location.lower()
        patterns = {
            "egypt": "Egypt", "cairo": "Egypt", "alexandria": "Egypt", "giza": "Egypt",
            "saudi": "Saudi Arabia", "riyadh": "Saudi Arabia", "jeddah": "Saudi Arabia",
            "dubai": "UAE", "abu dhabi": "UAE", "uae": "UAE",
            "qatar": "Qatar", "doha": "Qatar",
            "kuwait": "Kuwait",
            "bahrain": "Bahrain",
            "united states": "United States", "usa": "United States",
            "united kingdom": "United Kingdom",
            "germany": "Germany",
            "canada": "Canada",
            "india": "India",
            "remote": "Remote",
            "france": "France",
            "netherlands": "Netherlands",
            "australia": "Australia",
        }
        for kw, country in patterns.items():
            if kw in loc:
                return country
        parts = location.split(",")
        if len(parts) > 1:
            return parts[-1].strip()
        return None

    def _parse_relative_date(self, text: str) -> date | None:
        today = date.today()
        text = text.lower().strip()
        if "today" in text or "just" in text:
            return today
        if "yesterday" in text:
            return today - timedelta(days=1)
        m = re.search(r"(\d+)\s*(day|week|month|hour|minute)", text)
        if m:
            n = int(m.group(1))
            u = m.group(2)
            if "hour" in u or "minute" in u:
                return today
            elif "day" in u:
                return today - timedelta(days=n)
            elif "week" in u:
                return today - timedelta(weeks=n)
            elif "month" in u:
                return today - timedelta(days=n * 30)
        return None
