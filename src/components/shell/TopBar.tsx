"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  Radio,
  LogOut,
  ChevronDown,
  User,
  Key,
  Settings,
  LayoutGrid,
  Sun,
  Moon,
} from "lucide-react";
import { chatStore, VoiceParticipant } from "@/lib/chatStore";
import { SettingsTab } from "@/components/settings/SettingsModal";
import { themeStore } from "@/lib/themeStore";

export interface TopBarProps {
  onOpenCommandPalette: () => void;
  onOpenVoiceModal: () => void;
  onOpenSettings: (tab: SettingsTab) => void;
}

export function TopBar({ onOpenCommandPalette, onOpenVoiceModal, onOpenSettings }: TopBarProps) {
  const { data: session, status } = useSession();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState<VoiceParticipant[]>(chatStore.getVoiceMembers());
  const [presenceCount, setPresenceCount] = useState(chatStore.getPresenceCount());
  const [presenceList, setPresenceList] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  const theme = themeStore((s) => s.theme);
  const toggleTheme = themeStore((s) => s.toggle);

  useEffect(() => {
    return chatStore.subscribe(() => {
      setVoiceMembers(chatStore.getVoiceMembers());
      setPresenceCount(chatStore.getPresenceCount());
    });
  }, []);

  // Track presence list for avatars
  useEffect(() => {
    const updatePresence = (list: { id: string; name: string; avatar?: string }[]) => {
      setPresenceList(list);
    };
    // Subscribe to presence events via socket
    import("@/lib/chatSocket").then(({ getChatSocket }) => {
      const socket = getChatSocket();
      if (!socket) return;
      socket.on("presence", updatePresence);
      return () => { socket.off("presence", updatePresence); };
    });
  }, []);

  const isAuthenticated = status === "authenticated" && !!session?.user;
  const user = session?.user;

  return (
    <header className="h-14 w-full bg-surface-1 border-b border-custom flex items-center justify-between px-4 sticky top-0 z-30 select-none">
      {/* Left: Logo & Workspace */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center shadow-md shadow-indigo-500/20 font-bold text-xs text-white">
            DD
          </div>
          <span className="text-sm font-bold tracking-tight text-primary flex items-center gap-1.5">
            DevDeck
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              v2.4.0-stable
            </span>
          </span>
        </div>

        <div className="h-4 w-[1px] bg-border hidden sm:block" />

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-secondary bg-surface-2 rounded-md border border-custom">
          <LayoutGrid className="w-3 h-3 text-indigo-400" />
          <span>{user?.name?.split(" ")[0] || "Personal"} Workspace</span>
        </div>

        {/* Live Cluster Status Pill */}
        <div className="hidden xl:flex items-center gap-2 px-2 py-1 rounded bg-surface-2 border border-custom text-[10px] font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-emerald-400 font-semibold">PROD: 99.98% HEALTHY</span>
          <span className="text-muted">|</span>
          <span className="text-secondary">US-EAST-1</span>
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden md:inline-flex items-center gap-3 px-3.5 py-1.5 text-xs text-muted bg-surface-2 rounded-lg border border-custom hover:border-border-active hover:text-secondary transition-all shadow-inner w-72 justify-between"
        aria-label="Open command palette"
      >
        <span className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-secondary" />
          <span>Search tasks, links, tools...</span>
        </span>
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-3 text-secondary rounded border border-custom">
          ⌘K
        </kbd>
      </button>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-secondary hover:text-primary hover:bg-surface-2 rounded-md transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Voice Huddle Button */}
        <button
          onClick={onOpenVoiceModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
            voiceMembers.length > 0
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-surface-2 border-custom text-secondary hover:border-border-active"
          }`}
          title="Open Voice Huddle"
        >
          <span className="relative flex h-2 w-2">
            {voiceMembers.length > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${voiceMembers.length > 0 ? "bg-emerald-500" : "bg-muted"}`} />
          </span>
          <Radio className="w-3.5 h-3.5" />
          <span>{voiceMembers.length} in Voice</span>
        </button>

        {/* Presence indicators with avatars */}
        <div className="hidden lg:flex items-center gap-1.5" title="Online users">
          <div className="flex -space-x-1.5">
            {presenceList.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="w-6 h-6 rounded-full bg-surface-3 border-2 border-surface-1 flex items-center justify-center text-[8px] font-bold text-secondary overflow-hidden"
                title={p.name}
              >
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  p.name?.[0]?.toUpperCase() || "?"
                )}
              </div>
            ))}
          </div>
          <span className="text-[10px] font-mono text-muted">
            {presenceCount > 0 ? `${presenceCount} online` : ""}
          </span>
        </div>

        {/* User Profile Dropdown */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 bg-surface-2 hover:bg-surface-3 border border-custom hover:border-border-active rounded-full transition-all text-xs"
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-6 h-6 rounded-full object-cover border border-border-active"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <span className="font-medium text-primary max-w-[90px] truncate hidden sm:inline">
                {user?.name?.split(" ")[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-muted" />
            </button>

            {profileDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-surface-1 border border-custom rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in duration-100"
                onClick={() => setProfileDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-custom mb-1">
                  <p className="font-semibold text-primary truncate">{user?.name}</p>
                  <p className="text-[11px] text-muted truncate font-mono">{user?.email}</p>
                </div>

                <button onClick={() => onOpenSettings("account")} className="w-full flex items-center gap-2.5 px-3 py-2 text-secondary hover:bg-surface-2 rounded-lg transition-colors text-left">
                  <User className="w-3.5 h-3.5 text-secondary" />
                  <span>Account Settings</span>
                </button>
                <button onClick={() => onOpenSettings("keys")} className="w-full flex items-center gap-2.5 px-3 py-2 text-secondary hover:bg-surface-2 rounded-lg transition-colors text-left">
                  <Key className="w-3.5 h-3.5 text-secondary" />
                  <span>API Keys Vault</span>
                </button>
                <button onClick={() => onOpenSettings("workspace")} className="w-full flex items-center gap-2.5 px-3 py-2 text-secondary hover:bg-surface-2 rounded-lg transition-colors text-left">
                  <Settings className="w-3.5 h-3.5 text-secondary" />
                  <span>Workspace Preferences</span>
                </button>
                <div className="h-[1px] bg-custom my-1" />
                <button onClick={() => signOut()} className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
