"""Shared Ninja schemas reused across every app."""

from typing import Generic, TypeVar
from uuid import UUID

from ninja import Schema

T = TypeVar("T")


class MessageOut(Schema):
    """Simple {message} acknowledgement for actions with no entity body."""

    message: str


class ConflictOut(Schema):
    """The 409 body used by the double-allocation and booking-overlap rules."""

    detail: str
    code: str
    holder: str | None = None
    holder_id: UUID | None = None
    suggestion: str | None = None
    next_slot: dict | None = None


class ErrorOut(Schema):
    """Generic error envelope for 4xx responses."""

    detail: str
    code: str


class PaginatedOut(Schema, Generic[T]):
    """Wraps a list result with total count for tables."""

    count: int
    results: list[T]
