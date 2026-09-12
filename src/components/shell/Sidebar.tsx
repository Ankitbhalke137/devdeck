"use client";

import {
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Settings,
  X,
  Brain,
  List,
  MessageCircle,
  Folder,
  Timer,
  Music,
  Eye,
  EyeOff,
  LayoutGrid,
  StickyNote,
  BarChart3,
  Target,
  Calendar,
  GripVertical,
  Activity,
  Tv,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  workspaceStore,
  ALL_WIDGET_TYPES,
  WIDGET_META,
  WidgetType,
} from "@/lib/workspaceStore";

const DEFAULT_NAV_ORDER: (WidgetType | "dashboard")[] = [
  "dashboard", "ai", "tasks", "telemetry", "resources", "chat", "music", "video",
  "notes", "sharedNotes", "stats", "habits", "calendar", "focus",
];

const NAV_ICONS: Record<WidgetType | "dashboard", typeof LayoutGrid> = {
  dashboard: LayoutGrid,
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

const widgetIcon: Record<WidgetType, typeof LayoutGrid> = {
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

function loadNavOrder(): (WidgetType | "dashboard")[] {
  try {
    const saved = localStorage.getItem("devdeck.navOrder.v1");
    if (saved) {
      const parsed = JSON.parse(saved) as (WidgetType | "dashboard")[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_NAV_ORDER;
}

function saveNavOrder(order: (WidgetType | "dashboard")[]) {
  localStorage.setItem("devdeck.navOrder.v1", JSON.stringify(order));
}

interface SortableNavProps {
  id: string;
  label: string;
  icon: typeof LayoutGrid;
  isActive: boolean;
  isVisible: boolean;
  isWidget: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

function SortableNav({ id, label, icon: Icon, isActive, isVisible, isWidget, isExpanded, onClick }: SortableNavProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className="relative">
      <div className={`group flex items-center rounded-md text-xs font-medium transition-colors ${
        isActive
          ? "text-primary bg-surface-2 border border-custom"
          : "text-secondary hover:text-primary hover:bg-surface-2 border border-transparent"
      } ${isExpanded ? "w-full" : "w-full justify-center"}`}>
        <button
          onClick={onClick}
          className="flex items-center gap-2.5 px-2 py-2 flex-1 min-w-0"
          title={isExpanded ? undefined : label}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          {isExpanded && <span className="truncate">{label}</span>}
          {isExpanded && isWidget && (
            <span
              className={`ml-auto h-1.5 w-1.5 rounded-full ${
                isVisible ? "bg-emerald-500" : "bg-[#3f3f46]"
              }`}
              title={isVisible ? "Visible on canvas" : "Hidden from canvas"}
            />
          )}
        </button>
        {isExpanded && (
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 text-[#52525b] hover:text-[#a1a1aa] cursor-grab active:cursor-grabbing flex-shrink-0"
            title="Drag to reorder"
          >
            <GripVertical className="h-3 w-3" />
          </button>
        )}
      </div>
    </li>
  );
}

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
  const [navOrder, setNavOrder] = useState<(WidgetType | "dashboard")[]>(() => loadNavOrder());
  const popoverRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = navOrder.indexOf(active.id as WidgetType | "dashboard");
    const newIndex = navOrder.indexOf(over.id as WidgetType | "dashboard");
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(navOrder, oldIndex, newIndex);
    setNavOrder(next);
    saveNavOrder(next);
  };

  return (
    <aside
      className="h-full min-h-0 bg-surface-1 border-r border-custom flex flex-col shadow-lg relative transition-[width] duration-150 overflow-visible"
      style={{ width: isExpanded ? "168px" : "48px" }}
    >
      {/* Header / collapse toggle */}
      <div className="h-14 border-b border-custom flex items-center px-2 flex-shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 p-1.5 rounded-md text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
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

      {/* Navigation (sortable) */}
      <nav className="flex-1 overflow-y-auto overflow-x-visible px-2 py-2 space-y-0.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={navOrder} strategy={verticalListSortingStrategy}>
            <ul className="space-y-0.5">
              {navOrder.map((key) => {
                const Icon = NAV_ICONS[key] || LayoutGrid;
                const isWidget = key !== "dashboard";
                const isVisible = isWidget && active.includes(key as WidgetType);
                return (
                  <SortableNav
                    key={key}
                    id={key}
                    label={WIDGET_META[key as WidgetType]?.label || key}
                    icon={Icon}
                    isActive={isVisible}
                    isVisible={!!isVisible}
                    isWidget={isWidget}
                    isExpanded={isExpanded}
                    onClick={() => handleNav(key)}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-custom mt-auto flex flex-col gap-1 shrink-0 relative">
        <button
          onClick={() => setAddOpen((prev) => !prev)}
          className="flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors justify-center shadow-sm"
          aria-label="Add widget"
        >
          <Plus className="h-4 w-4" />
          {isExpanded && <span>Add Widget</span>}
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium text-secondary hover:text-primary hover:bg-surface-2 transition-colors justify-center"
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4" />
          {isExpanded && <span>Settings</span>}
        </button>

        {/* Add / remove widget popover */}
        {addOpen && (
          <div
            ref={popoverRef}
            className="absolute bottom-full left-2 mb-2 w-60 bg-surface-1 border border-custom rounded-xl shadow-2xl p-2 z-50 animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                Widgets on canvas
              </span>
              <button
                onClick={() => setAddOpen(false)}
                className="p-0.5 text-muted hover:text-primary"
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
                        ? "text-primary hover:bg-surface-2"
                        : "text-muted hover:bg-surface-2 hover:text-secondary"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
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
            <p className="px-2 pt-1.5 text-[10px] text-muted leading-snug">
              Show or hide widgets. Drag the grip handle in the sidebar to reorder.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
