"use client";

import { create } from "zustand";

export type WidgetType = "ai" | "tasks" | "resources" | "dev-tools" | "chat" | "focus";

export const ALL_WIDGET_TYPES: WidgetType[] = ["ai", "tasks", "resources", "dev-tools", "chat", "focus"];

export const WIDGET_META: Record<WidgetType, { label: string; description: string }> = {
  ai: { label: "AI Assistant", description: "Multi-model AI chat" },
  tasks: { label: "Task Engine", description: "Kanban task board" },
  resources: { label: "Resource Hub", description: "Link health monitor" },
  "dev-tools": { label: "Dev Tools", description: "JSON, JWT, Regex, Base64" },
  chat: { label: "Team Chat", description: "Live team messaging" },
  focus: { label: "Focus Station", description: "Pomodoro + music" },
};

export interface WidgetLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

// Mirrors the original visual arrangement: AI + tasks on top, tools in the middle, focus full width.
export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { i: "ai", x: 0, y: 0, w: 7, h: 10, minW: 4, minH: 6 },
  { i: "tasks", x: 7, y: 0, w: 5, h: 10, minW: 4, minH: 6 },
  { i: "resources", x: 0, y: 10, w: 4, h: 9, minW: 3, minH: 5 },
  { i: "dev-tools", x: 4, y: 10, w: 4, h: 9, minW: 3, minH: 5 },
  { i: "chat", x: 8, y: 10, w: 4, h: 9, minW: 3, minH: 5 },
  { i: "focus", x: 0, y: 19, w: 12, h: 6, minW: 6, minH: 4 },
];

export const DEFAULT_ACTIVE: WidgetType[] = [...ALL_WIDGET_TYPES];

const PERSIST_KEY = "devdeck.workspace.v1";

interface PersistedState {
  active: WidgetType[];
  layout: WidgetLayoutItem[];
}

function readPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.active) || !Array.isArray(parsed.layout)) return null;
    return {
      active: parsed.active.filter((t: string) => ALL_WIDGET_TYPES.includes(t as WidgetType)),
      layout: parsed.layout,
    };
  } catch {
    return null;
  }
}

function writePersisted(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — workspace still works for the session
  }
}

function defaultEntryFor(type: WidgetType): WidgetLayoutItem {
  const entry = DEFAULT_LAYOUT.find((l) => l.i === type);
  if (entry) return { ...entry };
  return { i: type, x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 4 };
}

function lowestY(layout: WidgetLayoutItem[]) {
  return layout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
}

// Hydrate synchronously at module init so the very first client render already
// reflects the saved workspace (no flash, no overwrite race).
const persisted = readPersisted();
const initialActive: WidgetType[] = persisted?.active?.length ? persisted.active : DEFAULT_ACTIVE;
const initialLayout: WidgetLayoutItem[] = persisted?.layout?.length ? persisted.layout : DEFAULT_LAYOUT;

interface WorkspaceState {
  active: WidgetType[];
  layout: WidgetLayoutItem[];
  focusRequest: { type: WidgetType | "dashboard" | null; nonce: number };
  requestFocus: (type: WidgetType | "dashboard") => void;
  addWidget: (type: WidgetType) => void;
  removeWidget: (type: WidgetType) => void;
  toggleWidget: (type: WidgetType) => void;
  setLayout: (layout: readonly WidgetLayoutItem[]) => void;
  resetWorkspace: () => void;
}

export const workspaceStore = create<WorkspaceState>((set, get) => ({
  active: initialActive,
  layout: initialLayout,
  focusRequest: { type: null, nonce: 0 },

  requestFocus: (type) =>
    set((state) => ({ focusRequest: { type, nonce: state.focusRequest.nonce + 1 } })),

  addWidget: (type) => {
    const state = get();
    if (state.active.includes(type)) return;
    const entry = state.layout.find((l) => l.i === type) ?? defaultEntryFor(type);
    const layout = state.layout.some((l) => l.i === type)
      ? state.layout
      : [...state.layout, { ...entry, y: Math.max(entry.y, lowestY(state.layout)) }];
    const active = [...state.active, type].sort(
      (a, b) => ALL_WIDGET_TYPES.indexOf(a) - ALL_WIDGET_TYPES.indexOf(b)
    );
    writePersisted({ active, layout });
    set({ active, layout });
  },

  removeWidget: (type) => {
    const state = get();
    const active = state.active.filter((t) => t !== type);
    const layout = state.layout.filter((l) => l.i !== type);
    writePersisted({ active, layout });
    set({ active, layout });
  },

  toggleWidget: (type) => {
    const state = get();
    if (state.active.includes(type)) {
      state.removeWidget(type);
    } else {
      state.addWidget(type);
    }
  },

  setLayout: (layout) => {
    const state = get();
    const next = [...layout];
    writePersisted({ active: state.active, layout: next });
    set({ layout: next });
  },

  resetWorkspace: () => {
    writePersisted({ active: DEFAULT_ACTIVE, layout: DEFAULT_LAYOUT });
    set({ active: DEFAULT_ACTIVE, layout: DEFAULT_LAYOUT });
  },
}));