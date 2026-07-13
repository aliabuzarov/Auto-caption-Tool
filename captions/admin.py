# captions/admin.py
from django.contrib import admin

from .models import CaptionJob


@admin.register(CaptionJob)
class CaptionJobAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "whisper_model_size", "words_per_line", "created_at")
    list_filter = ("status", "whisper_model_size")
    readonly_fields = ("id", "created_at", "updated_at", "error_message")
    search_fields = ("id",)
