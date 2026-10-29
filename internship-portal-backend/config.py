"""Environment-based configuration. Nothing secret is hardcoded."""
import os

from dotenv import load_dotenv

load_dotenv()


def _bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def _int(name, default):
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


class Config:
    ENV = os.getenv("APP_ENV", os.getenv("FLASK_ENV", "development")).lower()
    TESTING = False
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "") or SECRET_KEY
    JWT_EXPIRES_HOURS = _int("JWT_EXPIRES_HOURS", 12)

    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB = os.getenv("MONGODB_DB", "internship_portal")

    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

    AUTO_SEED = _bool("AUTO_SEED", True)
    ENFORCE_APPLICATION_DEADLINE = _bool("ENFORCE_APPLICATION_DEADLINE", False)
    ASSESSMENT_GRACE_SECONDS = _int("ASSESSMENT_GRACE_SECONDS", 15)
    LOGIN_MAX_FAILURES = _int("LOGIN_MAX_FAILURES", 10)
    LOGIN_LOCK_MINUTES = _int("LOGIN_LOCK_MINUTES", 15)
    PHOTO_MAX_BYTES = _int("PHOTO_MAX_BYTES", 2 * 1024 * 1024)
    MAX_CONTENT_LENGTH = _int("MAX_CONTENT_LENGTH", 4 * 1024 * 1024)
    JSON_SORT_KEYS = False

    @classmethod
    def validate(cls, cfg):
        """Fail fast in production if secrets are missing."""
        if cfg.get("ENV") == "production" and not cfg.get("TESTING"):
            if len(cfg.get("SECRET_KEY") or "") < 32 or len(cfg.get("JWT_SECRET_KEY") or "") < 32:
                raise RuntimeError("SECRET_KEY / JWT_SECRET_KEY must be set (32+ chars) in production")
            if cfg["MONGODB_URI"].startswith("mongodb://localhost"):
                raise RuntimeError("MONGODB_URI must point to your MongoDB Atlas cluster in production")
