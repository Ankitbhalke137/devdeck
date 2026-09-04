"use client";

export function StatusBar() {
  return (
    <footer
      className="h-12 w-full bg-surface-1 border-t border-custom flex items-center justify-between px-4 rounded-b-xl shadow-sm text-xs text-secondary"
    >
      <span>🟢 Coding - Deep Work | 📁 12 widgets | 📊 42 tasks | ⏱️ 2h 15m focus</span>
      <span>⚡ 1.2s | 📡 WS active | 💾 87% RAM</span>
    </footer>
  );
}