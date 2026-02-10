import csv
import io
from db import get_cursor


def create(name: str, customer_type: str, **kwargs) -> dict:
    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO customers (name, address, postal_code, city, contact_person, phone, email, customer_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                name,
                kwargs.get("address"),
                kwargs.get("postal_code"),
                kwargs.get("city"),
                kwargs.get("contact_person"),
                kwargs.get("phone"),
                kwargs.get("email"),
                customer_type,
            ),
        )
        return cur.fetchone()


def find_by_id(customer_id: int) -> dict | None:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM customers WHERE id = %s", (customer_id,))
        return cur.fetchone()


def search(query: str | None = None, limit: int = 20) -> list[dict]:
    if query:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT * FROM customers
                WHERE name ILIKE %s OR contact_person ILIKE %s
                ORDER BY name LIMIT %s
                """,
                (f"%{query}%", f"%{query}%", limit),
            )
            return cur.fetchall()
    else:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM customers ORDER BY name LIMIT %s", (limit,))
            return cur.fetchall()


def update(customer_id: int, **kwargs) -> dict | None:
    allowed = ["name", "address", "postal_code", "city", "contact_person", "phone", "email", "customer_type"]
    sets = []
    values = []
    for key in allowed:
        if key in kwargs:
            sets.append(f"{key} = %s")
            values.append(kwargs[key])

    if not sets:
        return find_by_id(customer_id)

    sets.append("updated_at = NOW()")
    values.append(customer_id)

    with get_cursor() as cur:
        cur.execute(
            f"UPDATE customers SET {', '.join(sets)} WHERE id = %s RETURNING *",
            values,
        )
        return cur.fetchone()


def delete(customer_id: int) -> bool:
    with get_cursor() as cur:
        cur.execute("DELETE FROM customers WHERE id = %s RETURNING id", (customer_id,))
        return cur.fetchone() is not None


def import_csv(csv_text: str) -> int:
    """Import customers from Drifti CSV export. Returns count of imported customers."""
    reader = csv.DictReader(io.StringIO(csv_text))
    count = 0

    with get_cursor() as cur:
        for row in reader:
            # Map Drifti CSV columns to our schema
            name = row.get("Navn", row.get("name", "")).strip()
            if not name:
                continue

            # Determine customer type from organization number or similar
            customer_type = "business" if row.get("Org.nr", row.get("org_nr", "")).strip() else "private"

            cur.execute(
                """
                INSERT INTO customers (name, address, postal_code, city, contact_person, phone, email, customer_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (
                    name,
                    row.get("Adresse", row.get("address", "")).strip() or None,
                    row.get("Postnr", row.get("postal_code", "")).strip() or None,
                    row.get("Poststed", row.get("city", "")).strip() or None,
                    row.get("Kontaktperson", row.get("contact_person", "")).strip() or None,
                    row.get("Telefon", row.get("phone", "")).strip() or None,
                    row.get("E-post", row.get("email", "")).strip() or None,
                    customer_type,
                ),
            )
            count += 1

    return count
