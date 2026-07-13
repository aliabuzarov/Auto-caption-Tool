/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
  Trash2,
  Cpu,
  Tv,
  CheckCircle,
  TrendingUp,
  Activity
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
  onTriggerUpscale: () => void;
  isUpscaling: boolean;
  upscaleProgress: number;
  isUpscaled: boolean;
  editingCaptions?: CaptionChunk[] | null;
  onCaptionTextEdit?: (captionId: number, newText: string) => void;
  currentTime?: number;
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
  onTriggerUpscale,
  isUpscaling,
  upscaleProgress,
  isUpscaled,
  editingCaptions,
  onCaptionTextEdit,
  currentTime,
}: InspectorProps) {
  const [animationCurve, setAnimationCurve] = useState<AnimationCurve>('ease-in-out');

  // Equalizer bars helper values for animated playback audio mixing
  const [eqHeights, setEqHeights] = useState<number[]>([40, 25, 60, 30, 75]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setEqHeights([
          Math.floor(Math.random() * 80) + 15,
          Math.floor(Math.random() * 50) + 10,
          Math.floor(Math.random() * 90) + 10,
          Math.floor(Math.random() * 60) + 20,
          Math.floor(Math.random() * 85) + 15,
        ]);
      }, 120);
    } else {
      setEqHeights([30, 20, 45, 25, 40]);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

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
        {(['video', 'audio', 'effects'] as InspectorTab[]).map((tab) => (
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
        {/* Selected Clip summary header (if any is active) */}
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

              {/* Scale slide */}
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

                {/* Coordinates grid X & Y */}
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

                {/* Rotation */}
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

                {/* Opacity */}
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

            {/* Animation Curves cubic bezier visualization */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-widest">
                  Keyframe Interpolation
                </h3>
                <span className="text-[9px] font-mono text-primary font-semibold uppercase tracking-wider">
                  Ease curves
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {(['ease-in-out', 'ease-in', 'ease-out', 'linear'] as AnimationCurve[]).map((curve) => (
                  <button
                    key={curve}
                    onClick={() => setAnimationCurve(curve)}
                    className={`py-1.5 px-2 rounded-lg text-[9px] font-sans font-bold uppercase border transition-all cursor-pointer ${
                      animationCurve === curve
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-white/[0.02] border-white/[0.05] text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {curve.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Dynamic SVG interpolation drawing */}
              <div className="bg-surface-container-low rounded-xl border border-white/[0.04] p-3.5 relative h-24 overflow-hidden group">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid sublines */}
                  <line x1="0" y1="25" x2="100" y2="25" className="stroke-white/[0.03] stroke-1" />
                  <line x1="0" y1="50" x2="100" y2="50" className="stroke-white/[0.03] stroke-1" />
                  <line x1="0" y1="75" x2="100" y2="75" className="stroke-white/[0.03] stroke-1" />
                  
                  {/* Interactive ease drawing path */}
                  <path
                    d={
                      animationCurve === 'ease-in-out' ? 'M 0 100 C 42 100, 58 0, 100 0' :
                      animationCurve === 'ease-in' ? 'M 0 100 C 50 100, 100 50, 100 0' :
                      animationCurve === 'ease-out' ? 'M 0 100 C 0 50, 50 0, 100 0' :
                      'M 0 100 L 100 0'
                    }
                    fill="none"
                    className="stroke-primary stroke-2"
                  />
                </svg>
                <div className="absolute bottom-2 left-3 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-primary/70" />
                  <span className="text-[8px] text-primary/80 font-mono uppercase bg-primary/[0.08] px-1.5 py-0.5 rounded">
                    Active Curve
                  </span>
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

            {/* EQ adjustment block */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-widest">
                Parametric Equalizer
              </h3>
              
              {/* Bass slider */}
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

              {/* Treble slider */}
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

              {/* Dialogue Vocal Enhancer toggle */}
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

            {/* Dynamic Equalizer Visual Mixing Panel (bouncing eq bars based on playback state) */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase tracking-widest">
                  Live Master Equalizer
                </h3>
                <Volume2 className="w-3.5 h-3.5 text-secondary" />
              </div>

              <div className="bg-surface-container-low rounded-xl p-4 border border-white/[0.04]">
                <div className="flex justify-between items-end h-16 gap-3">
                  {eqHeights.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-surface-container-highest rounded-sm relative overflow-hidden flex items-end h-full"
                    >
                      <div
                        className="w-full bg-gradient-to-t from-secondary/40 to-secondary transition-all duration-100 rounded-sm"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[8px] font-mono text-on-surface-variant/50 uppercase tracking-widest mt-2">
                  <span>64Hz</span>
                  <span>250Hz</span>
                  <span>1kHz</span>
                  <span>4kHz</span>
                  <span>16kHz</span>
                </div>
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
                {/* Blur */}
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

                {/* Contrast */}
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

                {/* Brightness */}
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

                {/* Saturation */}
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

                {/* Vignette effect switch */}
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
      </div>

      {/* FOOTER SMART CARD: NEURAL AI UP-SCALER */}
      <div className="p-4 border-t border-white/[0.04] bg-surface-container-lowest shrink-0">
        <div className="bg-gradient-to-br from-surface-container-high to-surface-container-highest rounded-xl p-4 border border-secondary/10 relative overflow-hidden group">
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-secondary/[0.05] rounded-full blur-xl group-hover:bg-secondary/[0.1] transition-all"></div>
          
          <div className="flex gap-3 items-start mb-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary shrink-0">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-[11.5px] font-sans font-bold text-on-surface uppercase tracking-wide">
                  Neural AI Upscale
                </h4>
                {isUpscaled && (
                  <span className="text-[7px] font-mono text-green-400 bg-green-400/10 px-1 py-0.5 rounded uppercase font-bold tracking-wider">
                    4K Live
                  </span>
                )}
              </div>
              <p className="text-[9px] text-on-surface-variant/70 mt-0.5 leading-relaxed">
                Render frames to high-fidelity 4K output resolution using neural deep model textures.
              </p>
            </div>
          </div>

          {/* Upscaling Progress sequence */}
          {isUpscaling ? (
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-on-surface-variant/75">
                <span>
                  {upscaleProgress < 30 ? 'Analyzing pixel maps...' :
                   upscaleProgress < 65 ? 'Synthesizing high-freq borders...' :
                   upscaleProgress < 90 ? 'Injecting deep neural textures...' :
                   'Writing upscaled 4K profile...'}
                </span>
                <span className="text-secondary font-bold">{upscaleProgress}%</span>
              </div>
              <div className="w-full h-1 bg-surface-container-lowest rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all duration-300"
                  style={{ width: `${upscaleProgress}%` }}
                />
              </div>
            </div>
          ) : isUpscaled ? (
            <div className="mt-3.5 bg-green-950/20 border border-green-500/20 rounded-lg p-2 flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-[9.5px] font-sans font-bold uppercase tracking-wider">
                Successfully Upscaled to 4K Ultra
              </span>
            </div>
          ) : (
            <button
              onClick={onTriggerUpscale}
              className="mt-3 w-full py-1.5 bg-secondary text-background-dark rounded-lg text-[9.5px] font-sans font-bold tracking-wider uppercase hover:bg-white transition-all cursor-pointer shadow-[0_0_10px_rgba(221,183,255,0.15)]"
            >
              Run AI 4K Upscale
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
