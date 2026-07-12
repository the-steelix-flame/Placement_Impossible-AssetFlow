# AssetFlow Backend — Deploy to Hugging Face Spaces (Docker)

The backend runs as a **Docker Space** on Hugging Face. TLS is terminated by HF; the
container listens on port **7860** and connects to **Supabase Postgres** (session pooler).

---

## 1. Create the Space

1. huggingface.co → **New** → **Space**.
2. **Space SDK: Docker** → **Blank** template. Name e.g. `assetflow-api`. Visibility: Public.
3. Create. You now have a git repo at `https://huggingface.co/spaces/<you>/assetflow-api`.

## 2. Add the Space secrets (Settings → Variables and secrets)

Add these as **Secrets** (not public variables). Values mirror `backend/.env`:

| Key | Value |
|---|---|
| `DJANGO_SECRET_KEY` | a long random string (50+ chars) — generate a fresh one, do not reuse the dev key |
| `DJANGO_DEBUG` | `false` |
| `DJANGO_ALLOWED_HOSTS` | `.hf.space` (or your exact `<you>-assetflow-api.hf.space`) |
| `POSTGRES_DB` | `postgres` |
| `POSTGRES_USER` | `postgres.swfvszponvxcbiwtkrbw` |
| `POSTGRES_PASSWORD` | your Supabase DB password |
| `POSTGRES_HOST` | `aws-0-ap-southeast-1.pooler.supabase.com` |
| `POSTGRES_PORT` | `5432` |
| `POSTGRES_SSLMODE` | `require` |
| `SUPABASE_URL` | `https://swfvszponvxcbiwtkrbw.supabase.co` |
| `SUPABASE_JWT_AUD` | `authenticated` |
| `SUPABASE_JWT_SECRET` | any long random string (only used if you also mint HS256 dev tokens) |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key (backend-only) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,https://<your-vercel-app>.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://<you>-assetflow-api.hf.space` |

> The DB is already migrated + seeded (we did it from local). The container also runs
> `migrate` on every start (idempotent), so no manual step is needed. Do **not** run
> `seed_demo` again unless you want to reset — it refuses if data already exists.

## 3. Push the backend to the Space

The Space repo root must contain the `Dockerfile`, but our backend lives in `/backend`
of the monorepo. Push just that subtree:

```bash
# from the monorepo root, on an up-to-date branch
git remote add hf https://huggingface.co/spaces/<you>/assetflow-api
git subtree push --prefix backend hf main
```

HF will build the Docker image and start the container. Watch **Logs** in the Space UI.
(You'll be prompted for an HF token as the git password — create one at
huggingface.co → Settings → Access Tokens, `write` scope.)

## 4. Verify

- `https://<you>-assetflow-api.hf.space/health` → `{"status":"ok","db":"up"}`
- `https://<you>-assetflow-api.hf.space/api/docs` → Swagger UI
- Create a Django admin superuser (optional, for bulk employee add): in the Space,
  add a one-off `python manage.py createsuperuser` — or seed already gives you app users.

## 5. Point the frontend at it

In Vercel (Dev B), set `NEXT_PUBLIC_API_URL=https://<you>-assetflow-api.hf.space`.
Add that Vercel domain to `CORS_ALLOWED_ORIGINS` (step 2) and restart the Space.

---

### Notes
- **Session pooler (5432), not transaction (6543):** migrations, `CREATE EXTENSION`,
  triggers, and the exclusion constraint need a real session; PgBouncer transaction
  mode breaks them. Session mode is also fine for the persistent gunicorn workers.
- **Auth:** real Supabase user tokens are ES256, verified against the project JWKS
  (derived from `SUPABASE_URL`). No shared JWT secret required for real logins.
- **Rotate** the `service_role` key and DB password after the hackathon if they were
  ever shared in chat/screenshots.
