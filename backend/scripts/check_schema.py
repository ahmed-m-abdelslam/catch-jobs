import asyncio, asyncpg

async def check():
    conn = await asyncpg.connect(
        host="aws-1-eu-west-1.pooler.supabase.com",
        port=5432,
        user="postgres.jwaqymocwbkfwllxhlpi",
        password="Ahmed1999Mahmoud",
        database="postgres",
        ssl="require"
    )
    
    tables = await conn.fetch("""
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name = 'users'
        ORDER BY table_schema
    """)
    print("Tables named 'users':")
    for t in tables:
        print(f"  schema: {t['table_schema']}, table: {t['table_name']}")
    
    # Check our public tables
    public_tables = await conn.fetch("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    """)
    print("\nPublic schema tables:")
    for t in public_tables:
        print(f"  - {t['table_name']}")
    
    # Check public.users columns
    cols = await conn.fetch("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position
    """)
    print("\npublic.users columns:")
    for c in cols:
        print(f"  - {c['column_name']}")
    
    await conn.close()

asyncio.run(check())
