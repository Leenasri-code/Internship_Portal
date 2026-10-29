from flask import Blueprint, current_app, g, jsonify, request

from ..services import profiles as svc
from ..services.auth import auth_required
from ..validation import json_body

bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@bp.get("")
@auth_required
def get_profile():
    p, exists = svc.get_profile(g.user["_id"])
    return jsonify({"profile": p, "exists": exists})


@bp.route("", methods=["PUT", "POST"])
@auth_required
def put_profile():
    """Full save (the original POST /profile_data). All required fields must be present."""
    fields = svc.validate_profile(json_body(), current_app.config["PHOTO_MAX_BYTES"])
    return jsonify({"status": "success", "profile": svc.save_profile(g.user["_id"], fields, replace=True)})


@bp.patch("")
@auth_required
def patch_profile():
    data = json_body()
    if "phone" in data and "countryCode" not in data:
        data["countryCode"] = svc.get_profile(g.user["_id"])[0]["countryCode"]
    fields = svc.validate_profile(data, current_app.config["PHOTO_MAX_BYTES"], partial=True)
    return jsonify({"status": "success", "profile": svc.save_profile(g.user["_id"], fields, replace=False)})


@bp.get("/options")
def options():
    """Countries, cities, phone codes/lengths (drives the profile form dropdowns)."""
    return jsonify(svc.LOCATIONS)


@bp.get("/skills")
def skills():
    """Skill autocomplete: ?q=prefix returns up to 7 matches (as in the original UI)."""
    q = (request.args.get("q") or "").strip().lower()
    items = [x for x in svc.ALL_SKILLS if x.startswith(q)][:7] if q else svc.ALL_SKILLS
    return jsonify({"skills": items})
