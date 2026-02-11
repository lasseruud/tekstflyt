import os
import logging
from config import Config

logger = logging.getLogger(__name__)

PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


def _load_prompt(name: str) -> str:
    path = os.path.join(PROMPT_DIR, f"{name}.txt")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _build_system_prompt(doc: dict) -> str:
    base = _load_prompt("base_system")
    type_prompt = _load_prompt(doc["document_type"])
    return f"{base}\n\n{type_prompt}"


def _build_user_prompt(doc: dict, user_prompt: str) -> str:
    parts = []

    if doc.get("recipient_name"):
        parts.append(f"Mottaker: {doc['recipient_name']}")
    if doc.get("recipient_address"):
        parts.append(f"Adresse: {doc['recipient_address']}")
    if doc.get("recipient_postal_code") and doc.get("recipient_city"):
        parts.append(f"Poststed: {doc['recipient_postal_code']} {doc['recipient_city']}")
    if doc.get("recipient_person"):
        parts.append(f"Kontaktperson: {doc['recipient_person']}")
    if doc.get("customer_type"):
        parts.append(f"Kundetype: {'Bedrift' if doc['customer_type'] == 'business' else 'Privat'}")
    if doc.get("price_product"):
        parts.append(f"Produktpris: {doc['price_product']} kr")
    if doc.get("price_installation"):
        parts.append(f"Installasjonspris: {doc['price_installation']} kr")

    # Include attachment content only for types that use it
    if doc["document_type"] in ("omprofilering", "svar_paa_brev"):
        attachment_text = _read_attachment(doc)
        if attachment_text:
            parts.append(f"\n--- Vedlagt dokument ---\n{attachment_text}\n--- Slutt vedlegg ---")

    # Include RAG context from knowledge base for all document types
    rag_query = f"KVTAS bedriftsinformasjon {user_prompt}"
    rag_context = _get_rag_context(rag_query)
    if rag_context:
        parts.append(f"\n--- Relevant informasjon fra kunnskapsbasen ---\n{rag_context}\n--- Slutt kunnskapsbase ---")

    if user_prompt:
        parts.append(f"\nBrukerens instruksjon:\n{user_prompt}")

    return "\n".join(parts)


def _read_attachment(doc: dict) -> str | None:
    path = doc.get("file_path_attachment")
    if not path or not os.path.exists(path):
        return None

    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""

    if ext == "pdf":
        try:
            import subprocess
            result = subprocess.run(
                ["pdftotext", path, "-"],
                capture_output=True, text=True, timeout=30,
            )
            return result.stdout if result.returncode == 0 else None
        except Exception:
            logger.warning("Could not extract text from PDF: %s", path)
            return None

    if ext in ("doc", "docx"):
        try:
            from docx import Document as DocxDocument
            doc_file = DocxDocument(path)
            return "\n".join(p.text for p in doc_file.paragraphs)
        except Exception:
            logger.warning("Could not extract text from DOCX: %s", path)
            return None

    if ext in ("txt", "csv"):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    return None


def _get_rag_context(query: str) -> str | None:
    try:
        from services.embedding_service import search_similar
        results = search_similar(query, limit=3)
        if results:
            return "\n\n".join(r["content"] for r in results)
    except Exception:
        logger.warning("RAG search failed, continuing without context")
    return None


def generate_document_name(doc: dict, generated_text: str) -> str:
    """Generate a document name based on type, customer and content."""
    from datetime import date

    date_str = date.today().strftime("%d.%m.%Y")
    doc_type = doc["document_type"]
    customer = doc.get("recipient_name") or ""

    # Ask the AI for a short subject (product/topic)
    type_instructions = {
        "tilbud": "Hva er produktet/tjenesten det gis tilbud på? Svar med maks 5 ord.",
        "brev": "Hva handler brevet om? Svar med maks 5 ord.",
        "notat": "Hva handler notatet om? Svar med maks 5 ord.",
        "omprofilering": "Hva er produktet/tjenesten det gis tilbud på? Svar med maks 5 ord.",
        "svar_paa_brev": "Hva handler brevet om? Svar med maks 5 ord.",
        "serviceavtale": "Hva slags anlegg gjelder serviceavtalen? Svar med maks 5 ord.",
    }

    subject = ""
    try:
        import anthropic
        client = anthropic.Anthropic(timeout=30.0)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=50,
            messages=[{
                "role": "user",
                "content": f"{type_instructions[doc_type]}\n\nTekst:\n{generated_text[:1000]}",
            }],
        )
        subject = resp.content[0].text.strip().rstrip(".")
    except Exception:
        logger.warning("Could not generate document subject, using fallback")
        subject = "diverse"

    templates = {
        "tilbud": f"{date_str} - Tilbud på {subject} til {customer}" if customer else f"{date_str} - Tilbud på {subject}",
        "brev": f"{date_str} - Brev til {customer} vedr. {subject}" if customer else f"{date_str} - Brev vedr. {subject}",
        "notat": f"{date_str} - Notat vedr. {subject}",
        "omprofilering": f"{date_str} - Tilbud på {subject} til {customer}" if customer else f"{date_str} - Tilbud på {subject}",
        "svar_paa_brev": f"{date_str} - Svar til {customer} vedr. {subject}" if customer else f"{date_str} - Svar vedr. {subject}",
        "serviceavtale": f"{date_str} - Serviceavtale {subject} for {customer}" if customer else f"{date_str} - Serviceavtale {subject}",
    }

    return templates.get(doc_type, f"{date_str} - {subject}")


def generate_document_text(doc: dict, user_prompt: str) -> dict:
    """Generate document text using Claude (primary) or GPT (fallback)."""
    system_prompt = _build_system_prompt(doc)
    full_prompt = _build_user_prompt(doc, user_prompt)

    # Try Claude first
    try:
        return _generate_with_claude(system_prompt, full_prompt)
    except Exception as e:
        logger.warning("Claude failed: %s. Falling back to GPT.", e)

    # Fallback to GPT
    try:
        return _generate_with_gpt(system_prompt, full_prompt)
    except Exception as e:
        logger.error("GPT also failed: %s", e)
        raise RuntimeError("Kunne ikke generere tekst. Prøv igjen senere.") from e


def _generate_with_claude(system_prompt: str, user_prompt: str) -> dict:
    import anthropic
    client = anthropic.Anthropic(timeout=120.0)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    return {
        "text": response.content[0].text,
        "model": f"claude:{response.model}",
    }


def _generate_with_gpt(system_prompt: str, user_prompt: str) -> dict:
    import openai
    client = openai.OpenAI(timeout=120.0)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=4096,
    )

    return {
        "text": response.choices[0].message.content,
        "model": f"gpt:{response.model}",
    }
