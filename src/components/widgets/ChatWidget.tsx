"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare,
  Send,
  Smile,
  Code,
  Headphones,
  Copy,
  Check,
  Plus,
  Hash,
  Reply,
  X,
  AtSign,
  Music4,
} from "lucide-react";
import { chatStore, ChatMessage, RoomInfo, PresenceUser } from "@/lib/chatStore";
import { useSession } from "next-auth/react";
import { getChatSocket, joinChatRoom } from "@/lib/chatSocket";
import { initialsAvatar } from "@/lib/avatar";

const EMOJI_LIST = ["👍", "🚀", "❤️", "🔥", "💡", "🎉", "👀", "🐛"];

type SyncStatus = "connecting" | "online" | "offline";

interface RoomMusic {
  videoId: string;
  title: string;
  artist: string;
  isPlaying: boolean;
}

function generateMessageId(): string {
  return "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
}

export function ChatWidget({ onOpenVoiceModal }: { onOpenVoiceModal?: () => void }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>(chatStore.getMessages());
  const [rooms, setRooms] = useState<RoomInfo[]>(chatStore.getRooms());
  const [currentRoom, setCurrentRoomState] = useState(chatStore.getCurrentRoom());
  const [input, setInput] = useState("");
  const [isCodeSnippetMode, setIsCodeSnippetMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [onlineCount, setOnlineCount] = useState(0);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>(chatStore.getPresenceUsers());
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [roomMusic, setRoomMusic] = useState<RoomMusic | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const currentUserName = session?.user?.name || "You (Developer)";
  const currentUserId = session?.user?.id || session?.user?.email || "user-dev";
  const currentUserAvatar = session?.user?.image || initialsAvatar(currentUserName);

  // Keep latest identity + room in refs so socket handlers (registered once)
  // always act on the current session user and room.
  const identityRef = useRef({ currentUserId, currentUserName, currentUserAvatar });
  useEffect(() => {
    identityRef.current = { currentUserId, currentUserName, currentUserAvatar };
  }, [currentUserId, currentUserName, currentUserAvatar]);
  const roomRef = useRef(currentRoom);
  useEffect(() => {
    roomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    return chatStore.subscribe(() => {
      setMessages(chatStore.getMessages());
      setRooms(chatStore.getRooms());
      setCurrentRoomState(chatStore.getCurrentRoom());
    });
  }, []);

  // Join the current room whenever it changes (server sends history + music state).
  useEffect(() => {
    joinChatRoom(currentRoom);
  }, [currentRoom]);

  const handleSelectRoom = (roomId: string) => {
    if (roomId === roomRef.current) return;
    chatStore.setCurrentRoom(roomId);
    joinChatRoom(roomId);
  };

  // Real-time connection: syncs messages, reactions, rooms and music across
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
      joinChatRoom(roomRef.current);
    };

    const handleConnect = () => {
      setSyncStatus("online");
      announce();
    };
    const handleDisconnect = () => {
      setSyncStatus("offline");
      setOnlineCount(0);
      chatStore.setPresenceCount(0);
    };
    const handleConnectError = () => {
      setSyncStatus("offline");
      chatStore.setPresenceCount(0);
    };
    const handleRooms = (list: RoomInfo[]) => chatStore.setRooms(list);
    const handleRoomHistory = (payload: { roomId: string; messages?: ChatMessage[] }) => {
      chatStore.setMessages(payload.roomId, payload?.messages ?? []);
    };
    const handleMessage = (msg: ChatMessage) =>
      chatStore.addIncomingMessage(msg, roomRef.current);
    const handleReaction = (payload: { roomId?: string; messageId: string; emoji: string }) =>
      chatStore.addReactionIncoming(payload.messageId, payload.emoji, payload.roomId);
    const handleMusicState = (payload: { roomId: string; music: RoomMusic | null }) => {
      if (payload.roomId === roomRef.current) {
        setRoomMusic(payload.music);
      }
    };
    const handlePresence = (list: PresenceUser[]) => {
      setOnlineCount(list.length);
      setPresenceUsers(list);
      chatStore.setPresenceUsers(list);
    };
    const handleRoomCreated = (payload: { roomId: string; name: string }) => {
      if (payload?.roomId) {
        handleSelectRoom(payload.roomId);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("chat:rooms", handleRooms);
    socket.on("chat:room-created", handleRoomCreated);
    socket.on("chat:room-history", handleRoomHistory);
    socket.on("chat:message", handleMessage);
    socket.on("chat:reaction", handleReaction);
    socket.on("chat:music-state", handleMusicState);
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
      socket.off("chat:rooms", handleRooms);
      socket.off("chat:room-created", handleRoomCreated);
      socket.off("chat:room-history", handleRoomHistory);
      socket.off("chat:message", handleMessage);
      socket.off("chat:reaction", handleReaction);
      socket.off("chat:music-state", handleMusicState);
      socket.off("presence", handlePresence);
    };
  }, []);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // One id shared by the local copy and the relayed entry — the hub drops
    // messages without an id, and matching ids keep dedupe + reactions sane.
    const messageId = generateMessageId();
    const message = {
      id: messageId,
      content: input.trim(),
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      isCode: isCodeSnippetMode || input.includes("```"),
      codeLanguage: isCodeSnippetMode ? "typescript" : undefined,
      roomId: currentRoom,
      replyTo: replyTo?.id || undefined,
    };

    const socket = getChatSocket();
    if (socket?.connected) {
      // Server relays to everyone in the room (sender dedupes by id).
      socket.emit("chat:message", message);
    } else {
      // Socket unavailable → keep the HTTP route as a best-effort fallback.
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "send-message", ...message }),
      }).catch(() => {});
    }

    chatStore.sendMessage(message, currentRoom);

    setInput("");
    setIsCodeSnippetMode(false);
    setShowEmojiPicker(false);
    setReplyTo(null);
    setMentionQuery(null);
  };

  // Mention filtering
  const filteredMentionUsers = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const source = presenceUsers.length > 0
      ? presenceUsers
      : [
          { id: "all", name: "team" },
          { id: "dev", name: "developer" },
        ];
    return source.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 5);
  }, [mentionQuery, presenceUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_-]*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionSelectedIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (userName: string) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const newInput = textBeforeCursor.slice(0, lastAtIndex) + `@${userName} ` + textAfterCursor;
      setInput(newInput);
      setMentionQuery(null);
      setTimeout(() => {
        if (textareaRef.current) {
          const nextPos = lastAtIndex + userName.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % filteredMentionUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex((prev) =>
          prev === 0 ? filteredMentionUsers.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filteredMentionUsers[mentionSelectedIndex];
        if (selected) {
          handleSelectMention(selected.name);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

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
      socket.emit("chat:reaction", { roomId: currentRoom, messageId: msgId, emoji });
    }
    chatStore.addReaction(msgId, emoji, currentRoom);
  };

  const handleCreateRoom = () => {
    const name = newRoomName.trim();
    if (!name) return;
    const socket = getChatSocket();
    if (socket?.connected) {
      socket.emit("chat:create-room", { name });
    }
    setNewRoomName("");
    setCreatingRoom(false);
  };

  const activeRoom = rooms.find((r) => r.id === currentRoom);

  return (
    <div className="h-full flex flex-col bg-[#121215] border border-[#27272a] rounded-xl overflow-hidden shadow-sm">
      {/* Widget Header */}
      <div className="widget-header flex items-center justify-between px-4 py-2.5 bg-[#18181b] border-b border-[#27272a]">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-[#f4f4f5] truncate">
            {activeRoom ? activeRoom.name : "Team Live Chat"}
          </span>
          {activeRoom && activeRoom.members > 0 && (
            <span className="text-[10px] text-[#71717a] font-mono flex-shrink-0">
              {activeRoom.members} here
            </span>
          )}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border font-mono flex items-center gap-1 flex-shrink-0 ${
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

        <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* Room Bar: switch / create rooms */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#121215] border-b border-[#27272a] overflow-x-auto">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => handleSelectRoom(room.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors flex-shrink-0 ${
              room.id === currentRoom
                ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/40"
                : "bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:border-[#3f3f46] hover:text-[#d4d4d8]"
            }`}
          >
            <Hash className="w-3 h-3" />
            <span className="max-w-[110px] truncate">{room.name}</span>
          </button>
        ))}

        {creatingRoom ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              autoFocus
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateRoom();
                if (e.key === "Escape") {
                  setCreatingRoom(false);
                  setNewRoomName("");
                }
              }}
              placeholder="Room name…"
              maxLength={40}
              className="w-28 px-2 py-1 text-[11px] bg-[#09090b] border border-indigo-500/50 rounded-md text-[#f4f4f5] placeholder:text-[#52525b] outline-none"
            />
            <button
              onClick={handleCreateRoom}
              disabled={!newRoomName.trim()}
              className="p-1 text-indigo-400 hover:bg-[#27272a] rounded disabled:opacity-40 transition-colors"
              title="Create room"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingRoom(true)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-[#71717a] hover:text-[#d4d4d8] hover:bg-[#18181b] border border-dashed border-[#27272a] rounded-md transition-colors flex-shrink-0"
            title="Create a new room"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        )}
      </div>

      {/* Now playing (shared room music) */}
      {roomMusic && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border-b border-[#27272a] text-[11px]">
          <Music4 className={`w-3 h-3 text-emerald-400 ${roomMusic.isPlaying ? "animate-pulse" : ""}`} />
          <span className="text-[#a1a1aa] truncate">
            <span className="text-emerald-400 font-medium">{roomMusic.isPlaying ? "Now playing" : "Paused"}</span>
            {" · "}
            {roomMusic.title}
            {roomMusic.artist ? ` — ${roomMusic.artist}` : ""}
          </span>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {messages.length === 0 && (
          <p className="text-center text-[11px] text-[#52525b] py-6">
            No messages yet in {activeRoom ? activeRoom.name : "this room"} — say hi!
          </p>
        )}
        {messages.map((msg) => {
          const replyMsg = msg.replyTo ? messages.find((m) => m.id === msg.replyTo) : null;
          const threadReplies = messages.filter((m) => m.replyTo === msg.id);
          const isMentioned = currentUserName && msg.content.toLowerCase().includes(`@${currentUserName.toLowerCase()}`);

          // Render message content with highlighted @mentions
          const renderMessageContent = (text: string) => {
            const parts = text.split(/(@[a-zA-Z0-9_\-\s]{1,25}\b|@[a-zA-Z0-9_\-]+)/g);
            return parts.map((part, i) => {
              if (part.startsWith("@")) {
                const isMe = currentUserName && part.slice(1).trim().toLowerCase() === currentUserName.toLowerCase();
                return (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-medium text-[11px] border ${
                      isMe
                        ? "bg-indigo-500/25 text-indigo-200 border-indigo-500/40 ring-1 ring-indigo-500/20"
                        : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                    }`}
                  >
                    <AtSign className="w-2.5 h-2.5 inline" />
                    {part.slice(1)}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            });
          };

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 group relative p-1.5 rounded-lg transition-colors ${
                isMentioned ? "bg-indigo-950/20 border-l-2 border-indigo-500 pl-2" : "hover:bg-[#18181b]/50"
              }`}
            >
              <img
                src={msg.userAvatar || initialsAvatar(msg.userName)}
                alt={msg.userName}
                className="w-7 h-7 rounded-full object-cover border border-[#27272a] mt-0.5 shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#f4f4f5]">{msg.userName}</span>
                  <span className="text-[10px] text-[#71717a] font-mono">{msg.time}</span>
                  {isMentioned && (
                    <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[9px] font-medium rounded border border-indigo-500/30">
                      mentioned you
                    </span>
                  )}
                </div>

                {/* Reply indicator */}
                {replyMsg && (
                  <div className="flex items-center gap-1.5 mb-1 pl-2 border-l-2 border-indigo-500/50">
                    <Reply className="w-2.5 h-2.5 text-indigo-400" />
                    <span className="text-[10px] text-indigo-400 truncate max-w-50">
                      {replyMsg.userName}: {replyMsg.content.substring(0, 50)}
                    </span>
                  </div>
                )}

                {/* Message Body (Markdown / Code / Plain with Mentions) */}
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
                  <p className="text-[#d4d4d8] leading-relaxed whitespace-pre-wrap wrap-break-word">
                    {renderMessageContent(msg.content)}
                  </p>
                )}

                {/* Reactions */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
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

                  {/* Thread count */}
                  {threadReplies.length > 0 && (
                    <span className="text-[10px] text-indigo-400 font-mono">
                      {threadReplies.length} {threadReplies.length === 1 ? "reply" : "replies"}
                    </span>
                  )}

                  {/* Reply button */}
                  <button
                    onClick={() => setReplyTo(replyTo?.id === msg.id ? null : msg)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717a] hover:text-[#f4f4f5] rounded transition-opacity"
                    title="Reply"
                  >
                    <Reply className="w-3 h-3" />
                  </button>

                  {/* Add reaction popover trigger */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)
                      }
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#71717a] hover:text-[#f4f4f5] rounded hover:bg-[#27272a] transition-all text-xs"
                      title="React to message"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    {activeReactionMsgId === msg.id && (
                      <div className="absolute left-0 bottom-6 z-30 flex items-center gap-1 p-1 bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl animate-in fade-in zoom-in-95">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              handleAddReaction(msg.id, emoji);
                              setActiveReactionMsgId(null);
                            }}
                            className="p-1 hover:bg-[#27272a] rounded text-sm transition-transform hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Mention Autocomplete Dropdown */}
      {mentionQuery !== null && filteredMentionUsers.length > 0 && (
        <div className="mx-2.5 mb-1 bg-[#18181b] border border-indigo-500/40 rounded-lg shadow-2xl overflow-hidden z-20">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-indigo-400 border-b border-[#27272a] flex items-center gap-1">
            <AtSign className="w-3 h-3" /> Mention online members
          </div>
          <div className="max-h-36 overflow-y-auto">
            {filteredMentionUsers.map((user, idx) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectMention(user.name)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                  idx === mentionSelectedIndex
                    ? "bg-indigo-600/30 text-indigo-200"
                    : "text-[#d4d4d8] hover:bg-[#27272a]"
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-indigo-600/50 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{user.name}</span>
                <span className="text-[10px] text-[#71717a] ml-auto">online</span>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-3 py-1.5 bg-[#18181b] border-t border-[#27272a] flex items-center gap-2 text-[11px]">
          <Reply className="w-3 h-3 text-indigo-400" />
          <span className="text-indigo-400 font-medium">Replying to {replyTo.userName}</span>
          <span className="text-[#71717a] truncate flex-1">{replyTo.content.substring(0, 60)}</span>
          <button onClick={() => setReplyTo(null)} className="p-0.5 text-[#71717a] hover:text-[#f4f4f5]">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input Composer */}
      <div className="p-2.5 bg-[#18181b] border-t border-[#27272a]">
        <div className="flex flex-col gap-1.5 bg-[#121215] border border-[#27272a] rounded-lg p-2 focus-within:border-indigo-500/50 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isCodeSnippetMode
                ? "Paste code snippet here... (Enter to share)"
                : `Message ${activeRoom ? activeRoom.name : "room"}... (Type @ to mention, Enter to send)`
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

              <button
                type="button"
                onClick={() => {
                  setInput((prev) => prev + "@");
                  setMentionQuery("");
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                className="p-1.5 rounded text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
                title="Mention someone (@)"
              >
                <AtSign className="w-3.5 h-3.5" />
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