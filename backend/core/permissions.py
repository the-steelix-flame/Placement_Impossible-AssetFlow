"""
Role gating. Every role check in the codebase flows through this one file so the
policy is grep-able and consistent. Roles come from the Employee row resolved in
`core/auth.py`, never from the JWT.
"""
from __future__ import annotations

from functools import wraps

from core.exceptions import ApprovalPending, PermissionDenied

# Role constants (mirror the user_role enum in the schema).
ADMIN = "ADMIN"
ASSET_MANAGER = "ASSET_MANAGER"
DEPT_HEAD = "DEPT_HEAD"
EMPLOYEE = "EMPLOYEE"

ALL_ROLES = (ADMIN, ASSET_MANAGER, DEPT_HEAD, EMPLOYEE)


def require_active(view):
    """Gate an endpoint on approved access without requiring a specific role.

    Use on 'any authenticated' reads that still expose company data (pending users
    must not see them). /me and pending-status reads are the only ungated endpoints.
    """

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        employee = getattr(request, "employee", None)
        if employee is None:
            raise PermissionDenied("Authentication required.")
        if employee.access_status != "ACTIVE":
            raise ApprovalPending()
        return view(request, *args, **kwargs)

    return wrapper


def require_role(*roles: str):
    """
    Decorator for Ninja endpoints. The first positional arg of a Ninja operation
    is the `request`, which carries `request.employee` (set by SupabaseAuth).

        @router.post("/assets")
        @require_role(ADMIN, ASSET_MANAGER)
        def create_asset(request, payload: AssetIn):
            ...
    """

    def decorator(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            employee = getattr(request, "employee", None)
            if employee is None:
                raise PermissionDenied("Authentication required.")
            if employee.access_status != "ACTIVE":
                raise ApprovalPending()
            if roles and employee.role not in roles:
                raise PermissionDenied(
                    f"Requires role in {roles}; you are {employee.role}."
                )
            return view(request, *args, **kwargs)

        return wrapper

    return decorator
