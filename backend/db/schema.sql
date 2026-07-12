-- ============================================================================
-- AssetFlow — DB-level guarantees Django's ORM can't express.
-- Applied AFTER Django creates the tables, via the RunSQL migration
-- apps/assets/migrations/0002_db_constraints.py.
--
-- Mirrors docs/DATABASE_SCHEMA.md. Column names here match Django's generated
-- schema (FK columns are <field>_id). If the doc and this file disagree, the
-- doc wins and this file is regenerated to match.
-- ============================================================================

-- Needed for the booking exclusion constraint (= on uuid, && on tstzrange).
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Auto asset tag: AF-0001, AF-0002 … assigned when asset_tag is blank on insert
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS asset_tag_seq START 1;

CREATE OR REPLACE FUNCTION set_asset_tag() RETURNS trigger AS $$
BEGIN
    IF NEW.asset_tag IS NULL OR NEW.asset_tag = '' THEN
        NEW.asset_tag := 'AF-' || lpad(nextval('asset_tag_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asset_tag ON assets;
CREATE TRIGGER trg_asset_tag BEFORE INSERT ON assets
    FOR EACH ROW EXECUTE FUNCTION set_asset_tag();

-- ----------------------------------------------------------------------------
-- LIFECYCLE STATE MACHINE — illegal transitions rejected in-DB
-- ----------------------------------------------------------------------------
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
        WHEN 'LOST'              THEN NEW.status IN ('AVAILABLE','DISPOSED')
        WHEN 'RETIRED'           THEN NEW.status IN ('DISPOSED')
        WHEN 'DISPOSED'          THEN false
        ELSE false
    END;
    IF NOT allowed THEN
        RAISE EXCEPTION 'Illegal asset lifecycle transition: % -> %', OLD.status, NEW.status
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asset_transition ON assets;
CREATE TRIGGER trg_asset_transition BEFORE UPDATE OF status ON assets
    FOR EACH ROW EXECUTE FUNCTION guard_asset_transition();

-- ----------------------------------------------------------------------------
-- Asset value / integrity checks
-- ----------------------------------------------------------------------------
ALTER TABLE assets DROP CONSTRAINT IF EXISTS asset_cost_nonneg;
ALTER TABLE assets ADD CONSTRAINT asset_cost_nonneg
    CHECK (acquisition_cost IS NULL OR acquisition_cost >= 0);

-- ----------------------------------------------------------------------------
-- Allocations — THE double-allocation guard + XOR target + return-after
-- ----------------------------------------------------------------------------
ALTER TABLE allocations DROP CONSTRAINT IF EXISTS alloc_target;
ALTER TABLE allocations ADD CONSTRAINT alloc_target
    CHECK (num_nonnulls(employee_id, department_id) = 1);

ALTER TABLE allocations DROP CONSTRAINT IF EXISTS alloc_return_after;
ALTER TABLE allocations ADD CONSTRAINT alloc_return_after
    CHECK (returned_at IS NULL OR returned_at >= allocated_at);

-- At most ONE open allocation per asset — unbreakable even by raw SQL.
DROP INDEX IF EXISTS uniq_open_allocation;
CREATE UNIQUE INDEX uniq_open_allocation
    ON allocations (asset_id) WHERE returned_at IS NULL;

DROP INDEX IF EXISTS idx_alloc_overdue;
CREATE INDEX idx_alloc_overdue
    ON allocations (expected_return_date)
    WHERE returned_at IS NULL AND expected_return_date IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Transfer requests — XOR target + one pending per asset
-- ----------------------------------------------------------------------------
ALTER TABLE transfer_requests DROP CONSTRAINT IF EXISTS transfer_target;
ALTER TABLE transfer_requests ADD CONSTRAINT transfer_target
    CHECK (num_nonnulls(to_employee_id, to_department_id) = 1);

DROP INDEX IF EXISTS uniq_pending_transfer;
CREATE UNIQUE INDEX uniq_pending_transfer
    ON transfer_requests (asset_id) WHERE status = 'REQUESTED';

-- ----------------------------------------------------------------------------
-- Bookings — THE overlap guard (half-open ranges) + valid time + bookable check
-- ----------------------------------------------------------------------------
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS booking_time_valid;
ALTER TABLE bookings ADD CONSTRAINT booking_time_valid CHECK (ends_at > starts_at);

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS booking_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT booking_no_overlap EXCLUDE USING gist (
    asset_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'CONFIRMED');

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

DROP TRIGGER IF EXISTS trg_bookable ON bookings;
CREATE TRIGGER trg_bookable BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION guard_bookable();

-- ----------------------------------------------------------------------------
-- Maintenance — one open request per asset
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS uniq_open_maintenance;
CREATE UNIQUE INDEX uniq_open_maintenance
    ON maintenance_requests (asset_id)
    WHERE status IN ('PENDING','APPROVED','ASSIGNED','IN_PROGRESS');

-- ----------------------------------------------------------------------------
-- Audit — date sanity + closed cycles are immutable
-- ----------------------------------------------------------------------------
ALTER TABLE audit_cycles DROP CONSTRAINT IF EXISTS audit_dates;
ALTER TABLE audit_cycles ADD CONSTRAINT audit_dates CHECK (ends_on >= starts_on);

CREATE OR REPLACE FUNCTION guard_closed_cycle() RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM audit_cycles c
               WHERE c.id = COALESCE(NEW.cycle_id, OLD.cycle_id) AND c.status = 'CLOSED') THEN
        RAISE EXCEPTION 'Audit cycle is closed and locked' USING ERRCODE = 'check_violation';
    END IF;
    RETURN COALESCE(NEW, OLD);
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_item_lock ON audit_items;
CREATE TRIGGER trg_audit_item_lock BEFORE INSERT OR UPDATE OR DELETE ON audit_items
    FOR EACH ROW EXECUTE FUNCTION guard_closed_cycle();

-- ----------------------------------------------------------------------------
-- Notifications — fast unread lookups
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_notif_unread;
CREATE INDEX idx_notif_unread
    ON notifications (recipient_id, created_at DESC) WHERE NOT is_read;

-- ----------------------------------------------------------------------------
-- Activity log is append-only — app role must not rewrite history
-- ----------------------------------------------------------------------------
REVOKE UPDATE, DELETE ON activity_logs FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- updated_at maintenance (so raw-SQL updates also touch the column)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_departments ON departments;
CREATE TRIGGER trg_touch_departments BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_employees ON employees;
CREATE TRIGGER trg_touch_employees BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_categories ON asset_categories;
CREATE TRIGGER trg_touch_categories BEFORE UPDATE ON asset_categories
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_assets ON assets;
CREATE TRIGGER trg_touch_assets BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_maintenance ON maintenance_requests;
CREATE TRIGGER trg_touch_maintenance BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================================
-- Workspace onboarding (v1.1) — applied by migration
-- apps/organization/migrations/0003_onboarding_constraints.py (mirrored here).
-- ============================================================================

-- One ACTIVE join code per (org, role).
DROP INDEX IF EXISTS uniq_active_role_join_code;
CREATE UNIQUE INDEX uniq_active_role_join_code
    ON role_join_codes (org_id, role) WHERE status = 'ACTIVE';

-- ADMIN bootstraps a workspace (no code); everyone else must present a role code.
ALTER TABLE signup_requests DROP CONSTRAINT IF EXISTS signup_role_code_required;
ALTER TABLE signup_requests ADD CONSTRAINT signup_role_code_required CHECK (
    (requested_role = 'ADMIN' AND role_code_id IS NULL)
    OR (requested_role <> 'ADMIN' AND role_code_id IS NOT NULL)
);

DROP TRIGGER IF EXISTS trg_touch_role_codes ON role_join_codes;
CREATE TRIGGER trg_touch_role_codes BEFORE UPDATE ON role_join_codes
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_signup_requests ON signup_requests;
CREATE TRIGGER trg_touch_signup_requests BEFORE UPDATE ON signup_requests
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
