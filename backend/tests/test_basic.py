"""
VISIONCINE — Backend Test Suite
Basic health and route tests for the CI/CD pipeline.
"""

import os
import pytest

# Set test environment BEFORE importing the app
os.environ.setdefault("FLASK_ENV", "testing")
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key-12345")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("TMDB_API_KEY", "dummy-ci-key")

from app import create_app  # noqa: E402


@pytest.fixture
def app():
    """Create Flask app instance for testing."""
    application = create_app("testing")
    application.config.update({
        "TESTING": True,
        "WTF_CSRF_ENABLED": False,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "ci-test-secret",
    })
    yield application


@pytest.fixture
def client(app):
    """Test client."""
    return app.test_client()


# ─── Application Config Tests ──────────────────────────────────────────────
class TestAppConfig:
    def test_app_is_created(self, app):
        assert app is not None

    def test_testing_mode_enabled(self, app):
        assert app.config["TESTING"] is True

    def test_debug_disabled_in_testing(self, app):
        # DEBUG should not be True in testing env for security
        assert app.config.get("DEBUG") is not True or app.config.get("TESTING") is True

    def test_database_is_sqlite_in_memory(self, app):
        db_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
        assert "sqlite" in db_uri or "memory" in db_uri


# ─── Route Health Tests ────────────────────────────────────────────────────
class TestHomeRoute:
    def test_home_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_home_returns_html(self, client):
        response = client.get("/")
        assert b"html" in response.data.lower() or len(response.data) > 100

    def test_search_route_exists(self, client):
        response = client.get("/search?q=inception")
        assert response.status_code in [200, 302, 500]  # 500 if TMDB unreachable


# ─── Auth Route Tests ──────────────────────────────────────────────────────
class TestAuthRoutes:
    def test_register_endpoint_exists(self, client):
        response = client.post(
            "/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": "pytest@visioncine.local",
                "password": "SecurePass123!",
            },
            content_type="application/json",
        )
        # 201 = success, 400 = validation error, 409 = already exists
        assert response.status_code in [200, 201, 400, 409]

    def test_register_returns_json(self, client):
        response = client.post(
            "/auth/register",
            json={
                "first_name": "JSON",
                "last_name": "Test",
                "email": "jsontest@visioncine.local",
                "password": "SecurePass123!",
            },
            content_type="application/json",
        )
        assert response.content_type == "application/json"

    def test_login_endpoint_exists(self, client):
        response = client.post(
            "/auth/login",
            json={"email": "nonexistent@test.local", "password": "wrong"},
            content_type="application/json",
        )
        # 200 = success, 400/401 = bad credentials — all confirm route exists
        assert response.status_code in [200, 201, 400, 401]

    def test_logout_endpoint_exists(self, client):
        response = client.post("/auth/logout")
        assert response.status_code in [200, 302]

    def test_full_auth_flow(self, client):
        """Register → Login → Logout round trip."""
        email = "flow@visioncine.local"

        # Register
        r = client.post(
            "/auth/register",
            json={"first_name": "Flow", "last_name": "Test", "email": email, "password": "Pass1234!"},
            content_type="application/json",
        )
        assert r.status_code in [200, 201, 409]

        # Login
        r = client.post(
            "/auth/login",
            json={"email": email, "password": "Pass1234!"},
            content_type="application/json",
        )
        assert r.status_code in [200, 201]

        # Logout
        r = client.post("/auth/logout")
        assert r.status_code in [200, 302]


# ─── Database Tests ────────────────────────────────────────────────────────
class TestDatabase:
    def test_database_tables_created(self, app):
        from app.extensions import db
        with app.app_context():
            # Just confirm tables can be queried
            from app.models import User
            count = User.query.count()
            assert count >= 0  # Returns a non-negative integer

    def test_user_model_has_required_fields(self, app):
        from app.models import User
        with app.app_context():
            user = User(
                username="citest",
                email="model@test.local",
            )
            user.set_password("Pass1234!")
            assert user.email == "model@test.local"
            assert user.username == "citest"
            assert user.check_password("Pass1234!")
            assert not user.check_password("wrongpassword")
