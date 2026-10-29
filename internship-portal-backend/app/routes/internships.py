from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..extensions import get_db
from ..models import APPLICATIONS, INTERNSHIPS
from ..services import internships as svc
from ..services.auth import admin_required, auth_optional, auth_required
from ..services.profiles import get_profile
from ..utils import now
from ..validation import json_body, object_id, page_args

bp = Blueprint("internships", __name__, url_prefix="/api/internships")


def _list(forced_type=None):
    args = request.args.to_dict()
    if forced_type:
        args["type"] = forced_type
    page, limit = page_args()
    db = get_db()
    q = svc.build_query(args)
    total = db[INTERNSHIPS].count_documents(q)
    docs = list(db[INTERNSHIPS].find(q).sort([("type", 1), ("title", 1)]).skip((page - 1) * limit).limit(limit))
    applied = None
    if g.user:
        applied = {str(a["internship_id"]) for a in db[APPLICATIONS].find({"user_id": g.user["_id"]}, {"internship_id": 1})}
    return jsonify({"items": [svc.serialize(d, applied) for d in docs], "page": page, "limit": limit, "total": total,
                    "pages": (total + limit - 1) // limit})


@bp.get("")
@auth_optional
def list_internships():
    """?type=government|private &q= &location= &featured=true &page= &limit="""
    return _list()


@bp.get("/government")
@auth_optional
def list_government():
    return _list("government")


@bp.get("/private")
@auth_optional
def list_private():
    return _list("private")


@bp.get("/recommended")
@auth_required
def recommended():
    profile, _ = get_profile(g.user["_id"])
    return jsonify({"items": svc.recommend(profile, 5)})


@bp.get("/<internship_id>")
@auth_optional
def get_internship(internship_id):
    db = get_db()
    doc = db[INTERNSHIPS].find_one({"_id": object_id(internship_id, "internship"), "is_active": {"$ne": False}})
    if not doc:
        raise ApiError(404, "not_found", "Internship not found")
    applied = None
    if g.user:
        applied = {internship_id} if db[APPLICATIONS].find_one({"user_id": g.user["_id"], "internship_id": doc["_id"]}) else set()
    return jsonify({"internship": svc.serialize(doc, applied)})


@bp.post("")
@admin_required
def create():
    data = svc.validate_internship(json_body())
    data.setdefault("is_active", True)
    data.setdefault("skills", [])
    data["natural_key"] = svc.natural_key(data)
    data["created_at"] = data["updated_at"] = now()
    if get_db()[INTERNSHIPS].find_one({"natural_key": data["natural_key"]}):
        raise ApiError(409, "duplicate", "An identical internship already exists")
    data["_id"] = get_db()[INTERNSHIPS].insert_one(data).inserted_id
    return jsonify({"internship": svc.serialize(data)}), 201


@bp.route("/<internship_id>", methods=["PUT", "PATCH"])
@admin_required
def update(internship_id):
    oid = object_id(internship_id, "internship")
    db = get_db()
    existing = db[INTERNSHIPS].find_one({"_id": oid})
    if not existing:
        raise ApiError(404, "not_found", "Internship not found")
    data = svc.validate_internship(json_body(), partial=True)
    merged = {**existing, **data}
    data["natural_key"] = svc.natural_key(merged)
    data["updated_at"] = now()
    db[INTERNSHIPS].update_one({"_id": oid}, {"$set": data})
    return jsonify({"internship": svc.serialize(db[INTERNSHIPS].find_one({"_id": oid}))})


@bp.delete("/<internship_id>")
@admin_required
def delete(internship_id):
    """Soft delete (is_active=false) so existing applications keep their reference."""
    r = get_db()[INTERNSHIPS].update_one({"_id": object_id(internship_id, "internship")},
                                         {"$set": {"is_active": False, "updated_at": now()}})
    if not r.matched_count:
        raise ApiError(404, "not_found", "Internship not found")
    return jsonify({"message": "Internship deactivated"})
