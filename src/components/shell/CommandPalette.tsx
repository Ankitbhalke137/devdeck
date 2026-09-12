"use client";

import {
  Search,
  LayoutGrid,
  Settings,
  Radio,
  Eye,
  EyeOff,
  RotateCcw,
  Music,
  Timer,
  List,
  Brain,
  Folder,
  MessageCircle,
  StickyNote,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Target,
  Calendar,
  Activity,
  Tv,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
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
  category: string;
  icon?: typeof Search;
}

const WIDGET_ICONS: Record<WidgetType, typeof Search> = {
  ai: Brain,
  tasks: List,
  telemetry: Activity,
  resources: Folder,
  chat: MessageCircle,
  music: Music,
  video: Tv,
  focus: Timer,
  notes: StickyNote,
  stats: BarChart3,
  habits: Target,
  calendar: Calendar,
  sharedNotes: MessageCircle,
};

const ACTION_RESULTS: Result[] = [
  { id: "dashboard", title: "Go to Dashboard", hint: "Scroll to top of the canvas", kind: "action", category: "Navigate", icon: LayoutGrid },
  { id: "add-widget", title: "Show All Widgets", hint: "Reveal every hidden widget on the grid", kind: "action", category: "Workspace", icon: Eye },
  { id: "hide-widget", title: "Hide All Widgets", hint: "Collapse all widgets from the grid", kind: "action", category: "Workspace", icon: EyeOff },
  { id: "settings", title: "Open Settings", hint: "Account, workspace & preferences", kind: "action", category: "Navigate", icon: Settings },
  { id: "voice", title: "Voice Huddle", hint: "Open the audio room", kind: "action", category: "Collaborate", icon: Radio },
  { id: "reset-workspace", title: "Reset Workspace", hint: "Restore default widget layout", kind: "action", category: "Workspace", icon: RotateCcw },
];

export function CommandPalette({ open, onClose, onOpenSettings, onOpenVoiceModal }: CommandPaletteProps) {
  const requestFocus = workspaceStore((s) => s.requestFocus);
  const active = workspaceStore((s) => s.active);
  const toggleWidget = workspaceStore((s) => s.toggleWidget);
  const resetWorkspace = workspaceStore((s) => s.resetWorkspace);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [wasOpen, setWasOpen] = useState(open);

  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
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

  const widgetResults: Result[] = useMemo(() => {
    return ALL_WIDGET_TYPES.map((type) => ({
      id: type,
      title: WIDGET_META[type].label,
      hint: active.includes(type) ? "Visible — click to focus" : "Hidden — click to show & focus",
      kind: "widget" as const,
      widget: type,
      category: "Widgets",
      icon: WIDGET_ICONS[type],
    }));
  }, [active]);

  const allResults = useMemo(() => {
    const items = [...widgetResults, ...ACTION_RESULTS];
    if (!q) return items;
    return items.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.hint.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [q, widgetResults]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>();
    for (const r of allResults) {
      const arr = map.get(r.category) || [];
      arr.push(r);
      map.set(r.category, arr);
    }
    return map;
  }, [allResults]);

  // Flat list for keyboard navigation
  const flatResults = useMemo(() => allResults, [allResults]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = (result: Result) => {
    if (result.kind === "widget" && result.widget) {
      requestFocus(result.widget);
    } else if (result.id === "settings") {
      onOpenSettings();
    } else if (result.id === "voice") {
      onOpenVoiceModal();
    } else if (result.id === "add-widget") {
      ALL_WIDGET_TYPES.forEach((t) => {
        if (!active.includes(t)) toggleWidget(t);
      });
    } else if (result.id === "hide-widget") {
      ALL_WIDGET_TYPES.forEach((t) => {
        if (active.includes(t)) toggleWidget(t);
      });
    } else if (result.id === "reset-workspace") {
      resetWorkspace();
    } else {
      requestFocus("dashboard");
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = flatResults[selectedIndex];
      if (selected) handleSelect(selected);
    }
  };

  if (!open) return null;

  let flatIndex = -1;

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
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search widgets, actions, settings..."
            className="flex-1 bg-transparent text-sm text-[#f4f4f5] placeholder-[#71717a] py-3.5 outline-none"
          />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#18181b] text-[#a1a1aa] rounded border border-[#3f3f46]">
              <ChevronUp className="inline h-2.5 w-2.5" />
            </kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#18181b] text-[#a1a1aa] rounded border border-[#3f3f46]">
              <ChevronDown className="inline h-2.5 w-2.5" />
            </kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#18181b] text-[#a1a1aa] rounded border border-[#3f3f46] ml-1">
              Esc
            </kbd>
          </div>
        </div>

        <div ref={listRef} className="max-h-96 overflow-y-auto p-1.5">
          {flatResults.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-[#71717a]">
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#52525b]">
                  {category}
                </div>
                {items.map((result) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isSelected = idx === selectedIndex;
                  const Icon = result.icon || (result.kind === "widget" ? Eye : Search);
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group ${
                        isSelected ? "bg-[#18181b] text-[#f4f4f5]" : "text-[#a1a1aa] hover:bg-[#18181b]"
                      }`}
                    >
                      <span className="w-6 h-6 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center flex-shrink-0">
                        <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-indigo-400" : "text-[#a1a1aa] group-hover:text-indigo-400"}`} />
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
                        <span className={`text-[10px] font-mono ${active.includes(result.widget) ? "text-emerald-500" : "text-[#52525b]"}`}>
                          {active.includes(result.widget) ? "on" : "off"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#27272a] flex items-center justify-between text-[10px] text-[#52525b]">
          <span>{flatResults.length} results</span>
          <span>
            <kbd className="px-1 py-0.5 font-mono bg-[#18181b] rounded border border-[#27272a]">Enter</kbd> to select
          </span>
        </div>
      </div>
    </div>
  );
}
