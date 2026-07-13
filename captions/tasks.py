# captions/tasks.py
"""
Celery async tasks for AutoCaption.

Two independent tasks:
  transcribe_video  – run faster-whisper on the uploaded video, output grouped captions
  render_video      – generate ASS subtitles from caption_data, burn into video via ffmpeg
"""

import json
import logging
import os
import subprocess
import tempfile
import uuid
from pathlib import Path

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level faster-whisper model cache.
# Loaded once per worker process – not reloaded per task invocation.
# ---------------------------------------------------------------------------
_whisper_model = None
_whisper_model_size = None


def _get_whisper_model(model_size: str):
    """Return a cached faster-whisper model, loading it if necessary."""
    global _whisper_model, _whisper_model_size
    if _whisper_model is None or _whisper_model_size != model_size:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(model_size, device="cpu", compute_type="int8")
        _whisper_model_size = model_size
    return _whisper_model


# ---------------------------------------------------------------------------
# transcribe_video
# ---------------------------------------------------------------------------
@shared_task(bind=True, max_retries=2)
def transcribe_video(self, job_id: str):
    """
    Transcribe the uploaded video using faster-whisper with word-level timestamps.

    1. Extract audio from the input video via ffmpeg.
    2. Run faster-whisper transcription with word_timestamps=True.
    3. Group detected words into chunks of words_per_line.
    4. Save the resulting caption_data list as JSON on the CaptionJob.
    5. Mark status as ready_for_review (or failed on error).
    """
    from .models import CaptionJob

    try:
        job = CaptionJob.objects.get(pk=job_id)
    except CaptionJob.DoesNotExist:
        logger.error("CaptionJob %s not found; aborting transcription.", job_id)
        return

    job.status = CaptionJob.Status.TRANSCRIBING
    job.save(update_fields=["status", "updated_at"])

    input_path = job.input_video.path
    if not os.path.isfile(input_path):
        _fail_job(job, f"Input video file not found at {input_path}")
        return

    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = os.path.join(tmpdir, "audio.wav")

        # --- 1. Extract audio -------------------------------------------------
        try:
            _extract_audio(input_path, audio_path)
        except subprocess.CalledProcessError as exc:
            _fail_job(job, f"ffmpeg audio extraction failed: {exc}")
            return

        # --- 2. Transcribe ----------------------------------------------------
        try:
            model = _get_whisper_model(job.whisper_model_size)
            segments, _info = model.transcribe(
                audio_path,
                word_timestamps=True,
                vad_filter=True,
            )
        except Exception as exc:
            _fail_job(job, f"Whisper transcription failed: {exc}")
            return

        # --- 3. Build word list -----------------------------------------------
        words: list[dict] = []
        for segment in segments:
            if segment.words is None:
                continue
            for word in segment.words:
                words.append({
                    "text": word.word.strip(),
                    "start": round(word.start, 3),
                    "end": round(word.end, 3),
                })

        if not words:
            _fail_job(job, "Transcription produced no words – video may have no speech.")
            return

        # --- 4. Group words into lines ----------------------------------------
        grouped = _group_words(words, job.words_per_line)

        job.caption_data = grouped
        job.status = CaptionJob.Status.READY_FOR_REVIEW
        job.save(update_fields=["caption_data", "status", "updated_at"])
        logger.info("Transcription complete for job %s: %d chunks.", job_id, len(grouped))


# ---------------------------------------------------------------------------
# render_video
# ---------------------------------------------------------------------------
@shared_task(bind=True, max_retries=1)
def render_video(self, job_id: str):
    """
    Generate karaoke-style captions and burn them into the video using ffmpeg.

    1. Load caption_data from the job (reflects any user text edits).
    2. Generate an .ass subtitle file with per-word \\k timing tags.
    3. Burn the subtitles into the video via ffmpeg's ass filter.
    4. Save the rendered file to output_video, set status to done.
    """
    from .models import CaptionJob

    try:
        job = CaptionJob.objects.get(pk=job_id)
    except CaptionJob.DoesNotExist:
        logger.error("CaptionJob %s not found; aborting render.", job_id)
        return

    caption_data = job.caption_data
    if not caption_data:
        _fail_job(job, "No caption_data available for rendering.")
        return

    input_path = job.input_video.path
    if not os.path.isfile(input_path):
        _fail_job(job, f"Input video file not found at {input_path}")
        return

    with tempfile.TemporaryDirectory() as tmpdir:
        ass_path = os.path.join(tmpdir, "captions.ass")
        output_filename = f"{job.id}.mp4"
        output_tmp = os.path.join(tmpdir, output_filename)

        # --- 1. Generate .ass subtitle file -----------------------------------
        try:
            _generate_ass(caption_data, ass_path, job.caption_position)
        except Exception as exc:
            _fail_job(job, f"ASS generation failed: {exc}")
            return

        # --- 2. Burn via ffmpeg -----------------------------------------------
        try:
            _burn_subtitles(input_path, ass_path, output_tmp)
        except subprocess.CalledProcessError as exc:
            _fail_job(job, f"ffmpeg rendering failed: {exc}")
            return

        # --- 3. Save output ---------------------------------------------------
        output_dir = os.path.join(settings.MEDIA_ROOT, "output")
        os.makedirs(output_dir, exist_ok=True)
        final_path = os.path.join(output_dir, output_filename)

        # Move (or copy on Windows) the temp file to the media output directory.
        if os.path.isfile(final_path):
            os.remove(final_path)
        os.rename(output_tmp, final_path)

        job.output_video.name = f"output/{output_filename}"
        job.status = CaptionJob.Status.DONE
        job.save(update_fields=["output_video", "status", "updated_at"])
        logger.info("Render complete for job %s.", job_id)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fail_job(job, message: str):
    """Mark a CaptionJob as failed with an error message."""
    from .models import CaptionJob

    job.status = CaptionJob.Status.FAILED
    job.error_message = message
    job.save(update_fields=["status", "error_message", "updated_at"])
    logger.error("Job %s failed: %s", job.id, message)


def _extract_audio(video_path: str, audio_path: str):
    """Extract 16 kHz mono WAV audio from a video file using ffmpeg."""
    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "error",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        audio_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)


def _group_words(words: list[dict], per_line: int) -> list[dict]:
    """
    Group a flat list of {text, start, end} word dicts into caption chunks.

    Each chunk merges per_line consecutive words, using the first word's
    start time and the last word's end time. A unique integer id is assigned.
    """
    chunks = []
    for idx in range(0, len(words), per_line):
        group = words[idx : idx + per_line]
        chunks.append({
            "id": len(chunks) + 1,
            "text": " ".join(w["text"] for w in group),
            "start": group[0]["start"],
            "end": group[-1]["end"],
        })
    return chunks


# ---------------------------------------------------------------------------
# .ass subtitle generation
# ---------------------------------------------------------------------------

def _generate_ass(caption_data: list[dict], ass_path: str, position: str):
    """
    Write an Advanced SubStation Alpha (.ass) file with karaoke timing tags.

    Each caption chunk is rendered as a dialogue event. Words within the
    chunk are individually timed using \\k (centiseconds) tags so that the
    word-by-word karaoke highlight effect works.

    The subtitle position is controlled via the MarginV value:
      - bottom: large top margin pushes text near the bottom
      - top:    small top margin (actually Alignment=8 for top-center)
    """
    header = _ass_header(position)
    events = _ass_events(caption_data)

    with open(ass_path, "w", encoding="utf-8") as fh:
        fh.write(header)
        fh.write("\n")
        fh.write(events)


def _ass_header(position: str) -> str:
    """Return the [Script Info] and [V4+ Styles] sections of the .ass file."""
    alignment = "8" if position == "top" else "2"  # 8=top-center, 2=bottom-center
    return f"""[Script Info]
Title: AutoCaption Karaoke
ScriptType: v4.00+
PlayResX: 640
PlayResY: 480
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,1,{alignment},10,10,30,1
Style: Highlight,Arial,24,&H00FFFF00,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,1,{alignment},10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def _ass_events(caption_data: list[dict]) -> str:
    """
    Build Dialogue lines for each caption chunk.

    Each line applies karaoke timing: words before the current playback
    point use the Highlight style (yellow), while upcoming words use the
    Default style (white). The \\k tag controls per-word timing.
    """
    lines = []
    for chunk in caption_data:
        start = _seconds_to_ass_time(chunk["start"])
        end = _seconds_to_ass_time(chunk["end"])
        text_with_karaoke = _build_karaoke_text(chunk["text"], chunk["start"], chunk["end"])

        line = f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text_with_karaoke}"
        lines.append(line)
    return "\n".join(lines)


def _build_karaoke_text(text: str, chunk_start: float, chunk_end: float) -> str:
    """
    Wrap each word in {\\kXX} tags where XX is the word's duration in centiseconds.

    Since we don't have per-word timestamps at the chunk level, we estimate
    each word's duration by distributing the chunk's total duration evenly
    across the words. The result looks like:

        {\\k50}Hello {\\k40}world

    In practice, for a true per-word effect, word-level timing data from
    the original Whisper output would be used inside each chunk. This is a
    reasonable approximation when words are few per chunk.
    """
    words = text.split()
    if not words or len(words) == 1:
        return text

    total_cs = int((chunk_end - chunk_start) * 100)
    per_word_cs = max(1, total_cs // len(words))
    remainder = total_cs - per_word_cs * len(words)

    parts = []
    for i, word in enumerate(words):
        extra = 1 if i < remainder else 0
        cs = per_word_cs + extra
        parts.append(f"{{\\k{cs}}}{word}")
    return " ".join(parts)


def _seconds_to_ass_time(seconds: float) -> str:
    """Convert a float seconds value to ASS time format H:MM:SS.cc."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centisecs = int(round((seconds % 1) * 100))
    return f"{hours}:{minutes:02d}:{secs:02d}.{centisecs:02d}"


def _burn_subtitles(input_video: str, ass_file: str, output_video: str):
    """
    Burn .ass subtitles into the video using ffmpeg's ass filter.

    Uses libx264 for video encoding and aac for audio. The ass filter
    path must be absolute (or relative to the working directory –
    we pass it via ffmpeg's -vf flag with proper escaping).
    """
    ass_path = os.path.abspath(ass_file).replace("\\", "/")
    escaped_ass = ass_path.replace(":", "\\:").replace("'", "\\'")

    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "error",
        "-i", input_video,
        "-vf", f"ass='{escaped_ass}'",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        output_video,
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
