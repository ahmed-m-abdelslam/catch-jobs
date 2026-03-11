import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.database import engine
from sqlalchemy import text


async def test():
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"Connected to PostgreSQL!")
            print(f"Version: {version}")
        await engine.dispose()
        print("Database connection OK!")
    except Exception as e:
        print(f"ERROR: {e}")
        print()
        print("Make sure Docker is running:")
        print("  docker compose up -d")
        print("  docker compose ps")


asyncio.run(test())
