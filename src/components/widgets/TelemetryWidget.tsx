"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Cpu,
  Database,
  GitCommit,
  GitPullRequest,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useTelemetryStore } from "@/lib/telemetryStore";

export function TelemetryWidget() {
  const {
    cpuLoad,
    heapUsedGB,
    heapTotalGB,
    gitCommitsToday,
    gitBranch,
    prVelocityHours,
    ciCdLatency,
    refreshTelemetry,
  } = useTelemetryStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live heart-beat ticker
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTelemetry();
    }, 4000);
    return () => clearInterval(interval);
  }, [refreshTelemetry]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    refreshTelemetry();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // SVG Sparkline calculations
  const width = 360;
  const height = 64;
  const padding = 6;
  const minVal = Math.min(...ciCdLatency.map((p) => p.seconds), 10);
  const maxVal = Math.max(...ciCdLatency.map((p) => p.seconds), 25);
  const range = maxVal - minVal || 1;

  const points = ciCdLatency.map((p, idx) => {
    const x = padding + (idx / (ciCdLatency.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p.seconds - minVal) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

  const avgLatency = (
    ciCdLatency.reduce((acc, p) => acc + p.seconds, 0) / ciCdLatency.length
  ).toFixed(1);

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      {/* Header */}
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom bg-surface-1">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-primary">Live Telemetry & Velocity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            POD: RUNNING
          </span>
          <button
            onClick={handleManualRefresh}
            className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
            title="Refresh metrics"
          >
            <RotateCcw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* CPU Load */}
          <div className="bg-surface-2 rounded-lg border border-custom p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted text-[10px] font-mono uppercase tracking-wider">
              <span>CPU Load</span>
              <Cpu className="h-3 w-3 text-cyan-400" />
            </div>
            <div className="mt-1">
              <div className="text-base font-bold text-primary font-mono">{cpuLoad}%</div>
              <div className="w-full bg-surface-3 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, cpuLoad)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Heap Allocation */}
          <div className="bg-surface-2 rounded-lg border border-custom p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted text-[10px] font-mono uppercase tracking-wider">
              <span>Heap Alloc</span>
              <Database className="h-3 w-3 text-indigo-400" />
            </div>
            <div className="mt-1">
              <div className="text-base font-bold text-primary font-mono">
                {heapUsedGB} <span className="text-[10px] text-muted font-normal">/ {heapTotalGB}GB</span>
              </div>
              <div className="w-full bg-surface-3 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(heapUsedGB / heapTotalGB) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Git Commits */}
          <div className="bg-surface-2 rounded-lg border border-custom p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted text-[10px] font-mono uppercase tracking-wider">
              <span>Git Commits</span>
              <GitCommit className="h-3 w-3 text-emerald-400" />
            </div>
            <div className="mt-1">
              <div className="text-base font-bold text-primary font-mono flex items-baseline gap-1">
                {gitCommitsToday}
                <span className="text-[10px] text-emerald-400 font-semibold">+3</span>
              </div>
              <div className="text-[10px] text-muted truncate font-mono mt-1">
                {gitBranch}
              </div>
            </div>
          </div>

          {/* PR Velocity */}
          <div className="bg-surface-2 rounded-lg border border-custom p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted text-[10px] font-mono uppercase tracking-wider">
              <span>PR Velocity</span>
              <GitPullRequest className="h-3 w-3 text-violet-400" />
            </div>
            <div className="mt-1">
              <div className="text-base font-bold text-primary font-mono flex items-baseline gap-1">
                {prVelocityHours} <span className="text-[10px] text-muted font-normal">hrs</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                <span>Top 5% speed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Latency Sparkline Section */}
        <div className="bg-surface-2 rounded-lg border border-custom p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
              CI/CD Build Time Latency (Last 10 Runs)
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              Avg {avgLatency}s
            </span>
          </div>

          <div className="w-full h-16 relative overflow-hidden rounded">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full preserve-3d"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#latencyGradient)" />
              <path
                d={pathD}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
