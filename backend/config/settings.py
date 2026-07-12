"""
Django settings for AssetFlow.

Env-driven: local dev reads a `.env` file (gitignored); production (HF Spaces)
reads real environment variables / Space secrets. Nothing sensitive is hardcoded.
"""
from pathlib import Path

from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env if present (local dev). In prod the vars come from the environment.
load_dotenv(BASE_DIR / ".env")


def _env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


def _env_list(name: str, default: str = "") -> list[str]:
    return [v.strip() for v in os.getenv(name, default).split(",") if v.strip()]


# ── Core ───────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "insecure-dev-key-do-not-use-in-prod")
DEBUG = _env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = _env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0")

# Auth / JWT — the HS256 secret Supabase signs tokens with (dev: our own value).
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "local-dev-super-secret-jwt-signing-key-change-me")
SUPABASE_JWT_AUD = os.getenv("SUPABASE_JWT_AUD", "authenticated")

# ── Apps ───────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "corsheaders",
    # local
    "core",
    "apps.accounts",
    "apps.organization",
    "apps.assets",
    "apps.allocation",
    "apps.booking",
    "apps.maintenance",
    "apps.audits",
    "apps.activity",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ── Database (local PostgreSQL in dev; Supabase pooler in prod) ─────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "assetflow"),
        "USER": os.getenv("POSTGRES_USER", "postgres"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

# ── Password validation (only used by Django admin superusers) ─────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

# ── I18n / TZ ──────────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ── Static ─────────────────────────────────────────────────────────────
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── CORS ───────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = _env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
CORS_ALLOW_HEADERS = ["authorization", "content-type", "accept", "origin", "x-requested-with"]
