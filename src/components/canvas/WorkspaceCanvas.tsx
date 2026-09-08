"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactGridLayout from "react-grid-layout/legacy";
import type { LayoutItem } from "react-grid-layout/legacy";
import { useContainerWidth } from "react-grid-layout";
import { AIAssistantWidget } from "@/components/widgets/AIAssistantWidget";
import { TaskboardWidget } from "@/components/widgets/TaskboardWidget";
import { ResourceHubWidget } from "@/components/widgets/ResourceHubWidget";
import { DevToolsWidget } from "@/components/widgets/DevToolsWidget";
import { ChatWidget } from "@/components/widgets/ChatWidget";
import { FocusStationWidget } from "@/components/widgets/FocusStationWidget";
import { workspaceStore, ALL_WIDGET_TYPES, WidgetType, WidgetLayoutItem } from "@/lib/workspaceStore";

interface WorkspaceCanvasProps {
  onOpenVoiceModal?: () => void;
}

function widgetFor(type: WidgetType, onOpenVoiceModal?: () => void) {
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
}

export function WorkspaceCanvas({ onOpenVoiceModal }: WorkspaceCanvasProps) {
  const active = workspaceStore((s) => s.active);
  const layout = workspaceStore((s) => s.layout);
  const focusRequest = workspaceStore((s) => s.focusRequest);
  const addWidget = workspaceStore((s) => s.addWidget);
  const setLayout = workspaceStore((s) => s.setLayout);
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1280 });

  const [flashType, setFlashType] = useState<WidgetType | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigate from the sidebar / command palette: reveal if hidden, scroll to it, flash it.
  useEffect(() => {
    const type = focusRequest.type;
    if (!type || focusRequest.nonce === 0) return;

    const revealAndScroll = () => {
      if (type === "dashboard") {
        document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const alreadyVisible = active.includes(type);
      if (!alreadyVisible) {
        addWidget(type);
      }
      // Wait a tick so a freshly added widget has been mounted.
      setTimeout(() => {
        const el = document.getElementById(`widget-${type}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        setFlashType(type);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlashType(null), 1600);
      }, alreadyVisible ? 0 : 120);
    };
    revealAndScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest.nonce]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const handleLayoutChange = useCallback(
    (next: readonly LayoutItem[]) => {
      const mapped: WidgetLayoutItem[] = next.map((l) => ({
        i: l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
        ...(l.minW !== undefined ? { minW: l.minW } : {}),
        ...(l.minH !== undefined ? { minH: l.minH } : {}),
      }));
      setLayout(mapped);
    },
    [setLayout]
  );

  if (!mounted) {
    // Avoid layout flashes while the container width is measured.
    return (
      <section className="p-4 bg-[#09090b] min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-[1920px] mx-auto h-[70vh] rounded-lg border border-[#18181b] animate-pulse" />
      </section>
    );
  }

  return (
    <section className="p-4 bg-[#09090b] min-h-[calc(100vh-3.5rem)]">
      <div ref={containerRef} className="max-w-[1920px] mx-auto">
        <ReactGridLayout
          width={width}
          layout={layout.filter((l) => active.includes(l.i as WidgetType))}
          cols={12}
          rowHeight={44}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          draggableHandle=".widget-header"
          // No auto-compaction: widgets must stay exactly where the user drops them.
          compactType={null}
          preventCollision={false}
          resizeHandles={["se"]}
          onLayoutChange={handleLayoutChange}
        >
          {ALL_WIDGET_TYPES.filter((t) => active.includes(t)).map((type) => (
            <div key={type} id={`widget-${type}`} className="h-full w-full">
              <div
                className={`h-full w-full transition-shadow duration-300 rounded-xl ${
                  flashType === type
                    ? "outline outline-2 outline-offset-2 outline-indigo-500/80 shadow-lg shadow-indigo-500/20"
                    : ""
                }`}
              >
                {widgetFor(type, onOpenVoiceModal)}
              </div>
            </div>
          ))}
        </ReactGridLayout>
      </div>
    </section>
  );
}