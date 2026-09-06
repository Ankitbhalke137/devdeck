"use client";

import { useState } from "react";
import { AIAssistantWidget } from "@/components/widgets/AIAssistantWidget";
import { TaskboardWidget } from "@/components/widgets/TaskboardWidget";
import { ResourceHubWidget } from "@/components/widgets/ResourceHubWidget";
import { DevToolsWidget } from "@/components/widgets/DevToolsWidget";
import { ChatWidget } from "@/components/widgets/ChatWidget";
import { FocusStationWidget } from "@/components/widgets/FocusStationWidget";

type WidgetType = "ai" | "tasks" | "resources" | "dev-tools" | "chat" | "focus";

const widgetMap: Record<WidgetType, React.ComponentType> = {
  ai: AIAssistantWidget,
  tasks: TaskboardWidget,
  resources: ResourceHubWidget,
  "dev-tools": DevToolsWidget,
  chat: ChatWidget,
  focus: FocusStationWidget,
};

const widgetDefaults: Record<WidgetType, { i: string; w: number; h: number; minW?: number; minH?: number; maxW?: number; maxH?: number; }> = {
  ai: { i: "ai", w: 6, h: 8, minW: 4, minH: 4, maxW: 12, maxH: 20 },
  tasks: { i: "tasks", w: 4, h: 10, minW: 3, minH: 3, maxW: 8, maxH: 25 },
  resources: { i: "resources", w: 4, h: 6, minW: 3, minH: 3, maxW: 8, maxH: 15 },
  "dev-tools": { i: "dev-tools", w: 3, h: 5, minW: 2, minH: 2, maxW: 6, maxH: 12 },
  chat: { i: "chat", w: 5, h: 6, minW: 3, minH: 3, maxW: 10, maxH: 15 },
  focus: { i: "focus", w: 5, h: 5, minW: 3, minH: 3, maxW: 8, maxH: 12 },
};

const COLUMNS = 12;
const BASE_WIDTH = Math.floor(100 / COLUMNS);

export function WorkspaceCanvas() {
  const [layout, setLayout] = useState<{ i: string; x: number; y: number; w: number; h: number }[]>(() => {
    return [
      { i: "ai", x: 0, y: 0, w: 6, h: 8 },
      { i: "tasks", x: 6, y: 0, w: 4, h: 10 },
      { i: "resources", x: 0, y: 8, w: 4, h: 6 },
      { i: "dev-tools", x: 4, y: 8, w: 3, h: 5 },
      { i: "chat", x: 7, y: 8, w: 5, h: 6 },
      { i: "focus", x: 0, y: 14, w: 5, h: 5 },
    ];
  });

  const handleItemMove = (id: string, e: { x: number; y: number; w: number; h: number }) => {
    setLayout((prev) => prev.map((item) => (item.i === id ? { ...item, ...e } : item)));
  };

  const handleItemResize = (id: string, e: { x: number; y: number; w: number; h: number }) => {
    setLayout((prev) => prev.map((item) => (item.i === id ? { ...item, w: e.w, h: e.h } : item)));
  };

  return (
    <section className="relative min-h-[calc(100vh_._32rem_._12rem)] bg-surface-1 border-t border-custom">
      <div
        className="absolute inset-0 grid gap-4"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}
      >
        {layout.map((item) => {
          const config = widgetDefaults[item.i as WidgetType];
          if (!config) return null;

          const WidgetComponent = widgetMap[item.i as WidgetType];
          const xPercent = item.x * BASE_WIDTH;
          const wPercent = item.w * BASE_WIDTH;

          return (
            <div
              key={item.i}
              data-widget-type={item.i}
              className="rounded-custom border border-custom p-3 bg-surface-2 shadow-sm"
              style={{
                gridColumn: `span ${item.w}`,
                gridRow: `span ${item.h}`,
                width: `${item.w * BASE_WIDTH}%`,
                left: `${item.x * BASE_WIDTH}%`,
              }}
            >
              <WidgetComponent />
            </div>
          );
        })}
      </div>
    </section>
  );
}
