
from datetime import date, datetime
from uuid import UUID

from ninja import Schema


class CycleIn(Schema):
    name: str
    scope_department_id: UUID | None = None
    scope_location: str | None = None
    starts_on: date
    ends_on: date
    auditor_ids: list[UUID] = []


class CycleOut(Schema):
    id: UUID
    name: str
    scope_department_id: UUID | None = None
    scope_location: str | None = None
    starts_on: date
    ends_on: date
    status: str
    created_by_id: UUID
    closed_by_id: UUID | None = None
    closed_at: datetime | None = None
    created_at: datetime
    item_count: int = 0

    @staticmethod
    def resolve_item_count(obj):
        return obj.items.count()


class ItemUpdate(Schema):
    result: str | None = None  # PENDING | VERIFIED | MISSING | DAMAGED
    notes: str | None = None


class ItemOut(Schema):
    id: UUID
    cycle_id: UUID
    asset_id: UUID
    asset_tag: str | None = None
    asset_name: str | None = None
    result: str
    notes: str | None = None
    checked_by_id: UUID | None = None
    checked_at: datetime | None = None

    @staticmethod
    def resolve_asset_tag(obj):
        return obj.asset.asset_tag if obj.asset_id else None

    @staticmethod
    def resolve_asset_name(obj):
        return obj.asset.name if obj.asset_id else None
