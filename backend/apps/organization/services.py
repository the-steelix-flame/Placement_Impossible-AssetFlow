"""Master-data business rules: workspace onboarding, join codes, dept/category CRUD."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.organization.models import (
    AssetCategory,
    Department,
    Organization,
    RoleJoinCode,
    SignupRequest,
)
from core.enums import JoinCodeRole
from core.exceptions import Conflict, InvalidJoinCode, NotFound, ValidationError
from core.onboarding import hash_secret, new_role_code, new_signup_ticket
from core.services.activity import log_activity

DEFAULT_ORG_NAME = "AssetFlow Demo Corp"
JOINABLE_ROLES = [JoinCodeRole.EMPLOYEE, JoinCodeRole.DEPT_HEAD, JoinCodeRole.ASSET_MANAGER]


def get_default_org() -> Organization:
    """Fallback org for tokens with no onboarding trail (dev / legacy)."""
    org, _ = Organization.objects.get_or_create(
        name=DEFAULT_ORG_NAME, defaults={"name": DEFAULT_ORG_NAME}
    )
    return org


# ── Workspace onboarding ────────────────────────────────────────────────
def _unique_slug(name: str) -> str:
    import secrets
    base = slugify(name)[:40] or "workspace"
    return f"{base}-{secrets.token_hex(3)}"


def _mint_role_codes(org, actor) -> list[dict]:
    """Create one active join code per joinable role. Returns plaintext (shown once)."""
    out = []
    for role in JOINABLE_ROLES:
        plaintext = new_role_code(role)
        RoleJoinCode.objects.create(
            org=org, role=role, code_hash=hash_secret(plaintext), code=plaintext,
            created_by=actor,
        )
        out.append({"role": role, "code": plaintext})
    return out


@transaction.atomic
def create_workspace(*, company_name: str, admin_full_name: str, admin_email: str) -> dict:
    from apps.accounts.models import Employee

    company_name = (company_name or "").strip()
    admin_email = (admin_email or "").strip().lower()
    if not company_name or not admin_full_name or not admin_email:
        raise ValidationError("company_name, admin_full_name and admin_email are required.")

    org = Organization.objects.create(name=company_name, slug=_unique_slug(company_name))
    admin = Employee.objects.create(
        org=org, full_name=admin_full_name.strip(), email=admin_email,
        role="ADMIN", requested_role="ADMIN", access_status="ACTIVE",
    )
    role_codes = _mint_role_codes(org, admin)

    ticket = new_signup_ticket()
    SignupRequest.objects.create(
        org=org, employee=admin, role_code=None,
        signup_ticket_hash=hash_secret(ticket),
        full_name=admin.full_name, email=admin.email,
        requested_role="ADMIN", status="PENDING_EMAIL_VERIFICATION",
    )
    log_activity(
        org_id=org.id, actor=admin, action="workspace.created",
        entity_type="organization", entity_id=org.id,
        metadata={"company_name": company_name},
    )
    return {
        "organization_id": org.id,
        "organization_name": org.name,
        "admin_employee_id": admin.id,
        "signup_ticket": ticket,
        "role_codes": role_codes,
    }


@transaction.atomic
def validate_join_code(*, full_name: str, email: str, requested_role: str, role_code: str) -> dict:
    from apps.accounts.models import Employee

    email = (email or "").strip().lower()
    full_name = (full_name or "").strip()
    if requested_role == "ADMIN":
        raise InvalidJoinCode("ADMIN cannot be requested via a join code.")
    if not full_name or not email or not role_code:
        raise ValidationError("full_name, email, requested_role and role_code are required.")

    code = (
        RoleJoinCode.objects.select_related("org")
        .filter(code_hash=hash_secret(role_code), status="ACTIVE", role=requested_role)
        .first()
    )
    if code is None:
        raise InvalidJoinCode()
    if code.expires_at and code.expires_at < timezone.now():
        raise InvalidJoinCode("This join code has expired.")

    org = code.org
    existing = Employee.objects.filter(org=org, email=email).first()
    if existing and existing.access_status == "ACTIVE":
        raise Conflict("This email is already an active member of the workspace.")

    if existing:
        emp = existing
        emp.full_name = full_name or emp.full_name
        emp.requested_role = requested_role
        emp.access_status = "PENDING_APPROVAL"
        emp.save(update_fields=["full_name", "requested_role", "access_status", "updated_at"])
    else:
        emp = Employee.objects.create(
            org=org, full_name=full_name, email=email,
            role="EMPLOYEE", requested_role=requested_role,
            access_status="PENDING_APPROVAL",
        )

    ticket = new_signup_ticket()
    sr = SignupRequest.objects.create(
        org=org, employee=emp, role_code=code,
        signup_ticket_hash=hash_secret(ticket),
        full_name=full_name, email=email,
        requested_role=requested_role, status="PENDING_EMAIL_VERIFICATION",
    )
    log_activity(
        org_id=org.id, actor=None, action="join.requested",
        entity_type="signup_request", entity_id=sr.id,
        metadata={"email": email, "requested_role": requested_role},
    )
    return {
        "organization_id": org.id,
        "organization_name": org.name,
        "requested_role": requested_role,
        "signup_request_id": sr.id,
        "signup_ticket": ticket,
        "requires_admin_approval": True,
    }


# ── Join codes (Admin) ──────────────────────────────────────────────────
def list_join_codes(org) -> list[dict]:
    from core.onboarding import _ROLE_PREFIX
    codes = RoleJoinCode.objects.filter(org=org, status="ACTIVE").order_by("role")
    return [
        {
            "id": c.id, "role": c.role,
            "code": c.code,  # Admin-viewable plaintext (None for legacy pre-reseed codes)
            "masked_code": f"AF-{_ROLE_PREFIX.get(c.role, 'XX')}-••••••",
            "last_rotated_at": c.last_rotated_at, "expires_at": c.expires_at,
            "status": c.status, "created_at": c.created_at,
        }
        for c in codes
    ]


@transaction.atomic
def rotate_join_code(*, org, role: str, actor) -> dict:
    if role not in JoinCodeRole.values:
        raise ValidationError(f"'{role}' is not a joinable role.")
    RoleJoinCode.objects.filter(org=org, role=role, status="ACTIVE").update(
        status="INACTIVE", updated_at=timezone.now()
    )
    plaintext = new_role_code(role)
    code = RoleJoinCode.objects.create(
        org=org, role=role, code_hash=hash_secret(plaintext), code=plaintext, created_by=actor,
    )
    log_activity(
        org_id=org.id, actor=actor, action="join_code.rotated",
        entity_type="role_join_code", entity_id=code.id, metadata={"role": role},
    )
    return {
        "id": code.id, "role": role, "code": plaintext,
        "expires_at": code.expires_at, "status": code.status,
    }


# ── Departments ────────────────────────────────────────────────────────
@transaction.atomic
def create_department(*, actor, org, data: dict) -> Department:
    dept = Department.objects.create(
        org=org,
        name=data["name"],
        code=data["code"],
        parent_id=data.get("parent_id"),
        head_id=data.get("head_id"),
    )
    log_activity(
        org_id=org.id, actor=actor, action="department.created",
        entity_type="department", entity_id=dept.id, metadata={"name": dept.name},
    )
    return dept


@transaction.atomic
def update_department(*, actor, dept: Department, data: dict) -> Department:
    for field in ("name", "code", "status"):
        if field in data and data[field] is not None:
            setattr(dept, field, data[field])
    if "parent_id" in data:
        if data["parent_id"] == dept.id:
            raise ValidationError("A department cannot be its own parent.")
        dept.parent_id = data["parent_id"]
    if "head_id" in data:
        dept.head_id = data["head_id"]
    dept.save()
    log_activity(
        org_id=dept.org_id, actor=actor, action="department.updated",
        entity_type="department", entity_id=dept.id,
    )
    return dept


@transaction.atomic
def deactivate_department(*, actor, dept: Department) -> Department:
    # Guard: can't deactivate a department that still owns assets.
    if dept.assets.exclude(status__in=["RETIRED", "DISPOSED"]).exists():
        raise Conflict("Department still owns active assets; reassign them first.")
    dept.status = "INACTIVE"
    dept.save(update_fields=["status", "updated_at"])
    log_activity(
        org_id=dept.org_id, actor=actor, action="department.deactivated",
        entity_type="department", entity_id=dept.id,
    )
    return dept


def get_department(org, dept_id) -> Department:
    dept = Department.objects.filter(org=org, id=dept_id).first()
    if not dept:
        raise NotFound("Department not found.")
    return dept


# ── Categories ─────────────────────────────────────────────────────────
@transaction.atomic
def create_category(*, actor, org, data: dict) -> AssetCategory:
    cat = AssetCategory.objects.create(
        org=org,
        name=data["name"],
        description=data.get("description"),
        field_schema=data.get("field_schema") or [],
    )
    log_activity(
        org_id=org.id, actor=actor, action="category.created",
        entity_type="category", entity_id=cat.id, metadata={"name": cat.name},
    )
    return cat


@transaction.atomic
def update_category(*, actor, cat: AssetCategory, data: dict) -> AssetCategory:
    for field in ("name", "description", "status"):
        if field in data and data[field] is not None:
            setattr(cat, field, data[field])
    if "field_schema" in data and data["field_schema"] is not None:
        cat.field_schema = data["field_schema"]
    cat.save()
    log_activity(
        org_id=cat.org_id, actor=actor, action="category.updated",
        entity_type="category", entity_id=cat.id,
    )
    return cat


def get_category(org, cat_id) -> AssetCategory:
    cat = AssetCategory.objects.filter(org=org, id=cat_id).first()
    if not cat:
        raise NotFound("Category not found.")
    return cat
