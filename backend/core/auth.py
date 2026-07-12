"""
Supabase JWT auth bridge.

The frontend authenticates with Supabase and sends the JWT as
`Authorization: Bearer <token>`. We verify the signature against SUPABASE_JWT_SECRET
(HS256 — the same secret Supabase signs with), then resolve the *role* from OUR
`employees` table by `auth_uid`. Roles are NEVER read from token claims, so a forged
or self-edited claim can't escalate privileges.

On first login (no matching employee row yet) we auto-create a plain EMPLOYEE — the
only role a self-service signup can ever produce.
"""
from __future__ import annotations

import jwt
from django.conf import settings
from ninja.security import HttpBearer


class SupabaseAuth(HttpBearer):
    def authenticate(self, request, token: str):
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience=settings.SUPABASE_JWT_AUD,
                options={"require": ["sub"]},
            )
        except jwt.InvalidTokenError:
            return None

        auth_uid = payload.get("sub")
        if not auth_uid:
            return None

        employee = _get_or_create_employee(
            auth_uid=auth_uid,
            email=payload.get("email"),
            full_name=_extract_name(payload),
        )
        if employee is None or employee.status != "ACTIVE":
            return None

        # Ninja stores the return value on request.auth; we also expose it directly.
        request.employee = employee
        return employee


def _extract_name(payload: dict) -> str | None:
    meta = payload.get("user_metadata") or {}
    return meta.get("full_name") or meta.get("name")


def _get_or_create_employee(auth_uid: str, email: str | None, full_name: str | None):
    # Imported lazily so this module stays import-safe before apps are loaded.
    from apps.accounts.models import Employee
    from apps.organization.services import get_default_org

    employee = Employee.objects.filter(auth_uid=auth_uid).select_related("department").first()
    if employee:
        return employee

    # First login. If a pre-provisioned row exists for this email (e.g. seeded /
    # admin-imported), link it; otherwise create a plain EMPLOYEE.
    org = get_default_org()
    if email:
        existing = Employee.objects.filter(org=org, email=email, auth_uid__isnull=True).first()
        if existing:
            existing.auth_uid = auth_uid
            if full_name and not existing.full_name:
                existing.full_name = full_name
            existing.save(update_fields=["auth_uid", "full_name", "updated_at"])
            return existing

    return Employee.objects.create(
        org=org,
        auth_uid=auth_uid,
        email=email or f"{auth_uid}@placeholder.local",
        full_name=full_name or (email.split("@")[0] if email else "New User"),
        role="EMPLOYEE",
    )


# Single shared instance used as the `auth=` on routers.
supabase_auth = SupabaseAuth()
