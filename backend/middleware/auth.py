from functools import wraps
from datetime import datetime, timezone, timedelta
from typing import Any

import jwt
from flask import request, jsonify, g

from config import Config


def create_token(user_id: int, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get("token")
        if not token:
            return jsonify({"error": "Ikke autentisert"}), 401

        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Sesjon utløpt"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Ugyldig token"}), 401

        g.user_id = payload["user_id"]
        g.user_role = payload["role"]
        return f(*args, **kwargs)

    return decorated


def require_admin(f):
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if g.user_role != "admin":
            return jsonify({"error": "Krever admin-tilgang"}), 403
        return f(*args, **kwargs)

    return decorated
