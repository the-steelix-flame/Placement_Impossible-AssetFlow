import uuid

from django.db import models

from core.enums import NotifType


class Notification(models.Model):
    """Outbox pattern — rows written here; a future worker fans out to email/Slack."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey("organization.Organization", on_delete=models.PROTECT)
    recipient = models.ForeignKey(
        "accounts.Employee", on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=32, choices=NotifType.choices)
    title = models.TextField()
    body = models.TextField(null=True, blank=True)
    entity_type = models.TextField(null=True, blank=True)  # 'asset'|'booking'|'maintenance'|…
    entity_id = models.UUIDField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"


class ActivityLog(models.Model):
    """Append-only. UPDATE/DELETE revoked at the DB level (db/schema.sql)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey("organization.Organization", on_delete=models.PROTECT)
    actor = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL
    )  # NULL = system action
    action = models.TextField()  # 'asset.created', 'transfer.approved', …
    entity_type = models.TextField()
    entity_id = models.UUIDField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "activity_logs"
        indexes = [
            models.Index(
                fields=["entity_type", "entity_id", "-created_at"], name="idx_activity_entity"
            ),
        ]
