"use client";

import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { StatusBar } from "@/components/shell/StatusBar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { WorkspaceCanvas } from "@/components/canvas/WorkspaceCanvas";
import { Brain } from "lucide-react";

export default function Page() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [cpOpen, setCpOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <TopBar onOpenCommandPalette={() => setCpOpen(true)} />
      <div className="flex flex-col w-full">
        <Sidebar isExpanded={isSidebarExpanded} onToggle={() => setIsSidebarExpanded((prev) => !prev)} />
        <main className="flex-1 w-full overflow-y-auto">
          <WorkspaceCanvas />
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
    </div>
  );
}