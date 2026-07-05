from flask import Blueprint, render_template, request, jsonify, current_app, send_file
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


# ─── SPA catch-all page routes (served by index.html; JS router handles UI) ───
@movies_bp.route("/")
@movies_bp.route("/search")
@movies_bp.route("/genre/<path:rest>")
@movies_bp.route("/for-you")
def home(**kwargs):
    return render_template("index.html")


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
    """SPA: serves index.html; JS fetches details via /api/movie/<tmdb_id>/details."""
    return render_template("index.html")


@movies_bp.route("/api/movie/<int:tmdb_id>/details")
def movie_details_api(tmdb_id):
    """JSON API: full movie details including cast, videos, similar."""
    try:
        data = tmdb_service.get_movie_details(tmdb_id)
    except TMDbError as e:
        return jsonify({"error": str(e)}), 500

    movie = _upsert_movie_from_tmdb(data)
    data["poster_url"] = tmdb_service.poster_url(data.get("poster_path"))
    data["backdrop_url"] = tmdb_service.backdrop_url(data.get("backdrop_path"))
    data["local_movie_id"] = movie.id

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

    return jsonify({
        "movie": data,
        "cast": cast,
        "similar": similar,
        "trailer_key": trailer_key,
        "local_movie_id": movie.id,
        "user_rating": user_rating,
        "is_favorite": is_favorite,
        "is_watchlisted": is_watchlisted,
    })


@movies_bp.route("/api/movie/rate", methods=["POST"])
@login_required
def rate_movie_by_tmdb():
    """Rate a movie by TMDB ID (used by the SPA frontend)."""
    body = request.get_json(silent=True) or {}
    tmdb_id = body.get("tmdb_id")
    score = body.get("score")
    try:
        score = float(score)
        if not (1 <= score <= 5):
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Score must be a number between 1 and 5."}), 400

    if not tmdb_id:
        return jsonify({"error": "tmdb_id is required."}), 400

    # Fetch and cache movie from TMDB if needed
    movie = Movie.query.filter_by(tmdb_id=tmdb_id).first()
    if not movie:
        try:
            data = tmdb_service.get_movie_details(tmdb_id)
            movie = _upsert_movie_from_tmdb(data)
        except TMDbError as e:
            return jsonify({"error": f"Movie not found: {e}"}), 404

    rating = Rating.query.filter_by(user_id=current_user.id, movie_id=movie.id).first()
    if rating:
        rating.score = score
    else:
        rating = Rating(user_id=current_user.id, movie_id=movie.id, score=score)
        db.session.add(rating)

    db.session.commit()
    return jsonify({"message": "Rating saved.", "score": score})


@movies_bp.route("/api/movie/<int:local_movie_id>/rate", methods=["POST"])
@login_required
def rate_movie(local_movie_id):
    """Rate a movie by local DB ID (legacy)."""
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
    """SPA page — served by index.html."""
    return render_template("index.html")


@movies_bp.route("/api/genres")
def genres_api():
    """JSON API: list of all TMDB genres."""
    try:
        genre_list = tmdb_service.get_genre_list().get("genres", [])
    except TMDbError:
        genre_list = []
    return jsonify(genre_list)


@movies_bp.route("/genre/<int:genre_id>")
def genre_movies(genre_id):
    """SPA page — served by index.html."""
    return render_template("index.html")


@movies_bp.route("/api/genre/<int:genre_id>")
def genre_movies_api(genre_id):
    """JSON API: movies by genre."""
    page = request.args.get("page", 1, type=int)
    try:
        data = tmdb_service.get_by_genre(genre_id, page=page)
        results = data.get("results", [])
    except TMDbError:
        results, data = [], {}

    for r in results:
        r["poster_url"] = tmdb_service.poster_url(r.get("poster_path"))

    return jsonify({
        "results": results,
        "page": page,
        "total_pages": data.get("total_pages", 1),
    })


@movies_bp.route("/api/poster/<size>/<path:filename>")
def get_s3_poster(size, filename):
    import io
    import requests
    import boto3
    from botocore.exceptions import ClientError
    
    bucket = current_app.config.get("AWS_S3_BUCKET")
    # If S3 bucket is not configured, fall back to downloading and serving from TMDB directly
    if not bucket:
        tmdb_url = f"https://image.tmdb.org/t/p/{size}/{filename}"
        try:
            resp = requests.get(tmdb_url, timeout=5)
            if resp.status_code == 200:
                return send_file(io.BytesIO(resp.content), mimetype="image/jpeg")
        except Exception:
            pass
        return "Not Found", 404

    s3_key = f"{size}/{filename}"
    
    # Initialize S3 client using role credentials or config env variables
    if current_app.config.get("AWS_ACCESS_KEY_ID"):
        s3_client = boto3.client(
            's3',
            aws_access_key_id=current_app.config.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=current_app.config.get("AWS_SECRET_ACCESS_KEY"),
            region_name=current_app.config.get("AWS_REGION", "us-east-1")
        )
    else:
        s3_client = boto3.client('s3', region_name=current_app.config.get("AWS_REGION", "us-east-1"))
        
    try:
        # Check if the image exists in S3
        file_obj = io.BytesIO()
        s3_client.download_fileobj(bucket, s3_key, file_obj)
        file_obj.seek(0)
        return send_file(file_obj, mimetype="image/jpeg")
    except ClientError as e:
        # If not found in S3 (404), download from TMDB, upload to S3, and serve
        if e.response['Error']['Code'] in ['404', 'NoSuchKey', 'NoSuchBucket']:
            tmdb_url = f"https://image.tmdb.org/t/p/{size}/{filename}"
            try:
                resp = requests.get(tmdb_url, timeout=5)
                if resp.status_code == 200:
                    # Upload to S3 in the background or synchronously
                    s3_client.put_object(
                        Bucket=bucket,
                        Key=s3_key,
                        Body=resp.content,
                        ContentType="image/jpeg"
                    )
                    return send_file(io.BytesIO(resp.content), mimetype="image/jpeg")
            except Exception as exc:
                current_app.logger.error(f"Failed to fetch/upload poster from TMDB: {exc}")
                
        return "Not Found", 404

