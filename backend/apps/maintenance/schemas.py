
from datetime import datetime
from uuid import UUID

from ninja import Schema


class MaintenanceIn(Schema):
    asset_id: UUID
    title: str
    description: str | None = None
    priority: str | None = None  # LOW | MEDIUM | HIGH | CRITICAL
    photo_url: str | None = None


class RejectIn(Schema):
    reason: str | None = None


class AssignIn(Schema):
    technician_name: str


class ResolveIn(Schema):
    resolution_notes: str | None = None


class MaintenanceOut(Schema):
    id: UUID
    asset_id: UUID
    asset_tag: str | None = None
    raised_by_id: UUID
    raised_by_name: str | None = None
    title: str
    description: str | None = None
    priority: str
    photo_url: str | None = None
    status: str
    approved_by_id: UUID | None = None
    approved_at: datetime | None = None
    rejection_reason: str | None = None
    technician_name: str | None = None
    assigned_at: datetime | None = None
    started_at: datetime | None = None
    resolved_at: datetime | None = None
    resolution_notes: str | None = None
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_asset_tag(obj):
        return obj.asset.asset_tag if obj.asset_id else None

    @staticmethod
    def resolve_raised_by_name(obj):
        return obj.raised_by.full_name if obj.raised_by_id else None
