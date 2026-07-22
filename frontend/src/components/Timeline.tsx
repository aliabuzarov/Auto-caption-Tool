/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Music,
  Film,
  Type,
  Sparkles,
  Grid,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Track, Clip } from '../types';

interface TimelineProps {
  tracks: Track[];
  onToggleTrack: (trackId: string, field: 'muted' | 'locked' | 'solo') => void;
  clips: Clip[];
  selectedClipId: string | null;
  onSelectClip: (clipId: string) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateClip: (clipId: string, updatedFields: Partial<Clip>) => void;
  zoom: number;
  setZoom: (updater: number | ((prev: number) => number)) => void;
  markers: number[];
  snapToGrid: boolean;
  onToggleSnap: () => void;
  onDeleteClip: (clipId: string) => void;
  totalDuration: number;
}

export default function Timeline({
  tracks,
  onToggleTrack,
  clips,
  selectedClipId,
  onSelectClip,
  currentTime,
  onSeek,
  onUpdateClip,
  zoom,
  setZoom,
  markers,
  snapToGrid,
  onToggleSnap,
  onDeleteClip,
  totalDuration,
}: TimelineProps) {
  const rulerRef = useRef<HTMLDivElement>(null);

  const timeToPercent = (time: number) => {
    if (totalDuration <= 0) return 0;
    return (time / totalDuration) * 100;
  };

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    let time = (percent / 100) * totalDuration;

    if (snapToGrid) {
      time = Math.round(time / 5) * 5;
    }

    onSeek(Math.max(0, Math.min(totalDuration, time)));
  };

  const formatMarkerTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const shiftClip = (clip: Clip, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStart = Math.max(0, Math.min(totalDuration - clip.duration, clip.start + delta));
    onUpdateClip(clip.id, { start: newStart });
  };

  const trimClip = (clip: Clip, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDuration = Math.max(0.1, clip.duration + delta);
    if (clip.start + newDuration <= totalDuration) {
      onUpdateClip(clip.id, { duration: newDuration });
    }
  };

  // --- Mouse drag-to-resize and move on clips ---
  const [dragEdge, setDragEdge] = useState<{ clipId: string; edge: 'left' | 'right' | 'move'; initialMouseX: number; initialValue: number; clipStart: number; clipDuration: number } | null>(null);

  const handleEdgeMouseDown = useCallback((clip: Clip, edge: 'left' | 'right' | 'move', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const initialValue = edge === 'left' ? clip.start : clip.duration;
    setDragEdge({ clipId: clip.id, edge, initialMouseX: e.clientX, initialValue, clipStart: clip.start, clipDuration: clip.duration });
    onSelectClip(clip.id);
  }, [onSelectClip]);

  useEffect(() => {
    if (!dragEdge || !rulerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = rulerRef.current!.getBoundingClientRect();
      const dx = e.clientX - dragEdge.initialMouseX;
      const timeDelta = (dx / rect.width) * totalDuration;
      // Snap to grid is still 5s or whatever they set, but for small clips this can be annoying.
      const snapped = snapToGrid ? Math.round(timeDelta / 5) * 5 : Math.round(timeDelta * 10) / 10;

      if (dragEdge.edge === 'left') {
        const newStart = Math.max(0, Math.min(dragEdge.clipStart + dragEdge.clipDuration - 0.1, dragEdge.initialValue + snapped));
        onUpdateClip(dragEdge.clipId, { start: newStart, duration: dragEdge.clipStart + dragEdge.clipDuration - newStart });
      } else if (dragEdge.edge === 'right') {
        const newDuration = Math.max(0.1, Math.min(totalDuration - dragEdge.clipStart, dragEdge.initialValue + snapped));
        onUpdateClip(dragEdge.clipId, { duration: newDuration });
      } else if (dragEdge.edge === 'move') {
        const newStart = Math.max(0, Math.min(totalDuration - dragEdge.clipDuration, dragEdge.initialValue + snapped));
        onUpdateClip(dragEdge.clipId, { start: newStart });
      }
    };

    const handleMouseUp = () => setDragEdge(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragEdge, totalDuration, snapToGrid, onUpdateClip]);

  // Generate tick marks dynamically based on totalDuration
  const tickInterval = totalDuration <= 120 ? 10 : totalDuration <= 600 ? 30 : 60;
  const tickMarks: number[] = [];
  for (let t = 0; t <= totalDuration; t += tickInterval) {
    tickMarks.push(t);
  }
  // Ensure the last mark is always included
  if (tickMarks[tickMarks.length - 1] < totalDuration) {
    tickMarks.push(Math.ceil(totalDuration / tickInterval) * tickInterval);
  }

  return (
    <div className="bg-surface border border-white/[0.06] rounded-2xl flex flex-col h-64 overflow-hidden select-none shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Timeline Controls / Toolbar */}
      <div className="h-10 bg-surface-container-lowest border-b border-white/[0.04] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSnap}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-sans font-bold uppercase tracking-wider border transition-all cursor-pointer ${
              snapToGrid
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-white/[0.02] border-white/[0.05] text-on-surface-variant/80 hover:text-on-surface'
            }`}
            title="Snap to Grid (5 Seconds Interval)"
          >
            <Grid className="w-3 h-3" />
            <span>Snap Grid</span>
          </button>

          {markers.length > 0 && (
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span className="text-[9px] font-sans text-on-surface-variant uppercase tracking-wider">
                {markers.length} {markers.length === 1 ? 'marker' : 'markers'} active
              </span>
            </div>
          )}
        </div>

        {/* Zoom controls & Touchpad Slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(50, zoom > 200 ? zoom - 100 : zoom - 25))}
            className="w-6 h-6 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="50"
            max="1000"
            step="25"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-24 h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
            title="Drag slider to zoom timeline interval"
          />

          <span className="text-[9px] font-mono text-on-surface-variant w-10 text-center tracking-wide uppercase">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom(Math.min(2000, zoom >= 200 ? zoom + 100 : zoom + 25))}
            className="w-6 h-6 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main timeline core view container (Ruler + Lanes) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track controls headers column */}
        <div className="w-[140px] shrink-0 bg-surface-container-lowest border-r border-white/[0.04] flex flex-col pt-8">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="h-12 border-b border-white/[0.03] px-3 flex flex-col justify-center"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-sans font-bold text-on-surface uppercase tracking-wide truncate max-w-[70px]">
                  {track.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onToggleTrack(track.id, 'muted')}
                    className={`p-1 rounded hover:bg-white/[0.04] transition-colors cursor-pointer ${
                      track.muted ? 'text-tertiary' : 'text-on-surface-variant/40 hover:text-on-surface-variant'
                    }`}
                    title={track.muted ? 'Unmute track' : 'Mute track'}
                  >
                    {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onToggleTrack(track.id, 'locked')}
                    className={`p-1 rounded hover:bg-white/[0.04] transition-colors cursor-pointer ${
                      track.locked ? 'text-primary' : 'text-on-surface-variant/40 hover:text-on-surface-variant'
                    }`}
                    title={track.locked ? 'Unlock track' : 'Lock track'}
                  >
                    {track.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Scrollable timeline area */}
        <div 
          className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden relative group/scroller"
          onWheel={(e) => {
            // Support both vertical two-finger swipe and pinch-to-zoom (ctrlKey)
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX) || e.ctrlKey) {
              // Differentiate between tick-based mouse wheel and smooth trackpad
              const isMouseWheel = Math.abs(e.deltaY) >= 50 && !e.ctrlKey;
              const step = isMouseWheel ? (e.deltaY > 0 ? -25 : 25) : (e.deltaY * -0.5);

              // Use functional state update so rapid trackpad events accumulate correctly
              setZoom((prevZoom) => {
                const multiplier = prevZoom >= 200 ? (isMouseWheel ? 4 : 2) : 1;
                return Math.max(50, Math.min(2000, prevZoom + (step * multiplier)));
              });
            }
          }}
        >
          {/* Timeline time ticks ruler */}
          <div
            ref={rulerRef}
            onClick={handleRulerClick}
            className="h-8 border-b border-white/[0.05] relative bg-surface-container/20 cursor-ew-resize select-none shrink-0"
            style={{ width: `${zoom}%`, minWidth: '100%' }}
          >
            <div className="absolute inset-0 flex justify-between px-4 items-end pb-1.5 pointer-events-none">
              {tickMarks.map((sec) => (
                <div key={sec} className="flex flex-col items-center">
                  <div className="w-px h-1.5 bg-white/20"></div>
                  <span className="text-[8px] font-mono text-on-surface-variant/60 tracking-wider mt-1">
                    {formatMarkerTime(sec)}
                  </span>
                </div>
              ))}
            </div>

            {markers.map((sec, idx) => (
              <div
                key={idx}
                className="absolute top-0 w-3 h-3 bg-secondary rounded-b-md shadow-md flex items-center justify-center transform -translate-x-1/2 cursor-pointer z-10"
                style={{ left: `${timeToPercent(sec)}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(sec);
                }}
                title={`Marker at ${formatMarkerTime(sec)}`}
              />
            ))}

            <div
              className="absolute top-0 bottom-0 w-px bg-primary z-30 pointer-events-none"
              style={{ left: `${timeToPercent(currentTime)}%` }}
            >
              <div className="absolute -top-0.5 -left-1.5 border-[6px] border-transparent border-t-primary rounded"></div>
              <div className="absolute top-0 w-px h-96 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent"></div>
            </div>
          </div>

          {/* Timeline Tracks Clips Lanes container */}
          <div
            className="flex-1 relative flex flex-col"
            style={{ width: `${zoom}%`, minWidth: '100%' }}
          >
            {/* Grid ticks vertical background */}
            <div className="absolute inset-0 flex justify-between px-4 pointer-events-none opacity-10">
              {tickMarks.map((sec) => (
                <div key={sec} className="w-px h-full bg-white"></div>
              ))}
            </div>

            {tracks.map((track) => {
              const laneClips = clips.filter((c) => c.trackId === track.id);
              const isLocked = track.locked;

              return (
                <div
                  key={track.id}
                  className={`h-12 border-b border-white/[0.03] relative flex items-center transition-colors ${
                    isLocked ? 'bg-black/10' : 'bg-surface/10 hover:bg-white/[0.01]'
                  }`}
                >
                  {laneClips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    const clipLeft = timeToPercent(clip.start);
                    const clipWidth = timeToPercent(clip.duration);

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                        onContextMenu={(e) => { e.preventDefault(); onSelectClip(clip.id); }}
                        onMouseDown={(e) => {
                          if (isSelected && !isLocked) {
                            handleEdgeMouseDown(clip, 'move', e);
                          } else {
                            onSelectClip(clip.id);
                          }
                        }}
                        className={`absolute h-9.5 rounded-lg border flex flex-col justify-between p-1.5 overflow-hidden transition-all select-none cursor-pointer group ${
                          isSelected
                            ? 'border-primary ring-1 ring-primary/20 shadow-lg shadow-primary/5 bg-gradient-to-r from-surface-container-high to-surface-container-highest'
                            : 'border-white/10 hover:border-white/25 bg-gradient-to-r from-surface-container-low to-surface-container'
                        }`}
                        style={{
                          left: `${clipLeft}%`,
                          width: `${clipWidth}%`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 w-full truncate pointer-events-none">
                          <div className="flex items-center gap-1.5 truncate">
                            {clip.type === 'video' && <Film className="w-3 h-3 text-secondary shrink-0" />}
                            {clip.type === 'audio' && <Music className="w-3 h-3 text-primary shrink-0" />}
                            {clip.type === 'text' && <Type className="w-3 h-3 text-tertiary shrink-0" />}
                            {clip.type === 'effect' && <Sparkles className="w-3 h-3 text-accent shrink-0" />}
                            <span className="text-[9.5px] font-sans font-bold text-white/95 uppercase truncate">
                              {clip.title}
                            </span>
                          </div>
                          <span className="text-[7.5px] font-mono text-on-surface-variant/70 bg-black/45 px-1 py-0.5 rounded tracking-wide uppercase scale-90">
                            {clip.type === 'video' ? 'V1' : clip.type === 'audio' ? 'A1' : clip.type === 'text' ? 'T1' : 'FX'}
                          </span>
                        </div>

                        {isSelected && !isLocked && (
                          <div className="absolute inset-0 flex justify-between pointer-events-none z-10">
                            <div
                              onMouseDown={(e) => handleEdgeMouseDown(clip, 'left', e)}
                              className="pointer-events-auto w-4.5 h-full bg-black/60 border-r border-white/10 flex items-center justify-center hover:bg-primary hover:text-background-dark transition-all text-white cursor-ew-resize group/trim"
                              title="Drag to resize start"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </div>
                            <div className="flex-1 flex justify-center gap-1 items-center pointer-events-auto">
                              <button
                                onClick={(e) => { e.stopPropagation(); onUpdateClip(clip.id, { duration: Math.max(0.5, clip.duration - 1) }); }}
                                className="px-1 py-0.5 rounded bg-black/85 hover:bg-white/10 text-[7px] font-mono text-tertiary hover:text-white transition-colors"
                                title="Shorten duration (-1s)"
                              >
                                -1s
                              </button>
                              <button
                                onClick={(e) => shiftClip(clip, -5, e)}
                                className="w-4 h-4 rounded bg-black/75 hover:bg-white/[0.08] flex items-center justify-center text-on-surface-variant hover:text-white"
                                title="Shift left -5s"
                              >
                                <ChevronLeft className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-[7px] font-mono font-bold text-primary bg-black/85 px-1 rounded">
                                {formatMarkerTime(clip.start)}
                              </span>
                              <button
                                onClick={(e) => shiftClip(clip, 5, e)}
                                className="w-4 h-4 rounded bg-black/75 hover:bg-white/[0.08] flex items-center justify-center text-on-surface-variant hover:text-white"
                                title="Shift right +5s"
                              >
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onUpdateClip(clip.id, { duration: clip.duration + 1 }); }}
                                className="px-1 py-0.5 rounded bg-black/85 hover:bg-primary/20 text-[7px] font-mono text-primary hover:text-white transition-colors"
                                title="Extend duration (+1s)"
                              >
                                +1s
                              </button>
                            </div>
                            <div
                              onMouseDown={(e) => handleEdgeMouseDown(clip, 'right', e)}
                              className="pointer-events-auto w-4.5 h-full bg-black/60 border-l border-white/10 flex items-center justify-center hover:bg-primary hover:text-background-dark transition-all text-white cursor-ew-resize group/trim"
                              title="Drag to resize duration"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        )}

                        {clip.hasWaveform && !isSelected && (
                          <div className="flex gap-[1px] items-center h-4.5 opacity-30 px-3 w-full absolute bottom-1.5 left-0 right-0 pointer-events-none">
                            {[1,4,2,7,4,9,3,5,2,8,4,5,2,6,3,8,2,7,3,5,4,2,8,4,9,3,7,2,5].map((h, i) => (
                              <div
                                key={i}
                                className="flex-1 bg-white rounded-full"
                                style={{ height: `${h * 10}%` }}
                              />
                            ))}
                          </div>
                        )}

                        {clip.type === 'video' && !isSelected && clip.thumbnailUrl && (
                          <div className="absolute inset-x-0 bottom-0 h-4.5 flex opacity-20 overflow-hidden rounded-b-md pointer-events-none">
                            <img className="flex-1 object-cover h-full" src={clip.thumbnailUrl} alt="Thumbnail" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
