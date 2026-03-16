from sentence_transformers import SentenceTransformer
import numpy as np

# Load model once at startup (384 dimensions, ~80MB)
_model = None


def get_model():
    global _model
    if _model is None:
        print("Loading sentence-transformers model...")
        _model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Model loaded!")
    return _model

def _get_model():
    global _model
    if _model is None:
        print("Loading sentence-transformers model...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        print("Model loaded!")
    return _model


def generate_embedding(text: str) -> list[float]:
    """Generate a 384-dimensional embedding using sentence-transformers."""
    text = text.replace("\n", " ").strip()
    if not text:
        return [0.0] * 384

    model = _get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def generate_embedding_for_job(title: str, company: str | None, description: str | None) -> list[float]:
    """Compose a rich text representation of the job, then embed it."""
    parts = [f"Job Title: {title}"]
    if company:
        parts.append(f"Company: {company}")
    if description:
        parts.append(f"Description: {description[:2000]}")
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
