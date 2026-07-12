
from datetime import datetime
from uuid import UUID

from ninja import Schema


class EmployeeOut(Schema):
    id: UUID
    full_name: str
    email: str
    role: str
    status: str
    department_id: UUID | None = None
    department_name: str | None = None
    auth_uid: UUID | None = None
    created_at: datetime

    @staticmethod
    def resolve_department_name(obj):
        return obj.department.name if obj.department_id else None


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
