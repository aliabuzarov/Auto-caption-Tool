# captions/serializers.py
from rest_framework import serializers

from .models import CaptionJob

class JobListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaptionJob
        fields = [
            "id",
            "name",
            "thumbnail",
            "input_video",
            "status",
            "output_video",
            "error_message",
            "created_at",
            "updated_at",
            "caption_style",
            "caption_offset",
            "edit_token",
        ]


class CaptionJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaptionJob
        fields = [
            "id",
            "name",
            "thumbnail",
            "input_video",
            "status",
            "words_per_line",
            "caption_position",
            "whisper_model_size",
            "caption_data",
            "output_video",
            "error_message",
            "created_at",
            "updated_at",
            "caption_style",
            "caption_offset",
            "edit_token",
        ]
        read_only_fields = [
            "id",
            "status",
            "caption_data",
            "output_video",
            "error_message",
            "created_at",
            "updated_at",
            "edit_token",
        ]


class CaptionDataSerializer(serializers.Serializer):
    """Validates the caption_data payload on the PATCH /captions/ endpoint."""

    caption_data = serializers.ListField(
        child=serializers.DictField(allow_empty=False),
        allow_empty=False,
    )

    def validate_caption_data(self, value):
        required_keys = {"id", "text", "start", "end"}
        for item in value:
            if not required_keys.issubset(item.keys()):
                raise serializers.ValidationError(
                    "Each caption entry must contain keys: id, text, start, end."
                )
            if not isinstance(item["start"], (int, float)):
                raise serializers.ValidationError(
                    f"start must be a number, got {type(item['start']).__name__}."
                )
            if not isinstance(item["end"], (int, float)):
                raise serializers.ValidationError(
                    f"end must be a number, got {type(item['end']).__name__}."
                )
            if item["start"] >= item["end"]:
                raise serializers.ValidationError(
                    f"start ({item['start']}) must be less than end ({item['end']})."
                )
        return value
