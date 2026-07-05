import os
from flask import Flask, render_template
from app.config import config_map
from app.extensions import db, login_manager


from flask_cors import CORS

def create_app(config_name=None):
    config_name = config_name or os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_map.get(config_name, config_map["default"]))

    os.makedirs(app.instance_path, exist_ok=True)

    import logging
    from logging.handlers import RotatingFileHandler

    # Stream handler always works (captured by Docker/gunicorn stdout)
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(
        logging.Formatter("[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
    )
    stream_handler.setLevel(logging.INFO)
    app.logger.addHandler(stream_handler)

    # File handler — optional; skip if the instance dir is not writable (e.g. volume permission issue)
    try:
        log_path = os.path.join(app.instance_path, "flask.log")
        file_handler = RotatingFileHandler(log_path, maxBytes=1024 * 1024, backupCount=5)
        file_handler.setFormatter(
            logging.Formatter("[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
        )
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.info("VisionCine backend: file logging active at %s", log_path)
    except (PermissionError, OSError) as exc:
        app.logger.warning("File logging unavailable (%s) — using stdout only.", exc)

    app.logger.setLevel(logging.INFO)

    db.init_app(app)
    login_manager.init_app(app)
    CORS(app, supports_credentials=True)

    from app.models import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from app.routes.auth import auth_bp
    from app.routes.movies import movies_bp
    from app.routes.users import users_bp
    from app.routes.pages import pages_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(movies_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(pages_bp)

    @app.errorhandler(404)
    def not_found(e):
        # SPA: let the JS router handle 404 display
        return render_template("index.html"), 404

    @app.errorhandler(500)
    def server_error(e):
        app.logger.error("500 error: %s", e)
        return render_template("index.html"), 500

    try:
        with app.app_context():
            db.create_all()
    except Exception as e:
        if "already exists" not in str(e):
            raise e

    return app
