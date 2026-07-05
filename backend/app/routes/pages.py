"""
VISIONCINE — pages.py
Blueprint for the For You and Subscription page API endpoints.

Endpoints:
  GET /api/recommendations   — personalised movie recommendations
  GET /api/trending          — trending movies from TMDb
  GET /api/history           — authenticated user's view history
  GET /api/stats             — authenticated user's quick statistics
  GET /api/subscription      — current subscription plan info
  GET /for-you               — serves the SPA (index.html handles routing)
  GET /subscription          — serves the SPA (index.html handles routing)
"""
from collections import Counter
from flask import Blueprint, jsonify, render_template, current_app
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Movie, Rating, ViewHistory, WatchlistItem, Favorite
from app.services import tmdb_service, TMDbError, recommendation_engine

pages_bp = Blueprint("pages", __name__)

# ── TMDb genre id → name mapping (subset) ─────────────────────────────────────
GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
    53: "Thriller", 10752: "War", 37: "Western",
}


# ── SPA route handlers ─────────────────────────────────────────────────────────
@pages_bp.route("/for-you")
@pages_bp.route("/subscription")
def spa_passthrough(**kwargs):
    """All SPA sub-routes just serve index.html; JS handles the view."""
    return render_template("index.html")


# ── /api/recommendations ───────────────────────────────────────────────────────
@pages_bp.route("/api/recommendations")
def get_recommendations():
    """
    Return personalised recommendations.
    - Authenticated: uses recommendation_engine (genre + rating heuristic).
    - Anonymous / cold-start: returns TMDb popular fallback.
    Each result carries a synthetic match_score (0–100).
    """
    limit = 20

    if current_user.is_authenticated:
        movies = recommendation_engine.recommend(current_user, limit=limit)
        # Compute a rough match score from the engine's internal weights
        genre_prefs = recommendation_engine._user_genre_preferences(current_user)
        max_pref = max(genre_prefs.values(), default=1) or 1

        results = []
        for movie in movies:
            genre_score = sum(genre_prefs.get(g, 0) for g in movie.genre_id_list())
            normalised = min(int((genre_score / max_pref) * 100), 100)
            # Blend with IMDb vote_average to avoid 0 % on unrated genres
            match = max(normalised, int((movie.vote_average or 0) * 8))
            match = min(match, 99)  # cap at 99 to keep it realistic
            d = movie.to_dict()
            d["match_score"] = match
            d["poster_url"] = tmdb_service.poster_url(d.get("poster_path"))
            d["backdrop_url"] = tmdb_service.backdrop_url(d.get("backdrop_path"))
            d["genre_names"] = [GENRE_MAP.get(g, "") for g in d.get("genre_ids", []) if g in GENRE_MAP]
            results.append(d)
        has_ratings = Rating.query.filter_by(user_id=current_user.id).count() > 0
        return jsonify({"results": results, "has_ratings": has_ratings})

    # Anonymous fallback — use TMDb popular
    try:
        data = tmdb_service.get_popular()
        results = []
        for m in data.get("results", [])[:limit]:
            m["match_score"] = int((m.get("vote_average", 0) / 10) * 85)
            m["poster_url"] = tmdb_service.poster_url(m.get("poster_path"))
            m["backdrop_url"] = tmdb_service.backdrop_url(m.get("backdrop_path"))
            m["genre_names"] = [GENRE_MAP.get(g, "") for g in m.get("genre_ids", []) if g in GENRE_MAP]
            results.append(m)
        return jsonify({"results": results, "has_ratings": False})
    except TMDbError as e:
        return jsonify({"error": str(e)}), 502


# ── /api/trending ──────────────────────────────────────────────────────────────
@pages_bp.route("/api/trending")
def get_trending():
    """Return today's trending movies from TMDb."""
    try:
        data = tmdb_service.get_trending(time_window="day")
        results = []
        for m in data.get("results", [])[:20]:
            m["poster_url"] = tmdb_service.poster_url(m.get("poster_path"))
            m["backdrop_url"] = tmdb_service.backdrop_url(m.get("backdrop_path"))
            m["genre_names"] = [GENRE_MAP.get(g, "") for g in m.get("genre_ids", []) if g in GENRE_MAP]
            results.append(m)
        return jsonify({"results": results})
    except TMDbError as e:
        return jsonify({"error": str(e)}), 502


# ── /api/history ───────────────────────────────────────────────────────────────
@pages_bp.route("/api/history")
@login_required
def get_history():
    """Return the current user's view history (deduplicated, most-recent first)."""
    views = (
        ViewHistory.query
        .filter_by(user_id=current_user.id)
        .order_by(ViewHistory.viewed_at.desc())
        .limit(50)
        .all()
    )
    seen, results = set(), []
    for v in views:
        if v.movie_id in seen:
            continue
        seen.add(v.movie_id)
        d = v.movie.to_dict()
        d["poster_url"] = tmdb_service.poster_url(d.get("poster_path"))
        d["viewed_at"] = v.viewed_at.isoformat()
        d["genre_names"] = [GENRE_MAP.get(g, "") for g in d.get("genre_ids", []) if g in GENRE_MAP]
        results.append(d)
    return jsonify({"results": results[:20]})


# ── /api/stats ─────────────────────────────────────────────────────────────────
@pages_bp.route("/api/stats")
@login_required
def get_stats():
    """Return quick statistics for the current user's For You page."""
    ratings = Rating.query.filter_by(user_id=current_user.id).all()
    saved_count = WatchlistItem.query.filter_by(user_id=current_user.id).count()
    history_count = db.session.query(
        db.func.count(db.distinct(ViewHistory.movie_id))
    ).filter_by(user_id=current_user.id).scalar() or 0

    avg_rating = 0.0
    fav_genre = "—"
    genre_counter = Counter()

    for r in ratings:
        movie = Movie.query.get(r.movie_id)
        if movie:
            for gid in movie.genre_id_list():
                genre_counter[gid] += r.score

    if ratings:
        avg_rating = round(sum(r.score for r in ratings) / len(ratings), 1)

    if genre_counter:
        top_gid = genre_counter.most_common(1)[0][0]
        fav_genre = GENRE_MAP.get(top_gid, "Mixed")

    # Approx hours: assume average movie is 105 min
    hours_watched = round((history_count * 105) / 60, 1)

    return jsonify({
        "movies_rated": len(ratings),
        "movies_saved": saved_count,
        "average_rating": avg_rating,
        "favorite_genre": fav_genre,
        "hours_watched": hours_watched,
        "history_count": history_count,
        "top_genres": [
            {"id": gid, "name": GENRE_MAP.get(gid, str(gid)), "score": round(score, 1)}
            for gid, score in genre_counter.most_common(5)
        ],
    })


# ── /api/subscription ─────────────────────────────────────────────────────────
@pages_bp.route("/api/subscription")
def get_subscription():
    """Return the current user's subscription plan (mocked — extend with DB model later)."""
    plan = {
        "plan": "Starter",
        "price": "₹99/month",
        "billing_date": "5th of every month",
        "renewal_date": "2026-08-05",
        "status": "Active",
        "features": ["HD", "1 Device", "Watchlist", "Basic Recommendations"],
    }
    return jsonify(plan)
