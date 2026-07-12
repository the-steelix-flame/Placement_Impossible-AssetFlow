"""
Allocation, transfer, return. The double-allocation rule is guaranteed by the
`uniq_open_allocation` partial unique index (db/schema.sql). We pre-check to build
a friendly "held by <name>" 409, and still catch the index violation as a race
fallback so concurrency can't slip a second open allocation through.
"""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.allocation.models import Allocation, TransferRequest
from apps.assets import services as assets_services
from apps.assets.models import Asset
from core.exceptions import AllocationConflict, Conflict, NotFound, ValidationError
from core.services.activity import log_activity
from core.services.notify import notify


def _open_allocation(asset_id):
    return (
        Allocation.objects.filter(asset_id=asset_id, returned_at__isnull=True)
        .select_related("employee", "department")
        .first()
    )


def _holder_of(alloc: Allocation) -> tuple[str, str | None]:
    if alloc.employee_id:
        return alloc.employee.full_name, str(alloc.employee_id)
    if alloc.department_id:
        return alloc.department.name, None
    return "Unknown", None


def get_allocation(org, allocation_id) -> Allocation:
    alloc = (
        Allocation.objects.filter(org=org, id=allocation_id)
        .select_related("asset", "employee", "department")
        .first()
    )
    if not alloc:
        raise NotFound("Allocation not found.")
    return alloc


@transaction.atomic
def allocate(*, actor, org, data: dict) -> Allocation:
    # Lock the asset row so concurrent allocations serialize.
    asset = Asset.objects.select_for_update().filter(org=org, id=data["asset_id"]).first()
    if not asset:
        raise NotFound("Asset not found.")
    if asset.status in ("LOST", "RETIRED", "DISPOSED"):
        raise ValidationError(f"Asset is {asset.status} and cannot be allocated.")

    employee_id = data.get("employee_id")
    department_id = data.get("department_id")
    if bool(employee_id) == bool(department_id):
        raise ValidationError("Allocate to exactly one of employee or department.")

    existing = _open_allocation(asset.id)
    if existing:
        holder, holder_id = _holder_of(existing)
        raise AllocationConflict(holder=holder, holder_id=holder_id)

    try:
        with transaction.atomic():
            alloc = Allocation.objects.create(
                org=org,
                asset=asset,
                employee_id=employee_id,
                department_id=department_id,
                allocated_by=actor,
                expected_return_date=data.get("expected_return_date"),
            )
    except IntegrityError as exc:
        raise AllocationConflict(holder="another user (concurrent allocation)") from exc

    assets_services.transition(asset, "ALLOCATED", actor=actor, reason="allocated")

    log_activity(
        org_id=org.id, actor=actor, action="allocation.created",
        entity_type="allocation", entity_id=alloc.id,
        metadata={"asset_tag": asset.asset_tag},
    )
    if alloc.employee_id:
        notify(
            org_id=org.id, recipient=alloc.employee, type="ASSET_ASSIGNED",
            title=f"{asset.asset_tag} assigned to you",
            body=asset.name, entity_type="asset", entity_id=asset.id,
        )
    return alloc


@transaction.atomic
def return_allocation(*, actor, alloc: Allocation, condition: str | None, notes: str | None) -> Allocation:
    if alloc.returned_at is not None:
        raise Conflict("Allocation is already returned.")
    alloc.returned_at = timezone.now()
    alloc.return_condition = condition
    alloc.return_notes = notes
    alloc.save(update_fields=["returned_at", "return_condition", "return_notes"])

    asset = alloc.asset
    if condition:
        asset.condition = condition
        asset.save(update_fields=["condition", "updated_at"])
    # Only flip to AVAILABLE if not currently under maintenance / terminal.
    if asset.status == "ALLOCATED":
        assets_services.transition(asset, "AVAILABLE", actor=actor, reason="returned")

    log_activity(
        org_id=alloc.org_id, actor=actor, action="allocation.returned",
        entity_type="allocation", entity_id=alloc.id,
        metadata={"condition": condition},
    )
    if alloc.employee_id:
        notify(
            org_id=alloc.org_id, recipient=alloc.employee, type="ASSET_RETURNED",
            title=f"{asset.asset_tag} returned",
            body=f"Condition recorded: {condition or 'n/a'}",
            entity_type="asset", entity_id=asset.id,
        )
    return alloc


# ── Transfers ──────────────────────────────────────────────────────────
def get_transfer(org, transfer_id) -> TransferRequest:
    t = (
        TransferRequest.objects.filter(org=org, id=transfer_id)
        .select_related("asset", "from_allocation", "requested_by", "to_employee", "to_department")
        .first()
    )
    if not t:
        raise NotFound("Transfer request not found.")
    return t


@transaction.atomic
def request_transfer(*, actor, org, data: dict) -> TransferRequest:
    asset = Asset.objects.filter(org=org, id=data["asset_id"]).first()
    if not asset:
        raise NotFound("Asset not found.")
    current = _open_allocation(asset.id)
    if not current:
        raise ValidationError("Asset has no active allocation to transfer from.")

    to_employee_id = data.get("to_employee_id")
    to_department_id = data.get("to_department_id")
    if bool(to_employee_id) == bool(to_department_id):
        raise ValidationError("Transfer to exactly one of employee or department.")

    try:
        with transaction.atomic():
            transfer = TransferRequest.objects.create(
                org=org,
                asset=asset,
                from_allocation=current,
                requested_by=actor,
                to_employee_id=to_employee_id,
                to_department_id=to_department_id,
                reason=data.get("reason"),
            )
    except IntegrityError as exc:
        raise Conflict("A transfer request is already pending for this asset.") from exc

    log_activity(
        org_id=org.id, actor=actor, action="transfer.requested",
        entity_type="transfer", entity_id=transfer.id,
        metadata={"asset_tag": asset.asset_tag},
    )
    if current.employee_id:
        notify(
            org_id=org.id, recipient=current.employee, type="TRANSFER_REQUESTED",
            title=f"Transfer requested for {asset.asset_tag}",
            body=data.get("reason") or "", entity_type="transfer", entity_id=transfer.id,
        )
    return transfer


@transaction.atomic
def decide_transfer(*, actor, transfer: TransferRequest, approve: bool, note: str | None) -> TransferRequest:
    if transfer.status != "REQUESTED":
        raise Conflict(f"Transfer already {transfer.status}.")
    transfer.decided_by = actor
    transfer.decided_at = timezone.now()
    transfer.decision_note = note

    if not approve:
        transfer.status = "REJECTED"
        transfer.save(update_fields=["status", "decided_by", "decided_at", "decision_note"])
        log_activity(
            org_id=transfer.org_id, actor=actor, action="transfer.rejected",
            entity_type="transfer", entity_id=transfer.id,
        )
        notify(
            org_id=transfer.org_id, recipient=transfer.requested_by, type="TRANSFER_REJECTED",
            title=f"Transfer rejected for {transfer.asset.asset_tag}",
            body=note or "", entity_type="transfer", entity_id=transfer.id,
        )
        return transfer

    # Approve: close the old allocation, open the new one (asset stays ALLOCATED).
    old = transfer.from_allocation
    if old.returned_at is None:
        old.returned_at = timezone.now()
        old.return_notes = "Closed by transfer"
        old.save(update_fields=["returned_at", "return_notes"])

    Allocation.objects.create(
        org=transfer.org,
        asset=transfer.asset,
        employee_id=transfer.to_employee_id,
        department_id=transfer.to_department_id,
        allocated_by=actor,
    )
    transfer.status = "COMPLETED"
    transfer.save(update_fields=["status", "decided_by", "decided_at", "decision_note"])

    log_activity(
        org_id=transfer.org_id, actor=actor, action="transfer.approved",
        entity_type="transfer", entity_id=transfer.id,
    )
    notify(
        org_id=transfer.org_id, recipient=transfer.requested_by, type="TRANSFER_APPROVED",
        title=f"Transfer approved for {transfer.asset.asset_tag}",
        body=note or "", entity_type="transfer", entity_id=transfer.id,
    )
    if transfer.to_employee_id:
        notify(
            org_id=transfer.org_id, recipient=transfer.to_employee, type="ASSET_ASSIGNED",
            title=f"{transfer.asset.asset_tag} assigned to you",
            body="Received via transfer", entity_type="asset", entity_id=transfer.asset_id,
        )
    return transfer
