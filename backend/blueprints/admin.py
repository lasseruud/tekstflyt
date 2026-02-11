from flask import Blueprint, request, jsonify
from psycopg2.errors import UniqueViolation
from middleware.auth import require_admin, require_csrf
from models import user as user_model

admin_bp = Blueprint("admin", __name__)


# --- User management ---

@admin_bp.route("/users", methods=["GET"])
@require_admin
def list_users():
    users = user_model.list_all()
    return jsonify(users)


@admin_bp.route("/users", methods=["POST"])
@require_admin
@require_csrf
def create_user():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Mangler data"}), 400

    required = ["username", "password", "display_name", "email"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"Mangler {field}"}), 400

    role = data.get("role", "user")
    if role not in ("user", "admin"):
        return jsonify({"error": "Ugyldig rolle"}), 400

    try:
        user = user_model.create(
            username=data["username"].strip().lower(),
            password=data["password"],
            display_name=data["display_name"],
            email=data["email"],
            role=role,
        )
    except UniqueViolation:
        return jsonify({"error": "Brukernavnet er allerede i bruk"}), 409

    return jsonify(user), 201


@admin_bp.route("/users/<int:user_id>", methods=["PUT"])
@require_admin
@require_csrf
def update_user(user_id: int):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Mangler data"}), 400

    # Update password separately if provided
    if data.get("password"):
        user_model.update_password(user_id, data["password"])

    updated = user_model.update(
        user_id,
        display_name=data.get("display_name", ""),
        email=data.get("email", ""),
        role=data.get("role", "user"),
    )
    if not updated:
        return jsonify({"error": "Bruker ikke funnet"}), 404

    return jsonify(updated)


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@require_admin
@require_csrf
def delete_user(user_id: int):
    from flask import g
    if user_id == g.user_id:
        return jsonify({"error": "Kan ikke slette egen bruker"}), 400

    if not user_model.delete(user_id):
        return jsonify({"error": "Bruker ikke funnet"}), 404

    return "", 204


# --- Knowledge base management ---

@admin_bp.route("/knowledge", methods=["GET"])
@require_admin
def list_knowledge():
    from models import knowledge as knowledge_model
    docs = knowledge_model.list_all()
    return jsonify(docs)


@admin_bp.route("/knowledge", methods=["POST"])
@require_admin
@require_csrf
def upload_knowledge():
    from flask import g
    from services.knowledge_service import process_knowledge_document

    if "file" not in request.files:
        return jsonify({"error": "Ingen fil lastet opp"}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Kun PDF-filer støttes"}), 400

    category = request.form.get("category", "general")
    description = request.form.get("description", "")

    result = process_knowledge_document(file, category, description, g.user_id)
    return jsonify(result), 201


@admin_bp.route("/knowledge/<int:doc_id>", methods=["DELETE"])
@require_admin
@require_csrf
def delete_knowledge(doc_id: int):
    from models import knowledge as knowledge_model
    if not knowledge_model.delete(doc_id):
        return jsonify({"error": "Dokument ikke funnet"}), 404
    return "", 204


@admin_bp.route("/knowledge/<int:doc_id>/chunks", methods=["GET"])
@require_admin
def get_chunks(doc_id: int):
    from models import knowledge as knowledge_model
    chunks = knowledge_model.get_chunks(doc_id)
    return jsonify(chunks)


@admin_bp.route("/knowledge/search", methods=["GET"])
@require_admin
def search_knowledge():
    query = request.args.get("q", "")
    if not query:
        return jsonify({"error": "Mangler søkeord"}), 400

    from services.embedding_service import search_similar
    results = search_similar(query, limit=5)
    return jsonify(results)
