from django.contrib import admin

from apps.assets.models import Asset, AssetDocument


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("asset_tag", "name", "category", "status", "condition", "department", "is_bookable")
    list_filter = ("status", "condition", "is_bookable", "category")
    search_fields = ("asset_tag", "name", "serial_number")
    readonly_fields = ("asset_tag",)


@admin.register(AssetDocument)
class AssetDocumentAdmin(admin.ModelAdmin):
    list_display = ("asset", "label", "uploaded_by", "created_at")
