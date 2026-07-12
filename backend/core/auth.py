"""
Supabase JWT auth bridge + workspace-onboarding link.

Real Supabase user tokens are verified with the public JWKS (ES256/RS256); local
`mint_token` tokens use HS256. After verification the employee is resolved from OUR
tables — never from token claims:

1. already linked → match by `auth_uid`;
2. first login after onboarding → link via the single-use signup ticket in Supabase
   `user_metadata` (created by /onboarding/workspaces or /onboarding/join/validate-code);
3. pre-provisioned directory row → link by email;
4. fallback → auto-create a PENDING_APPROVAL employee (secure default).

`access_status` gates company data: `member_auth` lets pending users reach /me and the
pending screen; `active_auth` (the default for business routers) rejects them with 403
`approval_pending`.
"""
from __future__ import annotations

import jwt
from django.conf import settings
from jwt import PyJWKClient
from ninja.security import HttpBearer

from core.exceptions import ApprovalPending
from core.onboarding import hash_secret

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if _jwks_client is None and settings.SUPABASE_JWKS_URL:
        _jwks_client = PyJWKClient(settings.SUPABASE_JWKS_URL, cache_keys=True)
    return _jwks_client


def _verify_token(token: str) -> dict | None:
    """Verify a Supabase user JWT, routing by its `alg` header."""
    try:
        alg = jwt.get_unverified_header(token).get("alg")
    except jwt.InvalidTokenError:
        return None

    common = {"audience": settings.SUPABASE_JWT_AUD, "options": {"require": ["sub"]}}
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


def _extract_name(payload: dict) -> str | None:
    meta = payload.get("user_metadata") or {}
    return meta.get("full_name") or meta.get("name")


def _link_via_ticket(payload: dict, auth_uid: str):
    """First login after onboarding: link auth_uid to the ticket's employee."""
    from apps.organization.models import SignupRequest

    meta = payload.get("user_metadata") or {}
    ticket = meta.get("signup_ticket")
    if not ticket:
        return None
    sr = (
        SignupRequest.objects.filter(signup_ticket_hash=hash_secret(ticket))
        .select_related("employee", "employee__department", "employee__org")
        .first()
    )
    if sr is None or sr.employee is None:
        return None

    emp = sr.employee
    if emp.auth_uid is None:
        emp.auth_uid = auth_uid
        emp.save(update_fields=["auth_uid", "updated_at"])
    if sr.status == "PENDING_EMAIL_VERIFICATION":
        sr.status = "APPROVED" if emp.access_status == "ACTIVE" else "PENDING_APPROVAL"
        sr.save(update_fields=["status", "updated_at"])
    return emp


def _resolve_employee(payload: dict):
    from apps.accounts.models import Employee
    from apps.organization.services import get_default_org

    auth_uid = payload["sub"]

    emp = (
        Employee.objects.filter(auth_uid=auth_uid)
        .select_related("department", "org")
        .first()
    )
    if emp:
        return emp

    emp = _link_via_ticket(payload, auth_uid)
    if emp:
        return emp

    email = payload.get("email")
    org = get_default_org()
    if email:
        existing = (
            Employee.objects.filter(email=email, auth_uid__isnull=True)
            .select_related("department", "org")
            .first()
        )
        if existing:
            existing.auth_uid = auth_uid
            if not existing.full_name:
                existing.full_name = _extract_name(payload) or email.split("@")[0]
            existing.save(update_fields=["auth_uid", "full_name", "updated_at"])
            return existing

    # Fallback: a token with no onboarding trail. Create a pending employee — an
    # Admin must approve before they see anything.
    return Employee.objects.create(
        org=org,
        auth_uid=auth_uid,
        email=email or f"{auth_uid}@placeholder.local",
        full_name=_extract_name(payload) or (email.split("@")[0] if email else "New User"),
        role="EMPLOYEE",
        access_status="PENDING_APPROVAL",
    )


class SupabaseAuth(HttpBearer):
    def __init__(self, require_active: bool = True):
        super().__init__()
        self.require_active = require_active

    def authenticate(self, request, token: str):
        payload = _verify_token(token)
        if payload is None or not payload.get("sub"):
            return None

        employee = _resolve_employee(payload)
        if employee is None or employee.status != "ACTIVE":
            return None

        request.employee = employee
        if self.require_active and employee.access_status != "ACTIVE":
            raise ApprovalPending()
        return employee


# Business routers reject pending users; /me + onboarding reads use the member variant.
active_auth = SupabaseAuth(require_active=True)
member_auth = SupabaseAuth(require_active=False)
supabase_auth = active_auth  # backward-compatible default used by existing routers
