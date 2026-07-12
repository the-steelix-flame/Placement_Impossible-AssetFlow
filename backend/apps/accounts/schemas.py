
from datetime import datetime
from uuid import UUID

from ninja import Schema


class EmployeeOut(Schema):
    id: UUID
    full_name: str
    email: str
    role: str
    requested_role: str | None = None
    access_status: str
    status: str
    department_id: UUID | None = None
    department_name: str | None = None
    organization_name: str | None = None
    auth_uid: UUID | None = None
    created_at: datetime

    @staticmethod
    def resolve_department_name(obj):
        return obj.department.name if obj.department_id else None

    @staticmethod
    def resolve_organization_name(obj):
        return obj.org.name if obj.org_id else None


class JoinRequestOut(Schema):
    id: UUID
    organization_id: UUID
    full_name: str
    email: str
    requested_role: str
    status: str
    employee_id: UUID | None = None
    created_at: datetime
    decided_by_id: UUID | None = None
    decided_at: datetime | None = None
    decision_note: str | None = None

    @staticmethod
    def resolve_organization_id(obj):
        return obj.org_id


class JoinRejectIn(Schema):
    note: str | None = None


class MeOut(EmployeeOut):
    org_id: UUID


class EmployeeIn(Schema):
    """Admin-side pre-provisioning (bulk directory add). Role is NOT settable here."""

    full_name: str
    email: str
    department_id: UUID | None = None


class EmployeeUpdate(Schema):
    full_name: str | None = None
    department_id: UUID | None = None
    status: str | None = None


class RoleChangeIn(Schema):
    role: str  # ADMIN | ASSET_MANAGER | DEPT_HEAD | EMPLOYEE
