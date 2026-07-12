"""
THE NinjaAPI instance. Mounts every app router under /api/v1/ and registers global
exception handlers that render our consistent error envelope — notably the 409
conflict body ({detail, code, holder, suggestion, next_slot}) the frontend keys on.
"""

from ninja import NinjaAPI
from ninja.errors import AuthenticationError, ValidationError as NinjaValidationError

from core.exceptions import DomainError

api = NinjaAPI(title="AssetFlow API", version="1.0.0", urls_namespace="assetflow")


# ── Routers (all under /v1) ────────────────────────────────────────────
from apps.accounts.api import router as accounts_router  # noqa: E402
from apps.activity.api import router as activity_router  # noqa: E402
from apps.allocation.api import router as allocation_router  # noqa: E402
from apps.assets.api import router as assets_router  # noqa: E402
from apps.audits.api import router as audits_router  # noqa: E402
from apps.booking.api import router as booking_router  # noqa: E402
from apps.maintenance.api import router as maintenance_router  # noqa: E402
from apps.organization.api import onboarding_router  # noqa: E402
from apps.organization.api import router as organization_router  # noqa: E402

api.add_router("/v1", onboarding_router)  # public — no auth
api.add_router("/v1", accounts_router)
api.add_router("/v1", organization_router)
api.add_router("/v1", assets_router)
api.add_router("/v1", allocation_router)
api.add_router("/v1", booking_router)
api.add_router("/v1", maintenance_router)
api.add_router("/v1", audits_router)
api.add_router("/v1", activity_router)


# ── Exception handlers ─────────────────────────────────────────────────
@api.exception_handler(DomainError)
def handle_domain_error(request, exc: DomainError):
    body = {"detail": exc.detail, "code": exc.code}
    body.update({k: v for k, v in exc.extra.items() if v is not None})
    return api.create_response(request, body, status=exc.status)


@api.exception_handler(AuthenticationError)
def handle_auth_error(request, exc):
    return api.create_response(
        request,
        {"detail": "Authentication required or token invalid.", "code": "unauthorized"},
        status=401,
    )


@api.exception_handler(NinjaValidationError)
def handle_validation_error(request, exc: NinjaValidationError):
    return api.create_response(
        request,
        {"detail": "Request validation failed.", "code": "validation_error", "errors": exc.errors},
        status=422,
    )
