import os
import re
import logging
import subprocess
from datetime import datetime
from docx import Document
from docx.shared import Pt
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


def _replace_paragraph_placeholder(paragraph, key, value):
    """Replace placeholder in paragraph, handling split runs."""
    full_text = paragraph.text
    if key not in full_text:
        return False

    new_text = full_text.replace(key, value)
    # Clear all runs and set the replacement text on the first run
    for i, run in enumerate(paragraph.runs):
        if i == 0:
            run.text = new_text
        else:
            run.text = ""
    return True


def _add_markdown_paragraph(document, line, insert_before=None):
    """Add a paragraph with inline markdown formatting (bold/italic)."""
    p = document.add_paragraph()

    # Parse inline markdown: **bold**, *italic*
    # Pattern matches **bold**, *italic*, or plain text
    parts = re.split(r'(\*\*.*?\*\*|\*.*?\*)', line)

    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = p.add_run(part[2:-2])
            run.bold = True
        elif part.startswith("*") and part.endswith("*"):
            run = p.add_run(part[1:-1])
            run.italic = True
        else:
            p.add_run(part)

    return p


def _insert_document_text(document, text, insert_index):
    """Insert formatted markdown text at a specific position in the document."""
    paragraphs_to_add = []

    for line in text.split("\n"):
        line = line.strip()
        if not line:
            paragraphs_to_add.append(("empty", ""))
        elif line.startswith("### "):
            paragraphs_to_add.append(("heading3", line[4:]))
        elif line.startswith("## "):
            paragraphs_to_add.append(("heading2", line[3:]))
        elif line.startswith("# "):
            paragraphs_to_add.append(("heading1", line[2:]))
        elif line.startswith("- "):
            paragraphs_to_add.append(("bullet", line[2:]))
        elif line.startswith("---"):
            continue  # Skip horizontal rules
        else:
            paragraphs_to_add.append(("normal", line))

    # Add paragraphs at the end of the document body (placeholder paragraph removed)
    for ptype, content in paragraphs_to_add:
        if ptype == "empty":
            document.add_paragraph()
        elif ptype.startswith("heading"):
            level = int(ptype[-1])
            document.add_heading(content, level=level)
        elif ptype == "bullet":
            p = document.add_paragraph()
            _add_inline_runs(p, f"  \u2022  {content}")
        else:
            p = document.add_paragraph()
            _add_inline_runs(p, content)


def _add_inline_runs(paragraph, text):
    """Parse inline markdown (bold/italic) and add as runs to paragraph."""
    parts = re.split(r'(\*\*.*?\*\*|\*.*?\*)', text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = paragraph.add_run(part[2:-2])
            run.bold = True
        elif part.startswith("*") and part.endswith("*"):
            run = paragraph.add_run(part[1:-1])
            run.italic = True
        else:
            paragraph.add_run(part)


def _generate_word(doc: dict, file_base: str, signed: bool) -> str:
    template_path = _get_template_path(doc["document_type"])
    document = Document(template_path)

    # Build replacements matching template placeholders
    replacements = _build_replacements(doc)

    # Replace simple placeholders (handles split runs)
    for paragraph in document.paragraphs:
        for key, value in replacements.items():
            _replace_paragraph_placeholder(paragraph, key, value)

    # Also replace in tables (some templates use tables for layout)
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    for key, value in replacements.items():
                        _replace_paragraph_placeholder(paragraph, key, value)

    # Find and replace {{documentText}} with formatted content
    text = doc.get("document_text", "")
    text_placeholder_found = False

    for i, paragraph in enumerate(document.paragraphs):
        if "{{documentText}}" in paragraph.text:
            # Clear the placeholder paragraph
            for run in paragraph.runs:
                run.text = ""
            text_placeholder_found = True
            break

    # Insert document text (appended to end - placeholder paragraph is now empty)
    if text:
        _insert_document_text(document, text, 0)

    # If no placeholder was found, text was already appended at the end

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
    """Build replacement dict matching actual template placeholders."""
    today = datetime.now().strftime("%d.%m.%Y")
    return {
        # Match template placeholders exactly
        "{{dato}}": today,
        "{{mottaker}}": doc.get("recipient_name") or "",
        "{{recipientPerson}}": doc.get("recipient_person") or "",
        "{{recipientAddress}}": doc.get("recipient_address") or "",
        "{{recipientPostalCode}}": doc.get("recipient_postal_code") or "",
        "{{recipientCity}}": doc.get("recipient_city") or "",
        "{{recipientPhone}}": doc.get("recipient_phone") or "",
        "{{recipientEmail}}": doc.get("recipient_email") or "",
        "{{documentTitle}}": doc.get("document_name") or "",
        "{{documentName}}": doc.get("document_name") or "",
        "{{prisProdukt}}": f"{doc['price_product']:,.2f} kr" if doc.get("price_product") else "",
        "{{prisInstallasjon}}": f"{doc['price_installation']:,.2f} kr" if doc.get("price_installation") else "",
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
