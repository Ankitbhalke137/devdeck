"use client";

import { Search, LayoutGrid, Settings, Plus, Radio, Eye } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { workspaceStore, ALL_WIDGET_TYPES, WIDGET_META, WidgetType } from "@/lib/workspaceStore";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenVoiceModal: () => void;
}

interface Result {
  id: string;
  title: string;
  hint: string;
  kind: "widget" | "action";
  widget?: WidgetType;
}

const ACTION_RESULTS: Result[] = [
  { id: "dashboard", title: "Dashboard Grid", hint: "Scroll to top of the canvas", kind: "action" },
  { id: "add-widget", title: "Show All Widgets", hint: "Reveal every hidden widget on the grid", kind: "action" },
  { id: "settings", title: "Settings", hint: "Account, workspace & preferences", kind: "action" },
  { id: "voice", title: "Voice Huddle", hint: "Open the audio room", kind: "action" },
];

const actionIcon = (id: string) => {
  switch (id) {
    case "settings":
      return Settings;
    case "add-widget":
      return Plus;
    case "voice":
      return Radio;
    default:
      return LayoutGrid;
  }
};

export function CommandPalette({ open, onClose, onOpenSettings, onOpenVoiceModal }: CommandPaletteProps) {
  const requestFocus = workspaceStore((s) => s.requestFocus);
  const active = workspaceStore((s) => s.active);
  const toggleWidget = workspaceStore((s) => s.toggleWidget);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [wasOpen, setWasOpen] = useState(open);

  // Reset the query whenever the palette is reopened (render-phase state adjustment).
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setQuery("");
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();

  const widgetResults: Result[] = ALL_WIDGET_TYPES.map((type) => ({
    id: type,
    title: WIDGET_META[type].label,
    hint: active.includes(type) ? "Visible — click to focus" : "Hidden — click to show & focus",
    kind: "widget",
    widget: type,
  }));

  const results = [
    ...widgetResults,
    ...ACTION_RESULTS.map((r) => ({ ...r, hint: r.hint })),
  ].filter(
    (r) => !q || r.title.toLowerCase().includes(q) || r.hint.toLowerCase().includes(q)
  );

  const handleSelect = (result: Result) => {
    if (result.kind === "widget" && result.widget) {
      requestFocus(result.widget);
    } else if (result.id === "settings") {
      onOpenSettings();
    } else if (result.id === "voice") {
      onOpenVoiceModal();
    } else if (result.id === "add-widget") {
      // Reveal all hidden widgets in one shot.
      ALL_WIDGET_TYPES.forEach((t) => {
        if (!active.includes(t)) toggleWidget(t);
      });
    } else {
      requestFocus("dashboard");
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const first = results[0];
      if (first) {
        e.preventDefault();
        handleSelect(first);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[16vh] bg-black/70 backdrop-blur-sm animate-in fade-in duration-100"
    >
      <div className="bg-[#121215] w-[560px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#3f3f46] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-[#27272a]">
          <Search className="h-4 w-4 text-[#a1a1aa]" />
          <input
            ref={inputRef}
            onKeyDown={handleKeyDown}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search widgets, tasks, settings..."
            className="flex-1 bg-transparent text-sm text-[#f4f4f5] placeholder-[#71717a] py-3.5 outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#18181b] text-[#a1a1aa] rounded border border-[#3f3f46]">
            Esc
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-[#71717a]">
              No matches for “{query}”
            </div>
          ) : (
            results.map((result) => {
              const Icon = result.kind === "action" ? actionIcon(result.id) : Eye;
              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[#18181b] transition-colors group"
                >
                  <span className="w-6 h-6 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center flex-shrink-0">
                    <Icon className="h-3.5 w-3.5 text-[#a1a1aa] group-hover:text-indigo-400" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-[#f4f4f5]">
                      {result.title}
                    </span>
                    <span className="block text-[10px] text-[#71717a] truncate">
                      {result.hint}
                    </span>
                  </span>
                  {result.kind === "widget" && result.widget && (
                    <span className="text-[10px] font-mono text-[#71717a]">
                      {result.widget}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}