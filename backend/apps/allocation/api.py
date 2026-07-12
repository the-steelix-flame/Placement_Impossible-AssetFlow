
from uuid import UUID

from django.utils import timezone
from ninja import Router

from apps.allocation import services
from apps.allocation.models import Allocation, TransferRequest
from apps.allocation.schemas import (
    AllocationIn,
    AllocationOut,
    ReturnIn,
    TransferDecisionIn,
    TransferIn,
    TransferOut,
)
from core.auth import supabase_auth
from core.permissions import ADMIN, ASSET_MANAGER, DEPT_HEAD, require_role

router = Router(auth=supabase_auth, tags=["allocation"])


@router.get("/allocations", response=list[AllocationOut])
def list_allocations(request, state: str | None = None):
    """state = active | overdue | returned (default: all)."""
    qs = (
        Allocation.objects.filter(org=request.employee.org)
        .select_related("asset", "employee")
        .order_by("-allocated_at")
    )
    if state == "active":
        qs = qs.filter(returned_at__isnull=True)
    elif state == "returned":
        qs = qs.filter(returned_at__isnull=False)
    elif state == "overdue":
        qs = qs.filter(returned_at__isnull=True, expected_return_date__lt=timezone.now().date())
    return list(qs)


@router.post("/allocations", response={201: AllocationOut})
@require_role(ADMIN, ASSET_MANAGER, DEPT_HEAD)
def create_allocation(request, payload: AllocationIn):
    alloc = services.allocate(actor=request.employee, org=request.employee.org, data=payload.dict())
    return 201, alloc


@router.post("/allocations/{allocation_id}/return", response=AllocationOut)
@require_role(ADMIN, ASSET_MANAGER, DEPT_HEAD)
def return_allocation(request, allocation_id: UUID, payload: ReturnIn):
    alloc = services.get_allocation(request.employee.org, allocation_id)
    return services.return_allocation(
        actor=request.employee, alloc=alloc,
        condition=payload.return_condition, notes=payload.return_notes,
    )


# ── Transfer requests ──────────────────────────────────────────────────
@router.get("/transfer-requests", response=list[TransferOut])
def list_transfers(request, status: str | None = None):
    qs = (
        TransferRequest.objects.filter(org=request.employee.org)
        .select_related("asset")
        .order_by("-created_at")
    )
    if status:
        qs = qs.filter(status=status)
    return list(qs)


@router.post("/transfer-requests", response={201: TransferOut})
@require_role(ADMIN, ASSET_MANAGER, DEPT_HEAD, )
def create_transfer(request, payload: TransferIn):
    transfer = services.request_transfer(
        actor=request.employee, org=request.employee.org, data=payload.dict()
    )
    return 201, transfer


@router.post("/transfer-requests/{transfer_id}/decide", response=TransferOut)
@require_role(ADMIN, ASSET_MANAGER)
def decide_transfer(request, transfer_id: UUID, payload: TransferDecisionIn):
    transfer = services.get_transfer(request.employee.org, transfer_id)
    return services.decide_transfer(
        actor=request.employee, transfer=transfer, approve=payload.approve, note=payload.note
    )
