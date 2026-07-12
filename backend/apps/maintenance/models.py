import uuid

from django.db import models

from core.enums import MaintPriority, MaintStatus


class MaintenanceRequest(models.Model):
    """
    Approval workflow: PENDING → APPROVED → ASSIGNED → IN_PROGRESS → RESOLVED
    (or REJECTED / CANCELLED). The partial unique index `uniq_open_maintenance`
    (db/schema.sql) permits only one open ticket per asset.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey("organization.Organization", on_delete=models.PROTECT)
    asset = models.ForeignKey(
        "assets.Asset", on_delete=models.PROTECT, related_name="maintenance_requests"
    )
    raised_by = models.ForeignKey(
        "accounts.Employee", on_delete=models.PROTECT, related_name="maintenance_raised"
    )
    title = models.TextField()
    description = models.TextField(null=True, blank=True)
    priority = models.CharField(
        max_length=16, choices=MaintPriority.choices, default=MaintPriority.MEDIUM
    )
    photo_url = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=MaintStatus.choices, default=MaintStatus.PENDING
    )
    approved_by = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="maintenance_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(null=True, blank=True)
    technician_name = models.TextField(null=True, blank=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "maintenance_requests"
        indexes = [
            models.Index(fields=["org", "status"], name="idx_maint_status"),
        ]
