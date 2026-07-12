# AssetFlow backend — Hugging Face Spaces Docker Space (listens on 7860)
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1

# uv for fast, reproducible installs
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install deps first (better layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

# Collect Django admin static so whitenoise can serve it (DEBUG=false in prod).
RUN DJANGO_SECRET_KEY=build POSTGRES_PASSWORD=build \
    uv run python manage.py collectstatic --noinput

EXPOSE 7860

# migrate then serve. HF Spaces default to port 7860; honour $PORT if set.
CMD ["sh", "-c", "uv run python manage.py migrate --noinput && uv run gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-7860} --workers 3 --timeout 120"]
