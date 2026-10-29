import re
from datetime import timedelta

import pymongo.errors
from flask import current_app, request

from ..errors import ApiError
from ..extensions import get_db
from ..models import LOGIN_ATTEMPTS, USERS
from ..utils import now
from ..validation import email_ok, json_body, s, validation_error
from .auth import hash_password


def validate_registration(data):
    errors = {}
    username = s(data, "username", errors, required=True, min_len=3, max_len=100)
    email = s(data, "email", errors, max_len=254)
    password = data.get("password")
    confirm = data.get("confirm_password")
    if not isinstance(password, str) or not password.strip():
        errors["password"] = "This field is required"
    elif len(password.strip()) < 6:
        errors["password"] = "Must be at least 6 characters"
    elif len(password) > 128:
        errors["password"] = "Must be at most 128 characters"
    if confirm is not None or "confirm_password" in data:
        if confirm != password:
            errors["confirm_password"] = "Passwords do not match"
    if email and not email_ok(email):
        errors["email"] = "Invalid email address"
    if username and re.search(r"\s", username):
        errors["username"] = "Must not contain spaces"
    if errors:
        raise validation_error(errors)
    return username, email.lower() if email else None, password.strip()


def create_user(username, password, email=None, role="user", password_hash=None):
    db = get_db()
    doc = {"username": username, "username_lower": username.lower(), "email": email or "",
           "email_lower": email.lower() if email else None, "password_hash": password_hash or hash_password(password),
           "role": role, "created_at": now()}
    if not doc["email_lower"]:
        doc.pop("email_lower")
    if db[USERS].find_one({"username_lower": doc["username_lower"]}):
        raise ApiError(409, "username_taken", "Username already exists")
    if email and db[USERS].find_one({"email_lower": doc["email_lower"]}):
        raise ApiError(409, "email_taken", "Email already registered")
    try:
        res = db[USERS].insert_one(doc)
    except pymongo.errors.DuplicateKeyError:
        raise ApiError(409, "username_taken", "Username or email already exists")
    doc["_id"] = res.inserted_id
    return doc


# --- brute-force protection (stored in Mongo so it works across workers) ---
def _key(username):
    return f"{username.lower()}|{request.remote_addr}"


def check_lock(username):
    cfg = current_app.config
    since = now() - timedelta(minutes=cfg["LOGIN_LOCK_MINUTES"])
    n = get_db()[LOGIN_ATTEMPTS].count_documents({"key": _key(username), "created_at": {"$gte": since}})
    if n >= cfg["LOGIN_MAX_FAILURES"]:
        raise ApiError(429, "too_many_attempts", "Too many failed logins. Try again later.")


def record_failure(username):
    get_db()[LOGIN_ATTEMPTS].insert_one({"key": _key(username), "created_at": now()})


def clear_failures(username):
    get_db()[LOGIN_ATTEMPTS].delete_many({"key": _key(username)})
