import json
import re
from pathlib import Path

from ..errors import ApiError
from ..extensions import get_db
from ..models import PROFILES
from ..utils import iso, now
from ..validation import DIGITS_RE, email_ok, s, url_ok, validation_error

DATA = Path(__file__).resolve().parent.parent / "data"
LOCATIONS = json.loads((DATA / "locations.json").read_text(encoding="utf-8"))
SKILL_SETS = json.loads((DATA / "skill_sets.json").read_text(encoding="utf-8"))
ALL_SKILLS = sorted({sk for role in SKILL_SETS.values() for group in role.values() for sk in group})
PHONE_LENGTHS = {c["phone_code"]: c["phone_length"] for c in LOCATIONS["countries"]}
COUNTRY_NAMES = {c["name"] for c in LOCATIONS["countries"]}

FIELDS = ["username", "email", "first_name", "last_name", "country", "city", "countryCode", "phone", "university",
          "degree", "field_study", "graduation_year", "linkedin", "portfolio", "bio", "photoData", "skills"]
REQUIRED = ["email", "first_name", "last_name", "country", "countryCode", "phone", "university", "degree", "field_study",
            "graduation_year"]
PHOTO_RE = re.compile(r"^data:image/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$")


def empty_profile():
    p = {k: "" for k in FIELDS}
    p["skills"] = []
    p["countryCode"] = "+91"
    return p


def validate_profile(data, photo_max, partial=False):
    """Validate a profile payload. With partial=True only supplied keys are checked/returned."""
    errors, out = {}, {}

    def want(k):
        return (k in data) if partial else True

    for key, mx in [("username", 100), ("first_name", 100), ("last_name", 100), ("university", 200), ("degree", 100),
                    ("field_study", 100), ("city", 100)]:
        if want(key):
            out[key] = s(data, key, errors, required=(key in REQUIRED and not partial), max_len=mx)
    if want("email"):
        out["email"] = s(data, "email", errors, required=not partial, max_len=254)
        if out["email"] and not email_ok(out["email"]):
            errors["email"] = "Invalid email address"
    if want("country"):
        out["country"] = s(data, "country", errors, required=not partial, max_len=100)
        if out["country"] and out["country"] not in COUNTRY_NAMES:
            errors["country"] = "Unsupported country. Allowed: " + ", ".join(sorted(COUNTRY_NAMES))
    if want("countryCode") or want("phone"):
        code = s(data, "countryCode", errors, required=not partial, max_len=6) or (data.get("countryCode") or "")
        phone = s(data, "phone", errors, required=not partial, max_len=20)
        if want("countryCode"):
            out["countryCode"] = code
        if want("phone"):
            out["phone"] = phone
        if code and code not in PHONE_LENGTHS:
            errors["countryCode"] = "Unsupported country code"
        elif phone:
            if not DIGITS_RE.match(phone):
                errors["phone"] = "Phone must contain digits only"
            elif code in PHONE_LENGTHS and len(phone) != PHONE_LENGTHS[code]:
                errors["phone"] = f"Phone must have {PHONE_LENGTHS[code]} digits for {code}"
    if want("graduation_year"):
        raw = data.get("graduation_year")
        raw = str(raw).strip() if raw is not None else ""
        if not raw:
            if not partial:
                errors["graduation_year"] = "This field is required"
            out["graduation_year"] = ""
        elif not raw.isdigit() or not (1900 <= int(raw) <= 2100):
            errors["graduation_year"] = "Must be a year between 1900 and 2100"
        else:
            out["graduation_year"] = raw
    for key in ("linkedin", "portfolio"):
        if want(key):
            out[key] = s(data, key, errors, max_len=500)
            if out[key] and not url_ok(out[key]):
                errors[key] = "Must be a valid http(s) URL"
    if want("bio"):
        out["bio"] = s(data, "bio", errors, max_len=2000)
    if want("photoData"):
        photo = data.get("photoData")
        if photo in (None, ""):
            out["photoData"] = ""
        elif not isinstance(photo, str) or not PHOTO_RE.match(photo):
            errors["photoData"] = "Must be a base64 data URI of a png/jpeg/gif/webp image"
        elif len(photo) > photo_max * 1.4:
            errors["photoData"] = "Image is too large"
        else:
            out["photoData"] = photo
    if want("skills"):
        skills = data.get("skills", [])
        if not isinstance(skills, list) or len(skills) > 50:
            errors["skills"] = "Must be a list of at most 50 strings"
        else:
            seen, clean_skills = set(), []
            for sk in skills:
                if not isinstance(sk, str) or not sk.strip() or len(sk.strip()) > 50:
                    errors["skills"] = "Each skill must be a non-empty string of at most 50 characters"
                    break
                if sk.strip().lower() not in seen:
                    seen.add(sk.strip().lower())
                    clean_skills.append(sk.strip())
            out["skills"] = clean_skills
    if errors:
        raise validation_error(errors)
    return out


def get_profile(user_id):
    doc = get_db()[PROFILES].find_one({"user_id": user_id})
    p = empty_profile()
    if doc:
        for k in FIELDS:
            if k in doc:
                p[k] = doc[k]
        p["updated_at"] = iso(doc.get("updated_at"))
    return p, bool(doc)


def save_profile(user_id, fields, replace):
    db = get_db()
    existing = db[PROFILES].find_one({"user_id": user_id})
    if replace:
        new = {**empty_profile(), **fields}
    else:
        new = {**{k: existing.get(k, "") for k in FIELDS if existing}, **fields} if existing else {**empty_profile(), **fields}
    new["user_id"] = user_id
    new["updated_at"] = now()
    db[PROFILES].update_one({"user_id": user_id}, {"$set": new}, upsert=True)
    return get_profile(user_id)[0]
