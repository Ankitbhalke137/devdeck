"use client";

import { useState } from "react";
import { AIAssistantWidget } from "@/components/widgets/AIAssistantWidget";
import { TaskboardWidget } from "@/components/widgets/TaskboardWidget";
import { ResourceHubWidget } from "@/components/widgets/ResourceHubWidget";
import { DevToolsWidget } from "@/components/widgets/DevToolsWidget";
import { ChatWidget } from "@/components/widgets/ChatWidget";
import { FocusStationWidget } from "@/components/widgets/FocusStationWidget";

type WidgetType = "ai" | "tasks" | "resources" | "dev-tools" | "chat" | "focus";

interface WorkspaceCanvasProps {
  onOpenVoiceModal?: () => void;
}

const widgetDefaults: Record<WidgetType, { i: string; w: number; h: number }> = {
  ai: { i: "ai", w: 6, h: 8 },
  tasks: { i: "tasks", w: 6, h: 8 },
  resources: { i: "resources", w: 4, h: 6 },
  "dev-tools": { i: "dev-tools", w: 4, h: 6 },
  chat: { i: "chat", w: 4, h: 6 },
  focus: { i: "focus", w: 12, h: 4 },
};

const COLUMNS = 12;

export function WorkspaceCanvas({ onOpenVoiceModal }: WorkspaceCanvasProps) {
  const [layout] = useState<{ i: string; w: number; h: number }[]>([
    { i: "ai", w: 6, h: 8 },
    { i: "tasks", w: 6, h: 8 },
    { i: "resources", w: 4, h: 6 },
    { i: "dev-tools", w: 4, h: 6 },
    { i: "chat", w: 4, h: 6 },
    { i: "focus", w: 12, h: 4 },
  ]);

  const renderWidget = (type: string) => {
    switch (type) {
      case "ai":
        return <AIAssistantWidget />;
      case "tasks":
        return <TaskboardWidget />;
      case "resources":
        return <ResourceHubWidget />;
      case "dev-tools":
        return <DevToolsWidget />;
      case "chat":
        return <ChatWidget onOpenVoiceModal={onOpenVoiceModal} />;
      case "focus":
        return <FocusStationWidget />;
      default:
        return null;
    }
  };

  return (
    <section className="p-4 bg-[#09090b] min-h-[calc(100vh-3.5rem)]">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 max-w-[1920px] mx-auto">
        {/* Top Row: AI Assistant (7 cols) + Tasks (5 cols) */}
        <div className="xl:col-span-7 h-[460px]">
          {renderWidget("ai")}
        </div>
        <div className="xl:col-span-5 h-[460px]">
          {renderWidget("tasks")}
        </div>

        {/* Middle Row: Resources (4 cols) + Dev Tools (4 cols) + Chat (4 cols) */}
        <div className="xl:col-span-4 h-[440px]">
          {renderWidget("resources")}
        </div>
        <div className="xl:col-span-4 h-[440px]">
          {renderWidget("dev-tools")}
        </div>
        <div className="xl:col-span-4 h-[440px]">
          {renderWidget("chat")}
        </div>

        {/* Bottom Row: Focus Station (12 cols) */}
        <div className="xl:col-span-12 h-[260px]">
          {renderWidget("focus")}
        </div>
      </div>
    </section>
  );
}
