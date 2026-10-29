"""Create (or promote) an administrator.
Usage: python scripts/create_admin.py <username> [email]      (password read from ADMIN_PASSWORD or prompted)"""
import getpass
import os
import sys

from _boot import boot

from app.extensions import get_db
from app.models import USERS
from app.services.users import create_user

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    username, email = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
    app, ctx = boot()
    with ctx:
        existing = get_db()[USERS].find_one({"username_lower": username.lower()})
        if existing:
            get_db()[USERS].update_one({"_id": existing["_id"]}, {"$set": {"role": "admin"}})
            print(f"Promoted existing user '{username}' to admin")
        else:
            pw = os.getenv("ADMIN_PASSWORD") or getpass.getpass("Password: ")
            if len(pw) < 6:
                sys.exit("Password must be at least 6 characters")
            create_user(username, pw, email, role="admin")
            print(f"Created admin '{username}'")
