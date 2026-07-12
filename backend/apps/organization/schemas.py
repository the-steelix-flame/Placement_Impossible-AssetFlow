
from datetime import datetime
from uuid import UUID

from ninja import Schema


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
