from datetime import datetime
from app.extensions import db


class Movie(db.Model):
    """Local cache of TMDb movie data so we can join with ratings/favorites
    without hitting the TMDb API every time."""

    __tablename__ = "movies"

    id = db.Column(db.Integer, primary_key=True)
    tmdb_id = db.Column(db.Integer, unique=True, nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    overview = db.Column(db.Text)
    poster_path = db.Column(db.String(255))
    backdrop_path = db.Column(db.String(255))
    release_date = db.Column(db.String(20))
    vote_average = db.Column(db.Float, default=0.0)
    vote_count = db.Column(db.Integer, default=0)
    popularity = db.Column(db.Float, default=0.0)
    genre_ids = db.Column(db.String(100))  # comma-separated TMDb genre ids
    cached_at = db.Column(db.DateTime, default=datetime.utcnow)

    ratings = db.relationship("Rating", backref="movie", lazy="dynamic", cascade="all, delete-orphan")
    favorited_by = db.relationship("Favorite", backref="movie", lazy="dynamic", cascade="all, delete-orphan")
    watchlisted_by = db.relationship("WatchlistItem", backref="movie", lazy="dynamic", cascade="all, delete-orphan")
    viewed_by = db.relationship("ViewHistory", backref="movie", lazy="dynamic", cascade="all, delete-orphan")

    def genre_id_list(self):
        if not self.genre_ids:
            return []
        return [int(g) for g in self.genre_ids.split(",") if g]

    def to_dict(self):
        return {
            "id": self.id,
            "tmdb_id": self.tmdb_id,
            "title": self.title,
            "overview": self.overview,
            "poster_path": self.poster_path,
            "backdrop_path": self.backdrop_path,
            "release_date": self.release_date,
            "vote_average": self.vote_average,
            "vote_count": self.vote_count,
            "popularity": self.popularity,
            "genre_ids": self.genre_id_list(),
        }

    def __repr__(self):
        return f"<Movie {self.title}>"


class Rating(db.Model):
    __tablename__ = "ratings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    movie_id = db.Column(db.Integer, db.ForeignKey("movies.id"), nullable=False)
    score = db.Column(db.Float, nullable=False)  # 1.0 - 5.0
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("user_id", "movie_id", name="uq_user_movie_rating"),)


class Favorite(db.Model):
    __tablename__ = "favorites"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    movie_id = db.Column(db.Integer, db.ForeignKey("movies.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("user_id", "movie_id", name="uq_user_movie_favorite"),)


class WatchlistItem(db.Model):
    __tablename__ = "watchlist_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    movie_id = db.Column(db.Integer, db.ForeignKey("movies.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("user_id", "movie_id", name="uq_user_movie_watchlist"),)


class ViewHistory(db.Model):
    __tablename__ = "view_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    movie_id = db.Column(db.Integer, db.ForeignKey("movies.id"), nullable=False)
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow)
