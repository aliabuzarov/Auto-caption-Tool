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
from .serializers import CaptionDataSerializer, CaptionJobSerializer
from .tasks import render_video, transcribe_video


@api_view(["POST"])
@csrf_exempt
def create_job(request):
    """
    Upload a video and create a new CaptionJob.

    Accepts multipart/form-data with the video file and optional parameters:
    words_per_line, caption_position, whisper_model_size.
    On success dispatches the transcribe_video Celery task and returns the job id.
    """
    serializer = CaptionJobSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    job = serializer.save()

    transcribe_video.delay(str(job.id))

    return Response(
        {"id": str(job.id), "status": job.status},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def get_job(request, pk):
    """
    Retrieve a CaptionJob by its UUID.

    Returns the job status and, once ready_for_review, includes caption_data
    for the frontend editor.
    """
    try:
        job = CaptionJob.objects.get(pk=pk)
    except CaptionJob.DoesNotExist:
        raise Http404("CaptionJob not found.")

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

    render_video.delay(str(job.id))

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
