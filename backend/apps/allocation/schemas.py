
from datetime import date, datetime
from uuid import UUID

from ninja import Schema


class AllocationIn(Schema):
    asset_id: UUID
    employee_id: UUID | None = None
    department_id: UUID | None = None
    expected_return_date: date | None = None


class ReturnIn(Schema):
    return_condition: str | None = None
    return_notes: str | None = None


class AllocationOut(Schema):
    id: UUID
    asset_id: UUID
    asset_tag: str | None = None
    employee_id: UUID | None = None
    employee_name: str | None = None
    department_id: UUID | None = None
    allocated_by_id: UUID
    allocated_at: datetime
    expected_return_date: date | None = None
    returned_at: datetime | None = None
    return_condition: str | None = None
    is_overdue: bool = False

    @staticmethod
    def resolve_asset_tag(obj):
        return obj.asset.asset_tag if obj.asset_id else None

    @staticmethod
    def resolve_employee_name(obj):
        return obj.employee.full_name if obj.employee_id else None

    @staticmethod
    def resolve_is_overdue(obj):
        from django.utils import timezone
        return bool(
            obj.returned_at is None
            and obj.expected_return_date
            and obj.expected_return_date < timezone.now().date()
        )


class TransferIn(Schema):
    asset_id: UUID
    to_employee_id: UUID | None = None
    to_department_id: UUID | None = None
    reason: str | None = None


class TransferDecisionIn(Schema):
    approve: bool
    note: str | None = None


class TransferOut(Schema):
    id: UUID
    asset_id: UUID
    asset_tag: str | None = None
    from_allocation_id: UUID
    requested_by_id: UUID
    to_employee_id: UUID | None = None
    to_department_id: UUID | None = None
    reason: str | None = None
    status: str
    decided_by_id: UUID | None = None
    decided_at: datetime | None = None
    decision_note: str | None = None
    created_at: datetime

    @staticmethod
    def resolve_asset_tag(obj):
        return obj.asset.asset_tag if obj.asset_id else None
