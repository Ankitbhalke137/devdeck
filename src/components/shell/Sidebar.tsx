"use client";

import {
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Settings,
  X,
  Home,
  Brain,
  List,
  MessageCircle,
  Headphones,
  Folder,
  Shield,
  Eye,
  EyeOff,
  LayoutGrid,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  workspaceStore,
  ALL_WIDGET_TYPES,
  WIDGET_META,
  WidgetType,
} from "@/lib/workspaceStore";

interface NavItem {
  key: WidgetType | "dashboard";
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard Grid", icon: LayoutGrid },
  { key: "tasks", label: "Task Engine", icon: List },
  { key: "ai", label: "AI Assistant", icon: Brain },
  { key: "resources", label: "Resource Hub", icon: Folder },
  { key: "dev-tools", label: "Dev Tools", icon: Shield },
  { key: "chat", label: "Chat Channels", icon: MessageCircle },
  { key: "focus", label: "Focus Station", icon: Headphones },
];

const widgetIcon: Record<WidgetType, typeof Home> = {
  ai: Brain,
  tasks: List,
  resources: Folder,
  "dev-tools": Shield,
  chat: MessageCircle,
  focus: Headphones,
};

export interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ isExpanded, onToggle, onOpenSettings }: SidebarProps) {
  const active = workspaceStore((s) => s.active);
  const requestFocus = workspaceStore((s) => s.requestFocus);
  const toggleWidget = workspaceStore((s) => s.toggleWidget);
  const [addOpen, setAddOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setAddOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [addOpen]);

  const handleNav = (key: WidgetType | "dashboard") => {
    setAddOpen(false);
    requestFocus(key);
  };

  const rowClass = (activeRow: boolean) =>
    `group flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
      activeRow
        ? "text-[#f4f4f5] bg-[#18181b] border border-[#27272a]"
        : "text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] border border-transparent"
    } ${isExpanded ? "w-full" : "w-full justify-center"}`;

  return (
    <aside
      className="h-full min-h-0 bg-surface-1 border-r border-custom flex flex-col shadow-lg relative transition-[width] duration-150 overflow-visible"
      style={{ width: isExpanded ? "168px" : "48px" }}
    >
      {/* Header / collapse toggle */}
      <div className="h-14 border-b border-custom flex items-center px-2 flex-shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 p-1.5 rounded-md text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          title={isExpanded ? "Collapse sidebar (⌘B)" : "Expand sidebar (⌘B)"}
        >
          {isExpanded ? (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span className="text-[11px] font-medium">Collapse</span>
            </>
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-visible px-2 py-2 space-y-0.5">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isWidget = item.key !== "dashboard";
            const isVisible = isWidget && active.includes(item.key as WidgetType);
            return (
              <li key={item.key} className="relative">
                <button
                  onClick={() => handleNav(item.key)}
                  className={rowClass(isVisible)}
                  title={isExpanded ? undefined : item.label}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {isExpanded && <span className="truncate">{item.label}</span>}
                  {isExpanded && isWidget && (
                    <span
                      className={`ml-auto h-1.5 w-1.5 rounded-full ${
                        isVisible ? "bg-emerald-500" : "bg-[#3f3f46]"
                      }`}
                      title={isVisible ? "Visible on canvas" : "Hidden from canvas"}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-custom mt-auto flex flex-col gap-1 flex-shrink-0 relative">
        <button
          onClick={() => setAddOpen((prev) => !prev)}
          className="flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium text-[#f4f4f5] bg-indigo-600 hover:bg-indigo-700 transition-colors justify-center"
          aria-label="Add widget"
        >
          <Plus className="h-4 w-4" />
          {isExpanded && <span>Add Widget</span>}
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors justify-center"
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4" />
          {isExpanded && <span>Settings</span>}
        </button>

        {/* Add / remove widget popover */}
        {addOpen && (
          <div
            ref={popoverRef}
            className="absolute bottom-full left-2 mb-2 w-60 bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
                Widgets on canvas
              </span>
              <button
                onClick={() => setAddOpen(false)}
                className="p-0.5 text-[#71717a] hover:text-[#f4f4f5]"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {ALL_WIDGET_TYPES.map((type) => {
                const Icon = widgetIcon[type];
                const visible = active.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleWidget(type)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      visible
                        ? "text-[#f4f4f5] hover:bg-[#18181b]"
                        : "text-[#71717a] hover:bg-[#18181b] hover:text-[#d4d4d8]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{WIDGET_META[type].label}</span>
                    <span className="ml-auto">
                      {visible ? (
                        <Eye className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="px-2 pt-1.5 text-[10px] text-[#71717a] leading-snug">
              Show or hide widgets on the grid. Drag by any widget header to rearrange.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}