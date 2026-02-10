from db import get_cursor


def create_document(filename: str, category: str, description: str, uploaded_by: int) -> dict:
    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO knowledge_documents (filename, category, description, uploaded_by)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (filename, category, description, uploaded_by),
        )
        return cur.fetchone()


def list_all() -> list[dict]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT kd.*, COUNT(kc.id) as chunk_count
            FROM knowledge_documents kd
            LEFT JOIN knowledge_chunks kc ON kc.document_id = kd.id
            GROUP BY kd.id
            ORDER BY kd.uploaded_at DESC
            """
        )
        return cur.fetchall()


def delete(doc_id: int) -> bool:
    with get_cursor() as cur:
        cur.execute("DELETE FROM knowledge_documents WHERE id = %s RETURNING id", (doc_id,))
        return cur.fetchone() is not None


def get_chunks(doc_id: int) -> list[dict]:
    with get_cursor() as cur:
        cur.execute(
            "SELECT id, chunk_index, content, metadata FROM knowledge_chunks WHERE document_id = %s ORDER BY chunk_index",
            (doc_id,),
        )
        return cur.fetchall()


def add_chunk(document_id: int, chunk_index: int, content: str, embedding: list[float], metadata: dict | None = None) -> None:
    import json
    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, metadata)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (document_id, chunk_index, content, str(embedding), json.dumps(metadata) if metadata else None),
        )


def search_by_embedding(embedding: list[float], limit: int = 5) -> list[dict]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT kc.content, kc.metadata, kd.filename, kd.category,
                   1 - (kc.embedding <=> %s::vector) as similarity
            FROM knowledge_chunks kc
            JOIN knowledge_documents kd ON kd.id = kc.document_id
            ORDER BY kc.embedding <=> %s::vector
            LIMIT %s
            """,
            (str(embedding), str(embedding), limit),
        )
        return cur.fetchall()
