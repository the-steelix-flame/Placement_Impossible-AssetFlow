"""
Onboarding DB objects Django can't express + a safe backfill.

- Backfill: every employee that existed BEFORE onboarding is a legitimate member,
  so set them access_status=ACTIVE (the new column defaults to PENDING_APPROVAL,
  which would otherwise lock out the seeded users).
- One active join code per (org, role): partial unique index.
- signup_requests: ADMIN has no role code; everyone else must have one (CHECK).
- touch_updated_at triggers for the two new tables (function created in 0002).
"""
from django.db import migrations


def backfill_access_status(apps, schema_editor):
    Employee = apps.get_model("accounts", "Employee")
    Employee.objects.update(access_status="ACTIVE")


ONBOARDING_SQL = """
DROP INDEX IF EXISTS uniq_active_role_join_code;
CREATE UNIQUE INDEX uniq_active_role_join_code
    ON role_join_codes (org_id, role) WHERE status = 'ACTIVE';

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
"""

ONBOARDING_SQL_REVERSE = """
DROP INDEX IF EXISTS uniq_active_role_join_code;
ALTER TABLE signup_requests DROP CONSTRAINT IF EXISTS signup_role_code_required;
DROP TRIGGER IF EXISTS trg_touch_role_codes ON role_join_codes;
DROP TRIGGER IF EXISTS trg_touch_signup_requests ON signup_requests;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("organization", "0002_organization_slug_organization_status_rolejoincode_and_more"),
        ("accounts", "0003_employee_access_status_employee_requested_role"),
    ]

    operations = [
        migrations.RunPython(backfill_access_status, migrations.RunPython.noop),
        migrations.RunSQL(ONBOARDING_SQL, ONBOARDING_SQL_REVERSE),
    ]
