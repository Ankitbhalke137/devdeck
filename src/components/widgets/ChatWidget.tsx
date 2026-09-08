"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Smile,
  Code,
  Headphones,
  Copy,
  Check,
} from "lucide-react";
import { chatStore, ChatMessage } from "@/lib/chatStore";
import { useSession } from "next-auth/react";
import { getChatSocket } from "@/lib/chatSocket";

const EMOJI_LIST = ["👍", "🚀", "❤️", "💡", "🐛", "🔥", "🎉", "👀"];

type SyncStatus = "connecting" | "online" | "offline";

export function ChatWidget({ onOpenVoiceModal }: { onOpenVoiceModal?: () => void }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>(chatStore.getMessages());
  const [input, setInput] = useState("");
  const [isCodeSnippetMode, setIsCodeSnippetMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [onlineCount, setOnlineCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserName = session?.user?.name || "You (Developer)";
  const currentUserId = session?.user?.id || session?.user?.email || "user-dev";
  const currentUserAvatar =
    session?.user?.image ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  // Keep latest identity in a ref so the socket handlers always join as the
  // current session user without re-registering listeners.
  const identityRef = useRef({ currentUserId, currentUserName, currentUserAvatar });
  useEffect(() => {
    identityRef.current = { currentUserId, currentUserName, currentUserAvatar };
  }, [currentUserId, currentUserName, currentUserAvatar]);

  useEffect(() => {
    return chatStore.subscribe(() => {
      setMessages(chatStore.getMessages());
    });
  }, []);

  // Real-time connection: syncs messages, reactions and presence across
  // browsers and machines through the Socket.io server.
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    const announce = () => {
      const identity = identityRef.current;
      socket.emit("chat:join", {
        id: identity.currentUserId,
        name: identity.currentUserName,
        avatar: identity.currentUserAvatar,
      });
    };

    const handleConnect = () => {
      setSyncStatus("online");
      announce();
    };
    const handleDisconnect = () => {
      setSyncStatus("offline");
      setOnlineCount(0);
    };
    const handleConnectError = () => setSyncStatus("offline");
    const handleHistory = (payload: { messages?: ChatMessage[] }) => {
      (payload?.messages ?? []).forEach((m) => chatStore.addIncomingMessage(m));
    };
    const handleMessage = (msg: ChatMessage) => chatStore.addIncomingMessage(msg);
    const handleReaction = (payload: { messageId: string; emoji: string }) =>
      chatStore.addReactionIncoming(payload.messageId, payload.emoji);
    const handlePresence = (list: { id: string }[]) => setOnlineCount(list.length);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("chat:history", handleHistory);
    socket.on("chat:message", handleMessage);
    socket.on("chat:reaction", handleReaction);
    socket.on("presence", handlePresence);

    if (socket.connected) {
      // Socket was already live (created by another widget): announce on the
      // next tick so re-renders don't cascade from a synchronous setState.
      setTimeout(() => handleConnect(), 0);
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("chat:history", handleHistory);
      socket.off("chat:message", handleMessage);
      socket.off("chat:reaction", handleReaction);
      socket.off("presence", handlePresence);
    };
  }, []);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const message = {
      content: input.trim(),
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      isCode: isCodeSnippetMode || input.includes("```"),
      codeLanguage: isCodeSnippetMode ? "typescript" : undefined,
    };

    const socket = getChatSocket();
    if (socket?.connected) {
      // Server relays to every other client; we add locally right away.
      socket.emit("chat:message", message);
    } else {
      // Socket unavailable → keep the HTTP route as a best-effort fallback.
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "send-message", ...message }),
      }).catch(() => {});
    }

    chatStore.sendMessage(message);

    setInput("");
    setIsCodeSnippetMode(false);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    const socket = getChatSocket();
    if (socket?.connected) {
      socket.emit("chat:reaction", { messageId: msgId, emoji });
    }
    chatStore.addReaction(msgId, emoji);
  };

  return (
    <div className="h-full flex flex-col bg-[#121215] border border-[#27272a] rounded-xl overflow-hidden shadow-sm">
      {/* Widget Header */}
      <div className="widget-header flex items-center justify-between px-4 py-2.5 bg-[#18181b] border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-[#f4f4f5]">Team Live Chat</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border font-mono flex items-center gap-1 ${
              syncStatus === "online"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : syncStatus === "offline"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                syncStatus === "online"
                  ? "bg-emerald-400"
                  : syncStatus === "offline"
                  ? "bg-rose-400"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            {syncStatus === "online"
              ? `Socket Live${onlineCount > 0 ? ` · ${onlineCount} online` : ""}`
              : syncStatus === "offline"
              ? "Offline"
              : "Connecting…"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenVoiceModal && (
            <button
              onClick={onOpenVoiceModal}
              className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[11px] font-medium transition-colors"
            >
              <Headphones className="w-3 h-3" />
              <span>Voice Room</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {messages.map((msg) => {
          return (
            <div key={msg.id} className="flex items-start gap-2.5 group">
              <img
                src={
                  msg.userAvatar ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                }
                alt={msg.userName}
                className="w-7 h-7 rounded-full object-cover border border-[#27272a] mt-0.5 flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#f4f4f5]">{msg.userName}</span>
                  <span className="text-[10px] text-[#71717a] font-mono">{msg.time}</span>
                </div>

                {/* Message Body (Markdown / Code / Plain) */}
                {msg.isCode ? (
                  <div className="relative bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 font-mono text-[11px] text-emerald-300 overflow-x-auto my-1">
                    <button
                      onClick={() => handleCopyCode(msg.content, msg.id)}
                      className="absolute top-2 right-2 p-1 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors"
                      title="Copy code"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <pre className="pr-6 whitespace-pre-wrap">
                      {msg.content.replace(/```[a-z]*\n?/g, "")}
                    </pre>
                  </div>
                ) : (
                  <p className="text-[#d4d4d8] leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                )}

                {/* Reactions */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {Object.entries(msg.reactions).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(msg.id, emoji)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[11px] text-[#a1a1aa] transition-colors"
                    >
                      <span>{emoji}</span>
                      <span className="text-[10px] font-mono">{count}</span>
                    </button>
                  ))}

                  {/* Add reaction mini trigger */}
                  <button
                    onClick={() => handleAddReaction(msg.id, "🚀")}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717a] hover:text-[#f4f4f5] rounded transition-opacity"
                    title="React with 🚀"
                  >
                    +🚀
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-[#18181b] border-t border-[#27272a]">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setInput((prev) => prev + " " + emoji);
                setShowEmojiPicker(false);
              }}
              className="p-1 hover:bg-[#27272a] rounded text-base transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Composer */}
      <div className="p-2.5 bg-[#18181b] border-t border-[#27272a]">
        <div className="flex flex-col gap-1.5 bg-[#121215] border border-[#27272a] rounded-lg p-2 focus-within:border-indigo-500/50 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isCodeSnippetMode
                ? "Paste code snippet here... (Press Enter to share)"
                : "Type message or code... (Enter to send, Shift+Enter for newline)"
            }
            rows={isCodeSnippetMode ? 3 : 2}
            className="w-full bg-transparent text-xs text-[#f4f4f5] placeholder-[#71717a] outline-none resize-none"
          />

          <div className="flex items-center justify-between pt-1 border-t border-[#27272a]/50">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCodeSnippetMode((prev) => !prev)}
                className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
                  isCodeSnippetMode
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b]"
                }`}
                title="Format as Code Snippet"
              >
                <Code className="w-3.5 h-3.5" />
                <span className="text-[10px]">Snippet</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="p-1.5 rounded text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
                title="Emoji"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!input.trim()}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs rounded transition-all"
            >
              <span>Send</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}