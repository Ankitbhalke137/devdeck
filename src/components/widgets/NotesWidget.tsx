"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  StickyNote,
  Plus,
  Trash2,
  Search,
  Copy,
  Bold,
  Italic,
  Code,
  List,
  Heading2,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "devdeck.notes.v1";

function loadNotes(): Note[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Note[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function createNote(): Note {
  return {
    id: crypto.randomUUID(),
    title: "Untitled Note",
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotesWidget() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const initial = loadNotes();
    return initial.length > 0 ? initial[0].id : null;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showList, setShowList] = useState<boolean>(() => {
    const initial = loadNotes();
    return initial.length === 0;
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeNote = notes.find((n) => n.id === activeId) || null;

  // Sync across tabs via window storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "devdeck_notes" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setNotes(parsed);
          }
        } catch {
          // ignore parsing error
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: Note[]) => {
    setNotes(next);
    saveNotes(next);
  }, []);

  const handleNew = () => {
    const note = createNote();
    persist([note, ...notes]);
    setActiveId(note.id);
    setShowList(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleDelete = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    persist(next);
    if (activeId === id) {
      setActiveId(next.length > 0 ? next[0].id : null);
      if (next.length === 0) setShowList(true);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
  };

  const handleTitleChange = (title: string) => {
    if (!activeId) return;
    const next = notes.map((n) =>
      n.id === activeId ? { ...n, title, updatedAt: Date.now() } : n
    );
    persist(next);
  };

  const handleContentChange = (content: string) => {
    if (!activeId) return;
    const next = notes.map((n) =>
      n.id === activeId ? { ...n, content, updatedAt: Date.now() } : n
    );
    // Debounce localStorage writes
    setNotes(next);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNotes(next), 500);
  };

  const insertMarkdown = (prefix: string, suffix = "") => {
    const ta = textareaRef.current;
    if (!ta || !activeId) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);
    const replacement = `${prefix}${selected || "text"}${suffix}`;
    const newContent = ta.value.substring(0, start) + replacement + ta.value.substring(end);
    handleContentChange(newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(
        selected ? start + replacement.length : start + prefix.length,
        selected ? start + replacement.length : start + prefix.length + (selected || "text").length
      );
    }, 0);
  };

  const filteredNotes = searchQuery
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes;

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      {/* Header */}
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-medium text-primary">Quick Notes</span>
          <span className="text-[10px] text-muted font-mono">{notes.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {activeId && (
            <button
              onClick={() => setShowList(!showList)}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
              title={showList ? "Edit note" : "Show all notes"}
            >
              {showList ? (
                <StickyNote className="h-3.5 w-3.5" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button
            onClick={handleNew}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
            title="New note"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {showList || !activeNote ? (
        <div className="flex-1 overflow-y-auto">
          {/* Search */}
          {notes.length > 3 && (
            <div className="px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full bg-surface-2 border border-custom rounded pl-7 pr-2 py-1.5 text-xs text-primary placeholder:text-muted outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Note List */}
          <div className="p-2 space-y-1">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8">
                <StickyNote className="h-8 w-8 text-muted mx-auto mb-2 opacity-40" />
                <p className="text-xs text-muted">
                  {notes.length === 0 ? "No notes yet. Create one!" : "No matches found."}
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setActiveId(note.id);
                    setShowList(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                    activeId === note.id
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : "hover:bg-surface-2 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-primary truncate">
                      {note.title}
                    </span>
                    <span className="text-[10px] text-muted flex-shrink-0">
                      {formatDate(note.updatedAt)}
                    </span>
                  </div>
                  {note.content && (
                    <p className="text-[10px] text-muted mt-1 line-clamp-2 leading-relaxed">
                      {note.content.substring(0, 120)}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title */}
          <div className="px-3 pt-3">
            <input
              value={activeNote.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-primary outline-none placeholder:text-muted"
              placeholder="Note title..."
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 px-3 py-2 border-b border-custom">
            <button
              onClick={() => insertMarkdown("**", "**")}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
              title="Bold"
            >
              <Bold className="h-3 w-3" />
            </button>
            <button
              onClick={() => insertMarkdown("_", "_")}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
              title="Italic"
            >
              <Italic className="h-3 w-3" />
            </button>
            <button
              onClick={() => insertMarkdown("`", "`")}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
              title="Code"
            >
              <Code className="h-3 w-3" />
            </button>
            <button
              onClick={() => insertMarkdown("## ")}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
              title="Heading"
            >
              <Heading2 className="h-3 w-3" />
            </button>
            <button
              onClick={() => insertMarkdown("- ")}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
              title="List"
            >
              <List className="h-3 w-3" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => handleCopy(activeNote.content)}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleDelete(activeNote.id)}
              className="p-1.5 text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
              title="Delete note"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <textarea
              ref={textareaRef}
              value={activeNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing... (supports markdown)"
              className="w-full h-full bg-transparent px-3 py-2 text-xs text-primary placeholder:text-muted outline-none resize-none font-mono leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-custom flex items-center justify-between text-[10px] text-muted">
            <span>{activeNote.content.length} chars</span>
            <span>autosaved</span>
          </div>
        </div>
      )}
    </div>
  );
}
