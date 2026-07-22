import { create } from 'zustand';
import { Clip, Caption, CaptionChunk, Track } from '../types';
import { MediaItem, INITIAL_TRACKS } from '../data';

interface TransformState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

interface EffectsState {
  blur: number;
  contrast: number;
  brightness: number;
  saturation: number;
  lut: 'none' | 'cyberpunk' | 'vhs' | 'noir' | 'teal-orange' | 'cinematic';
  vignette: boolean;
  chromaticAberration: number;
}

interface AudioSettings {
  volume: number;
  bass: number;
  treble: number;
  enhancedVoice: boolean;
}


interface EditorState {
  // Navigation
  viewMode: 'dashboard' | 'editor';
  setViewMode: (mode: 'dashboard' | 'editor') => void;
  activeTab: 'media' | 'import' | 'text' | 'effects' | 'export';
  setActiveTab: (tab: 'media' | 'import' | 'text' | 'effects' | 'export') => void;
  inspectorTab: 'video' | 'audio' | 'text' | 'effects' | 'export';
  setInspectorTab: (tab: 'video' | 'audio' | 'text' | 'effects' | 'export') => void;

  // Media & Clips
  mediaList: MediaItem[];
  setMediaList: (updater: MediaItem[] | ((prev: MediaItem[]) => MediaItem[])) => void;
  tracks: Track[];
  setTracks: (updater: Track[] | ((prev: Track[]) => Track[])) => void;
  activeMedia: MediaItem | null;
  setActiveMedia: (media: MediaItem | null) => void;
  clips: Clip[];
  setClips: (updater: Clip[] | ((prev: Clip[]) => Clip[])) => void;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;

  // Playback
  isPlaying: boolean;
  setIsPlaying: (playing: boolean | ((prev: boolean) => boolean)) => void;
  currentTime: number;
  setCurrentTime: (time: number | ((prev: number) => number)) => void;
  videoDuration: number;
  setVideoDuration: (duration: number) => void;

  // Transform & Effects
  transform: TransformState;
  setTransform: (updater: TransformState | ((prev: TransformState) => TransformState)) => void;
  audioSettings: AudioSettings;
  setAudioSettings: (updater: AudioSettings | ((prev: AudioSettings) => AudioSettings)) => void;
  effects: EffectsState;
  setEffects: (updater: EffectsState | ((prev: EffectsState) => EffectsState)) => void;

  // Timeline
  markers: number[];
  setMarkers: (updater: number[] | ((prev: number[]) => number[])) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;

  // AI Captions
  uploadProgress: number | null;
  setUploadProgress: (progress: number | null) => void;
  isGeneratingCaptions: boolean;
  setIsGeneratingCaptions: (generating: boolean) => void;
  hasCaptions: boolean;
  setHasCaptions: (has: boolean) => void;
  jobId: string | null;
  setJobId: (id: string | null) => void;
  jobStatus: string | null;
  setJobStatus: (status: string | null) => void;
  wordsPerLine: number;
  setWordsPerLine: (words: number) => void;
  activeCaptions: Caption[];
  setActiveCaptions: (updater: Caption[] | ((prev: Caption[]) => Caption[])) => void;
  editingCaptions: CaptionChunk[] | null;
  setEditingCaptions: (updater: CaptionChunk[] | null | ((prev: CaptionChunk[] | null) => CaptionChunk[] | null)) => void;
  captionOffset: { x: number; y: number };
  setCaptionOffset: (updater: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;

  // Export / Video file
  userVideoFile: File | null;
  setUserVideoFile: (file: File | null) => void;
  userVideoUrl: string | null;
  setUserVideoUrl: (url: string | null) => void;
  isExporting: boolean;
  setIsExporting: (exporting: boolean) => void;
  isExported: boolean;
  setIsExported: (exported: boolean) => void;
  exportProgress: number;
  setExportProgress: (updater: number | ((prev: number) => number)) => void;
  downloadUrl: string | null;
  setDownloadUrl: (url: string | null) => void;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  exportResolution: string;
  setExportResolution: (res: string) => void;
  exportQuality: string;
  setExportQuality: (q: string) => void;

  // History (Undo/Redo)
  past: { clips: Clip[]; transform: TransformState }[];
  future: { clips: Clip[]; transform: TransformState }[];
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Toasts
  toasts: { id: number; msg: string }[];
  showToast: (msg: string) => void;
  removeToast: (id: number) => void;
}

let toastIdCounter = 0;

export const useEditorStore = create<EditorState>((set) => ({
  // Navigation
  viewMode: 'dashboard',
  setViewMode: (mode) => set({ viewMode: mode }),
  activeTab: 'import',
  setActiveTab: (tab) => set({ activeTab: tab }),
  inspectorTab: 'video',
  setInspectorTab: (tab) => set({ inspectorTab: tab }),

  // Media & Clips
  mediaList: [],
  setMediaList: (updater) => set((state) => ({ mediaList: typeof updater === 'function' ? updater(state.mediaList) : updater })),
  tracks: INITIAL_TRACKS,
  setTracks: (updater) => set((state) => ({ tracks: typeof updater === 'function' ? updater(state.tracks) : updater })),
  activeMedia: null,
  setActiveMedia: (media) => set({ activeMedia: media }),
  clips: [],
  setClips: (updater) => set((state) => ({ clips: typeof updater === 'function' ? updater(state.clips) : updater })),
  selectedClipId: null,
  setSelectedClipId: (id) => set({ selectedClipId: id }),

  // Playback
  isPlaying: false,
  setIsPlaying: (updater) => set((state) => ({ isPlaying: typeof updater === 'function' ? updater(state.isPlaying) : updater })),
  currentTime: 0,
  setCurrentTime: (updater) => set((state) => ({ currentTime: typeof updater === 'function' ? updater(state.currentTime) : updater })),
  videoDuration: 0,
  setVideoDuration: (duration) => set({ videoDuration: duration }),

  // Transform & Effects
  transform: { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100 },
  setTransform: (updater) => set((state) => ({ transform: typeof updater === 'function' ? updater(state.transform) : updater })),
  audioSettings: { volume: 82, bass: 40, treble: 65, enhancedVoice: false },
  setAudioSettings: (updater) => set((state) => ({ audioSettings: typeof updater === 'function' ? updater(state.audioSettings) : updater })),
  effects: { blur: 0, contrast: 100, brightness: 100, saturation: 100, lut: 'none', vignette: false, chromaticAberration: 0 },
  setEffects: (updater) => set((state) => ({ effects: typeof updater === 'function' ? updater(state.effects) : updater })),

  // Timeline
  markers: [],
  setMarkers: (updater) => set((state) => ({ markers: typeof updater === 'function' ? updater(state.markers) : updater })),
  snapToGrid: true,
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  zoom: 100,
  setZoom: (updater) => set((state) => ({ zoom: typeof updater === 'function' ? updater(state.zoom) : updater })),

  // AI Captions
  uploadProgress: null,
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  isGeneratingCaptions: false,
  setIsGeneratingCaptions: (generating) => set({ isGeneratingCaptions: generating }),
  hasCaptions: false,
  setHasCaptions: (has) => set({ hasCaptions: has }),
  jobId: null,
  setJobId: (id) => set({ jobId: id }),
  jobStatus: null,
  setJobStatus: (status) => set({ jobStatus: status }),
  wordsPerLine: 1,
  setWordsPerLine: (words) => set({ wordsPerLine: words }),
  activeCaptions: [],
  setActiveCaptions: (updater) => set((state) => ({ activeCaptions: typeof updater === 'function' ? updater(state.activeCaptions) : updater })),
  editingCaptions: null,
  setEditingCaptions: (updater) => set((state) => ({ editingCaptions: typeof updater === 'function' ? updater(state.editingCaptions) : updater })),
  captionOffset: { x: 0, y: 0 },
  setCaptionOffset: (updater) => set((state) => ({ captionOffset: typeof updater === 'function' ? updater(state.captionOffset) : updater })),

  // Export / Video file
  userVideoFile: null,
  setUserVideoFile: (file) => set({ userVideoFile: file }),
  userVideoUrl: null,
  setUserVideoUrl: (url) => set({ userVideoUrl: url }),
  isExporting: false,
  setIsExporting: (exporting) => set({ isExporting: exporting }),
  isExported: false,
  setIsExported: (exported) => set({ isExported: exported }),
  exportProgress: 0,
  setExportProgress: (updater) => set((state) => ({ exportProgress: typeof updater === 'function' ? updater(state.exportProgress) : updater })),
  downloadUrl: null,
  setDownloadUrl: (url) => set({ downloadUrl: url }),
  showExportModal: false,
  setShowExportModal: (show) => set({ showExportModal: show }),
  exportResolution: '1080p',
  setExportResolution: (res) => set({ exportResolution: res }),
  exportQuality: 'high',
  setExportQuality: (q) => set({ exportQuality: q }),

  // Toasts
  toasts: [],
  showToast: (msg) => {
    const id = ++toastIdCounter;
    set((state) => ({ toasts: [...state.toasts, { id, msg }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  // History (Undo/Redo)
  past: [],
  future: [],
  saveHistory: () =>
    set((state) => ({
      past: [...state.past, { clips: state.clips, transform: state.transform }],
      future: [],
    })),
  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      return {
        past: newPast,
        future: [{ clips: state.clips, transform: state.transform }, ...state.future],
        clips: previous.clips,
        transform: previous.transform,
      };
    }),
  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, { clips: state.clips, transform: state.transform }],
        future: newFuture,
        clips: next.clips,
        transform: next.transform,
      };
    }),
}));
