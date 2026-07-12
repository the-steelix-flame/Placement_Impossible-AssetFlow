"""
Read side: notifications, activity feed, dashboard KPIs, reports. Derived states
(overdue, booking utilisation) are computed here at query time — never stored.
"""
from __future__ import annotations

from django.db.models import Count, Q
from django.utils import timezone

from apps.allocation.models import Allocation
from apps.assets.models import Asset
from apps.booking.models import Booking
from apps.maintenance.models import MaintenanceRequest
from core.exceptions import NotFound


# ── Notifications ──────────────────────────────────────────────────────
def mark_read(*, employee, notification_id):
    from apps.activity.models import Notification
    notif = Notification.objects.filter(recipient=employee, id=notification_id).first()
    if not notif:
        raise NotFound("Notification not found.")
    if not notif.is_read:
        notif.is_read = True
        notif.save(update_fields=["is_read"])
    return notif


def mark_all_read(*, employee):
    from apps.activity.models import Notification
    return Notification.objects.filter(recipient=employee, is_read=False).update(is_read=True)


# ── Dashboard ──────────────────────────────────────────────────────────
def dashboard_kpis(org) -> dict:
    today = timezone.now().date()
    status_counts = dict(
        Asset.objects.filter(org=org).values_list("status").annotate(c=Count("id"))
    )
    return {
        "total_assets": Asset.objects.filter(org=org).count(),
        "assets_by_status": status_counts,
        "available": status_counts.get("AVAILABLE", 0),
        "allocated": status_counts.get("ALLOCATED", 0),
        "under_maintenance": status_counts.get("UNDER_MAINTENANCE", 0),
        "active_allocations": Allocation.objects.filter(org=org, returned_at__isnull=True).count(),
        "overdue_returns": Allocation.objects.filter(
            org=org, returned_at__isnull=True, expected_return_date__lt=today
        ).count(),
        "open_maintenance": MaintenanceRequest.objects.filter(
            org=org, status__in=["PENDING", "APPROVED", "ASSIGNED", "IN_PROGRESS"]
        ).count(),
        "pending_maintenance": MaintenanceRequest.objects.filter(org=org, status="PENDING").count(),
        "upcoming_bookings": Booking.objects.filter(
            org=org, status="CONFIRMED", starts_at__gte=timezone.now()
        ).count(),
    }


def overdue_returns(org) -> list[dict]:
    today = timezone.now().date()
    qs = (
        Allocation.objects.filter(
            org=org, returned_at__isnull=True, expected_return_date__lt=today
        )
        .select_related("asset", "employee")
        .order_by("expected_return_date")
    )
    out = []
    for a in qs:
        out.append({
            "allocation_id": a.id,
            "asset_id": a.asset_id,
            "asset_tag": a.asset.asset_tag,
            "asset_name": a.asset.name,
            "holder": a.employee.full_name if a.employee_id else (
                a.department.name if a.department_id else "—"),
            "expected_return_date": a.expected_return_date,
            "days_overdue": (today - a.expected_return_date).days,
        })
    return out


# ── Reports ────────────────────────────────────────────────────────────
def report_utilization(org) -> list[dict]:
    """Per-department: total assets vs currently allocated."""
    from apps.organization.models import Department
    rows = []
    for dept in Department.objects.filter(org=org, status="ACTIVE"):
        total = Asset.objects.filter(org=org, department=dept).count()
        allocated = Asset.objects.filter(org=org, department=dept, status="ALLOCATED").count()
        rows.append({
            "department_id": dept.id,
            "department": dept.name,
            "total_assets": total,
            "allocated": allocated,
            "utilization_pct": round(100 * allocated / total, 1) if total else 0.0,
        })
    return rows


def report_maintenance(org) -> dict:
    counts = dict(
        MaintenanceRequest.objects.filter(org=org).values_list("status").annotate(c=Count("id"))
    )
    by_priority = dict(
        MaintenanceRequest.objects.filter(org=org).values_list("priority").annotate(c=Count("id"))
    )
    return {"by_status": counts, "by_priority": by_priority}


def report_booking_heatmap(org) -> list[dict]:
    """Confirmed bookings bucketed by weekday (0=Mon) × start hour."""
    grid: dict[tuple[int, int], int] = {}
    for b in Booking.objects.filter(org=org, status="CONFIRMED"):
        start = timezone.localtime(b.starts_at)
        key = (start.weekday(), start.hour)
        grid[key] = grid.get(key, 0) + 1
    return [
        {"weekday": wd, "hour": hr, "count": cnt}
        for (wd, hr), cnt in sorted(grid.items())
    ]
