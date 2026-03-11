import httpx
from datetime import datetime, date
import asyncio

from app.scrapers.base import BaseScraper, ScrapedJob


class HimalayasScraper(BaseScraper):
    source_name = "himalayas"
    API_URL = "https://himalayas.app/jobs/api"

    async def scrape(self, search_terms: list[str], max_pages: int = 3) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_urls: set[str] = set()

        async with httpx.AsyncClient(
            timeout=30,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
            },
            follow_redirects=True,
        ) as client:
            for page_offset in range(max_pages):
                try:
                    params = {
                        "limit": 50,
                        "offset": page_offset * 50,
                    }

                    response = await client.get(self.API_URL, params=params)

                    if response.status_code != 200:
                        # Try alternative endpoint
                        alt_url = "https://himalayas.app/api/jobs"
                        response = await client.get(alt_url, params=params)

                    if response.status_code != 200:
                        print(f"[Himalayas] Status {response.status_code}")
                        break

                    data = response.json()

                    # Handle different response formats
                    job_list = []
                    if isinstance(data, list):
                        job_list = data
                    elif isinstance(data, dict):
                        job_list = data.get("jobs", data.get("data", data.get("results", [])))

                    if not job_list:
                        print(f"[Himalayas] No jobs in response. Keys: {list(data.keys()) if isinstance(data, dict) else 'list'}")
                        break

                    search_lower = [t.lower() for t in search_terms]

                    for item in job_list:
                        if not isinstance(item, dict):
                            continue

                        title = item.get("title", item.get("jobTitle", ""))
                        if not title:
                            continue

                        company = item.get("companyName", item.get("company_name", item.get("company", "")))
                        description = item.get("description", item.get("excerpt", ""))
                        categories = item.get("categories", item.get("tags", []))
                        if isinstance(categories, list):
                            cat_text = " ".join(str(c) for c in categories)
                        else:
                            cat_text = str(categories)

                        searchable = f"{title} {company} {description} {cat_text}".lower()

                        if not any(term in searchable for term in search_lower):
                            continue

                        # Build URL
                        slug = item.get("slug", item.get("id", ""))
                        job_url = item.get("applicationUrl", item.get("url", item.get("apply_url", "")))
                        if not job_url and slug:
                            job_url = f"https://himalayas.app/jobs/{slug}"
                        if not job_url:
                            continue
                        if job_url in seen_urls:
                            continue
                        seen_urls.add(job_url)

                        # Location
                        location_raw = item.get("location", item.get("jobGeo", ""))
                        location = location_raw if location_raw else "Remote"

                        # Date
                        posted_date = None
                        for date_field in ["pubDate", "publishedDate", "created_at", "postedAt"]:
                            pub_date = item.get(date_field, "")
                            if pub_date:
                                try:
                                    if isinstance(pub_date, (int, float)):
                                        posted_date = datetime.fromtimestamp(pub_date).date()
                                    else:
                                        dt = datetime.fromisoformat(str(pub_date).replace("Z", "+00:00"))
                                        posted_date = dt.date()
                                    break
                                except (ValueError, TypeError, OSError):
                                    continue

                        # Salary
                        salary = None
                        min_sal = item.get("minSalary", item.get("salary_min"))
                        max_sal = item.get("maxSalary", item.get("salary_max"))
                        if min_sal and max_sal:
                            salary = f"${int(min_sal):,} - ${int(max_sal):,}"

                        seniority = item.get("seniority", item.get("experience_level", ""))

                        jobs.append(ScrapedJob(
                            title=title,
                            company_name=company if company else None,
                            location=location,
                            country=self._detect_country(location_raw),
                            description=self._clean_text(description) if description else None,
                            job_url=job_url,
                            source=self.source_name,
                            posted_date=posted_date,
                            salary=salary,
                            experience_level=seniority if seniority else None,
                            tags=categories if isinstance(categories, list) else [],
                        ))

                    await asyncio.sleep(1)

                except Exception as e:
                    print(f"[Himalayas] Error: {e}")
                    break

        print(f"[Himalayas] Scraped {len(jobs)} jobs total")
        return jobs

    def _detect_country(self, location: str | None) -> str | None:
        if not location:
            return "Remote"
        loc = location.lower().strip()
        if loc in ["", "remote", "worldwide", "anywhere", "global"]:
            return "Remote"
        mapping = {
            "usa": "United States", "united states": "United States",
            "uk": "United Kingdom", "united kingdom": "United Kingdom",
            "canada": "Canada", "germany": "Germany",
            "france": "France", "netherlands": "Netherlands",
            "australia": "Australia", "india": "India",
            "uae": "UAE", "dubai": "UAE",
            "egypt": "Egypt", "europe": "Europe",
        }
        for key, val in mapping.items():
            if key in loc:
                return val
        return location.strip() if location.strip() else "Remote"
