import uuid

from django.db import models

from core.enums import AuditCycleStatus, AuditResult


class AuditCycle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey("organization.Organization", on_delete=models.PROTECT)
    name = models.TextField()
    scope_department = models.ForeignKey(
        "organization.Department", null=True, blank=True, on_delete=models.SET_NULL
    )  # NULL = whole org
    scope_location = models.TextField(null=True, blank=True)
    starts_on = models.DateField()
    ends_on = models.DateField()
    status = models.CharField(
        max_length=16, choices=AuditCycleStatus.choices, default=AuditCycleStatus.DRAFT
    )
    created_by = models.ForeignKey(
        "accounts.Employee", on_delete=models.PROTECT, related_name="audit_cycles_created"
    )
    closed_by = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="audit_cycles_closed",
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_cycles"


class AuditAssignment(models.Model):
    cycle = models.ForeignKey(
        AuditCycle, on_delete=models.CASCADE, related_name="assignments"
    )
    auditor = models.ForeignKey(
        "accounts.Employee", on_delete=models.CASCADE, related_name="audit_assignments"
    )

    class Meta:
        db_table = "audit_assignments"
        constraints = [
            models.UniqueConstraint(fields=["cycle", "auditor"], name="audit_assignment_pk"),
        ]


class AuditItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(AuditCycle, on_delete=models.CASCADE, related_name="items")
    asset = models.ForeignKey("assets.Asset", on_delete=models.PROTECT, related_name="audit_items")
    result = models.CharField(
        max_length=16, choices=AuditResult.choices, default=AuditResult.PENDING
    )
    notes = models.TextField(null=True, blank=True)
    checked_by = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL
    )
    checked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "audit_items"
        constraints = [
            models.UniqueConstraint(fields=["cycle", "asset"], name="audit_item_unique"),
        ]
