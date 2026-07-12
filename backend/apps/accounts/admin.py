from django.contrib import admin

from apps.accounts.models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    """Superuser-only directory management + bulk employee add for the demo."""

    list_display = ("full_name", "email", "role", "requested_role", "access_status", "department", "status")
    list_filter = ("role", "access_status", "status", "department")
    search_fields = ("full_name", "email")
    autocomplete_fields = ()
