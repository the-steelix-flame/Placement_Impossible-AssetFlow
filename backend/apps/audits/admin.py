from django.contrib import admin

from apps.audits.models import AuditAssignment, AuditCycle, AuditItem


class AuditAssignmentInline(admin.TabularInline):
    model = AuditAssignment
    extra = 0


@admin.register(AuditCycle)
class AuditCycleAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "scope_department", "starts_on", "ends_on", "closed_at")
    list_filter = ("status",)
    inlines = [AuditAssignmentInline]


@admin.register(AuditItem)
class AuditItemAdmin(admin.ModelAdmin):
    list_display = ("cycle", "asset", "result", "checked_by", "checked_at")
    list_filter = ("result",)
