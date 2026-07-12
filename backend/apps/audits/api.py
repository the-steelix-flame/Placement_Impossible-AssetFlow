
from uuid import UUID

from ninja import Router

from apps.audits import services
from apps.audits.models import AuditCycle, AuditItem
from apps.audits.schemas import CycleIn, CycleOut, ItemOut, ItemUpdate
from core.auth import supabase_auth
from core.permissions import ADMIN, ASSET_MANAGER, DEPT_HEAD, require_role

router = Router(auth=supabase_auth, tags=["audits"])


@router.get("/audit-cycles", response=list[CycleOut])
def list_cycles(request, status: str | None = None):
    qs = AuditCycle.objects.filter(org=request.employee.org).order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    return list(qs)


@router.post("/audit-cycles", response={201: CycleOut})
@require_role(ADMIN, ASSET_MANAGER)
def create_cycle(request, payload: CycleIn):
    cycle = services.create_cycle(actor=request.employee, org=request.employee.org, data=payload.dict())
    return 201, cycle


@router.get("/audit-cycles/{cycle_id}", response=CycleOut)
def get_cycle(request, cycle_id: UUID):
    return services.get_cycle(request.employee.org, cycle_id)


@router.get("/audit-cycles/{cycle_id}/items", response=list[ItemOut])
def list_items(request, cycle_id: UUID):
    cycle = services.get_cycle(request.employee.org, cycle_id)
    return list(cycle.items.select_related("asset").order_by("asset__asset_tag"))


@router.post("/audit-cycles/{cycle_id}/start", response=CycleOut)
@require_role(ADMIN, ASSET_MANAGER)
def start_cycle(request, cycle_id: UUID):
    cycle = services.get_cycle(request.employee.org, cycle_id)
    return services.start_cycle(actor=request.employee, cycle=cycle)


@router.post("/audit-cycles/{cycle_id}/close", response=CycleOut)
@require_role(ADMIN, ASSET_MANAGER)
def close_cycle(request, cycle_id: UUID):
    cycle = services.get_cycle(request.employee.org, cycle_id)
    return services.close_cycle(actor=request.employee, cycle=cycle)


@router.get("/audit-cycles/{cycle_id}/discrepancies", response=list[ItemOut])
def cycle_discrepancies(request, cycle_id: UUID):
    cycle = services.get_cycle(request.employee.org, cycle_id)
    return services.discrepancies(cycle)


@router.patch("/audit-items/{item_id}", response=ItemOut)
@require_role(ADMIN, ASSET_MANAGER, DEPT_HEAD)
def update_item(request, item_id: UUID, payload: ItemUpdate):
    item = services.get_item(request.employee.org, item_id)
    return services.update_item(actor=request.employee, item=item, data=payload.dict(exclude_unset=True))
