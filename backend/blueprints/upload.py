import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from middleware.auth import require_auth, require_csrf
from config import Config

upload_bp = Blueprint("upload", __name__)

MAGIC_BYTES = {
    "pdf": b"%PDF",
    "docx": b"PK",
    "doc": b"\xd0\xcf\x11\xe0",
    "xlsx": b"PK",
    "xls": b"\xd0\xcf\x11\xe0",
    "png": b"\x89PNG",
    "jpg": b"\xff\xd8\xff",
    "jpeg": b"\xff\xd8\xff",
}


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def _validate_magic_bytes(file, ext: str) -> bool:
    """Check that file content matches expected magic bytes for the extension."""
    expected = MAGIC_BYTES.get(ext)
    if expected is None:
        return True
    header = file.read(max(len(expected), 8))
    file.seek(0)
    return header.startswith(expected)


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

    # Validate magic bytes match extension
    original_name = secure_filename(file.filename)
    ext = original_name.rsplit(".", 1)[1].lower() if "." in original_name else ""
    if not _validate_magic_bytes(file, ext):
        return jsonify({"error": "Filinnholdet samsvarer ikke med filtypen"}), 400

    # Create upload dir if needed
    os.makedirs(Config.UPLOAD_DIR, exist_ok=True)
    random_name = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(Config.UPLOAD_DIR, random_name)

    file.save(filepath)

    return jsonify({
        "filename": original_name,
        "stored_name": random_name,
        "path": filepath,
        "size": size,
    }), 201
