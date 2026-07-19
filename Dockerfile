# Dockerfile
# ---------------------------------------------------------------------------
# AutoCaption – single image for both the Django web server and the
# Celery worker.  ffmpeg and libsndfile1 are installed at the OS level so
# that faster-whisper's audio pipeline works inside the container.
#
# Multi-stage build:
#   Stage 1 (build-node) – builds the React frontend with Vite
#   Stage 2 (final)      – Python runtime + OS deps + built frontend
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Stage 1 – Build React frontend
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build-node

WORKDIR /build
COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 – Python application
# ---------------------------------------------------------------------------
FROM python:3.11-slim

# Prevent .pyc files and buffer stdout/stderr so logs appear in real time.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# --- OS-level dependencies ------------------------------------------------
# ffmpeg  : required by faster-whisper (audio extraction) and caption burning
# libsndfile1 : required by faster-whisper's audio I/O backend (soundfile)
# build-essential + python3-dev + libsndfile1-dev : needed to compile wheels
#   for CPython extensions (ctranslate2, tokenizers, av, etc.) when a
#   pre-built manylinux wheel is unavailable for the resolved version.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
        build-essential \
        python3-dev \
        libsndfile1-dev \
    && rm -rf /var/lib/apt/lists/*

# --- Python dependencies --------------------------------------------------
COPY requirements.txt .
RUN pip install --upgrade pip \
        --trusted-host pypi.org \
        --trusted-host files.pythonhosted.org \
    && pip install --no-cache-dir -r requirements.txt \
        --trusted-host pypi.org \
        --trusted-host files.pythonhosted.org

# --- Strip build-time packages to keep the final image slim ---------------
RUN apt-get remove -y build-essential python3-dev libsndfile1-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# --- Application code -----------------------------------------------------
COPY . .

# --- React frontend (built in stage 1) ------------------------------------
COPY --from=build-node /build/dist /frontend-dist

# The command differs between web and worker services, so it is set in
# docker-compose.yml rather than here.
