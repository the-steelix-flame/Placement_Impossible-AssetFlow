
from uuid import UUID

from ninja import Router

from apps.accounts import services
from apps.accounts.models import Employee
from apps.accounts.schemas import (
    EmployeeIn,
    EmployeeOut,
    EmployeeUpdate,
    JoinRejectIn,
    JoinRequestOut,
    MeOut,
    RoleChangeIn,
)
from core.auth import member_auth
from core.permissions import ADMIN, require_active, require_role

# member_auth so PENDING users can still read /me (and see the pending screen);
# every other endpoint here is gated by require_active / require_role.
router = Router(auth=member_auth, tags=["accounts"])


@router.get("/me", response=MeOut)
def me(request):
    return request.employee


@router.get("/employees", response=list[EmployeeOut])
@require_active
def list_employees(request, search: str | None = None, role: str | None = None):
    qs = Employee.objects.filter(org=request.employee.org).select_related("department", "org")
    if search:
        qs = qs.filter(full_name__icontains=search) | qs.filter(email__icontains=search)
    if role:
        qs = qs.filter(role=role)
    return list(qs.order_by("full_name"))


@router.post("/employees", response={201: EmployeeOut})
@require_role(ADMIN)
def create_employee(request, payload: EmployeeIn):
    emp = services.create_employee(
        actor=request.employee, org=request.employee.org, data=payload.dict()
    )
    return 201, emp


@router.get("/employees/{employee_id}", response=EmployeeOut)
@require_active
def get_employee(request, employee_id: UUID):
    return services.get_employee(request.employee.org, employee_id)


# ── Join requests (Admin approval of pending onboarding) ────────────────
@router.get("/join-requests", response=list[JoinRequestOut])
@require_role(ADMIN)
def list_join_requests(request, status: str | None = None):
    return services.list_join_requests(request.employee.org, status)


@router.post("/join-requests/{request_id}/approve", response=JoinRequestOut)
@require_role(ADMIN)
def approve_join_request(request, request_id: UUID):
    sr = services.get_join_request(request.employee.org, request_id)
    return services.approve_join_request(actor=request.employee, sr=sr)


@router.post("/join-requests/{request_id}/reject", response=JoinRequestOut)
@require_role(ADMIN)
def reject_join_request(request, request_id: UUID, payload: JoinRejectIn):
    sr = services.get_join_request(request.employee.org, request_id)
    return services.reject_join_request(actor=request.employee, sr=sr, note=payload.note)


@router.patch("/employees/{employee_id}", response=EmployeeOut)
@require_role(ADMIN)
def update_employee(request, employee_id: UUID, payload: EmployeeUpdate):
    emp = services.get_employee(request.employee.org, employee_id)
    return services.update_employee(
        actor=request.employee, emp=emp, data=payload.dict(exclude_unset=True)
    )


@router.post("/employees/{employee_id}/role", response=EmployeeOut)
@require_role(ADMIN)
def change_role(request, employee_id: UUID, payload: RoleChangeIn):
    emp = services.get_employee(request.employee.org, employee_id)
    return services.change_role(actor=request.employee, emp=emp, new_role=payload.role)
