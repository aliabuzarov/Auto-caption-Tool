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
  words?: { text: string; start: number; end: number }[];
}

interface JobResponse {
  id: string;
  name: string;
  thumbnail?: string | null;
  status: string;
  input_video?: string;
  caption_data?: CaptionChunk[] | null;
  output_video?: string | null;
  error_message?: string | null;
  words_per_line?: number;
  caption_position?: string;
  whisper_model_size?: string;
  edit_token?: string;
}

export interface JobListResponse {
  id: string;
  name: string;
  thumbnail?: string | null;
  status: string;
  input_video?: string;
  output_video?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateJobParams {
  videoFile: File;
  wordsPerLine?: number;
  captionPosition?: string;
  whisperModelSize?: string;
}

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Edit-Token'] = token;
  return headers;
}

/** POST /api/jobs/ – upload a video and start transcription. */
export function createJob(
  params: CreateJobParams,
  onProgress?: (percent: number) => void
): Promise<JobResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('input_video', params.videoFile);
    if (params.wordsPerLine) form.append('words_per_line', String(params.wordsPerLine));
    if (params.captionPosition) form.append('caption_position', params.captionPosition);
    if (params.whisperModelSize) form.append('whisper_model_size', params.whisperModelSize);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/jobs/`);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve({ id: '', name: '', status: 'error' });
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || `Upload failed (${xhr.status})`));
        } catch (e) {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}

/** PATCH /api/jobs/<id>/ – update project name */
export async function updateProject(jobId: string, name: string, token?: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

/** DELETE /api/jobs/<id>/ – delete project */
export async function deleteProject(jobId: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/`, { 
    method: 'DELETE',
    headers: token ? { 'X-Edit-Token': token } : undefined
  });
  if (!res.ok) throw new Error('Failed to delete project');
}

/** GET /api/jobs/ – list all jobs (history). */
export async function getJobs(): Promise<JobListResponse[]> {
  const res = await fetch(`${API_BASE}/jobs/`);
  if (!res.ok) throw new Error('Failed to fetch job history');
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
export async function updateCaptions(jobId: string, captionData: CaptionChunk[], token?: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/captions/`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ caption_data: captionData }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to save captions (${res.status})`);
  }

  return res.json();
}

/** POST /api/jobs/<id>/render/ – trigger caption burning / rendering. */
export async function renderJob(
  jobId: string,
  previewDimensions?: { width: number; height: number },
  captionOffset?: { x: number; y: number },
  exportSettings?: { resolution: string; quality: string },
  captionStyle?: import('./types').CaptionStyle,
  token?: string
): Promise<JobResponse> {
  const body = JSON.stringify({ previewDimensions, captionOffset, exportSettings, captionStyle });
  const res = await fetch(`${API_BASE}/jobs/${jobId}/render/`, {
    method: 'POST',
    headers: getHeaders(token),
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to start render (${res.status})`);
  }

  return res.json();
}

/** POST /api/jobs/<id>/regenerate/ – regenerate captions with new settings */
export async function regenerateJob(jobId: string, wordsPerLine: number, whisperModelSize: string, token?: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/regenerate/`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ words_per_line: wordsPerLine, whisper_model_size: whisperModelSize }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to regenerate (${res.status})`);
  }
  return res.json();
}

/** PATCH /api/jobs/<id>/settings/ – autosave settings */
export async function updateSettings(
  jobId: string, 
  captionData?: CaptionChunk[], 
  captionOffset?: { x: number; y: number }, 
  captionStyle?: import('./types').CaptionStyle, 
  token?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/settings/`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ caption_data: captionData, caption_offset: captionOffset, caption_style: captionStyle }),
  });
  if (!res.ok) {
    throw new Error('Failed to save settings');
  }
}

/** POST /api/jobs/<id>/cancel/ – cancel a pending/transcribing job */
export async function cancelJob(jobId: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/cancel/`, {
    method: 'POST',
    headers: token ? { 'X-Edit-Token': token } : undefined
  });
  if (!res.ok) {
    throw new Error('Failed to cancel job');
  }
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
