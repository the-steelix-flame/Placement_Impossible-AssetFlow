"""
Maintenance workflow. Each step validates the current status, drives the asset's
lifecycle via assets.transition(), and logs + notifies. Approval takes the asset
UNDER_MAINTENANCE; resolve returns it to ALLOCATED (if still held) or AVAILABLE.
"""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.assets import services as assets_services
from apps.assets.models import Asset
from apps.maintenance.models import MaintenanceRequest
from core.exceptions import Conflict, NotFound, ValidationError
from core.services.activity import log_activity
from core.services.notify import notify

OPEN_STATES = ("PENDING", "APPROVED", "ASSIGNED", "IN_PROGRESS")


def get_request(org, request_id) -> MaintenanceRequest:
    m = (
        MaintenanceRequest.objects.filter(org=org, id=request_id)
        .select_related("asset", "raised_by")
        .first()
    )
    if not m:
        raise NotFound("Maintenance request not found.")
    return m


def _has_open_allocation(asset: Asset) -> bool:
    from apps.allocation.models import Allocation
    return Allocation.objects.filter(asset=asset, returned_at__isnull=True).exists()


@transaction.atomic
def raise_request(*, actor, org, data: dict) -> MaintenanceRequest:
    asset = Asset.objects.filter(org=org, id=data["asset_id"]).first()
    if not asset:
        raise NotFound("Asset not found.")
    try:
        with transaction.atomic():
            m = MaintenanceRequest.objects.create(
                org=org, asset=asset, raised_by=actor,
                title=data["title"], description=data.get("description"),
                priority=data.get("priority") or "MEDIUM", photo_url=data.get("photo_url"),
            )
    except IntegrityError as exc:
        raise Conflict("An open maintenance request already exists for this asset.") from exc
    log_activity(
        org_id=org.id, actor=actor, action="maintenance.raised",
        entity_type="maintenance", entity_id=m.id,
        metadata={"asset_tag": asset.asset_tag, "title": m.title},
    )
    return m


@transaction.atomic
def approve(*, actor, m: MaintenanceRequest) -> MaintenanceRequest:
    if m.status != "PENDING":
        raise Conflict(f"Cannot approve a request that is {m.status}.")
    m.status = "APPROVED"
    m.approved_by = actor
    m.approved_at = timezone.now()
    m.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
    assets_services.transition(m.asset, "UNDER_MAINTENANCE", actor=actor, reason="maintenance approved")
    log_activity(org_id=m.org_id, actor=actor, action="maintenance.approved",
                 entity_type="maintenance", entity_id=m.id)
    notify(org_id=m.org_id, recipient=m.raised_by, type="MAINT_APPROVED",
           title=f"Maintenance approved for {m.asset.asset_tag}", entity_type="maintenance", entity_id=m.id)
    return m


@transaction.atomic
def reject(*, actor, m: MaintenanceRequest, reason: str | None) -> MaintenanceRequest:
    if m.status != "PENDING":
        raise Conflict(f"Cannot reject a request that is {m.status}.")
    m.status = "REJECTED"
    m.rejection_reason = reason
    m.save(update_fields=["status", "rejection_reason", "updated_at"])
    log_activity(org_id=m.org_id, actor=actor, action="maintenance.rejected",
                 entity_type="maintenance", entity_id=m.id, metadata={"reason": reason})
    notify(org_id=m.org_id, recipient=m.raised_by, type="MAINT_REJECTED",
           title=f"Maintenance rejected for {m.asset.asset_tag}", body=reason or "",
           entity_type="maintenance", entity_id=m.id)
    return m


@transaction.atomic
def assign(*, actor, m: MaintenanceRequest, technician_name: str) -> MaintenanceRequest:
    if m.status != "APPROVED":
        raise Conflict(f"Cannot assign a request that is {m.status}.")
    if not technician_name:
        raise ValidationError("technician_name is required.")
    m.status = "ASSIGNED"
    m.technician_name = technician_name
    m.assigned_at = timezone.now()
    m.save(update_fields=["status", "technician_name", "assigned_at", "updated_at"])
    log_activity(org_id=m.org_id, actor=actor, action="maintenance.assigned",
                 entity_type="maintenance", entity_id=m.id, metadata={"technician": technician_name})
    return m


@transaction.atomic
def start(*, actor, m: MaintenanceRequest) -> MaintenanceRequest:
    if m.status != "ASSIGNED":
        raise Conflict(f"Cannot start a request that is {m.status}.")
    m.status = "IN_PROGRESS"
    m.started_at = timezone.now()
    m.save(update_fields=["status", "started_at", "updated_at"])
    log_activity(org_id=m.org_id, actor=actor, action="maintenance.started",
                 entity_type="maintenance", entity_id=m.id)
    return m


@transaction.atomic
def resolve(*, actor, m: MaintenanceRequest, notes: str | None) -> MaintenanceRequest:
    if m.status not in ("ASSIGNED", "IN_PROGRESS"):
        raise Conflict(f"Cannot resolve a request that is {m.status}.")
    m.status = "RESOLVED"
    m.resolved_at = timezone.now()
    m.resolution_notes = notes
    m.save(update_fields=["status", "resolved_at", "resolution_notes", "updated_at"])

    if m.asset.status == "UNDER_MAINTENANCE":
        target = "ALLOCATED" if _has_open_allocation(m.asset) else "AVAILABLE"
        assets_services.transition(m.asset, target, actor=actor, reason="maintenance resolved")

    log_activity(org_id=m.org_id, actor=actor, action="maintenance.resolved",
                 entity_type="maintenance", entity_id=m.id)
    notify(org_id=m.org_id, recipient=m.raised_by, type="MAINT_RESOLVED",
           title=f"Maintenance resolved for {m.asset.asset_tag}", body=notes or "",
           entity_type="maintenance", entity_id=m.id)
    return m


@transaction.atomic
def create_from_audit(*, actor, org, asset, title: str, description: str) -> MaintenanceRequest | None:
    """Used by audit close when an asset is DAMAGED. Skips if one is already open."""
    if MaintenanceRequest.objects.filter(asset=asset, status__in=OPEN_STATES).exists():
        return None
    m = MaintenanceRequest.objects.create(
        org=org, asset=asset, raised_by=actor,
        title=title, description=description, priority="HIGH",
    )
    log_activity(org_id=org.id, actor=actor, action="maintenance.raised",
                 entity_type="maintenance", entity_id=m.id,
                 metadata={"source": "audit", "asset_tag": asset.asset_tag})
    return m
