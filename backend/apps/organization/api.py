
from uuid import UUID

from ninja import Router

from apps.organization import services
from apps.organization.models import AssetCategory, Department
from apps.organization.schemas import (
    CategoryIn,
    CategoryOut,
    CategoryUpdate,
    DepartmentIn,
    DepartmentOut,
    DepartmentUpdate,
)
from core.auth import supabase_auth
from core.permissions import ADMIN, ASSET_MANAGER, require_role

router = Router(auth=supabase_auth, tags=["organization"])


# ── Departments ────────────────────────────────────────────────────────
@router.get("/departments", response=list[DepartmentOut])
def list_departments(request, status: str | None = None):
    qs = Department.objects.filter(org=request.employee.org)
    if status:
        qs = qs.filter(status=status)
    return list(qs.order_by("code"))


@router.post("/departments", response={201: DepartmentOut})
@require_role(ADMIN)
def create_department(request, payload: DepartmentIn):
    dept = services.create_department(
        actor=request.employee, org=request.employee.org, data=payload.dict()
    )
    return 201, dept


@router.get("/departments/{dept_id}", response=DepartmentOut)
def get_department(request, dept_id: UUID):
    return services.get_department(request.employee.org, dept_id)


@router.patch("/departments/{dept_id}", response=DepartmentOut)
@require_role(ADMIN)
def update_department(request, dept_id: UUID, payload: DepartmentUpdate):
    dept = services.get_department(request.employee.org, dept_id)
    return services.update_department(actor=request.employee, dept=dept, data=payload.dict(exclude_unset=True))


@router.delete("/departments/{dept_id}", response=DepartmentOut)
@require_role(ADMIN)
def deactivate_department(request, dept_id: UUID):
    dept = services.get_department(request.employee.org, dept_id)
    return services.deactivate_department(actor=request.employee, dept=dept)


# ── Asset categories ───────────────────────────────────────────────────
@router.get("/asset-categories", response=list[CategoryOut])
def list_categories(request, status: str | None = None):
    qs = AssetCategory.objects.filter(org=request.employee.org)
    if status:
        qs = qs.filter(status=status)
    return list(qs.order_by("name"))


@router.post("/asset-categories", response={201: CategoryOut})
@require_role(ADMIN, ASSET_MANAGER)
def create_category(request, payload: CategoryIn):
    cat = services.create_category(
        actor=request.employee, org=request.employee.org, data=payload.dict()
    )
    return 201, cat


@router.get("/asset-categories/{cat_id}", response=CategoryOut)
def get_category(request, cat_id: UUID):
    return services.get_category(request.employee.org, cat_id)


@router.patch("/asset-categories/{cat_id}", response=CategoryOut)
@require_role(ADMIN, ASSET_MANAGER)
def update_category(request, cat_id: UUID, payload: CategoryUpdate):
    cat = services.get_category(request.employee.org, cat_id)
    return services.update_category(actor=request.employee, cat=cat, data=payload.dict(exclude_unset=True))
