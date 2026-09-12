"use client";

import { useState, useEffect, useRef } from "react";
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
  Users,
} from "lucide-react";
import { getChatSocket } from "@/lib/chatSocket";

interface SharedNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  updatedBy: string;
}

export function SharedNotesWidget() {
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showList, setShowList] = useState(true);
  const [connected, setConnected] = useState<boolean>(() => {
    const s = getChatSocket();
    return !!s?.connected;
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeNote = notes.find((n) => n.id === activeId) || null;

  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    const handleConnect = () => {
      setConnected(true);
      socket.emit("notes:list");
    };
    const handleDisconnect = () => setConnected(false);
    const handleNotesList = (list: SharedNote[]) => {
      setNotes(list);
      if (!activeIdRef.current && list.length > 0) {
        setActiveId(list[0].id);
        setShowList(false);
      }
    };
    const handleNoteUpdate = (note: SharedNote) => {
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === note.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = note;
          return next;
        }
        return [...prev, note];
      });
    };
    const handleNoteDelete = (payload: { id: string }) => {
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== payload.id);
        if (activeIdRef.current === payload.id) {
          setActiveId(next.length > 0 ? next[0].id : null);
          if (next.length === 0) setShowList(true);
        }
        return next;
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("notes:list", handleNotesList);
    socket.on("notes:update", handleNoteUpdate);
    socket.on("notes:delete", handleNoteDelete);

    if (socket.connected) {
      socket.emit("notes:list");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("notes:list", handleNotesList);
      socket.off("notes:update", handleNoteUpdate);
      socket.off("notes:delete", handleNoteDelete);
    };
  }, []);

  const handleNew = () => {
    const socket = getChatSocket();
    if (!socket?.connected) return;
    socket.emit("notes:create", { title: "Untitled Note" });
  };

  const handleDelete = (id: string) => {
    const socket = getChatSocket();
    if (!socket?.connected) return;
    socket.emit("notes:delete", { id });
  };

  const handleTitleChange = (title: string) => {
    if (!activeId || !activeNote) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === activeId ? { ...n, title } : n))
    );
    const socket = getChatSocket();
    if (!socket?.connected) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      socket.emit("notes:update", { id: activeId, title, content: activeNote.content });
    }, 500);
  };

  const handleContentChange = (content: string) => {
    if (!activeId || !activeNote) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === activeId ? { ...n, content } : n))
    );
    const socket = getChatSocket();
    if (!socket?.connected) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      socket.emit("notes:update", { id: activeId, title: activeNote.title, content });
    }, 500);
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
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
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
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-medium text-primary">Shared Notes</span>
          <span className="text-[10px] text-muted font-mono">{notes.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-muted"}`} title={connected ? "Synced" : "Offline"} />
          {activeId && (
            <button
              onClick={() => setShowList(!showList)}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors"
            >
              {showList ? <StickyNote className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
            </button>
          )}
          <button onClick={handleNew} className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showList || !activeNote ? (
        <div className="flex-1 overflow-y-auto">
          {notes.length > 3 && (
            <div className="px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shared notes..."
                  className="w-full bg-surface-2 border border-custom rounded pl-7 pr-2 py-1.5 text-xs text-primary placeholder:text-muted outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}
          <div className="p-2 space-y-1">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted mx-auto mb-2 opacity-40" />
                <p className="text-xs text-muted">{notes.length === 0 ? "No shared notes yet." : "No matches."}</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => { setActiveId(note.id); setShowList(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    activeId === note.id ? "bg-indigo-500/10 border border-indigo-500/20" : "hover:bg-surface-2 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary truncate">{note.title}</span>
                    <span className="text-[10px] text-muted">{note.updatedBy}</span>
                  </div>
                  {note.content && <p className="text-[10px] text-muted mt-1 line-clamp-2">{note.content.substring(0, 120)}</p>}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 pt-3">
            <input
              value={activeNote.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-primary outline-none placeholder:text-muted"
              placeholder="Note title..."
            />
          </div>
          <div className="flex items-center gap-0.5 px-3 py-2 border-b border-custom">
            <button onClick={() => insertMarkdown("**", "**")} className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors" title="Bold"><Bold className="h-3 w-3" /></button>
            <button onClick={() => insertMarkdown("_", "_")} className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors" title="Italic"><Italic className="h-3 w-3" /></button>
            <button onClick={() => insertMarkdown("`", "`")} className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors" title="Code"><Code className="h-3 w-3" /></button>
            <button onClick={() => insertMarkdown("## ")} className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors" title="Heading"><Heading2 className="h-3 w-3" /></button>
            <button onClick={() => insertMarkdown("- ")} className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors" title="List"><List className="h-3 w-3" /></button>
            <div className="flex-1" />
            <button onClick={() => handleCopy(activeNote.content)} className="p-1.5 text-muted hover:text-primary hover:bg-surface-3 rounded transition-colors" title="Copy"><Copy className="h-3 w-3" /></button>
            <button onClick={() => handleDelete(activeNote.id)} className="p-1.5 text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors" title="Delete"><Trash2 className="h-3 w-3" /></button>
          </div>
          <div className="flex-1 overflow-hidden">
            <textarea
              ref={textareaRef}
              value={activeNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing... (synced in real-time)"
              className="w-full h-full bg-transparent px-3 py-2 text-xs text-primary placeholder:text-muted outline-none resize-none font-mono leading-relaxed"
              spellCheck={false}
            />
          </div>
          <div className="px-3 py-1.5 border-t border-custom flex items-center justify-between text-[10px] text-muted">
            <span>{activeNote.content.length} chars</span>
            <span className="flex items-center gap-1">
              <Users className="h-2.5 w-2.5" />
              shared · real-time sync
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
