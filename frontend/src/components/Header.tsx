/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Film, Edit2, Check, Share2 } from 'lucide-react';

interface HeaderProps {
  onExport: () => void;
}

export default function Header({ onExport }: HeaderProps) {
  const [projectName, setProjectName] = useState('AutoCaption Project');
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
            Video Captioning Tool
          </p>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={onExport}
        className="px-4.5 py-2 bg-primary text-background-dark rounded-xl text-[11px] font-sans font-semibold tracking-wider hover:bg-white transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(173,198,255,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>Export</span>
      </button>
    </header>
  );
}
