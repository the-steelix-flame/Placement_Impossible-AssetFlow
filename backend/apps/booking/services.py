"""
Resource booking. The overlap rule is guaranteed by the `booking_no_overlap`
exclusion constraint (db/schema.sql) on half-open ranges. On violation we compute
the next free slot of the same duration and return it in the 409 so the UI can
offer one-click rebooking.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.assets.models import Asset
from apps.booking.models import Booking
from core.exceptions import BookingOverlap, Conflict, NotFound, ValidationError
from core.services.activity import log_activity
from core.services.notify import notify


def derive_state(booking: Booking, now: datetime | None = None) -> str:
    """Upcoming / Ongoing / Completed / Cancelled — computed, never stored."""
    if booking.status == "CANCELLED":
        return "CANCELLED"
    now = now or timezone.now()
    if now < booking.starts_at:
        return "UPCOMING"
    if booking.starts_at <= now < booking.ends_at:
        return "ONGOING"
    return "COMPLETED"


def compute_next_slot(asset: Asset, start: datetime, end: datetime) -> dict:
    duration = end - start
    candidate = start
    for _ in range(200):  # safety bound
        conflicts = Booking.objects.filter(
            asset=asset, status="CONFIRMED",
            starts_at__lt=candidate + duration, ends_at__gt=candidate,
        )
        latest_end = None
        for c in conflicts:
            if latest_end is None or c.ends_at > latest_end:
                latest_end = c.ends_at
        if latest_end is None:
            return {"starts_at": candidate.isoformat(), "ends_at": (candidate + duration).isoformat()}
        candidate = latest_end
    return {"starts_at": candidate.isoformat(), "ends_at": (candidate + duration).isoformat()}


def get_booking(org, booking_id) -> Booking:
    b = Booking.objects.filter(org=org, id=booking_id).select_related("asset").first()
    if not b:
        raise NotFound("Booking not found.")
    return b


@transaction.atomic
def create_booking(*, actor, org, data: dict) -> Booking:
    asset = Asset.objects.filter(org=org, id=data["asset_id"]).first()
    if not asset:
        raise NotFound("Asset not found.")
    if not asset.is_bookable or asset.status in ("LOST", "RETIRED", "DISPOSED"):
        raise ValidationError("Asset is not a bookable shared resource.")

    starts_at = data["starts_at"]
    ends_at = data["ends_at"]
    if ends_at <= starts_at:
        raise ValidationError("Booking end must be after start.")

    try:
        # Nested savepoint: if the exclusion constraint fires, only this savepoint
        # rolls back and the outer transaction stays usable for compute_next_slot.
        with transaction.atomic():
            booking = Booking.objects.create(
                org=org, asset=asset, booked_by=actor,
                starts_at=starts_at, ends_at=ends_at, purpose=data.get("purpose"),
            )
    except IntegrityError as exc:
        next_slot = compute_next_slot(asset, starts_at, ends_at)
        raise BookingOverlap(next_slot=next_slot) from exc

    log_activity(
        org_id=org.id, actor=actor, action="booking.created",
        entity_type="booking", entity_id=booking.id,
        metadata={"asset_tag": asset.asset_tag},
    )
    notify(
        org_id=org.id, recipient=actor, type="BOOKING_CONFIRMED",
        title=f"Booking confirmed for {asset.asset_tag}",
        body=f"{starts_at:%Y-%m-%d %H:%M} → {ends_at:%H:%M}",
        entity_type="booking", entity_id=booking.id,
    )
    return booking


@transaction.atomic
def cancel_booking(*, actor, booking: Booking) -> Booking:
    if booking.status == "CANCELLED":
        raise Conflict("Booking is already cancelled.")
    booking.status = "CANCELLED"
    booking.cancelled_at = timezone.now()
    booking.save(update_fields=["status", "cancelled_at"])
    log_activity(
        org_id=booking.org_id, actor=actor, action="booking.cancelled",
        entity_type="booking", entity_id=booking.id,
    )
    notify(
        org_id=booking.org_id, recipient=booking.booked_by, type="BOOKING_CANCELLED",
        title=f"Booking cancelled for {booking.asset.asset_tag}",
        entity_type="booking", entity_id=booking.id,
    )
    return booking
