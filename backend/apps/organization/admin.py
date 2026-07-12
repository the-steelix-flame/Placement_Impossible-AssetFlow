from django.contrib import admin

from apps.organization.models import AssetCategory, Department, Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "parent", "head", "status")
    list_filter = ("status",)
    search_fields = ("name", "code")


@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "status")
    list_filter = ("status",)
    search_fields = ("name",)
