"""
Recommendation engine.

Current implementation: a content + collaborative hybrid heuristic
(genre similarity + user rating history + popularity fallback).

Design note: this module exposes a single entry point,
`get_recommendations_for_user(user, limit)`, and a cold-start fallback
`get_popular_recommendations(limit)`. To later swap in a real ML model
(e.g. matrix factorization, a trained content-based model), you only need
to reimplement RecommendationEngine.recommend() and keep the same
return shape: a list of Movie objects ordered by relevance.
"""
from collections import Counter
from app.extensions import db
from app.models import Movie, Rating


class RecommendationEngine:
    GENRE_WEIGHT = 0.6
    RATING_WEIGHT = 0.3
    POPULARITY_WEIGHT = 0.1

    def _user_genre_preferences(self, user):
        """Build a weighted genre preference profile from the user's ratings.
        Higher-rated movies contribute more weight to their genres."""
        genre_scores = Counter()
        user_ratings = Rating.query.filter_by(user_id=user.id).all()

        for rating in user_ratings:
            movie = Movie.query.get(rating.movie_id)
            if not movie:
                continue
            weight = rating.score / 5.0
            for genre_id in movie.genre_id_list():
                genre_scores[genre_id] += weight

        return genre_scores

    def _rated_movie_ids(self, user):
        return {r.movie_id for r in Rating.query.filter_by(user_id=user.id).all()}

    def recommend(self, user, limit=20):
        genre_prefs = self._user_genre_preferences(user)

        if not genre_prefs:
            # Cold start: user has no ratings yet
            return self.popular_fallback(limit)

        rated_ids = self._rated_movie_ids(user)
        candidates = Movie.query.filter(~Movie.id.in_(rated_ids)).all() if rated_ids else Movie.query.all()

        scored = []
        max_popularity = max((m.popularity or 0 for m in candidates), default=1) or 1

        for movie in candidates:
            genre_score = sum(genre_prefs.get(g, 0) for g in movie.genre_id_list())
            rating_score = (movie.vote_average or 0) / 10.0
            popularity_score = (movie.popularity or 0) / max_popularity

            total = (
                self.GENRE_WEIGHT * genre_score
                + self.RATING_WEIGHT * rating_score
                + self.POPULARITY_WEIGHT * popularity_score
            )
            scored.append((total, movie))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in scored[:limit]]

    def popular_fallback(self, limit=20):
        return (
            Movie.query.order_by(Movie.popularity.desc())
            .limit(limit)
            .all()
        )


recommendation_engine = RecommendationEngine()
