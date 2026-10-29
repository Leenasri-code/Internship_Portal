from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..extensions import get_db
from ..models import APPLICATION_STATUSES, APPLICATIONS
from ..services import applications as svc
from ..services.auth import admin_required, auth_required
from ..utils import now
from ..validation import json_body, object_id, page_args, s, validation_error

bp = Blueprint("applications", __name__, url_prefix="/api")


def _own(app_id):
    doc = get_db()[APPLICATIONS].find_one({"_id": object_id(app_id, "application"), "user_id": g.user["_id"]})
    if not doc:
        raise ApiError(404, "not_found", "Application not found")  # 404 (not 403) so ids can't be probed
    return doc


@bp.post("/applications")
@auth_required
def create():
    data = json_body()
    errors = {}
    iid = s(data, "internship_id", errors, required=True)
    notes = s(data, "notes", errors, max_len=2000)
    if errors:
        raise validation_error(errors)
    return jsonify({"application": svc.serialize(svc.apply(g.user, iid, notes))}), 201


@bp.get("/applications")
@auth_required
def list_mine():
    """?status=Applied|Reviewed|Interviewing|Rejected|Accepted"""
    q = {"user_id": g.user["_id"]}
    st = request.args.get("status")
    if st:
        if st not in APPLICATION_STATUSES:
            raise validation_error({"status": "Must be one of: " + ", ".join(APPLICATION_STATUSES)})
        q["status"] = st
    docs = get_db()[APPLICATIONS].find(q).sort("created_at", -1)
    return jsonify({"items": [svc.serialize(d) for d in docs]})


@bp.get("/applications/summary")
@auth_required
def summary():
    return jsonify(svc.summary(g.user["_id"]))


@bp.get("/applications/<app_id>")
@auth_required
def get_one(app_id):
    return jsonify({"application": svc.serialize(_own(app_id))})


@bp.route("/applications/<app_id>", methods=["PATCH", "PUT"])
@auth_required
def update_notes(app_id):
    doc = _own(app_id)
    errors = {}
    notes = s(json_body(), "notes", errors, max_len=2000)
    if errors:
        raise validation_error(errors)
    get_db()[APPLICATIONS].update_one({"_id": doc["_id"]}, {"$set": {"notes": notes, "updated_at": now()}})
    return jsonify({"application": svc.serialize(_own(app_id))})


@bp.delete("/applications/<app_id>")
@auth_required
def withdraw(app_id):
    doc = _own(app_id)
    if doc["status"] in ("Accepted",):
        raise ApiError(409, "not_allowed", "An accepted application cannot be withdrawn")
    get_db()[APPLICATIONS].delete_one({"_id": doc["_id"]})
    return jsonify({"message": "Application withdrawn"})


# ---- admin ----
@bp.get("/admin/applications")
@admin_required
def admin_list():
    """?status= &internship_id= &page= &limit="""
    q = {}
    if request.args.get("status") in APPLICATION_STATUSES:
        q["status"] = request.args["status"]
    if request.args.get("internship_id"):
        q["internship_id"] = object_id(request.args["internship_id"], "internship")
    page, limit = page_args()
    db = get_db()
    total = db[APPLICATIONS].count_documents(q)
    docs = db[APPLICATIONS].find(q).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    return jsonify({"items": [svc.serialize(d) | {"user_id": str(d["user_id"])} for d in docs], "page": page, "limit": limit, "total": total})


@bp.patch("/applications/<app_id>/status")
@admin_required
def admin_status(app_id):
    data = json_body()
    status = data.get("status")
    if status not in APPLICATION_STATUSES:
        raise validation_error({"status": "Must be one of: " + ", ".join(APPLICATION_STATUSES)})
    db = get_db()
    oid = object_id(app_id, "application")
    upd = {"status": status, "updated_at": now()}
    if isinstance(data.get("notes"), str):
        upd["notes"] = data["notes"].strip()[:2000]
    r = db[APPLICATIONS].update_one({"_id": oid}, {"$set": upd, "$push": {"status_history": {"status": status, "at": now(), "by": g.user["username"]}}})
    if not r.matched_count:
        raise ApiError(404, "not_found", "Application not found")
    return jsonify({"application": svc.serialize(db[APPLICATIONS].find_one({"_id": oid}))})
