import uuid
from datetime import datetime
from pydantic import BaseModel


class PreferenceCreate(BaseModel):
    job_title: str
    country: str | None = None
    experience_level: str | None = None
    remote_allowed: bool = True


class PreferenceUpdate(BaseModel):
    job_title: str | None = None
    country: str | None = None
    experience_level: str | None = None
    remote_allowed: bool | None = None


class PreferenceResponse(BaseModel):
    id: uuid.UUID
    job_title: str
    country: str | None
    experience_level: str | None
    remote_allowed: bool
    created_at: datetime

    class Config:
        from_attributes = True
