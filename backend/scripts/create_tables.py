import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy import text
from app.database import engine, Base
from app.models import User, UserPreference, Job, JobEmbedding, UserNotification, SavedJob


async def create_tables():
    # Step 1: Check models loaded
    print("Step 1: Checking models...")
    models = [User, UserPreference, Job, JobEmbedding, UserNotification, SavedJob]
    for model in models:
        print(f"  {model.__tablename__} OK")

    # Step 2: Enable pgvector and create tables
    print("\nStep 2: Creating tables...")
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        print("  pgvector extension enabled")

        await conn.run_sync(Base.metadata.create_all)
        print("  All tables created")

    # Step 3: Verify tables exist
    print("\nStep 3: Verifying tables...")
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in result.fetchall()]
        print(f"  Tables found: {len(tables)}")
        for t in tables:
            print(f"    - {t}")

    await engine.dispose()
    print("\nDone!")


asyncio.run(create_tables())
