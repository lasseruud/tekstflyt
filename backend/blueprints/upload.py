import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from middleware.auth import require_auth, require_csrf
from config import Config

upload_bp = Blueprint("upload", __name__)


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


@upload_bp.route("", methods=["POST"])
@require_auth
@require_csrf
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "Ingen fil lastet opp"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Ingen fil valgt"}), 400

    if not _allowed_file(file.filename):
        allowed = ", ".join(sorted(Config.ALLOWED_EXTENSIONS))
        return jsonify({"error": f"Filtype ikke tillatt. Tillatte typer: {allowed}"}), 400

    # Check file size
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > Config.MAX_UPLOAD_SIZE:
        max_mb = Config.MAX_UPLOAD_SIZE // (1024 * 1024)
        return jsonify({"error": f"Filen er for stor. Maks {max_mb} MB"}), 400

    # Create upload dir if needed
    os.makedirs(Config.UPLOAD_DIR, exist_ok=True)

    # Save with randomized filename
    original_name = secure_filename(file.filename)
    ext = original_name.rsplit(".", 1)[1].lower() if "." in original_name else ""
    random_name = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(Config.UPLOAD_DIR, random_name)

    file.save(filepath)

    return jsonify({
        "filename": original_name,
        "stored_name": random_name,
        "path": filepath,
        "size": size,
    }), 201
