"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Plus, Pencil, Trash2, X, RefreshCw } from "lucide-react";

interface Link {
  id: string;
  title: string;
  url: string;
  status: "OK" | "ERROR" | "PENDING";
  latencyMs?: number;
  lastChecked?: string;
}

export function ResourceHubWidget() {
  const [links, setLinks] = useState<Link[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("devdeck.resources.v1");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Link[];
          // Filter out legacy hardcoded sample items if they only contain default demo data
          if (Array.isArray(parsed)) {
            const hasLegacyMock = parsed.some(
              (l) => l.url === "https://staging-api.example.com" || l.url === "https://ci.example.com"
            );
            if (hasLegacyMock) {
              const cleaned = parsed.filter(
                (l) =>
                  l.url !== "https://staging-api.example.com" &&
                  l.url !== "https://github.com/yourorg/devdeck" &&
                  l.url !== "https://docs.vercel.com" &&
                  l.url !== "https://ci.example.com" &&
                  l.url !== "https://github.com/yourorg/feature-branch"
              );
              localStorage.setItem("devdeck.resources.v1", JSON.stringify(cleaned));
              return cleaned;
            }
            return parsed;
          }
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [refresh, setRefresh] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ title: "", url: "" });

  useEffect(() => {
    localStorage.setItem("devdeck.resources.v1", JSON.stringify(links));
  }, [links]);

  const handleRefresh = () => {
    setRefresh(true);
    setTimeout(() => {
      setLinks((prev) =>
        prev.map((link) => ({
          ...link,
          lastChecked: "just now",
          status: Math.random() > 0.3 ? "OK" : ("ERROR" as const),
          latencyMs: Math.random() * 100,
        }))
      );
    }, 500);
  };

  const handleAddLink = () => {
    if (!form.title || !form.url) return;
    const newLink: Link = {
      id: Date.now().toString(),
      title: form.title,
      url: form.url,
      status: "PENDING",
      lastChecked: "just now",
    };
    setLinks((prev) => [...prev, newLink]);
    setForm({ title: "", url: "" });
    setShowAddModal(false);
  };

  const handleEditLink = (link: Link) => {
    setEditingLink(link);
    setForm({ title: link.title, url: link.url });
  };

  const handleSaveEdit = () => {
    if (!editingLink || !form.title || !form.url) return;
    setLinks((prev) =>
      prev.map((l) =>
        l.id === editingLink.id ? { ...l, title: form.title, url: form.url } : l
      )
    );
    setEditingLink(null);
    setForm({ title: "", url: "" });
  };

  const handleDeleteLink = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium text-primary">Resource Hub</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setForm({ title: "", url: "" });
              setShowAddModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
          <button
            onClick={handleRefresh}
            disabled={refresh}
            title="Refresh status checks"
            className="flex items-center gap-1 px-2 py-1 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refresh ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {links.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-custom rounded-lg my-2">
            <ExternalLink className="h-8 w-8 text-muted/60 mb-2" />
            <p className="text-xs font-medium text-primary mb-1">No resources yet</p>
            <p className="text-[11px] text-muted max-w-[200px] mb-3">
              Add URLs, API endpoints, documentation or repositories you want quick access to.
            </p>
            <button
              onClick={() => {
                setForm({ title: "", url: "" });
                setShowAddModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-md transition-colors"
            >
              <Plus className="h-3 w-3" /> Add Resource
            </button>
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-surface-2 border border-custom group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-medium">
                {link.title.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-primary">{link.title}</div>
                <div className="text-xs text-muted truncate">{link.url}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      link.status === "OK"
                        ? "text-emerald-500"
                        : link.status === "ERROR"
                        ? "text-rose-500"
                        : "text-amber-500"
                    }`}
                  >
                    {link.status}
                  </span>
                  {link.latencyMs !== undefined && (
                    <span className="text-xs text-muted">{link.latencyMs.toFixed(0)}ms</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditLink(link)}
                    className="p-1 text-sky-500 hover:text-sky-400 rounded"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-1 text-rose-500 hover:text-rose-400 rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-custom text-xs text-muted">
        {links.length} monitored links •{" "}
        {links.filter((l) => l.status === "ERROR").length} issues detected
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingLink) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-2 rounded-lg border border-custom p-4 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-primary">
                {editingLink ? "Edit Resource" : "Add Resource"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLink(null);
                }}
                className="text-muted hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface-1 border border-custom rounded text-primary focus:outline-none focus:border-sky-500"
                  placeholder="My API"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">URL</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface-1 border border-custom rounded text-primary focus:outline-none focus:border-sky-500"
                  placeholder="https://api.example.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLink(null);
                }}
                className="px-3 py-1.5 text-xs text-muted bg-surface-1 hover:bg-surface-3 rounded border border-custom transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingLink ? handleSaveEdit : handleAddLink}
                className="px-3 py-1.5 text-xs text-primary bg-sky-600 hover:bg-sky-500 rounded border border-custom transition-colors"
              >
                {editingLink ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
