from app.scrapers.base import BaseScraper, ScrapedJob
from app.scrapers.remoteok import RemoteOKScraper
from app.scrapers.wuzzuf import WuzzufScraper
from app.scrapers.linkedin import LinkedInScraper
from app.scrapers.arbeitnow import ArbeitnowScraper
from app.scrapers.jobicy import JobicyScraper
from app.scrapers.himalayas import HimalayasScraper

__all__ = [
    "BaseScraper", "ScrapedJob",
    "RemoteOKScraper", "WuzzufScraper", "LinkedInScraper",
    "ArbeitnowScraper", "JobicyScraper", "HimalayasScraper",
]
