# AssetFlow

AssetFlow is an enterprise asset and resource management app for tracking company assets, allocations, bookings, maintenance, audits, reports, notifications, and workspace onboarding.

The project is split into:

- `backend/` - Django 5 + Django Ninja API
- `frontend/` - Next.js App Router frontend
- `docs/` - API contract, database schema, and project structure notes
- `render.yaml` - Render blueprint for backend deployment

## Current Auth Model

AssetFlow uses Supabase Auth for user identity, but roles and company access always come from our backend database.

There are two signup paths:

1. Create Company
   - A user creates a new workspace/company.
   - Backend creates the first employee as `ADMIN` with `access_status=ACTIVE`.
   - Backend creates join codes for `EMPLOYEE`, `DEPT_HEAD`, and `ASSET_MANAGER`.
   - Frontend sends Supabase signup metadata containing a backend `signup_ticket`.

2. Join Company
   - User chooses a role and enters the matching join code.
   - Frontend first calls the backend validation endpoint.
   - If the code is wrong, Supabase signup is not called and no verification email is sent.
   - If the code is valid, the user signs up and stays in `PENDING_APPROVAL`.
   - Admin approves/rejects from Organization -> Access.

Important routes:

- Frontend: `http://localhost:3000`
- Backend API docs: `http://127.0.0.1:8000/api/docs`
- Backend health: `http://127.0.0.1:8000/health`
- API base path: `http://127.0.0.1:8000/api/v1`

## Prerequisites

Install these before starting:

- Node.js 20+
- npm
- Python 3.12+
- PostgreSQL 14+ if you want a local database
- A Supabase project if you want to test real frontend signup/login
- Git

Recommended Python package manager:

```powershell
python -m pip install --user uv
python -m uv --version
```

If `uv` is not on PATH after installation, keep using `python -m uv ...`.

## Fresh Clone

```powershell
git clone <repo-url>
cd assetflow
```

If you are already in the repo, pull the latest code:

```powershell
git pull origin main
```

## Environment Files

Never commit `.env` or `.env.local`.

Create backend env:

```powershell
Copy-Item backend\.env.example backend\.env
```

Create frontend env:

```powershell
Copy-Item frontend\.env.example frontend\.env.local
```

## Backend Setup

Go to the backend folder:

```powershell
cd backend
```

Install dependencies:

```powershell
python -m uv sync
```

This creates/updates `backend/.venv`.

### Backend `.env`

Edit `backend/.env`.

For local PostgreSQL:

```env
DJANGO_SECRET_KEY=dev-secret-key-change-me
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

POSTGRES_DB=assetflow
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-local-postgres-password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

SUPABASE_JWT_SECRET=local-dev-super-secret-jwt-signing-key-change-me
SUPABASE_JWT_AUD=authenticated

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

CORS_ALLOWED_ORIGINS=http://localhost:3000
```

For Supabase Postgres instead of local Postgres, use the Supabase pooler values:

```env
POSTGRES_DB=postgres
POSTGRES_USER=postgres.<project-ref>
POSTGRES_PASSWORD=your-supabase-db-password
POSTGRES_HOST=<pooler-host>.supabase.com
POSTGRES_PORT=5432
POSTGRES_SSLMODE=require
```

`SUPABASE_JWKS_URL` is optional. If omitted, the backend derives it from:

```text
{SUPABASE_URL}/auth/v1/.well-known/jwks.json
```

### Create Local PostgreSQL Database

If using local Postgres, create the database:

```powershell
psql -U postgres -c "CREATE DATABASE assetflow;"
```

Or create it manually in pgAdmin with name `assetflow`.

### Run Backend Checks and Migrations

```powershell
python -m uv run python manage.py check
python -m uv run python manage.py migrate
```

Optional: confirm onboarding migrations are applied:

```powershell
python -m uv run python manage.py showmigrations accounts organization
```

Expected important migrations:

```text
accounts
 [X] 0003_employee_access_status_employee_requested_role
organization
 [X] 0002_organization_slug_organization_status_rolejoincode_and_more
 [X] 0003_onboarding_constraints
```

### Seed Demo Data

For a rich local demo dataset:

```powershell
python -m uv run python manage.py seed_demo --reset
```

This creates demo users, departments, categories, assets, allocations, bookings, maintenance, audits, role join codes, and a pending join request.

Seeded users include:

- `admin@demo.assetflow` - Admin
- `manager@demo.assetflow` - Asset Manager
- `priya@demo.assetflow` - Department Head
- `rohan@demo.assetflow` - Department Head
- `sana@demo.assetflow` - Employee
- `vikram@demo.assetflow` - Employee
- `neha@demo.assetflow` - Employee
- `karan@demo.assetflow` - Employee

### Run Backend Server

```powershell
python -m uv run python manage.py runserver 127.0.0.1:8000
```

Open:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/api/docs`

## Frontend Setup

Open a second terminal from the repo root:

```powershell
cd frontend
npm install
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the frontend:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## Supabase Setup for Full Frontend Testing

In Supabase:

1. Create or open your Supabase project.
2. Enable Email auth.
3. Configure redirect URLs.

Add these local redirect URLs:

```text
http://localhost:3000/dashboard
http://localhost:3000/pending-approval
http://localhost:3000/update-password
```

Also add deployed URLs later when Vercel/Render are live.

Required values:

- Project URL -> backend `SUPABASE_URL`, frontend `NEXT_PUBLIC_SUPABASE_URL`
- Publishable/anon key -> backend `SUPABASE_ANON_KEY`, frontend `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Service role key -> backend `SUPABASE_SERVICE_ROLE_KEY` only
- Database password/pooler values -> backend Postgres env vars if using Supabase DB

Do not put the service role key in the frontend.

## Running the Full Local App

Terminal 1:

```powershell
cd backend
python -m uv run python manage.py runserver 127.0.0.1:8000
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Then visit:

```text
http://localhost:3000
```

## Full Auth Smoke Test

Use this when Supabase Auth and backend env are configured.

### 1. Create Company

Open:

```text
http://localhost:3000/signup
```

Choose `Create company`.

Submit:

- Company name
- Admin full name
- Admin email
- Password

Expected:

- Backend creates organization, Admin employee, and role join codes.
- Supabase sends verification email.
- After verification/login, Admin reaches dashboard.

### 2. Check Admin Access

As Admin, open:

```text
http://localhost:3000/organization
```

Go to:

```text
Access
```

Expected:

- Role join codes are visible/masked.
- Admin can rotate role codes.
- Pending join requests are visible.

### 3. Join Company

Open an incognito/private browser window or sign out.

Go to:

```text
http://localhost:3000/join-company
```

Submit:

- Full name
- Email
- Password
- Requested role
- Matching role code

Expected:

- If the role code is wrong, no Supabase email is sent.
- If the role code is correct, Supabase sends verification email.
- After verification/login, user sees only Pending Approval.

### 4. Approve User

Sign back in as Admin.

Open:

```text
Organization -> Access
```

Approve the request.

Expected:

- User changes to active access.
- User can now enter the app and see company data.

## Backend API Testing Without Frontend Login

For backend-only testing, seed data and mint a local JWT:

```powershell
cd backend
python -m uv run python manage.py seed_demo --reset
python -m uv run python manage.py mint_token --email admin@demo.assetflow
```

Copy the printed token.

Open:

```text
http://127.0.0.1:8000/api/docs
```

Click `Authorize` and enter:

```text
Bearer <token>
```

Now authenticated API endpoints can be tested from Swagger.

Note: this token is for local backend testing. The browser app uses real Supabase sessions.

## Useful Commands

Backend:

```powershell
cd backend
python -m uv run python manage.py check
python -m uv run python manage.py migrate
python -m uv run python manage.py seed_demo --reset
python -m uv run python manage.py runserver 127.0.0.1:8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
npm run lint
npm run build
```

Git:

```powershell
git status --short --branch
git pull origin main
```

## Main API Areas

Public onboarding:

- `POST /api/v1/onboarding/workspaces`
- `POST /api/v1/onboarding/join/validate-code`

Accounts and access:

- `GET /api/v1/me`
- `GET /api/v1/employees`
- `GET /api/v1/join-requests`
- `POST /api/v1/join-requests/{id}/approve`
- `POST /api/v1/join-requests/{id}/reject`

Organization:

- `GET /api/v1/departments`
- `GET /api/v1/asset-categories`
- `GET /api/v1/join-codes`
- `POST /api/v1/join-codes/{role}/rotate`

Core product:

- `GET /api/v1/assets`
- `GET /api/v1/allocations`
- `GET /api/v1/bookings`
- `GET /api/v1/maintenance-requests`
- `GET /api/v1/audit-cycles`
- `GET /api/v1/dashboard/kpis`
- `GET /api/v1/reports/utilization`
- `GET /api/v1/notifications`

## Troubleshooting

### `uv` is not recognized

Install it:

```powershell
python -m pip install --user uv
```

Then use:

```powershell
python -m uv run python manage.py check
```

If you want `uv` as a direct command, restart the terminal or add the Python user scripts folder to PATH.

### `ModuleNotFoundError: No module named 'django'`

You are using the wrong Python environment.

Use:

```powershell
cd backend
python -m uv sync
python -m uv run python manage.py check
```

Or use the existing venv directly:

```powershell
.\.venv\Scripts\python.exe manage.py check
```

### Database connection refused

Check:

- PostgreSQL is running.
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` are correct.
- The `assetflow` database exists.

For Supabase DB, also set:

```env
POSTGRES_SSLMODE=require
```

### Supabase email redirects to the wrong place

Add the local redirect URLs in Supabase Auth settings:

```text
http://localhost:3000/dashboard
http://localhost:3000/pending-approval
http://localhost:3000/update-password
```

### Frontend says it cannot reach backend

Check:

- Backend is running on `http://127.0.0.1:8000`.
- `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.
- Backend `.env` has `CORS_ALLOWED_ORIGINS=http://localhost:3000`.

Restart the frontend after changing `.env.local`.

### 401 unauthorized

The token/session is missing or invalid.

For the browser app:

- Sign in again.
- Confirm Supabase env values match the same project used by the backend.

For Swagger:

- Mint a token with `manage.py mint_token`.
- Use `Bearer <token>`.

### 403 approval pending

This is expected for users who joined with a role code but have not been approved.

Admin must approve the request in:

```text
Organization -> Access
```

### Port already in use

Backend:

```powershell
python -m uv run python manage.py runserver 127.0.0.1:8001
```

Then update frontend:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
```

Frontend:

```powershell
npm run dev -- --port 3001
```

## Deployment Notes

Backend Render deployment uses `render.yaml`.

On Render, make sure these secrets/env vars are set:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=false`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_SSLMODE=require` if using Supabase DB
- `SUPABASE_URL`
- `SUPABASE_JWT_AUD=authenticated`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ALLOWED_ORIGINS`

The Docker command runs migrations before starting Gunicorn.

Frontend deployment should set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_URL`

After deployment, add deployed frontend URLs to Supabase redirect URLs and backend CORS.

## Verification Checklist

Before saying the app is locally ready:

- Backend `manage.py check` passes.
- Backend migrations apply cleanly.
- Backend `/health` returns `{"status":"ok","db":"up"}`.
- Frontend `npm run lint` passes.
- Frontend `npm run build` passes.
- Create Company flow sends verification email.
- Join Company rejects wrong codes before Supabase email.
- Pending users see only Pending Approval.
- Admin approval activates a joined user.
