"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Returns the shared Socket.io connection, creating it on first use.
 * Same origin → no URL needed. Safe to call from multiple widgets.
 */
export function getChatSocket(): Socket | null {
  if (socket) return socket;
  try {
    socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });
  } catch {
    return null;
  }
  return socket;
}

/** True once a connection attempt has been started (client-side only). */
export function isSocketClientCreated(): boolean {
  return socket !== null;
}