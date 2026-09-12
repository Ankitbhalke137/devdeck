"use client";

import { useState } from "react";
import {
  Target,
  Plus,
  Trash2,
  Check,
  Flame,
} from "lucide-react";

interface Habit {
  id: string;
  name: string;
  icon: string;
  completedDates: string[]; // YYYY-MM-DD
  createdAt: number;
}

const STORAGE_KEY = "devdeck.habits.v1";

function loadHabits(): Habit[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Habit[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [
    { id: "1", name: "Exercise", icon: "🏋️", completedDates: [], createdAt: Date.now() },
    { id: "2", name: "Read 30 min", icon: "📖", completedDates: [], createdAt: Date.now() },
    { id: "3", name: "Meditate", icon: "🧘", completedDates: [], createdAt: Date.now() },
  ];
}

function saveHabits(habits: Habit[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getDaysArray(count: number): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function getStreak(habit: Habit): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (habit.completedDates.includes(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function HabitWidget() {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("✅");
  const [showAdd, setShowAdd] = useState(false);
  const days = getDaysArray(7);

  const persist = (next: Habit[]) => {
    setHabits(next);
    saveHabits(next);
  };

  const toggleHabit = (habitId: string, date: string) => {
    const next = habits.map((h) => {
      if (h.id !== habitId) return h;
      const completed = h.completedDates.includes(date);
      return {
        ...h,
        completedDates: completed
          ? h.completedDates.filter((d) => d !== date)
          : [...h.completedDates, date],
      };
    });
    persist(next);
  };

  const addHabit = () => {
    if (!newName.trim()) return;
    const habit: Habit = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      icon: newIcon || "✅",
      completedDates: [],
      createdAt: Date.now(),
    };
    persist([...habits, habit]);
    setNewName("");
    setNewIcon("✅");
    setShowAdd(false);
  };

  const deleteHabit = (id: string) => {
    persist(habits.filter((h) => h.id !== id));
  };

  const todayDone = habits.filter((h) => h.completedDates.includes(todayStr())).length;

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-medium text-primary">Habits</span>
          <span className="text-[10px] text-muted font-mono">
            {todayDone}/{habits.length}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Add form */}
        {showAdd && (
          <div className="bg-surface-2 rounded-lg border border-custom p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="w-10 text-center bg-surface-1 border border-custom rounded px-1 py-1.5 text-sm outline-none"
                maxLength={2}
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHabit()}
                placeholder="Habit name..."
                autoFocus
                className="flex-1 bg-surface-1 border border-custom rounded px-2.5 py-1.5 text-xs text-primary placeholder:text-muted outline-none focus:border-indigo-500"
              />
              <button
                onClick={addHabit}
                disabled={!newName.trim()}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white disabled:opacity-40 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Day headers */}
        <div className="flex items-center gap-1 px-1">
          <div className="flex-1" />
          {days.map((d) => {
            const isToday = d === todayStr();
            return (
              <div
                key={d}
                className={`w-8 text-center text-[9px] font-mono ${
                  isToday ? "text-indigo-400 font-bold" : "text-muted"
                }`}
              >
                {formatDay(d)}
              </div>
            );
          })}
        </div>

        {/* Habits */}
        {habits.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-8 w-8 text-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs text-muted">No habits yet. Add one!</p>
          </div>
        ) : (
          habits.map((habit) => {
            const streak = getStreak(habit);
            return (
              <div
                key={habit.id}
                className="flex items-center gap-1 bg-surface-2 rounded-lg border border-custom px-2 py-2 group"
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm">{habit.icon}</span>
                  <span className="text-xs font-medium text-primary truncate">
                    {habit.name}
                  </span>
                  {streak > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-amber-400 font-mono">
                      <Flame className="h-2.5 w-2.5" />
                      {streak}
                    </span>
                  )}
                </div>

                {days.map((d) => {
                  const done = habit.completedDates.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggleHabit(habit.id, d)}
                      className={`w-8 h-8 rounded-md border transition-all flex items-center justify-center ${
                        done
                          ? "bg-indigo-500 border-indigo-500 text-white"
                          : "bg-surface-3/50 border-transparent hover:border-indigo-500/50"
                      }`}
                    >
                      {done && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}

                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-rose-400 transition-all ml-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
