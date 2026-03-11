import uuid
from datetime import datetime
from pydantic import BaseModel
from app.schemas.job import JobResponse


class NotificationResponse(BaseModel):
    id: uuid.UUID
    job: JobResponse
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
