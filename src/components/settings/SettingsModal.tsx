"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  X,
  User,
  SlidersHorizontal,
  Key,
  Info,
  Trash2,
  RotateCcw,
  LogOut,
  Check,
  Save,
  ShieldCheck,
  Download,
  Upload,
} from "lucide-react";
import { workspaceStore, ALL_WIDGET_TYPES } from "@/lib/workspaceStore";
import { chatStore } from "@/lib/chatStore";

export type SettingsTab = "account" | "workspace" | "keys" | "about";

interface SettingsModalProps {
  tab: SettingsTab;
  onClose: () => void;
  onOpenAuth: () => void;
  onTabChange: (tab: SettingsTab) => void;
}

const KEYS_STORAGE = "devdeck.apiKeys.v1";
const KEY_PROVIDERS = [
  { id: "groq", label: "Groq (console.groq.com)", placeholder: "gsk_…", hint: "Free API keys at console.groq.com/keys — ultra-fast free tier LPU inference" },
  { id: "gemini", label: "Google Gemini", placeholder: "AIzaSy…", hint: "Used by the AI Assistant widget" },
  { id: "openai", label: "OpenAI", placeholder: "sk-…", hint: "Used by the AI Assistant widget" },
  { id: "anthropic", label: "Anthropic Claude", placeholder: "sk-ant-…", hint: "Used by the AI Assistant widget" },
  { id: "youtube", label: "YouTube Data API", placeholder: "AIzaSy…", hint: "Optional: YouTube track search in Focus Station" },
] as const;

function maskKey(key: string) {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function loadKeys(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEYS_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function SettingsModal({ tab, onClose, onOpenAuth, onTabChange }: SettingsModalProps) {
  const { data: session, status } = useSession();
  const activeWidgets = workspaceStore((s) => s.active);
  const resetWorkspace = workspaceStore((s) => s.resetWorkspace);
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>(loadKeys);
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>(loadKeys);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [clearedFlash, setClearedFlash] = useState(false);
  const [resetFlash, setResetFlash] = useState(false);
  const [importFlash, setImportFlash] = useState<"success" | "error" | null>(null);
  const exportWorkspace = workspaceStore((s) => s.exportWorkspace);
  const importWorkspace = workspaceStore((s) => s.importWorkspace);

  const isAuthenticated = status === "authenticated" && !!session?.user;
  const user = session?.user;

  const saveKeys = () => {
    const cleaned: Record<string, string> = {};
    for (const provider of KEY_PROVIDERS) {
      const value = (draftKeys[provider.id] || "").trim();
      if (value) cleaned[provider.id] = value;
    }
    try {
      localStorage.setItem(KEYS_STORAGE, JSON.stringify(cleaned));
    } catch {
      // storage unavailable
    }
    setSavedKeys(cleaned);
    setSavedFlash("keys");
    setTimeout(() => setSavedFlash(null), 2000);
  };

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: "account", label: "Account", icon: User },
    { id: "workspace", label: "Workspace", icon: SlidersHorizontal },
    { id: "keys", label: "API Keys", icon: Key },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[#f4f4f5]">Settings</h2>
            <p className="text-[11px] text-[#71717a]">Account, workspace & preferences</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#27272a] rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Tab rail */}
          <div className="w-40 border-r border-[#27272a] p-2 space-y-1 flex-shrink-0 hidden sm:block">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    tab === t.id
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                      : "text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* ACCOUNT */}
            {tab === "account" && (
              <div className="space-y-4">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3.5 bg-[#18181b] border border-[#27272a] rounded-xl p-4">
                      {user?.image ? (
                        <img
                          src={user.image}
                          alt={user.name || "User"}
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#3f3f46]"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold text-white">
                          {user?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#f4f4f5] truncate">{user?.name}</div>
                        <div className="text-xs text-[#a1a1aa] truncate font-mono">{user?.email}</div>
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          <ShieldCheck className="w-2.5 h-2.5" /> Google OAuth session active
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#71717a] leading-relaxed">
                      Your workspace layout, widgets and chat history are saved locally in this
                      browser under your session. Signing out keeps your local data.
                    </div>

                    <button
                      onClick={() => signOut()}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out of DevDeck
                    </button>
                  </>
                ) : (
                  <div className="space-y-4 text-center py-6">
                    <div className="mx-auto w-14 h-14 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center">
                      <User className="w-6 h-6 text-[#71717a]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#f4f4f5]">No account connected</p>
                      <p className="text-xs text-[#71717a] mt-1 max-w-[280px] mx-auto">
                        Sign in with Google to attach your profile to the workspace and sync your
                        identity across chat and voice huddles.
                      </p>
                    </div>
                    <button
                      onClick={onOpenAuth}
                      className="mx-auto flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-900 font-medium text-xs rounded-lg transition-colors"
                    >
                      Continue with Google
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* WORKSPACE */}
            {tab === "workspace" && (
              <div className="space-y-3">
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-[#f4f4f5]">Reset grid & widgets</div>
                      <p className="text-[11px] text-[#71717a] mt-0.5">
                        Restore the default 6-widget layout and positions.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        resetWorkspace();
                        setResetFlash(true);
                        setTimeout(() => setResetFlash(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] rounded-lg transition-colors flex-shrink-0"
                    >
                      {resetFlash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      {resetFlash ? "Done" : "Reset"}
                    </button>
                  </div>
                </div>

                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-[#f4f4f5]">Export / Import workspace</div>
                      <p className="text-[11px] text-[#71717a] mt-0.5">
                        Download a JSON backup or restore from a file.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={exportWorkspace}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export
                      </button>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        Import
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = importWorkspace(reader.result as string);
                              setImportFlash(result ? "success" : "error");
                              setTimeout(() => setImportFlash(null), 2000);
                            };
                            reader.readAsText(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {importFlash === "success" && (
                        <span className="text-[10px] text-emerald-400 font-mono">Imported!</span>
                      )}
                      {importFlash === "error" && (
                        <span className="text-[10px] text-rose-400 font-mono">Invalid file</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-[#f4f4f5]">Widgets on canvas</div>
                      <p className="text-[11px] text-[#71717a] mt-0.5">
                        {activeWidgets.length} of {ALL_WIDGET_TYPES.length} active — manage visibility from the sidebar&apos;s
                        &quot;Add Widget&quot; menu.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        chatStore.clearMessages();
                        setClearedFlash(true);
                        setTimeout(() => setClearedFlash(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 rounded-lg transition-colors flex-shrink-0"
                    >
                      {clearedFlash ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {clearedFlash ? "Cleared" : "Clear"}
                    </button>
                  </div>
                </div>

                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
                  <div className="text-sm font-medium text-[#f4f4f5]">Widgets on canvas</div>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    {activeWidgets.length} of 6 active — manage visibility from the sidebar’s
                    “Add Widget” menu.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {activeWidgets.map((w) => (
                      <span
                        key={w}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 border border-custom text-[#a1a1aa]"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* API KEYS */}
            {tab === "keys" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#71717a]">
                    Keys are stored only in this browser (localStorage) and sent to providers when
                    you use a widget. Never share them.
                  </p>
                  <button
                    onClick={saveKeys}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex-shrink-0"
                  >
                    {savedFlash === "keys" ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    {savedFlash === "keys" ? "Saved" : "Save keys"}
                  </button>
                </div>
                {KEY_PROVIDERS.map((provider) => {
                  const hasKey = !!savedKeys[provider.id];
                  const isDraftDiff =
                    (draftKeys[provider.id] || "") !== (savedKeys[provider.id] || "");
                  return (
                    <div
                      key={provider.id}
                      className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#f4f4f5]">{provider.label}</span>
                        {hasKey ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Saved: {maskKey(savedKeys[provider.id])}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#27272a] text-[#71717a] border border-[#27272a]">
                            Not set
                          </span>
                        )}
                      </div>
                      <input
                        type="password"
                        value={draftKeys[provider.id] || ""}
                        onChange={(e) =>
                          setDraftKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))
                        }
                        placeholder={provider.placeholder}
                        className="w-full bg-[#121215] border border-[#27272a] rounded-lg px-3 py-2 text-xs font-mono text-[#f4f4f5] placeholder-[#71717a] outline-none focus:border-indigo-500 transition-colors"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#71717a]">{provider.hint}</span>
                        {hasKey && (
                          <button
                            onClick={() => {
                              const next = { ...draftKeys };
                              delete next[provider.id];
                              setDraftKeys(next);
                              const cleaned = { ...savedKeys };
                              delete cleaned[provider.id];
                              try {
                                localStorage.setItem(KEYS_STORAGE, JSON.stringify(cleaned));
                              } catch {
                                // ignore
                              }
                              setSavedKeys(cleaned);
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {isDraftDiff && (
                        <p className="text-[10px] text-amber-400">Unsaved changes — press “Save keys”.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ABOUT */}
            {tab === "about" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center font-bold text-white">
                    DD
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#f4f4f5]">DevDeck OS</div>
                    <div className="text-[11px] text-[#71717a] font-mono">v0.1.0 · Developer Workspace</div>
                  </div>
                </div>
                <div className="text-[11px] text-[#a1a1aa] leading-relaxed">
                  An all-in-one developer command center: live team chat, real voice huddles,
                  focus music, resource health monitoring, task board and dev utilities on a
                  drag-and-drop grid canvas.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Framework", "Next.js 16 (App Router)"],
                    ["Styling", "Tailwind CSS v4"],
                    ["Grid", "react-grid-layout"],
                    ["State", "Zustand + localStorage"],
                    ["Auth", "NextAuth · Google OAuth"],
                    ["Audio", "WebRTC + Web Audio API"],
                    ["Music", "YouTube IFrame API"],
                    ["Real-time", "Cross-tab storage sync"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider font-mono text-[#71717a]">{k}</div>
                      <div className="text-[11px] text-[#f4f4f5] mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="sm:hidden flex border-t border-[#27272a] flex-shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  tab === t.id ? "text-indigo-400 bg-indigo-500/10" : "text-[#71717a]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}