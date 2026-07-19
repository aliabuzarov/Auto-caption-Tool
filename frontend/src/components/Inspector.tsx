/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { VideoTransform, AudioSettings, EffectSettings, InspectorTab, AnimationCurve, Clip, CaptionChunk } from '../types';

interface InspectorProps {
  activeTab: InspectorTab;
  setActiveTab: (tab: InspectorTab) => void;
  selectedClip: Clip | null;
  transform: VideoTransform;
  onUpdateTransform: (t: Partial<VideoTransform>) => void;
  audioSettings: AudioSettings;
  onUpdateAudioSettings: (a: Partial<AudioSettings>) => void;
  effects: EffectSettings;
  onUpdateEffects: (e: Partial<EffectSettings>) => void;
  isPlaying: boolean;
  onDeleteClip: (id: string) => void;
  editingCaptions?: CaptionChunk[] | null;
  onCaptionTextEdit?: (captionId: number, newText: string) => void;
  currentTime?: number;
  onUpdateClip?: (clipId: string, updatedFields: Partial<Clip>) => void;
}

export default function Inspector({
  activeTab,
  setActiveTab,
  selectedClip,
  transform,
  onUpdateTransform,
  audioSettings,
  onUpdateAudioSettings,
  effects,
  onUpdateEffects,
  isPlaying,
  onDeleteClip,
  editingCaptions,
  onCaptionTextEdit,
  currentTime,
  onUpdateClip,
}: InspectorProps) {
  const handleResetTransform = () => {
    onUpdateTransform({
      scale: 100,
      x: 0,
      y: 0,
      rotation: 0,
      opacity: 100
    });
  };

  return (
    <aside className="w-80 shrink-0 bg-surface border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] select-none">
      {/* Tab bar header */}
      <div className="flex border-b border-white/[0.04] bg-surface-container-lowest shrink-0">
        {(['video', 'audio', 'effects', 'text'] as InspectorTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[10px] font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab
                ? 'text-primary border-b border-primary bg-surface/30'
                : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-white/[0.02]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main settings body scroll area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {selectedClip ? (
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex justify-between items-center mb-1">
            <div className="min-w-0">
              <span className="text-[8px] font-mono font-bold text-primary tracking-widest uppercase">
                Active Selection
              </span>
              <h4 className="text-[11px] font-sans font-bold text-white uppercase truncate mt-0.5">
                {selectedClip.title}
              </h4>
            </div>
            <button
              onClick={() => onDeleteClip(selectedClip.id)}
              className="w-7 h-7 rounded-lg bg-red-950/20 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-background-dark transition-all cursor-pointer"
              title="Delete Clip from Track"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="bg-white/[0.01] border border-dashed border-white/[0.04] rounded-xl p-3 text-center mb-1">
            <p className="text-[10px] text-on-surface-variant/60">
              Click a clip in the timeline to view active properties.
            </p>
          </div>
        )}

        {/* TAB 1: VIDEO TRANSFORM */}
        {activeTab === 'video' && (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-widest">
                  Transform Settings
                </h3>
                <button
                  onClick={handleResetTransform}
                  className="w-6 h-6 rounded bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.06] transition-colors cursor-pointer text-on-surface-variant hover:text-on-surface"
                  title="Reset Default Coordinates"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-[11px] text-on-surface">
                    <span className="text-on-surface-variant">Scale</span>
                    <span className="font-mono text-primary font-semibold">{transform.scale}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={transform.scale}
                    onChange={(e) => onUpdateTransform({ scale: parseInt(e.target.value) })}
                    className="w-full accent-primary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-surface-container-low rounded-xl p-2.5 border border-white/[0.04] flex items-center">
                    <span className="text-[10px] text-on-surface-variant mr-3 font-mono">X</span>
                    <input
                      type="number"
                      value={transform.x}
                      onChange={(e) => onUpdateTransform({ x: parseInt(e.target.value) || 0 })}
                      className="bg-transparent border-none text-[11px] font-mono p-0 w-full focus:ring-0 text-right text-on-surface font-semibold"
                    />
                  </div>
                  <div className="bg-surface-container-low rounded-xl p-2.5 border border-white/[0.04] flex items-center">
                    <span className="text-[10px] text-on-surface-variant mr-3 font-mono">Y</span>
                    <input
                      type="number"
                      value={transform.y}
                      onChange={(e) => onUpdateTransform({ y: parseInt(e.target.value) || 0 })}
                      className="bg-transparent border-none text-[11px] font-mono p-0 w-full focus:ring-0 text-right text-on-surface font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-on-surface">
                    <span className="text-on-surface-variant">Rotation</span>
                    <span className="font-mono text-on-surface-variant">{transform.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={transform.rotation}
                    onChange={(e) => onUpdateTransform({ rotation: parseInt(e.target.value) })}
                    className="w-full accent-primary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer mt-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-on-surface">
                    <span className="text-on-surface-variant">Opacity</span>
                    <span className="font-mono text-on-surface-variant">{transform.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={transform.opacity}
                    onChange={(e) => onUpdateTransform({ opacity: parseInt(e.target.value) })}
                    className="w-full accent-primary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer mt-2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIO MIXING */}
        {activeTab === 'audio' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-widest mb-3">
                Master Volume Level
              </h3>
              <div className="flex justify-between items-center text-[11px] text-on-surface mb-2.5">
                <span className="text-on-surface-variant">Output level</span>
                <span className="font-mono font-bold text-secondary">{audioSettings.volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={audioSettings.volume}
                onChange={(e) => onUpdateAudioSettings({ volume: parseInt(e.target.value) })}
                className="w-full accent-secondary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-widest">
                Parametric Equalizer
              </h3>

              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-on-surface-variant">Bass booster (Low)</span>
                  <span className="font-mono text-on-surface-variant">{audioSettings.bass}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audioSettings.bass}
                  onChange={(e) => onUpdateAudioSettings({ bass: parseInt(e.target.value) })}
                  className="w-full accent-secondary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer mt-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-on-surface-variant">Treble crisp (High)</span>
                  <span className="font-mono text-on-surface-variant">{audioSettings.treble}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audioSettings.treble}
                  onChange={(e) => onUpdateAudioSettings({ treble: parseInt(e.target.value) })}
                  className="w-full accent-secondary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer mt-2"
                />
              </div>

              <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-3 border border-white/[0.04]">
                <div>
                  <h4 className="text-[11.5px] font-sans font-bold text-white uppercase tracking-wide">
                    Dialogue Crisp Mode
                  </h4>
                  <p className="text-[9px] text-on-surface-variant/70 mt-0.5">
                    Isolate vocals and suppress wind rumble
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={audioSettings.enhancedVoice}
                    onChange={(e) => onUpdateAudioSettings({ enhancedVoice: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-secondary/80"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LUT FILTERS & GRADE ADJUSTMENTS */}
        {activeTab === 'effects' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-widest mb-3.5">
                Image Grading Parameters
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-on-surface-variant">Lens Defocus Blur</span>
                    <span className="font-mono text-on-surface-variant">{effects.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={effects.blur}
                    onChange={(e) => onUpdateEffects({ blur: parseInt(e.target.value) })}
                    className="w-full accent-primary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer mt-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-on-surface-variant">Contrast Index</span>
                    <span className="font-mono text-on-surface-variant">{effects.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={effects.contrast}
                    onChange={(e) => onUpdateEffects({ contrast: parseInt(e.target.value) })}
                    className="w-full accent-primary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer mt-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-on-surface-variant">Exposure Brightness</span>
                    <span className="font-mono text-on-surface-variant">{effects.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={effects.brightness}
                    onChange={(e) => onUpdateEffects({ brightness: parseInt(e.target.value) })}
                    className="w-full accent-primary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer mt-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-on-surface-variant">Vibrancy Saturation</span>
                    <span className="font-mono text-on-surface-variant">{effects.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={effects.saturation}
                    onChange={(e) => onUpdateEffects({ saturation: parseInt(e.target.value) })}
                    className="w-full accent-primary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer mt-2"
                  />
                </div>

                <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-3 border border-white/[0.04]">
                  <div>
                    <h4 className="text-[11.5px] font-sans font-bold text-white uppercase tracking-wide">
                      Cinematic Vignette
                    </h4>
                    <p className="text-[9px] text-on-surface-variant/70 mt-0.5">
                      Shade frame corners with heavy shadow limits
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={effects.vignette}
                      onChange={(e) => onUpdateEffects({ vignette: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary/80"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEXT EDITING */}
        {activeTab === 'text' && selectedClip && selectedClip.type === 'text' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-widest mb-3">
                Text Content
              </h3>
              <textarea
                value={selectedClip.text || ''}
                onChange={(e) => onUpdateClip?.(selectedClip.id, { text: e.target.value })}
                rows={3}
                className="w-full bg-surface-container-low border border-white/[0.06] rounded-lg px-3 py-2 text-[11px] font-sans text-on-surface placeholder-on-surface-variant/40 outline-none focus:border-primary/50 transition-colors resize-none"
                placeholder="Enter text..."
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-widest">
                Timing
              </h3>

              <div className="bg-surface-container-low rounded-xl p-3 border border-white/[0.04] flex items-center">
                <span className="text-[10px] text-on-surface-variant mr-3 font-mono">Start</span>
                <input
                  type="number"
                  value={selectedClip.start}
                  onChange={(e) => onUpdateClip?.(selectedClip.id, { start: parseFloat(e.target.value) || 0 })}
                  step="0.5"
                  min="0"
                  className="bg-transparent border-none text-[11px] font-mono p-0 w-full focus:ring-0 text-right text-on-surface font-semibold"
                />
                <span className="text-[9px] text-on-surface-variant/50 ml-1">sec</span>
              </div>

              <div className="bg-surface-container-low rounded-xl p-3 border border-white/[0.04] flex items-center">
                <span className="text-[10px] text-on-surface-variant mr-3 font-mono">Duration</span>
                <input
                  type="number"
                  value={selectedClip.duration}
                  onChange={(e) => onUpdateClip?.(selectedClip.id, { duration: Math.max(1, parseFloat(e.target.value) || 0) })}
                  step="0.5"
                  min="1"
                  className="bg-transparent border-none text-[11px] font-mono p-0 w-full focus:ring-0 text-right text-on-surface font-semibold"
                />
                <span className="text-[9px] text-on-surface-variant/50 ml-1">sec</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-widest">
                Appearance
              </h3>

              <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-3 border border-white/[0.04]">
                <div>
                  <h4 className="text-[11px] font-sans font-bold text-white uppercase tracking-wide">
                    Show Background
                  </h4>
                  <p className="text-[9px] text-on-surface-variant/70 mt-0.5">
                    Display a colored box behind the text
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedClip.textShowBg !== false}
                    onChange={(e) => onUpdateClip?.(selectedClip.id, { textShowBg: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary/80"></div>
                </label>
              </div>

              {selectedClip.textShowBg !== false && (
                <div className="bg-surface-container-low rounded-xl p-3 border border-white/[0.04] flex items-center">
                  <span className="text-[10px] text-on-surface-variant mr-3 font-mono">BG Color</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="color"
                      value={selectedClip.textBgColor || '#000000'}
                      onChange={(e) => onUpdateClip?.(selectedClip.id, { textBgColor: e.target.value })}
                      className="w-7 h-7 rounded border border-white/[0.08] cursor-pointer bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={selectedClip.textBgColor || 'rgba(0,0,0,0.7)'}
                      onChange={(e) => onUpdateClip?.(selectedClip.id, { textBgColor: e.target.value })}
                      className="bg-transparent border-b border-white/[0.08] text-[10px] font-mono p-0.5 w-32 text-right text-on-surface/70 outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              )}

              <div className="bg-surface-container-low rounded-xl p-3 border border-white/[0.04] flex items-center">
                <span className="text-[10px] text-on-surface-variant mr-3 font-mono">Text Color</span>
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="color"
                    value={selectedClip.textColor || '#ffffff'}
                    onChange={(e) => onUpdateClip?.(selectedClip.id, { textColor: e.target.value })}
                    className="w-7 h-7 rounded border border-white/[0.08] cursor-pointer bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={selectedClip.textColor || '#ffffff'}
                    onChange={(e) => onUpdateClip?.(selectedClip.id, { textColor: e.target.value })}
                    className="bg-transparent border-b border-white/[0.08] text-[10px] font-mono p-0.5 w-24 text-right text-on-surface/70 outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-on-surface-variant">Font Size</span>
                  <span className="font-mono text-primary font-semibold">{selectedClip.textFontSize || 20}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={selectedClip.textFontSize || 20}
                  onChange={(e) => onUpdateClip?.(selectedClip.id, { textFontSize: parseInt(e.target.value) })}
                  className="w-full accent-primary bg-surface-container-highest rounded-lg appearance-none h-1 cursor-pointer mt-2"
                />
              </div>

              <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-3 border border-white/[0.04]">
                <div>
                  <h4 className="text-[11px] font-sans font-bold text-white uppercase tracking-wide">
                    Bold
                  </h4>
                  <p className="text-[9px] text-on-surface-variant/70 mt-0.5">
                    Make the text appear heavier
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedClip.textBold !== false}
                    onChange={(e) => onUpdateClip?.(selectedClip.id, { textBold: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary/80"></div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
