from __future__ import annotations

from django.db import transaction

from apps.accounts.models import Employee
from core.enums import UserRole
from core.exceptions import NotFound, ValidationError
from core.services.activity import log_activity
from core.services.notify import notify


def get_employee(org, employee_id) -> Employee:
    emp = Employee.objects.filter(org=org, id=employee_id).select_related("department", "org").first()
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


# ── Join requests (Admin approval of pending onboarding) ────────────────
def get_join_request(org, request_id):
    from apps.organization.models import SignupRequest
    sr = (
        SignupRequest.objects.filter(org=org, id=request_id)
        .select_related("employee")
        .first()
    )
    if not sr:
        raise NotFound("Join request not found.")
    return sr


def list_join_requests(org, status: str | None = None):
    from apps.organization.models import SignupRequest
    qs = SignupRequest.objects.filter(org=org).select_related("employee").order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    return list(qs)


@transaction.atomic
def approve_join_request(*, actor, sr) -> object:
    from django.utils import timezone
    if sr.status in ("APPROVED", "REJECTED", "EXPIRED"):
        raise ValidationError(f"Request already {sr.status}.")
    emp = sr.employee
    if emp is None:
        raise NotFound("No employee attached to this request.")
    emp.role = sr.requested_role
    emp.access_status = "ACTIVE"
    emp.save(update_fields=["role", "access_status", "updated_at"])

    sr.status = "APPROVED"
    sr.decided_by = actor
    sr.decided_at = timezone.now()
    sr.save(update_fields=["status", "decided_by", "decided_at", "updated_at"])

    log_activity(
        org_id=sr.org_id, actor=actor, action="join.approved",
        entity_type="signup_request", entity_id=sr.id,
        metadata={"email": emp.email, "role": emp.role},
    )
    notify(
        org_id=sr.org_id, recipient=emp, type="ROLE_CHANGED",
        title="Access approved",
        body=f"You now have {emp.role} access to {sr.org.name}.",
        entity_type="employee", entity_id=emp.id,
    )
    return sr


@transaction.atomic
def reject_join_request(*, actor, sr, note: str | None) -> object:
    from django.utils import timezone
    if sr.status in ("APPROVED", "REJECTED", "EXPIRED"):
        raise ValidationError(f"Request already {sr.status}.")
    emp = sr.employee
    if emp is not None:
        emp.access_status = "REJECTED"
        emp.save(update_fields=["access_status", "updated_at"])
    sr.status = "REJECTED"
    sr.decided_by = actor
    sr.decided_at = timezone.now()
    sr.decision_note = note
    sr.save(update_fields=["status", "decided_by", "decided_at", "decision_note", "updated_at"])

    log_activity(
        org_id=sr.org_id, actor=actor, action="join.rejected",
        entity_type="signup_request", entity_id=sr.id, metadata={"note": note},
    )
    if emp is not None:
        notify(
            org_id=sr.org_id, recipient=emp, type="ROLE_CHANGED",
            title="Access request rejected",
            body=note or "Your access request was rejected.",
            entity_type="employee", entity_id=emp.id,
        )
    return sr


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
