"use client";

import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { StatusBar } from "@/components/shell/StatusBar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { WorkspaceCanvas } from "@/components/canvas/WorkspaceCanvas";
import { AuthModal } from "@/components/auth/AuthModal";
import { VoiceHuddleModal } from "@/components/voice/VoiceHuddleModal";

export default function Page() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [cpOpen, setCpOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-[#f4f4f5]">
      {/* Top Navigation */}
      <TopBar
        onOpenCommandPalette={() => setCpOpen(true)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenVoiceModal={() => setVoiceModalOpen(true)}
      />

      {/* Main Workspace Area with Collapsible Sidebar */}
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar
          isExpanded={isSidebarExpanded}
          onToggle={() => setIsSidebarExpanded((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto">
          <WorkspaceCanvas onOpenVoiceModal={() => setVoiceModalOpen(true)} />
        </main>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Interactive Modals */}
      <CommandPalette />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <VoiceHuddleModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />
    </div>
  );
}
