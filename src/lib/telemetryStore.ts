"use client";

import { create } from "zustand";

export interface LatencyPoint {
  run: number;
  seconds: number;
}

export interface TelemetryState {
  cpuLoad: number;
  heapUsedGB: number;
  heapTotalGB: number;
  gitCommitsToday: number;
  gitBranch: string;
  prVelocityHours: number;
  clusterHealth: number;
  clusterRegion: string;
  ciCdLatency: LatencyPoint[];
  refreshTelemetry: () => void;
}

const INITIAL_LATENCY: LatencyPoint[] = [
  { run: 1, seconds: 18.2 },
  { run: 2, seconds: 14.5 },
  { run: 3, seconds: 22.1 },
  { run: 4, seconds: 16.8 },
  { run: 5, seconds: 12.4 },
  { run: 6, seconds: 15.2 },
  { run: 7, seconds: 13.9 },
  { run: 8, seconds: 19.4 },
  { run: 9, seconds: 14.1 },
  { run: 10, seconds: 16.4 },
];

export const useTelemetryStore = create<TelemetryState>((set) => ({
  cpuLoad: 18.4,
  heapUsedGB: 2.4,
  heapTotalGB: 8.0,
  gitCommitsToday: 14,
  gitBranch: "main @ 7d9a8c",
  prVelocityHours: 3.2,
  clusterHealth: 99.98,
  clusterRegion: "US-EAST-1",
  ciCdLatency: INITIAL_LATENCY,

  refreshTelemetry: () => {
    set((state) => {
      // Subtle realistic micro-fluctuations
      const jitterCpu = Math.max(8, Math.min(65, +(state.cpuLoad + (Math.random() * 4 - 2)).toFixed(1)));
      const jitterHeap = Math.max(1.8, Math.min(6.2, +(state.heapUsedGB + (Math.random() * 0.2 - 0.1)).toFixed(2)));
      const newLatency = [
        ...state.ciCdLatency.slice(1),
        {
          run: state.ciCdLatency[state.ciCdLatency.length - 1].run + 1,
          seconds: +(14 + Math.random() * 8).toFixed(1),
        },
      ];
      return {
        cpuLoad: jitterCpu,
        heapUsedGB: jitterHeap,
        ciCdLatency: newLatency,
      };
    });
  },
}));
