from django.contrib import admin

from apps.maintenance.models import MaintenanceRequest


@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = ("asset", "title", "priority", "status", "raised_by", "technician_name")
    list_filter = ("status", "priority")
    search_fields = ("asset__asset_tag", "title")
