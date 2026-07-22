/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Volume2,
  VolumeX,
  Scissors,
  Bookmark,
  Move,
  Type,
} from 'lucide-react';
import { VideoTransform, EffectSettings, Caption, CaptionChunk, Clip } from '../types';
import { MediaItem } from '../data';
import { useEditorStore } from '../store/useEditorStore';

interface PreviewCanvasProps {
  activeMedia: MediaItem | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  transform: VideoTransform;
  onUpdateTransform: (t: Partial<VideoTransform>) => void;
  effects: EffectSettings;
  currentTime: number;
  onSeek: (time: number) => void;
  activeCaptions: Caption[];
  showCaptions: boolean;
  onSplitClip: () => void;
  onAddMarker: () => void;
  userVideoUrl?: string | null;
  editingCaptions?: CaptionChunk[] | null;
  onUpdateCaptionText?: (captionId: number, newText: string) => void;
  onUpdateCaptionTiming?: (captionId: number, start: number, end: number) => void;
  jobStatus?: string | null;
  videoDuration?: number;
  onVideoLoaded?: (duration: number) => void;
  clips?: Clip[];
  captionOffset?: { x: number, y: number };
  setCaptionOffset?: React.Dispatch<React.SetStateAction<{ x: number, y: number }>>;
}

export default function PreviewCanvas({
  activeMedia,
  isPlaying,
  onTogglePlay,
  transform,
  onUpdateTransform,
  effects,
  currentTime,
  onSeek,
  activeCaptions,
  showCaptions,
  onSplitClip,
  onAddMarker,
  userVideoUrl,
  editingCaptions,
  onUpdateCaptionText,
  onUpdateCaptionTiming,
  jobStatus,
  videoDuration = 60,
  onVideoLoaded,
  clips = [],
  captionOffset = { x: 0, y: 0 },
  setCaptionOffset,
}: PreviewCanvasProps) {
  const { hasCaptions, activeTab, setActiveTab } = useEditorStore();
  const [isMuted, setIsMuted] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCaptionEditor, setShowCaptionEditor] = useState(false);
  const [isDraggingCaption, setIsDraggingCaption] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const dragCaptionStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const maxTime = videoDuration > 0 ? videoDuration : 60;

  useEffect(() => {
    if (!videoRef.current || !userVideoUrl) return;
    const video = videoRef.current;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, userVideoUrl]);

  useEffect(() => {
    if (!videoRef.current || !userVideoUrl) return;
    const video = videoRef.current;
    if (Math.abs(video.currentTime - currentTime) > 1) {
      video.currentTime = currentTime;
    }
  }, [currentTime, userVideoUrl]);

  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      if (isPlaying && videoRef.current) {
        onSeek(videoRef.current.currentTime);
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, onSeek]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      if (!isPlaying) {
        // Just keeping it synced during manual seeks
        if (Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
          // If we want to strictly sync, we could do it here
        }
      }
    }
  };

  const handleVideoMetadata = () => {
    if (videoRef.current && onVideoLoaded) {
      onVideoLoaded(videoRef.current.duration);
    }
  };

  const activeCaption = activeCaptions.find(
    (cap) => currentTime >= cap.start && currentTime <= cap.end
  );

  const getFilterCSS = () => {
    let cssFilters = '';
    if (effects.blur > 0) cssFilters += `blur(${effects.blur}px) `;
    if (effects.contrast !== 100) cssFilters += `contrast(${effects.contrast}%) `;
    if (effects.brightness !== 100) cssFilters += `brightness(${effects.brightness}%) `;
    if (effects.saturation !== 100) cssFilters += `saturate(${effects.saturation}%) `;
    switch (effects.lut) {
      case 'cyberpunk':
        cssFilters += 'hue-rotate(30deg) saturate(160%) contrast(115%) sepia(10%) ';
        break;
      case 'vhs':
        cssFilters += 'contrast(85%) saturate(110%) brightness(105%) sepia(12%) ';
        break;
      case 'noir':
        cssFilters += 'grayscale(100%) contrast(140%) brightness(95%) ';
        break;
      case 'teal-orange':
        cssFilters += 'contrast(115%) saturate(135%) hue-rotate(185deg) ';
        break;
      case 'cinematic':
        cssFilters += 'saturate(85%) contrast(120%) brightness(95%) sepia(5%) ';
        break;
      default:
        break;
    }
    return cssFilters.trim() || 'none';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: transform.x,
      initialY: transform.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      onUpdateTransform({
        x: dragStartRef.current.initialX + Math.round(deltaX),
        y: dragStartRef.current.initialY + Math.round(deltaY),
      });
    };
    const handleMouseUp = () => { setIsDragging(false); };
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, transform, onUpdateTransform]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingCaption || !setCaptionOffset) return;
      const deltaX = e.clientX - dragCaptionStartRef.current.x;
      const deltaY = e.clientY - dragCaptionStartRef.current.y;
      setCaptionOffset({
        x: dragCaptionStartRef.current.initialX + Math.round(deltaX),
        y: dragCaptionStartRef.current.initialY + Math.round(deltaY),
      });
    };
    const handleMouseUp = () => { setIsDraggingCaption(false); };
    if (isDraggingCaption) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingCaption, setCaptionOffset]);

  const handleCaptionMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCaption(true);
    dragCaptionStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: captionOffset.x,
      initialY: captionOffset.y,
    };
  };

  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;
    const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;
    return `${formattedMins}:${formattedSecs}`;
  };

  return (
    <div
      className="flex-1 bg-surface-container-lowest border border-white/[0.06] rounded-2xl p-4 flex flex-col relative group overflow-hidden select-none shadow-[inset_0_1px_4px_rgba(255,255,255,0.05)]"
      ref={containerRef}
    >
      {/* Header bar */}
      <div className="flex justify-between items-center mb-3.5 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
          <span className="text-[10px] font-sans font-bold text-on-surface-variant tracking-wider uppercase">
            Preview{activeMedia ? ` • ${activeMedia.title}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {editingCaptions && editingCaptions.length > 0 && (
            <button
              onClick={() => setShowCaptionEditor(!showCaptionEditor)}
              className={`px-2 py-1 rounded text-[9px] font-sans font-semibold tracking-wider uppercase border transition-all cursor-pointer ${
                showCaptionEditor
                  ? 'bg-secondary/10 border-secondary/20 text-secondary'
                  : 'bg-white/[0.02] border-white/[0.05] text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Type className="w-3 h-3 inline mr-1" />
              Edit Captions
            </button>
          )}
          <button
            onClick={() => setShowBoundingBox(!showBoundingBox)}
            className={`px-2 py-1 rounded text-[9px] font-sans font-semibold tracking-wider uppercase border transition-all cursor-pointer ${
              showBoundingBox
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-white/[0.02] border-white/[0.05] text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Transform Box
          </button>
          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            className={`px-2 py-1 rounded text-[9px] font-sans font-semibold tracking-wider uppercase border transition-all cursor-pointer ${
              showSafeZones
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-white/[0.02] border-white/[0.05] text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Safe Zones
          </button>
        </div>
      </div>

      {/* Video Viewport Stage */}
      <div className="flex-1 bg-neutral-950 rounded-xl relative overflow-hidden flex items-center justify-center border border-white/[0.04]">
        {userVideoUrl ? (
          <video
            ref={videoRef}
            src={userVideoUrl}
            className="absolute inset-0 w-full h-full object-contain"
            muted={isMuted}
            onTimeUpdate={handleVideoTimeUpdate}
            onLoadedMetadata={handleVideoMetadata}
            style={{
              filter: getFilterCSS(),
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale / 100}) rotate(${transform.rotation}deg)`,
              opacity: transform.opacity / 100,
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-on-surface-variant/40">
            <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <span className="text-lg font-sans font-bold tracking-wider text-on-surface">Step 1: Import Video</span>
            <span className="text-xs font-sans tracking-wider text-on-surface-variant text-center max-w-xs">
              Go to the <button onClick={() => setActiveTab('import')} className="text-primary hover:underline">Import Tab</button> to upload a video or audio file and begin your project.
            </span>
          </div>
        )}

        {/* Step 2 Overlay if video exists but no captions */}
        {userVideoUrl && !hasCaptions && activeTab !== 'ai-tools' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3 text-on-surface">
            <Type className="w-16 h-16 mb-2 text-primary opacity-80" />
            <span className="text-lg font-sans font-bold tracking-wider">Step 2: Generate Captions</span>
            <span className="text-xs font-sans tracking-wider text-on-surface-variant text-center max-w-xs">
              Click on the <button onClick={() => setActiveTab('ai-tools')} className="text-primary hover:underline">AI Tools Tab</button> to automatically generate and style captions for your video.
            </span>
          </div>
        )}

        {effects.lut === 'vhs' && (
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] pointer-events-none opacity-40"></div>
        )}

        {effects.vignette && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.85)_100%)] pointer-events-none mix-blend-multiply"></div>
        )}

        {/* TikTok/Reels Safe Zones Overlay */}
        {showSafeZones && (
          <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
            <div className="relative w-full h-full border border-dashed border-white/20">
              {/* Top UI Area */}
              <div className="absolute top-0 left-0 right-0 h-[10%] bg-red-500/20 border-b border-dashed border-red-500/50 flex items-center justify-center">
                <span className="text-[10px] text-red-200/80 font-bold uppercase tracking-widest">Top UI</span>
              </div>
              {/* Right Side Action Buttons */}
              <div className="absolute bottom-[20%] right-0 w-[20%] h-[40%] bg-red-500/20 border-l border-t border-b border-dashed border-red-500/50 flex items-center justify-center">
                <span className="text-[10px] text-red-200/80 font-bold uppercase tracking-widest rotate-90 whitespace-nowrap">Interactions</span>
              </div>
              {/* Bottom Description / Audio */}
              <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-red-500/20 border-t border-dashed border-red-500/50 flex items-center justify-center">
                <span className="text-[10px] text-red-200/80 font-bold uppercase tracking-widest">Description & Audio</span>
              </div>
            </div>
          </div>
        )}

        {/* Transform Bounds Controls */}
        {userVideoUrl && showBoundingBox && (
          <div
            className="absolute z-20 pointer-events-auto"
            style={{
              width: '280px',
              height: '140px',
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale / 100}) rotate(${transform.rotation}deg)`,
            }}
          >
            <div
              onMouseDown={handleMouseDown}
              className={`w-full h-full border border-dashed border-white/60 relative cursor-grab active:cursor-grabbing group/box flex items-center justify-center transition-colors ${
                isDragging ? 'border-primary' : 'hover:border-primary/80'
              }`}
            >
              <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
              <div className="absolute left-1/2 -translate-x-1/2 w-px h-3 bg-white/40"></div>
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-px bg-white/40"></div>
              <div className="absolute -top-6 bg-black/85 text-[8px] font-mono border border-white/[0.08] text-white/90 px-1.5 py-0.5 rounded flex items-center gap-1 opacity-0 group-hover/box:opacity-100 transition-opacity">
                <Move className="w-2.5 h-2.5 text-primary" />
                <span>X: {transform.x}px Y: {transform.y}px</span>
              </div>
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-black/80 rounded-sm hover:scale-125 transition-transform cursor-nwse-resize"></div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-black/80 rounded-sm hover:scale-125 transition-transform cursor-nesw-resize"></div>
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-black/80 rounded-sm hover:scale-125 transition-transform cursor-nesw-resize"></div>
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-black/80 rounded-sm hover:scale-125 transition-transform cursor-nwse-resize"></div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-6 bg-white/60"></div>
              <div className="absolute -top-7.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 border-2 border-white rounded-full bg-background-dark hover:scale-125 hover:bg-primary transition-all cursor-crosshair"></div>
            </div>
          </div>
        )}

        {clips.filter((c) => {
          const clipEnd = c.start + c.duration;
          return c.type === 'text' && Boolean(c.isCustomText) && c.text && currentTime >= c.start && currentTime <= clipEnd;
        }).map((clip) => (
          <div
            key={clip.id}
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none z-30 transition-all duration-150"
          >
            <span className="inline-block tracking-wide"
              style={{
                backgroundColor: clip.textShowBg !== false ? (clip.textBgColor || 'rgba(0,0,0,0.7)') : 'transparent',
                color: clip.textColor || '#ffffff',
                fontSize: (clip.textFontSize || 20) + 'px',
                fontWeight: clip.textBold !== false ? 'bold' : 'normal',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                padding: clip.textShowBg !== false ? '0.5rem 1.25rem' : '0',
                borderRadius: clip.textShowBg !== false ? '0.5rem' : '0',
                boxShadow: clip.textShowBg !== false ? '0 4px 12px rgba(0,0,0,0.5)' : 'none',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
              }}>
              {clip.text}
            </span>
          </div>
        ))}

        {showCaptions && activeCaption && (
          <div 
            className="absolute bottom-6 inset-x-8 text-center z-30 transition-none"
            style={{ transform: `translate(${captionOffset.x}px, ${captionOffset.y}px)` }}
          >
            <span 
              onMouseDown={handleCaptionMouseDown}
              className="bg-black/90 text-primary border border-primary/25 text-xs font-sans font-semibold tracking-wider py-1.5 px-3.5 rounded-lg inline-block shadow-lg cursor-move hover:scale-105 hover:border-primary/60 transition-all select-none"
            >
              {activeCaption.text}
            </span>
          </div>
        )}
      </div>

      {/* Playback Controls Bar */}
      <div className="shrink-0 mt-3 bg-surface-container-low border border-white/[0.06] rounded-xl px-5 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
            className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="-10 Seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-primary text-background-dark flex items-center justify-center hover:bg-white transition-all shadow-[0_0_10px_rgba(173,198,255,0.2)] hover:scale-105 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={() => onSeek(Math.min(maxTime, currentTime + 10))}
            className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="+10 Seconds"
          >
            <div className="transform scale-x-[-1]">
              <RotateCcw className="w-4 h-4" />
            </div>
          </button>
        </div>

        <div className="text-[11px] font-mono text-on-surface-variant/90 tracking-widest bg-black/30 py-1 px-3 rounded-lg">
          {formatTime(currentTime)} / {formatTime(maxTime)}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="Toggle Cinematic View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Caption Editor */}
      {showCaptionEditor && editingCaptions && editingCaptions.length > 0 && (
        <div className="bg-surface-container-lowest border border-white/[0.06] rounded-xl p-3 mt-3 max-h-48 overflow-y-auto">
          <h4 className="text-[10px] font-sans font-bold uppercase tracking-wider text-on-surface/70 mb-2">
            Caption Editor ({editingCaptions.length} lines)
          </h4>
          <div className="space-y-1.5">
            {editingCaptions.map((chunk) => {
              const isActive = currentTime >= chunk.start && currentTime <= chunk.end;
              return (
                <div
                  key={chunk.id}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 border-primary/25'
                      : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                  }`}
                  onClick={() => onSeek(chunk.start)}
                >
                  <div className="flex flex-col gap-1 w-16 shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      value={chunk.start.toFixed(2)}
                      onChange={(e) => onUpdateCaptionTiming?.(chunk.id, parseFloat(e.target.value) || 0, chunk.end)}
                      onClick={(e) => e.stopPropagation()}
                      title="Start Time (s)"
                      className="bg-transparent border-b border-white/[0.06] text-[9px] font-mono text-on-surface-variant py-0.5 outline-none focus:border-primary/50 transition-colors w-full"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={chunk.end.toFixed(2)}
                      onChange={(e) => onUpdateCaptionTiming?.(chunk.id, chunk.start, parseFloat(e.target.value) || 0)}
                      onClick={(e) => e.stopPropagation()}
                      title="End Time (s)"
                      className="bg-transparent border-b border-white/[0.06] text-[9px] font-mono text-on-surface-variant py-0.5 outline-none focus:border-primary/50 transition-colors w-full"
                    />
                  </div>
                  <input
                    type="text"
                    value={chunk.text}
                    onChange={(e) => onUpdateCaptionText?.(chunk.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent border-b border-white/[0.06] text-[10px] font-sans text-on-surface py-0.5 outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Side tools panel */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={onSplitClip}
          className="w-9 h-9 rounded-xl bg-surface-container/90 backdrop-blur-md border border-white/[0.08] flex items-center justify-center text-on-surface-variant hover:text-primary transition-all hover:-translate-x-0.5 shadow-lg cursor-pointer"
          title="Split Selected Clip at Playhead"
        >
          <Scissors className="w-4 h-4" />
        </button>
        <button
          onClick={onAddMarker}
          className="w-9 h-9 rounded-xl bg-surface-container/90 backdrop-blur-md border border-white/[0.08] flex items-center justify-center text-on-surface-variant hover:text-primary transition-all hover:-translate-x-0.5 shadow-lg cursor-pointer"
          title="Place Timeline Marker"
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
