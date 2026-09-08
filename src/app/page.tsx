"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { StatusBar } from "@/components/shell/StatusBar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { WorkspaceCanvas } from "@/components/canvas/WorkspaceCanvas";
import { AuthModal } from "@/components/auth/AuthModal";
import { VoiceHuddleModal } from "@/components/voice/VoiceHuddleModal";
import { SettingsModal, SettingsTab } from "@/components/settings/SettingsModal";

export default function Page() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [cpOpen, setCpOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("account");

  // Global keyboard shortcuts: ⌘K palette, ⌘B sidebar.
  useEffect(() => {
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
  }, []);

  const openSettings = (tab: SettingsTab) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#09090b] text-[#f4f4f5]">
      {/* Top Navigation */}
      <TopBar
        onOpenCommandPalette={() => setCpOpen(true)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
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
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      {settingsOpen && (
        <SettingsModal
          tab={settingsTab}
          onClose={() => setSettingsOpen(false)}
          onOpenAuth={() => {
            setSettingsOpen(false);
            setAuthModalOpen(true);
          }}
          onTabChange={setSettingsTab}
        />
      )}
      <VoiceHuddleModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />
    </div>
  );
}