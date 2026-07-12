# AssetFlow — API Contract (v1)

> **Single source of truth for every endpoint.** Owned by **Dev A**. Dev B & Dev C
> read from this file and never edit it — if something is missing or wrong, raise it
> in the group chat and Dev A updates it here.
>
> Base URL: `${NEXT_PUBLIC_API_URL}` (local dev: `http://127.0.0.1:8000`)
> All endpoints are under **`/api/v1/`**. Interactive docs (Swagger): **`/api/docs`**.

---

## 1. Auth

Every endpoint below requires a **Supabase JWT** in the header (there are no public
API endpoints — login/signup happen on the Supabase client, not here):

```
Authorization: Bearer <supabase_access_token>
```

- The backend verifies the JWT signature (HS256, Supabase JWT secret) and loads the
  matching `employees` row by `auth_uid`. **Role comes from our DB, never from the token.**
- First login auto-creates a plain `EMPLOYEE` row (no way to self-assign any other role).
- `401` if the token is missing/invalid/expired. `403` if the role isn't allowed.

**Local dev without Supabase:** the backend accepts tokens signed with the same
`SUPABASE_JWT_SECRET`. Generate one per demo user:

```
cd backend
uv run python manage.py mint_token --email admin@demo.assetflow
```

Seeded demo users (password-less locally — mint a token for each):
`admin@demo.assetflow` (ADMIN), `manager@demo.assetflow` (ASSET_MANAGER),
`priya@demo.assetflow` (DEPT_HEAD), `rohan@demo.assetflow` (DEPT_HEAD),
`sana@ / vikram@ / neha@ / karan@ demo.assetflow` (EMPLOYEE).

---

## 2. Conventions

- **IDs** are UUID strings. **Timestamps** are ISO-8601 UTC (`2026-07-12T10:00:00Z`).
- **Success**: `200` (read/update), `201` (create), body is the entity (or a list).
- **List endpoints** return a bare JSON array (not paginated in v1) unless noted.
- **Errors** share one envelope:

```jsonc
{ "detail": "human message", "code": "machine_code", /* …extra fields per case */ }
```

| Status | When | Extra fields |
|---|---|---|
| 400 | bad request / business validation | — |
| 401 | missing/invalid token | — |
| 403 | role not allowed | — |
| 404 | not found | — |
| 409 | **conflict** (see below) | varies |
| 422 | request body/query validation failed | `errors` (list) |

### The two flagship 409s (build UI around these)

**Double allocation** — `POST /allocations` when the asset is already held:
```json
{
  "detail": "Asset is currently held by Priya Sharma.",
  "code": "allocation_conflict",
  "holder": "Priya Sharma",
  "holder_id": "be0bad5c-…",
  "suggestion": "TRANSFER"
}
```
→ Render "held by Priya Sharma → **Request Transfer**" and call `POST /transfer-requests`.

**Booking overlap** — `POST /bookings` when the slot overlaps a confirmed booking:
```json
{
  "detail": "Requested time overlaps an existing booking.",
  "code": "booking_overlap",
  "suggestion": "NEXT_SLOT",
  "next_slot": { "starts_at": "2026-07-13T11:00:00+00:00", "ends_at": "2026-07-13T12:00:00+00:00" }
}
```
→ Offer the `next_slot` as one-click rebook. (Back-to-back bookings, e.g. 10–11 then
11–12, are allowed — ranges are half-open.)

Other 409 `code`s: `illegal_transition`, `conflict` (generic, e.g. already-returned,
pending-transfer-exists, open-maintenance-exists, cycle-closed).

---

## 3. Enums (mirror these in `lib/types.ts`)

| Enum | Values |
|---|---|
| `role` | `ADMIN`, `ASSET_MANAGER`, `DEPT_HEAD`, `EMPLOYEE` |
| `record_status` | `ACTIVE`, `INACTIVE` |
| `asset_status` | `AVAILABLE`, `ALLOCATED`, `RESERVED`, `UNDER_MAINTENANCE`, `LOST`, `RETIRED`, `DISPOSED` |
| `asset_condition` | `NEW`, `GOOD`, `FAIR`, `POOR`, `DAMAGED` |
| `transfer_status` | `REQUESTED`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED` |
| `booking_status` (stored) | `CONFIRMED`, `CANCELLED` |
| `booking_state` (derived) | `UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED` |
| `maint_status` | `PENDING`, `APPROVED`, `REJECTED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED` |
| `maint_priority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `audit_cycle_status` | `DRAFT`, `IN_PROGRESS`, `CLOSED` |
| `audit_result` | `PENDING`, `VERIFIED`, `MISSING`, `DAMAGED` |
| `notif_type` | `ASSET_ASSIGNED`, `ASSET_RETURNED`, `TRANSFER_REQUESTED`, `TRANSFER_APPROVED`, `TRANSFER_REJECTED`, `MAINT_APPROVED`, `MAINT_REJECTED`, `MAINT_RESOLVED`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `BOOKING_REMINDER`, `OVERDUE_RETURN`, `AUDIT_ASSIGNED`, `AUDIT_DISCREPANCY`, `ROLE_CHANGED` |

---

## 4. Endpoints

Role column = who may call it. "any" = any authenticated employee.

### 4.1 Accounts & roles

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/me` | any | Current employee + `org_id`. Drives nav + UI role gating. |
| GET | `/employees?search=&role=` | any | Directory list. |
| POST | `/employees` | ADMIN | Pre-provision a directory row (role is always EMPLOYEE). |
| GET | `/employees/{id}` | any | |
| PATCH | `/employees/{id}` | ADMIN | Body: `{full_name?, department_id?, status?}` |
| POST | `/employees/{id}/role` | ADMIN | Body: `{role}`. The ONLY way a role changes; logs + notifies. |

`EmployeeOut`:
```jsonc
{ "id","full_name","email","role","status","department_id","department_name","auth_uid","created_at" }
```
`MeOut` = `EmployeeOut` + `org_id`.

### 4.2 Organization (master data)

| Method | Path | Role | Body |
|---|---|---|---|
| GET | `/departments?status=` | any | |
| POST | `/departments` | ADMIN | `{name, code, parent_id?, head_id?}` |
| GET | `/departments/{id}` | any | |
| PATCH | `/departments/{id}` | ADMIN | `{name?, code?, parent_id?, head_id?, status?}` |
| DELETE | `/departments/{id}` | ADMIN | Soft-deactivate (409 if it still owns active assets). |
| GET | `/asset-categories?status=` | any | |
| POST | `/asset-categories` | ADMIN, ASSET_MANAGER | `{name, description?, field_schema?}` |
| GET | `/asset-categories/{id}` | any | |
| PATCH | `/asset-categories/{id}` | ADMIN, ASSET_MANAGER | `{name?, description?, field_schema?, status?}` |

`DepartmentOut`: `{id,name,code,parent_id,head_id,status,created_at,updated_at}`
`CategoryOut`: `{id,name,description,field_schema,status,created_at,updated_at}`
`field_schema` is a list of `{"key","label","type"}` defining an asset's custom fields.

### 4.3 Assets & lifecycle

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/assets?search=&status=&category=&department=&is_bookable=` | any | List/filter. `search` matches name / tag / serial. |
| POST | `/assets` | ADMIN, ASSET_MANAGER | Body `AssetIn` (below). `asset_tag` is auto-assigned (AF-0001…). |
| GET | `/assets/{id}` | any | |
| PATCH | `/assets/{id}` | ADMIN, ASSET_MANAGER | `AssetIn` fields, all optional. **`status` is NOT editable here** — it changes only via workflow actions. |
| GET | `/assets/{id}/passport` | any | Unified lifecycle timeline (the Asset Passport). |

`AssetIn`:
```jsonc
{ "name", "category_id", "serial_number?", "acquisition_date?", "acquisition_cost?",
  "condition?", "location?", "department_id?", "is_bookable?", "custom_fields?", "photo_url?" }
```
`AssetOut`: `AssetIn` fields + `{id, asset_tag, category_name, department_name, status, created_at, updated_at}`.

`GET /assets/{id}/passport` →
```jsonc
{ "asset": AssetOut,
  "timeline": [ { "at": "…", "kind": "ALLOCATED", "title": "Allocated to Priya Sharma", "detail": "…" } ] }
```
`kind` ∈ `REGISTERED, ALLOCATED, RETURNED, TRANSFER_REQUESTED, TRANSFER_COMPLETED/REJECTED, BOOKED, MAINT_RAISED, MAINT_RESOLVED, STATUS_CHANGED`. Newest first.

### 4.4 Allocation, transfer, return

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/allocations?state=` | any | `state` = `active` \| `overdue` \| `returned` (default all). |
| POST | `/allocations` | ADMIN, ASSET_MANAGER, DEPT_HEAD | Body `{asset_id, employee_id? , department_id?, expected_return_date?}` — exactly one of employee/department. **→ 409 allocation_conflict** if held. |
| POST | `/allocations/{id}/return` | ADMIN, ASSET_MANAGER, DEPT_HEAD | Body `{return_condition?, return_notes?}`. Sets asset back to AVAILABLE. |
| GET | `/transfer-requests?status=` | any | |
| POST | `/transfer-requests` | ADMIN, ASSET_MANAGER, DEPT_HEAD | Body `{asset_id, to_employee_id? , to_department_id?, reason?}`. 409 if one already pending. |
| POST | `/transfer-requests/{id}/decide` | ADMIN, ASSET_MANAGER | Body `{approve: bool, note?}`. Approve closes old allocation + opens new. |

`AllocationOut`:
```jsonc
{ "id","asset_id","asset_tag","employee_id","employee_name","department_id",
  "allocated_by_id","allocated_at","expected_return_date","returned_at","return_condition","is_overdue" }
```
`TransferOut`:
```jsonc
{ "id","asset_id","asset_tag","from_allocation_id","requested_by_id","to_employee_id",
  "to_department_id","reason","status","decided_by_id","decided_at","decision_note","created_at" }
```

### 4.5 Bookings (shared resources)

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/bookings?asset=&date_from=&date_to=&mine=` | any | |
| POST | `/bookings` | any | Body `{asset_id, starts_at, ends_at, purpose?}`. Asset must be `is_bookable`. **→ 409 booking_overlap** with `next_slot`. |
| POST | `/bookings/{id}/cancel` | any | |

`BookingOut`:
```jsonc
{ "id","asset_id","asset_tag","booked_by_id","booked_by_name","starts_at","ends_at",
  "purpose","status","state","created_at" }
```
`status` is stored (`CONFIRMED`/`CANCELLED`); **`state` is derived** (`UPCOMING`/`ONGOING`/`COMPLETED`/`CANCELLED`).

### 4.6 Maintenance workflow

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/maintenance-requests?status=&mine=` | any | |
| POST | `/maintenance-requests` | any | Body `{asset_id, title, description?, priority?, photo_url?}`. 409 if one already open. |
| GET | `/maintenance-requests/{id}` | any | |
| POST | `/maintenance-requests/{id}/approve` | ADMIN, ASSET_MANAGER | Sets asset UNDER_MAINTENANCE. |
| POST | `/maintenance-requests/{id}/reject` | ADMIN, ASSET_MANAGER | Body `{reason?}`. |
| POST | `/maintenance-requests/{id}/assign` | ADMIN, ASSET_MANAGER | Body `{technician_name}`. |
| POST | `/maintenance-requests/{id}/start` | ADMIN, ASSET_MANAGER | |
| POST | `/maintenance-requests/{id}/resolve` | ADMIN, ASSET_MANAGER | Body `{resolution_notes?}`. Asset returns to ALLOCATED (if still held) or AVAILABLE. |

Status stepper: `PENDING → APPROVED → ASSIGNED → IN_PROGRESS → RESOLVED` (or `REJECTED`).
`MaintenanceOut`: `{id, asset_id, asset_tag, raised_by_id, raised_by_name, title, description, priority, photo_url, status, approved_by_id, approved_at, rejection_reason, technician_name, assigned_at, started_at, resolved_at, resolution_notes, created_at, updated_at}`.

### 4.7 Audits

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/audit-cycles?status=` | any | |
| POST | `/audit-cycles` | ADMIN, ASSET_MANAGER | Body `{name, scope_department_id?, scope_location?, starts_on, ends_on, auditor_ids?[]}`. |
| GET | `/audit-cycles/{id}` | any | |
| GET | `/audit-cycles/{id}/items` | any | Checklist rows. |
| POST | `/audit-cycles/{id}/start` | ADMIN, ASSET_MANAGER | Snapshots in-scope assets into items; notifies auditors. |
| POST | `/audit-cycles/{id}/close` | ADMIN, ASSET_MANAGER | Locks cycle; MISSING→asset LOST, DAMAGED→auto maintenance request. |
| GET | `/audit-cycles/{id}/discrepancies` | any | Items with result MISSING/DAMAGED. |
| PATCH | `/audit-items/{id}` | ADMIN, ASSET_MANAGER, DEPT_HEAD | Body `{result?, notes?}`. 409 if the cycle is closed. |

`CycleOut`: `{id,name,scope_department_id,scope_location,starts_on,ends_on,status,created_by_id,closed_by_id,closed_at,created_at,item_count}`
`ItemOut`: `{id,cycle_id,asset_id,asset_tag,asset_name,result,notes,checked_by_id,checked_at}`

### 4.8 Notifications, activity, dashboard, reports

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/notifications?unread=` | any | Current user's notifications (latest 100). |
| POST | `/notifications/{id}/read` | any | |
| POST | `/notifications/read-all` | any | `{message}`. |
| GET | `/activity-logs?entity_type=&entity_id=` | any | Latest 200; filter to build an entity's history. |
| GET | `/dashboard/kpis` | any | Counts (see below). |
| GET | `/dashboard/overdue` | any | Overdue allocations (computed, never stored). |
| GET | `/reports/utilization` | any | Per-department total vs allocated + `utilization_pct`. |
| GET | `/reports/maintenance` | any | `{by_status, by_priority}`. |
| GET | `/reports/booking-heatmap` | any | `[{weekday(0=Mon), hour, count}]`. |

`GET /dashboard/kpis` →
```jsonc
{ "total_assets", "assets_by_status": {STATUS: n}, "available", "allocated",
  "under_maintenance", "active_allocations", "overdue_returns", "open_maintenance",
  "pending_maintenance", "upcoming_bookings" }
```
`GET /dashboard/overdue` →
```jsonc
[ { "allocation_id","asset_id","asset_tag","asset_name","holder","expected_return_date","days_overdue" } ]
```
`NotificationOut`: `{id,type,title,body,entity_type,entity_id,is_read,created_at}`
`ActivityLogOut`: `{id,actor_id,actor_name,action,entity_type,entity_id,metadata,created_at}`

---

## 5. Changelog

- **v1.0 (Dev A, H1–H2)** — auth bridge, org/accounts/assets/allocation/booking/maintenance/audits/activity
  routers live against local Postgres; both flagship 409s verified; seed + mint_token commands.
  Pending external setup (not blocking frontend): Supabase project (swap JWT secret), Storage buckets
  (photo uploads currently accept a `photo_url` string), HF Spaces + Vercel deploy.
