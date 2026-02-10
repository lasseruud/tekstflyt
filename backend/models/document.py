from db import get_cursor


def create(user_id: int, document_type: str, document_name: str, **kwargs) -> dict:
    fields = ["user_id", "document_type", "document_name"]
    values = [user_id, document_type, document_name]

    optional = [
        "customer_id", "recipient_name", "recipient_address", "recipient_postal_code",
        "recipient_city", "recipient_person", "recipient_phone", "recipient_email",
        "customer_type", "price_product", "price_installation", "ai_prompt",
        "file_path_attachment",
    ]
    for key in optional:
        if key in kwargs and kwargs[key] is not None:
            fields.append(key)
            values.append(kwargs[key])

    placeholders = ", ".join(["%s"] * len(values))
    field_names = ", ".join(fields)
    with get_cursor() as cur:
        cur.execute(
            f"INSERT INTO documents ({field_names}) VALUES ({placeholders}) RETURNING *",
            values,
        )
        return cur.fetchone()


def find_by_id(doc_id: int) -> dict | None:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM documents WHERE id = %s", (doc_id,))
        return cur.fetchone()


def list_by_user(user_id: int, search: str | None = None, doc_type: str | None = None, admin: bool = False) -> list[dict]:
    if admin:
        query = "SELECT * FROM documents WHERE status != 'draft'"
        params: list = []
    else:
        query = "SELECT * FROM documents WHERE user_id = %s AND status != 'draft'"
        params: list = [user_id]

    if search:
        query += " AND (document_name ILIKE %s OR recipient_name ILIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])

    if doc_type:
        query += " AND document_type = %s"
        params.append(doc_type)

    query += " ORDER BY updated_at DESC"

    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()


def update(doc_id: int, **kwargs) -> dict | None:
    if not kwargs:
        return find_by_id(doc_id)

    sets = []
    values = []
    for key, val in kwargs.items():
        sets.append(f"{key} = %s")
        values.append(val)
    sets.append("updated_at = NOW()")
    values.append(doc_id)

    with get_cursor() as cur:
        cur.execute(
            f"UPDATE documents SET {', '.join(sets)} WHERE id = %s RETURNING *",
            values,
        )
        return cur.fetchone()


def finalize(doc_id: int, file_paths: dict) -> dict | None:
    with get_cursor() as cur:
        cur.execute(
            """
            UPDATE documents SET
                status = 'finalized',
                finalized_at = NOW(),
                updated_at = NOW(),
                file_path_word = %s,
                file_path_word_signed = %s,
                file_path_pdf = %s,
                file_path_pdf_signed = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                file_paths.get("word"),
                file_paths.get("word_signed"),
                file_paths.get("pdf"),
                file_paths.get("pdf_signed"),
                doc_id,
            ),
        )
        return cur.fetchone()


def delete(doc_id: int) -> dict | None:
    with get_cursor() as cur:
        cur.execute("DELETE FROM documents WHERE id = %s RETURNING *", (doc_id,))
        return cur.fetchone()


def clone(doc_id: int, user_id: int) -> dict | None:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM documents WHERE id = %s", (doc_id,))
        original = cur.fetchone()
        if not original:
            return None

        cur.execute(
            """
            INSERT INTO documents (
                user_id, customer_id, document_type, document_name,
                recipient_name, recipient_address, recipient_postal_code,
                recipient_city, recipient_person, recipient_phone, recipient_email,
                customer_type, price_product, price_installation,
                document_text, ai_prompt
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING *
            """,
            (
                user_id,
                original["customer_id"],
                original["document_type"],
                f"Kopi av {original['document_name']}",
                original["recipient_name"],
                original["recipient_address"],
                original["recipient_postal_code"],
                original["recipient_city"],
                original["recipient_person"],
                original["recipient_phone"],
                original["recipient_email"],
                original["customer_type"],
                original["price_product"],
                original["price_installation"],
                original["document_text"],
                original["ai_prompt"],
            ),
        )
        return cur.fetchone()
