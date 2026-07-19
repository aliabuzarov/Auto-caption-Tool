/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Clip, Track } from './types';

export interface MediaItem {
  id: string;
  title: string;
  duration: string; // duration label
  durationSec: number;
  thumbnailUrl: string;
  resolution: string;
  fps: number;
  category: 'video' | 'audio' | 'image';
  artist?: string;
  waveformData?: number[];
}

export const INITIAL_TRACKS: Track[] = [
  { id: 'video', name: 'Video Tracks', type: 'video', muted: false, locked: false, solo: false },
  { id: 'audio', name: 'Audio Tracks', type: 'audio', muted: false, locked: false, solo: false },
  { id: 'text', name: 'Text / Titles', type: 'text', muted: false, locked: false, solo: false },
  { id: 'effects', name: 'Effects', type: 'effects', muted: false, locked: false, solo: false },
];

export const LUT_PRESETS = [
  { id: 'none', name: 'Raw / No Filter', description: 'Original camera profile' },
  { id: 'cyberpunk', name: 'Cyberpunk Gold', description: 'Heavy purple and intense neon cyan shift' },
  { id: 'vhs', name: 'Vapor VHS', description: 'Analog glow, low contrast, chromatic bleeding' },
  { id: 'noir', name: 'Monochrome Noir', description: 'Deep contrast, high grain, classic silver look' },
  { id: 'teal-orange', name: 'Blockbuster Teal/Orange', description: 'Hollywood standard skin tones with cool shadows' },
  { id: 'cinematic', name: 'Silver Screen', description: 'Desaturated midtones, slightly warm highlights' },
];
