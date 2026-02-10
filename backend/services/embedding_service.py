import logging
import openai
from models import knowledge as knowledge_model

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


def get_embedding(text: str) -> list[float]:
    client = openai.OpenAI()
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


def search_similar(query: str, limit: int = 5) -> list[dict]:
    embedding = get_embedding(query)
    return knowledge_model.search_by_embedding(embedding, limit=limit)
