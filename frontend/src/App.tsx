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
  regenerateJob,
  updateSettings,
  cancelJob,
} from './api';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PreviewCanvas from './components/PreviewCanvas';
import Timeline from './components/Timeline';
import Inspector from './components/Inspector';
import CommandPalette from './components/CommandPalette';
import Dashboard from './components/Dashboard';
import { useEditorStore } from './store/useEditorStore';

export default function App() {
  const {
    viewMode, setViewMode, activeTab, setActiveTab,
    inspectorTab, setInspectorTab, mediaList, setMediaList,
    tracks, setTracks, clips, setClips, selectedClipId, setSelectedClipId,
    activeMedia, setActiveMedia, currentTime, setCurrentTime,
    isPlaying, setIsPlaying, videoDuration, setVideoDuration,
    transform, setTransform, audioSettings, setAudioSettings,
    effects, setEffects, markers, setMarkers, snapToGrid, setSnapToGrid,
    zoom, setZoom, isGeneratingCaptions, setIsGeneratingCaptions,
    uploadProgress, setUploadProgress,
    hasCaptions, setHasCaptions, activeCaptions, setActiveCaptions,
    wordsPerLine, setWordsPerLine, userVideoFile, setUserVideoFile,
    userVideoUrl, setUserVideoUrl, jobId, setJobId, jobStatus, setJobStatus,
    editingCaptions, setEditingCaptions, captionOffset, setCaptionOffset,
    showExportModal, setShowExportModal, isExporting, setIsExporting,
    exportResolution, setExportResolution, exportQuality, setExportQuality,
    exportProgress, setExportProgress, isExported, setIsExported,
    downloadUrl, setDownloadUrl, toasts, showToast,
    saveHistory, undo, redo, captionStyle,
    editToken, setEditToken, previewDimensions
  } = useEditorStore();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(320);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(320);
  const [timelineHeight, setTimelineHeight] = useState<number>(256);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exportPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (exportPollTimerRef.current) clearInterval(exportPollTimerRef.current);
    };
  }, []);

  // Autosave settings
  useEffect(() => {
    if (!jobId || !editToken || jobStatus === 'transcribing') return;

    const timeout = setTimeout(() => {
      updateSettings(jobId, editingCaptions || undefined, captionOffset, captionStyle, editToken).catch(console.error);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [jobId, editToken, editingCaptions, captionOffset, captionStyle, jobStatus]);

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
      else if (clip.type === 'text') setInspectorTab('text');
      else if (clip.type === 'effect') setInspectorTab('effects');
    }
  }, [clips]);

  const handleUpdateClip = useCallback((clipId: string, updatedFields: Partial<Clip>) => {
    saveHistory();
    setClips((prev) =>
      prev.map((clip) => (clip.id === clipId ? { ...clip, ...updatedFields } : clip)),
    );
  }, [saveHistory]);

  const handleDeleteClip = useCallback((clipId: string) => {
    saveHistory();
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
    showToast('Removed clip from active timeline');
  }, [selectedClipId, saveHistory, showToast]);

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
      saveHistory();
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
      duration: Math.min(item.durationSec, videoDuration),
      color: isAudio ? 'from-purple-900/40 to-indigo-900/40 border-purple-500/30' : 'from-surface-container-high to-surface-container-highest',
      thumbnailUrl: item.thumbnailUrl,
      hasWaveform: isAudio,
      type: isAudio ? 'audio' : 'video',
    };
    setClips((prev) => [...prev, newClip]);
    setSelectedClipId(newClip.id);
    showToast(`Added "${item.title}" to active timeline track`);
  }, [currentTime, videoDuration, showToast]);

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
      textColor: '#ffffff',
      textBgColor: 'rgba(0,0,0,0.7)',
      textFontSize: 20,
      textBold: true,
      textShowBg: true,
      isCustomText: true,
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
    if (userVideoUrl && userVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(userVideoUrl);
    }
    const url = URL.createObjectURL(file);
    setUserVideoUrl(url);
    setCurrentTime(0);
    setHasCaptions(false);
    setActiveCaptions([]);
    setEditingCaptions(null);
    setJobId(null);
    setJobStatus(null);
    setEditToken(undefined);
    showToast(`Video "${file.name}" loaded for captioning`);
  }, [showToast]);

  // =====================================================================
  // Handle video metadata (duration) once the video element loads
  // =====================================================================
  const handleVideoLoaded = useCallback((duration: number) => {
    setVideoDuration(duration);
    setClips((prev) => {
      // If we already have a video clip, just update its duration or leave it
      if (prev.some((c) => c.trackId === 'video')) return prev;
      
      const videoClip: Clip = {
        id: `video-main`,
        trackId: 'video',
        title: 'Main Video',
        start: 0,
        duration: duration,
        color: 'from-surface-container-high to-surface-container-highest',
        type: 'video',
      };
      return [...prev, videoClip];
    });
  }, []);

  // =====================================================================
  // REAL BACKEND FLOW: Upload video → transcribe → get captions.
  const handleRunAICaptions = useCallback(async () => {
    if (isGeneratingCaptions) return;

    if (!userVideoFile && !jobId) {
      showToast('Import a video first in the Import tab, then generate captions');
      setActiveTab('import');
      return;
    }

    setIsGeneratingCaptions(true);
    showToast(jobId && hasCaptions ? 'Regenerating captions...' : 'Uploading video and starting transcription...');

    try {
      let currentJobId = jobId;

      if (jobId && hasCaptions) {
        // Regenerate existing job
        await regenerateJob(jobId, wordsPerLine, 'small', editToken);
      } else if (userVideoFile) {
        // Create new job
        setUploadProgress(0);
        const job = await createJob({
          videoFile: userVideoFile,
          wordsPerLine: wordsPerLine,
          captionPosition: 'bottom',
          whisperModelSize: 'small',
        }, (percent) => setUploadProgress(percent));
        
        setUploadProgress(null);
        currentJobId = job.id;
        setJobId(job.id);
        setJobStatus(job.status as JobStatus);
        setEditToken(job.edit_token);
      }

      if (!currentJobId) {
        throw new Error("No job ID available");
      }

      // Poll for transcription completion
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        try {
          const currentJob = await getJob(currentJobId as string);
          setJobStatus(currentJob.status as JobStatus);

          if (currentJob.status === 'ready_for_review') {
            clearInterval(pollTimerRef.current!);
            pollTimerRef.current = null;
            setIsGeneratingCaptions(false);

            const chunks: CaptionChunk[] = currentJob.caption_data || [];
            setEditingCaptions(chunks);

            setActiveCaptions(chunks);
            setHasCaptions(true);

            // Populate timeline clips for text track
            const textClips: Clip[] = chunks.map((c) => ({
              id: `text-${c.id}`,
              trackId: 'text',
              title: c.text,
              start: c.start,
              duration: c.end - c.start,
              color: 'from-pink-950/40 to-rose-950/40 border-pink-500/30',
              type: 'text',
              text: c.text,
              textColor: '#ffffff',
              textBgColor: 'rgba(0,0,0,0.7)',
              textFontSize: 20,
              textBold: true,
              textShowBg: true,
              isAICaption: true,
            }));
            
            setClips((prev) => {
              // Replace existing text clips
              const filtered = prev.filter(c => c.trackId !== 'text');
              return [...filtered, ...textClips];
            });

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
    } catch (e: any) {
      setUploadProgress(null);
      setIsGeneratingCaptions(false);
      showToast(e.message || 'Failed to generate captions');
    }
  }, [isGeneratingCaptions, userVideoFile, showToast, setActiveTab, wordsPerLine, jobId, hasCaptions, editToken, uploadProgress]);

  const handleCancelAICaptions = useCallback(async () => {
    if (!jobId || !editToken) return;
    try {
      await cancelJob(jobId, editToken);
      setIsGeneratingCaptions(false);
      setUploadProgress(null);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      setJobStatus('failed');
      showToast('Transcription cancelled.');
    } catch (err: any) {
      showToast('Failed to cancel transcription: ' + err.message);
    }
  }, [jobId, editToken, showToast]);

  // =====================================================================
  const handleCaptionTextEdit = useCallback((captionId: number, newText: string) => {
    setEditingCaptions((prev) =>
      prev
        ? prev.map((c) => (c.id === captionId ? { ...c, text: newText } : c))
        : null,
    );
    setActiveCaptions((prev) =>
      prev.map((c) => (c.id === captionId ? { ...c, text: newText } : c)),
    );
    setClips((prev) =>
      prev.map((c) => (c.id === `text-${captionId}` ? { ...c, text: newText, title: newText, isAICaption: true } : c))
    );
  }, []);

  const handleCaptionTimingEdit = useCallback((captionId: number, start: number, end: number) => {
    setEditingCaptions((prev) =>
      prev
        ? prev.map((c) => (c.id === captionId ? { ...c, start, end } : c))
        : null,
    );
    setActiveCaptions((prev) =>
      prev.map((c) => (c.id === captionId ? { ...c, start, end } : c)),
    );
    setClips((prev) =>
      prev.map((c) => (c.id === `text-${captionId}` ? { ...c, start, duration: end - start, isAICaption: true } : c))
    );
  }, []);

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
      await updateCaptions(jobId, editingCaptions, editToken);

      // Step 2: Trigger render
      await renderJob(jobId, previewDimensions, captionOffset, { resolution: exportResolution, quality: exportQuality }, captionStyle, editToken);
      setJobStatus('rendering');

      // Step 3: Poll for render completion
      if (exportPollTimerRef.current) clearInterval(exportPollTimerRef.current);
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
  }, [jobId, editingCaptions, showToast, captionOffset]);

  // =====================================================================
  // SHORTCUTS
  // =====================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setIsCommandPaletteOpen((prev) => !prev); }
      
      if (e.key === ' ') { e.preventDefault(); handleTogglePlay(); }
      if (e.key.toLowerCase() === 's') { e.preventDefault(); handleSplitClip(); }
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); handleAddMarker(); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); handleResetTransform(); }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); handleRunAICaptions(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleSplitClip, handleAddMarker, handleResetTransform, handleRunAICaptions, handleDeleteClip, selectedClipId, undo, redo]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  // =====================================================================
  // PROJECT NAVIGATION
  // =====================================================================
  const handleSelectProject = async (projectId: string) => {
    try {
      const job = await getJob(projectId);
      setJobId(job.id);
      setJobStatus(job.status as JobStatus);
      if (job.edit_token) {
        setEditToken(job.edit_token);
      }
      if (job.caption_data) {
        setEditingCaptions(job.caption_data);
        setActiveCaptions(job.caption_data);
        setHasCaptions(true);

        const textClips: Clip[] = job.caption_data.map((c) => ({
          id: `text-${c.id}`,
          trackId: 'text',
          title: c.text,
          start: c.start,
          duration: c.end - c.start,
          color: 'from-pink-950/40 to-rose-950/40 border-pink-500/30',
          type: 'text',
          text: c.text,
          textColor: '#ffffff',
          textBgColor: 'rgba(0,0,0,0.7)',
          textFontSize: 20,
          textBold: true,
          textShowBg: true,
          isAICaption: true,
        }));
        
        setClips((prev) => {
          const filtered = prev.filter(c => c.trackId !== 'text');
          return [...filtered, ...textClips];
        });
      } else {
        setEditingCaptions(null);
        setActiveCaptions([]);
        setHasCaptions(false);
        setClips(prev => prev.filter(c => c.trackId !== 'text'));
      }
      if (job.input_video) {
        setUserVideoUrl(mediaUrl(job.input_video));
      }
      setViewMode('editor');
    } catch (err: any) {
      showToast('Failed to load project: ' + err.message);
    }
  };

  const handleCreateProject = () => {
    setJobId(null);
    setJobStatus(null);
    setEditingCaptions(null);
    setActiveCaptions([]);
    setHasCaptions(false);
    setUserVideoFile(null);
    setUserVideoUrl(null);
    setClips([]);
    setActiveTab('import');
    setViewMode('editor');
  };

  const handleLeftResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(800, startWidth + (moveEvent.clientX - startX)));
      setLeftPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleRightResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(800, startWidth - (moveEvent.clientX - startX)));
      setRightPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTimelineResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = timelineHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Moving mouse up (negative delta) means larger timeline height
      const maxHeight = typeof window !== 'undefined' ? window.innerHeight - 350 : 800;
      const newHeight = Math.max(150, Math.min(maxHeight, startHeight - (moveEvent.clientY - startY)));
      setTimelineHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="h-screen w-screen flex flex-col p-2 gap-2 bg-background-dark text-on-surface antialiased overflow-hidden select-none font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(173,198,255,0.035)_0%,_transparent_65%)] pointer-events-none z-0"></div>

      {viewMode === 'dashboard' ? (
        <Dashboard
          onSelectProject={handleSelectProject}
          onCreateNewProject={handleCreateProject}
        />
      ) : (
        <>
          <Header onExport={() => setShowExportModal(true)} onBackToDashboard={() => setViewMode('dashboard')} />

      <main className="flex-1 flex gap-2 min-h-0 z-10 w-full max-w-[1920px] mx-auto">
        <Sidebar
          width={leftPanelWidth}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mediaList={mediaList}
          onAddMediaToTimeline={handleAddMediaToTimeline}
          onSelectMediaForPlayer={handleSelectMediaForPlayer}
          activeMediaId={activeMedia?.id ?? null}
          onAddTextClip={handleAddTextClip}
          onSelectLUT={handleSelectLUT}
          activeLUT={effects.lut}
          onRunAICaptions={handleRunAICaptions}
          onCancelAICaptions={handleCancelAICaptions}
          isGeneratingCaptions={isGeneratingCaptions}
          hasCaptions={hasCaptions}
          onImportFile={handleImportFile}
          onVideoFileSelected={handleVideoFileSelected}
          jobStatus={jobStatus}
          wordsPerLine={wordsPerLine}
          setWordsPerLine={setWordsPerLine}
        />

        <div 
          className="w-2 shrink-0 bg-transparent hover:bg-white/10 active:bg-primary/30 cursor-col-resize transition-colors rounded-full" 
          onMouseDown={handleLeftResize}
        />

        <div className="flex-1 flex flex-col min-w-[400px] min-h-0">
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
            onUpdateCaptionText={handleCaptionTextEdit}
            onUpdateCaptionTiming={handleCaptionTimingEdit}
            captionOffset={captionOffset}
            setCaptionOffset={setCaptionOffset}
            jobStatus={jobStatus}
            videoDuration={videoDuration}
            onVideoLoaded={handleVideoLoaded}
            clips={clips}
          />

          <div 
            className="h-2 shrink-0 bg-transparent hover:bg-white/10 active:bg-primary/30 cursor-row-resize transition-colors rounded-full my-1.5" 
            onMouseDown={handleTimelineResize}
          />

          <div 
            className="shrink-0 flex flex-col relative transition-none"
            style={{ 
              height: `${timelineHeight}px`, 
              maxHeight: '60%',
              minHeight: '150px'
            }}
          >
            <Timeline
              tracks={tracks}
              onToggleTrack={handleToggleTrack}
              clips={clips}
              selectedClipId={selectedClipId}
              onSelectClip={handleSelectClip}
              currentTime={currentTime}
              onSeek={handleSeek}
              onUpdateClip={handleUpdateClip}
              zoom={zoom}
              setZoom={setZoom}
              markers={markers}
              snapToGrid={snapToGrid}
              onToggleSnap={() => setSnapToGrid(!snapToGrid)}
              onDeleteClip={handleDeleteClip}
              totalDuration={videoDuration}
            />
          </div>
        </div>

        <div 
          className="w-2 shrink-0 bg-transparent hover:bg-white/10 active:bg-primary/30 cursor-col-resize transition-colors rounded-full" 
          onMouseDown={handleRightResize}
        />

        <Inspector
          width={rightPanelWidth}
          activeTab={inspectorTab}
          setActiveTab={setInspectorTab}
          selectedClip={selectedClip}
          transform={transform}
          onUpdateTransform={handleUpdateTransform}
          audioSettings={audioSettings}
          onUpdateAudioSettings={handleUpdateAudio}
          effects={effects}
          onUpdateEffects={handleUpdateEffects}
          isPlaying={isPlaying}
          onDeleteClip={handleDeleteClip}
          editingCaptions={editingCaptions}
          onCaptionTextEdit={handleCaptionTextEdit}
          currentTime={currentTime}
          onUpdateClip={handleUpdateClip}
        />
      </main>
      </>
      )}

      {/* Toasts */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-surface-container-high/90 backdrop-blur-xl border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-2 shadow-2xl">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10.5px] font-sans font-bold tracking-wide uppercase text-white">{toast.msg}</span>
            </div>
          </div>
        ))}
      </div>{/* Command palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onTogglePlay={handleTogglePlay}
        onSplitClip={handleSplitClip}
        onAddMarker={handleAddMarker}
        onRunAICaptions={handleRunAICaptions}
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
              <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3 flex justify-between text-[10px] font-sans mb-2">
                <span className="text-on-surface-variant/80">Captions ready</span>
                <span className="text-white font-mono font-bold">{editingCaptions.length} chunks</span>
              </div>
            )}

            {/* Export Settings */}
            {!isExporting && !isExported && (
              <div className="space-y-4 mb-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-on-surface-variant">Resolution</label>
                  <div className="relative">
                    <select
                      value={exportResolution}
                      onChange={(e) => setExportResolution(e.target.value)}
                      className="w-full bg-surface-container-low border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm font-sans text-white appearance-none cursor-pointer hover:border-white/[0.1] transition-all focus:outline-none focus:border-primary"
                    >
                      <option value="original">Original</option>
                      <option value="1080p">1080p (FHD)</option>
                      <option value="4K">4K (UHD)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 9-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-on-surface-variant">Quality</label>
                  <div className="relative">
                    <select
                      value={exportQuality}
                      onChange={(e) => setExportQuality(e.target.value)}
                      className="w-full bg-surface-container-low border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm font-sans text-white appearance-none cursor-pointer hover:border-white/[0.1] transition-all focus:outline-none focus:border-primary"
                    >
                      <option value="low">Low (Fast, smaller size)</option>
                      <option value="medium">Medium (Standard)</option>
                      <option value="high">High (Slower, larger size)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 9-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
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
                  Rendering captions server-side. The job processes asynchronously — you can close this and check back.
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
          <span className="ml-2">•</span>
          <span className="bg-white/10 px-1 py-0.5 rounded text-white font-bold">Ctrl K</span>
          <span>for Command Palette</span>
        </div>
        <div className="text-[9px] font-mono text-on-surface-variant tracking-widest uppercase">AutoCaption</div>
      </footer>
    </div>
  );
}
