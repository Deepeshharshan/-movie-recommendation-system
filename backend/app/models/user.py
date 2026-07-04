from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    ratings = db.relationship("Rating", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    favorites = db.relationship("Favorite", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    watchlist_items = db.relationship("WatchlistItem", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    view_history = db.relationship("ViewHistory", backref="user", lazy="dynamic", cascade="all, delete-orphan")

    def set_password(self, password: str) -> None:
        # Use pbkdf2:sha256 explicitly — scrypt is unavailable on LibreSSL/Python 3.9
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<User {self.username}>"
