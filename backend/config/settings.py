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
# ".hf.space" (leading dot = subdomain wildcard) lets the Hugging Face Space host itself.
ALLOWED_HOSTS = _env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0,.hf.space")

# Behind HF/Vercel TLS termination — trust the forwarded proto so HTTPS is detected.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# Needed for the Django admin login form over HTTPS (set to the Space URL in prod).
CSRF_TRUSTED_ORIGINS = _env_list("CSRF_TRUSTED_ORIGINS", "https://*.hf.space")
# Secure cookies in prod (admin only — the JWT API is cookie-less).
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# ── Auth / JWT ─────────────────────────────────────────────────────────
# Real Supabase user tokens are signed with the project's ASYMMETRIC key
# (ES256/RS256) and verified against the public JWKS. Local `mint_token` tokens
# are signed with the HS256 shared secret below. core/auth.py accepts both,
# routing by the token's `alg` header.
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "local-dev-super-secret-jwt-signing-key-change-me")
SUPABASE_JWT_AUD = os.getenv("SUPABASE_JWT_AUD", "authenticated")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
# JWKS URL derives from the project URL unless explicitly overridden.
SUPABASE_JWKS_URL = os.getenv(
    "SUPABASE_JWKS_URL",
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else "",
)
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

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
    "whitenoise.middleware.WhiteNoiseMiddleware",  # serve Django admin static on HF
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

# ── Database (local PostgreSQL in dev; Supabase session pooler in prod) ──
_db_options: dict = {}
# Supabase requires SSL; local Postgres usually doesn't. Env-driven so the same
# code works both places (set POSTGRES_SSLMODE=require for Supabase).
_sslmode = os.getenv("POSTGRES_SSLMODE", "").strip()
if _sslmode:
    _db_options["sslmode"] = _sslmode

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "assetflow"),
        "USER": os.getenv("POSTGRES_USER", "postgres"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": int(os.getenv("POSTGRES_CONN_MAX_AGE", "60")),
        "OPTIONS": _db_options,
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

# ── Static (whitenoise serves Django admin assets in prod) ─────────────
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── CORS ───────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = _env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
CORS_ALLOW_HEADERS = ["authorization", "content-type", "accept", "origin", "x-requested-with"]
