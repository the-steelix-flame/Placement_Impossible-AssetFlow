"""
Enum value sets, mirroring the PostgreSQL enum types in docs/DATABASE_SCHEMA.md.

Stored as text columns with `choices` (portable, ORM-friendly); the DB-level
guarantees the schema doc's enums implied (lifecycle legality, etc.) are enforced
by triggers/constraints in db/schema.sql, not by a native enum type.
"""
from __future__ import annotations

from django.db import models


class UserRole(models.TextChoices):
    ADMIN = "ADMIN"
    ASSET_MANAGER = "ASSET_MANAGER"
    DEPT_HEAD = "DEPT_HEAD"
    EMPLOYEE = "EMPLOYEE"


class RecordStatus(models.TextChoices):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class AssetStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE"
    ALLOCATED = "ALLOCATED"
    RESERVED = "RESERVED"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"
    LOST = "LOST"
    RETIRED = "RETIRED"
    DISPOSED = "DISPOSED"


class AssetCondition(models.TextChoices):
    NEW = "NEW"
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"
    DAMAGED = "DAMAGED"


class TransferStatus(models.TextChoices):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class BookingStatus(models.TextChoices):
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class MaintStatus(models.TextChoices):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"


class MaintPriority(models.TextChoices):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AuditCycleStatus(models.TextChoices):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    CLOSED = "CLOSED"


class AuditResult(models.TextChoices):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    MISSING = "MISSING"
    DAMAGED = "DAMAGED"


class NotifType(models.TextChoices):
    ASSET_ASSIGNED = "ASSET_ASSIGNED"
    ASSET_RETURNED = "ASSET_RETURNED"
    TRANSFER_REQUESTED = "TRANSFER_REQUESTED"
    TRANSFER_APPROVED = "TRANSFER_APPROVED"
    TRANSFER_REJECTED = "TRANSFER_REJECTED"
    MAINT_APPROVED = "MAINT_APPROVED"
    MAINT_REJECTED = "MAINT_REJECTED"
    MAINT_RESOLVED = "MAINT_RESOLVED"
    BOOKING_CONFIRMED = "BOOKING_CONFIRMED"
    BOOKING_CANCELLED = "BOOKING_CANCELLED"
    BOOKING_REMINDER = "BOOKING_REMINDER"
    OVERDUE_RETURN = "OVERDUE_RETURN"
    AUDIT_ASSIGNED = "AUDIT_ASSIGNED"
    AUDIT_DISCREPANCY = "AUDIT_DISCREPANCY"
    ROLE_CHANGED = "ROLE_CHANGED"
