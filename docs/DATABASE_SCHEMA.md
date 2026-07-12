# AssetFlow — Database Schema (PostgreSQL / Supabase)

Canonical schema. Django models mirror these tables; the constraints and triggers Django's ORM
cannot express (exclusion constraints, partial unique indexes, state-machine trigger) are applied
via a `RunSQL` migration from `backend/db/schema.sql`, which is generated from this document.

Design rules applied everywhere:

- **UUID primary keys** (`gen_random_uuid()`) — safe to expose in URLs, no enumeration attacks.
- **`org_id` on every business table** — multi-tenancy groundwork; v1 seeds one organization.
- **Business rules enforced in the database**, not only the API: double-allocation, booking
  overlap, lifecycle transitions, role storage.
- **Workspace onboarding is self-serve but guarded**: first company creator becomes Admin for
  that new organization; all other role signups require a matching role join code plus Admin
  approval before company data is visible.
- **No hard deletes** for master data (`ACTIVE/INACTIVE` status); `activity_logs` is append-only.
- **Derived states are never stored** (Overdue, Ongoing booking) — computed at read time, so they
  can never go stale.
- All timestamps are `timestamptz` (UTC).

---

## Entity Relationship Overview

```
organizations 1─* departments 1─* employees
organizations 1─* role_join_codes
organizations 1─* signup_requests
departments  1─* departments (parent hierarchy)
employees    1─1 supabase auth.users (auth_uid)
signup_requests 0─1 employees (after Supabase email verification / first login)
asset_categories 1─* assets
assets 1─* allocations ─* transfer_requests
assets 1─* bookings
assets 1─* maintenance_requests
audit_cycles 1─* audit_assignments (auditors)
audit_cycles 1─* audit_items *─1 assets
employees 1─* notifications
employees 1─* activity_logs
```

---

## Full DDL

```sql
-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- exclusion constraint on (asset_id, timerange)
CREATE EXTENSION IF NOT EXISTS citext;       -- case-insensitive emails

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE user_role         AS ENUM ('ADMIN','ASSET_MANAGER','DEPT_HEAD','EMPLOYEE');
CREATE TYPE join_code_role    AS ENUM ('ASSET_MANAGER','DEPT_HEAD','EMPLOYEE');
CREATE TYPE employee_access_status AS ENUM ('PENDING_APPROVAL','ACTIVE','REJECTED','SUSPENDED');
CREATE TYPE signup_request_status AS ENUM ('PENDING_EMAIL_VERIFICATION','PENDING_APPROVAL',
                                           'APPROVED','REJECTED','EXPIRED');
CREATE TYPE record_status     AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE asset_status      AS ENUM ('AVAILABLE','ALLOCATED','RESERVED','UNDER_MAINTENANCE',
                                       'LOST','RETIRED','DISPOSED');
CREATE TYPE asset_condition   AS ENUM ('NEW','GOOD','FAIR','POOR','DAMAGED');
CREATE TYPE transfer_status   AS ENUM ('REQUESTED','APPROVED','REJECTED','CANCELLED','COMPLETED');
CREATE TYPE booking_status    AS ENUM ('CONFIRMED','CANCELLED');          -- Upcoming/Ongoing/Completed derived from time
CREATE TYPE maint_status      AS ENUM ('PENDING','APPROVED','REJECTED','ASSIGNED',
                                       'IN_PROGRESS','RESOLVED','CANCELLED');
CREATE TYPE maint_priority    AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE audit_cycle_status AS ENUM ('DRAFT','IN_PROGRESS','CLOSED');
CREATE TYPE audit_result      AS ENUM ('PENDING','VERIFIED','MISSING','DAMAGED');
CREATE TYPE notif_type        AS ENUM ('ASSET_ASSIGNED','ASSET_RETURNED','TRANSFER_REQUESTED',
                                       'TRANSFER_APPROVED','TRANSFER_REJECTED',
                                       'MAINT_APPROVED','MAINT_REJECTED','MAINT_RESOLVED',
                                       'BOOKING_CONFIRMED','BOOKING_CANCELLED','BOOKING_REMINDER',
                                       'OVERDUE_RETURN','AUDIT_ASSIGNED','AUDIT_DISCREPANCY',
                                       'ROLE_CHANGED');

-- ============================================================
-- Tenancy root (future multi-tenant SaaS; v1 seeds exactly one row)
-- ============================================================
CREATE TABLE organizations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    slug        text UNIQUE,                         -- public workspace handle, optional in v1 UI
    status      record_status NOT NULL DEFAULT 'ACTIVE',
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Departments (hierarchy via parent_id; head FK added after employees)
-- ============================================================
CREATE TABLE departments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid NOT NULL REFERENCES organizations(id),
    name        text NOT NULL,
    code        text NOT NULL,                       -- short code e.g. "ENG"
    parent_id   uuid REFERENCES departments(id),
    head_id     uuid,                                -- FK → employees, added below
    status      record_status NOT NULL DEFAULT 'ACTIVE',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dept_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT dept_name_unique UNIQUE (org_id, name),
    CONSTRAINT dept_code_unique UNIQUE (org_id, code)
);

-- ============================================================
-- Employees (bridge to Supabase Auth; ROLES LIVE HERE, never in JWT claims)
-- `access_status` gates company data. Pending join-code users can authenticate
-- but cannot access ERP data until Admin approval.
-- ============================================================
CREATE TABLE employees (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        uuid NOT NULL REFERENCES organizations(id),
    auth_uid      uuid UNIQUE,                       -- supabase auth.users.id; NULL until first login link
    full_name     text NOT NULL,
    email         citext NOT NULL,
    department_id uuid REFERENCES departments(id),
    role          user_role NOT NULL DEFAULT 'EMPLOYEE',   -- granted role after approval
    requested_role user_role,                              -- requested through join code
    access_status employee_access_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    status        record_status NOT NULL DEFAULT 'ACTIVE',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT emp_email_unique UNIQUE (org_id, email)
);

ALTER TABLE departments
    ADD CONSTRAINT dept_head_fk FOREIGN KEY (head_id) REFERENCES employees(id);

-- ============================================================
-- Workspace onboarding / role join codes
-- ============================================================
-- Admins see one join code per role in the UI. The plaintext code is shown
-- only immediately after creation/rotation; the database stores only a hash.
CREATE TABLE role_join_codes (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         uuid NOT NULL REFERENCES organizations(id),
    role           join_code_role NOT NULL,
    code_hash      text NOT NULL UNIQUE,
    status         record_status NOT NULL DEFAULT 'ACTIVE',
    created_by     uuid REFERENCES employees(id),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    last_rotated_at timestamptz NOT NULL DEFAULT now(),
    expires_at     timestamptz
);

CREATE UNIQUE INDEX uniq_active_role_join_code
    ON role_join_codes (org_id, role) WHERE status = 'ACTIVE';

CREATE INDEX idx_role_join_codes_lookup
    ON role_join_codes (role, status);

-- A signup request is created before Supabase sends an email. The frontend gets
-- a single-use signup_ticket and passes it to Supabase user_metadata. On first
-- verified login the auth bridge links auth_uid and moves the request forward.
CREATE TABLE signup_requests (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         uuid NOT NULL REFERENCES organizations(id),
    role_code_id   uuid REFERENCES role_join_codes(id),
    employee_id    uuid REFERENCES employees(id),
    signup_ticket_hash text NOT NULL UNIQUE,
    full_name      text NOT NULL,
    email          citext NOT NULL,
    requested_role user_role NOT NULL,
    status         signup_request_status NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION',
    decided_by     uuid REFERENCES employees(id),
    decided_at     timestamptz,
    decision_note  text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    expires_at     timestamptz,
    CONSTRAINT signup_role_code_required CHECK (
        (requested_role = 'ADMIN' AND role_code_id IS NULL)
        OR (requested_role <> 'ADMIN' AND role_code_id IS NOT NULL)
    )
);

CREATE INDEX idx_signup_requests_org_status
    ON signup_requests (org_id, status, created_at DESC);

-- ============================================================
-- Asset categories (custom-field definitions as JSONB schema)
-- ============================================================
CREATE TABLE asset_categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid NOT NULL REFERENCES organizations(id),
    name        text NOT NULL,
    description text,
    field_schema jsonb NOT NULL DEFAULT '[]',
      -- e.g. [{"key":"warranty_months","label":"Warranty (months)","type":"number"}]
    status      record_status NOT NULL DEFAULT 'ACTIVE',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT cat_name_unique UNIQUE (org_id, name)
);

-- ============================================================
-- Assets
-- ============================================================
CREATE SEQUENCE asset_tag_seq START 1;

CREATE TABLE assets (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           uuid NOT NULL REFERENCES organizations(id),
    asset_tag        text NOT NULL,                  -- AF-0001, set by trigger
    name             text NOT NULL,
    category_id      uuid NOT NULL REFERENCES asset_categories(id),
    serial_number    text,
    acquisition_date date,
    acquisition_cost numeric(12,2) CHECK (acquisition_cost IS NULL OR acquisition_cost >= 0),
    condition        asset_condition NOT NULL DEFAULT 'GOOD',
    status           asset_status NOT NULL DEFAULT 'AVAILABLE',
    location         text,
    department_id    uuid REFERENCES departments(id),   -- home/owning department
    is_bookable      boolean NOT NULL DEFAULT false,    -- shared resource flag
    custom_fields    jsonb NOT NULL DEFAULT '{}',       -- values for category field_schema
    photo_url        text,
    created_by       uuid REFERENCES employees(id),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT asset_tag_unique   UNIQUE (org_id, asset_tag),
    CONSTRAINT asset_serial_unique UNIQUE (org_id, serial_number)
);

CREATE INDEX idx_assets_status   ON assets (org_id, status);
CREATE INDEX idx_assets_category ON assets (org_id, category_id);
CREATE INDEX idx_assets_dept     ON assets (org_id, department_id);

-- Auto asset tag: AF-0001, AF-0002 ...
CREATE OR REPLACE FUNCTION set_asset_tag() RETURNS trigger AS $$
BEGIN
    IF NEW.asset_tag IS NULL OR NEW.asset_tag = '' THEN
        NEW.asset_tag := 'AF-' || lpad(nextval('asset_tag_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asset_tag BEFORE INSERT ON assets
    FOR EACH ROW EXECUTE FUNCTION set_asset_tag();

-- ------------------------------------------------------------
-- LIFECYCLE STATE MACHINE — illegal transitions rejected in-DB
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_asset_transition() RETURNS trigger AS $$
DECLARE
    allowed boolean;
BEGIN
    IF OLD.status = NEW.status THEN RETURN NEW; END IF;
    allowed := CASE OLD.status
        WHEN 'AVAILABLE'         THEN NEW.status IN ('ALLOCATED','RESERVED','UNDER_MAINTENANCE','LOST','RETIRED')
        WHEN 'ALLOCATED'         THEN NEW.status IN ('AVAILABLE','UNDER_MAINTENANCE','LOST')
        WHEN 'RESERVED'          THEN NEW.status IN ('AVAILABLE','ALLOCATED')
        WHEN 'UNDER_MAINTENANCE' THEN NEW.status IN ('AVAILABLE','ALLOCATED','RETIRED','DISPOSED')
        WHEN 'LOST'              THEN NEW.status IN ('AVAILABLE','DISPOSED')   -- found again / written off
        WHEN 'RETIRED'           THEN NEW.status IN ('DISPOSED')
        WHEN 'DISPOSED'          THEN false                                    -- terminal
    END;
    IF NOT allowed THEN
        RAISE EXCEPTION 'Illegal asset lifecycle transition: % -> %', OLD.status, NEW.status
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asset_transition BEFORE UPDATE OF status ON assets
    FOR EACH ROW EXECUTE FUNCTION guard_asset_transition();

-- Extra documents/photos per asset
CREATE TABLE asset_documents (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id   uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    file_url   text NOT NULL,
    label      text,
    uploaded_by uuid REFERENCES employees(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Allocations — THE double-allocation guard
-- ============================================================
CREATE TABLE allocations (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id               uuid NOT NULL REFERENCES organizations(id),
    asset_id             uuid NOT NULL REFERENCES assets(id),
    employee_id          uuid REFERENCES employees(id),
    department_id        uuid REFERENCES departments(id),
    allocated_by         uuid NOT NULL REFERENCES employees(id),
    allocated_at         timestamptz NOT NULL DEFAULT now(),
    expected_return_date date,
    returned_at          timestamptz,
    return_condition     asset_condition,
    return_notes         text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    -- allocated to an employee XOR a department, never both/neither
    CONSTRAINT alloc_target CHECK (num_nonnulls(employee_id, department_id) = 1),
    CONSTRAINT alloc_return_after CHECK (returned_at IS NULL OR returned_at >= allocated_at)
);

-- An asset can have AT MOST ONE open allocation. This is the conflict rule,
-- unbreakable even by raw SQL. API maps violation → 409 + "held by <name>" + Transfer CTA.
CREATE UNIQUE INDEX uniq_open_allocation
    ON allocations (asset_id) WHERE returned_at IS NULL;

CREATE INDEX idx_alloc_overdue
    ON allocations (expected_return_date)
    WHERE returned_at IS NULL AND expected_return_date IS NOT NULL;

-- ============================================================
-- Transfer requests
-- ============================================================
CREATE TABLE transfer_requests (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id             uuid NOT NULL REFERENCES organizations(id),
    asset_id           uuid NOT NULL REFERENCES assets(id),
    from_allocation_id uuid NOT NULL REFERENCES allocations(id),
    requested_by       uuid NOT NULL REFERENCES employees(id),
    to_employee_id     uuid REFERENCES employees(id),
    to_department_id   uuid REFERENCES departments(id),
    reason             text,
    status             transfer_status NOT NULL DEFAULT 'REQUESTED',
    decided_by         uuid REFERENCES employees(id),
    decided_at         timestamptz,
    decision_note      text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT transfer_target CHECK (num_nonnulls(to_employee_id, to_department_id) = 1)
);

-- Only one pending transfer per asset at a time
CREATE UNIQUE INDEX uniq_pending_transfer
    ON transfer_requests (asset_id) WHERE status = 'REQUESTED';

-- ============================================================
-- Bookings — THE overlap guard
-- ============================================================
CREATE TABLE bookings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid NOT NULL REFERENCES organizations(id),
    asset_id    uuid NOT NULL REFERENCES assets(id),   -- must be is_bookable (trigger below)
    booked_by   uuid NOT NULL REFERENCES employees(id),
    starts_at   timestamptz NOT NULL,
    ends_at     timestamptz NOT NULL,
    purpose     text,
    status      booking_status NOT NULL DEFAULT 'CONFIRMED',
    cancelled_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT booking_time_valid CHECK (ends_at > starts_at),
    -- Half-open range [starts, ends): 9–10 and 10–11 coexist; 9–10 and 9:30–10:30 cannot.
    CONSTRAINT booking_no_overlap EXCLUDE USING gist (
        asset_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
    ) WHERE (status = 'CONFIRMED')
);

CREATE INDEX idx_bookings_time ON bookings (asset_id, starts_at);

CREATE OR REPLACE FUNCTION guard_bookable() RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM assets a
                   WHERE a.id = NEW.asset_id AND a.is_bookable
                     AND a.status NOT IN ('LOST','RETIRED','DISPOSED')) THEN
        RAISE EXCEPTION 'Asset is not a bookable shared resource'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookable BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION guard_bookable();

-- ============================================================
-- Maintenance requests (approval workflow)
-- ============================================================
CREATE TABLE maintenance_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          uuid NOT NULL REFERENCES organizations(id),
    asset_id        uuid NOT NULL REFERENCES assets(id),
    raised_by       uuid NOT NULL REFERENCES employees(id),
    title           text NOT NULL,
    description     text,
    priority        maint_priority NOT NULL DEFAULT 'MEDIUM',
    photo_url       text,
    status          maint_status NOT NULL DEFAULT 'PENDING',
    approved_by     uuid REFERENCES employees(id),
    approved_at     timestamptz,
    rejection_reason text,
    technician_name text,                              -- external tech (v1); FK-able later
    assigned_at     timestamptz,
    started_at      timestamptz,
    resolved_at     timestamptz,
    resolution_notes text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- One open maintenance request per asset
CREATE UNIQUE INDEX uniq_open_maintenance
    ON maintenance_requests (asset_id)
    WHERE status IN ('PENDING','APPROVED','ASSIGNED','IN_PROGRESS');

CREATE INDEX idx_maint_status ON maintenance_requests (org_id, status);

-- ============================================================
-- Audit cycles
-- ============================================================
CREATE TABLE audit_cycles (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              uuid NOT NULL REFERENCES organizations(id),
    name                text NOT NULL,
    scope_department_id uuid REFERENCES departments(id),  -- NULL = whole org
    scope_location      text,
    starts_on           date NOT NULL,
    ends_on             date NOT NULL,
    status              audit_cycle_status NOT NULL DEFAULT 'DRAFT',
    created_by          uuid NOT NULL REFERENCES employees(id),
    closed_by           uuid REFERENCES employees(id),
    closed_at           timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_dates CHECK (ends_on >= starts_on)
);

CREATE TABLE audit_assignments (
    cycle_id   uuid NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
    auditor_id uuid NOT NULL REFERENCES employees(id),
    PRIMARY KEY (cycle_id, auditor_id)
);

CREATE TABLE audit_items (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id   uuid NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
    asset_id   uuid NOT NULL REFERENCES assets(id),
    result     audit_result NOT NULL DEFAULT 'PENDING',
    notes      text,
    checked_by uuid REFERENCES employees(id),
    checked_at timestamptz,
    CONSTRAINT audit_item_unique UNIQUE (cycle_id, asset_id)
);

-- Closed cycles are immutable
CREATE OR REPLACE FUNCTION guard_closed_cycle() RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM audit_cycles c
               WHERE c.id = COALESCE(NEW.cycle_id, OLD.cycle_id) AND c.status = 'CLOSED') THEN
        RAISE EXCEPTION 'Audit cycle is closed and locked' USING ERRCODE = 'check_violation';
    END IF;
    RETURN COALESCE(NEW, OLD);
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_item_lock BEFORE INSERT OR UPDATE OR DELETE ON audit_items
    FOR EACH ROW EXECUTE FUNCTION guard_closed_cycle();

-- ============================================================
-- Notifications (outbox pattern — future email/Slack fan-out reads this table)
-- ============================================================
CREATE TABLE notifications (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       uuid NOT NULL REFERENCES organizations(id),
    recipient_id uuid NOT NULL REFERENCES employees(id),
    type         notif_type NOT NULL,
    title        text NOT NULL,
    body         text,
    entity_type  text,          -- 'asset' | 'booking' | 'maintenance' | 'transfer' | 'audit'
    entity_id    uuid,
    is_read      boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_unread ON notifications (recipient_id, created_at DESC) WHERE NOT is_read;

-- ============================================================
-- Activity log (append-only)
-- ============================================================
CREATE TABLE activity_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid NOT NULL REFERENCES organizations(id),
    actor_id    uuid REFERENCES employees(id),        -- NULL = system action
    action      text NOT NULL,                        -- 'asset.created', 'transfer.approved', ...
    entity_type text NOT NULL,
    entity_id   uuid,
    metadata    jsonb NOT NULL DEFAULT '{}',          -- before/after snapshots, context
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_entity ON activity_logs (entity_type, entity_id, created_at DESC);

-- App role must not be able to rewrite history
REVOKE UPDATE, DELETE ON activity_logs FROM PUBLIC;

-- ============================================================
-- updated_at maintenance
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_touch_departments  BEFORE UPDATE ON departments          FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_touch_employees    BEFORE UPDATE ON employees            FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_touch_role_codes   BEFORE UPDATE ON role_join_codes      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_touch_signup_requests BEFORE UPDATE ON signup_requests   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_touch_categories   BEFORE UPDATE ON asset_categories     FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_touch_assets       BEFORE UPDATE ON assets               FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_touch_maintenance  BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

---

## Loophole Checklist — how each abuse path is closed

| Loophole | Closed by |
|---|---|
| Self-assigned admin at generic signup | The normal Join Company flow does not allow `ADMIN`; only Create Company can bootstrap one Admin for a brand-new organization. Existing organizations require Admin approval for every join-code user. |
| Shared role code gives access to strangers | Role code only creates a `signup_requests` row and an employee with `access_status=PENDING_APPROVAL`; business endpoints reject pending users until Admin approval. |
| Role code leakage | Codes are high-entropy, scoped to one org + role, stored as hashes, and Admin can rotate/revoke each role's code. |
| Signup ticket reuse / account takeover | Ticket is single-claim: the auth bridge links `auth_uid` only to an *unclaimed* employee. Once an employee has an `auth_uid`, presenting the same ticket from a different account is rejected — a leaked ticket can't impersonate the first user / Admin. |
| Role spoofing via forged/edited JWT claims | Roles are read from the `employees` table by `auth_uid`, never from token claims |
| Double allocation (race condition included) | `uniq_open_allocation` partial unique index — concurrent inserts serialize at the DB |
| Overlapping bookings (race condition included) | `booking_no_overlap` exclusion constraint with half-open ranges |
| Booking a non-shared or retired asset | `trg_bookable` trigger |
| Allocating to employee **and** department (or neither) | `alloc_target` / `transfer_target` XOR checks |
| Illegal lifecycle jumps (e.g. Disposed → Allocated) | `trg_asset_transition` state-machine trigger |
| Editing audit results after cycle close | `trg_audit_item_lock` trigger |
| Two open maintenance tickets for one asset | `uniq_open_maintenance` partial unique index |
| Tampering with history | `activity_logs` append-only (UPDATE/DELETE revoked) |
| Negative cost, return-before-allocate, end-before-start times | CHECK constraints on the respective tables |
| Duplicate tags/serials/emails/department names | Scoped UNIQUE constraints (per `org_id`, ready for multi-tenant) |
| Stale "overdue"/"ongoing" flags | Never stored; derived from timestamps at query time |
| ID enumeration in URLs | UUID keys everywhere |

> Note: one deliberate v1 simplification — `RESERVED` is set when a transfer is approved but not yet
> picked up. If it proves unnecessary during the build, we simply never enter that state; the enum
> and transition table already support it.

---

## Seed Data (Dev A's `manage.py seed_demo`)

- 1 organization ("AssetFlow Demo Corp")
- 3 active role join codes owned by the demo Admin: Employee, Department Head, Asset Manager
- 5 departments (Engineering, Operations, HR, Finance, Facilities — Facilities parented under Operations to show hierarchy)
- 8 categories (Electronics with warranty custom field, Furniture, Vehicles, Meeting Rooms, AV Equipment, Tools, Appliances, Safety Gear)
- ~40 assets across statuses, ~6 flagged `is_bookable` (3 rooms, 2 vehicles, 1 projector)
- Users: 1 Admin, 1 Asset Manager, 2 Department Heads, 4 Employees (documented demo passwords)
- Optional pending join requests for the demo approval queue
- A staged story for the demo: Priya holds AF-0114 (so the transfer-conflict flow can be shown live), one overdue allocation, one pending maintenance request, one in-progress audit cycle
