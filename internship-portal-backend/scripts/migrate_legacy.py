"""Import data from the ORIGINAL Flask app (users.csv + profiles.json) into MongoDB.

* Existing scrypt password hashes are copied as-is, so users keep their passwords.
* The legacy `password_plain` column is IGNORED and never stored. Delete it from your CSV afterwards.

Usage: python scripts/migrate_legacy.py --users path/to/users.csv --profiles path/to/profiles.json [--dry-run]"""
import argparse
import csv
import json
import os

from _boot import boot

from app.errors import ApiError
from app.extensions import get_db
from app.models import PROFILES, USERS
from app.services.profiles import FIELDS, empty_profile
from app.services.users import create_user
from app.utils import now


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--users")
    ap.add_argument("--profiles")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    app, ctx = boot()
    with ctx:
        db = get_db()
        n_users = n_skipped = n_profiles = 0
        if a.users:
            with open(a.users, newline="", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    name, h = (row.get("user") or "").strip(), (row.get("password_encrypted") or "").strip()
                    if not name or not h:
                        n_skipped += 1
                        continue
                    email = name if "@" in name else None
                    if a.dry_run:
                        n_users += 1
                        continue
                    try:
                        create_user(name, None, email, password_hash=h)
                        n_users += 1
                    except ApiError as e:
                        print(f"skip '{name}': {e.message}")
                        n_skipped += 1
        if a.profiles and os.path.exists(a.profiles):
            profiles = json.load(open(a.profiles, encoding="utf-8"))
            for name, p in profiles.items():
                user = db[USERS].find_one({"username_lower": name.lower()})
                if not user:
                    print(f"profile for unknown user '{name}' skipped")
                    continue
                doc = {**empty_profile(), **{k: p[k] for k in FIELDS if k in p and p[k] is not None}}
                doc["graduation_year"] = str(doc.get("graduation_year", ""))
                doc.update(user_id=user["_id"], updated_at=now())
                if not a.dry_run:
                    db[PROFILES].update_one({"user_id": user["_id"]}, {"$set": doc}, upsert=True)
                n_profiles += 1
        print(f"users imported: {n_users}, skipped: {n_skipped}, profiles imported: {n_profiles}{' (dry run)' if a.dry_run else ''}")


if __name__ == "__main__":
    main()
