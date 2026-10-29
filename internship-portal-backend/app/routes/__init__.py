from .applications import bp as applications_bp
from .assessments import bp as assessments_bp
from .auth import bp as auth_bp
from .feedback import bp as feedback_bp
from .internships import bp as internships_bp
from .meta import bp as meta_bp
from .profile import bp as profile_bp


def register_blueprints(app):
    for bp in (meta_bp, auth_bp, profile_bp, internships_bp, applications_bp, assessments_bp, feedback_bp):
        app.register_blueprint(bp)
