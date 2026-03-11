import uuid
from datetime import datetime, date
from pydantic import BaseModel


class JobResponse(BaseModel):
    id: uuid.UUID
    title: str
    company_name: str | None
    location: str | None
    country: str | None
    description: str | None
    job_url: str
    source: str
    posted_date: date | None
    created_at: datetime
    similarity_score: float | None = None

    class Config:
        from_attributes = True


class JobSearchQuery(BaseModel):
    query: str | None = None
    country: str | None = None
    source: str | None = None
    page: int = 1
    page_size: int = 20
