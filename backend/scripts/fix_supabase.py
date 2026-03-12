import asyncio, asyncpg

async def fix():
    conn = await asyncpg.connect(
        host="aws-1-eu-west-1.pooler.supabase.com",
        port=5432,
        user="postgres.jwaqymocwbkfwllxhlpi",
        password="Ahmed1999Mahmoud",
        database="postgres",
        ssl="require"
    )
    
    try:
        await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)")
        print("Added google_id column")
    except Exception as e:
        print(f"google_id: {e}")
    
    # Check all columns
    cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
    print("\nUsers table columns:")
    for c in cols:
        print(f"  - {c['column_name']}")
    
    await conn.close()
    print("\nDone!")

asyncio.run(fix())
