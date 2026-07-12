from django.contrib import admin

from apps.allocation.models import Allocation, TransferRequest


@admin.register(Allocation)
class AllocationAdmin(admin.ModelAdmin):
    list_display = ("asset", "employee", "department", "allocated_at", "returned_at")
    list_filter = ("returned_at",)
    search_fields = ("asset__asset_tag",)


@admin.register(TransferRequest)
class TransferRequestAdmin(admin.ModelAdmin):
    list_display = ("asset", "requested_by", "status", "decided_by", "decided_at")
    list_filter = ("status",)
