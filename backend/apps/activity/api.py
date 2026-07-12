
from uuid import UUID

from ninja import Query, Router

from apps.activity import services
from apps.activity.models import ActivityLog, Notification
from apps.activity.schemas import ActivityLogOut, NotificationOut
from core.auth import supabase_auth
from core.schemas import MessageOut

router = Router(auth=supabase_auth, tags=["activity"])


# ── Notifications ──────────────────────────────────────────────────────
@router.get("/notifications", response=list[NotificationOut])
def list_notifications(request, unread: bool = Query(False)):
    qs = Notification.objects.filter(recipient=request.employee).order_by("-created_at")
    if unread:
        qs = qs.filter(is_read=False)
    return list(qs[:100])


@router.post("/notifications/{notification_id}/read", response=NotificationOut)
def read_notification(request, notification_id: UUID):
    return services.mark_read(employee=request.employee, notification_id=notification_id)


@router.post("/notifications/read-all", response=MessageOut)
def read_all(request):
    n = services.mark_all_read(employee=request.employee)
    return {"message": f"Marked {n} notifications read."}


# ── Activity log ───────────────────────────────────────────────────────
@router.get("/activity-logs", response=list[ActivityLogOut])
def list_activity(
    request,
    entity_type: str | None = Query(None),
    entity_id: UUID | None = Query(None),
):
    qs = (
        ActivityLog.objects.filter(org=request.employee.org)
        .select_related("actor")
        .order_by("-created_at")
    )
    if entity_type:
        qs = qs.filter(entity_type=entity_type)
    if entity_id:
        qs = qs.filter(entity_id=entity_id)
    return list(qs[:200])


# ── Dashboard ──────────────────────────────────────────────────────────
@router.get("/dashboard/kpis", response=dict)
def dashboard_kpis(request):
    return services.dashboard_kpis(request.employee.org)


@router.get("/dashboard/overdue", response=list[dict])
def dashboard_overdue(request):
    return services.overdue_returns(request.employee.org)


# ── Reports ────────────────────────────────────────────────────────────
@router.get("/reports/utilization", response=list[dict])
def report_utilization(request):
    return services.report_utilization(request.employee.org)


@router.get("/reports/maintenance", response=dict)
def report_maintenance(request):
    return services.report_maintenance(request.employee.org)


@router.get("/reports/booking-heatmap", response=list[dict])
def report_booking_heatmap(request):
    return services.report_booking_heatmap(request.employee.org)
