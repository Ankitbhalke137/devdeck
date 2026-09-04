"use client";

import { X, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export function CommandPalette() {
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{id: string; title: string}[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenState(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) setOpenState(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpenState(false);
    if (e.key === "Enter" && open && query.trim()) {
      setOpenState(false);
      setQuery("");
    }
  };

  // Simulate search results based on query
  useEffect(() => {
    const debounce = setTimeout(() => {
      const q = query.trim().toLowerCase();
      if (q) {
        const mockResults = [
          { id: "tasks", title: "Tasks (⌘ShiftT)" },
          { id: "ai", title: "AI Assistant (⌘ShiftA)" },
          { id: "resources", title: "Resource Hub (⌘ShiftR)" },
          { id: "dev-tools", title: "Dev Tools (⌘ShiftD)" },
          { id: "chat", title: "Chat Channels (⌘ShiftC)" },
        ].filter((r) => r.title.toLowerCase().includes(q));
        setResults(mockResults);
      } else {
        setResults([]);
      }
    }, 150);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div>
      {/* Trigger button - shown in topbar but we'll render here for demo */}
      <button
        onClick={() => setOpenState(true)}
        className="hidden" // will be shown in TopBar, hiding for now
        aria-label="Open command palette"
      />
      
      {/* Modal */}
      {open && (
        <div
          onClick={(e: React.MouseEvent) => {
            if (e.target === e.currentTarget) setOpenState(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-1 w-80 max-w-md rounded-xl border border-active shadow-lg overflow-hidden transform transition-all duration-200"
            style={{ transform: open ? "scale(1)" : "scale(0.9)" }}
          >
            <div className="p-4 border-b border-custom">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-secondary" />
                <input
                  ref={inputRef}
                  onKeyDown={handleKeyDown}
                  onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                  value={query}
                  className="flex-1 bg-transparent text-primary placeholder-secondary text-sm outline-none"
                  placeholder="Search tasks, links, docs, tools, AI..."
                />
                <X className="ml-auto h-4 w-4 cursor-pointer" onClick={() => setOpenState(false)} aria-label="Close" />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {results.length === 0 && query.trim() ? (
                <div className="p-2 text-secondary text-sm">No results found</div>
              ) : (
                results.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => {
                      setOpenState(false);
                      setQuery("");
                      console.log("Navigate to:", result.id);
                    }}
                    className="p-2 rounded-custom hover:bg-surface-2 hover:text-text-primary transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-primary">{result.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}