from flask import Blueprint, g, jsonify

from ..errors import ApiError
from ..extensions import get_db
from ..models import LANGUAGES
from ..services import applications as app_svc
from ..services import i18n
from ..services import internships as it_svc
from ..services.auth import auth_required
from ..services.profiles import get_profile

bp = Blueprint("meta", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    try:
        get_db().command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return jsonify({"status": "ok" if db_ok else "degraded", "database": db_ok}), (200 if db_ok else 503)


@bp.get("/languages")
def languages():
    return jsonify({"languages": [{"code": c, "name": n} for c, n in LANGUAGES.items()], "default": "en"})


@bp.get("/i18n/<lang>")
def translations(lang):
    """msgid -> translated string for the UI (original Flask-Babel catalogs). 'en' returns {} (use msgid as-is)."""
    if lang not in LANGUAGES:
        raise ApiError(404, "not_found", "Unsupported language")
    return jsonify({"lang": lang, "messages": i18n.messages(lang)})


@bp.get("/dashboard")
@auth_required
def dashboard():
    """Main-menu data: welcome name, counters and 'top picks' (recommended internships)."""
    profile, _ = get_profile(g.user["_id"])
    summary = app_svc.summary(g.user["_id"])
    picks = it_svc.recommend(profile, 5)
    return jsonify({"username": g.user["username"], "recommended_count": len(picks), "applied_count": summary["applied"],
                    "shortlisted_count": summary["shortlisted"], "top_picks": picks})
