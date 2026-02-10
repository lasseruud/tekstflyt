"""Simple migration runner for TekstFlyt v2.

Usage:
    python migrate.py          # Run pending migrations
    python migrate.py --seed   # Run migrations + seed data
"""
import os
import sys
import glob
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://tekstflyt:tekstflyt@localhost:5432/tekstflyt")


def run_migrations():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    # Ensure migrations table exists
    cur.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT NOW()
        )
    """)
    conn.commit()

    # Get already applied migrations
    cur.execute("SELECT filename FROM _migrations ORDER BY filename")
    applied = {row[0] for row in cur.fetchall()}

    # Find and sort migration files
    migration_dir = os.path.join(os.path.dirname(__file__), "migrations")
    files = sorted(glob.glob(os.path.join(migration_dir, "*.sql")))

    for filepath in files:
        filename = os.path.basename(filepath)
        if filename in applied:
            print(f"  [skip] {filename}")
            continue

        print(f"  [run]  {filename}")
        with open(filepath, "r", encoding="utf-8") as f:
            sql = f.read()

        try:
            cur.execute(sql)
            cur.execute("INSERT INTO _migrations (filename) VALUES (%s)", (filename,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"  [FAIL] {filename}: {e}")
            sys.exit(1)

    cur.close()
    conn.close()
    print("Migrations complete.")


def seed():
    import bcrypt

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    users = [
        ("lasse", "demo123", "Lasse Ruud", "lasse@kvtas.no", "admin"),
        ("trond", "demo123", "Trond Ilbråten", "trond@kvtas.no", "user"),
    ]

    for username, password, display_name, email, role in users:
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        cur.execute(
            """
            INSERT INTO users (username, password_hash, display_name, email, role)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (username) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                display_name = EXCLUDED.display_name,
                email = EXCLUDED.email,
                role = EXCLUDED.role
            """,
            (username, password_hash, display_name, email, role),
        )
        print(f"  [seed] {username} ({role})")

    conn.commit()
    cur.close()
    conn.close()
    print("Seed complete.")


if __name__ == "__main__":
    print("Running migrations...")
    run_migrations()

    if "--seed" in sys.argv:
        print("\nSeeding data...")
        seed()
