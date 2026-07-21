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
  Plus,
  Play,
  Pause,
  ArrowRight,
  Sparkle,
  Check,
  RotateCcw
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { SidebarTab } from '../types';
import { MediaItem } from '../data';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  mediaList: MediaItem[];
  onAddMediaToTimeline: (item: MediaItem) => void;
  onSelectMediaForPlayer: (item: MediaItem) => void;
  activeMediaId: string | null;
  onAddTextClip: (title: string) => void;
  onSelectLUT: (lutId: any) => void;
  activeLUT: string;
  onRunAICaptions: () => void;
  isGeneratingCaptions: boolean;
  hasCaptions: boolean;
  onImportFile: (item: any) => void;
  onVideoFileSelected: (file: File) => void;
  jobStatus?: string | null;
  wordsPerLine: number;
  setWordsPerLine: (val: number) => void;
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
  wordsPerLine,
  setWordsPerLine,
}: SidebarProps) {
  const { uploadProgress } = useEditorStore();
  const [dragActive, setDragActive] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'import' as SidebarTab, label: 'Import', icon: Upload },
    { id: 'media' as SidebarTab, label: 'Media', icon: FolderOpen },
    { id: 'text' as SidebarTab, label: 'Text', icon: Type },
    { id: 'audio' as SidebarTab, label: 'Audio', icon: Music },
    { id: 'effects' as SidebarTab, label: 'Effects', icon: Sparkles },
    { id: 'ai-tools' as SidebarTab, label: 'AI Tools', icon: Cpu, badge: true },
    { id: 'assets' as SidebarTab, label: 'Assets', icon: Layers },
  ];

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

    if (isVideo) {
      onVideoFileSelected(file);
    }

    const url = URL.createObjectURL(file);
    const mockItem: MediaItem = {
      id: `imported-${Date.now()}`,
      title: file.name,
      duration: isAudio ? '03:12' : '--:--',
      durationSec: isAudio ? 192 : 300,
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

  const audioItems = mediaList.filter(m => m.category === 'audio');
  const videoItems = mediaList.filter(m => m.category === 'video');

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
            {activeTab === 'ai-tools' ? 'Neural AI Tools' : activeTab === 'import' ? 'Import Media' : `${activeTab} assets`}
          </h2>
          <p className="text-[10px] text-on-surface-variant/70 mt-0.5 leading-snug">
            {activeTab === 'import' && 'Upload videos or audio to begin captioning'}
            {activeTab === 'media' && 'Imported clips for your project timeline'}
            {activeTab === 'text' && 'Typography presets and title overlays'}
            {activeTab === 'audio' && 'Imported audio tracks'}
            {activeTab === 'effects' && 'Cinematic LUTs & studio grade lenses'}
            {activeTab === 'ai-tools' && 'Machine learning powered automated edits'}
            {activeTab === 'assets' && 'Overlays, frames, and grid structures'}
          </p>
        </div>

        {/* Dynamic content */}
        <div className="flex-1 overflow-y-auto pr-1">
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
                  Drag and drop a video here to begin captioning, or click to browse.
                </p>
                <div className="mt-4 px-2.5 py-1 rounded bg-white/[0.03] text-[8px] text-on-surface-variant/60 font-mono tracking-widest uppercase border border-white/[0.04]">
                  Supports MP4, MOV, AVI, WAV, MP3
                </div>
              </div>

              {uploadProgress !== null && (
                <div className="mt-4 p-4 border border-white/[0.08] rounded-xl bg-surface-container-low">
                  <div className="flex justify-between text-xs text-on-surface mb-2 font-medium">
                    <span>Uploading Video...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MEDIA PANEL */}
          {activeTab === 'media' && (
            <div className="space-y-3">
              {mediaList.length === 0 ? (
                <div className="text-center py-8 text-[10px] text-on-surface-variant/50 uppercase tracking-wider">
                  No media imported yet.<br />Use the Import tab to add files.
                </div>
              ) : (
                mediaList.map((item) => {
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
                          {item.category === 'video' ? (
                            <img src={item.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" alt={item.title} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                              <Music className="w-5 h-5 text-on-surface-variant/40" />
                            </div>
                          )}
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
                })
              )}
            </div>
          )}

          {/* TEXT PRESETS */}
          {activeTab === 'text' && (
            <div className="space-y-2.5">
              <div className="bg-surface-container-low rounded-xl p-3 border border-white/[0.04]">
                <label className="text-[9px] font-sans font-bold text-on-surface-variant/70 uppercase tracking-wider mb-1.5 block">
                  Custom Text
                </label>
                <input
                  id="custom-text-input"
                  type="text"
                  placeholder="Type your text here..."
                  className="w-full bg-neutral-950/80 border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] font-sans text-on-surface placeholder-on-surface-variant/40 outline-none focus:border-primary/50 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        onAddTextClip(val);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('custom-text-input') as HTMLInputElement;
                    const val = input?.value.trim();
                    if (val) {
                      onAddTextClip(val);
                      input.value = '';
                    }
                  }}
                  className="mt-2 w-full py-1.5 bg-primary text-background-dark rounded-lg text-[10px] font-sans font-bold tracking-wider uppercase hover:bg-white transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  Add Text
                </button>
              </div>

              <p className="text-[8px] font-mono text-on-surface-variant/40 uppercase tracking-widest px-1">Presets</p>

              {[
                { title: 'Main Title', style: 'tracking-[0.2em] font-sans font-bold text-lg', desc: 'Centered focus title text' },
                { title: 'Subtitles', style: 'text-sm text-center font-sans font-medium bg-black/60 px-2 py-0.5 rounded', desc: 'Timed transcription style' },
                { title: 'Lower Third', style: 'text-xs text-left font-sans font-semibold border-l-2 border-primary pl-2', desc: 'Presenter or scene label' },
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

          {/* AUDIO TRACKS (imported only) */}
          {activeTab === 'audio' && (
            <div className="space-y-2">
              {audioItems.length === 0 ? (
                <div className="text-center py-8 text-[10px] text-on-surface-variant/50 uppercase tracking-wider">
                  No audio imported yet.<br />Import audio files to add them here.
                </div>
              ) : (
                audioItems.map((item) => {
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
                })
              )}
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
                      Transcribe video audio and generate timed subtitles using Whisper.
                    </p>
                  </div>
                </div>

                {/* Words Per Line Control */}
                <div className="mb-4 bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-on-surface/90">
                      Words per Caption
                    </label>
                    <span className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                      {wordsPerLine}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={wordsPerLine}
                    onChange={(e) => setWordsPerLine(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[8px] text-on-surface-variant/50 mt-2 leading-relaxed">
                    Choose "1" for fast-paced single words, or "5-10" for traditional readability.
                  </p>
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
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Regenerate Captions</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Captions</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ASSETS PANEL */}
          {activeTab === 'assets' && (
            <div className="grid grid-cols-2 gap-2">
              {[
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
