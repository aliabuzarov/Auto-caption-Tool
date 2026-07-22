# captions/urls.py
from django.urls import path

from . import views

urlpatterns = [
    path("jobs/", views.create_job, name="create-job"),
    path("jobs/<uuid:pk>/", views.get_job, name="get-job"),
    path("jobs/<uuid:pk>/captions/", views.update_captions, name="update-captions"),
    path("jobs/<uuid:pk>/regenerate/", views.regenerate_job, name="regenerate-job"),
    path("jobs/<uuid:pk>/render/", views.render_job, name="render-job"),
    path("jobs/<uuid:pk>/download/", views.download_video, name="download-video"),
]
