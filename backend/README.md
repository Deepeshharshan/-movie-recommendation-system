# CineMatch — Movie Recommendation System

A full-stack movie recommendation platform built with Flask, SQLite, and the TMDb API.

## Phase 1 (Complete): Core Application

- User registration/login (session-based auth via Flask-Login)
- Movie search with live suggestions
- Movie details, trending, top rated
- Ratings, favorites, watchlist, view history
- Genre-based + rating-based hybrid recommendation engine (cold-start safe)
- Responsive UI with dark/light mode

## Local Setup

```bash
# 1. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate          # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
# Edit .env and add your TMDB_API_KEY
# Get one free at: https://www.themoviedb.org/settings/api

# 4. Run the app
python run.py
```

Visit **http://127.0.0.1:5000**

## Project Structure

```
movie-recsys/
├── app/
│   ├── __init__.py        # App factory
│   ├── config.py          # Environment-based config
│   ├── extensions.py      # db, login_manager
│   ├── models/             # User, Movie, Rating, Favorite, Watchlist, ViewHistory
│   ├── routes/              # auth, movies, users blueprints
│   ├── services/              # TMDb client + recommendation engine
│   ├── static/                  # CSS / JS
│   └── templates/                 # Jinja2 HTML
├── run.py
├── requirements.txt
└── .env.example
```

## Recommendation Engine

Located in `app/services/recommendation_service.py`. Uses a weighted hybrid of:
- Genre similarity (60%) — based on user's rating history
- Rating quality (30%) — TMDb average rating
- Popularity (10%) — TMDb popularity score

Falls back to trending/popular movies for new users with no rating history (cold start).
Designed to be swapped for an ML model later without touching calling code —
just reimplement `RecommendationEngine.recommend()`.

## Coming in Phase 2

Docker, Jenkins CI/CD, SonarQube, Trivy, Terraform, AWS EC2/S3/CloudWatch deployment.
