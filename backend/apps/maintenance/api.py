
from uuid import UUID

from ninja import Router

from apps.maintenance import services
from apps.maintenance.models import MaintenanceRequest
from apps.maintenance.schemas import (
    AssignIn,
    MaintenanceIn,
    MaintenanceOut,
    RejectIn,
    ResolveIn,
)
from core.auth import supabase_auth
from core.permissions import ADMIN, ASSET_MANAGER, require_role

router = Router(auth=supabase_auth, tags=["maintenance"])


@router.get("/maintenance-requests", response=list[MaintenanceOut])
def list_requests(request, status: str | None = None, mine: bool = False):
    qs = (
        MaintenanceRequest.objects.filter(org=request.employee.org)
        .select_related("asset", "raised_by")
        .order_by("-created_at")
    )
    if status:
        qs = qs.filter(status=status)
    if mine:
        qs = qs.filter(raised_by=request.employee)
    return list(qs)


@router.post("/maintenance-requests", response={201: MaintenanceOut})
def raise_request(request, payload: MaintenanceIn):
    m = services.raise_request(actor=request.employee, org=request.employee.org, data=payload.dict())
    return 201, m


@router.get("/maintenance-requests/{request_id}", response=MaintenanceOut)
def get_request(request, request_id: UUID):
    return services.get_request(request.employee.org, request_id)


@router.post("/maintenance-requests/{request_id}/approve", response=MaintenanceOut)
@require_role(ADMIN, ASSET_MANAGER)
def approve(request, request_id: UUID):
    m = services.get_request(request.employee.org, request_id)
    return services.approve(actor=request.employee, m=m)


@router.post("/maintenance-requests/{request_id}/reject", response=MaintenanceOut)
@require_role(ADMIN, ASSET_MANAGER)
def reject(request, request_id: UUID, payload: RejectIn):
    m = services.get_request(request.employee.org, request_id)
    return services.reject(actor=request.employee, m=m, reason=payload.reason)


@router.post("/maintenance-requests/{request_id}/assign", response=MaintenanceOut)
@require_role(ADMIN, ASSET_MANAGER)
def assign(request, request_id: UUID, payload: AssignIn):
    m = services.get_request(request.employee.org, request_id)
    return services.assign(actor=request.employee, m=m, technician_name=payload.technician_name)


@router.post("/maintenance-requests/{request_id}/start", response=MaintenanceOut)
@require_role(ADMIN, ASSET_MANAGER)
def start(request, request_id: UUID):
    m = services.get_request(request.employee.org, request_id)
    return services.start(actor=request.employee, m=m)


@router.post("/maintenance-requests/{request_id}/resolve", response=MaintenanceOut)
@require_role(ADMIN, ASSET_MANAGER)
def resolve(request, request_id: UUID, payload: ResolveIn):
    m = services.get_request(request.employee.org, request_id)
    return services.resolve(actor=request.employee, m=m, notes=payload.resolution_notes)
