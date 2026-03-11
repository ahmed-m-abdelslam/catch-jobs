import openai
from app.config import get_settings

settings = get_settings()
client = openai.OpenAI(api_key=settings.openai_api_key)


def generate_embedding(text: str) -> list[float]:
    """Generate a 1536-dimensional embedding using OpenAI's text-embedding-3-small."""
    text = text.replace("\n", " ").strip()
    if not text:
        return [0.0] * 1536

    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small",
    )
    return response.data[0].embedding


def generate_embedding_for_job(title: str, company: str | None, description: str | None) -> list[float]:
    """Compose a rich text representation of the job, then embed it."""
    parts = [f"Job Title: {title}"]
    if company:
        parts.append(f"Company: {company}")
    if description:
        # Truncate to ~8000 chars to stay within token limits
        parts.append(f"Description: {description[:8000]}")
    text = "\n".join(parts)
    return generate_embedding(text)


def generate_embedding_for_preference(job_title: str, country: str | None, experience: str | None) -> list[float]:
    """Create a query embedding from a user preference."""
    parts = [f"Looking for: {job_title}"]
    if country:
        parts.append(f"Country: {country}")
    if experience:
        parts.append(f"Experience level: {experience}")
    text = "\n".join(parts)
    return generate_embedding(text)
