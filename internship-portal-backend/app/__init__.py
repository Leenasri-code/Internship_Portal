import logging

from flask import Flask, jsonify
from flask_cors import CORS

from config import Config

from .errors import register_error_handlers
from .extensions import create_mongo_client
from .models import ensure_indexes
from .routes import register_blueprints


def create_app(overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)
    Config.validate(app.config)
    if not app.config.get("SECRET_KEY"):
        app.config["SECRET_KEY"] = app.config["JWT_SECRET_KEY"] = "dev-only-insecure-key-change-me"
        app.logger.warning("SECRET_KEY not set; using an insecure development key")
    elif not app.config.get("JWT_SECRET_KEY"):
        app.config["JWT_SECRET_KEY"] = app.config["SECRET_KEY"]
    logging.basicConfig(level=logging.INFO)

    client = create_mongo_client(app.config["MONGODB_URI"])
    db = client[app.config["MONGODB_DB"]]
    app.extensions["mongo_client"], app.extensions["mongo_db"] = client, db

    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
         allow_headers=["Authorization", "Content-Type", "Accept-Language"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], max_age=600)

    register_error_handlers(app)
    register_blueprints(app)

    @app.get("/")
    def index():
        return jsonify({"name": "Internship Portal API", "docs": "see README.md", "health": "/api/health"})

    try:
        ensure_indexes(db)
        if app.config["AUTO_SEED"]:
            from .services.seed import seed_data
            seed_data(db)
    except Exception as exc:  # DB temporarily unreachable at boot: keep serving /api/health as degraded
        app.logger.error("Database initialisation failed: %s", exc)
    return app
