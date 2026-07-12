"""
Asset registry + lifecycle. `transition()` is the ONLY function anywhere that
mutates `asset.status` — every other app calls it (grep-able guarantee). The DB
trigger `guard_asset_transition` is the real enforcer; this maps its rejection to
a clean 409 IllegalTransition.
"""
from __future__ import annotations

from django.db import IntegrityError, transaction

from apps.assets.models import Asset
from core.exceptions import IllegalTransition, NotFound
from core.services.activity import log_activity


def get_asset(org, asset_id) -> Asset:
    asset = (
        Asset.objects.filter(org=org, id=asset_id)
        .select_related("category", "department")
        .first()
    )
    if not asset:
        raise NotFound("Asset not found.")
    return asset


def transition(asset: Asset, new_status: str, *, actor=None, reason: str | None = None) -> Asset:
    """Change asset.status, honouring the DB state-machine. Logs the change."""
    old_status = asset.status
    if old_status == new_status:
        return asset
    asset.status = new_status
    try:
        asset.save(update_fields=["status", "updated_at"])
    except IntegrityError as exc:
        raise IllegalTransition(old_status, new_status) from exc
    log_activity(
        org_id=asset.org_id, actor=actor, action="asset.status_changed",
        entity_type="asset", entity_id=asset.id,
        metadata={"from": old_status, "to": new_status, "reason": reason},
    )
    return asset


@transaction.atomic
def create_asset(*, actor, org, data: dict) -> Asset:
    asset = Asset.objects.create(
        org=org,
        name=data["name"],
        category_id=data["category_id"],
        serial_number=data.get("serial_number"),
        acquisition_date=data.get("acquisition_date"),
        acquisition_cost=data.get("acquisition_cost"),
        condition=data.get("condition") or "GOOD",
        location=data.get("location"),
        department_id=data.get("department_id"),
        is_bookable=data.get("is_bookable") or False,
        custom_fields=data.get("custom_fields") or {},
        photo_url=data.get("photo_url"),
        created_by=actor,
    )
    asset.refresh_from_db()  # pick up trigger-assigned asset_tag
    log_activity(
        org_id=org.id, actor=actor, action="asset.created",
        entity_type="asset", entity_id=asset.id,
        metadata={"asset_tag": asset.asset_tag, "name": asset.name},
    )
    return asset


@transaction.atomic
def update_asset(*, actor, asset: Asset, data: dict) -> Asset:
    editable = (
        "name", "serial_number", "acquisition_date", "acquisition_cost",
        "condition", "location", "photo_url",
    )
    for field in editable:
        if field in data and data[field] is not None:
            setattr(asset, field, data[field])
    if "category_id" in data and data["category_id"]:
        asset.category_id = data["category_id"]
    if "department_id" in data:
        asset.department_id = data["department_id"]
    if "is_bookable" in data and data["is_bookable"] is not None:
        asset.is_bookable = data["is_bookable"]
    if "custom_fields" in data and data["custom_fields"] is not None:
        asset.custom_fields = data["custom_fields"]
    # NOTE: status is intentionally NOT editable here — use transition().
    asset.save()
    log_activity(
        org_id=asset.org_id, actor=actor, action="asset.updated",
        entity_type="asset", entity_id=asset.id,
    )
    return asset


def build_passport(asset: Asset) -> list[dict]:
    """
    Unified lifecycle timeline for one asset: registration → allocations →
    transfers → bookings → maintenance → audits → status changes. Newest first.
    """
    from apps.activity.models import ActivityLog
    from apps.allocation.models import Allocation, TransferRequest
    from apps.booking.models import Booking
    from apps.maintenance.models import MaintenanceRequest

    events: list[dict] = []

    events.append({
        "at": asset.created_at, "kind": "REGISTERED",
        "title": f"Registered as {asset.asset_tag}",
        "detail": asset.name,
    })

    for a in Allocation.objects.filter(asset=asset).select_related("employee", "department"):
        holder = a.employee.full_name if a.employee_id else (
            a.department.name if a.department_id else "—")
        events.append({
            "at": a.allocated_at, "kind": "ALLOCATED",
            "title": f"Allocated to {holder}",
            "detail": f"Expected return: {a.expected_return_date or 'n/a'}",
        })
        if a.returned_at:
            events.append({
                "at": a.returned_at, "kind": "RETURNED",
                "title": "Returned",
                "detail": f"Condition: {a.return_condition or 'n/a'}",
            })

    for t in TransferRequest.objects.filter(asset=asset).select_related("to_employee", "to_department"):
        target = t.to_employee.full_name if t.to_employee_id else (
            t.to_department.name if t.to_department_id else "—")
        events.append({
            "at": t.created_at, "kind": "TRANSFER_REQUESTED",
            "title": f"Transfer requested → {target}",
            "detail": t.reason or "",
        })
        if t.decided_at:
            events.append({
                "at": t.decided_at, "kind": f"TRANSFER_{t.status}",
                "title": f"Transfer {t.status.lower()}",
                "detail": t.decision_note or "",
            })

    for b in Booking.objects.filter(asset=asset):
        events.append({
            "at": b.created_at, "kind": "BOOKED",
            "title": f"Booked {b.starts_at:%Y-%m-%d %H:%M} → {b.ends_at:%H:%M}",
            "detail": b.purpose or "",
        })

    for m in MaintenanceRequest.objects.filter(asset=asset):
        events.append({
            "at": m.created_at, "kind": "MAINT_RAISED",
            "title": f"Maintenance: {m.title}",
            "detail": f"Priority {m.priority}, status {m.status}",
        })
        if m.resolved_at:
            events.append({
                "at": m.resolved_at, "kind": "MAINT_RESOLVED",
                "title": "Maintenance resolved",
                "detail": m.resolution_notes or "",
            })

    for log in ActivityLog.objects.filter(entity_type="asset", entity_id=asset.id,
                                           action="asset.status_changed"):
        meta = log.metadata or {}
        events.append({
            "at": log.created_at, "kind": "STATUS_CHANGED",
            "title": f"Status {meta.get('from')} → {meta.get('to')}",
            "detail": meta.get("reason") or "",
        })

    events.sort(key=lambda e: e["at"], reverse=True)
    return events
