import os
import logging
import subprocess
from datetime import datetime
from docx import Document
from config import Config

logger = logging.getLogger(__name__)

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
OUTPUT_DIR = os.path.join(Config.UPLOAD_DIR, "generated")


def _ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def _get_template_path(doc_type: str) -> str:
    template_map = {
        "tilbud": "offer_template.docx",
        "brev": "letter_template.docx",
        "notat": "note_template.docx",
        "omprofilering": "letter_template.docx",
        "svar_paa_brev": "letter_template.docx",
    }
    return os.path.join(TEMPLATE_DIR, template_map.get(doc_type, "letter_template.docx"))


def _safe_filename(name: str) -> str:
    return "".join(c if c.isalnum() or c in "._- " else "_" for c in name).strip()


def generate_files(doc: dict) -> dict:
    """Generate Word and PDF files from document data. Returns dict of file paths."""
    _ensure_output_dir()

    base_name = _safe_filename(doc["document_name"])
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_base = f"{base_name}_{timestamp}"

    # Generate unsigned Word
    word_path = _generate_word(doc, file_base, signed=False)
    word_signed_path = _generate_word(doc, file_base, signed=True)

    # Generate PDFs from Word files
    pdf_path = _convert_to_pdf(word_path)
    pdf_signed_path = _convert_to_pdf(word_signed_path)

    return {
        "word": word_path,
        "word_signed": word_signed_path,
        "pdf": pdf_path,
        "pdf_signed": pdf_signed_path,
    }


def _generate_word(doc: dict, file_base: str, signed: bool) -> str:
    template_path = _get_template_path(doc["document_type"])
    document = Document(template_path)

    # Replace placeholders in template
    replacements = _build_replacements(doc)

    for paragraph in document.paragraphs:
        for key, value in replacements.items():
            if key in paragraph.text:
                for run in paragraph.runs:
                    if key in run.text:
                        run.text = run.text.replace(key, value)

    # Add document body text
    text = doc.get("document_text", "")
    for line in text.split("\n"):
        line = line.strip()
        if line.startswith("# "):
            p = document.add_heading(line[2:], level=1)
        elif line.startswith("## "):
            p = document.add_heading(line[3:], level=2)
        elif line.startswith("### "):
            p = document.add_heading(line[4:], level=3)
        elif line.startswith("- "):
            p = document.add_paragraph(line[2:], style="List Bullet")
        elif line:
            p = document.add_paragraph(line)

    # Add signature if signed version
    if signed:
        document.add_paragraph()
        document.add_paragraph("Med vennlig hilsen,")
        document.add_paragraph("Trond Ilbråten")
        document.add_paragraph("Kulde- & Varmepumpeteknikk AS")

        sig_path = os.path.join(TEMPLATE_DIR, "signature.png")
        if os.path.exists(sig_path):
            try:
                from docx.shared import Cm
                document.add_picture(sig_path, width=Cm(5))
            except Exception:
                logger.warning("Could not insert signature image")

    suffix = "_signert" if signed else ""
    output_path = os.path.join(OUTPUT_DIR, f"{file_base}{suffix}.docx")
    document.save(output_path)
    return output_path


def _build_replacements(doc: dict) -> dict:
    today = datetime.now().strftime("%d.%m.%Y")
    return {
        "{{DATO}}": today,
        "{{MOTTAKER_NAVN}}": doc.get("recipient_name") or "",
        "{{MOTTAKER_ADRESSE}}": doc.get("recipient_address") or "",
        "{{MOTTAKER_POSTNR}}": doc.get("recipient_postal_code") or "",
        "{{MOTTAKER_POSTSTED}}": doc.get("recipient_city") or "",
        "{{KONTAKTPERSON}}": doc.get("recipient_person") or "",
        "{{TELEFON}}": doc.get("recipient_phone") or "",
        "{{EPOST}}": doc.get("recipient_email") or "",
        "{{DOKUMENTNAVN}}": doc.get("document_name") or "",
        "{{PRIS_PRODUKT}}": f"{doc['price_product']:,.2f} kr" if doc.get("price_product") else "",
        "{{PRIS_INSTALLASJON}}": f"{doc['price_installation']:,.2f} kr" if doc.get("price_installation") else "",
    }


def _convert_to_pdf(word_path: str) -> str | None:
    """Convert Word file to PDF using LibreOffice headless."""
    try:
        result = subprocess.run(
            [
                "libreoffice", "--headless", "--convert-to", "pdf",
                "--outdir", OUTPUT_DIR, word_path,
            ],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode == 0:
            pdf_path = word_path.rsplit(".", 1)[0] + ".pdf"
            if os.path.exists(pdf_path):
                return pdf_path
        logger.error("LibreOffice conversion failed: %s", result.stderr)
    except subprocess.TimeoutExpired:
        logger.error("LibreOffice conversion timed out for %s", word_path)
    except FileNotFoundError:
        logger.error("LibreOffice not installed - PDF generation unavailable")

    return None
