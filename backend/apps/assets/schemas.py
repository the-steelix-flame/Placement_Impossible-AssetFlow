
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from ninja import Schema


class AssetIn(Schema):
    name: str
    category_id: UUID
    serial_number: str | None = None
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = None
    condition: str | None = None
    location: str | None = None
    department_id: UUID | None = None
    is_bookable: bool = False
    custom_fields: dict = {}
    photo_url: str | None = None


class AssetUpdate(Schema):
    name: str | None = None
    category_id: UUID | None = None
    serial_number: str | None = None
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = None
    condition: str | None = None
    location: str | None = None
    department_id: UUID | None = None
    is_bookable: bool | None = None
    custom_fields: dict | None = None
    photo_url: str | None = None


class AssetOut(Schema):
    id: UUID
    asset_tag: str
    name: str
    category_id: UUID
    category_name: str | None = None
    serial_number: str | None = None
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = None
    condition: str
    status: str
    location: str | None = None
    department_id: UUID | None = None
    department_name: str | None = None
    is_bookable: bool
    custom_fields: dict
    photo_url: str | None = None
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_category_name(obj):
        return obj.category.name if obj.category_id else None

    @staticmethod
    def resolve_department_name(obj):
        return obj.department.name if obj.department_id else None


class PassportEvent(Schema):
    at: datetime
    kind: str
    title: str
    detail: str = ""


class AssetPassportOut(Schema):
    asset: AssetOut
    timeline: list[PassportEvent]
