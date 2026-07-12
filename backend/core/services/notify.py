"""
Notification outbox. `notify(...)` writes a `notifications` row (never sends email
directly) — a future worker fans these out to email/Slack. Called in the same
transaction as the mutation that triggered it.
"""
from __future__ import annotations

from uuid import UUID


def notify(
    *,
    org_id: UUID,
    recipient,  # Employee
    type: str,  # notif_type value
    title: str,
    body: str | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
):
    from apps.activity.models import Notification

    if recipient is None:
        return None
    return Notification.objects.create(
        org_id=org_id,
        recipient=recipient,
        type=type,
        title=title,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
    )
