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
  ChevronLeft,
  ChevronRight,
  Move,
  Type,
} from 'lucide-react';
import { VideoTransform, EffectSettings, Caption, CaptionChunk } from '../types';
import { MediaItem } from '../data';

interface PreviewCanvasProps {
  activeMedia: MediaItem;
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
  onCaptionTextEdit?: (captionId: number, newText: string) => void;
  jobStatus?: string | null;
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
  onCaptionTextEdit,
  jobStatus,
}: PreviewCanvasProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showCaptionEditor, setShowCaptionEditor] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync video element with playback state when using real video
  useEffect(() => {
    if (!videoRef.current || !userVideoUrl) return;
    const video = videoRef.current;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, userVideoUrl]);

  // Seek video when currentTime changes from external controls
  useEffect(() => {
    if (!videoRef.current || !userVideoUrl) return;
    const video = videoRef.current;
    if (Math.abs(video.currentTime - currentTime) > 1) {
      video.currentTime = currentTime;
    }
  }, [currentTime, userVideoUrl]);

  // Sync currentTime from video element back to state
  const handleVideoTimeUpdate = () => {
    if (videoRef.current && isPlaying) {
      onSeek(videoRef.current.currentTime);
    }
  };

  // Find if there is a caption active at the current playhead
  const activeCaption = activeCaptions.find(
    (cap) => currentTime >= cap.start && currentTime <= cap.end
  );

  // Map active LUT setting to CSS Filter strings for direct live visual grading
  const getFilterCSS = () => {
    let cssFilters = '';
    
    // Core parameters from Inspector sliders
    if (effects.blur > 0) cssFilters += `blur(${effects.blur}px) `;
    if (effects.contrast !== 100) cssFilters += `contrast(${effects.contrast}%) `;
    if (effects.brightness !== 100) cssFilters += `brightness(${effects.brightness}%) `;
    if (effects.saturation !== 100) cssFilters += `saturate(${effects.saturation}%) `;

    // Cinematic LUT Filters
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

  // Drag simulation for the transformation overlay box
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
      
      // Scale position offset according to client delta
      onUpdateTransform({
        x: dragStartRef.current.initialX + Math.round(deltaX),
        y: dragStartRef.current.initialY + Math.round(deltaY),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, transform, onUpdateTransform]);

  // Render video frame background or stylized placeholders
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
      {/* Header bar on Preview */}
      <div className="flex justify-between items-center mb-3.5 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
          <span className="text-[10px] font-sans font-bold text-on-surface-variant tracking-wider uppercase">
            Active Preview Canvas • {activeMedia.title}
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
        </div>
      </div>

      {/* Video Viewport Stage */}
      <div className="flex-1 bg-neutral-950 rounded-xl relative overflow-hidden flex items-center justify-center border border-white/[0.04]">
        {/* Real video element (when user uploaded a file) */}
        {userVideoUrl ? (
          <video
            ref={videoRef}
            src={userVideoUrl}
            className="absolute inset-0 w-full h-full object-contain"
            muted={isMuted}
            onTimeUpdate={handleVideoTimeUpdate}
            style={{
              filter: getFilterCSS(),
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale / 100}) rotate(${transform.rotation}deg)`,
              opacity: transform.opacity / 100,
            }}
          />
        ) : (
          /* Cinematic Backdrop Frame (mock/placeholder) */
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-300"
            style={{
              backgroundImage: `url(${activeMedia.thumbnailUrl})`,
              filter: getFilterCSS(),
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale / 100}) rotate(${transform.rotation}deg)`,
              opacity: transform.opacity / 100,
            }}
          />
        )}

        {/* Scanlines / Noise FX overlay if VHS LUT is on */}
        {effects.lut === 'vhs' && (
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] pointer-events-none opacity-40"></div>
        )}

        {/* Vignette Overlay if active */}
        {effects.vignette && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.85)_100%)] pointer-events-none mix-blend-multiply"></div>
        )}

        {/* Cinematic Crop Bars 2.39:1 Overlay if configured */}
        <div className="absolute top-0 inset-x-0 h-[8%] bg-black/90 pointer-events-none border-b border-white/[0.02] z-10 opacity-80"></div>
        <div className="absolute bottom-0 inset-x-0 h-[8%] bg-black/90 pointer-events-none border-t border-white/[0.02] z-10 opacity-80"></div>

        {/* Interactive Transform Bounds Controls Overlay */}
        {showBoundingBox && (
          <div 
            className="absolute z-20 pointer-events-auto"
            style={{
              width: '280px',
              height: '140px',
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale / 100}) rotate(${transform.rotation}deg)`,
            }}
          >
            {/* Outline box */}
            <div 
              onMouseDown={handleMouseDown}
              className={`w-full h-full border border-dashed border-white/60 relative cursor-grab active:cursor-grabbing group/box flex items-center justify-center transition-colors ${
                isDragging ? 'border-primary' : 'hover:border-primary/80'
              }`}
            >
              {/* Central crosshair */}
              <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
              <div className="absolute left-1/2 -translate-x-1/2 w-px h-3 bg-white/40"></div>
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-px bg-white/40"></div>

              {/* Transform Label */}
              <div className="absolute -top-6 bg-black/85 text-[8px] font-mono border border-white/[0.08] text-white/90 px-1.5 py-0.5 rounded flex items-center gap-1 opacity-0 group-hover/box:opacity-100 transition-opacity">
                <Move className="w-2.5 h-2.5 text-primary" />
                <span>X: {transform.x}px Y: {transform.y}px</span>
              </div>

              {/* Corner Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-black/80 rounded-sm hover:scale-125 transition-transform cursor-nwse-resize"></div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-black/80 rounded-sm hover:scale-125 transition-transform cursor-nesw-resize"></div>
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-black/80 rounded-sm hover:scale-125 transition-transform cursor-nesw-resize"></div>
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-black/80 rounded-sm hover:scale-125 transition-transform cursor-nwse-resize"></div>

              {/* Anchor rotation stem & handle */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-6 bg-white/60"></div>
              <div className="absolute -top-7.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 border-2 border-white rounded-full bg-background-dark hover:scale-125 hover:bg-primary transition-all cursor-crosshair"></div>
            </div>
          </div>
        )}

        {/* Live Automatic Closed Captions Overlays */}
        {showCaptions && activeCaption && (
          <div className="absolute bottom-16 inset-x-8 text-center pointer-events-none z-30 transition-all duration-150">
            <span className="bg-black/90 text-primary border border-primary/25 text-xs font-sans font-semibold tracking-wider py-1.5 px-3.5 rounded-lg inline-block shadow-lg">
              {activeCaption.text}
            </span>
          </div>
        )}

        {/* Dynamic Watermark Indicator */}
        <div className="absolute top-12 left-6 text-white/20 text-[9px] font-mono tracking-[0.2em] pointer-events-none uppercase">
          ONIEX STUDIOS • 4K RENDER STREAM
        </div>
      </div>

      {/* Caption Editor (collapsible, shown when captions exist) */}
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
                  <span className="text-[9px] font-mono text-on-surface-variant/60 shrink-0 w-16">
                    {formatTime(chunk.start)}
                  </span>
                  <input
                    type="text"
                    value={chunk.text}
                    onChange={(e) => onCaptionTextEdit?.(chunk.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent border-b border-white/[0.06] text-[10px] font-sans text-on-surface py-0.5 outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Playback Controls */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 glass-float rounded-full px-7 py-2.5 flex items-center gap-6.5 z-30 transition-all duration-300 shadow-[0_15px_35px_rgba(0,0,0,0.8)] border border-white/[0.08] hover:scale-[1.02]">
        <div className="text-[10px] font-mono text-on-surface-variant/80 tracking-widest bg-black/30 py-1 px-2.5 rounded-lg">
          {formatTime(currentTime)} / 05:00
        </div>

        <div className="flex items-center gap-4.5">
          <button 
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
            className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="-10 Seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-11 h-11 rounded-full bg-primary text-background-dark flex items-center justify-center hover:bg-white transition-all shadow-[0_0_10px_rgba(173,198,255,0.2)] hover:scale-105 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
          <button 
            onClick={() => onSeek(Math.min(300, currentTime + 10))}
            className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="+10 Seconds"
          >
            <div className="transform scale-x-[-1]">
              <RotateCcw className="w-4 h-4" />
            </div>
          </button>
        </div>

        <div className="w-px h-4.5 bg-white/10"></div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
          </button>
          <button
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="Toggle Cinematic View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Side tools panel inside canvas block */}
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
