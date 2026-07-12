
from datetime import datetime
from uuid import UUID

from ninja import Schema


class NotificationOut(Schema):
    id: UUID
    type: str
    title: str
    body: str | None = None
    entity_type: str | None = None
    entity_id: UUID | None = None
    is_read: bool
    created_at: datetime


class ActivityLogOut(Schema):
    id: UUID
    actor_id: UUID | None = None
    actor_name: str | None = None
    action: str
    entity_type: str
    entity_id: UUID | None = None
    metadata: dict
    created_at: datetime

    @staticmethod
    def resolve_actor_name(obj):
        return obj.actor.full_name if obj.actor_id else "System"
