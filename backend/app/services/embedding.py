from openai import OpenAI
from app.config import get_settings

_client = None

def _get_client():
    global _client
    if _client is None:
        settings = get_settings()
        _client = OpenAI(api_key=settings.openai_api_key)
        print("OpenAI client initialized!")
    return _client


def generate_embedding(text: str) -> list[float]:
    """Generate a 1536-dimensional embedding using OpenAI."""
    try:
        client = _get_client()
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text[:8000],
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"OpenAI embedding error: {e}")
        return [0.0] * 1536


def generate_embedding_for_job(title: str, company: str, description: str) -> list[float]:
    parts = []
    if title:
        parts.append(f"Job Title: {title}")
    if company:
        parts.append(f"Company: {company}")
    if description:
        parts.append(f"Description: {description[:500]}")
    text = " | ".join(parts) if parts else "Unknown Job"
    return generate_embedding(text)


def generate_embedding_for_preference(job_title: str, country: str = None, experience: str = None) -> list[float]:
    parts = []
    if job_title:
        parts.append(f"Job Title: {job_title}")
    if country:
        parts.append(f"Country: {country}")
    if experience:
        parts.append(f"Experience: {experience}")
    text = " | ".join(parts) if parts else "Unknown Preference"
    return generate_embedding(text)


def get_model():
    """Compatibility function - returns None for OpenAI mode."""
    return None
