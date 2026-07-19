# autocaption/urls.py
import os
from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path


def _serve_react_index(request):
    react_dist = os.environ.get(
        "REACT_DIST_DIR", str(settings.BASE_DIR / "frontend" / "dist")
    )
    index_path = Path(react_dist) / "index.html"
    if not index_path.is_file():
        return HttpResponse(
            "React frontend not built. Run `npm run build` in the frontend directory.",
            status=503,
            content_type="text/plain",
        )
    return HttpResponse(index_path.read_bytes(), content_type="text/html")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("captions.urls")),
    path("", _serve_react_index, name="home"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
