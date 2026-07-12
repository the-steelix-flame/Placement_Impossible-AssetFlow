"""
Domain exceptions. Each carries the data the frontend needs and is mapped to an
HTTP status + response envelope by the handlers in `config/api.py`.
"""
from __future__ import annotations


class DomainError(Exception):
    """Base for business-rule violations. `status` + `code` drive the HTTP response."""

    status: int = 400
    code: str = "domain_error"

    def __init__(self, detail: str, **extra):
        super().__init__(detail)
        self.detail = detail
        self.extra = extra  # merged into the JSON body (e.g. holder, suggestion, next_slot)


class PermissionDenied(DomainError):
    status = 403
    code = "forbidden"


class NotFound(DomainError):
    status = 404
    code = "not_found"


class ValidationError(DomainError):
    status = 422
    code = "validation_error"


class Conflict(DomainError):
    """Generic 409."""

    status = 409
    code = "conflict"


class AllocationConflict(Conflict):
    """Asset already has an open allocation. Carries holder + a TRANSFER suggestion."""

    code = "allocation_conflict"

    def __init__(self, holder: str, holder_id: str | None = None):
        super().__init__(
            detail=f"Asset is currently held by {holder}.",
            holder=holder,
            holder_id=holder_id,
            suggestion="TRANSFER",
        )


class BookingOverlap(Conflict):
    """Requested slot overlaps a confirmed booking. Carries the next free slot."""

    code = "booking_overlap"

    def __init__(self, next_slot: dict | None = None):
        super().__init__(
            detail="Requested time overlaps an existing booking.",
            next_slot=next_slot,
            suggestion="NEXT_SLOT" if next_slot else None,
        )


class IllegalTransition(Conflict):
    code = "illegal_transition"

    def __init__(self, from_status: str, to_status: str):
        super().__init__(
            detail=f"Illegal asset lifecycle transition: {from_status} -> {to_status}.",
            from_status=from_status,
            to_status=to_status,
        )
