/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Tv,
  Settings,
  Download,
  Check,
  Sparkle,
  CircleAlert,
  Keyboard,
  Info,
  FileVideo,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  Clip,
  Track,
  SidebarTab,
  InspectorTab,
  VideoTransform,
  AudioSettings,
  EffectSettings,
  Caption,
  CaptionChunk,
  JobStatus,
} from './types';
import {
  INITIAL_TRACKS,
  INITIAL_CLIPS,
  MEDIA_ITEMS,
  MOCK_AUTO_CAPTIONS,
  LUT_PRESETS,
  MediaItem,
} from './data';
import {
  createJob,
  getJob,
  updateCaptions,
  renderJob,
  downloadVideo,
  mediaUrl,
} from './api';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PreviewCanvas from './components/PreviewCanvas';
import Timeline from './components/Timeline';
import Inspector from './components/Inspector';
import CommandPalette from './components/CommandPalette';

export default function App() {
  // --- WORKSPACE CORE STATES ---
  const [activeTab, setActiveTab] = useState<SidebarTab>('media');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('video');
  const [mediaList, setMediaList] = useState<MediaItem[]>(MEDIA_ITEMS);
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [clips, setClips] = useState<Clip[]>(INITIAL_CLIPS);
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip-v1');
  const [activeMedia, setActiveMedia] = useState<MediaItem>(MEDIA_ITEMS[0]);

  // --- PLAYBACK ENGINE STATES ---
  const [currentTime, setCurrentTime] = useState<number>(130);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // --- INSPECTOR PARAMETER STATES ---
  const [transform, setTransform] = useState<VideoTransform>({
    scale: 124, x: 0, y: 0, rotation: 0, opacity: 100,
  });
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    volume: 82, bass: 40, treble: 65, enhancedVoice: false,
  });
  const [effects, setEffects] = useState<EffectSettings>({
    blur: 0, contrast: 100, brightness: 100, saturation: 100,
    lut: 'none', vignette: false, chromaticAberration: 0,
  });

  // --- MARKERS & SNAP ---
  const [markers, setMarkers] = useState<number[]>([130, 210]);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // --- AI PROCESS ENGINE STATES ---
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState<boolean>(false);
  const [hasCaptions, setHasCaptions] = useState<boolean>(false);
  const [activeCaptions, setActiveCaptions] = useState<Caption[]>([]);

  const [isUpscaling, setIsUpscaling] = useState<boolean>(false);
  const [upscaleProgress, setUpscaleProgress] = useState<number>(0);
  const [isUpscaled, setIsUpscaled] = useState<boolean>(false);

  // --- BACKEND JOB FLOW ---
  const [userVideoFile, setUserVideoFile] = useState<File | null>(null);
  const [userVideoUrl, setUserVideoUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [editingCaptions, setEditingCaptions] = useState<CaptionChunk[] | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- PALETTE & MODALS ---
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExported, setIsExported] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const exportPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- NOTIFICATION TOAST ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (exportPollTimerRef.current) clearInterval(exportPollTimerRef.current);
    };
  }, []);

  // --- EFFECT: Playback Simulation Tick Loop (only when no real video) ---
  useEffect(() => {
    if (userVideoUrl) return; // don't simulate when real video is loaded
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 300) { setIsPlaying(false); return 300; }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, userVideoUrl]);

  // --- SELECTION LINK ---
  useEffect(() => {
    if (selectedClipId) {
      const activeClip = clips.find((c) => c.id === selectedClipId);
      if (activeClip && activeClip.type === 'video') {
        const matchMedia = mediaList.find((m) => m.title === activeClip.title);
        if (matchMedia) setActiveMedia(matchMedia);
      }
    }
  }, [selectedClipId, clips, mediaList]);

  // --- WORKSPACE HANDLERS ---
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleUpdateTransform = useCallback((updated: Partial<VideoTransform>) => {
    setTransform((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleUpdateAudio = useCallback((updated: Partial<AudioSettings>) => {
    setAudioSettings((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleUpdateEffects = useCallback((updated: Partial<EffectSettings>) => {
    setEffects((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleResetTransform = useCallback(() => {
    setTransform({ scale: 100, x: 0, y: 0, rotation: 0, opacity: 100 });
    showToast('Reset bounding transforms to raw profile');
  }, [showToast]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleToggleTrack = useCallback((trackId: string, property: 'muted' | 'locked' | 'solo') => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, [property]: !track[property] } : track,
      ),
    );
  }, []);

  const handleSelectClip = useCallback((clipId: string) => {
    setSelectedClipId(clipId);
    const clip = clips.find((c) => c.id === clipId);
    if (clip) {
      if (clip.type === 'video') setInspectorTab('video');
      else if (clip.type === 'audio') setInspectorTab('audio');
      else if (clip.type === 'text' || clip.type === 'effect') setInspectorTab('effects');
    }
  }, [clips]);

  const handleUpdateClip = useCallback((clipId: string, updatedFields: Partial<Clip>) => {
    setClips((prev) =>
      prev.map((clip) => (clip.id === clipId ? { ...clip, ...updatedFields } : clip)),
    );
  }, []);

  const handleDeleteClip = useCallback((clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
    showToast('Removed clip from active timeline');
  }, [selectedClipId, showToast]);

  const handleAddMarker = useCallback(() => {
    if (!markers.includes(currentTime)) {
      setMarkers((prev) => [...prev, currentTime].sort((a, b) => a - b));
      showToast('Placed edit marker at current playhead');
    } else {
      setMarkers((prev) => prev.filter((m) => m !== currentTime));
      showToast('Removed edit marker');
    }
  }, [markers, currentTime, showToast]);

  const handleSplitClip = useCallback(() => {
    if (!selectedClipId) { showToast('No clip selected to split'); return; }
    const clipToSplit = clips.find((c) => c.id === selectedClipId);
    if (!clipToSplit) return;
    if (currentTime > clipToSplit.start && currentTime < clipToSplit.start + clipToSplit.duration) {
      const fp = currentTime - clipToSplit.start;
      const sp = clipToSplit.start + clipToSplit.duration - currentTime;
      const clip1: Clip = { ...clipToSplit, id: `${clipToSplit.id}-pt1`, duration: fp };
      const clip2: Clip = { ...clipToSplit, id: `${clipToSplit.id}-pt2`, title: `${clipToSplit.title} (Split)`, start: currentTime, duration: sp };
      setClips((prev) => [...prev.filter((c) => c.id !== selectedClipId), clip1, clip2]);
      setSelectedClipId(clip2.id);
      showToast('Successfully cut clip at playhead');
    } else {
      showToast('Playhead must intersect selected clip bounds to split');
    }
  }, [clips, selectedClipId, currentTime, showToast]);

  const handleAddMediaToTimeline = useCallback((item: MediaItem) => {
    const isAudio = item.category === 'audio';
    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      trackId: isAudio ? 'audio' : 'video',
      title: item.title,
      start: currentTime,
      duration: Math.min(item.durationSec, 45),
      color: isAudio ? 'from-purple-900/40 to-indigo-900/40 border-purple-500/30' : 'from-surface-container-high to-surface-container-highest',
      thumbnailUrl: item.thumbnailUrl,
      hasWaveform: isAudio,
      type: isAudio ? 'audio' : 'video',
    };
    setClips((prev) => [...prev, newClip]);
    setSelectedClipId(newClip.id);
    showToast(`Added "${item.title}" to active timeline track`);
  }, [currentTime, showToast]);

  const handleSelectMediaForPlayer = useCallback((item: MediaItem) => {
    setActiveMedia(item);
    setTransform((prev) => ({ ...prev, scale: 100 }));
  }, []);

  const handleAddTextClip = useCallback((title: string) => {
    const newClip: Clip = {
      id: `text-${Date.now()}`, trackId: 'text', title,
      start: currentTime, duration: 35,
      color: 'from-pink-950/40 to-rose-950/40 border-pink-500/30',
      type: 'text', text: title,
    };
    setClips((prev) => [...prev, newClip]);
    setSelectedClipId(newClip.id);
    showToast(`Inserted custom typography: "${title}"`);
  }, [currentTime, showToast]);

  const handleSelectLUT = useCallback((lutId: string) => {
    setEffects((prev) => ({ ...prev, lut: lutId as any }));
    showToast(`Applied Cinematic LUT: ${lutId.toUpperCase()}`);
  }, [showToast]);

  // =====================================================================
  // REAL BACKEND FLOW: File import stores the File reference.
  // =====================================================================
  const handleVideoFileSelected = useCallback((file: File) => {
    setUserVideoFile(file);
    const url = URL.createObjectURL(file);
    setUserVideoUrl(url);
    showToast(`Video "${file.name}" loaded for captioning`);
  }, [showToast]);

  // =====================================================================
  // REAL BACKEND FLOW: Upload video → transcribe → get captions.
  // =====================================================================
  const handleRunAICaptions = useCallback(async () => {
    if (isGeneratingCaptions) return;

    if (!userVideoFile) {
      showToast('Import a video first in the Import tab, then generate captions');
      setActiveTab('import');
      return;
    }

    setIsGeneratingCaptions(true);
    showToast('Uploading video and starting transcription...');

    try {
      const job = await createJob({
        videoFile: userVideoFile,
        wordsPerLine: 3,
        captionPosition: 'bottom',
        whisperModelSize: 'small',
      });

      setJobId(job.id);
      setJobStatus(job.status as JobStatus);

      // Poll for transcription completion
      pollTimerRef.current = setInterval(async () => {
        try {
          const currentJob = await getJob(job.id);
          setJobStatus(currentJob.status as JobStatus);

          if (currentJob.status === 'ready_for_review') {
            clearInterval(pollTimerRef.current!);
            pollTimerRef.current = null;
            setIsGeneratingCaptions(false);

            const chunks: CaptionChunk[] = currentJob.caption_data || [];
            setEditingCaptions(chunks);

            // Convert to the Caption format the UI uses
            const captions: Caption[] = chunks.map((c) => ({
              id: String(c.id),
              start: c.start,
              end: c.end,
              text: c.text,
            }));
            setActiveCaptions(captions);
            setHasCaptions(true);

            // Update video URL to backend-served file
            if (currentJob.input_video) {
              setUserVideoUrl(mediaUrl(currentJob.input_video));
            }

            showToast('AI Captions generated! Review and edit below, then Export.');
          } else if (currentJob.status === 'failed') {
            clearInterval(pollTimerRef.current!);
            pollTimerRef.current = null;
            setIsGeneratingCaptions(false);
            setJobStatus('failed');
            showToast('Transcription failed: ' + (currentJob.error_message || 'Unknown error'));
          }
        } catch (err: any) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          setIsGeneratingCaptions(false);
          setJobStatus('failed');
          showToast('Lost connection while transcribing: ' + err.message);
        }
      }, 2000);
    } catch (err: any) {
      setIsGeneratingCaptions(false);
      showToast('Upload failed: ' + err.message);
    }
  }, [isGeneratingCaptions, userVideoFile, showToast, setActiveTab]);

  // =====================================================================
  // Update a single caption's text (in the editor).
  // =====================================================================
  const handleCaptionTextEdit = useCallback((captionId: number, newText: string) => {
    setEditingCaptions((prev) =>
      prev
        ? prev.map((c) => (c.id === captionId ? { ...c, text: newText } : c))
        : null,
    );
    setActiveCaptions((prev) =>
      prev.map((c) => (c.id === String(captionId) ? { ...c, text: newText } : c)),
    );
  }, []);

  const handleTriggerUpscale = useCallback(() => {
    if (isUpscaling) return;
    setIsUpscaling(true);
    setUpscaleProgress(0);
    showToast('AI model calculating high-frequency textures...');
    const interval = setInterval(() => {
      setUpscaleProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUpscaling(false);
          setIsUpscaled(true);
          setMediaList((current) =>
            current.map((media) =>
              media.id === activeMedia.id
                ? { ...media, resolution: '3840×2160 (4K Neural Ultra)' }
                : media,
            ),
          );
          showToast('Neural upscaler successfully generated high-res 4K assets!');
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  }, [isUpscaling, activeMedia, showToast]);

  const handleImportFile = useCallback((mockItem: MediaItem) => {
    setMediaList((prev) => [mockItem, ...prev]);
    showToast(`Successfully imported: ${mockItem.title}`);
  }, [showToast]);

  // =====================================================================
  // REAL BACKEND FLOW: Save captions → render → download.
  // =====================================================================
  const handleTriggerExport = useCallback(async () => {
    if (!jobId || !editingCaptions) {
      showToast('Generate captions first before exporting');
      return;
    }

    setIsExporting(true);
    setExportProgress(5);
    showToast('Saving caption edits and starting render...');

    try {
      // Step 1: Save edited captions
      setExportProgress(20);
      await updateCaptions(jobId, editingCaptions);

      // Step 2: Trigger render
      setExportProgress(40);
      await renderJob(jobId);
      setJobStatus('rendering');

      // Step 3: Poll for render completion
      exportPollTimerRef.current = setInterval(async () => {
        try {
          const currentJob = await getJob(jobId);
          setJobStatus(currentJob.status as JobStatus);

          // Map progress roughly: 40-90% while rendering
          if (currentJob.status === 'rendering') {
            setExportProgress((prev) => Math.min(prev + 3, 85));
          } else if (currentJob.status === 'done') {
            clearInterval(exportPollTimerRef.current!);
            exportPollTimerRef.current = null;
            setExportProgress(100);
            setIsExporting(false);
            setIsExported(true);
            setDownloadUrl(`/api/jobs/${jobId}/download/`);
            showToast('Render complete! Download your captioned video below.');
          } else if (currentJob.status === 'failed') {
            clearInterval(exportPollTimerRef.current!);
            exportPollTimerRef.current = null;
            setIsExporting(false);
            setJobStatus('failed');
            showToast('Render failed: ' + (currentJob.error_message || 'Unknown error'));
          }
        } catch (err: any) {
          clearInterval(exportPollTimerRef.current!);
          exportPollTimerRef.current = null;
          setIsExporting(false);
          showToast('Lost connection during render: ' + err.message);
        }
      }, 2000);
    } catch (err: any) {
      setIsExporting(false);
      showToast('Export failed: ' + err.message);
    }
  }, [jobId, editingCaptions, showToast]);

  // =====================================================================
  // SHORTCUTS
  // =====================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setIsCommandPaletteOpen((prev) => !prev); }
      if (e.key === ' ') { e.preventDefault(); handleTogglePlay(); }
      if (e.key.toLowerCase() === 's') { e.preventDefault(); handleSplitClip(); }
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); handleAddMarker(); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); handleResetTransform(); }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); handleRunAICaptions(); }
      if (e.key.toLowerCase() === 'u') { e.preventDefault(); handleTriggerUpscale(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleSplitClip, handleAddMarker, handleResetTransform, handleRunAICaptions, handleTriggerUpscale]);

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="h-screen w-screen flex flex-col p-6 gap-5 bg-background-dark text-on-surface antialiased overflow-hidden select-none font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(173,198,255,0.035)_0%,_transparent_65%)] pointer-events-none z-0"></div>

      <Header onExport={() => setShowExportModal(true)} />

      <main className="flex-1 flex gap-5 min-h-0 z-10 w-full max-w-7xl mx-auto">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mediaList={mediaList}
          onAddMediaToTimeline={handleAddMediaToTimeline}
          onSelectMediaForPlayer={handleSelectMediaForPlayer}
          activeMediaId={activeMedia.id}
          onAddTextClip={handleAddTextClip}
          onSelectLUT={handleSelectLUT}
          activeLUT={effects.lut}
          onRunAICaptions={handleRunAICaptions}
          isGeneratingCaptions={isGeneratingCaptions}
          hasCaptions={hasCaptions}
          onImportFile={handleImportFile}
          onVideoFileSelected={handleVideoFileSelected}
          jobStatus={jobStatus}
        />

        <div className="flex-1 flex flex-col gap-5 min-w-0">
          <PreviewCanvas
            activeMedia={activeMedia}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            transform={transform}
            onUpdateTransform={handleUpdateTransform}
            effects={effects}
            currentTime={currentTime}
            onSeek={handleSeek}
            activeCaptions={activeCaptions}
            showCaptions={hasCaptions}
            onSplitClip={handleSplitClip}
            onAddMarker={handleAddMarker}
            userVideoUrl={userVideoUrl}
            editingCaptions={editingCaptions}
            onCaptionTextEdit={handleCaptionTextEdit}
            jobStatus={jobStatus}
          />

          <Timeline
            tracks={tracks}
            onToggleTrack={handleToggleTrack}
            clips={clips}
            selectedClipId={selectedClipId}
            onSelectClip={handleSelectClip}
            currentTime={currentTime}
            onSeek={handleSeek}
            onUpdateClip={handleUpdateClip}
            zoom={100}
            setZoom={() => {}}
            markers={markers}
            snapToGrid={snapToGrid}
            onToggleSnap={() => setSnapToGrid(!snapToGrid)}
            onDeleteClip={handleDeleteClip}
          />
        </div>

        <Inspector
          activeTab={inspectorTab}
          setActiveTab={setInspectorTab}
          selectedClip={clips.find((c) => c.id === selectedClipId) || null}
          transform={transform}
          onUpdateTransform={handleUpdateTransform}
          audioSettings={audioSettings}
          onUpdateAudioSettings={handleUpdateAudio}
          effects={effects}
          onUpdateEffects={handleUpdateEffects}
          isPlaying={isPlaying}
          onDeleteClip={handleDeleteClip}
          onTriggerUpscale={handleTriggerUpscale}
          isUpscaling={isUpscaling}
          upscaleProgress={upscaleProgress}
          isUpscaled={isUpscaled}
          editingCaptions={editingCaptions}
          onCaptionTextEdit={handleCaptionTextEdit}
          currentTime={currentTime}
        />
      </main>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 glass-float px-4.5 py-2.5 rounded-xl border border-white/[0.08] flex items-center gap-2.5 shadow-2xl animate-[fadeIn_0.15s_ease-out]">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
          <span className="text-[10.5px] font-sans font-bold tracking-wide uppercase text-white">{toastMessage}</span>
        </div>
      )}

      {/* Command palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onTogglePlay={handleTogglePlay}
        onSplitClip={handleSplitClip}
        onAddMarker={handleAddMarker}
        onRunAICaptions={handleRunAICaptions}
        onTriggerUpscale={handleTriggerUpscale}
        onResetTransform={handleResetTransform}
        onAddTextClip={handleAddTextClip}
      />

      {/* Export Modal — wired to real backend */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/[0.08] w-full max-w-md rounded-2xl p-6 shadow-[0_30px_70px_rgba(0,0,0,0.85)] flex flex-col gap-5 select-none animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[8px] font-mono font-bold text-primary tracking-widest uppercase">Render Pipeline</span>
                <h3 className="text-sm font-sans font-bold uppercase tracking-wide text-white mt-1">Export Captioned Video</h3>
              </div>
              <button
                onClick={() => { if (!isExporting) { setShowExportModal(false); setIsExported(false); setDownloadUrl(null); } }}
                className={`px-2 py-1 rounded text-[9px] font-mono tracking-widest uppercase border transition-all ${
                  isExporting ? 'bg-white/[0.01] border-white/[0.03] text-on-surface-variant/30 cursor-not-allowed' : 'bg-white/[0.03] border-white/[0.06] text-on-surface-variant hover:text-on-surface cursor-pointer'
                }`}
                disabled={isExporting}
              >
                Close
              </button>
            </div>

            {/* Show caption data summary */}
            {!isExporting && !isExported && editingCaptions && (
              <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3 flex justify-between text-[10px] font-sans">
                <span className="text-on-surface-variant/80">Captions ready</span>
                <span className="text-white font-mono font-bold">{editingCaptions.length} chunks</span>
              </div>
            )}

            {/* Rendering progress */}
            {isExporting && (
              <div className="space-y-3.5 my-4">
                <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-on-surface-variant">
                  <span>
                    {exportProgress < 25 ? 'Saving caption edits...' :
                     exportProgress < 50 ? 'Burning karaoke captions via ffmpeg...' :
                     exportProgress < 90 ? 'Encoding final video with subtitles...' :
                     'Finalizing output file...'}
                  </span>
                  <span className="text-primary font-bold">{exportProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-200" style={{ width: `${exportProgress}%` }} />
                </div>
                <p className="text-[8.5px] text-on-surface-variant/50 leading-relaxed">
                  Rendering captions server-side. The job processes asynchronously &mdash; you can close this and check back.
                </p>
              </div>
            )}

            {/* Completed download */}
            {isExported && downloadUrl && (
              <div className="space-y-4 my-2">
                <div className="bg-green-950/20 border border-green-500/25 rounded-xl p-4 flex gap-3.5 items-start text-green-400">
                  <Check className="w-5 h-5 shrink-0 stroke-[2.5]" />
                  <div>
                    <h4 className="text-[12px] font-sans font-bold uppercase tracking-wider">Render Complete</h4>
                    <p className="text-[10px] text-green-400/80 leading-relaxed mt-1">
                      Your captioned video is ready for download.
                    </p>
                  </div>
                </div>
                <a
                  href={downloadUrl}
                  download
                  className="w-full py-3 bg-primary text-background-dark rounded-xl text-[11px] font-sans font-bold tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-white transition-all shadow-[0_0_15px_rgba(173,198,255,0.2)] no-underline"
                >
                  <Download className="w-4 h-4" />
                  Download Captioned Video
                </a>
                <button
                  onClick={() => { setShowExportModal(false); setIsExported(false); setDownloadUrl(null); }}
                  className="w-full py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[10px] font-sans font-bold uppercase tracking-widest text-on-surface-variant hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer mt-1"
                >
                  Done
                </button>
              </div>
            )}

            {/* Error state */}
            {jobStatus === 'failed' && !isExporting && (
              <div className="bg-red-950/20 border border-red-500/25 rounded-xl p-4 flex gap-3 items-start text-red-400">
                <CircleAlert className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="text-[12px] font-sans font-bold uppercase tracking-wider">Export Failed</h4>
                  <p className="text-[10px] text-red-400/80 leading-relaxed mt-1">Please try generating captions again.</p>
                </div>
              </div>
            )}

            {/* Trigger button */}
            {!isExporting && !isExported && jobStatus !== 'failed' && (
              <button
                onClick={handleTriggerExport}
                disabled={!editingCaptions}
                className={`w-full py-3 rounded-xl text-[11px] font-sans font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(173,198,255,0.2)] ${
                  editingCaptions
                    ? 'bg-primary text-background-dark hover:bg-white cursor-pointer'
                    : 'bg-white/[0.04] text-on-surface-variant/50 cursor-not-allowed border border-white/[0.04]'
                }`}
              >
                {editingCaptions ? 'Save Captions & Render Video' : 'Generate Captions First'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Keyboard hints */}
      <footer className="w-full max-w-7xl mx-auto flex justify-between items-center px-2 shrink-0 select-none pointer-events-none opacity-40 z-10">
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-on-surface-variant tracking-wider uppercase">
          <Keyboard className="w-3.5 h-3.5" />
          <span>Press</span>
          <span className="bg-white/10 px-1 py-0.5 rounded text-white font-bold">Space</span>
          <span>to play/pause</span>
          <span className="ml-2">&bull;</span>
          <span className="bg-white/10 px-1 py-0.5 rounded text-white font-bold">{String.fromCharCode(8984)} K</span>
          <span>for Command Palette</span>
        </div>
        <div className="text-[9px] font-mono text-on-surface-variant tracking-widest uppercase">AutoCaption Engine</div>
      </footer>
    </div>
  );
}
