from flask import Blueprint, request, jsonify
from middleware.auth import require_auth, require_csrf
from models import customer as customer_model

customers_bp = Blueprint("customers", __name__)


@customers_bp.route("", methods=["GET"])
@require_auth
def list_customers():
    query = request.args.get("q")
    limit = request.args.get("limit", 20, type=int)
    customers = customer_model.search(query=query, limit=min(limit, 100))
    return jsonify(customers)


@customers_bp.route("/<int:customer_id>", methods=["GET"])
@require_auth
def get_customer(customer_id: int):
    customer = customer_model.find_by_id(customer_id)
    if not customer:
        return jsonify({"error": "Kunde ikke funnet"}), 404
    return jsonify(customer)


@customers_bp.route("", methods=["POST"])
@require_auth
@require_csrf
def create_customer():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Mangler kundenavn"}), 400

    customer_type = data.get("customer_type", "private")
    if customer_type not in ("business", "private"):
        return jsonify({"error": "Ugyldig kundetype"}), 400

    customer = customer_model.create(
        name=data["name"],
        customer_type=customer_type,
        address=data.get("address"),
        postal_code=data.get("postal_code"),
        city=data.get("city"),
        contact_person=data.get("contact_person"),
        phone=data.get("phone"),
        email=data.get("email"),
    )
    return jsonify(customer), 201


@customers_bp.route("/<int:customer_id>", methods=["PUT"])
@require_auth
@require_csrf
def update_customer(customer_id: int):
    customer = customer_model.find_by_id(customer_id)
    if not customer:
        return jsonify({"error": "Kunde ikke funnet"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Mangler data"}), 400

    updated = customer_model.update(customer_id, **data)
    return jsonify(updated)


@customers_bp.route("/import", methods=["POST"])
@require_auth
@require_csrf
def import_customers():
    if "file" not in request.files:
        return jsonify({"error": "Mangler CSV-fil"}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.endswith(".csv"):
        return jsonify({"error": "Filen må være CSV"}), 400

    csv_text = file.read().decode("utf-8-sig")
    count = customer_model.import_csv(csv_text)
    return jsonify({"message": f"Importerte {count} kunder", "count": count})
