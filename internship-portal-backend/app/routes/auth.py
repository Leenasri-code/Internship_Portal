from datetime import datetime, timezone

from flask import Blueprint, g, jsonify

from ..errors import ApiError
from ..extensions import get_db
from ..models import REVOKED_TOKENS, USERS, public_user
from ..services import users as users_svc
from ..services.auth import auth_required, hash_password, issue_token, verify_password
from ..validation import json_body, s, validation_error

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
def register():
    username, email, password = users_svc.validate_registration(json_body())
    user = users_svc.create_user(username, password, email)
    return jsonify({"message": "Registration successful! Please login.", "user": public_user(user)}), 201


@bp.post("/login")
def login():
    data = json_body()
    errors = {}
    username = s(data, "username", errors, required=True, max_len=254)
    password = data.get("password")
    if not isinstance(password, str) or not password.strip():
        errors["password"] = "This field is required"
    if errors:
        raise validation_error(errors)
    users_svc.check_lock(username)
    # Like the original app, the username field may also hold an email address.
    user = get_db()[USERS].find_one({"username_lower": username.lower()}) or \
        get_db()[USERS].find_one({"email_lower": username.lower()})
    if not user or not verify_password(user["password_hash"], password.strip()):
        users_svc.record_failure(username)
        raise ApiError(401, "invalid_credentials", "Invalid username or password")
    users_svc.clear_failures(username)
    token, exp = issue_token(user)
    return jsonify({"token": token, "token_type": "Bearer", "expires_at": exp.isoformat(), "user": public_user(user)})


@bp.get("/me")
@auth_required
def me():
    return jsonify({"user": public_user(g.user)})


@bp.post("/logout")
@auth_required
def logout():
    p = g.token_payload
    get_db()[REVOKED_TOKENS].update_one(
        {"jti": p["jti"]}, {"$set": {"jti": p["jti"], "expires_at": datetime.fromtimestamp(p["exp"], tz=timezone.utc)}}, upsert=True)
    return jsonify({"message": "Logged out successfully"})


@bp.post("/change-password")
@auth_required
def change_password():
    data = json_body()
    new = data.get("new_password")
    if not verify_password(g.user["password_hash"], str(data.get("current_password", ""))):
        raise ApiError(401, "invalid_credentials", "Current password is incorrect")
    if not isinstance(new, str) or not (6 <= len(new.strip()) <= 128):
        raise validation_error({"new_password": "Must be 6-128 characters"})
    get_db()[USERS].update_one({"_id": g.user["_id"]}, {"$set": {"password_hash": hash_password(new.strip())}})
    return jsonify({"message": "Password updated"})
