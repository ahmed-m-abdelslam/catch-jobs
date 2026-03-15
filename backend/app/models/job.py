import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Date, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_url: Mapped[str] = mapped_column(String(1000), unique=True, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)  # linkedin, indeed, etc.
    posted_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    embedding = relationship("JobEmbedding", back_populates="job", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_jobs_title_country", "title", "country"),
        Index("idx_jobs_source", "source"),
    )


class JobEmbedding(Base):
    __tablename__ = "job_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    embedding = mapped_column(Vector(384), nullable=False)

    job = relationship("Job", back_populates="embedding")
