from flask import current_app

from ..errors import ApiError
from ..extensions import get_db
from ..models import ACTIVE_STATUSES, APPLICATION_STATUSES, APPLICATIONS, INTERNSHIPS
from ..utils import clean, now
from ..validation import object_id, parse_date

SNAPSHOT = ["title", "company", "department", "location", "duration", "stipend", "type", "email", "phone"]


def serialize(doc):
    d = clean(doc)
    d["applied_on"] = doc["created_at"].date().isoformat()
    return d


def apply(user, internship_id, notes):
    db = get_db()
    oid = object_id(internship_id, "internship")
    it = db[INTERNSHIPS].find_one({"_id": oid, "is_active": {"$ne": False}})
    if not it:
        raise ApiError(404, "not_found", "Internship not found")
    if current_app.config["ENFORCE_APPLICATION_DEADLINE"] and it.get("last_date_iso"):
        if it["last_date_iso"] < now().date().isoformat():
            raise ApiError(400, "deadline_passed", "The application deadline has passed")
    if db[APPLICATIONS].find_one({"user_id": user["_id"], "internship_id": oid}):
        raise ApiError(409, "already_applied", "You have already applied to this internship")
    t = now()
    doc = {"user_id": user["_id"], "username": user["username"], "internship_id": oid,
           "internship": {k: it.get(k) for k in SNAPSHOT}, "status": "Applied", "notes": notes,
           "status_history": [{"status": "Applied", "at": t}], "created_at": t, "updated_at": t}
    try:
        res = db[APPLICATIONS].insert_one(doc)
    except Exception:
        raise ApiError(409, "already_applied", "You have already applied to this internship")
    doc["_id"] = res.inserted_id
    return doc


def summary(user_id):
    counts = {s: 0 for s in APPLICATION_STATUSES}
    for row in get_db()[APPLICATIONS].aggregate([{"$match": {"user_id": user_id}}, {"$group": {"_id": "$status", "n": {"$sum": 1}}}]):
        counts[row["_id"]] = row["n"]
    total = sum(counts.values())
    return {"total": total, "by_status": counts, "applied": sum(counts[s] for s in ACTIVE_STATUSES),
            "shortlisted": counts["Interviewing"]}
