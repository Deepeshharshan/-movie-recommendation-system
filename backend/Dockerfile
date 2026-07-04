# =============================================================================
# VISIONCINE — Production-Ready Dockerfile
# Base: python:3.9-slim (minimal footprint, matches local Python 3.9.6)
# =============================================================================

# ── Stage 1: Builder — install deps in isolation ─────────────────────────────
FROM python:3.9-slim AS builder

# System deps for compiling any C-extension packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy only requirements first (cache layer)
COPY requirements.txt .

# Install into a prefix dir so we can copy just the libs in the next stage
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Runtime — lean final image ──────────────────────────────────────
FROM python:3.9-slim AS runtime

LABEL maintainer="VISIONCINE <deepeshharshan>"
LABEL description="VisionCine Movie Recommendation System – Flask API"
LABEL version="1.0.0"

# Non-root user for security
RUN groupadd -r visioncine && useradd -r -g visioncine visioncine

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

# Working directory
WORKDIR /app

# Copy the Flask application code (no .env, no venv, no __pycache__)
COPY app/          ./app/
COPY run.py        ./run.py
COPY requirements.txt ./requirements.txt

# Create the instance directory for SQLite DB (persisted via volume in prod)
RUN mkdir -p /app/instance && chown -R visioncine:visioncine /app

# Switch to non-root user
USER visioncine

# Tell Flask / Python where to find the app
ENV FLASK_APP=run.py
ENV FLASK_ENV=production
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Port the gunicorn server will listen on
EXPOSE 5002

# Health check — polls the root endpoint every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5002/')" || exit 1

# Start with gunicorn (4 workers, bound on all interfaces, port 5002)
CMD ["gunicorn", \
     "--workers", "4", \
     "--bind", "0.0.0.0:5002", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "run:app"]
