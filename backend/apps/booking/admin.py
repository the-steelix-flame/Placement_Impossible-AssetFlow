from django.contrib import admin

from apps.booking.models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("asset", "booked_by", "starts_at", "ends_at", "status")
    list_filter = ("status",)
    search_fields = ("asset__asset_tag", "purpose")
