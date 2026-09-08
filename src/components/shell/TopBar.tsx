"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { 
  Search, 
  Radio, 
  Bell, 
  LogOut, 
  ChevronDown, 
  User, 
  Key, 
  Settings, 
  Sparkles,
  ShieldAlert
} from "lucide-react";
import { chatStore, VoiceParticipant } from "@/lib/chatStore";
import { SettingsTab } from "@/components/settings/SettingsModal";

export interface TopBarProps {
  onOpenCommandPalette: () => void;
  onOpenAuthModal: () => void;
  onOpenVoiceModal: () => void;
  onOpenSettings: (tab: SettingsTab) => void;
}

export function TopBar({ onOpenCommandPalette, onOpenAuthModal, onOpenVoiceModal, onOpenSettings }: TopBarProps) {
  const { data: session, status } = useSession();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState<VoiceParticipant[]>(chatStore.getVoiceMembers());
  const [presence, setPresence] = useState("Deep Work");

  useEffect(() => {
    return chatStore.subscribe(() => {
      setVoiceMembers(chatStore.getVoiceMembers());
    });
  }, []);

  const isAuthenticated = status === "authenticated" && !!session?.user;
  const user = session?.user;

  return (
    <header className="h-14 w-full bg-[#121215] border-b border-[#27272a] flex items-center justify-between px-4 sticky top-0 z-30 select-none">
      {/* Left: Logo & Workspace Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center shadow-md shadow-indigo-500/20 font-bold text-xs text-white">
            DD
          </div>
          <span className="text-sm font-bold tracking-tight text-[#f4f4f5] flex items-center gap-1.5">
            DevDeck
            <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              OS
            </span>
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#27272a] hidden sm:block" />

        <select
          aria-label="Select workspace"
          className="hidden sm:inline-block px-2.5 py-1 text-xs text-[#a1a1aa] bg-[#18181b] rounded-md border border-[#27272a] hover:border-[#3f3f46] outline-none transition-colors cursor-pointer"
        >
          <option>Personal Dev (Default)</option>
          <option>Team Alpha (Production)</option>
          <option>Org Beta (Staging)</option>
        </select>
      </div>

      {/* Center: Command Palette Trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden md:inline-flex items-center gap-3 px-3.5 py-1.5 text-xs text-[#71717a] bg-[#18181b] rounded-lg border border-[#27272a] hover:border-[#3f3f46] hover:text-[#d4d4d8] transition-all shadow-inner w-72 justify-between"
        aria-label="Open command palette"
      >
        <span className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-[#a1a1aa]" />
          <span>Search tasks, links, tools...</span>
        </span>
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#27272a] text-[#a1a1aa] rounded border border-[#3f3f46]">
          ⌘K
        </kbd>
      </button>

      {/* Right Controls: Voice, Presence, Notifications, Auth/Profile */}
      <div className="flex items-center gap-2.5">
        {/* Voice Huddle Button */}
        <button
          onClick={onOpenVoiceModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
            voiceMembers.length > 0
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
          }`}
          title="Open Voice Huddle"
        >
          <span className="relative flex h-2 w-2">
            {voiceMembers.length > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${voiceMembers.length > 0 ? "bg-emerald-500" : "bg-[#71717a]"}`} />
          </span>
          <Radio className="w-3.5 h-3.5" />
          <span>{voiceMembers.length} in Voice</span>
        </button>

        {/* Global Presence Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#a1a1aa] bg-[#18181b] rounded-md border border-[#27272a]">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-[11px] font-mono">Coding — {presence}</span>
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-1.5 text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] rounded-md transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        {/* User Authentication / Profile Dropdown */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] hover:border-[#3f3f46] rounded-full transition-all text-xs"
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-6 h-6 rounded-full object-cover border border-[#3f3f46]"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <span className="font-medium text-[#f4f4f5] max-w-[90px] truncate hidden sm:inline">
                {user?.name?.split(" ")[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-[#71717a]" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in duration-100"
                onClick={() => setProfileDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-[#27272a] mb-1">
                  <p className="font-semibold text-[#f4f4f5] truncate">{user?.name}</p>
                  <p className="text-[11px] text-[#71717a] truncate font-mono">{user?.email}</p>
                </div>

                <button
                  onClick={() => {
                    if (isAuthenticated) {
                      onOpenSettings("account");
                    } else {
                      onOpenAuthModal();
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[#d4d4d8] hover:bg-[#18181b] rounded-lg transition-colors text-left"
                >
                  <User className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  <span>Account Settings</span>
                </button>

                <button
                  onClick={() => onOpenSettings("keys")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[#d4d4d8] hover:bg-[#18181b] rounded-lg transition-colors text-left"
                >
                  <Key className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  <span>API Keys Vault</span>
                </button>

                <button
                  onClick={() => onOpenSettings("workspace")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[#d4d4d8] hover:bg-[#18181b] rounded-lg transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  <span>Workspace Preferences</span>
                </button>

                <div className="h-[1px] bg-[#27272a] my-1" />

                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-xs rounded-lg shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]"
          >
            {/* Google Icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#ffffff"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#ffffff"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
            </svg>
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
