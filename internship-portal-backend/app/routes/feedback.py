from flask import Blueprint, g, jsonify

from ..extensions import get_db
from ..models import FEEDBACK
from ..services.auth import admin_required, auth_required
from ..utils import clean, now, public
from ..validation import json_body, page_args, s, validation_error

bp = Blueprint("feedback", __name__, url_prefix="/api/feedback")


@bp.post("")
@auth_required
def submit():
    """Body: {"rating": 1-5, "suggestion": "optional text"}"""
    data = json_body()
    errors = {}
    rating = data.get("rating")
    if isinstance(rating, bool) or not isinstance(rating, int) or not 1 <= rating <= 5:
        errors["rating"] = "Must be an integer from 1 to 5"
    suggestion = s(data, "suggestion", errors, max_len=2000)
    if errors:
        raise validation_error(errors)
    doc = {"user_id": g.user["_id"], "username": g.user["username"], "rating": rating, "suggestion": suggestion, "created_at": now()}
    doc["_id"] = get_db()[FEEDBACK].insert_one(doc).inserted_id
    return jsonify({"message": "Thank you for your feedback!", "feedback": public(doc)}), 201


@bp.get("/mine")
@auth_required
def mine():
    docs = get_db()[FEEDBACK].find({"user_id": g.user["_id"]}).sort("created_at", -1)
    return jsonify({"items": [public(d) for d in docs]})


@bp.get("")
@admin_required
def list_all():
    page, limit = page_args()
    db = get_db()
    total = db[FEEDBACK].count_documents({})
    docs = db[FEEDBACK].find({}).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    avg = list(db[FEEDBACK].aggregate([{"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]))
    return jsonify({"items": [clean(d) | {"user_id": str(d["user_id"])} for d in docs], "page": page, "limit": limit, "total": total,
                    "average_rating": round(avg[0]["avg"], 2) if avg else None})
