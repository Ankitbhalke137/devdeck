"use client";

import { useState } from "react";

type WidgetType = "ai" | "tasks" | "resources" | "dev-tools" | "chat" | "focus";

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
    <section
      className="relative min-h-[calc(100vh_._32rem_._12rem)] bg-surface-1 border-t border-custom"
    >
      <div className="absolute inset-0 grid grid-cols-[repeat__{COLUMNS}_1fr] gap-4" style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}>
        {layout.map((item) => {
          const config = widgetDefaults[item.i as WidgetType];
          if (!config) return null;
          const xPercent = item.x * BASE_WIDTH;
          const wPercent = item.w * BASE_WIDTH;
          return (
            <div
              key={item.i}
              data-widget-type={item.i}
              className="rounded-custom border border-custom p-4 bg-surface-2 shadow-sm"
              style={{
                gridColumn: `span ${item.w}`,
                gridRow: `span ${item.h}`,
                width: `${item.w * BASE_WIDTH}%`,
                left: `${item.x * BASE_WIDTH}%`,
              }}
            >
              <div className="h-6 w-6 text-secondary mb-3 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-secondary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8" cy="8" r="2" />
                  <path d="M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2" />
                  <path d="M17 3h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1M9 3v12" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-primary mb-2">{item.i}</h3>
              <p className="text-xs text-muted h-8 overflow-hidden whitespace-nowrap">Widget {item.i}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}