
from datetime import datetime
from uuid import UUID

from ninja import Schema


# ── Workspace onboarding (public) ──────────────────────────────────────
class WorkspaceIn(Schema):
    company_name: str
    admin_full_name: str
    admin_email: str


class RoleCodeItem(Schema):
    role: str
    code: str


class WorkspaceOut(Schema):
    organization_id: UUID
    organization_name: str
    admin_employee_id: UUID
    signup_ticket: str
    role_codes: list[RoleCodeItem]


class ValidateCodeIn(Schema):
    full_name: str
    email: str
    requested_role: str
    role_code: str


class ValidateCodeOut(Schema):
    organization_id: UUID
    organization_name: str
    requested_role: str
    signup_request_id: UUID
    signup_ticket: str
    requires_admin_approval: bool


# ── Join codes (Admin) ─────────────────────────────────────────────────
class JoinCodeOut(Schema):
    id: UUID
    role: str
    masked_code: str
    last_rotated_at: datetime
    expires_at: datetime | None = None
    status: str
    created_at: datetime


class RotateJoinCodeOut(Schema):
    id: UUID
    role: str
    code: str
    expires_at: datetime | None = None
    status: str


# ── Departments ────────────────────────────────────────────────────────
class DepartmentIn(Schema):
    name: str
    code: str
    parent_id: UUID | None = None
    head_id: UUID | None = None


class DepartmentUpdate(Schema):
    name: str | None = None
    code: str | None = None
    parent_id: UUID | None = None
    head_id: UUID | None = None
    status: str | None = None


class DepartmentOut(Schema):
    id: UUID
    name: str
    code: str
    parent_id: UUID | None = None
    head_id: UUID | None = None
    status: str
    created_at: datetime
    updated_at: datetime


# ── Categories ─────────────────────────────────────────────────────────
class CategoryIn(Schema):
    name: str
    description: str | None = None
    field_schema: list[dict] = []


class CategoryUpdate(Schema):
    name: str | None = None
    description: str | None = None
    field_schema: list[dict] | None = None
    status: str | None = None


class CategoryOut(Schema):
    id: UUID
    name: str
    description: str | None = None
    field_schema: list[dict]
    status: str
    created_at: datetime
    updated_at: datetime
