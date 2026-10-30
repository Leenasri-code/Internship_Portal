from datetime import timedelta

from flask import current_app

from ..errors import ApiError
from ..extensions import get_db
from ..models import ASSESSMENTS, ATTEMPTS
from ..utils import as_aware, clean, now
from ..validation import s, validation_error


def validate_assessment(data, partial=False):
    errors, out = {}, {}
    if not partial or "title" in data:
        out["title"] = s(data, "title", errors, required=True, max_len=200)
    if not partial or "duration_minutes" in data:
        d = data.get("duration_minutes")
        if isinstance(d, bool) or not isinstance(d, int) or not (1 <= d <= 300):
            errors["duration_minutes"] = "Must be an integer between 1 and 300"
        out["duration_minutes"] = d
    if not partial or "questions" in data:
        qs = data.get("questions")
        clean_qs = []
        if not isinstance(qs, list) or not qs:
            errors["questions"] = "Must be a non-empty list"
        else:
            ids = set()
            for i, q in enumerate(qs):
                p = f"questions[{i}]"
                if not isinstance(q, dict):
                    errors[p] = "Must be an object"
                    continue
                qid = q.get("id", i + 1)
                text = (q.get("text") or "").strip() if isinstance(q.get("text"), str) else ""
                opts = q.get("options")
                if not text:
                    errors[p + ".text"] = "Required"
                if qid in ids:
                    errors[p + ".id"] = "Duplicate question id"
                ids.add(qid)
                if not isinstance(opts, list) or len(opts) < 2 or not all(
                        isinstance(o, dict) and isinstance(o.get("id"), str) and isinstance(o.get("text"), str) for o in opts):
                    errors[p + ".options"] = "Need at least 2 options shaped {id, text}"
                    continue
                oids = [o["id"] for o in opts]
                if len(set(oids)) != len(oids):
                    errors[p + ".options"] = "Duplicate option ids"
                if q.get("correct") not in oids:
                    errors[p + ".correct"] = "Must match one of the option ids"
                clean_qs.append({"id": qid, "text": text, "options": [{"id": o["id"], "text": o["text"]} for o in opts],
                                 "correct": q.get("correct")})
        out["questions"] = clean_qs
    if not partial or "company" in data:
        company = data.get("company", "")
        if not isinstance(company, str):
            errors["company"] = "Must be text"
        else:
            out["company"] = company.strip()[:200]
    if not partial or "round_name" in data:
        round_name = data.get("round_name", "Aptitude Assessment")
        if not isinstance(round_name, str) or not round_name.strip():
            errors["round_name"] = "Must be non-empty text"
        else:
            out["round_name"] = round_name.strip()[:120]
    if not partial or "round_order" in data:
        order = data.get("round_order", 1)
        if isinstance(order, bool) or not isinstance(order, int) or order < 1:
            errors["round_order"] = "Must be a positive integer"
        else:
            out["round_order"] = order
    if "is_active" in data:
        out["is_active"] = bool(data["is_active"])
    if errors:
        raise validation_error(errors)
    return out


def public_questions(a):
    return [{"id": q["id"], "text": q["text"], "options": q["options"]} for q in a["questions"]]


def summary(a, best=None):
    return {"id": str(a["_id"]), "title": a["title"], "duration_minutes": a["duration_minutes"],
            "question_count": len(a["questions"]), "best_score": best,
            "company": a.get("company", ""), "round_name": a.get("round_name", "Aptitude Assessment"),
            "round_order": a.get("round_order", 1)}


def grade(a, answers):
    details, score = [], 0
    for q in a["questions"]:
        given = answers.get(str(q["id"]))
        opt = {o["id"]: o["text"] for o in q["options"]}
        ok = given == q["correct"]
        score += ok
        details.append({"question_id": q["id"], "text": q["text"], "your_answer": given,
                        "your_answer_text": opt.get(given), "correct_answer": q["correct"],
                        "correct_answer_text": opt[q["correct"]], "is_correct": ok})
    total = len(a["questions"])
    return {"score": score, "total": total, "percentage": round(100 * score / total, 1) if total else 0, "details": details}


def start(user, a):
    t = now()
    doc = {"user_id": user["_id"], "assessment_id": a["_id"], "title": a["title"], "status": "in_progress",
           "started_at": t, "expires_at": t + timedelta(minutes=a["duration_minutes"]), "created_at": t}
    doc["_id"] = get_db()[ATTEMPTS].insert_one(doc).inserted_id
    return doc


def submit(user, a, attempt_id, answers):
    from ..validation import object_id
    db = get_db()
    att = db[ATTEMPTS].find_one({"_id": object_id(attempt_id, "attempt"), "user_id": user["_id"], "assessment_id": a["_id"]})
    if not att:
        raise ApiError(404, "not_found", "Attempt not found")
    if att["status"] != "in_progress":
        raise ApiError(409, "already_submitted", "This attempt was already submitted")
    grace = timedelta(seconds=current_app.config["ASSESSMENT_GRACE_SECONDS"])
    if now() > as_aware(att["expires_at"]) + grace:
        db[ATTEMPTS].update_one({"_id": att["_id"]}, {"$set": {"status": "expired"}})
        raise ApiError(409, "time_expired", "The time limit for this attempt has passed")
    result = grade(a, answers)
    db[ATTEMPTS].update_one({"_id": att["_id"]}, {"$set": {"status": "submitted", "submitted_at": now(), "answers": answers,
                                                           **{k: result[k] for k in ("score", "total", "percentage", "details")}}})
    return att["_id"], result
