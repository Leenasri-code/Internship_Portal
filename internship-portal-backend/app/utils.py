from datetime import datetime, timezone

from bson import ObjectId


def now():
    return datetime.now(timezone.utc)


def iso(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def as_aware(dt):
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def clean(doc):
    """Make a Mongo document JSON-safe: _id -> id, ObjectId -> str, datetime -> ISO."""
    if isinstance(doc, list):
        return [clean(d) for d in doc]
    if isinstance(doc, dict):
        out = {}
        for k, v in doc.items():
            out["id" if k == "_id" else k] = clean(v)
        return out
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return iso(doc)
    return doc


def public(doc, *drop):
    """clean() a document and remove internal keys (default: user_id)."""
    d = clean(doc)
    for k in drop or ("user_id",):
        d.pop(k, None)
    return d
