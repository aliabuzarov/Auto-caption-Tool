# AutoCaption

Upload a video, transcribe it locally with faster-whisper, review and edit
captions, then burn karaoke-style word-by-word captions into the video.

## Prerequisites

- Python 3.10+
- [Redis](https://redis.io/) (for Celery broker/result backend)
- [ffmpeg](https://ffmpeg.org/) (must be on your PATH)

## Setup

```bash
# Create and activate a virtual environment
python -m venv .venv
# On Linux/macOS: source .venv/bin/activate
# On Windows:     .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate
```

## Running the application

You need **three** terminal windows:

```bash
# Terminal 1 – Redis (if not already running as a service)
redis-server

# Terminal 2 – Celery worker
celery -A autocaption worker --loglevel=info --pool=solo

# Terminal 3 – Django dev server
python manage.py runserver
```

Then open **http://localhost:8000** in your browser.

## API endpoints

| Method | Path                          | Description                                   |
|--------|-------------------------------|-----------------------------------------------|
| POST   | `/api/jobs/`                  | Upload video, create job, dispatch transcribe |
| GET    | `/api/jobs/<uuid>/`           | Poll job status & get caption_data            |
| PATCH  | `/api/jobs/<uuid>/captions/`  | Save edited caption_data                      |
| POST   | `/api/jobs/<uuid>/render/`    | Trigger rendering                             |
| GET    | `/api/jobs/<uuid>/download/`  | Download finished video                       |

## Configuration (environment variables)

| Variable              | Default                    | Notes                       |
|-----------------------|----------------------------|-----------------------------|
| `DJANGO_SECRET_KEY`   | (built-in dev key)         | Change in production        |
| `DJANGO_DEBUG`        | `True`                     | Set to `False` in prod      |
| `DATABASE_URL`        | (SQLite)                   | PostgreSQL DSN if set       |
| `CELERY_BROKER_URL`   | `redis://localhost:6379/0` |                             |
| `CELERY_RESULT_BACKEND`| `redis://localhost:6379/0` |                             |

When `DATABASE_URL` is **not** set, SQLite is used automatically for local dev.
