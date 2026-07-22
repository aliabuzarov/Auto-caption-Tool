# captions/models.py
import uuid

from django.db import models


class CaptionJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        TRANSCRIBING = "transcribing", "Transcribing"
        READY_FOR_REVIEW = "ready_for_review", "Ready for Review"
        RENDERING = "rendering", "Rendering"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    class CaptionPosition(models.TextChoices):
        BOTTOM = "bottom", "Bottom"
        TOP = "top", "Top"

    class WhisperModelSize(models.TextChoices):
        TINY = "tiny", "Tiny"
        BASE = "base", "Base"
        SMALL = "small", "Small"
        MEDIUM = "medium", "Medium"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, default="Untitled Project")
    input_video = models.FileField(upload_to="videos/")
    thumbnail = models.ImageField(upload_to="thumbnails/", null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    words_per_line = models.PositiveSmallIntegerField(default=1)
    caption_position = models.CharField(
        max_length=10,
        choices=CaptionPosition.choices,
        default=CaptionPosition.BOTTOM,
    )
    whisper_model_size = models.CharField(
        max_length=10,
        choices=WhisperModelSize.choices,
        default=WhisperModelSize.SMALL,
    )
    caption_data = models.JSONField(
        null=True,
        blank=True,
        help_text=(
            "List of {id, text, start, end} caption chunks produced by "
            "Whisper (word-grouped), editable by the user."
        ),
    )
    output_video = models.FileField(upload_to="output/", null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"CaptionJob {self.id} ({self.status})"
