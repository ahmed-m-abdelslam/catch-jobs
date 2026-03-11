import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings

s = get_settings()
print(f"DB: {s.database_url}")
print(f"Redis: {s.redis_url}")
print(f"Secret Key: {s.secret_key[:10]}...")
print("Config OK!")
