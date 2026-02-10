import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from config import Config

_pool: pool.SimpleConnectionPool | None = None


def init_db():
    global _pool
    _pool = pool.SimpleConnectionPool(1, 5, Config.DATABASE_URL)


def close_db():
    global _pool
    if _pool:
        _pool.closeall()
        _pool = None


@contextmanager
def get_conn():
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


@contextmanager
def get_cursor():
    with get_conn() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cursor
        finally:
            cursor.close()
