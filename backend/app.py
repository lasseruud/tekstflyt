from flask import Flask
from flask_cors import CORS
from config import Config
from blueprints.auth import auth_bp
from blueprints.health import health_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=[Config.CORS_ORIGIN], supports_credentials=True)

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
