import asyncio, asyncpg

async def test():
    try:
        conn = await asyncpg.connect(
            host="aws-1-eu-west-1.pooler.supabase.com",
            port=5432,
            user="postgres.jwaqymocwbkfwllxhlpi",
            password="Ahmed1999Mahmoud",
            database="postgres",
            ssl="require"
        )
        version = await conn.fetchval("SELECT version()")
        print(f"Connected! {version[:60]}")
        ext = await conn.fetchval("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
        print(f"pgvector: {ext}")
        await conn.close()
        print("SUCCESS!")
    except Exception as e:
        print(f"ERROR: {e}")

asyncio.run(test())
