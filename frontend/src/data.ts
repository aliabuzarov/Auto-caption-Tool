/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Clip, Track, Caption } from './types';

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

export const MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'media-1',
    title: 'Cyberpunk Neon Street',
    duration: '04:58',
    durationSec: 298,
    thumbnailUrl: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?q=80&w=600&auto=format&fit=crop',
    resolution: '3840×2160 (4K)',
    fps: 23.976,
    category: 'video'
  },
  {
    id: 'media-2',
    title: 'Drifting Supercar Cinematic',
    duration: '02:15',
    durationSec: 135,
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    resolution: '3840×2160 (4K)',
    fps: 60,
    category: 'video'
  },
  {
    id: 'media-3',
    title: 'Tokyo Rain Alleyway',
    duration: '01:45',
    durationSec: 105,
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop',
    resolution: '1920×1080 (FHD)',
    fps: 24,
    category: 'video'
  },
  {
    id: 'media-4',
    title: 'Aerial Cyber-City Drone',
    duration: '03:10',
    durationSec: 190,
    thumbnailUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=600&auto=format&fit=crop',
    resolution: '3840×2160 (4K)',
    fps: 29.97,
    category: 'video'
  },
  {
    id: 'audio-1',
    title: 'Cyber_Drift_Bass.wav',
    duration: '03:45',
    durationSec: 225,
    thumbnailUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop',
    resolution: '48kHz / 24-bit',
    fps: 0,
    category: 'audio',
    artist: 'Volocita'
  },
  {
    id: 'audio-2',
    title: 'Ambient_Synth_Pulse.mp3',
    duration: '05:12',
    durationSec: 312,
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
    resolution: '44.1kHz / 320kbps',
    fps: 0,
    category: 'audio',
    artist: 'Neon Horizon'
  },
  {
    id: 'audio-3',
    title: 'Retro_Future_Melody.wav',
    duration: '02:30',
    durationSec: 150,
    thumbnailUrl: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?q=80&w=600&auto=format&fit=crop',
    resolution: '96kHz / 24-bit',
    fps: 0,
    category: 'audio',
    artist: 'Stardust-99'
  }
];

export const INITIAL_TRACKS: Track[] = [
  { id: 'effects', name: 'Effects', type: 'effects', muted: false, locked: false, solo: false },
  { id: 'text', name: 'Text / Titles', type: 'text', muted: false, locked: false, solo: false },
  { id: 'video', name: 'Video Tracks', type: 'video', muted: false, locked: false, solo: false },
  { id: 'audio', name: 'Audio Tracks', type: 'audio', muted: false, locked: false, solo: false },
];

export const INITIAL_CLIPS: Clip[] = [
  {
    id: 'clip-v1',
    trackId: 'video',
    title: 'Cyberpunk Neon Street',
    start: 130, // seconds (approx 2:10)
    duration: 120, // 2 minutes
    color: 'from-surface-container-high to-surface-container-highest',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?q=80&w=400&auto=format&fit=crop',
    type: 'video'
  },
  {
    id: 'clip-a1',
    trackId: 'audio',
    title: 'Cyber_Drift_Bass.wav',
    start: 110, // seconds (approx 1:50)
    duration: 160, // 2:40
    color: 'from-purple-900/40 to-indigo-900/40 border-purple-500/30',
    hasWaveform: true,
    type: 'audio'
  },
  {
    id: 'clip-t1',
    trackId: 'text',
    title: 'Main Title Fast',
    start: 150, // seconds (approx 2:30)
    duration: 65, // approx 1:05
    color: 'from-pink-950/40 to-rose-950/40 border-pink-500/30',
    type: 'text',
    text: 'FAST'
  },
  {
    id: 'clip-fx1',
    trackId: 'effects',
    title: 'Motion Blur',
    start: 210, // approx 3:30
    duration: 60, // 1 minute
    color: 'from-blue-950/40 to-cyan-950/40 border-blue-500/30',
    type: 'effect',
    effectType: 'blur'
  }
];

export const MOCK_AUTO_CAPTIONS: Caption[] = [
  { id: 'cap-1', start: 132, end: 135, text: 'INITIATING SYSTEM DRIVES...' },
  { id: 'cap-2', start: 136, end: 139, text: 'PREPARING HYPERDRIVE FLUID INTAKE' },
  { id: 'cap-3', start: 140, end: 143, text: 'DRIVING FAST THROUGH THE NEON DISTRICT' },
  { id: 'cap-4', start: 144, end: 147, text: 'THE PULSE OF THE CITY IS ALIVE AT NIGHT' },
  { id: 'cap-5', start: 148, end: 152, text: 'BASS FREQUENCY REACHES 82% MAX POWER' },
  { id: 'cap-6', start: 153, end: 157, text: 'NEURAL NETWORKS SYNCED...' },
  { id: 'cap-7', start: 158, end: 162, text: 'CRAFTED DESIGN MEETS CINEMATIC PERFORMANCE' }
];

export const LUT_PRESETS = [
  { id: 'none', name: 'Raw / No Filter', description: 'Original camera profile' },
  { id: 'cyberpunk', name: 'Cyberpunk Gold', description: 'Heavy purple and intense neon cyan shift' },
  { id: 'vhs', name: 'Vapor VHS', description: 'Analog glow, low contrast, chromatic bleeding' },
  { id: 'noir', name: 'Monochrome Noir', description: 'Deep contrast, high grain, classic silver look' },
  { id: 'teal-orange', name: 'Blockbuster Teal/Orange', description: 'Hollywood standard skin tones with cool shadows' },
  { id: 'cinematic', name: 'Silver Screen', description: 'Desaturated midtones, slightly warm highlights' }
];
