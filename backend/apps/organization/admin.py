from django.contrib import admin

from apps.organization.models import (
    AssetCategory,
    Department,
    Organization,
    RoleJoinCode,
    SignupRequest,
)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "created_at")


@admin.register(RoleJoinCode)
class RoleJoinCodeAdmin(admin.ModelAdmin):
    list_display = ("org", "role", "status", "last_rotated_at", "created_by")
    list_filter = ("role", "status")


@admin.register(SignupRequest)
class SignupRequestAdmin(admin.ModelAdmin):
    list_display = ("email", "org", "requested_role", "status", "employee", "created_at")
    list_filter = ("status", "requested_role")
    search_fields = ("email", "full_name")


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
