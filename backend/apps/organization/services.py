"""Master-data business rules: default org resolution, dept/category CRUD guards."""
from __future__ import annotations

from django.db import transaction

from apps.organization.models import AssetCategory, Department, Organization
from core.exceptions import Conflict, NotFound, ValidationError
from core.services.activity import log_activity

DEFAULT_ORG_NAME = "AssetFlow Demo Corp"


def get_default_org() -> Organization:
    """v1 is single-tenant. Return the one org, creating it on first use."""
    org, _ = Organization.objects.get_or_create(
        name=DEFAULT_ORG_NAME, defaults={"name": DEFAULT_ORG_NAME}
    )
    return org


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
