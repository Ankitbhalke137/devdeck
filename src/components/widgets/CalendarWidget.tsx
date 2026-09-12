"use client";

import { useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  color: string;
}

const STORAGE_KEY = "devdeck.calendar.v1";
const COLORS = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-violet-500"];

function loadEvents(): CalendarEvent[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as CalendarEvent[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveEvents(events: CalendarEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const persist = (next: CalendarEvent[]) => {
    setEvents(next);
    saveEvents(next);
  };

  const addEvent = () => {
    if (!newTitle.trim()) return;
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      date: selectedDate,
      time: newTime || undefined,
      color: newColor,
    };
    persist([...events, event]);
    setNewTitle("");
    setNewTime("");
    setShowAdd(false);
  };

  const deleteEvent = (id: string) => {
    persist(events.filter((e) => e.id !== id));
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedEvents = events.filter((e) => e.date === selectedDate).sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-sky-500" />
          <span className="text-xs font-medium text-primary">Calendar</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-medium text-primary w-24 text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Calendar Grid */}
        <div>
          {/* Day name headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[9px] font-mono text-muted py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const dateStr = formatDate(year, month, day);
              const isToday = dateStr === todayStr();
              const isSelected = dateStr === selectedDate;
              const hasEvents = events.some((e) => e.date === dateStr);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative h-8 rounded-md text-[11px] font-medium transition-all flex items-center justify-center ${
                    isSelected
                      ? "bg-indigo-500 text-white"
                      : isToday
                      ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                      : "text-primary hover:bg-surface-3"
                  }`}
                >
                  {day}
                  {hasEvents && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Events */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted font-medium">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </span>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="p-1 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {showAdd && (
            <div className="mb-2 space-y-2 bg-surface-3/50 rounded-lg p-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
                placeholder="Event title..."
                autoFocus
                className="w-full bg-surface-1 border border-custom rounded px-2 py-1.5 text-xs text-primary placeholder:text-muted outline-none focus:border-indigo-500"
              />
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="bg-surface-1 border border-custom rounded px-2 py-1.5 text-xs text-primary outline-none focus:border-indigo-500"
                />
                <div className="flex gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`w-5 h-5 rounded-full ${c} ${
                        newColor === c ? "ring-2 ring-offset-1 ring-indigo-500" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={addEvent}
                disabled={!newTitle.trim()}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded text-white text-xs font-medium transition-colors"
              >
                Add Event
              </button>
            </div>
          )}

          {selectedEvents.length === 0 ? (
            <p className="text-[10px] text-muted text-center py-2">No events</p>
          ) : (
            <div className="space-y-1.5">
              {selectedEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-3/50 group"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${event.color} shrink-0`} />
                  <span className="text-[11px] text-primary flex-1 truncate">{event.title}</span>
                  {event.time && (
                    <span className="text-[10px] text-muted font-mono flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {event.time}
                    </span>
                  )}
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
