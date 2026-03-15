from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, Base
from app.models.user import User
from app.models.preference import UserPreference
from app.models.job import Job, JobEmbedding
from app.models.notification import UserNotification, SavedJob

from app.api.auth import router as auth_router
from app.api.jobs import router as jobs_router
from app.api.preferences import router as preferences_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables ready!")
    yield
    await engine.dispose()


app = FastAPI(title="JobMatcher API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(preferences_router, prefix="/api")

try:
    from app.api.admin import router as admin_router
    app.include_router(admin_router, prefix="/api")
except ImportError:
    pass

try:
    from app.api.notifications import router as notifications_router
    app.include_router(notifications_router, prefix="/api")
except ImportError:
    pass


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
