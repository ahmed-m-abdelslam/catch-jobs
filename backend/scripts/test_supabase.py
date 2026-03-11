import sys, os, asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncpg
from urllib.parse import quote_plus

password = "catchjobs2026*$#"
encoded_password = quote_plus(password)
url = f"postgresql://postgres.jwaqymocwbkfwllxhlpi:{encoded_password}@db.jwaqymocwbkfwllxhlpi.supabase.co:5432/postgres?sslmode=require"

print(f"Encoded password: {encoded_password}")
print(f"Connecting...")

async def test():
    conn = await asyncpg.connect(url)
    version = await conn.fetchval("SELECT version()")
    print(f"Connected! {version[:60]}...")
    
    # Check vector extension
    ext = await conn.fetchval("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
    print(f"pgvector version: {ext}")
    
    await conn.close()
    print("Supabase connection OK!")

asyncio.run(test())
