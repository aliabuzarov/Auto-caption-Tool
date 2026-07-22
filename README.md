# AutoCaption

Upload a video, transcribe it locally with faster-whisper, review and edit
captions, then burn karaoke-style word-by-word captions into the video.

## Option 1: Run with Docker Compose (Recommended)

Run the entire stack (PostgreSQL, Redis, Django, Celery Worker, React frontend) with a single command:

```bash
docker compose up --build
```

Then open **http://localhost:8000** in your browser.

---

## Option 2: Local Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+ & npm
- [ffmpeg](https://ffmpeg.org/) (must be on your PATH)
- [Redis](https://redis.io/) (or Docker to run a Redis container)

### Setup

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
# On Linux/macOS: source .venv/bin/activate
# On Windows:     .venv\Scripts\activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. Apply database migrations
python manage.py migrate
```

### Running Local Development Services

Start Redis (if not running natively, start via Docker):
```bash
docker run -d -p 6379:6379 --name redis-dev redis:7-alpine
```

Run services in separate terminals:

```bash
# Terminal 1 – Celery worker (in virtual environment)
celery -A autocaption worker --loglevel=info --pool=solo

# Terminal 2 – Django backend API server
python manage.py runserver 8000

# Terminal 3 – Vite frontend dev server (runs from root)
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## API Endpoints

| Method | Path                          | Description                                   |
|--------|-------------------------------|-----------------------------------------------|
| POST   | `/api/jobs/`                  | Upload video, create job, dispatch transcribe |
| GET    | `/api/jobs/<uuid>/`           | Poll job status & get caption_data            |
| PATCH  | `/api/jobs/<uuid>/captions/`  | Save edited caption_data                      |
| POST   | `/api/jobs/<uuid>/render/`    | Trigger rendering                             |
| GET    | `/api/jobs/<uuid>/download/`  | Download finished video                       |

---

## Configuration (Environment Variables)

| Variable               | Default                    | Notes                       |
|------------------------|----------------------------|-----------------------------|
| `DJANGO_SECRET_KEY`    | (built-in dev key)         | Change in production        |
| `DJANGO_DEBUG`         | `True`                     | Set to `False` in prod      |
| `DATABASE_URL`         | (SQLite)                   | PostgreSQL DSN if set       |
| `CELERY_BROKER_URL`    | `redis://localhost:6379/0` |                             |
| `CELERY_RESULT_BACKEND`| `redis://localhost:6379/0` |                             |

When `DATABASE_URL` is **not** set, SQLite is used automatically for local dev.
