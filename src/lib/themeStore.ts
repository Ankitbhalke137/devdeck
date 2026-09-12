"use client";

import { create } from "zustand";

export type Theme = "dark" | "light";

const THEME_KEY = "devdeck.theme.v1";

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (theme: Theme) => void;
}

export const themeStore = create<ThemeState>((set, get) => ({
  theme: typeof window !== "undefined" ? loadTheme() : "dark",

  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    set({ theme: next });
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    applyTheme(next);
  },

  set: (theme) => {
    set({ theme });
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    applyTheme(theme);
  },
}));

// Apply on load (client)
if (typeof window !== "undefined") {
  applyTheme(loadTheme());
}
