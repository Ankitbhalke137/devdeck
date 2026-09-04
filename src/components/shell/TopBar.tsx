"use client";

import { Menu, LogOut } from "lucide-react";
import { useState } from "react";

export interface TopBarProps {
  onOpenCommandPalette: () => void;
}

export function TopBar({ onOpenCommandPalette }: TopBarProps) {
  const [voiceActive, setVoiceActive] = useState(false);
  const [presence, setPresence] = useState("deep work");
  const [notifications, setNotifications] = useState(3);

  return (
    <header
      className="h-14 w-full bg-surface-1 border-b border-custom flex items-center justify-between px-4 rounded-t-xl shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg font-medium text-primary">DevDeck</span>
        <select
          className="hidden sm:inline-block px-3 py-1.5 text-sm text-muted bg-surface-3 rounded border-custom"
        >
          <option>Personal Dev</option>
          <option>Team Alpha</option>
          <option>Org Beta</option>
        </select>
      </div>

      <button
        onClick={onOpenCommandPalette}
        className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 text-sm text-muted bg-surface-3 rounded border-custom hover:bg-surface-2 hover:text-text-primary transition-colors"
        aria-label="Open command palette (⌘K)"
      >
        <Menu className="h-4 w-4" />
        Search tasks, links, docs, tools, AI...
      </button>

      <div className="flex items-center gap-4">
        {/* Voice Huddle Indicator */}
        <div className="flex items-center gap-1 px-2.5 py-0.5 text-xs text-secondary bg-surface-3 rounded border-custom">
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span>2 in Voice</span>
        </div>

        {/* Presence Badge */}
        <div className="flex items-center gap-1 px-2.5 py-0.5 text-xs text-secondary bg-surface-3 rounded border-custom">
          <span className="w-1 h-1 rounded-full bg-sky-500" />
          <span>Coding - {presence}</span>
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-1.5 text-secondary hover:bg-surface-2 rounded-custom hover:text-text-primary transition-colors"
          aria-label="Notifications"
        >
          <Menu className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 text-xs text-surface-1">3</span>
        </button>

        {/* User Profile */}
        <div className="relative hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-sm text-secondary bg-surface-3 rounded border-custom hover:bg-surface-2 hover:text-text-primary transition-colors cursor-pointer">
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">John Doe</span>
        </div>
      </div>
    </header>
  );
}