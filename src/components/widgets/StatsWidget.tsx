"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Flame,
  Clock,
  Target,
  TrendingUp,
  Calendar,
} from "lucide-react";
import {
  getTodayFocusMinutes,
  getThisWeekFocusMinutes,
  getDailyFocusMinutes,
  getStreak,
  getFocusHistory,
} from "@/lib/focusHistory";

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function StatsWidget() {
  const [, setTick] = useState(0);

  // Re-render periodically and on storage updates to pick up new sessions
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "devdeck_focus_history") {
        setTick((t) => t + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const todayMins = getTodayFocusMinutes();
  const weekMins = getThisWeekFocusMinutes();
  const streak = getStreak();
  const daily = getDailyFocusMinutes(7);
  const history = getFocusHistory().filter((s) => s.mode === "focus");
  const totalSessions = history.length;
  const maxDaily = Math.max(...daily.map((d) => d.minutes), 1);

  // Weekly goal: 10 hours (600 min)
  const weeklyGoal = 600;
  const weeklyProgress = Math.min(100, Math.round((weekMins / weeklyGoal) * 100));

  // Recent 5 sessions
  const recentSessions = history.slice(0, 5);

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      {/* Header */}
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-500" />
          <span className="text-xs font-medium text-primary">Focus Stats</span>
        </div>
        <span className="text-[10px] text-muted font-mono">{totalSessions} sessions</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-2 rounded-lg border border-custom p-2.5 text-center">
            <Flame className="h-4 w-4 text-amber-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-primary">{streak}</div>
            <div className="text-[10px] text-muted">Day Streak</div>
          </div>
          <div className="bg-surface-2 rounded-lg border border-custom p-2.5 text-center">
            <Clock className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-primary">{formatMinutes(todayMins)}</div>
            <div className="text-[10px] text-muted">Today</div>
          </div>
          <div className="bg-surface-2 rounded-lg border border-custom p-2.5 text-center">
            <Target className="h-4 w-4 text-indigo-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-primary">{formatMinutes(weekMins)}</div>
            <div className="text-[10px] text-muted">This Week</div>
          </div>
        </div>

        {/* Weekly Goal */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Weekly Goal
            </span>
            <span className="text-[10px] font-mono text-muted">
              {formatMinutes(weekMins)} / {formatMinutes(weeklyGoal)}
            </span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
          <div className="text-[10px] text-muted mt-1.5 text-right">{weeklyProgress}% complete</div>
        </div>

        {/* Daily Bar Chart (last 7 days) */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-muted flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Last 7 Days
            </span>
          </div>
          <div className="flex items-end gap-1.5 h-24">
            {daily.map((day, i) => {
              const pct = maxDaily > 0 ? (day.minutes / maxDaily) * 100 : 0;
              const isToday = i === daily.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: "64px" }}>
                    <div
                      className={`w-full max-w-[24px] rounded-t transition-all duration-300 ${
                        isToday
                          ? "bg-gradient-to-t from-violet-500 to-indigo-400"
                          : day.minutes > 0
                          ? "bg-violet-500/40"
                          : "bg-surface-3"
                      }`}
                      style={{ height: `${Math.max(pct, day.minutes > 0 ? 8 : 2)}%` }}
                      title={`${day.minutes}m`}
                    />
                  </div>
                  <span className={`text-[9px] font-mono ${isToday ? "text-violet-400" : "text-muted"}`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          <span className="text-[11px] text-muted flex items-center gap-1 mb-2">
            <Clock className="h-3 w-3" /> Recent Sessions
          </span>
          {recentSessions.length === 0 ? (
            <p className="text-[10px] text-muted text-center py-3">No sessions recorded yet</p>
          ) : (
            <div className="space-y-1.5">
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded bg-surface-3/50"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      s.mode === "focus" ? "bg-emerald-400" : s.mode === "short_break" ? "bg-sky-400" : "bg-violet-400"
                    }`} />
                    <span className="text-[10px] text-primary capitalize">
                      {s.mode.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted">{s.durationMinutes}m</span>
                    <span className="text-[10px] text-muted">
                      {new Date(s.completedAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
