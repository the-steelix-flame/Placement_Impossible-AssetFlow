
from uuid import UUID

from ninja import Query, Router

from apps.assets import services
from apps.assets.models import Asset
from apps.assets.schemas import AssetIn, AssetOut, AssetPassportOut, AssetUpdate
from core.auth import supabase_auth
from core.permissions import ADMIN, ASSET_MANAGER, require_role

router = Router(auth=supabase_auth, tags=["assets"])


@router.get("/assets", response=list[AssetOut])
def list_assets(
    request,
    search: str | None = Query(None),
    status: str | None = Query(None),
    category: UUID | None = Query(None),
    department: UUID | None = Query(None),
    is_bookable: bool | None = Query(None),
):
    qs = Asset.objects.filter(org=request.employee.org).select_related("category", "department")
    if search:
        qs = qs.filter(name__icontains=search) | qs.filter(asset_tag__icontains=search) | \
             qs.filter(serial_number__icontains=search)
        qs = qs.filter(org=request.employee.org)
    if status:
        qs = qs.filter(status=status)
    if category:
        qs = qs.filter(category_id=category)
    if department:
        qs = qs.filter(department_id=department)
    if is_bookable is not None:
        qs = qs.filter(is_bookable=is_bookable)
    return list(qs.order_by("asset_tag"))


@router.post("/assets", response={201: AssetOut})
@require_role(ADMIN, ASSET_MANAGER)
def create_asset(request, payload: AssetIn):
    asset = services.create_asset(
        actor=request.employee, org=request.employee.org, data=payload.dict()
    )
    return 201, asset


@router.get("/assets/{asset_id}", response=AssetOut)
def get_asset(request, asset_id: UUID):
    return services.get_asset(request.employee.org, asset_id)


@router.patch("/assets/{asset_id}", response=AssetOut)
@require_role(ADMIN, ASSET_MANAGER)
def update_asset(request, asset_id: UUID, payload: AssetUpdate):
    asset = services.get_asset(request.employee.org, asset_id)
    return services.update_asset(
        actor=request.employee, asset=asset, data=payload.dict(exclude_unset=True)
    )


@router.get("/assets/{asset_id}/passport", response=AssetPassportOut)
def asset_passport(request, asset_id: UUID):
    asset = services.get_asset(request.employee.org, asset_id)
    return {"asset": asset, "timeline": services.build_passport(asset)}
