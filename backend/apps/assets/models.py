import uuid

from django.db import models

from core.enums import AssetCondition, AssetStatus


class Asset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey("organization.Organization", on_delete=models.PROTECT, related_name="assets")
    # Filled by the DB trigger (AF-0001, AF-0002 …) when blank on insert.
    asset_tag = models.TextField(blank=True, default="")
    name = models.TextField()
    category = models.ForeignKey(
        "organization.AssetCategory", on_delete=models.PROTECT, related_name="assets"
    )
    serial_number = models.TextField(null=True, blank=True)
    acquisition_date = models.DateField(null=True, blank=True)
    acquisition_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    condition = models.CharField(
        max_length=16, choices=AssetCondition.choices, default=AssetCondition.GOOD
    )
    status = models.CharField(
        max_length=20, choices=AssetStatus.choices, default=AssetStatus.AVAILABLE
    )
    location = models.TextField(null=True, blank=True)
    department = models.ForeignKey(
        "organization.Department",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assets",
    )
    is_bookable = models.BooleanField(default=False)
    custom_fields = models.JSONField(default=dict)
    photo_url = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_assets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "assets"
        constraints = [
            models.UniqueConstraint(fields=["org", "asset_tag"], name="asset_tag_unique"),
            models.UniqueConstraint(fields=["org", "serial_number"], name="asset_serial_unique"),
        ]
        indexes = [
            models.Index(fields=["org", "status"], name="idx_assets_status"),
            models.Index(fields=["org", "category"], name="idx_assets_category"),
            models.Index(fields=["org", "department"], name="idx_assets_dept"),
        ]

    def __str__(self):
        return f"{self.asset_tag or '(untagged)'} — {self.name}"


class AssetDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="documents")
    file_url = models.TextField()
    label = models.TextField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "asset_documents"
