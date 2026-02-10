from flask import Blueprint, request, jsonify, make_response, g
from middleware.auth import create_token, generate_csrf_token, require_auth, require_csrf
from config import Config
from models import user as user_model

auth_bp = Blueprint("auth", __name__)


def _user_response(user: dict) -> dict:
    return {
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"],
        "email": user["email"],
        "role": user["role"],
    }


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Mangler innloggingsdata"}), 400

    username = data.get("username", "").strip().lower()
    password = data.get("password", "")

    user = user_model.find_by_username(username)
    if not user or not user_model.verify_password(password, user["password_hash"]):
        return jsonify({"error": "Feil brukernavn eller passord"}), 401

    user_model.update_last_login(user["id"])
    token = create_token(user["id"], user["role"])

    csrf_token = generate_csrf_token()
    resp = make_response(jsonify(_user_response(user)))
    resp.set_cookie(
        "token",
        token,
        httponly=True,
        samesite="None" if Config.SECURE_COOKIES else "Strict",
        secure=Config.SECURE_COOKIES,
        max_age=Config.JWT_EXPIRY_HOURS * 3600,
        path="/",
    )
    resp.set_cookie(
        "csrf_token",
        csrf_token,
        httponly=False,
        samesite="None" if Config.SECURE_COOKIES else "Strict",
        secure=Config.SECURE_COOKIES,
        max_age=Config.JWT_EXPIRY_HOURS * 3600,
        path="/",
    )
    return resp


@auth_bp.route("/logout", methods=["POST"])
@require_csrf
def logout():
    resp = make_response(jsonify({"message": "Logget ut"}))
    resp.delete_cookie("token", path="/")
    resp.delete_cookie("csrf_token", path="/")
    return resp


@auth_bp.route("/me")
@require_auth
def me():
    user = user_model.find_by_id(g.user_id)
    if not user:
        return jsonify({"error": "Bruker ikke funnet"}), 404
    return jsonify(_user_response(user))
