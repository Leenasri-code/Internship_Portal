"""Collection names, constants, indexes and serializers (MongoDB documents)."""
import pymongo

from ..utils import iso

USERS = "users"
PROFILES = "profiles"
INTERNSHIPS = "internships"
APPLICATIONS = "applications"
ASSESSMENTS = "assessments"
ATTEMPTS = "assessment_attempts"
FEEDBACK = "feedback"
LOGIN_ATTEMPTS = "login_attempts"
REVOKED_TOKENS = "revoked_tokens"

APPLICATION_STATUSES = ["Applied", "Reviewed", "Interviewing", "Rejected", "Accepted"]
ACTIVE_STATUSES = ["Applied", "Reviewed", "Interviewing"]
INTERNSHIP_TYPES = ["government", "private"]
ROLES = ["user", "admin"]
LANGUAGES = {"en": "English", "hi": "हिन्दी", "ml": "മലയാളം"}


def ensure_indexes(db):
    db[USERS].create_index("username_lower", unique=True)
    db[USERS].create_index("email_lower", unique=True, partialFilterExpression={"email_lower": {"$type": "string"}})
    db[PROFILES].create_index("user_id", unique=True)
    db[INTERNSHIPS].create_index([("type", 1), ("title", 1)])
    db[INTERNSHIPS].create_index("natural_key", unique=True)
    db[APPLICATIONS].create_index([("user_id", 1), ("internship_id", 1)], unique=True)
    db[APPLICATIONS].create_index([("user_id", 1), ("created_at", -1)])
    db[ASSESSMENTS].create_index("title", unique=True)
    db[ATTEMPTS].create_index([("user_id", 1), ("assessment_id", 1)])
    db[FEEDBACK].create_index([("created_at", -1)])
    db[LOGIN_ATTEMPTS].create_index("created_at", expireAfterSeconds=24 * 3600)
    db[LOGIN_ATTEMPTS].create_index("key")
    db[REVOKED_TOKENS].create_index("expires_at", expireAfterSeconds=0)
    db[REVOKED_TOKENS].create_index("jti", unique=True)


def public_user(u):
    return {"id": str(u["_id"]), "username": u["username"], "email": u.get("email") or "", "role": u.get("role", "user"),
            "created_at": iso(u.get("created_at"))}
