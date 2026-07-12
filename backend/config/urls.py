from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import path
from django.views.generic import RedirectView

from config.api import api


def health(request):
    """Liveness probe for Hugging Face. Always 200 if the app is up; reports DB state."""
    db_ok = True
    try:
        with connection.cursor() as c:
            c.execute("SELECT 1")
            c.fetchone()
    except Exception:
        db_ok = False
    return JsonResponse({"status": "ok", "db": "up" if db_ok else "down"})


urlpatterns = [
    path("", RedirectView.as_view(url="/api/docs", permanent=False)),
    path("health", health),
    path("admin/", admin.site.urls),
    path("api/", api.urls),  # Ninja mounts /api/v1/... here; docs at /api/docs
]
