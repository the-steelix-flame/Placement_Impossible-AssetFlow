
from datetime import datetime
from uuid import UUID

from ninja import Schema


class BookingIn(Schema):
    asset_id: UUID
    starts_at: datetime
    ends_at: datetime
    purpose: str | None = None


class BookingOut(Schema):
    id: UUID
    asset_id: UUID
    asset_tag: str | None = None
    booked_by_id: UUID
    booked_by_name: str | None = None
    starts_at: datetime
    ends_at: datetime
    purpose: str | None = None
    status: str  # stored: CONFIRMED | CANCELLED
    state: str = "UPCOMING"  # derived: UPCOMING | ONGOING | COMPLETED | CANCELLED
    created_at: datetime

    @staticmethod
    def resolve_asset_tag(obj):
        return obj.asset.asset_tag if obj.asset_id else None

    @staticmethod
    def resolve_booked_by_name(obj):
        return obj.booked_by.full_name if obj.booked_by_id else None

    @staticmethod
    def resolve_state(obj):
        from apps.booking.services import derive_state
        return derive_state(obj)
