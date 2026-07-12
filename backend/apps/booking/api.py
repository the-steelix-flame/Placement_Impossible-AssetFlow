
from datetime import datetime
from uuid import UUID

from ninja import Query, Router

from apps.booking import services
from apps.booking.models import Booking
from apps.booking.schemas import BookingIn, BookingOut
from core.auth import supabase_auth

router = Router(auth=supabase_auth, tags=["booking"])


@router.get("/bookings", response=list[BookingOut])
def list_bookings(
    request,
    asset: UUID | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    mine: bool = Query(False),
):
    qs = (
        Booking.objects.filter(org=request.employee.org)
        .select_related("asset", "booked_by")
        .order_by("starts_at")
    )
    if asset:
        qs = qs.filter(asset_id=asset)
    if date_from:
        qs = qs.filter(ends_at__gte=date_from)
    if date_to:
        qs = qs.filter(starts_at__lte=date_to)
    if mine:
        qs = qs.filter(booked_by=request.employee)
    return list(qs)


@router.post("/bookings", response={201: BookingOut})
def create_booking(request, payload: BookingIn):
    booking = services.create_booking(
        actor=request.employee, org=request.employee.org, data=payload.dict()
    )
    return 201, booking


@router.post("/bookings/{booking_id}/cancel", response=BookingOut)
def cancel_booking(request, booking_id: UUID):
    booking = services.get_booking(request.employee.org, booking_id)
    return services.cancel_booking(actor=request.employee, booking=booking)
