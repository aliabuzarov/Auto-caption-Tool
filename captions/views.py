# captions/views.py
"""
API views for the AutoCaption application.

POST   /api/jobs/               – upload video, create job, dispatch transcription
GET    /api/jobs/<id>/           – poll job status & retrieve caption_data
PATCH  /api/jobs/<id>/captions/  – save user-edited caption_data
POST   /api/jobs/<id>/render/    – trigger rendering
GET    /api/jobs/<id>/download/  – serve the finished output_video
"""

from django.http import FileResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import CaptionJob
from .serializers import CaptionDataSerializer, CaptionJobSerializer, JobListSerializer
from .tasks import render_video, transcribe_video


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
        {"id": str(job.id), "status": job.status},
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
def update_captions(request, pk):
    """
    Save user-edited caption_data to an existing CaptionJob.

    Only the 'text' field of each entry is expected to be changed;
    start/end timestamps must match the original transcription and are validated.
    """
    try:
        job = CaptionJob.objects.get(pk=pk)
    except CaptionJob.DoesNotExist:
        raise Http404("CaptionJob not found.")

    if job.status != CaptionJob.Status.READY_FOR_REVIEW:
        return Response(
            {"detail": "Captions can only be updated while the job is in ready_for_review status."},
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

    The job must be in ready_for_review status (caption_data already saved).
    Sets status to rendering and dispatches the async task.
    """
    try:
        job = CaptionJob.objects.get(pk=pk)
    except CaptionJob.DoesNotExist:
        raise Http404("CaptionJob not found.")

    if job.status != CaptionJob.Status.READY_FOR_REVIEW:
        return Response(
            {"detail": "Render can only be triggered when job is in ready_for_review status."},
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
    offset_y = caption_offset.get("y", 0) if isinstance(caption_offset, dict) else 0

    export_settings = request.data.get("exportSettings", {})

    render_video.delay(str(job.id), int(offset_y), export_settings)

    return Response({"id": str(job.id), "status": job.status})


@api_view(["GET"])
def download_video(request, pk):
    """
    Serve the finished output_video file for download.

    Only available when job.status == done and output_video exists.
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
