# AssetFlow — Project Structure & Working Protocol

Companion to [`IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md) and [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).
This document is the map: every important file, what goes in it, what it must never contain, and the
exact steps a coding session (human or AI-assisted) follows.

---

## 1. Backend Structure — `/backend` (Dev A's territory, nobody else edits here)

```
backend/
├── pyproject.toml            # uv project definition: django, django-ninja, psycopg[binary],
│                             # pyjwt, python-dotenv, gunicorn. Single source of dependencies.
├── uv.lock                   # committed — reproducible installs on HF Spaces
├── .python-version           # 3.12 — read by uv
├── .env.example              # every backend env var with a dummy value (real .env is gitignored)
├── Dockerfile                # HF Spaces Docker Space: uv sync → migrate → gunicorn on port 7860
├── manage.py                 # standard Django entrypoint
│
├── config/                   # project wiring — touched in H1, then rarely
│   ├── settings.py           # env-driven settings: Supabase pooler DB (port 6543), CORS
│   │                         # allowlist (Vercel URL + localhost:3000), installed apps
│   ├── api.py                # THE NinjaAPI instance: mounts every app router under /api/v1/,
│   │                         # registers global exception handlers (409 conflict envelope,
│   │                         # 403 role-denied, validation errors)
│   ├── urls.py               # routes /api/ → config.api, /admin/ → Django admin
│   └── wsgi.py               # gunicorn target
│
├── core/                     # cross-cutting code every app imports — NO business logic here
│   ├── auth.py               # SupabaseAuth(HttpBearer): verifies real Supabase JWTs
│   │                         # via JWKS (ES256/RS256) and local dev tokens via HS256,
│   │                         # links onboarding signup tickets to auth_uid, loads
│   │                         # request.employee, and blocks non-approved users from
│   │                         # company data except /me + pending-approval state.
│   ├── permissions.py        # require_role("ADMIN", "ASSET_MANAGER") decorator + role
│   │                         # constants. All role checks flow through this one file.
│   ├── schemas.py            # shared Ninja schemas: PaginatedOut, MessageOut, ConflictOut
│   │                         # (the 409 body: {detail, holder, suggestion})
│   ├── exceptions.py         # domain exceptions (AllocationConflict, BookingOverlap,
│   │                         # IllegalTransition) mapped to HTTP codes in config/api.py
│   └── services/
│       ├── activity.py       # log_activity(actor, action, entity, meta) — called inside the
│       │                     # same transaction as every mutation
│       └── notify.py         # notify(recipient, type, title, entity) — writes notifications
│                             # rows (outbox pattern; future email/Slack worker reads these)
│
├── db/
│   └── schema.sql            # constraints/triggers Django can't express (exclusion constraint,
│                             # partial unique indexes, state-machine trigger). Applied via a
│                             # migrations.RunSQL migration in apps/assets. Mirrors
│                             # docs/DATABASE_SCHEMA.md — if they disagree, the doc wins.
│
└── apps/                     # one Django app per domain. IDENTICAL internal layout everywhere:
    │                         #   models.py   → ORM models (PascalCase singular, mirror schema doc)
    │                         #   schemas.py  → Ninja I/O: <Model>In / <Model>Out / <Model>Filter
    │                         #   api.py      → Router() with the endpoints, thin — validates,
    │                         #                 calls services, serializes
    │                         #   services.py → ALL business rules & transactions live here
    │                         #   admin.py    → Django admin registration
    │                         #   migrations/
    │
    ├── accounts/             # Employee model, auth bridge, access approval, role management
    │   ├── models.py         #   Employee (auth_uid, role, requested_role, access_status,
    │   │                     #   department, status)
    │   ├── api.py            #   GET /me · GET/PATCH /employees · POST /employees/{id}/role
    │   │                     #   GET/approve/reject /join-requests
    │   └── services.py       #   approve/reject join requests, promote/demote (Admin only,
    │                         #   logs ROLE_CHANGED + notifies)
    │
    ├── organization/         # workspace + master data
    │   ├── models.py         #   Organization, RoleJoinCode, SignupRequest,
    │   │                     #   Department (parent, head), AssetCategory (field_schema JSONB)
    │   ├── api.py            #   public onboarding endpoints, join-code rotation,
    │   │                     #   CRUD /departments · CRUD /asset-categories
    │   └── services.py       #   create company, validate role code, hash/rotate codes,
    │                         #   deactivation guards (can't deactivate a dept holding assets)
    │
    ├── assets/               # registry + lifecycle
    │   ├── models.py         #   Asset, AssetDocument
    │   ├── api.py            #   CRUD /assets · GET /assets?search=&status=&category=…
    │   │                     #   GET /assets/{id}/passport (unified timeline)
    │   └── services.py       #   transition(asset, new_status) — THE only function that
    │                         #   changes asset.status; every other app calls it
    │
    ├── allocation/           # who holds what
    │   ├── models.py         #   Allocation, TransferRequest
    │   ├── api.py            #   POST /allocations · POST /allocations/{id}/return ·
    │   │                     #   CRUD /transfer-requests · POST /transfer-requests/{id}/decide
    │   └── services.py       #   allocate() catches the unique-index violation → raises
    │                         #   AllocationConflict with current holder's name;
    │                         #   approve_transfer() closes old allocation + opens new one
    │
    ├── booking/              # shared resources
    │   ├── models.py         #   Booking
    │   ├── api.py            #   GET /bookings?asset=&from=&to= · POST /bookings ·
    │   │                     #   POST /bookings/{id}/cancel
    │   └── services.py       #   create_booking() catches exclusion-constraint violation →
    │                         #   BookingOverlap + computes next free slot of same duration
    │
    ├── maintenance/          # approval workflow
    │   ├── models.py         #   MaintenanceRequest
    │   ├── api.py            #   POST /maintenance-requests · POST …/{id}/approve|reject|
    │   │                     #   assign|start|resolve
    │   └── services.py       #   each step validates current status, calls assets.transition(),
    │                         #   logs + notifies
    │
    ├── audits/               # verification cycles
    │   ├── models.py         #   AuditCycle, AuditAssignment, AuditItem
    │   ├── api.py            #   CRUD /audit-cycles · POST …/{id}/start|close ·
    │   │                     #   PATCH /audit-items/{id} · GET …/{id}/discrepancies
    │   └── services.py       #   start: snapshot in-scope assets into audit_items;
    │                         #   close: lock cycle, MISSING→LOST, DAMAGED→auto maintenance req
    │
    └── activity/             # read side of logs/notifications + dashboards
        ├── models.py         #   Notification, ActivityLog
        ├── api.py            #   GET /notifications · POST /notifications/{id}/read ·
        │                     #   GET /activity-logs · GET /dashboard/kpis ·
        │                     #   GET /reports/utilization|maintenance|booking-heatmap
        └── services.py       #   KPI aggregation queries, overdue detection (computed, not stored)
```

**Backend iron rules**
1. `api.py` files stay thin; anything with an `if` about business state belongs in `services.py`.
2. Only `apps/assets/services.py:transition()` mutates `asset.status`. Grep-able guarantee.
3. Every service mutation calls `log_activity()` and (where a person is affected) `notify()` in the same transaction.
4. Ninja schemas never share a name with a model (`AssetIn`/`AssetOut`, never `Asset`).
5. Onboarding must validate role codes before Supabase signup sends email. Invalid role code means no Supabase call.
6. Business routers must reject `access_status != ACTIVE`; `/me` and pending-approval reads are the only exceptions.

### Backend onboarding responsibilities

Dev A owns the backend flow end to end:

1. `POST /onboarding/workspaces` creates `Organization`, first `Employee(role=ADMIN, access_status=ACTIVE)`,
   role join codes, and a single-use signup ticket in one transaction.
2. `POST /onboarding/join/validate-code` verifies selected role + role code, creates `SignupRequest`,
   creates/links a pending employee row, and returns a single-use signup ticket.
3. `core/auth.py` reads the Supabase token metadata on first login, verifies the signup ticket, links `auth_uid`,
   and returns `/me`.
4. Pending users get `/me` only. They must not receive asset/org data until Admin approval.
5. Admin endpoints rotate role codes and approve/reject join requests. Every decision writes activity log rows
   and notifies the affected user.

---

## 2. Frontend Structure — `/frontend` (Dev B owns shell + `lib/` + `shared/`; Dev C owns his route folders)

```
frontend/
├── package.json              # next, react, @supabase/supabase-js, @tanstack/react-query,
│                             # tailwindcss, shadcn deps, recharts, date-fns, lucide-react.
│                             # New deps announced in group chat BEFORE committing.
├── next.config.ts            # image domains (Supabase storage), env passthrough
├── tailwind.config.ts        # theme tokens (brand colors, status palette)
├── tsconfig.json             # "@/*" path alias → src/*
├── components.json           # shadcn/ui config
├── .env.example              # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
│                             # NEXT_PUBLIC_API_URL (the HF Space URL)
│
└── src/
    ├── middleware.ts         # redirects unauthenticated users → /login (checks Supabase cookie)
    │
    ├── app/
    │   ├── layout.tsx        # root: fonts, QueryClientProvider, Toaster
    │   ├── globals.css       # tailwind base + status-color CSS vars
    │   ├── page.tsx          # / → redirect to /dashboard or /login
    │   │
    │   ├── (auth)/           # ── Dev B ── public, minimal centered-card layout
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx           # email+password via lib/supabase.ts
    │   │   ├── signup/page.tsx          # choice screen: Create Company vs Join Company
    │   │   ├── create-company/page.tsx  # creates organization + first Admin signup ticket,
    │   │   │                           # then calls Supabase signup
    │   │   ├── join-company/page.tsx    # requested role + role code; validates backend
    │   │   │                           # BEFORE Supabase signup sends an email
    │   │   ├── pending-approval/page.tsx # shown after login while access_status is pending
    │   │   └── forgot-password/page.tsx # Supabase resetPasswordForEmail
    │   │
    │   └── (app)/            # authenticated shell — layout.tsx renders AppSidebar + Topbar
    │       ├── layout.tsx               # ── Dev B ── the shell; role-aware nav items
    │       │
    │       ├── dashboard/page.tsx       # ── Dev B ── KPI cards, overdue list, quick actions
    │       │
    │       ├── organization/            # ── Dev B ── Admin only (guarded by role from /me)
    │       │   ├── page.tsx             # tab switcher
    │       │   └── _components/         # DepartmentsTab, CategoriesTab, DirectoryTab,
    │       │                            # JoinCodesPanel, JoinRequestsQueue,
    │       │                            # PromoteRoleDialog (manual Admin override only)
    │       │
    │       ├── assets/                  # ── Dev B ──
    │       │   ├── page.tsx             # directory: DataTable + search/filter bar
    │       │   ├── new/page.tsx         # registration form (dynamic fields from category
    │       │   │                        # field_schema, photo upload → Supabase storage)
    │       │   ├── [id]/page.tsx        # Asset Passport: header card + unified timeline
    │       │   └── _components/         # AssetForm, PassportTimeline, LifecycleBadge
    │       │
    │       ├── allocations/             # ── Dev C ──
    │       │   ├── page.tsx             # active/overdue/returned tabs + "Allocate" button
    │       │   └── _components/         # AllocateDialog, ConflictModal ("held by Priya" +
    │       │                            # Request Transfer CTA), ReturnDialog (condition
    │       │                            # check-in), TransferQueue (approve/reject)
    │       │
    │       ├── bookings/                # ── Dev C ──
    │       │   ├── page.tsx             # resource picker + calendar
    │       │   └── _components/         # BookingCalendar (week grid), SlotPicker,
    │       │                            # OverlapNotice (shows API's suggested next slot),
    │       │                            # MyBookingsList (upcoming/ongoing/completed/cancelled)
    │       │
    │       ├── maintenance/             # ── Dev C ──
    │       │   ├── page.tsx             # my requests + approval queue (role-dependent tabs)
    │       │   └── _components/         # RaiseRequestDialog, ApprovalCard, StatusStepper
    │       │                            # (Pending→Approved→Assigned→In Progress→Resolved)
    │       │
    │       ├── audits/                  # ── Dev C ──
    │       │   ├── page.tsx             # cycle list + "New Cycle" wizard
    │       │   ├── [id]/page.tsx        # auditor checklist (Verified/Missing/Damaged per
    │       │   │                        # asset) + discrepancy report + Close Cycle button
    │       │   └── _components/         # CycleWizard, ChecklistRow, DiscrepancyReport
    │       │
    │       ├── reports/page.tsx         # ── Dev C ── recharts: dept allocation summary,
    │       │                            # booking heatmap; CSV export (stretch)
    │       │
    │       └── activity/page.tsx        # ── Dev C ── notifications list + full activity log
    │
    ├── components/
    │   ├── ui/               # shadcn-generated primitives (button, dialog, table…) — never
    │   │                     # hand-edited, only regenerated
    │   └── shared/           # ── Dev B owns; Dev C imports, NEVER adds files here ──
    │       ├── AppSidebar.tsx        # role-aware navigation
    │       ├── Topbar.tsx            # breadcrumb + NotificationBell + user menu
    │       ├── NotificationBell.tsx  # unread count polling + dropdown
    │       ├── DataTable.tsx         # generic sortable/paginated table (used by every list)
    │       ├── StatusBadge.tsx       # ONE component renders every status color (asset,
    │       │                         # booking, maintenance, transfer, audit) from constants
    │       ├── ConfirmDialog.tsx     # destructive-action confirmation
    │       ├── EmptyState.tsx        # illustration + CTA for empty lists
    │       └── PageHeader.tsx        # title + description + action-button slot
    │
    ├── lib/                  # ── Dev B owns; the contract layer ──
    │   ├── supabase.ts       # createBrowserClient — the ONLY place supabase-js is initialized
    │   ├── api.ts            # fetch wrapper: baseURL from env, attaches Supabase JWT,
    │   │                     # unwraps envelope, throws typed ApiError (409 → ConflictError
    │   │                     # carrying {holder, suggestion} for the conflict modal)
    │   ├── types.ts          # TS mirror of docs/api-contract.md — enums + entity types,
    │   │                     # including EmployeeAccessStatus, SignupRequest, JoinCode.
    │   │                     # Screens import from here, NEVER redefine locally.
    │   ├── constants.ts      # status→color/label maps, nav config, role constants
    │   └── utils.ts          # cn(), date formatting, tag formatting
    │
    └── hooks/                # ── Dev B owns; shared TanStack Query hooks ──
        ├── useMe.ts          # current employee + role + access_status (drives nav,
        │                     # guards, and pending-approval redirect)
        ├── useApiQuery.ts    # thin typed wrappers over useQuery/useMutation + toast-on-error
        └── (screen-specific hooks live in that screen's _components/, not here)
```

**Frontend iron rules**
1. No component calls `fetch` or supabase directly — everything goes through `lib/api.ts` / `lib/supabase.ts`.
2. Types come from `lib/types.ts` only. If a type is missing, message Dev B; don't redeclare it.
3. Screen-local components live in that screen's `_components/` folder (underscore = not a route).
4. Every list screen ships loading, empty, and error states (use `EmptyState`, skeletons from `ui/`).
5. Role gating in UI is convenience only — the backend decorator is the real guard.
6. Join Company must call backend code validation before Supabase signup. If validation fails, do not call Supabase.
7. If `/me.access_status` is `PENDING_APPROVAL`, redirect to `/pending-approval` and hide all app data.

### Frontend onboarding responsibilities

Dev B owns the frontend flow:

1. `/signup` becomes a choice page with two clear actions: Create Company and Join Company.
2. `/create-company` collects company/admin details, calls `/onboarding/workspaces`, then calls Supabase signup
   with the returned signup ticket.
3. `/join-company` collects full name, email, requested role, and role code. It calls
   `/onboarding/join/validate-code` first. Only on success does it call Supabase signup.
4. `/pending-approval` is the only app-like screen pending users can see after login. It explains that the Admin
   must approve access and offers sign-out.
5. Organization gains Join Codes and Join Requests panels for Admin:
   - Copy/regenerate codes for Employee, Department Head, Asset Manager.
   - Approve/reject pending users.
   - Show audit trail / decision note when available.

---

## 3. Working Protocol — exact steps for every coding session (human or AI-assisted)

### A. Session start (every time, ~2 min)
1. `git checkout <your-branch>` → `git pull --rebase origin main` — never start on a stale base.
2. Re-read your current hour's row in the plan's checkpoint table; open `docs/api-contract.md`
   (and `docs/DATABASE_SCHEMA.md` if touching data).
3. Confirm you are about to create/edit files **only inside your lane's folders** (see ownership
   markers above). If the task needs a file outside your lane → message the owner, don't edit.

### B. Build order inside any feature (same rhythm every time)
1. **Dev A**: model → migration → schema (`In`/`Out`) → service (rules + `log_activity` +
   `notify`) → router endpoint → register in `config/api.py` → **update `docs/api-contract.md`
   in the same commit** → quick test via `/api/v1/docs` (Ninja's built-in Swagger).
2. **Dev B / Dev C**: check the endpoint exists in `docs/api-contract.md` (if not, ping Dev A and
   build against mock data in the meantime — don't invent a contract) → add missing types to
   `lib/types.ts` (Dev B) or request them (Dev C) → build `_components/` → wire with hooks →
   verify loading/empty/error/forbidden states.

### C. Stop-and-ask triggers (an AI-assisted session MUST pause and ask the team member)
- Any credential, API key, connection string, or JWT secret it doesn't have → **ask, never fabricate or hardcode a placeholder that looks real**.
- Account creation (Supabase, Vercel, Hugging Face), email/OTP verification, CAPTCHA, billing.
- Choosing/collecting brand assets: logo, images, seed-data photos.
- Anything that would edit files outside the session's lane, add a dependency, or change
  `docs/api-contract.md` from a frontend session.
- A destructive operation (dropping tables, force-push, deleting migrations).

### D. Hourly commit ritual (from the plan — repeated here because it's the whole game)
1. Get the app to a state that runs (a working slice, not a broken heap).
2. `git add <your files>` → `git commit -m "<short, specific, in your own words>"`.
3. `git pull --rebase origin main` → resolve (rare, given lane ownership) → `git push origin <your-branch>`.
4. Post one line in the group chat: what landed + anything a teammate is waiting on.

### E. Sync-point ritual (H2, H5, H7)
1. Merge order **A → B → C** into `main` (backend lands first so frontend merges compile).
2. Each person: `git checkout main && git pull`, run the app once, confirm the sync goal
   (e.g. SYNC 1 = create company -> first Admin, join code -> pending user, Admin approval -> app access).
3. Everyone back on their branch: `git rebase main`. Nobody codes on a pre-sync base.

### F. Definition of done per feature (checklist before you call it finished)
- [ ] DB constraint exists where the rule must be unbreakable
- [ ] Endpoint in `docs/api-contract.md` with its role guard noted
- [ ] Screen handles loading / empty / error / forbidden
- [ ] Mutation shows up in the activity log; notification generated where relevant
- [ ] Runs against the deployed stack (after H7), not just localhost
