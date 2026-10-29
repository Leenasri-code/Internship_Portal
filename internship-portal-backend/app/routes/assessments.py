from flask import Blueprint, g, jsonify

from ..errors import ApiError
from ..extensions import get_db
from ..models import ASSESSMENTS, ATTEMPTS
from ..services import assessments as svc
from ..services.auth import admin_required, auth_required
from ..utils import clean, iso, now, public
from ..validation import json_body, object_id, validation_error

bp = Blueprint("assessments", __name__, url_prefix="/api/assessments")


def _get(aid, admin=False):
    q = {"_id": object_id(aid, "assessment")}
    if not admin:
        q["is_active"] = {"$ne": False}
    a = get_db()[ASSESSMENTS].find_one(q)
    if not a:
        raise ApiError(404, "not_found", "Assessment not found")
    return a


@bp.get("")
@auth_required
def list_tests():
    db = get_db()
    best = {}
    for att in db[ATTEMPTS].find({"user_id": g.user["_id"], "status": "submitted"}):
        k = str(att["assessment_id"])
        best[k] = max(best.get(k, 0), att.get("score", 0))
    items = [svc.summary(a, best.get(str(a["_id"]))) for a in db[ASSESSMENTS].find({"is_active": {"$ne": False}}).sort("title", 1)]
    return jsonify({"items": items})


@bp.get("/attempts")
@auth_required
def my_attempts():
    docs = get_db()[ATTEMPTS].find({"user_id": g.user["_id"], "status": "submitted"}, {"details": 0, "answers": 0}).sort("submitted_at", -1)
    return jsonify({"items": [public(d) for d in docs]})


@bp.get("/attempts/<attempt_id>")
@auth_required
def attempt_result(attempt_id):
    d = get_db()[ATTEMPTS].find_one({"_id": object_id(attempt_id, "attempt"), "user_id": g.user["_id"]})
    if not d:
        raise ApiError(404, "not_found", "Attempt not found")
    return jsonify({"attempt": public(d)})


@bp.get("/<aid>")
@auth_required
def get_test(aid):
    """Test metadata and questions WITHOUT correct answers (preview; use /start to begin a timed attempt)."""
    a = _get(aid)
    return jsonify({"assessment": {**svc.summary(a), "questions": svc.public_questions(a)}})


@bp.post("/<aid>/start")
@auth_required
def start(aid):
    a = _get(aid)
    att = svc.start(g.user, a)
    return jsonify({"attempt_id": str(att["_id"]), "started_at": iso(att["started_at"]), "expires_at": iso(att["expires_at"]),
                    "duration_minutes": a["duration_minutes"], "title": a["title"], "questions": svc.public_questions(a)}), 201


@bp.post("/<aid>/submit")
@auth_required
def submit(aid):
    """Body: {"attempt_id": "...", "answers": {"<question_id>": "<option_id>", ...}}"""
    data = json_body()
    a = _get(aid)
    answers = data.get("answers")
    if not isinstance(answers, dict) or not all(isinstance(v, str) for v in answers.values()):
        raise validation_error({"answers": "Must be an object mapping question id to option id"})
    if not isinstance(data.get("attempt_id"), str):
        raise validation_error({"attempt_id": "Required (returned by POST /start)"})
    attempt_id, result = svc.submit(g.user, a, data["attempt_id"], {str(k): v for k, v in answers.items()})
    return jsonify({"attempt_id": str(attempt_id), **result})


# ---- admin ----
@bp.get("/<aid>/admin")
@admin_required
def admin_get(aid):
    return jsonify({"assessment": clean(_get(aid, admin=True))})


@bp.post("")
@admin_required
def create():
    data = svc.validate_assessment(json_body())
    data.setdefault("is_active", True)
    data["created_at"] = now()
    if get_db()[ASSESSMENTS].find_one({"title": data["title"]}):
        raise ApiError(409, "duplicate", "An assessment with this title already exists")
    data["_id"] = get_db()[ASSESSMENTS].insert_one(data).inserted_id
    return jsonify({"assessment": clean(data)}), 201


@bp.route("/<aid>", methods=["PUT", "PATCH"])
@admin_required
def update(aid):
    a = _get(aid, admin=True)
    data = svc.validate_assessment(json_body(), partial=True)
    get_db()[ASSESSMENTS].update_one({"_id": a["_id"]}, {"$set": {**data, "updated_at": now()}})
    return jsonify({"assessment": clean(_get(aid, admin=True))})


@bp.delete("/<aid>")
@admin_required
def delete(aid):
    a = _get(aid, admin=True)
    get_db()[ASSESSMENTS].update_one({"_id": a["_id"]}, {"$set": {"is_active": False}})
    return jsonify({"message": "Assessment deactivated"})
