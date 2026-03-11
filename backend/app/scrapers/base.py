from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date
import hashlib


@dataclass
class ScrapedJob:
    title: str
    company_name: str | None
    location: str | None
    country: str | None
    description: str | None
    job_url: str
    source: str
    posted_date: date | None = None
    experience_level: str | None = None
    job_type: str | None = None  # full-time, part-time, contract
    salary: str | None = None
    tags: list[str] = field(default_factory=list)

    @property
    def url_hash(self) -> str:
        """Generate a hash of the job URL for dedup."""
        return hashlib.sha256(self.job_url.encode()).hexdigest()


class BaseScraper(ABC):
    source_name: str = "unknown"

    # Common headers to mimic a real browser
    DEFAULT_HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    }

    @abstractmethod
    async def scrape(self, search_terms: list[str], max_pages: int = 3) -> list[ScrapedJob]:
        pass

    def _clean_text(self, text: str | None) -> str | None:
        """Strip HTML tags and excessive whitespace."""
        if not text:
            return None
        import re
        clean = re.sub(r"<[^>]+>", " ", text)
        clean = re.sub(r"\s+", " ", clean).strip()
        return clean if clean else None
