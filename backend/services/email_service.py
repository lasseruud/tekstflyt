import os
import logging
import smtplib
import zipfile
import tempfile
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "noreply@tekstflyt.com")


def send_document_email(doc: dict, recipient_email: str) -> bool:
    """Send all document files as a zip attachment via email."""
    if not SMTP_HOST:
        logger.error("SMTP not configured")
        return False

    # Collect all file paths
    files = []
    for key in ("file_path_word", "file_path_word_signed", "file_path_pdf", "file_path_pdf_signed"):
        path = doc.get(key)
        if path and os.path.exists(path):
            files.append(path)

    if not files:
        logger.error("No files to send for document %s", doc["id"])
        return False

    # Create zip
    zip_path = _create_zip(files, doc["document_name"])

    try:
        msg = MIMEMultipart()
        msg["From"] = SMTP_FROM
        msg["To"] = recipient_email
        msg["Subject"] = f"TekstFlyt: {doc['document_name']}"

        body = f"""Hei,

Vedlagt finner du dokumentet "{doc['document_name']}" fra TekstFlyt.

Filen inneholder {len(files)} dokumentvariant(er) i en zip-fil.

Med vennlig hilsen,
TekstFlyt - Kulde- & Varmepumpeteknikk AS
"""
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with open(zip_path, "rb") as f:
            part = MIMEBase("application", "zip")
            part.set_payload(f.read())
            encoders.encode_base64(part)
            safe_name = secure_filename(doc['document_name']) or "dokument"
            part.add_header("Content-Disposition", f'attachment; filename="{safe_name}.zip"')
            msg.attach(part)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            if SMTP_USER:
                server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)

        logger.info("Email sent to %s for document %s", recipient_email, doc["id"])
        return True

    except Exception as e:
        logger.error("Failed to send email: %s", e)
        return False
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)


def _create_zip(files: list[str], name: str) -> str:
    safe_name = secure_filename(name) or "dokument"
    zip_path = os.path.join(tempfile.gettempdir(), f"{safe_name}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for filepath in files:
            zf.write(filepath, os.path.basename(filepath))
    return zip_path
