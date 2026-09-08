"use client";

import { Brain, Send, ChevronDown, Copy, Check, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type Provider = "gemini" | "gpt" | "claude" | "ollama";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const providers: { id: Provider; name: string; model: string }[] = [
  { id: "gemini", name: "Google Gemini", model: "gemini-1.5-flash" },
  { id: "gpt", name: "OpenAI GPT", model: "gpt-4o" },
  { id: "claude", name: "Anthropic Claude", model: "claude-3.5-sonnet" },
  { id: "ollama", name: "Local Ollama", model: "llama3.2" },
];

const mockResponses: Record<Provider, string> = {
  gemini: "I'm Google Gemini, your AI assistant! I can help with coding, analysis, and creative tasks. How can I assist you today?",
  gpt: "I'm GPT-4o from OpenAI! I'm ready to help you with any questions or tasks you have. What would you like to work on?",
  claude: "I'm Claude from Anthropic! I'm here to help you with thoughtful, nuanced responses. What can I help you with?",
  ollama: "I'm running locally via Ollama! I'm your private AI assistant. How can I help you today?",
};

export function AIAssistantWidget() {
  const [selectedProvider, setSelectedProvider] = useState<Provider>("gemini");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: mockResponses.gemini,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: mockResponses[selectedProvider],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
      setIsLoading(false);
    }, 1000);
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

  const currentProvider = providers.find((p) => p.id === selectedProvider)!;

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium text-primary">AI Assistant</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
          >
            <span>{currentProvider.name}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-surface-2 rounded-lg border border-custom shadow-lg z-10">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProvider(p.id);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-3 transition-colors ${selectedProvider === p.id ? "text-indigo-500" : "text-secondary"}`}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted">{p.model}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-surface-2 border border-custom"
              }`}
            >
              <div className="text-xs text-primary/80 mb-1">
                {msg.role === "assistant" ? currentProvider.name : "You"}
              </div>
              <div className="text-sm text-primary whitespace-pre-wrap">
                {msg.content}
              </div>
              {msg.role === "assistant" && (
                <button
                  onClick={() => copyToClipboard(msg.id, msg.content)}
                  className="mt-2 text-xs text-muted hover:text-primary flex items-center gap-1"
                >
                  {copiedId === msg.id ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedId === msg.id ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-2 border border-custom rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-secondary">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-custom">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI anything... (Enter to send, Shift+Enter for newline)"
            className="flex-1 bg-surface-2 border border-custom rounded-lg px-3 py-2 text-xs text-primary placeholder-muted resize-none outline-none focus:border-indigo-500 transition-colors"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
