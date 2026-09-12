"use client";

const HISTORY_KEY = "devdeck.timer.history.v1";
const GOALS_KEY = "devdeck.timer.goals.v1";

export interface FocusSession {
  id: string;
  startedAt: number;
  completedAt: number;
  durationMinutes: number;
  mode: "focus" | "short_break" | "long_break";
}

export interface FocusGoals {
  dailyMinutes: number;
  weeklyMinutes: number;
  notifyOnComplete: boolean;
}

function loadHistory(): FocusSession[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as FocusSession[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveHistory(sessions: FocusSession[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
}

export function loadGoals(): FocusGoals {
  try {
    const saved = localStorage.getItem(GOALS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as FocusGoals;
      if (parsed.dailyMinutes > 0) return parsed;
    }
  } catch {}
  return { dailyMinutes: 120, weeklyMinutes: 600, notifyOnComplete: true };
}

export function saveGoals(goals: FocusGoals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

let _history: FocusSession[] | null = null;

function getHistory(): FocusSession[] {
  if (_history === null) _history = loadHistory();
  return _history;
}

function persistHistory(sessions: FocusSession[]) {
  _history = sessions;
  saveHistory(sessions);
}

export function recordFocusSession(mode: FocusSession["mode"], durationMinutes: number) {
  const now = Date.now();
  const session: FocusSession = {
    id: crypto.randomUUID(),
    startedAt: now - durationMinutes * 60_000,
    completedAt: now,
    durationMinutes,
    mode,
  };
  const history = getHistory();
  persistHistory([session, ...history]);
  return session;
}

export function getFocusHistory(): FocusSession[] {
  return getHistory();
}

export function getTodayFocusMinutes(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();
  return getHistory()
    .filter((s) => s.mode === "focus" && s.completedAt >= startOfDay)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function getThisWeekFocusMinutes(): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  return getHistory()
    .filter((s) => s.mode === "focus" && s.completedAt >= startOfWeek.getTime())
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function getDailyFocusMinutes(days: number): { label: string; minutes: number }[] {
  const result: { label: string; minutes: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const start = d.getTime();
    const end = start + 86400_000;
    const minutes = getHistory()
      .filter((s) => s.mode === "focus" && s.completedAt >= start && s.completedAt < end)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    result.push({ label, minutes });
  }
  return result;
}

export function getStreak(): number {
  const history = getHistory().filter((s) => s.mode === "focus");
  if (history.length === 0) return 0;

  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const start = d.getTime();
    const end = start + 86400_000;
    const hasSession = history.some((s) => s.completedAt >= start && s.completedAt < end);
    if (hasSession) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}
