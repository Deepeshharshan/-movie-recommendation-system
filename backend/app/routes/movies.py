from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Movie, Rating, Favorite, WatchlistItem, ViewHistory
from app.services import tmdb_service, TMDbError, recommendation_engine

movies_bp = Blueprint("movies", __name__)


def _upsert_movie_from_tmdb(data):
    """Cache a TMDb movie payload into our local Movie table."""
    movie = Movie.query.filter_by(tmdb_id=data["id"]).first()
    genre_ids = data.get("genre_ids") or [g["id"] for g in data.get("genres", [])]

    if movie is None:
        movie = Movie(tmdb_id=data["id"])
        db.session.add(movie)

    movie.title = data.get("title") or data.get("original_title", "Untitled")
    movie.overview = data.get("overview", "")
    movie.poster_path = data.get("poster_path")
    movie.backdrop_path = data.get("backdrop_path")
    movie.release_date = data.get("release_date", "")
    movie.vote_average = data.get("vote_average", 0.0)
    movie.vote_count = data.get("vote_count", 0)
    movie.popularity = data.get("popularity", 0.0)
    movie.genre_ids = ",".join(str(g) for g in genre_ids)

    db.session.commit()
    return movie


@movies_bp.route("/")
def home():
    try:
        trending = tmdb_service.get_trending().get("results", [])[:12]
        top_rated = tmdb_service.get_top_rated().get("results", [])[:12]
        popular = tmdb_service.get_popular().get("results", [])[:12]
        new_releases = tmdb_service._get("/movie/now_playing").get("results", [])[:12]
    except TMDbError as e:
        current_app.logger.warning(str(e))
        trending, top_rated, popular, new_releases = [], [], [], []

    for item in trending + top_rated + popular + new_releases:
        item["poster_url"] = tmdb_service.poster_url(item.get("poster_path"))

    # Featured hero movie: highest-popularity trending title with a backdrop
    featured = None
    for candidate in trending:
        if candidate.get("backdrop_path"):
            featured = candidate
            break
    if featured:
        featured["backdrop_url"] = tmdb_service.backdrop_url(featured.get("backdrop_path"))

    recommendations = []
    if current_user.is_authenticated:
        recs = recommendation_engine.recommend(current_user, limit=12)
        recommendations = [m.to_dict() for m in recs]
        for r in recommendations:
            r["poster_url"] = tmdb_service.poster_url(r.get("poster_path"))

    recent_views = []
    if current_user.is_authenticated:
        views = (
            ViewHistory.query.filter_by(user_id=current_user.id)
            .order_by(ViewHistory.viewed_at.desc())
            .limit(12)
            .all()
        )
        seen_ids = set()
        for v in views:
            if v.movie_id in seen_ids:
                continue
            seen_ids.add(v.movie_id)
            d = v.movie.to_dict()
            d["poster_url"] = tmdb_service.poster_url(d.get("poster_path"))
            recent_views.append(d)

    return render_template(
        "index.html",
        featured=featured,
        trending=trending,
        top_rated=top_rated,
        popular=popular,
        new_releases=new_releases,
        recommendations=recommendations,
        recent_views=recent_views,
    )


@movies_bp.route("/search")
def search():
    query = request.args.get("q", "").strip()
    page = request.args.get("page", 1, type=int)

    if not query:
        return render_template("search.html", results=[], query="")

    try:
        data = tmdb_service.search_movies(query, page=page)
        results = data.get("results", [])
    except TMDbError as e:
        current_app.logger.warning(str(e))
        results, data = [], {}

    for r in results:
        r["poster_url"] = tmdb_service.poster_url(r.get("poster_path"))

    return render_template(
        "search.html",
        results=results,
        query=query,
        page=page,
        total_pages=data.get("total_pages", 1),
    )


@movies_bp.route("/api/search-suggestions")
def search_suggestions():
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify([])
    try:
        data = tmdb_service.search_movies(query)
        suggestions = [
            {"id": m["id"], "title": m.get("title"), "year": (m.get("release_date") or "")[:4]}
            for m in data.get("results", [])[:6]
        ]
        return jsonify(suggestions)
    except TMDbError:
        return jsonify([])


@movies_bp.route("/movie/<int:tmdb_id>")
def movie_details(tmdb_id):
    try:
        data = tmdb_service.get_movie_details(tmdb_id)
    except TMDbError as e:
        return render_template("errors/500.html", message=str(e)), 500

    movie = _upsert_movie_from_tmdb(data)
    data["poster_url"] = tmdb_service.poster_url(data.get("poster_path"))
    data["backdrop_url"] = tmdb_service.backdrop_url(data.get("backdrop_path"))

    cast = data.get("credits", {}).get("cast", [])[:8]
    for c in cast:
        c["profile_url"] = tmdb_service.poster_url(c.get("profile_path"), size="w185") if c.get("profile_path") else None

    trailer_key = None
    videos = data.get("videos", {}).get("results", [])
    for v in videos:
        if v.get("site") == "YouTube" and v.get("type") == "Trailer":
            trailer_key = v.get("key")
            break
    if not trailer_key and videos:
        trailer_key = videos[0].get("key")

    similar = data.get("similar", {}).get("results", [])[:6]
    for s in similar:
        s["poster_url"] = tmdb_service.poster_url(s.get("poster_path"))

    user_rating = None
    is_favorite = False
    is_watchlisted = False

    if current_user.is_authenticated:
        db.session.add(ViewHistory(user_id=current_user.id, movie_id=movie.id))
        db.session.commit()

        rating = Rating.query.filter_by(user_id=current_user.id, movie_id=movie.id).first()
        user_rating = rating.score if rating else None
        is_favorite = Favorite.query.filter_by(user_id=current_user.id, movie_id=movie.id).first() is not None
        is_watchlisted = WatchlistItem.query.filter_by(user_id=current_user.id, movie_id=movie.id).first() is not None

    return render_template(
        "movie_details.html",
        movie=data,
        similar=similar,
        cast=cast,
        trailer_key=trailer_key,
        local_movie_id=movie.id,
        user_rating=user_rating,
        is_favorite=is_favorite,
        is_watchlisted=is_watchlisted,
    )


@movies_bp.route("/api/movie/<int:local_movie_id>/rate", methods=["POST"])
@login_required
def rate_movie(local_movie_id):
    score = request.json.get("score") if request.is_json else request.form.get("score")
    try:
        score = float(score)
        if not (1 <= score <= 5):
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Score must be a number between 1 and 5."}), 400

    movie = Movie.query.get_or_404(local_movie_id)
    rating = Rating.query.filter_by(user_id=current_user.id, movie_id=movie.id).first()

    if rating:
        rating.score = score
    else:
        rating = Rating(user_id=current_user.id, movie_id=movie.id, score=score)
        db.session.add(rating)

    db.session.commit()
    return jsonify({"message": "Rating saved.", "score": score})


@movies_bp.route("/api/movie/<int:local_movie_id>/favorite", methods=["POST"])
@login_required
def toggle_favorite(local_movie_id):
    movie = Movie.query.get_or_404(local_movie_id)
    fav = Favorite.query.filter_by(user_id=current_user.id, movie_id=movie.id).first()

    if fav:
        db.session.delete(fav)
        db.session.commit()
        return jsonify({"favorited": False})

    db.session.add(Favorite(user_id=current_user.id, movie_id=movie.id))
    db.session.commit()
    return jsonify({"favorited": True})


@movies_bp.route("/api/movie/<int:local_movie_id>/watchlist", methods=["POST"])
@login_required
def toggle_watchlist(local_movie_id):
    movie = Movie.query.get_or_404(local_movie_id)
    item = WatchlistItem.query.filter_by(user_id=current_user.id, movie_id=movie.id).first()

    if item:
        db.session.delete(item)
        db.session.commit()
        return jsonify({"watchlisted": False})

    db.session.add(WatchlistItem(user_id=current_user.id, movie_id=movie.id))
    db.session.commit()
    return jsonify({"watchlisted": True})


@movies_bp.route("/genres")
def genres():
    try:
        genre_list = tmdb_service.get_genre_list().get("genres", [])
    except TMDbError:
        genre_list = []
    return render_template("genres.html", genres=genre_list)


@movies_bp.route("/genre/<int:genre_id>")
def genre_movies(genre_id):
    page = request.args.get("page", 1, type=int)
    try:
        data = tmdb_service.get_by_genre(genre_id, page=page)
        results = data.get("results", [])
    except TMDbError:
        results, data = [], {}

    for r in results:
        r["poster_url"] = tmdb_service.poster_url(r.get("poster_path"))

    return render_template(
        "search.html",
        results=results,
        query=f"Genre",
        page=page,
        total_pages=data.get("total_pages", 1),
    )
