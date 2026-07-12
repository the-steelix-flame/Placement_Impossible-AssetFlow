"""
Audit cycles. start() snapshots in-scope assets into audit_items; close() locks
the cycle (DB trigger enforces immutability), then applies effects: confirmed
MISSING → asset LOST, DAMAGED → auto-created maintenance request.
"""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.assets import services as assets_services
from apps.assets.models import Asset
from apps.audits.models import AuditAssignment, AuditCycle, AuditItem
from apps.maintenance import services as maint_services
from core.exceptions import Conflict, NotFound, ValidationError
from core.services.activity import log_activity
from core.services.notify import notify


def get_cycle(org, cycle_id) -> AuditCycle:
    c = AuditCycle.objects.filter(org=org, id=cycle_id).select_related("scope_department").first()
    if not c:
        raise NotFound("Audit cycle not found.")
    return c


@transaction.atomic
def create_cycle(*, actor, org, data: dict) -> AuditCycle:
    if data["ends_on"] < data["starts_on"]:
        raise ValidationError("Cycle end date must be on or after the start date.")
    cycle = AuditCycle.objects.create(
        org=org, name=data["name"],
        scope_department_id=data.get("scope_department_id"),
        scope_location=data.get("scope_location"),
        starts_on=data["starts_on"], ends_on=data["ends_on"],
        created_by=actor,
    )
    for auditor_id in data.get("auditor_ids") or []:
        AuditAssignment.objects.get_or_create(cycle=cycle, auditor_id=auditor_id)
    log_activity(org_id=org.id, actor=actor, action="audit.created",
                 entity_type="audit", entity_id=cycle.id, metadata={"name": cycle.name})
    return cycle


@transaction.atomic
def start_cycle(*, actor, cycle: AuditCycle) -> AuditCycle:
    if cycle.status != "DRAFT":
        raise Conflict(f"Cannot start a cycle that is {cycle.status}.")

    assets = Asset.objects.filter(org=cycle.org).exclude(status__in=["DISPOSED"])
    if cycle.scope_department_id:
        assets = assets.filter(department_id=cycle.scope_department_id)
    if cycle.scope_location:
        assets = assets.filter(location=cycle.scope_location)

    items = [AuditItem(cycle=cycle, asset=a) for a in assets]
    AuditItem.objects.bulk_create(items, ignore_conflicts=True)

    cycle.status = "IN_PROGRESS"
    cycle.save(update_fields=["status"])

    for assignment in cycle.assignments.select_related("auditor"):
        notify(org_id=cycle.org_id, recipient=assignment.auditor, type="AUDIT_ASSIGNED",
               title=f"You are assigned to audit '{cycle.name}'",
               entity_type="audit", entity_id=cycle.id)
    log_activity(org_id=cycle.org_id, actor=actor, action="audit.started",
                 entity_type="audit", entity_id=cycle.id, metadata={"item_count": len(items)})
    return cycle


def get_item(org, item_id) -> AuditItem:
    item = (
        AuditItem.objects.filter(cycle__org=org, id=item_id)
        .select_related("cycle", "asset")
        .first()
    )
    if not item:
        raise NotFound("Audit item not found.")
    return item


@transaction.atomic
def update_item(*, actor, item: AuditItem, data: dict) -> AuditItem:
    if item.cycle.status == "CLOSED":
        raise Conflict("Audit cycle is closed and locked.")
    if "result" in data and data["result"]:
        item.result = data["result"]
    if "notes" in data:
        item.notes = data["notes"]
    item.checked_by = actor
    item.checked_at = timezone.now()
    try:
        item.save(update_fields=["result", "notes", "checked_by", "checked_at"])
    except IntegrityError as exc:
        raise Conflict("Audit cycle is closed and locked.") from exc
    return item


@transaction.atomic
def close_cycle(*, actor, cycle: AuditCycle) -> AuditCycle:
    if cycle.status != "IN_PROGRESS":
        raise Conflict(f"Cannot close a cycle that is {cycle.status}.")

    missing = 0
    damaged = 0
    for item in cycle.items.select_related("asset"):
        if item.result == "MISSING":
            if item.asset.status not in ("LOST", "DISPOSED"):
                assets_services.transition(item.asset, "LOST", actor=actor, reason="audit: missing")
            missing += 1
        elif item.result == "DAMAGED":
            maint_services.create_from_audit(
                actor=actor, org=cycle.org, asset=item.asset,
                title=f"Damage found in audit '{cycle.name}'",
                description=item.notes or "Flagged DAMAGED during audit.",
            )
            damaged += 1

    cycle.status = "CLOSED"
    cycle.closed_by = actor
    cycle.closed_at = timezone.now()
    cycle.save(update_fields=["status", "closed_by", "closed_at"])

    log_activity(org_id=cycle.org_id, actor=actor, action="audit.closed",
                 entity_type="audit", entity_id=cycle.id,
                 metadata={"missing": missing, "damaged": damaged})
    if missing or damaged:
        notify(org_id=cycle.org_id, recipient=cycle.created_by, type="AUDIT_DISCREPANCY",
               title=f"Audit '{cycle.name}' closed with discrepancies",
               body=f"{missing} missing, {damaged} damaged.",
               entity_type="audit", entity_id=cycle.id)
    return cycle


def discrepancies(cycle: AuditCycle):
    return list(
        cycle.items.filter(result__in=["MISSING", "DAMAGED"]).select_related("asset")
    )
