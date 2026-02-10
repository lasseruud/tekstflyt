import os
import logging
from werkzeug.utils import secure_filename
from config import Config
from models import knowledge as knowledge_model
from services.embedding_service import get_embedding

logger = logging.getLogger(__name__)

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


def _extract_pdf_text(filepath: str) -> str:
    import subprocess
    result = subprocess.run(
        ["pdftotext", filepath, "-"],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"pdftotext failed: {result.stderr}")
    return result.stdout


def _chunk_text(text: str) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def process_knowledge_document(file, category: str, description: str, uploaded_by: int) -> dict:
    # Save PDF to upload dir
    knowledge_dir = os.path.join(Config.UPLOAD_DIR, "knowledge")
    os.makedirs(knowledge_dir, exist_ok=True)

    filename = secure_filename(file.filename)
    filepath = os.path.join(knowledge_dir, filename)
    file.save(filepath)

    # Extract text
    text = _extract_pdf_text(filepath)

    # Create DB record
    doc = knowledge_model.create_document(filename, category, description, uploaded_by)

    # Chunk and embed
    chunks = _chunk_text(text)
    for i, chunk in enumerate(chunks):
        try:
            embedding = get_embedding(chunk)
            knowledge_model.add_chunk(doc["id"], i, chunk, embedding, {"page_approx": i})
        except Exception as e:
            logger.error("Failed to embed chunk %d: %s", i, e)

    doc["chunk_count"] = len(chunks)
    return doc
