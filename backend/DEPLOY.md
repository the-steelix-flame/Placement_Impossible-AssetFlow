# AssetFlow Backend — Deploy (Docker)

The backend is a Docker web service connecting to **Supabase Postgres** (session pooler).
Two free options below. **Render is recommended** (unambiguously free, builds our
`Dockerfile` straight from the repo). Hugging Face Docker Spaces also work (kept as an
alternative). A HF **Static** Space will NOT work — it can't run a server/Python.

---

# Option A — Render (recommended, free)

Render binds `$PORT` (our Dockerfile already handles it) and reads the `Dockerfile` with
**Root Directory = `backend`**. No subtree/copy needed.

### A1. Fastest — Blueprint (uses `render.yaml` at the repo root)
1. Sign up at **render.com** (GitHub login; no credit card for the free tier).
2. **New +** → **Blueprint** → connect the `Placement_Impossible-AssetFlow` repo.
3. Render reads `render.yaml` and shows the service. It **auto-generates**
   `DJANGO_SECRET_KEY`; fill the three `sync:false` secrets when prompted:
   - `POSTGRES_PASSWORD` = your Supabase DB password
   - `SUPABASE_SERVICE_ROLE_KEY` = from `backend/.env`
   - `SUPABASE_JWT_SECRET` = any long random string
4. **Apply** → Render builds and deploys. URL will be `https://assetflow-api.onrender.com`
   (name may vary). Health check `/health` is pre-configured.

### A2. Manual (no blueprint)
1. **New +** → **Web Service** → connect the repo.
2. Settings: **Root Directory** = `backend` · **Runtime** = Docker · **Instance** = Free
   · **Health Check Path** = `/health`.
3. Add the env vars from the table in Option B step 2 (skip HF-specific notes; set
   `DJANGO_ALLOWED_HOSTS` = `.onrender.com`). Create Web Service.

### A3. Verify
- `https://<your-service>.onrender.com/health` → `{"status":"ok","db":"up"}`
- `https://<your-service>.onrender.com/api/docs` → Swagger UI

> Free tier sleeps after ~15 min idle (first request then takes ~30–50s to wake). Fine for
> a demo — hit `/health` a minute before presenting to warm it. Then point the frontend's
> `NEXT_PUBLIC_API_URL` at the Render URL and add that URL to `CORS_ALLOWED_ORIGINS`.

Other unambiguously-free Docker hosts if Render doesn't suit: **Koyeb** (doesn't sleep) and
**Fly.io** (needs a card on file). Same Dockerfile works on both.

---

# Option B — Hugging Face Spaces (Docker)

TLS is terminated by HF; the container listens on port **7860**.

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
