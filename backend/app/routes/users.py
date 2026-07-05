from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user

from app.models import Favorite, WatchlistItem, Rating, ViewHistory, Movie
from app.services import tmdb_service

users_bp = Blueprint("users", __name__, url_prefix="/profile")


def _attach_poster_urls(movies):
    for m in movies:
        m["poster_url"] = tmdb_service.poster_url(m.get("poster_path"))
    return movies


# ─── SPA page routes (all served by index.html) ─────────────────────────────

@users_bp.route("/")
@users_bp.route("/favorites")
@users_bp.route("/watchlist")
@users_bp.route("/ratings")
@users_bp.route("/history")
@login_required
def profile_spa(**kwargs):
    """SPA: serves index.html; JS router handles profile sub-pages."""
    return render_template("index.html")


# ─── JSON API endpoints ───────────────────────────────────────────────────────

@users_bp.route("/api/summary")
@login_required
def profile_summary():
    """Returns counts of favorites, watchlist, and ratings."""
    favorites_count = Favorite.query.filter_by(user_id=current_user.id).count()
    watchlist_count = WatchlistItem.query.filter_by(user_id=current_user.id).count()
    ratings_count = Rating.query.filter_by(user_id=current_user.id).count()
    return jsonify({
        "username": current_user.first_name,
        "email": current_user.email,
        "favorites_count": favorites_count,
        "watchlist_count": watchlist_count,
        "ratings_count": ratings_count,
    })


@users_bp.route("/api/favorites")
@login_required
def favorites_api():
    """JSON: user's favorited movies."""
    favs = Favorite.query.filter_by(user_id=current_user.id).order_by(Favorite.created_at.desc()).all()
    movies = _attach_poster_urls([f.movie.to_dict() for f in favs])
    return jsonify(movies)


@users_bp.route("/api/watchlist")
@login_required
def watchlist_api():
    """JSON: user's watchlist movies."""
    items = WatchlistItem.query.filter_by(user_id=current_user.id).order_by(WatchlistItem.created_at.desc()).all()
    movies = _attach_poster_urls([i.movie.to_dict() for i in items])
    return jsonify(movies)


@users_bp.route("/api/ratings")
@login_required
def ratings_api():
    """JSON: user's rated movies with scores."""
    user_ratings = Rating.query.filter_by(user_id=current_user.id).order_by(Rating.created_at.desc()).all()
    data = []
    for r in user_ratings:
        movie_dict = r.movie.to_dict()
        movie_dict["poster_url"] = tmdb_service.poster_url(movie_dict.get("poster_path"))
        movie_dict["user_score"] = r.score
        movie_dict["rated_at"] = r.created_at.isoformat()
        data.append(movie_dict)
    return jsonify(data)


@users_bp.route("/api/history")
@login_required
def history_api():
    """JSON: user's recently viewed movies (deduplicated, last 30)."""
    views = (
        ViewHistory.query.filter_by(user_id=current_user.id)
        .order_by(ViewHistory.viewed_at.desc())
        .limit(30)
        .all()
    )
    seen = set()
    movies = []
    for v in views:
        if v.movie_id in seen:
            continue
        seen.add(v.movie_id)
        d = v.movie.to_dict()
        d["poster_url"] = tmdb_service.poster_url(d.get("poster_path"))
        d["viewed_at"] = v.viewed_at.isoformat()
        movies.append(d)
    return jsonify(movies)
