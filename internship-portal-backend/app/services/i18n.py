"""Serves the original Flask-Babel translations (hi, ml) as JSON for the frontend."""
from functools import lru_cache
from pathlib import Path

import polib

BASE = Path(__file__).resolve().parent.parent / "translations"


@lru_cache(maxsize=8)
def messages(lang):
    path = BASE / lang / "LC_MESSAGES" / "messages.po"
    if not path.exists():
        return {}
    return {e.msgid: e.msgstr for e in polib.pofile(str(path), encoding="utf-8") if e.msgstr and not e.obsolete}
