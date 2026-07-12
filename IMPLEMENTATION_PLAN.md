# AssetFlow — Implementation Plan

Enterprise Asset & Resource Management System (Team: Placement Impossible, 3 developers)

---

## 1. Product Identity (what makes our build different)

We are not building "another CRUD admin panel". Three ideas run through the whole build:

1. **Asset Passport** — every asset has a single, unified timeline (registration → allocations → transfers → maintenance → audits → retirement). One screen answers "what is the full life story of AF-0114?". All modules write into this timeline instead of keeping isolated histories.
2. **State machine, not status field** — asset lifecycle transitions are enforced by an explicit transition table (`Available ↔ Under Maintenance`, `Allocated → Available`, etc.). Illegal jumps (e.g. `Disposed → Allocated`) are rejected at **both** the API layer and the database layer (trigger). Demos love this: try to break it live and it refuses.
3. **Conflict-first UX** — the two flagship validations (double-allocation block with "currently held by Priya → Request Transfer" and booking overlap rejection) are guaranteed by **database constraints**, not just frontend checks. Even a raw SQL insert cannot create a double booking.

Smaller differentiators (cheap to build, big demo value):

- **Smart slot suggestion**: when a booking is rejected for overlap, the API returns the next free slot of the same duration and the UI offers it in one click. (Must-have — it rides on the overlap check.)
- **Asset health score**: derived from condition + maintenance frequency + age; used in Reports to rank "assets nearing retirement". (Stretch.)
- **Command palette (Ctrl+K)**: jump to any asset/employee/screen instantly — makes the demo feel fast and polished. (Stretch.)

---

## 2. Tech Stack & Deployment Topology

| Layer | Choice | Deployed on |
|---|---|---|
| Frontend | Next.js 15 (App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query) | **Vercel** |
| Backend API | Django 5 + **Django Ninja** (Python 3.12, managed with **uv**) | **Hugging Face Spaces** (Docker Space) |
| Admin panel | Django Admin (superuser only — bulk employee import, data fixes) | same HF Space |
| Database | PostgreSQL | **Supabase** (connection pooler / port 6543 for the HF Space) |
| Auth | **Supabase Auth** (email+password, forgot password emails) | Supabase |
| File storage | Supabase Storage (asset photos, maintenance photos, documents) | Supabase |

**Auth flow (important — everyone read this):**

1. Frontend signs up / logs in via `@supabase/supabase-js`. Signup **always** creates a plain Employee — no role field exists on the signup form at all.
2. Frontend sends the Supabase JWT as `Authorization: Bearer <token>` to Django Ninja.
3. Backend verifies the JWT against the Supabase JWT secret (an `HttpBearer` auth class in Ninja), then loads the matching `employees` row by `auth_uid` to resolve **role** (Admin / Asset Manager / Department Head / Employee). Roles live in **our** Postgres table, never in the client token claims — so roles can only be changed via the Admin-only Employee Directory endpoint.
4. Role-based permission decorators on every router (`@require_role("ADMIN")` etc.).

**Repo layout (monorepo, one repo, hard ownership boundaries):**

```
/frontend            → Next.js app                    (Dev B + Dev C, split by folder below)
/backend             → Django project                 (Dev A only)
  /apps/accounts       auth bridge, employees, roles
  /apps/organization   departments, categories
  /apps/assets         assets, documents, lifecycle
  /apps/allocation     allocations, transfers, returns
  /apps/booking        resource bookings
  /apps/maintenance    maintenance workflow
  /apps/audits         audit cycles, discrepancies
  /apps/activity       notifications, activity log
  /db/schema.sql       canonical SQL (constraints/triggers Django can't express)
/docs
  DATABASE_SCHEMA.md   → full schema + reasoning (in this repo already)
  api-contract.md      → single source of truth for every endpoint (owned by Dev A)
IMPLEMENTATION_PLAN.md → this file
```

---

## 3. Team Split — 3 Lanes, Near-Zero Merge Conflicts

The split is **by directory ownership**, not by feature. Two people never edit the same folder.

### 🟦 Dev A — Backend & Infrastructure (owns `/backend`, `/docs/api-contract.md`)

- Django + Ninja project scaffold with uv (`pyproject.toml`, `uv.lock`), Dockerfile for HF Spaces
- Supabase JWT verification + role resolution middleware, `@require_role` decorators
- All Django models mirroring `docs/DATABASE_SCHEMA.md`, plus a migration that installs the raw-SQL constraints/triggers (`RunSQL`)
- All API routers: organization, employees/roles, assets, allocation/transfer, booking (overlap logic), maintenance workflow, audits, notifications, dashboard KPIs, reports
- Django Admin registration (employee bulk-add for the demo)
- Seed script (`manage.py seed_demo`): 1 org, 5 departments, 8 categories, ~40 assets, demo users for each role
- Maintains `docs/api-contract.md` — **the only file the other two read from his lane; they never edit it, they raise it in the group chat if something is missing**

### 🟩 Dev B — Frontend Foundation & Core Screens (owns `frontend/` shell + these routes)

- Next.js scaffold, Tailwind + shadcn/ui setup, theme, layout (sidebar/topbar), protected-route wrapper
- **`frontend/src/lib/`** — Supabase client, typed API client (fetch wrapper reading the JWT), TanStack Query setup, shared types generated from the api-contract. *Dev B owns `lib/`; Dev C consumes it. If Dev C needs a helper, they message Dev B — they don't edit `lib/`.*
- Shared UI primitives in `frontend/src/components/shared/` (DataTable, StatusBadge, ConfirmDialog, EmptyState, PageHeader)
- Screens: **Login/Signup + forgot password** (`/auth`), **Dashboard + KPI cards** (`/dashboard`), **Organization Setup 3 tabs** (`/organization`), **Asset Registration & Directory + Asset Passport detail page** (`/assets`), command palette

### 🟨 Dev C — Frontend Workflow Screens (owns these routes only)

- **Allocation & Transfer** (`/allocations`) — allocate form, conflict modal ("held by Priya → Request Transfer"), transfer approval queue, return flow with condition check-in
- **Resource Booking** (`/bookings`) — calendar view, create/cancel/reschedule, overlap-rejection UI + smart slot suggestion
- **Maintenance** (`/maintenance`) — raise request, approval queue (Asset Manager view), technician assignment, status stepper
- **Audit** (`/audits`) — cycle creation wizard, auditor checklist (Verified/Missing/Damaged), discrepancy report, close-cycle flow
- **Reports & Analytics** (`/reports`) — charts (Recharts), booking heatmap, CSV export
- **Notifications & Activity Log** (`/activity`) — notification bell dropdown + full log page

**Why this causes almost no conflicts:** Dev A never touches `/frontend`. Dev B and Dev C share only `frontend/src/lib` and `components/shared`, both owned by Dev B with a "message, don't edit" rule. Route folders are disjoint. `package.json` dependency additions are announced in the group chat before committing (the single realistic conflict source).

### Naming conventions — zero collisions between backend and frontend

| Layer | Convention | Example |
|---|---|---|
| Django app labels | snake_case, plural domain words, always under `apps/` | `apps/allocation`, `apps/audits` |
| Django models | PascalCase singular | `Asset`, `TransferRequest`, `AuditCycle` |
| Ninja schemas | model name + `In`/`Out`/`Filter` suffix — **never** the bare model name (avoids import clashes with models) | `AssetIn`, `AssetOut`, `BookingFilter` |
| API routes | kebab-case, plural, under `/api/v1/` | `/api/v1/transfer-requests` |
| DB tables | snake_case plural (matches schema doc) | `maintenance_requests` |
| Next.js route folders | kebab-case, mirrors API resource names | `app/(dashboard)/transfer-requests/` |
| React components | PascalCase; **shared** ones only in `components/shared/`, screen-local ones stay inside that screen's folder (`_components/`) — Dev C never adds files to `shared/` | `components/shared/StatusBadge.tsx`, `app/bookings/_components/SlotPicker.tsx` |
| Frontend types | defined once in `lib/types.ts` from the api-contract; screens import, never redefine | `Asset`, `Booking` |
| Hooks | `use<Domain><Action>` , screen-local unless promoted by Dev B | `useAssetSearch`, `useBookingCalendar` |
| Env vars | frontend `NEXT_PUBLIC_*` only; backend plain names; all listed in the root `.env.example` — new vars are announced in chat before commit | `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_JWT_SECRET` |

Rule of thumb: if two people would create a file at the same path, the design is wrong — move it into the owner's folder and import it.

---

## 4. Git Workflow & Commit Discipline

- Branches: `main` (protected by convention — only this plan and sync merges), `dev-a/backend`, `dev-b/frontend-core`, `dev-c/frontend-flows`. All work happens on the three dev branches.
- **Commit every ~60 minutes** on your own branch — small, working slices (see hourly checkpoints below).
- **Pull at regular intervals — the hourly ritual for everyone:**
  1. `git add … && git commit` (on your own branch)
  2. `git pull --rebase origin main` — pick up anything merged since your last pull
  3. `git push origin <your-branch>`
  Never let more than an hour pass without a pull; a stale branch is how conflicts are born. Immediately after every sync point, everyone rebases on `main` before writing the next line of code.
- Merge to `main` only at the three **sync points** below. Merge order at every sync: **A → B → C** (backend first so the frontend merges compile against real contracts).
- Commit messages: conventional style, plain and human — `feat: booking overlap validation with next-slot suggestion`, `fix: return flow resets asset to available`. Write them yourself in your own words; keep them short and specific to what changed.
- Never commit secrets. `.env`, `.env.local` are gitignored from commit #1; a `.env.example` documents required keys.

### Hourly commit checkpoints (8-hour hackathon)

Deployment happens at **H7, not the final hour** — never demo from localhost with 20 minutes left.

| Hour | Dev A (backend) | Dev B (frontend core) | Dev C (frontend flows) |
|---|---|---|---|
| H1 | uv + Django + Ninja scaffold boots; Supabase DB connected; JWT auth bridge + role guards | Next.js + Tailwind + shadcn scaffold; Supabase auth client; login/signup pages | Route stubs for all workflow screens; booking calendar layout (static data) |
| H2 | organization apps: departments, categories, employees — models, migrations, CRUD APIs | App shell (sidebar/topbar/protected routes); `lib/` API client + types; forgot-password | Allocation + maintenance screen layouts (static data) |
| **SYNC 1 (end of H2)**: auth works end-to-end, org CRUD live — merge A→B→C into `main`, everyone rebases |
| H3 | assets app: models, tag trigger, schema.sql constraints migration, CRUD + search/filter APIs | Organization Setup — all 3 tabs (departments, categories, directory + promote) | Wire allocation to live API: conflict modal ("held by Priya"), transfer request flow |
| H4 | Allocation + transfer + return APIs (409 conflict rule); booking APIs (exclusion constraint + next-slot) | Asset registration form + photo upload; asset directory table + filters | Wire booking calendar: create/cancel, overlap-rejection UX + smart slot suggestion |
| H5 | Maintenance workflow APIs + asset status automation; audit cycle APIs + discrepancy generation | Asset Passport detail page (unified timeline); dashboard KPI cards (live) | Maintenance flow end-to-end: raise → approve/reject → assign → resolve |
| **SYNC 2 (end of H5)**: register → allocate → book → maintain demo path works — merge, rebase |
| H6 | Notifications + activity log APIs; dashboard KPI + overdue endpoints; seed script (`seed_demo`) | Dashboard overdue-returns section + quick actions; loading/empty/error states | Audit wizard + auditor checklist + close-cycle; transfer approval queue + return flow |
| H7 | **Deploy to HF Spaces** (Docker) + CORS for Vercel domain; smoke-test deployed API | **Deploy to Vercel** + env wiring; responsive pass on core screens | Notifications bell + activity log page; reports: dept allocation summary + booking heatmap |
| **SYNC 3 (end of H7)**: everything merged and running on the deployed stack |
| H8 | Bug bash on deployed app; fix critical issues only | Bug bash + UX polish; stage demo data via seed | Bug bash; rehearse demo script (conflict block, overlap rejection, audit close) |
| **FINAL (end of H8)**: last merge, tag `v1.0`, demo run-through on production URLs |

### Scope guard for 8 hours

- **Must-have** (the demo): auth + roles, org setup, asset registry + passport, allocation conflict + transfer, booking overlap + calendar, maintenance workflow, audit cycle + close, dashboard KPIs, notifications list.
- **Stretch — only if ahead of schedule** (each is isolated, skipping one breaks nothing): command palette, asset health score, CSV export, extra report charts (heatmap ships, the rest are bonus), booking reschedule (cancel + rebook covers the demo), QR display on asset page.
- If a module is running late at a sync point, **cut its stretch polish, not the next module's must-have**.

---

## 5. Module Build Notes (the tricky parts, decided up front)

- **Double-allocation block**: DB partial unique index `UNIQUE(asset_id) WHERE returned_at IS NULL` on `allocations`. API catches the violation and responds `409` with `{holder: "Priya Sharma", suggestion: "TRANSFER"}` → frontend renders the transfer CTA.
- **Booking overlap**: Postgres `EXCLUDE USING gist (asset_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'CONFIRMED')`. Back-to-back bookings (10:00 end / 10:00 start) are allowed because ranges are half-open `[)`. `409` response includes the computed next free slot.
- **Booking statuses** Upcoming/Ongoing/Completed are **derived from time** at read-time; only `CONFIRMED/CANCELLED` are stored. No cron needed to flip statuses.
- **Maintenance ↔ asset status**: approval sets asset to `UNDER_MAINTENANCE`; resolve returns it to `AVAILABLE` (or back to `ALLOCATED` if it had an active allocation — the passport timeline shows both events).
- **Overdue detection**: expected_return_date in the past + not returned = overdue; computed in the dashboard/notification queries (no stored "overdue" state to go stale).
- **Audit close**: closing a cycle locks its items (DB trigger rejects edits) and applies status effects: confirmed `MISSING` → asset `LOST`; `DAMAGED` → auto-creates a pre-filled maintenance request (Pending).
- **Every mutation** writes an `activity_logs` row and (where relevant) `notifications` rows in the same transaction.

---

## 6. External / Manual Tasks (require a human — the person coding STOPS and asks the team owner when these come up)

| # | Task | Needed by | When |
|---|---|---|---|
| 1 | Create Supabase project; hand over `SUPABASE_URL`, `anon key`, `service_role key`, `JWT secret`, DB connection string (pooler, port 6543) | Dev A + Dev B | H1 (first 15 min) |
| 2 | Enable Supabase email auth + configure password-reset redirect URL | Dev B | H1 |
| 3 | Create Supabase Storage buckets `asset-photos`, `maintenance-photos`, `documents` | Dev A | H3 |
| 4 | Create Hugging Face account + Docker Space; add env secrets in Space settings | Dev A | H7 |
| 5 | Create Vercel project linked to this repo (`/frontend` root); set env vars | Dev B | H7 |
| 6 | Collect image assets: logo, favicon, empty-state illustrations, ~10 sample asset photos for seed data | Dev B | H2–H3 |
| 7 | Any paid/OTP/CAPTCHA account step, custom domain decisions | whoever hits it | as needed |

Rule: an AI-assisted coding session must **pause and ask the user** for any of the above (API keys, account creation, asset collection) rather than fabricating values.

---

## 7. Future Roadmap — Groundwork Laid NOW

These are **not** built during the hackathon, but the schema and code structure already accommodate them (cheap now, expensive to retrofit):

| Future feature | Groundwork in v1 |
|---|---|
| **Multi-tenancy (SaaS)** | `organizations` table exists from day one; every table carries `org_id`. v1 seeds exactly one org and hides it from the UI. |
| **QR/barcode scanning** | `assets.asset_tag` is stable and unique; a `qr_payload` convention (`assetflow:<tag>`) is documented. Directory search already accepts tag lookup — a scanner is just an input method. |
| **Depreciation & finance hooks** | `acquisition_cost` + `acquisition_date` stored; `assets.custom_fields` JSONB can hold `salvage_value`/`useful_life_months` without migration. Explicitly **no** accounting logic in v1. |
| **Procurement module** | Asset lifecycle enum leaves room before `AVAILABLE` (a future `ON_ORDER` state slots into the transition table config, not code rewrites). |
| **Mobile app / integrations** | All endpoints under `/api/v1/`; JWT auth is client-agnostic; consistent envelope + `409`-with-payload conflict pattern documented in the api-contract. |
| **Webhooks & email/Slack alerts** | Notifications are written to a table first (outbox pattern); a future worker can fan out to channels without touching business logic. |
| **Approval chains (multi-level)** | Transfer/maintenance approvals store `decided_by` + timestamps as discrete rows/fields, ready to generalize into an `approvals` table. |
| **i18n** | All user-facing strings in the frontend go through a single `t()` helper from day one (backed by a flat JSON dict in v1). |
| **Soft-delete & data retention** | Master data uses `status ACTIVE/INACTIVE` (never hard-delete); `activity_logs` is append-only. |

---

## 8. Definition of Done (per feature)

1. DB constraint exists where a rule must be unbreakable (not just UI validation)
2. API endpoint documented in `docs/api-contract.md` with role guard
3. Screen handles loading / empty / error / forbidden states
4. Action appears in the activity log; relevant notification generated
5. Works against the deployed stack, not just localhost

---

*Companion documents:*
- *[`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — full PostgreSQL schema with constraints, triggers, and reasoning.*
- *[`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) — complete backend & frontend file trees with per-file responsibilities, plus the session-by-session working protocol (start ritual, build order, stop-and-ask triggers, hourly commit ritual, sync-point ritual).*
