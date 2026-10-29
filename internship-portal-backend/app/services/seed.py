"""Idempotent seeding of the internships and assessment from the original application's data."""
import json
from pathlib import Path

from ..models import ASSESSMENTS, INTERNSHIPS
from ..utils import now
from ..validation import parse_date
from .internships import natural_key

DATA = Path(__file__).resolve().parent.parent / "data"


def seed_data(db):
    created = {"internships": 0, "assessments": 0}
    t = now()
    for it in json.loads((DATA / "internships_seed.json").read_text(encoding="utf-8")):
        it["last_date_iso"] = parse_date(it.get("last_date"))
        it.setdefault("featured", False)
        it["natural_key"] = natural_key(it)
        r = db[INTERNSHIPS].update_one({"natural_key": it["natural_key"]},
                                       {"$setOnInsert": {**it, "is_active": True, "created_at": t}}, upsert=True)
        created["internships"] += bool(r.upserted_id)
    for a in json.loads((DATA / "assessments_seed.json").read_text(encoding="utf-8")):
        r = db[ASSESSMENTS].update_one({"title": a["title"]}, {"$setOnInsert": {**a, "is_active": True, "created_at": t}}, upsert=True)
        created["assessments"] += bool(r.upserted_id)
    return created
