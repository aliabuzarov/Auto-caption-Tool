/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Play, Scissors, Bookmark, Sparkles, RefreshCw, Type } from 'lucide-react';

interface CommandItem {
  id: string;
  name: string;
  shortcut: string;
  category: string;
  icon: any;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onSplitClip: () => void;
  onAddMarker: () => void;
  onRunAICaptions: () => void;
  onResetTransform: () => void;
  onAddTextClip: (title: string) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onTogglePlay,
  onSplitClip,
  onAddMarker,
  onRunAICaptions,
  onResetTransform,
  onAddTextClip
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    { id: 'play', name: 'Play / Pause Player', shortcut: 'Space', category: 'Playback', icon: Play, action: onTogglePlay },
    { id: 'split', name: 'Split Clip at Playhead', shortcut: 'S', category: 'Editing', icon: Scissors, action: onSplitClip },
    { id: 'marker', name: 'Add Timeline Marker', shortcut: 'M', category: 'Editing', icon: Bookmark, action: onAddMarker },
    { id: 'captions', name: 'Generate AI Audio Captions', shortcut: 'C', category: 'AI Tools', icon: Sparkles, action: onRunAICaptions },
    { id: 'reset', name: 'Reset Coordinates Transform', shortcut: 'R', category: 'Workspace', icon: RefreshCw, action: onResetTransform },
    { id: 'add-title', name: 'Add "Main Title" Text', shortcut: 'T', category: 'Text', icon: Type, action: () => onAddTextClip('Main Title') },
    { id: 'add-sub', name: 'Add "Subtitles" Text', shortcut: 'Shift+T', category: 'Text', icon: Type, action: () => onAddTextClip('Subtitles') },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4 select-none animate-[fadeIn_0.15s_ease-out]">
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="bg-surface border border-white/[0.08] w-full max-w-lg rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.85)] z-10 flex flex-col max-h-[380px]">
        <div className="flex items-center px-4 py-3 border-b border-white/[0.04] gap-3 bg-surface-container-lowest shrink-0">
          <Search className="w-4 h-4 text-on-surface-variant/70" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or shortcut..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="bg-transparent border-none text-[12.5px] font-sans text-on-surface placeholder-on-surface-variant/45 focus:outline-none focus:ring-0 w-full"
          />
          <button
            onClick={onClose}
            className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-[9px] text-on-surface-variant/80 font-mono tracking-widest uppercase hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            Esc
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/15 text-primary'
                      : 'border border-transparent text-on-surface-variant/90 hover:text-on-surface hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                      isSelected ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/[0.02] border-white/[0.05] text-on-surface-variant'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-[11.5px] font-sans font-bold leading-tight uppercase tracking-wide">
                        {cmd.name}
                      </h4>
                      <p className="text-[8px] text-on-surface-variant/60 font-mono uppercase tracking-wider mt-0.5">
                        {cmd.category}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono tracking-wider ${
                    isSelected ? 'bg-primary/20 text-primary border border-primary/25' : 'bg-white/[0.03] border border-white/[0.05] text-on-surface-variant/60'
                  }`}>
                    {cmd.shortcut}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-on-surface-variant/60 text-[10px] font-sans">
              No matching commands or actions found. Try typing 'AI' or 'Play'.
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/[0.03] bg-surface-container-lowest flex justify-between items-center text-[8px] font-mono text-on-surface-variant/45 uppercase tracking-widest shrink-0">
          <span>Use arrow keys to navigate</span>
          <span>Press Enter to select</span>
        </div>
      </div>
    </div>
  );
}
