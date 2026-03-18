from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

_client = None

def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI
        settings = get_settings()
        _client = OpenAI(api_key=settings.openai_api_key)
        logger.info("OpenAI client initialized")
    return _client


def generate_embedding(text: str) -> list[float]:
    """Generate embedding using OpenAI text-embedding-3-small."""
    try:
        client = _get_client()
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text[:8000]
        )
        return response.data[0].embedding
    except Exception as e:
        logger.warning(f"OpenAI embedding error: {e}")
        return None


def generate_embedding_for_job(title: str, company: str, description: str) -> list[float]:
    """Generate embedding for a job posting."""
    text = f"Job Title: {title}. Company: {company}."
    if description:
        text += f" Description: {description[:500]}"
    return generate_embedding(text)


def generate_embedding_for_preference(job_title: str, country: str = None, experience: str = None) -> list[float]:
    """Generate embedding for a user preference."""
    text = f"Job Title: {job_title}."
    if country:
        text += f" Location: {country}."
    if experience:
        text += f" Experience: {experience}."
    return generate_embedding(text)


def get_model():
    """Compatibility stub."""
    return None
