"use client";

import { useState, useEffect, useRef } from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings,
  X,
  Check,
} from "lucide-react";
import { recordFocusSession } from "@/lib/focusHistory";

interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

function loadSettings(): TimerSettings {
  try {
    const saved = localStorage.getItem("devdeck.timer.v1");
    if (saved) {
      const parsed = JSON.parse(saved) as TimerSettings;
      if (parsed.focusMinutes > 0 && parsed.shortBreakMinutes > 0 && parsed.longBreakMinutes > 0) {
        return parsed;
      }
    }
  } catch {}
  return { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 };
}

function saveSettings(settings: TimerSettings) {
  localStorage.setItem("devdeck.timer.v1", JSON.stringify(settings));
}

function loadSessionCount(): number {
  try {
    const saved = localStorage.getItem("devdeck.timer.sessions");
    return saved ? parseInt(saved) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveSessionCount(count: number) {
  localStorage.setItem("devdeck.timer.sessions", count.toString());
}

type Mode = "focus" | "short_break" | "long_break";

const MODE_CONFIG: Record<Mode, { label: string; icon: string; color: string; ringColor: string; bg: string }> = {
  focus: { label: "Focus", icon: "🎯", color: "text-emerald-400", ringColor: "stroke-emerald-400", bg: "bg-emerald-500/10" },
  short_break: { label: "Break", icon: "☕", color: "text-sky-400", ringColor: "stroke-sky-400", bg: "bg-sky-500/10" },
  long_break: { label: "Long Break", icon: "🧘", color: "text-violet-400", ringColor: "stroke-violet-400", bg: "bg-violet-500/10" },
};

export function FocusStationWidget() {
  const [settings, setSettings] = useState<TimerSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [editForm, setEditForm] = useState<TimerSettings>(() => loadSettings());
  const [mode, setMode] = useState<Mode>("focus");
  const [timeLeft, setTimeLeft] = useState(settings.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<number>(() => loadSessionCount());

  const modeRef = useRef(mode);
  const sessionsRef = useRef(sessions);
  const settingsRef = useRef(settings);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            const s = settingsRef.current;
            const m = modeRef.current;
            // Record completed session to history
            const duration = m === "focus" ? s.focusMinutes : m === "short_break" ? s.shortBreakMinutes : s.longBreakMinutes;
            recordFocusSession(m, duration);
            if (m === "focus") {
              const next = sessionsRef.current + 1;
              setSessions(next);
              saveSessionCount(next);
              if (next % 4 === 0) {
                setMode("long_break");
                return s.longBreakMinutes * 60;
              }
              setMode("short_break");
              return s.shortBreakMinutes * 60;
            }
            setMode("focus");
            return s.focusMinutes * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const totalTime = mode === "focus" ? settings.focusMinutes * 60 : mode === "short_break" ? settings.shortBreakMinutes * 60 : settings.longBreakMinutes * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const switchMode = (m: Mode) => {
    if (isRunning) return;
    setMode(m);
    const s = settings;
    setTimeLeft(m === "focus" ? s.focusMinutes * 60 : m === "short_break" ? s.shortBreakMinutes * 60 : s.longBreakMinutes * 60);
  };

  const handleStartPause = () => setIsRunning(!isRunning);

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(totalTime);
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (mode === "focus") {
      setMode("short_break");
      setTimeLeft(settings.shortBreakMinutes * 60);
    } else {
      setMode("focus");
      setTimeLeft(settings.focusMinutes * 60);
    }
  };

  const handleSaveSettings = () => {
    const v = {
      focusMinutes: Math.max(1, Math.min(120, editForm.focusMinutes)),
      shortBreakMinutes: Math.max(1, Math.min(30, editForm.shortBreakMinutes)),
      longBreakMinutes: Math.max(1, Math.min(60, editForm.longBreakMinutes)),
    };
    setSettings(v);
    saveSettings(v);
    setShowSettings(false);
    if (!isRunning) {
      if (mode === "focus") setTimeLeft(v.focusMinutes * 60);
      else if (mode === "short_break") setTimeLeft(v.shortBreakMinutes * 60);
      else setTimeLeft(v.longBreakMinutes * 60);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="widget-header flex items-center justify-between px-4 py-2.5 border-b border-custom">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-primary">Focus Timer</span>
        </div>
        <button
          onClick={() => { setEditForm(settings); setShowSettings(true); }}
          className="p-1.5 text-muted hover:text-primary hover:bg-surface-2 rounded-md transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        {/* Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-lg">
          {(Object.keys(MODE_CONFIG) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all disabled:opacity-40 ${
                mode === m ? `${MODE_CONFIG[m].bg} ${MODE_CONFIG[m].color}` : "text-muted hover:text-secondary"
              }`}
            >
              <span>{MODE_CONFIG[m].icon}</span>
              <span>{MODE_CONFIG[m].label}</span>
            </button>
          ))}
        </div>

        {/* Circular Timer */}
        <div className="relative">
          <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-surface-3" />
            <circle
              cx="50" cy="50" r="45" fill="transparent"
              stroke="currentColor" strokeWidth="3" strokeLinecap="round"
              className={MODE_CONFIG[mode].ringColor}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 0.3s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold text-primary tracking-tight">
              {formatTime(timeLeft)}
            </span>
            <span className={`text-[11px] font-medium mt-1 ${MODE_CONFIG[mode].color}`}>
              {MODE_CONFIG[mode].label}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="p-2.5 rounded-full bg-surface-2 hover:bg-surface-3 text-muted hover:text-primary transition-colors"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleStartPause}
            className={`px-8 py-3 rounded-full text-sm font-semibold transition-all shadow-lg ${
              isRunning
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
            }`}
          >
            <span className="flex items-center gap-2">
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isRunning ? "Pause" : "Start"}
            </span>
          </button>
          <button
            onClick={handleSkip}
            className="p-2.5 rounded-full bg-surface-2 hover:bg-surface-3 text-muted hover:text-primary transition-colors"
            title="Skip"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Session Counter */}
        <div className="flex items-center gap-4 text-[11px] text-muted">
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < (sessions % 4) ? "bg-emerald-400" : "bg-surface-3"
                  }`}
                />
              ))}
            </div>
            <span>{sessions % 4}/4 sessions</span>
          </div>
          <span>•</span>
          <span>{sessions} total completed</span>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-2 rounded-xl border border-custom p-5 w-full max-w-xs mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-primary">Timer Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 text-muted hover:text-primary rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              {([
                { key: "focusMinutes" as const, label: "Focus", color: "emerald", icon: "🎯" },
                { key: "shortBreakMinutes" as const, label: "Short Break", color: "sky", icon: "☕" },
                { key: "longBreakMinutes" as const, label: "Long Break", color: "violet", icon: "🧘" },
              ]).map(({ key, label, color, icon }) => (
                <div key={key}>
                  <label className="text-[11px] text-muted flex items-center gap-1.5 mb-1.5">
                    <span>{icon}</span> {label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={key === "focusMinutes" ? 1 : 1}
                      max={key === "focusMinutes" ? 120 : key === "shortBreakMinutes" ? 30 : 60}
                      value={editForm[key]}
                      onChange={(e) => setEditForm({ ...editForm, [key]: parseInt(e.target.value) })}
                      className={`flex-1 h-1.5 bg-surface-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-${color}-500`}
                    />
                    <span className="text-xs font-mono text-primary w-10 text-right">
                      {editForm[key]}m
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 text-xs text-muted hover:text-primary rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-md transition-colors"
              >
                <Check className="h-3.5 w-3.5" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
