from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://jobuser:jobpass@localhost:5432/jobmatcher"
    database_url_sync: str = "postgresql://jobuser:jobpass@localhost:5432/jobmatcher"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    openai_api_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    scrape_interval_minutes: int = 10

    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache
def get_settings():
    return Settings()
