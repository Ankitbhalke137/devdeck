"use client";

import { Brain, Send, ChevronDown, Copy, Check, Sparkles, Zap } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export interface GroqModel {
  id: string;
  name: string;
  badge: string;
  description: string;
}

// Officially supported models on your Groq console (console.groq.com)
export const GROQ_FREE_MODELS: GroqModel[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    badge: "Flagship",
    description: "High-capability 120B model on Groq LPUs with deep reasoning.",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
    badge: "Ultra Fast",
    description: "Ultra-fast low latency 20B model for snappy responses and code.",
  },
  {
    id: "groq/compound",
    name: "Groq Compound",
    badge: "Recommended",
    description: "Groq multi-model composite engine optimized for developer queries.",
  },
  {
    id: "groq/compound-mini",
    name: "Groq Compound Mini",
    badge: "Lightweight",
    description: "Fast composite architecture optimized for high throughput.",
  },
  {
    id: "allam-2-7b",
    name: "ALLaM 2 7B",
    badge: "Efficient",
    description: "Efficient open-weights conversational model.",
  },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function getStoredGroqKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("devdeck.apiKeys.v1");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed.groq || "";
  } catch {
    return "";
  }
}

export function AIAssistantWidget() {
  const [selectedModel, setSelectedModel] = useState<string>("openai/gpt-oss-120b");
  const [groqKey, setGroqKey] = useState<string>(getStoredGroqKey);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Hello! I am your AI Developer Assistant powered by **Groq LPU Inference**. I'm running Meta Llama 3.3 70B on the free tier. How can I help you write code, debug issues, or plan architecture today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync API key if updated via settings modal
  useEffect(() => {
    const checkKey = () => setGroqKey(getStoredGroqKey());
    window.addEventListener("storage", checkKey);
    return () => window.removeEventListener("storage", checkKey);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: "msg-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          apiKey: groqKey || undefined,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error || "Failed to generate response from Groq.");
        return;
      }

      const assistantMsg: Message = {
        id: "msg-" + Date.now() + "-reply",
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setErrorMessage("Network error connecting to AI API.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentModel =
    GROQ_FREE_MODELS.find((m) => m.id === selectedModel) || GROQ_FREE_MODELS[0];

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      {/* Header */}
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom bg-surface-1">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-semibold text-primary">Groq AI</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Free Tier
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="h-2.5 w-2.5" />
            <span>⚡ 480 t/s LPU</span>
          </span>
        </div>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded-md border border-custom transition-colors"
          >
            <span className="font-medium text-primary">{currentModel.name}</span>
            <ChevronDown className="h-3 w-3 text-muted" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-surface-2 rounded-lg border border-custom shadow-xl z-20 overflow-hidden py-1">
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-muted tracking-wider border-b border-custom/60">
                Groq Free Models
              </div>
              {GROQ_FREE_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-3 transition-colors flex flex-col gap-0.5 ${
                    selectedModel === m.id ? "bg-surface-3 text-indigo-400" : "text-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-primary">{m.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 font-medium">
                      {m.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted line-clamp-1">{m.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-surface-2 border border-custom text-primary"
              }`}
            >
              <div className="text-[10px] font-semibold text-muted mb-1 flex items-center justify-between">
                <span>{msg.role === "assistant" ? currentModel.name : "You"}</span>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => copyToClipboard(msg.id, msg.content)}
                    className="ml-2 hover:text-primary transition-colors flex items-center gap-1"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                  </button>
                )}
              </div>
              <div className="text-xs whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-2 border border-custom rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-secondary">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                <span>Generating with Groq ({currentModel.name})...</span>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <div className="font-semibold mb-0.5">Error</div>
            <div>{errorMessage}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestion Chips */}
      <div className="px-2.5 pt-2 pb-1 bg-surface-1 border-t border-custom/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          "+ Add Backpressure Handling",
          "+ Convert to Web Workers",
          "+ Benchmark with Vitest",
        ].map((chip) => (
          <button
            key={chip}
            onClick={() => {
              setInput(chip.replace(/^\+\s*/, ""));
              inputRef.current?.focus();
            }}
            className="shrink-0 text-[10px] font-mono px-2 py-1 rounded bg-surface-2 hover:bg-surface-3 text-secondary hover:text-primary border border-custom transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-custom bg-surface-1">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${currentModel.name} anything... (Enter to send)`}
            className="flex-1 bg-surface-2 border border-custom rounded-lg px-3 py-2 text-xs text-primary placeholder-muted resize-none outline-none focus:border-indigo-500 transition-colors"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors flex items-center justify-center"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
