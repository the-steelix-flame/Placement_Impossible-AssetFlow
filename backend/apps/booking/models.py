import uuid

from django.db import models

from core.enums import BookingStatus


class Booking(models.Model):
    """
    Shared-resource reservation. The exclusion constraint `booking_no_overlap`
    (db/schema.sql) rejects overlapping CONFIRMED bookings on half-open ranges —
    back-to-back (10:00 end / 10:00 start) is allowed. Upcoming/Ongoing/Completed
    are derived from time at read; only CONFIRMED/CANCELLED are stored.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey("organization.Organization", on_delete=models.PROTECT)
    asset = models.ForeignKey("assets.Asset", on_delete=models.PROTECT, related_name="bookings")
    booked_by = models.ForeignKey(
        "accounts.Employee", on_delete=models.PROTECT, related_name="bookings"
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    purpose = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=BookingStatus.choices, default=BookingStatus.CONFIRMED
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bookings"
        indexes = [
            models.Index(fields=["asset", "starts_at"], name="idx_bookings_time"),
        ]
