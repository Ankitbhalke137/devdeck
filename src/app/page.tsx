"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Terminal, Loader2 } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { StatusBar } from "@/components/shell/StatusBar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { WorkspaceCanvas } from "@/components/canvas/WorkspaceCanvas";
import { SignInScreen } from "@/components/auth/SignInScreen";
import { VoiceHuddleModal } from "@/components/voice/VoiceHuddleModal";
import { SettingsModal, SettingsTab } from "@/components/settings/SettingsModal";
import { themeStore } from "@/lib/themeStore";

function LoadingSplash() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[#09090b] text-[#f4f4f5]">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-indigo-500/25">
        <Terminal className="w-7 h-7 text-white" />
      </div>
      <div className="flex items-center gap-2 text-xs text-[#a1a1aa] font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        Opening DevDeck…
      </div>
    </div>
  );
}

export default function Page() {
  const { status } = useSession();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [cpOpen, setCpOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("account");

  // Global keyboard shortcuts: ⌘K palette, ⌘B sidebar. Only active on the dashboard.
  useEffect(() => {
    if (status !== "authenticated") return;
    // Initialize theme
    themeStore.getState();
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        setCpOpen((prev) => !prev);
      } else if (key === "b") {
        e.preventDefault();
        setIsSidebarExpanded((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [status]);

  const openSettings = (tab: SettingsTab) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  // Gate: the dashboard is only reachable after a successful sign-in.
  if (status === "loading") return <LoadingSplash />;
  if (status !== "authenticated") return <SignInScreen />;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground transition-colors duration-150">
      {/* Top Navigation */}
      <TopBar
        onOpenCommandPalette={() => setCpOpen(true)}
        onOpenVoiceModal={() => setVoiceModalOpen(true)}
        onOpenSettings={openSettings}
      />

      {/* Main Workspace Area with Collapsible Sidebar */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        <Sidebar
          isExpanded={isSidebarExpanded}
          onToggle={() => setIsSidebarExpanded((prev) => !prev)}
          onOpenSettings={() => openSettings("workspace")}
        />
        <main className="flex-1 overflow-y-auto">
          <WorkspaceCanvas onOpenVoiceModal={() => setVoiceModalOpen(true)} />
        </main>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Interactive Modals */}
      <CommandPalette
        open={cpOpen}
        onClose={() => setCpOpen(false)}
        onOpenSettings={() => openSettings("account")}
        onOpenVoiceModal={() => setVoiceModalOpen(true)}
      />
      {settingsOpen && (
        <SettingsModal
          tab={settingsTab}
          onClose={() => setSettingsOpen(false)}
          onOpenAuth={() => {
            // Signing out flips the auth gate to the sign-in screen automatically.
            setSettingsOpen(false);
          }}
          onTabChange={setSettingsTab}
        />
      )}
      <VoiceHuddleModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />
    </div>
  );
}