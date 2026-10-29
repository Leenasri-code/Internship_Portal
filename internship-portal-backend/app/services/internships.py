import re

from ..extensions import get_db
from ..models import INTERNSHIP_TYPES, INTERNSHIPS
from ..utils import clean, now
from ..validation import parse_date, s, url_ok, validation_error

TEXT_FIELDS = {"title": 200, "company": 200, "department": 200, "stipend": 100, "email": 254, "phone": 30,
               "location": 200, "eligibility": 500, "description": 5000, "terms": 1000, "perks": 500,
               "last_date": 30, "duration": 60}


def natural_key(d):
    return "|".join([d["type"], d["title"].strip().lower(), (d.get("company") or "").strip().lower(), d.get("last_date") or ""])


def validate_internship(data, partial=False):
    errors, out = {}, {}
    if not partial or "type" in data:
        t = data.get("type")
        if t not in INTERNSHIP_TYPES:
            errors["type"] = "Must be one of: " + ", ".join(INTERNSHIP_TYPES)
        out["type"] = t
    for k, mx in TEXT_FIELDS.items():
        if not partial or k in data:
            v = s(data, k, errors, required=(k == "title" and not partial), max_len=mx)
            out[k] = v or None
    if out.get("last_date") and not parse_date(out["last_date"]):
        errors["last_date"] = "Use a format like '15 Sep 2025', '15-Sep-2025' or '2025-09-15'"
    if "last_date" in out:
        out["last_date_iso"] = parse_date(out["last_date"])
    if data.get("logo"):
        if isinstance(data["logo"], str) and url_ok(data["logo"]):
            out["logo"] = data["logo"]
        else:
            errors["logo"] = "Must be a valid http(s) URL"
    if not partial or "skills" in data:
        sk = data.get("skills", [])
        if not isinstance(sk, list) or not all(isinstance(x, str) and x.strip() for x in sk):
            errors["skills"] = "Must be a list of strings"
        else:
            out["skills"] = [x.strip().lower() for x in sk][:30]
    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            errors["is_active"] = "Must be boolean"
        out["is_active"] = data["is_active"]
    if "featured" in data:
        out["featured"] = bool(data["featured"])
    if errors:
        raise validation_error(errors)
    return out


def build_query(args):
    q = {"is_active": {"$ne": False}}
    t = args.get("type")
    if t in INTERNSHIP_TYPES:
        q["type"] = t
    if args.get("featured") in ("1", "true"):
        q["featured"] = True
    and_ = []
    text = (args.get("q") or "").strip()
    if text:
        rx = {"$regex": re.escape(text), "$options": "i"}
        and_.append({"$or": [{k: rx} for k in ("title", "company", "location", "department", "eligibility", "description")]})
    loc = (args.get("location") or "").strip()
    if loc:
        and_.append({"location": {"$regex": re.escape(loc), "$options": "i"}})
    if and_:
        q["$and"] = and_
    return q


def serialize(doc, applied_ids=None):
    d = clean(doc)
    d.pop("natural_key", None)
    if applied_ids is not None:
        d["has_applied"] = d["id"] in applied_ids
    return d


def recommend(profile, limit=5):
    """Keyword-overlap recommendations from profile skills/field of study/city. Not AI-based."""
    db = get_db()
    terms = {x.lower() for x in profile.get("skills", [])}
    for k in ("field_study", "degree"):
        terms.update(w for w in re.split(r"\W+", (profile.get(k) or "").lower()) if len(w) > 2)
    city = (profile.get("city") or "").lower()
    scored = []
    for doc in db[INTERNSHIPS].find({"is_active": {"$ne": False}}):
        hay = " ".join(str(doc.get(k) or "") for k in ("title", "description", "eligibility", "department", "company")).lower()
        hay += " " + " ".join(doc.get("skills", []))
        score = sum(2 for t in terms if t and t in hay)
        if city and city in (doc.get("location") or "").lower():
            score += 1
        if (doc.get("location") or "").lower().startswith("remote"):
            score += 0.5
        scored.append((score, doc.get("featured", False), doc))
    scored.sort(key=lambda x: (-x[0], not x[1], x[2]["title"]))
    return [serialize(d) | {"match_score": sc} for sc, _, d in scored[:limit]]
