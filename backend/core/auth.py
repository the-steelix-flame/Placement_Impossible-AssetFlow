"""
Supabase JWT auth bridge.

The frontend authenticates with Supabase and sends the JWT as
`Authorization: Bearer <token>`. Real Supabase user tokens are verified with
Supabase's public JWKS (ES256/RS256); local dev tokens can still use HS256.
After verification, the role is resolved from OUR `employees` table by
`auth_uid`. Roles are NEVER read from token claims, so a forged or self-edited
claim cannot escalate privileges.

On first login (no matching employee row yet) we auto-create a plain EMPLOYEE.
The only role a self-service signup can ever produce is EMPLOYEE.
"""
from __future__ import annotations

import jwt
from django.conf import settings
from jwt import PyJWKClient
from ninja.security import HttpBearer

# Cached JWKS client fetches and caches Supabase's public ES256/RS256 keys.
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if _jwks_client is None and settings.SUPABASE_JWKS_URL:
        _jwks_client = PyJWKClient(settings.SUPABASE_JWKS_URL, cache_keys=True)
    return _jwks_client


def _verify_token(token: str) -> dict | None:
    """Verify a Supabase user JWT, routing by its `alg` header.

    ES256/RS256 -> real Supabase tokens, verified against the public JWKS.
    HS256       -> local `mint_token` dev tokens, verified with the shared secret.
    """
    try:
        alg = jwt.get_unverified_header(token).get("alg")
    except jwt.InvalidTokenError:
        return None

    common = {
        "audience": settings.SUPABASE_JWT_AUD,
        "options": {"require": ["sub"]},
    }
    try:
        if alg in ("ES256", "RS256"):
            client = _get_jwks_client()
            if client is None:
                return None
            key = client.get_signing_key_from_jwt(token).key
            return jwt.decode(token, key, algorithms=[alg], **common)
        if alg == "HS256":
            return jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], **common)
    except Exception:
        return None
    return None


class SupabaseAuth(HttpBearer):
    def authenticate(self, request, token: str):
        payload = _verify_token(token)
        if payload is None:
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
