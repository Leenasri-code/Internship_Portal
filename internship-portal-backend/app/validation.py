"""Small dependency-free validation helpers. Validators collect errors per field."""
import re
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from flask import request

from .errors import ApiError

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
URL_RE = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.I)
DIGITS_RE = re.compile(r"^\d+$")


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError(400, "invalid_json", "Request body must be a JSON object")
    return data


def validation_error(errors):
    return ApiError(422, "validation_error", "Validation failed", errors)


def object_id(value, name="id"):
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        raise ApiError(404, "not_found", f"{name} not found")


def s(data, key, errors, required=False, max_len=255, min_len=0, strip=True):
    """Read a string field."""
    v = data.get(key)
    if v is None or (isinstance(v, str) and not v.strip()):
        if required:
            errors[key] = "This field is required"
        return ""
    if not isinstance(v, str):
        errors[key] = "Must be a string"
        return ""
    v = v.strip() if strip else v
    if len(v) < min_len:
        errors[key] = f"Must be at least {min_len} characters"
    elif len(v) > max_len:
        errors[key] = f"Must be at most {max_len} characters"
    return v


def email_ok(v):
    return bool(EMAIL_RE.match(v)) and len(v) <= 254


def url_ok(v):
    return bool(URL_RE.match(v)) and len(v) <= 500


def parse_date(text):
    """Parse the date formats used in the original data into an ISO date string (or None)."""
    if not text:
        return None
    for fmt in ("%d %b %Y", "%d-%b-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


def page_args(default_limit=20, max_limit=100):
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = int(request.args.get("limit", default_limit))
    except ValueError:
        raise ApiError(400, "bad_request", "page and limit must be integers")
    return page, max(1, min(limit, max_limit))
