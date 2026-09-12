"use client";

import { useEffect, useState } from "react";
import { workspaceStore } from "@/lib/workspaceStore";
import { useTelemetryStore } from "@/lib/telemetryStore";
import { getTodayFocusMinutes } from "@/lib/focusHistory";

export function StatusBar() {
  const activeCount = workspaceStore((s) => s.active.length);
  const cpuLoad = useTelemetryStore((s) => s.cpuLoad);
  const heapUsedGB = useTelemetryStore((s) => s.heapUsedGB);
  const [todayFocus, setTodayFocus] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return getTodayFocusMinutes();
  });

  useEffect(() => {
    const onStorage = () => setTodayFocus(getTodayFocusMinutes());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const hours = Math.floor(todayFocus / 60);
  const mins = todayFocus % 60;
  const focusStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <footer className="h-9 w-full bg-surface-1 border-t border-custom flex items-center justify-between px-4 text-[11px] text-muted font-mono select-none">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>DevDeck Ready</span>
        </span>
        <span className="text-border">|</span>
        <span className="text-secondary">📁 {activeCount} widgets active</span>
        <span className="text-border">|</span>
        <span className="text-secondary">⏱️ {focusStr} focus today</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-secondary">⚡ CPU {cpuLoad}%</span>
        <span className="text-border">|</span>
        <span className="text-secondary">💾 Heap {heapUsedGB}GB</span>
        <span className="text-border">|</span>
        <span className="text-emerald-400">📡 WebSocket Online</span>
      </div>
    </footer>
  );
}