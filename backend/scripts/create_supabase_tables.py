import asyncio, asyncpg

async def create_tables():
    conn = await asyncpg.connect(
        host="aws-1-eu-west-1.pooler.supabase.com",
        port=5432,
        user="postgres.jwaqymocwbkfwllxhlpi",
        password="Ahmed1999Mahmoud",
        database="postgres",
        ssl="require"
    )
    
    commands = [
        "CREATE EXTENSION IF NOT EXISTS vector",
        '''CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            full_name VARCHAR(255),
            avatar_url VARCHAR(500),
            auth_provider VARCHAR(50) DEFAULT 'local',
            last_login TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )''',
        '''CREATE TABLE IF NOT EXISTS user_preferences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            job_title VARCHAR(255) NOT NULL,
            country VARCHAR(100),
            experience_level VARCHAR(50),
            remote_allowed BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )''',
        '''CREATE TABLE IF NOT EXISTS jobs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(500) NOT NULL,
            company_name VARCHAR(255),
            location VARCHAR(255),
            country VARCHAR(100),
            description TEXT,
            job_url VARCHAR(1000) UNIQUE NOT NULL,
            source VARCHAR(50) NOT NULL,
            posted_date DATE,
            experience_level VARCHAR(50),
            job_type VARCHAR(50),
            salary VARCHAR(100),
            tags TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )''',
        '''CREATE TABLE IF NOT EXISTS job_embeddings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
            embedding vector(1536),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )''',
        '''CREATE TABLE IF NOT EXISTS user_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
            message TEXT,
            is_read BOOLEAN DEFAULT false,
            notification_type VARCHAR(50) DEFAULT 'job_match',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )''',
        '''CREATE TABLE IF NOT EXISTS saved_jobs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, job_id)
        )''',
        "CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs(country)",
        "CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source)",
        "CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title)",
        "CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_jobs_url ON jobs(job_url)",
    ]
    
    for cmd in commands:
        try:
            await conn.execute(cmd)
            name = cmd.split("EXISTS ")[-1].split("(")[0].split(" ON ")[0].strip() if "EXISTS" in cmd else "command"
            print(f"OK: {name}")
        except Exception as e:
            print(f"ERROR: {e}")
    
    # Verify
    tables = await conn.fetch("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
    print(f"\nTables in database:")
    for t in tables:
        print(f"  - {t['tablename']}")
    
    await conn.close()
    print("\nDone!")

asyncio.run(create_tables())
