import os
from flask import Blueprint, request, jsonify, g
from middleware.auth import require_auth, require_csrf
from models import document as doc_model
from config import Config

documents_bp = Blueprint("documents", __name__)


@documents_bp.route("", methods=["GET"])
@require_auth
def list_documents():
    search = request.args.get("search")
    doc_type = request.args.get("type")
    is_admin = g.user_role == "admin"
    docs = doc_model.list_by_user(g.user_id, search=search, doc_type=doc_type, admin=is_admin)
    return jsonify(docs)


@documents_bp.route("/<int:doc_id>", methods=["GET"])
@require_auth
def get_document(doc_id: int):
    doc = doc_model.find_by_id(doc_id)
    if not doc or (doc["user_id"] != g.user_id and g.user_role != "admin"):
        return jsonify({"error": "Dokument ikke funnet"}), 404
    return jsonify(doc)


@documents_bp.route("", methods=["POST"])
@require_auth
@require_csrf
def create_document():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Mangler data"}), 400

    doc_type = data.get("document_type")
    if doc_type not in ("tilbud", "brev", "notat", "omprofilering", "svar_paa_brev", "serviceavtale"):
        return jsonify({"error": "Ugyldig dokumenttype"}), 400

    type_labels = {
        "tilbud": "Tilbud",
        "brev": "Brev",
        "notat": "Notat",
        "omprofilering": "Omprofilering",
        "svar_paa_brev": "Svar på brev",
        "serviceavtale": "Serviceavtale",
    }
    doc_name = data.get("document_name", f"Nytt {type_labels[doc_type]}")

    doc = doc_model.create(
        user_id=g.user_id,
        document_type=doc_type,
        document_name=doc_name,
        customer_id=data.get("customer_id"),
        recipient_name=data.get("recipient_name"),
        recipient_address=data.get("recipient_address"),
        recipient_postal_code=data.get("recipient_postal_code"),
        recipient_city=data.get("recipient_city"),
        recipient_person=data.get("recipient_person"),
        recipient_phone=data.get("recipient_phone"),
        recipient_email=data.get("recipient_email"),
        customer_type=data.get("customer_type"),
        price_product=data.get("price_product"),
        price_installation=data.get("price_installation"),
    )
    return jsonify(doc), 201


@documents_bp.route("/<int:doc_id>", methods=["PUT"])
@require_auth
@require_csrf
def update_document(doc_id: int):
    doc = doc_model.find_by_id(doc_id)
    if not doc or (doc["user_id"] != g.user_id and g.user_role != "admin"):
        return jsonify({"error": "Dokument ikke funnet"}), 404
    if doc["status"] == "finalized":
        return jsonify({"error": "Kan ikke redigere fullført dokument"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "Mangler data"}), 400

    allowed = [
        "document_name", "recipient_name", "recipient_address", "recipient_postal_code",
        "recipient_city", "recipient_person", "recipient_phone", "recipient_email",
        "customer_type", "customer_id", "price_product", "price_installation",
        "document_text", "ai_prompt", "file_path_attachment",
    ]
    updates = {k: v for k, v in data.items() if k in allowed}

    updated = doc_model.update(doc_id, **updates)
    return jsonify(updated)


@documents_bp.route("/<int:doc_id>", methods=["DELETE"])
@require_auth
@require_csrf
def delete_document(doc_id: int):
    doc = doc_model.find_by_id(doc_id)
    if not doc or (doc["user_id"] != g.user_id and g.user_role != "admin"):
        return jsonify({"error": "Dokument ikke funnet"}), 404

    # Clean up generated files
    for key in ("file_path_word", "file_path_word_signed", "file_path_pdf", "file_path_pdf_signed", "file_path_attachment"):
        path = doc.get(key)
        if path and os.path.exists(path):
            os.remove(path)

    doc_model.delete(doc_id)
    return "", 204


@documents_bp.route("/<int:doc_id>/generate", methods=["POST"])
@require_auth
@require_csrf
def generate_text(doc_id: int):
    doc = doc_model.find_by_id(doc_id)
    if not doc or (doc["user_id"] != g.user_id and g.user_role != "admin"):
        return jsonify({"error": "Dokument ikke funnet"}), 404

    # Lock document for generation (prevents parallel requests)
    if not doc_model.set_status(doc_id, "generating", ["draft"]):
        if doc["status"] == "finalized":
            return jsonify({"error": "Kan ikke regenerere fullført dokument"}), 400
        return jsonify({"error": "Dokumentet er allerede under behandling"}), 409

    try:
        data = request.get_json() or {}
        prompt = data.get("prompt", doc.get("ai_prompt", ""))

        from services.ai_service import generate_document_text, generate_document_name
        result = generate_document_text(doc, prompt)

        # Auto-generate document name from content
        doc_name = generate_document_name(doc, result["text"])

        updates = {
            "document_text": result["text"],
            "ai_model": result["model"],
            "document_name": doc_name,
            "status": "draft",
        }
        if prompt:
            updates["ai_prompt"] = prompt

        updated = doc_model.update(doc_id, **updates)
        return jsonify(updated)
    except Exception:
        doc_model.set_status(doc_id, "draft")
        raise


@documents_bp.route("/<int:doc_id>/finalize", methods=["POST"])
@require_auth
@require_csrf
def finalize_document(doc_id: int):
    doc = doc_model.find_by_id(doc_id)
    if not doc or (doc["user_id"] != g.user_id and g.user_role != "admin"):
        return jsonify({"error": "Dokument ikke funnet"}), 404
    if not doc.get("document_text"):
        return jsonify({"error": "Dokumentet har ingen tekst"}), 400

    # Lock for finalization (prevents parallel requests)
    if not doc_model.set_status(doc_id, "finalizing", ["draft"]):
        if doc["status"] == "finalized":
            return jsonify({"error": "Dokument allerede fullført"}), 400
        return jsonify({"error": "Dokumentet er under behandling"}), 409

    try:
        from services.document_generator import generate_files
        file_paths = generate_files(doc)

        if not file_paths.get("word"):
            doc_model.set_status(doc_id, "draft")
            return jsonify({"error": "Kunne ikke generere dokumentfiler"}), 500

        updated = doc_model.finalize(doc_id, file_paths)
        return jsonify(updated)
    except Exception:
        doc_model.set_status(doc_id, "draft")
        raise


@documents_bp.route("/<int:doc_id>/download/<file_type>")
@require_auth
def download_file(doc_id: int, file_type: str):
    from flask import send_file

    doc = doc_model.find_by_id(doc_id)
    if not doc or (doc["user_id"] != g.user_id and g.user_role != "admin"):
        return jsonify({"error": "Dokument ikke funnet"}), 404

    type_map = {
        "word": "file_path_word",
        "word_signed": "file_path_word_signed",
        "pdf": "file_path_pdf",
        "pdf_signed": "file_path_pdf_signed",
    }

    if file_type not in type_map:
        return jsonify({"error": "Ugyldig filtype"}), 400

    file_path = doc.get(type_map[file_type])
    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "Fil ikke funnet"}), 404

    return send_file(file_path, as_attachment=True)


@documents_bp.route("/<int:doc_id>/clone", methods=["POST"])
@require_auth
@require_csrf
def clone_document(doc_id: int):
    doc = doc_model.find_by_id(doc_id)
    if not doc or (doc["user_id"] != g.user_id and g.user_role != "admin"):
        return jsonify({"error": "Dokument ikke funnet"}), 404

    cloned = doc_model.clone(doc_id, g.user_id)
    if not cloned:
        return jsonify({"error": "Kunne ikke klone dokument"}), 500

    return jsonify(cloned), 201


@documents_bp.route("/<int:doc_id>/email", methods=["POST"])
@require_auth
@require_csrf
def email_document(doc_id: int):
    doc = doc_model.find_by_id(doc_id)
    if not doc or (doc["user_id"] != g.user_id and g.user_role != "admin"):
        return jsonify({"error": "Dokument ikke funnet"}), 404
    if doc["status"] != "finalized":
        return jsonify({"error": "Dokumentet må fullføres før det kan sendes"}), 400

    from services.email_service import send_document_email
    from models import user as user_model

    user = user_model.find_by_id(g.user_id)
    success = send_document_email(doc, user["email"])

    if success:
        return jsonify({"message": f"Dokumenter sendt til {user['email']}"})
    return jsonify({"error": "Kunne ikke sende e-post"}), 500
