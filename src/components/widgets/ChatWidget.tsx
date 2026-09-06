"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Headphones, Clock, Users, TrendingUp, Check } from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  userName: string;
  time: string;
  mentions?: string[];
}

const sampleMessages: ChatMessage[] = [
  {
    id: "1",
    content: "Hey team, just deployed the new auth system! Working great so far. 🚀",
    userId: "user1",
    userName: "Alice",
    time: "10:23",
    mentions: [],
  },
  {
    id: "2",
    content: "Awesome! Any chance we can add rate limiting to the login endpoint?",
    userId: "user2",
    userName: "Bob",
    time: "10:24",
    mentions: ["user1"],
  },
  {
    id: "3",
    content: "Good idea. I'll open a ticket for that.",
    userId: "user3",
    userName: "Charlie",
    time: "10:25",
    mentions: [],
  },
  {
    id: "4",
    content: "Who's up for a quick voice huddle to discuss the API design?",
    userId: "user4",
    userName: "David",
    time: "10:27",
    mentions: [],
  },
];

const sampleUsers = [
  { id: "user1", name: "Alice", status: "active" as const },
  { id: "user2", name: "Bob", status: "away" as const },
  { id: "user3", name: "Charlie", status: "do_not_disturb" as const },
  { id: "user4", name: "David", status: "active" as const },
  { id: "user5", name: "Eve", status: "active" as const },
  { id: "user6", name: "Frank", status: "offline" as const },
];

const statusColors: Record<ChatMessage["userId"], string> = {
  user1: "bg-emerald-500",
  user2: "bg-amber-500",
  user3: "bg-rose-500",
  user4: "bg-sky-500",
  user5: "bg-indigo-500",
  user6: "bg-muted",
};

export function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages);
  const [input, setInput] = useState("");
  const [activeUsers, setActiveUsers] = useState<number>(4);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(Math.floor(Math.random() * 6) + 2);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      userId: "user1", // Simulate current user
      userName: "Alice",
      time: "now",
      mentions: [],
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const emojis = ["👍", "👎", "❤️", "😀", "😂", "🤔", "🚀", "💡", "🐛", "✅"];

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-medium text-primary">Team Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">🟢 {activeUsers} online</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.userId === "user1" ? "justify-end" : "justify-start"} mb-2`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                msg.userId === "user1"
                  ? "bg-emerald-500 text-white"
                  : "bg-surface-2 border border-custom"
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <div className="h-2 w-2 rounded-full ${statusColors[msg.userId as keyof typeof statusColors]}" />
                <span className="font-medium text-xs">{msg.userName}</span>
                <span className="text-xs text-muted">
                  {msg.time}
                </span>
              </div>
              <div className="text-sm text-primary whitespace-pre-wrap break-words">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {false && (
          <div className="flex justify-start">
            <div className="bg-surface-2 border border-custom rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-secondary">
                Alice is typing...
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-custom">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            className="flex-1 bg-surface-2 border border-custom rounded px-2 py-1.5 text-xs text-primary placeholder-muted resize-none outline-none focus:border-indigo-500"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {showEmojiPicker && (
        <div className="absolute bottom-14 left-3 right-3 bg-surface-2 border border-custom rounded-lg p-2 z-20">
          <div className="flex flex-wrap gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setInput((prev) => prev + emoji)}
                className="flex items-center justify-center h-8 w-8 bg-surface-3 rounded hover:bg-surface-2 transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}