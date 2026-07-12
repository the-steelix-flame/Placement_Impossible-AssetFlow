from __future__ import annotations

from django.db import transaction

from apps.accounts.models import Employee
from core.enums import UserRole
from core.exceptions import NotFound, ValidationError
from core.services.activity import log_activity
from core.services.notify import notify


def get_employee(org, employee_id) -> Employee:
    emp = Employee.objects.filter(org=org, id=employee_id).select_related("department").first()
    if not emp:
        raise NotFound("Employee not found.")
    return emp


@transaction.atomic
def create_employee(*, actor, org, data: dict) -> Employee:
    """Admin pre-provisions a directory row (role is always EMPLOYEE here)."""
    emp = Employee.objects.create(
        org=org,
        full_name=data["full_name"],
        email=data["email"],
        department_id=data.get("department_id"),
        role=UserRole.EMPLOYEE,
    )
    log_activity(
        org_id=org.id, actor=actor, action="employee.created",
        entity_type="employee", entity_id=emp.id, metadata={"email": emp.email},
    )
    return emp


@transaction.atomic
def update_employee(*, actor, emp: Employee, data: dict) -> Employee:
    for field in ("full_name", "status"):
        if field in data and data[field] is not None:
            setattr(emp, field, data[field])
    if "department_id" in data:
        emp.department_id = data["department_id"]
    emp.save()
    log_activity(
        org_id=emp.org_id, actor=actor, action="employee.updated",
        entity_type="employee", entity_id=emp.id,
    )
    return emp


@transaction.atomic
def change_role(*, actor, emp: Employee, new_role: str) -> Employee:
    """The ONLY way a role changes. Admin-guarded at the router; logged + notified."""
    if new_role not in UserRole.values:
        raise ValidationError(f"Unknown role '{new_role}'.")
    old_role = emp.role
    if old_role == new_role:
        return emp
    emp.role = new_role
    emp.save(update_fields=["role", "updated_at"])
    log_activity(
        org_id=emp.org_id, actor=actor, action="employee.role_changed",
        entity_type="employee", entity_id=emp.id,
        metadata={"from": old_role, "to": new_role},
    )
    notify(
        org_id=emp.org_id, recipient=emp, type="ROLE_CHANGED",
        title="Your role changed",
        body=f"Your role is now {new_role} (was {old_role}).",
        entity_type="employee", entity_id=emp.id,
    )
    return emp
