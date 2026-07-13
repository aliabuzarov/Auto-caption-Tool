/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Upload,
  Type,
  Music,
  Sparkles,
  Cpu,
  Layers,
  Settings,
  Plus,
  Play,
  Pause,
  ArrowRight,
  Sparkle,
  Volume2,
  Trash2,
  Check
} from 'lucide-react';
import { SidebarTab } from '../types';
import { MEDIA_ITEMS, MediaItem } from '../data';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  mediaList: MediaItem[];
  onAddMediaToTimeline: (item: MediaItem) => void;
  onSelectMediaForPlayer: (item: MediaItem) => void;
  activeMediaId: string;
  onAddTextClip: (title: string) => void;
  onSelectLUT: (lutId: any) => void;
  activeLUT: string;
  onRunAICaptions: () => void;
  isGeneratingCaptions: boolean;
  hasCaptions: boolean;
  onImportFile: (item: any) => void;
  onVideoFileSelected: (file: File) => void;
  jobStatus?: string | null;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  mediaList,
  onAddMediaToTimeline,
  onSelectMediaForPlayer,
  activeMediaId,
  onAddTextClip,
  onSelectLUT,
  activeLUT,
  onRunAICaptions,
  isGeneratingCaptions,
  hasCaptions,
  onImportFile,
  onVideoFileSelected,
  jobStatus,
}: SidebarProps) {
  const [dragActive, setDragActive] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tabs layout data
  const tabs = [
    { id: 'media' as SidebarTab, label: 'Media', icon: FolderOpen },
    { id: 'import' as SidebarTab, label: 'Import', icon: Upload },
    { id: 'text' as SidebarTab, label: 'Text', icon: Type },
    { id: 'audio' as SidebarTab, label: 'Audio', icon: Music },
    { id: 'effects' as SidebarTab, label: 'Effects', icon: Sparkles },
    { id: 'ai-tools' as SidebarTab, label: 'AI Tools', icon: Cpu, badge: true },
    { id: 'assets' as SidebarTab, label: 'Assets', icon: Layers },
  ];

  // LUT preset metadata
  const luts = [
    { id: 'none', name: 'Raw Profile', desc: 'No color grade applied', gradient: 'from-gray-500 to-gray-600' },
    { id: 'cyberpunk', name: 'Cyberpunk Gold', desc: 'Saturated purple & neon cyan', gradient: 'from-fuchsia-600 to-cyan-500' },
    { id: 'vhs', name: 'Retro VHS', desc: 'Analog bleeding & low contrast', gradient: 'from-purple-800 to-amber-600' },
    { id: 'noir', name: 'Monochrome Noir', desc: 'Deep silver and dramatic darks', gradient: 'from-neutral-900 to-neutral-400' },
    { id: 'teal-orange', name: 'Teal & Orange', desc: 'Hollywood cinematic contrast', gradient: 'from-teal-600 to-orange-500' },
    { id: 'cinematic', name: 'Classic Silver', desc: 'Cool shadows & desaturated mids', gradient: 'from-blue-900 to-zinc-400' },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadedFile(e.target.files[0]);
    }
  };

  const handleUploadedFile = (file: File) => {
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');

    // Notify parent for captioning flow
    if (isVideo) {
      onVideoFileSelected(file);
    }

    const url = URL.createObjectURL(file);
    const mockItem: MediaItem = {
      id: `imported-${Date.now()}`,
      title: file.name,
      duration: isAudio ? '03:12' : '01:30',
      durationSec: isAudio ? 192 : 90,
      thumbnailUrl: isAudio
        ? 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300'
        : url,
      resolution: isAudio ? '44.1kHz / 16-bit' : '1920×1080 (FHD)',
      fps: isAudio ? 0 : 30,
      category: isAudio ? 'audio' : 'video',
      artist: isAudio ? 'User Import' : undefined
    };
    onImportFile(mockItem);
  };

  const toggleAudioPreview = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
    }
  };

  return (
    <div className="w-[320px] shrink-0 bg-surface border border-white/[0.06] rounded-2xl flex overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] select-none">
      {/* Icon list (Left vertical bar) */}
      <div className="w-16 bg-surface-container-lowest border-r border-white/[0.04] flex flex-col items-center py-4 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center relative transition-all group cursor-pointer ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-on-surface-variant/80 hover:text-on-surface hover:bg-white/[0.04]'
              }`}
              title={tab.label}
            >
              <Icon className="w-4.5 h-4.5 transition-transform group-hover:scale-105" />
              <span className="text-[8px] font-sans font-medium mt-1 uppercase scale-90 tracking-wide">{tab.label}</span>
              {tab.badge && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main panel display (Right side) */}
      <div className="flex-1 flex flex-col bg-surface p-4 min-w-0">
        <div className="mb-4">
          <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-on-surface/90">
            {activeTab === 'ai-tools' ? 'Neural AI Tools' : `${activeTab} assets`}
          </h2>
          <p className="text-[10px] text-on-surface-variant/70 mt-0.5 leading-snug">
            {activeTab === 'media' && 'Curated clips for your project timeline'}
            {activeTab === 'import' && 'Drag videos, sounds or images here'}
            {activeTab === 'text' && 'Elegant responsive titles and typography presets'}
            {activeTab === 'audio' && 'Licensing-free backing loops and sfx'}
            {activeTab === 'effects' && 'Cinematic glass LUTs & studio grade lenses'}
            {activeTab === 'ai-tools' && 'Machine learning powered automated edits'}
            {activeTab === 'assets' && 'Static frames, grids, overlay structures'}
          </p>
        </div>

        {/* Dynamic content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* MEDIA PANEL */}
          {activeTab === 'media' && (
            <div className="space-y-3">
              {mediaList.map((item) => {
                const isActivePlayer = activeMediaId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectMediaForPlayer(item)}
                    className={`group rounded-xl p-2 bg-surface-container-low border transition-all cursor-pointer hover:bg-surface-container-high relative overflow-hidden ${
                      isActivePlayer ? 'border-primary/55 ring-1 ring-primary/20' : 'border-white/[0.04]'
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-16 h-11 bg-neutral-950 rounded-lg overflow-hidden relative shrink-0 border border-white/[0.08]">
                        <img src={item.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" alt={item.title} />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-[8px] font-mono font-medium px-1 py-0.5 rounded text-white tracking-widest scale-90">
                          {item.duration}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-sans font-semibold text-on-surface truncate leading-tight">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[9px] text-on-surface-variant/70 mt-1 uppercase font-semibold">
                          <span>{item.resolution}</span>
                          {item.fps > 0 && (
                            <>
                              <span>•</span>
                              <span>{item.fps} fps</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Add to track button overlay */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddMediaToTimeline(item);
                        }}
                        className="w-6 h-6 rounded-md bg-primary text-background-dark flex items-center justify-center hover:bg-white transition-all cursor-pointer"
                        title="Add to Timeline Track"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* IMPORT PANEL */}
          {activeTab === 'import' && (
            <div className="h-full flex flex-col">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 border border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer ${
                  dragActive 
                    ? 'border-primary bg-primary/[0.03] text-primary' 
                    : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.01]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="video/*,audio/*,image/*"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-surface-container-high border border-white/[0.04] flex items-center justify-center mb-3">
                  <Upload className="w-4.5 h-4.5 text-on-surface-variant" />
                </div>
                <h3 className="text-[11px] font-sans font-bold text-on-surface uppercase tracking-wider">
                  Select Local Files
                </h3>
                <p className="text-[10px] text-on-surface-variant/70 mt-1 max-w-[200px] leading-normal">
                  Drag and drop raw footage or audio stems here, or click to browse.
                </p>
                <div className="mt-4 px-2.5 py-1 rounded bg-white/[0.03] text-[8px] text-on-surface-variant/60 font-mono tracking-widest uppercase border border-white/[0.04]">
                  Supports MP4, WAV, MP3
                </div>
              </div>
            </div>
          )}

          {/* TEXT PRESETS */}
          {activeTab === 'text' && (
            <div className="space-y-2.5">
              {[
                { title: 'Main Title Fast', style: 'tracking-[0.2em] font-sans font-bold text-lg', desc: 'Sleek, centered focus text' },
                { title: 'Subtitles', style: 'text-sm text-center font-sans font-medium bg-black/60 px-2 py-0.5 rounded', desc: 'Timed transcription style' },
                { title: 'Lower Third Label', style: 'text-xs text-left font-sans font-semibold border-l-2 border-primary pl-2', desc: 'Presenter or scene label' },
                { title: 'Retro Vapor', style: 'tracking-widest font-mono text-secondary text-base italic uppercase', desc: '80s synth wave text styling' },
              ].map((textPreset) => (
                <div
                  key={textPreset.title}
                  className="group rounded-xl p-3 bg-surface-container-low border border-white/[0.04] hover:bg-surface-container-high transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-[11px] font-sans font-bold text-on-surface uppercase tracking-wide">
                        {textPreset.title}
                      </h4>
                      <p className="text-[9px] text-on-surface-variant/70 mt-0.5">
                        {textPreset.desc}
                      </p>
                    </div>
                    <button
                      onClick={() => onAddTextClip(textPreset.title)}
                      className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.06] flex items-center justify-center hover:bg-primary hover:text-background-dark transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="bg-neutral-950/80 rounded-lg p-2.5 flex items-center justify-center h-14 border border-white/[0.04] overflow-hidden">
                    <span className={`${textPreset.style} truncate text-white/90`}>
                      {textPreset.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AUDIO TRACKS */}
          {activeTab === 'audio' && (
            <div className="space-y-2">
              {mediaList.filter(m => m.category === 'audio').map((item) => {
                const isPlaying = playingAudioId === item.id;
                return (
                  <div
                    key={item.id}
                    className="group rounded-xl p-3 bg-surface-container-low border border-white/[0.04] hover:bg-surface-container-high transition-all flex gap-3 items-center"
                  >
                    <button
                      onClick={(e) => toggleAudioPreview(item.id, e)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                        isPlaying 
                          ? 'bg-secondary/15 border-secondary/35 text-secondary' 
                          : 'bg-white/[0.03] border-white/[0.06] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.06]'
                      }`}
                    >
                      {isPlaying ? (
                        <div className="flex gap-[2px] items-end h-3">
                          <span className="w-[2px] h-2 bg-secondary animate-[bounce_0.8s_infinite_100ms]"></span>
                          <span className="w-[2px] h-3 bg-secondary animate-[bounce_0.8s_infinite_300ms]"></span>
                          <span className="w-[2px] h-1.5 bg-secondary animate-[bounce_0.8s_infinite_500ms]"></span>
                        </div>
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-sans font-bold text-on-surface truncate leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-[9px] text-on-surface-variant/70 mt-0.5 uppercase tracking-wide font-medium">
                        {item.artist} • {item.duration}
                      </p>
                    </div>
                    <button
                      onClick={() => onAddMediaToTimeline(item)}
                      className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.06] flex items-center justify-center hover:bg-primary hover:text-background-dark transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Add to Timeline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* EFFECTS LUT PANEL */}
          {activeTab === 'effects' && (
            <div className="grid grid-cols-2 gap-2.5">
              {luts.map((lut) => {
                const isSelected = activeLUT === lut.id;
                return (
                  <button
                    key={lut.id}
                    onClick={() => onSelectLUT(lut.id)}
                    className={`rounded-xl p-2 bg-surface-container-low border text-left transition-all hover:bg-surface-container-high cursor-pointer relative group ${
                      isSelected ? 'border-primary ring-1 ring-primary/20' : 'border-white/[0.04]'
                    }`}
                  >
                    <div className={`w-full h-14 rounded-lg bg-gradient-to-tr ${lut.gradient} relative overflow-hidden mb-2 shadow-inner border border-white/[0.06]`}>
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-primary text-background-dark flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        </div>
                      )}
                    </div>
                    <h4 className="text-[10px] font-sans font-bold text-on-surface truncate uppercase tracking-wider">
                      {lut.name}
                    </h4>
                    <p className="text-[8px] text-on-surface-variant/70 truncate mt-0.5 leading-snug">
                      {lut.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* AI NEURAL TOOLS */}
          {activeTab === 'ai-tools' && (
            <div className="space-y-3">
              {/* Auto captions */}
              <div className="rounded-xl p-3.5 bg-surface-container-low border border-white/[0.04] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/[0.02] rounded-full blur-xl group-hover:bg-primary/[0.05] transition-all"></div>
                <div className="flex gap-3 items-start mb-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Sparkle className="w-4 h-4 fill-primary/20 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-sans font-bold text-on-surface uppercase tracking-wide">
                      AI Auto Captions
                    </h4>
                    <p className="text-[9px] text-on-surface-variant/70 mt-0.5 leading-relaxed">
                      Transcribe running clip audio and construct timed layout subtitles.
                    </p>
                  </div>
                </div>
                <button
                  disabled={isGeneratingCaptions}
                  onClick={onRunAICaptions}
                  className={`w-full py-2 rounded-lg text-[10px] font-sans font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isGeneratingCaptions
                      ? 'bg-white/[0.04] text-on-surface-variant/50 cursor-not-allowed border border-white/[0.04]'
                      : hasCaptions
                      ? 'bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/20'
                      : 'bg-primary text-background-dark hover:shadow-[0_0_12px_rgba(173,198,255,0.25)] hover:bg-white'
                  }`}
                >
                  {isGeneratingCaptions ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-on-surface-variant/40 border-t-on-surface-variant rounded-full animate-spin"></div>
                      <span>{jobStatus === 'transcribing' ? 'Transcribing...' : 'Uploading...'}</span>
                    </>
                  ) : hasCaptions ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Captions Ready</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Captions</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Background Removal */}
              <div className="rounded-xl p-3 bg-surface-container-low border border-white/[0.04] hover:bg-surface-container-high transition-colors">
                <div className="flex gap-2.5 items-center">
                  <div className="w-6.5 h-6.5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-on-surface-variant">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[10px] font-sans font-bold text-on-surface uppercase tracking-wider">
                      Magic Smart Masking
                    </h4>
                    <p className="text-[8.5px] text-on-surface-variant/70">
                      Segment objects with single-click edge snapping.
                    </p>
                  </div>
                </div>
              </div>

              {/* Scene Detection */}
              <div className="rounded-xl p-3 bg-surface-container-low border border-white/[0.04] hover:bg-surface-container-high transition-colors">
                <div className="flex gap-2.5 items-center">
                  <div className="w-6.5 h-6.5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-on-surface-variant">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[10px] font-sans font-bold text-on-surface uppercase tracking-wider">
                      AI Smart Scene Cut
                    </h4>
                    <p className="text-[8.5px] text-on-surface-variant/70">
                      Auto-detect frame switches and break clips.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ASSETS PANEL */}
          {activeTab === 'assets' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Cinematic Grain', ext: 'LUT-Film', color: 'from-amber-950/20 to-neutral-900/30' },
                { label: 'VHS Glitch Overlay', ext: 'FX-Scan', color: 'from-indigo-950/20 to-neutral-900/30' },
                { label: 'Letterbox 2.39:1', ext: 'M-Bar', color: 'from-zinc-900/30 to-black/50' },
                { label: 'Widescreen Border', ext: 'M-Wd', color: 'from-neutral-900/30 to-black/50' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl p-2.5 bg-surface-container-low border border-white/[0.04] text-left hover:bg-surface-container-high transition-all cursor-pointer`}
                >
                  <div className={`w-full h-11 rounded bg-gradient-to-br ${item.color} flex items-center justify-center text-[8px] font-mono text-on-surface-variant/40 tracking-widest uppercase border border-white/[0.03] mb-1.5`}>
                    {item.ext}
                  </div>
                  <h4 className="text-[9.5px] font-sans font-bold text-on-surface truncate uppercase tracking-wider">
                    {item.label}
                  </h4>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
