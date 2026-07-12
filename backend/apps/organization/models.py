import uuid

from django.db import models

from core.enums import RecordStatus


class Organization(models.Model):
    """Tenancy root. v1 seeds exactly one row; every business table carries org_id."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "organizations"

    def __str__(self):
        return self.name


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="departments")
    name = models.TextField()
    code = models.TextField()  # short code e.g. "ENG"
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="children"
    )
    head = models.ForeignKey(
        "accounts.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="heads_departments",
    )
    status = models.CharField(
        max_length=16, choices=RecordStatus.choices, default=RecordStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "departments"
        constraints = [
            models.UniqueConstraint(fields=["org", "name"], name="dept_name_unique"),
            models.UniqueConstraint(fields=["org", "code"], name="dept_code_unique"),
        ]

    def __str__(self):
        return f"{self.code} — {self.name}"


class AssetCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="categories")
    name = models.TextField()
    description = models.TextField(null=True, blank=True)
    # e.g. [{"key":"warranty_months","label":"Warranty (months)","type":"number"}]
    field_schema = models.JSONField(default=list)
    status = models.CharField(
        max_length=16, choices=RecordStatus.choices, default=RecordStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "asset_categories"
        verbose_name_plural = "asset categories"
        constraints = [
            models.UniqueConstraint(fields=["org", "name"], name="cat_name_unique"),
        ]

    def __str__(self):
        return self.name
