# captions/views.py
"""
API views for the AutoCaption application.

POST   /api/jobs/               – upload video, create job, dispatch transcription
GET    /api/jobs/<id>/           – poll job status & retrieve caption_data
PATCH  /api/jobs/<id>/captions/  – save user-edited caption_data
PATCH  /api/jobs/<id>/settings/  – autosave style, offset, and data
POST   /api/jobs/<id>/render/    – trigger rendering
GET    /api/jobs/<id>/download/  – serve the finished output_video
POST   /api/jobs/<id>/cancel/    – cancel a pending/transcribing job
"""

import secrets
from django.http import FileResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import CaptionJob
from .serializers import CaptionDataSerializer, CaptionJobSerializer, JobListSerializer
from .tasks import render_video, transcribe_video

def check_edit_token(job, request):
    token = request.headers.get("X-Edit-Token")
    if job.edit_token and token != job.edit_token:
        return False
    return True

@api_view(["GET", "POST"])
@csrf_exempt
def create_job(request):
    """
    GET: List all CaptionJobs (project history).
    POST: Upload a video and create a new CaptionJob.

    POST Accepts multipart/form-data with the video file and optional parameters.
    On success dispatches the transcribe_video Celery task and returns the job id.
    """
    if request.method == "GET":
        jobs = CaptionJob.objects.all()
        serializer = JobListSerializer(jobs, many=True)
        return Response(serializer.data)

    serializer = CaptionJobSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    video_file = request.FILES.get('input_video')
    if video_file:
        MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB
        ALLOWED_MIME_TYPES = {'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'}
        
        if video_file.size > MAX_UPLOAD_SIZE:
            return Response({'detail': 'File too large. Maximum size is 500MB.'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        if video_file.content_type not in ALLOWED_MIME_TYPES and not video_file.name.lower().endswith(('.mp4', '.mov', '.avi', '.webm')):
            return Response({'detail': 'Invalid file type. Only video files are allowed.'}, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

    job = serializer.save()

    # Generate a secure edit token for this job
    job.edit_token = secrets.token_urlsafe(32)
    job.save(update_fields=["edit_token"])

    if not job.name or job.name == "Untitled Project":
        job.name = video_file.name if video_file else "Untitled Project"
        job.save(update_fields=["name"])

    # Extract thumbnail
    if job.input_video:
        import subprocess, os
        from django.core.files import File
        try:
            thumb_path = f"/tmp/{job.id}_thumb.jpg"
            subprocess.run([
                "ffmpeg", "-y", "-i", job.input_video.path, 
                "-ss", "00:00:00.000", "-vframes", "1", 
                "-vf", "scale=320:-1", thumb_path
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if os.path.exists(thumb_path):
                with open(thumb_path, "rb") as f:
                    job.thumbnail.save(f"thumb_{job.id}.jpg", File(f), save=True)
                os.remove(thumb_path)
        except Exception as e:
            print("Thumbnail extraction failed:", e)

    transcribe_video.delay(str(job.id))

    return Response(
        {"id": str(job.id), "status": job.status, "edit_token": job.edit_token},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@csrf_exempt
def get_job(request, pk):
    """
    GET: Retrieve a CaptionJob by its UUID.
    PATCH: Update job fields (like name).
    DELETE: Delete a CaptionJob.
    """
    try:
        job = CaptionJob.objects.get(pk=pk)
    except CaptionJob.DoesNotExist:
        raise Http404("CaptionJob not found.")

    if request.method in ["DELETE", "PATCH"]:
        if not check_edit_token(job, request):
            return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == "DELETE":
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    elif request.method == "PATCH":
        serializer = CaptionJobSerializer(job, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer = CaptionJobSerializer(job)
    return Response(serializer.data)


@api_view(["PATCH"])
@csrf_exempt
def update_settings(request, pk):
    """
    Autosave caption_style, caption_offset, and caption_data.
    """
    try:
        job = CaptionJob.objects.get(pk=pk)
    except CaptionJob.DoesNotExist:
        raise Http404("CaptionJob not found.")

    if not check_edit_token(job, request):
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    caption_style = request.data.get("caption_style")
    caption_offset = request.data.get("caption_offset")
    caption_data = request.data.get("caption_data")

    update_fields = []
    if caption_style is not None:
        job.caption_style = caption_style
        update_fields.append("caption_style")
    if caption_offset is not None:
        job.caption_offset = caption_offset
        update_fields.append("caption_offset")
    if caption_data is not None:
        serializer = CaptionDataSerializer(data={"caption_data": caption_data})
        if serializer.is_valid():
            job.caption_data = serializer.validated_data["caption_data"]
            update_fields.append("caption_data")

    if update_fields:
        job.save(update_fields=update_fields)

    return Response({"status": "success"})


@api_view(["PATCH"])
@csrf_exempt
def update_captions(request, pk):
    """
    Save user-edited caption_data to an existing CaptionJob.
    """
    try:
        job = CaptionJob.objects.get(pk=pk)
    except CaptionJob.DoesNotExist:
        raise Http404("CaptionJob not found.")

    if not check_edit_token(job, request):
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    if job.status not in [CaptionJob.Status.READY_FOR_REVIEW, CaptionJob.Status.DONE]:
        return Response(
            {"detail": "Captions can only be updated while the job is in ready_for_review or done status."},
            status=status.HTTP_409_CONFLICT,
        )

    serializer = CaptionDataSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    job.caption_data = serializer.validated_data["caption_data"]
    job.save(update_fields=["caption_data", "updated_at"])

    return Response({"id": str(job.id), "status": job.status})


@api_view(["POST"])
@csrf_exempt
def regenerate_job(request, pk):
    """
    Regenerate captions for an existing job with new settings.
    """
    try:
        job = CaptionJob.objects.get(pk=pk)
    except CaptionJob.DoesNotExist:
        raise Http404("CaptionJob not found.")

    if not check_edit_token(job, request):
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    words_per_line = request.data.get("words_per_line")
    whisper_model_size = request.data.get("whisper_model_size")

    if words_per_line is not None:
        job.words_per_line = int(words_per_line)
    if whisper_model_size is not None:
        job.whisper_model_size = str(whisper_model_size)

    job.status = CaptionJob.Status.PENDING
    job.save(update_fields=["words_per_line", "whisper_model_size", "status", "updated_at"])

    transcribe_video.delay(str(job.id))

    return Response({"id": str(job.id), "status": job.status})


@api_view(["POST"])
@csrf_exempt
def render_job(request, pk):
    """
    Trigger the render_video Celery task for a job whose captions are ready.
    """
    try:
        job = CaptionJob.objects.get(pk=pk)
    except CaptionJob.DoesNotExist:
        raise Http404("CaptionJob not found.")

    if not check_edit_token(job, request):
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    if job.status not in [CaptionJob.Status.READY_FOR_REVIEW, CaptionJob.Status.DONE]:
        return Response(
            {"detail": "Render can only be triggered when job is in ready_for_review or done status."},
            status=status.HTTP_409_CONFLICT,
        )

    if not job.caption_data:
        return Response(
            {"detail": "No caption_data available for rendering."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    job.status = CaptionJob.Status.RENDERING
    job.save(update_fields=["status", "updated_at"])

    caption_offset = request.data.get("captionOffset", {})
    offset_x = caption_offset.get("x", 0) if isinstance(caption_offset, dict) else 0
    offset_y = caption_offset.get("y", 0) if isinstance(caption_offset, dict) else 0
    
    preview_dim = request.data.get("previewDimensions", {})
    preview_width = preview_dim.get("width", 0) if isinstance(preview_dim, dict) else 0
    preview_height = preview_dim.get("height", 0) if isinstance(preview_dim, dict) else 0

    export_settings = request.data.get("exportSettings", {})
    caption_style = request.data.get("captionStyle", {})

    render_video.delay(str(job.id), int(offset_x), int(offset_y), int(preview_width), int(preview_height), export_settings, caption_style)

    return Response({"id": str(job.id), "status": job.status})


@api_view(["POST"])
@csrf_exempt
def cancel_job(request, pk):
    """
    Cancel an ongoing transcription job.
    """
    try:
        job = CaptionJob.objects.get(pk=pk)
    except CaptionJob.DoesNotExist:
        raise Http404("CaptionJob not found.")

    if not check_edit_token(job, request):
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        
    if job.status in [CaptionJob.Status.PENDING, CaptionJob.Status.TRANSCRIBING]:
        job.status = CaptionJob.Status.FAILED
        job.error_message = "Cancelled by user"
        job.save(update_fields=["status", "error_message"])
    
    return Response({"status": "cancelled"})


@api_view(["GET"])
def download_video(request, pk):
    """
    Serve the finished output_video file for download.
    """
    try:
        job = CaptionJob.objects.get(pk=pk)
    except CaptionJob.DoesNotExist:
        raise Http404("CaptionJob not found.")

    if job.status != CaptionJob.Status.DONE:
        return Response(
            {"detail": "Video is not ready for download yet."},
            status=status.HTTP_409_CONFLICT,
        )

    if not job.output_video:
        raise Http404("Output video file not found.")

    response = FileResponse(
        job.output_video.open("rb"),
        content_type="video/mp4",
        as_attachment=True,
        filename=f"captioned_{job.id}.mp4",
    )
    return response

