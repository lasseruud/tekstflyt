import bcrypt
from db import get_cursor


def find_by_username(username: str) -> dict | None:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        return cur.fetchone()


def find_by_id(user_id: int) -> dict | None:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cur.fetchone()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def update_last_login(user_id: int) -> None:
    with get_cursor() as cur:
        cur.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user_id,))


def list_all() -> list[dict]:
    with get_cursor() as cur:
        cur.execute(
            "SELECT id, username, display_name, email, role, last_login, created_at FROM users ORDER BY id"
        )
        return cur.fetchall()


def create(username: str, password: str, display_name: str, email: str, role: str = "user") -> dict:
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (username, password_hash, display_name, email, role)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, username, display_name, email, role, created_at
            """,
            (username, password_hash, display_name, email, role),
        )
        return cur.fetchone()


def update(user_id: int, display_name: str, email: str, role: str) -> dict | None:
    with get_cursor() as cur:
        cur.execute(
            """
            UPDATE users SET display_name = %s, email = %s, role = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, username, display_name, email, role
            """,
            (display_name, email, role, user_id),
        )
        return cur.fetchone()


def update_password(user_id: int, new_password: str) -> None:
    password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    with get_cursor() as cur:
        cur.execute(
            "UPDATE users SET password_hash = %s, updated_at = NOW() WHERE id = %s",
            (password_hash, user_id),
        )


def delete(user_id: int) -> bool:
    with get_cursor() as cur:
        cur.execute("DELETE FROM users WHERE id = %s RETURNING id", (user_id,))
        return cur.fetchone() is not None
