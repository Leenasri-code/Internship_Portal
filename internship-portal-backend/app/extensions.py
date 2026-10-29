from flask import current_app


def create_mongo_client(uri):
    """pymongo client; `mongomock://` URIs use the in-memory mock (tests/dev only)."""
    if uri.startswith("mongomock://"):
        import mongomock
        return mongomock.MongoClient()
    import pymongo
    kwargs = {"serverSelectionTimeoutMS": 8000, "appname": "internship-portal"}
    if uri.startswith("mongodb+srv://") or "tls=true" in uri.lower() or "ssl=true" in uri.lower():
        import certifi
        kwargs["tlsCAFile"] = certifi.where()
    return pymongo.MongoClient(uri, **kwargs)


def get_db():
    return current_app.extensions["mongo_db"]
