"""JWT helpers, password hashing, decorators."""
import uuid
from datetime import timedelta
from functools import wraps

import jwt
from flask import current_app, g, request
from werkzeug.security import check_password_hash, generate_password_hash

from ..errors import ApiError
from ..extensions import get_db
from ..models import REVOKED_TOKENS, USERS
from ..utils import now

hash_password = generate_password_hash  # scrypt, salted (same scheme as the original app)


def verify_password(hashed, plain):
    try:
        return check_password_hash(hashed, plain)
    except Exception:
        return False


def issue_token(user):
    cfg = current_app.config
    t = now()
    payload = {"sub": str(user["_id"]), "username": user["username"], "role": user.get("role", "user"),
               "jti": uuid.uuid4().hex, "iat": t, "exp": t + timedelta(hours=cfg["JWT_EXPIRES_HOURS"])}
    token = jwt.encode(payload, cfg["JWT_SECRET_KEY"], algorithm="HS256")
    return token, payload["exp"]


def _decode(token):
    try:
        return jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise ApiError(401, "token_expired", "Token has expired")
    except jwt.InvalidTokenError:
        raise ApiError(401, "invalid_token", "Invalid authentication token")


def _bearer():
    h = request.headers.get("Authorization", "")
    if h.lower().startswith("bearer "):
        return h[7:].strip()
    return None


def _load_user(token):
    from bson import ObjectId
    payload = _decode(token)
    db = get_db()
    if db[REVOKED_TOKENS].find_one({"jti": payload["jti"]}):
        raise ApiError(401, "token_revoked", "Token has been revoked")
    try:
        user = db[USERS].find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        user = None
    if not user:
        raise ApiError(401, "invalid_token", "User no longer exists")
    g.user, g.token_payload = user, payload
    return user


def auth_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        token = _bearer()
        if not token:
            raise ApiError(401, "unauthorized", "Authentication required (Authorization: Bearer <token>)")
        _load_user(token)
        return fn(*a, **kw)
    return wrapper


def auth_optional(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        g.user = None
        token = _bearer()
        if token:
            _load_user(token)
        return fn(*a, **kw)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    @auth_required
    def wrapper(*a, **kw):
        if g.user.get("role") != "admin":
            raise ApiError(403, "forbidden", "Administrator access required")
        return fn(*a, **kw)
    return wrapper
