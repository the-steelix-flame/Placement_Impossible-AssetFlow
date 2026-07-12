"""
Append-only activity log. Call `log_activity(...)` inside the SAME transaction as
every mutation so history and state never diverge.
"""
from __future__ import annotations

from uuid import UUID


def log_activity(
    *,
    org_id: UUID,
    actor,  # Employee | None (None = system action)
    action: str,  # 'asset.created', 'transfer.approved', ...
    entity_type: str,
    entity_id: UUID | None = None,
    metadata: dict | None = None,
):
    from apps.activity.models import ActivityLog

    return ActivityLog.objects.create(
        org_id=org_id,
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata or {},
    )
