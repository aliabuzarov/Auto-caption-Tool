/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Clip {
  id: string;
  trackId: string; // 'video' | 'audio' | 'text' | 'effects'
  title: string;
  start: number; // in seconds
  duration: number; // in seconds
  color: string; // Tailwind bg-class
  thumbnailUrl?: string;
  hasWaveform?: boolean;
  type: 'video' | 'audio' | 'text' | 'effect';
  text?: string;
  effectType?: string;
  textColor?: string;
  textBgColor?: string;
  textFontSize?: number;
  textBold?: boolean;
  textShowBg?: boolean;
}

export interface Track {
  id: string; // 'video' | 'audio' | 'text' | 'effects'
  name: string;
  type: 'video' | 'audio' | 'text' | 'effects';
  muted: boolean;
  locked: boolean;
  solo: boolean;
}

export type SidebarTab = 'media' | 'import' | 'text' | 'audio' | 'effects' | 'ai-tools' | 'assets' | 'export';

export type InspectorTab = 'video' | 'audio' | 'effects' | 'text' | 'export';

export interface VideoTransform {
  scale: number; // percentage (e.g. 124)
  x: number; // pixels offset
  y: number; // pixels offset
  rotation: number; // degrees
  opacity: number; // percentage
}

export interface AudioSettings {
  volume: number; // percentage
  bass: number; // percentage
  treble: number; // percentage
  enhancedVoice: boolean;
}

export interface EffectSettings {
  blur: number; // px
  contrast: number; // percentage
  brightness: number; // percentage
  saturation: number; // percentage
  lut: 'none' | 'cyberpunk' | 'vhs' | 'noir' | 'teal-orange' | 'cinematic';
  vignette: boolean;
  chromaticAberration: number; // px
}

export type AnimationCurve = 'ease-in-out' | 'ease-in' | 'ease-out' | 'linear';

export interface Caption {
  id: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

export interface CaptionChunk {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: WordTiming[];
}

export type JobStatus =
  | 'pending'
  | 'transcribing'
  | 'ready_for_review'
  | 'rendering'
  | 'done'
  | 'failed';

export interface JobResponse {
  id: string;
  status: JobStatus;
  input_video?: string;
  caption_data?: CaptionChunk[] | null;
  output_video?: string | null;
  error_message?: string | null;
  words_per_line?: number;
  caption_position?: string;
  whisper_model_size?: string;
}
