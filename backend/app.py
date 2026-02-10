from decimal import Decimal

from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from config import Config
from blueprints.auth import auth_bp
from blueprints.health import health_bp
from blueprints.documents import documents_bp
from blueprints.customers import customers_bp
from blueprints.upload import upload_bp
from blueprints.admin import admin_bp
from db import init_db, close_db


class CustomJSONProvider(DefaultJSONProvider):
    @staticmethod
    def default(o):
        if isinstance(o, Decimal):
            return float(o)
        return DefaultJSONProvider.default(o)


def create_app() -> Flask:
    app = Flask(__name__)
    app.json_provider_class = CustomJSONProvider
    app.json = CustomJSONProvider(app)
    app.config.from_object(Config)
    Config.validate()

    CORS(app, origins=[Config.CORS_ORIGIN], supports_credentials=True)

    init_db()

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(documents_bp, url_prefix="/api/documents")
    app.register_blueprint(customers_bp, url_prefix="/api/customers")
    app.register_blueprint(upload_bp, url_prefix="/api/upload")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.teardown_appcontext
    def shutdown(exception=None):
        pass  # Connection pool handles cleanup

    return app


if __name__ == "__main__":
    import os
    app = create_app()
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(debug=debug, host="0.0.0.0", port=5001)
