"""
Thin wrapper around the TMDb v3 API.

All network calls are isolated here so the rest of the app never talks to
requests/HTTP directly. This makes it easy to mock in tests and easy to
swap providers later.
"""
import requests
from flask import current_app


class TMDbError(Exception):
    pass


class TMDbService:
    def _base_params(self):
        api_key = current_app.config["TMDB_API_KEY"]
        if not api_key:
            raise TMDbError("TMDB_API_KEY is not configured. Set it in your .env file.")
        return {"api_key": api_key}

    def _get(self, endpoint, params=None):
        params = {**self._base_params(), **(params or {})}
        url = f"{current_app.config['TMDB_BASE_URL']}{endpoint}"
        try:
            resp = requests.get(url, params=params, timeout=8)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.RequestException as exc:
            current_app.logger.error(f"TMDb request failed: {exc}")
            raise TMDbError(f"Failed to reach TMDb: {exc}") from exc

    def search_movies(self, query, page=1):
        return self._get("/search/movie", {"query": query, "page": page, "include_adult": "false"})

    def get_movie_details(self, tmdb_id):
        return self._get(f"/movie/{tmdb_id}", {"append_to_response": "credits,videos,similar"})

    def get_trending(self, time_window="week", page=1):
        return self._get(f"/trending/movie/{time_window}", {"page": page})

    def get_top_rated(self, page=1):
        return self._get("/movie/top_rated", {"page": page})

    def get_popular(self, page=1):
        return self._get("/movie/popular", {"page": page})

    def get_by_genre(self, genre_id, page=1):
        return self._get("/discover/movie", {"with_genres": genre_id, "page": page, "sort_by": "popularity.desc"})

    def get_genre_list(self):
        return self._get("/genre/movie/list")

    @staticmethod
    def poster_url(poster_path, size="w500"):
        if not poster_path:
            return None
        path = poster_path if poster_path.startswith("/") else f"/{poster_path}"
        return f"/api/poster/{size}{path}"

    @staticmethod
    def backdrop_url(backdrop_path, size="original"):
        if not backdrop_path:
            return None
        path = backdrop_path if backdrop_path.startswith("/") else f"/{backdrop_path}"
        return f"/api/poster/{size}{path}"


tmdb_service = TMDbService()
