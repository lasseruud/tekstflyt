from flask import Blueprint, request, jsonify, make_response
from middleware.auth import create_token, require_auth
from config import Config

auth_bp = Blueprint("auth", __name__)

# Temporary hardcoded users for development (replaced by DB in Fase 2)
_DEV_USERS = {
    "lasse": {
        "id": 1,
        "username": "lasse",
        "password": "demo123",
        "display_name": "Lasse Ruud",
        "email": "lasse@kvtas.no",
        "role": "admin",
    },
    "trond": {
        "id": 2,
        "username": "trond",
        "password": "demo123",
        "display_name": "Trond Ilbråten",
        "email": "trond@kvtas.no",
        "role": "user",
    },
}


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Mangler innloggingsdata"}), 400

    username = data.get("username", "").strip().lower()
    password = data.get("password", "")

    user = _DEV_USERS.get(username)
    if not user or user["password"] != password:
        return jsonify({"error": "Feil brukernavn eller passord"}), 401

    token = create_token(user["id"], user["role"])
    user_data = {k: v for k, v in user.items() if k != "password"}

    resp = make_response(jsonify(user_data))
    resp.set_cookie(
        "token",
        token,
        httponly=True,
        samesite="None" if Config.SECURE_COOKIES else "Strict",
        secure=Config.SECURE_COOKIES,
        max_age=Config.JWT_EXPIRY_HOURS * 3600,
        path="/",
    )
    return resp


@auth_bp.route("/logout", methods=["POST"])
def logout():
    resp = make_response(jsonify({"message": "Logget ut"}))
    resp.delete_cookie("token", path="/")
    return resp


@auth_bp.route("/me")
@require_auth
def me():
    from flask import g
    user_id = g.user_id

    # Find user by ID (dev lookup)
    for user in _DEV_USERS.values():
        if user["id"] == user_id:
            return jsonify({k: v for k, v in user.items() if k != "password"})

    return jsonify({"error": "Bruker ikke funnet"}), 404
