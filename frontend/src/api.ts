/**
 * API service layer for the AutoCaption Django backend.
 *
 * All endpoints are proxied through Vite's dev server so they call
 * localhost:8000 in development.
 */

const API_BASE = '/api';

interface CaptionChunk {
  id: number;
  text: string;
  start: number;
  end: number;
}

interface JobResponse {
  id: string;
  status: string;
  input_video?: string;
  caption_data?: CaptionChunk[] | null;
  output_video?: string | null;
  error_message?: string | null;
  words_per_line?: number;
  caption_position?: string;
  whisper_model_size?: string;
}

interface CreateJobParams {
  videoFile: File;
  wordsPerLine?: number;
  captionPosition?: string;
  whisperModelSize?: string;
}

/** POST /api/jobs/ – upload a video and start transcription. */
export async function createJob(params: CreateJobParams): Promise<JobResponse> {
  const form = new FormData();
  form.append('input_video', params.videoFile);
  if (params.wordsPerLine) form.append('words_per_line', String(params.wordsPerLine));
  if (params.captionPosition) form.append('caption_position', params.captionPosition);
  if (params.whisperModelSize) form.append('whisper_model_size', params.whisperModelSize);

  const res = await fetch(`${API_BASE}/jobs/`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Upload failed (${res.status})`);
  }

  return res.json();
}

/** GET /api/jobs/<id>/ – poll job status and retrieve caption_data. */
export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/`);
  if (!res.ok) {
    throw new Error(`Failed to fetch job (${res.status})`);
  }
  return res.json();
}

/** PATCH /api/jobs/<id>/captions/ – save user-edited caption_data. */
export async function updateCaptions(jobId: string, captionData: CaptionChunk[]): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/captions/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caption_data: captionData }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to save captions (${res.status})`);
  }

  return res.json();
}

/** POST /api/jobs/<id>/render/ – trigger caption burning / rendering. */
export async function renderJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/render/`, {
    method: 'POST',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to start render (${res.status})`);
  }

  return res.json();
}

/** GET /api/jobs/<id>/download/ – returns a Blob of the rendered video. */
export async function downloadVideo(jobId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/download/`);
  if (!res.ok) {
    throw new Error(`Download not ready (${res.status})`);
  }
  return res.blob();
}

/** Build a full media URL – works for input_video and output_video fields. */
export function mediaUrl(relativePath: string): string {
  if (relativePath.startsWith('http')) return relativePath;
  if (relativePath.startsWith('/media/')) return relativePath;
  if (relativePath.startsWith('media/')) return '/' + relativePath;
  return '/media/' + relativePath;
}

export type { CaptionChunk, JobResponse, CreateJobParams };
