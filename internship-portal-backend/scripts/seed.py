"""Load internships (government + private) and the assessment test. Idempotent; never overwrites edits.
Usage: python scripts/seed.py"""
from _boot import boot

from app.services.seed import seed_data

if __name__ == "__main__":
    app, ctx = boot()
    with ctx:
        print("Inserted:", seed_data(app.extensions["mongo_db"]))
