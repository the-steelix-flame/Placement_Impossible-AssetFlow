
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
    JoinCodeOut,
    RotateJoinCodeOut,
    ValidateCodeIn,
    ValidateCodeOut,
    WorkspaceIn,
    WorkspaceOut,
)
from core.auth import supabase_auth
from core.permissions import ADMIN, ASSET_MANAGER, require_role

router = Router(auth=supabase_auth, tags=["organization"])

# Public onboarding — NO auth, because role-code validation must happen before
# the frontend asks Supabase to send a verification email.
onboarding_router = Router(tags=["onboarding"])


@onboarding_router.post("/onboarding/workspaces", response={201: WorkspaceOut})
def create_workspace(request, payload: WorkspaceIn):
    return 201, services.create_workspace(
        company_name=payload.company_name,
        admin_full_name=payload.admin_full_name,
        admin_email=payload.admin_email,
    )


@onboarding_router.post("/onboarding/join/validate-code", response=ValidateCodeOut)
def validate_join_code(request, payload: ValidateCodeIn):
    return services.validate_join_code(
        full_name=payload.full_name,
        email=payload.email,
        requested_role=payload.requested_role,
        role_code=payload.role_code,
    )


# ── Join codes (Admin) ─────────────────────────────────────────────────
@router.get("/join-codes", response=list[JoinCodeOut])
@require_role(ADMIN)
def list_join_codes(request):
    return services.list_join_codes(request.employee.org)


@router.post("/join-codes/{role}/rotate", response=RotateJoinCodeOut)
@require_role(ADMIN)
def rotate_join_code(request, role: str):
    return services.rotate_join_code(org=request.employee.org, role=role, actor=request.employee)


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
