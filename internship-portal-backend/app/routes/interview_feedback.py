
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify

from ..extensions import get_db
from ..models import INTERVIEW_FEEDBACK
from ..services.auth import auth_required, admin_required
from ..utils import clean, now
from ..validation import json_body, page_args, s, validation_error


bp = Blueprint(
    "interview_feedback",
    __name__,
    url_prefix="/api/interview-feedback"
)


DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"]
PERFORMANCE_LEVELS = ["Excellent", "Good", "Average", "Poor"]
ROUND_TYPES = [
    "Aptitude",
    "Technical",
    "Coding",
    "HR",
    "Group Discussion",
    "Managerial",
    "Other"
]


def validate_string_list(data, key, errors, max_items=20, max_length=300):
    """Validate a list of strings."""
    value = data.get(key, [])

    if not isinstance(value, list):
        errors[key] = "Must be a list"
        return []

    if len(value) > max_items:
        errors[key] = f"Cannot contain more than {max_items} items"
        return []

    result = []

    for item in value:
        if not isinstance(item, str) or not item.strip():
            errors[key] = "Every item must be a non-empty string"
            return []

        item = item.strip()

        if len(item) > max_length:
            errors[key] = f"Each item must be at most {max_length} characters"
            return []

        result.append(item)

    return result


@bp.post("")
@auth_required
def submit():
    """
    Submit interview feedback.

    Example JSON:
    {
        "company": "TCS",
        "round": "Technical",
        "questions": ["Explain Python OOP"],
        "topics": ["Python", "OOP"],
        "difficulty": "Medium",
        "performance": "Good",
        "improvement_areas": ["Data Structures"],
        "additional_comments": "Need more coding practice"
    }
    """

    data = json_body()
    errors = {}

    company = s(data, "company", errors, required=True, max_len=150)
    round_name = s(data, "round", errors, required=True, max_len=100)

    difficulty = s(data, "difficulty", errors, required=True, max_len=20)
    performance = s(data, "performance", errors, required=True, max_len=20)

    additional_comments = s(
        data,
        "additional_comments",
        errors,
        max_len=2000
    )

    questions = validate_string_list(
        data, "questions", errors, max_items=30, max_length=500
    )

    topics = validate_string_list(
        data, "topics", errors, max_items=30, max_length=100
    )

    improvement_areas = validate_string_list(
        data, "improvement_areas", errors, max_items=20, max_length=150
    )

    if difficulty and difficulty not in DIFFICULTY_LEVELS:
        errors["difficulty"] = "Choose Easy, Medium, or Hard"

    if performance and performance not in PERFORMANCE_LEVELS:
        errors["performance"] = (
            "Choose Excellent, Good, Average, or Poor"
        )

    if errors:
        raise validation_error(errors)

    doc = {
        "user_id": g.user["_id"],
        "username": g.user["username"],
        "company": company,
        "round": round_name,
        "questions": questions,
        "topics": topics,
        "difficulty": difficulty,
        "performance": performance,
        "improvement_areas": improvement_areas,
        "additional_comments": additional_comments,
        "created_at": now()
    }

    result = get_db()[INTERVIEW_FEEDBACK].insert_one(doc)
    doc["_id"] = result.inserted_id

    return jsonify({
        "message": "Interview feedback submitted successfully",
        "feedback": clean(doc)
    }), 201


@bp.get("/mine")
@auth_required
def mine():
    """Get the logged-in student's interview feedback."""

    page, limit = page_args()
    db = get_db()

    query = {"user_id": g.user["_id"]}

    total = db[INTERVIEW_FEEDBACK].count_documents(query)

    docs = (
        db[INTERVIEW_FEEDBACK]
        .find(query)
        .sort("created_at", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    return jsonify({
        "items": [clean(doc) for doc in docs],
        "page": page,
        "limit": limit,
        "total": total
    })


@bp.get("/analytics")
@admin_required
def analytics():
    """Company and interview-round analytics for administrators."""

    db = get_db()
    collection = db[INTERVIEW_FEEDBACK]

    total = collection.count_documents({})

    company_stats = list(collection.aggregate([
        {
            "$group": {
                "_id": "$company",
                "total_feedback": {"$sum": 1},
                "average_difficulty": {
                    "$avg": {
                        "$switch": {
                            "branches": [
                                {"case": {"$eq": ["$difficulty", "Easy"]}, "then": 1},
                                {"case": {"$eq": ["$difficulty", "Medium"]}, "then": 2},
                                {"case": {"$eq": ["$difficulty", "Hard"]}, "then": 3}
                            ],
                            "default": None
                        }
                    }
                }
            }
        },
        {"$sort": {"total_feedback": -1}}
    ]))

    round_stats = list(collection.aggregate([
        {
            "$group": {
                "_id": "$round",
                "total_feedback": {"$sum": 1},
                "difficulty_levels": {"$push": "$difficulty"}
            }
        },
        {"$sort": {"total_feedback": -1}}
    ]))

    topic_stats = list(collection.aggregate([
        {"$unwind": "$topics"},
        {
            "$group": {
                "_id": "$topics",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]))

    return jsonify({
        "total_feedback": total,
        "company_analytics": [
            {
                "company": item["_id"],
                "total_feedback": item["total_feedback"],
                "average_difficulty_score": (
                    round(item["average_difficulty"], 2)
                    if item["average_difficulty"] is not None
                    else None
                )
            }
            for item in company_stats
        ],
        "round_analytics": [
            {
                "round": item["_id"],
                "total_feedback": item["total_feedback"]
            }
            for item in round_stats
        ],
        "popular_topics": [
            {
                "topic": item["_id"],
                "count": item["count"]
            }
            for item in topic_stats
        ]
    })
