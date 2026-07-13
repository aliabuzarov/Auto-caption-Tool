/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Film, Edit2, Check, Bell, Settings, Users, Share2, Play } from 'lucide-react';

interface HeaderProps {
  onExport: () => void;
}

export default function Header({ onExport }: HeaderProps) {
  const [projectName, setProjectName] = useState('Oniex New Design');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);

  const handleSaveName = () => {
    if (editValue.trim()) {
      setProjectName(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditValue(projectName);
      setIsEditing(false);
    }
  };

  return (
    <header className="bg-surface/75 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 flex justify-between items-center w-full max-w-7xl mx-auto z-40 shrink-0 select-none shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Brand / Project Info */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-white/[0.08] flex items-center justify-center shadow-inner group">
          <Film className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-200" />
        </div>
        <div>
          {isEditing ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                className="bg-surface-container-highest border border-primary/40 rounded px-2 py-0.5 text-sm font-sans font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary w-44"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="p-1 rounded bg-primary/20 hover:bg-primary/30 text-primary transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <h1 className="text-sm font-sans font-medium text-on-surface flex items-center gap-2 group">
              <span className="truncate max-w-[180px]">{projectName}</span>
              <button
                onClick={() => {
                  setEditValue(projectName);
                  setIsEditing(true);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/[0.05] text-on-surface-variant hover:text-on-surface cursor-pointer"
                title="Rename Project"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </h1>
          )}
          <p className="text-[10px] font-sans font-semibold tracking-wider text-on-surface-variant/70 uppercase mt-0.5">
            Team Project <span className="text-primary/70 ml-1">• Saved</span>
          </p>
        </div>
      </div>

      {/* Collaborators (Middle) */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <img
            className="w-8 h-8 rounded-full border-2 border-surface object-cover"
            alt="Sophia (Editor)"
            referrerPolicy="no-referrer"
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
          />
          <img
            className="w-8 h-8 rounded-full border-2 border-surface object-cover"
            alt="Marcus (Director)"
            referrerPolicy="no-referrer"
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop"
          />
          <img
            className="w-8 h-8 rounded-full border-2 border-surface object-cover"
            alt="Elena (VFX Artist)"
            referrerPolicy="no-referrer"
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
          />
        </div>
        <div className="hidden sm:flex items-center justify-center px-2 py-1 rounded bg-surface-container border border-white/[0.06] text-[10px] font-sans text-on-surface font-semibold tracking-wider">
          +12
        </div>
        <button className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/[0.06] text-[11px] font-sans font-semibold tracking-wide hover:bg-white/[0.04] transition-all cursor-pointer">
          <Users className="w-3.5 h-3.5 text-on-surface-variant" />
          <span>Join Room</span>
        </button>
      </div>

      {/* Trailing Actions */}
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] transition-colors relative cursor-pointer group">
          <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-tertiary rounded-full"></span>
        </button>
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] transition-colors cursor-pointer group">
          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
        </button>
        <button
          onClick={onExport}
          className="px-4.5 py-2 bg-primary text-background-dark rounded-xl text-[11px] font-sans font-semibold tracking-wider hover:bg-white transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(173,198,255,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
