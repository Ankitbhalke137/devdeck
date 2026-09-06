"use client";

import { useState, useEffect } from "react";
import { Headphones, Play, Pause, SkipForward, Volume2, Timer, Coffee, Target } from "lucide-react";

const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes

const presetTracks = [
  { id: "1", title: "Deep Focus", artist: "Lo-Fi Beats", duration: "3:45" },
  { id: "2", title: "Ambient Rain", artist: "Nature Sounds", duration: "5:20" },
  { id: "3", title: "Jazz Vibes", artist: "Chill Jazz", duration: "4:15" },
  { id: "4", title: "Classical Calm", artist: "Piano Dreams", duration: "6:30" },
];

export function FocusStationWidget() {
  const [pomodoroMode, setPomodoroMode] = useState<"focus" | "short_break" | "long_break">("focus");
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const [currentTrack, setCurrentTrack] = useState(presetTracks[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (pomodoroMode === "focus") {
              setPomodoroCount((prev) => prev + 1);
              if ((pomodoroCount + 1) % 4 === 0) {
                setPomodoroMode("long_break");
                return LONG_BREAK;
              } else {
                setPomodoroMode("short_break");
                return SHORT_BREAK;
              }
            } else {
              setPomodoroMode("focus");
              return FOCUS_DURATION;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, pomodoroMode, pomodoroCount]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (pomodoroMode === "focus") {
      setTimeLeft(FOCUS_DURATION);
    } else if (pomodoroMode === "short_break") {
      setTimeLeft(SHORT_BREAK);
    } else {
      setTimeLeft(LONG_BREAK);
    }
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (pomodoroMode === "focus") {
      setPomodoroMode("short_break");
      setTimeLeft(SHORT_BREAK);
    } else {
      setPomodoroMode("focus");
      setTimeLeft(FOCUS_DURATION);
    }
  };

  const getProgress = () => {
    const total =
      pomodoroMode === "focus"
        ? FOCUS_DURATION
        : pomodoroMode === "short_break"
        ? SHORT_BREAK
        : LONG_BREAK;
    return ((total - timeLeft) / total) * 100;
  };

  const getModeColor = () => {
    switch (pomodoroMode) {
      case "focus":
        return "text-emerald-500";
      case "short_break":
        return "text-sky-500";
      case "long_break":
        return "text-indigo-500";
    }
  };

  const getModeLabel = () => {
    switch (pomodoroMode) {
      case "focus":
        return "Focus Time";
      case "short_break":
        return "Short Break";
      case "long_break":
        return "Long Break";
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-medium text-primary">Focus Station</span>
        </div>
        <span className="text-xs text-muted">{pomodoroCount} 🍅 completed</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Pomodoro Timer */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${getModeColor()}`}>{getModeLabel()}</span>
            <span className="text-xs text-muted">
              {pomodoroMode === "focus" ? "🍅" : pomodoroMode === "short_break" ? "☕" : "🛋️"}
            </span>
          </div>

          <div className="text-center mb-3">
            <div className="text-3xl font-mono font-bold text-primary">
              {formatTime(timeLeft)}
            </div>
            <div className="w-full h-2 bg-surface-3 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  pomodoroMode === "focus" ? "bg-emerald-500" : "bg-sky-500"
                }`}
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 text-secondary hover:bg-surface-3 rounded transition-colors"
            >
              <Timer className="h-4 w-4" />
            </button>
            <button
              onClick={handleStartPause}
              className={`p-3 rounded-full transition-colors ${
                isRunning
                  ? "bg-rose-500 hover:bg-rose-600"
                  : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {isRunning ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="h-5 w-5 text-white" />
              )}
            </button>
            <button
              onClick={handleSkip}
              className="p-2 text-secondary hover:bg-surface-3 rounded transition-colors"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Music Player */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Now Playing</span>
            <span className="text-xs text-muted">{currentTrack.duration}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-surface-3 rounded flex items-center justify-center">
              <Headphones className="h-5 w-5 text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-primary truncate">
                {currentTrack.title}
              </div>
              <div className="text-xs text-muted truncate">{currentTrack.artist}</div>
            </div>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-2 rounded-full transition-colors ${
                isPlaying ? "bg-rose-500 hover:bg-rose-600" : "bg-surface-3 hover:bg-surface-2"
              }`}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-white" />
              ) : (
                <Play className="h-4 w-4 text-primary" />
              )}
            </button>
          </div>

          <div className="mt-3">
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-full h-1 bg-surface-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setPomodoroMode("focus");
              setTimeLeft(FOCUS_DURATION);
              setIsRunning(false);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
          >
            <Target className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-secondary">25m Focus</span>
          </button>
          <button
            onClick={() => {
              setPomodoroMode("short_break");
              setTimeLeft(SHORT_BREAK);
              setIsRunning(false);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
          >
            <Coffee className="h-4 w-4 text-sky-500" />
            <span className="text-xs text-secondary">5m Break</span>
          </button>
        </div>
      </div>
    </div>
  );
}