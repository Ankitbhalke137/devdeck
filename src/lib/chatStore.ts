import { initialsAvatar } from "./avatar";

export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  time: string;
  isCode?: boolean;
  codeLanguage?: string;
  reactions: Record<string, number>; // emoji -> count
  replyTo?: string; // id of the message being replied to
  threadCount?: number; // number of replies in this thread
}

export interface VoiceParticipant {
  id: string;
  name: string;
  avatar: string;
  isSpeaking: boolean;
  isMuted: boolean;
  role: string;
  conn?: string; // server socket id — breaks offer/answer ties between same-user tabs
}

export interface RoomInfo {
  id: string;
  name: string;
  members: number;
}

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string | null;
}

// Per-room storage keys (v2 suffix keeps stale v1 demo conversations out).
const ROOM_STORAGE_PREFIX = "devdeck.chat.messages.v2.";
const CURRENT_ROOM_KEY = "devdeck.chat.room.v1";

const LISTENERS = new Set<() => void>();
const messagesByRoom: Record<string, ChatMessage[] | null> = {};
let voiceMembersState: VoiceParticipant[] = [];
let isUserInVoice = false;
let presenceCount = 0;
let presenceUsersState: PresenceUser[] = [];
let roomsState: RoomInfo[] = [];
let currentRoomId = "general";

// Restore the last-used room (client only).
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem(CURRENT_ROOM_KEY);
    if (saved) currentRoomId = saved;
  } catch {
    // ignore unavailable storage
  }
}

function storageKey(roomId: string) {
  return ROOM_STORAGE_PREFIX + roomId;
}

function loadMessages(roomId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(roomId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // corrupted storage — fall through to empty
  }
  return [];
}

function saveMessages(roomId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(roomId), JSON.stringify(messages));
  } catch {
    // storage full or unavailable — chat still works in memory
  }
}

// Sync chat across browser tabs in real time (storage events fire in other tabs).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith(ROOM_STORAGE_PREFIX) && e.newValue) {
      const roomId = e.key.slice(ROOM_STORAGE_PREFIX.length);
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          messagesByRoom[roomId] = parsed;
          chatStore.notify();
        }
      } catch {
        // ignore malformed cross-tab payload
      }
    }
  });
}

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type NewMessage = Omit<ChatMessage, "id" | "time" | "reactions"> & { id?: string };

function pushMessage(roomId: string, message: NewMessage) {
  const newMessage: ChatMessage = {
    ...message,
    // Use the caller-provided id when present so the local copy matches the
    // entry the hub relays — dedupe and cross-account reactions depend on it.
    id: message.id || "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    time: nowTime(),
    reactions: {},
    userAvatar: message.userAvatar || initialsAvatar(message.userName),
  };
  const current = messagesByRoom[roomId] ?? loadMessages(roomId);
  messagesByRoom[roomId] = [...current, newMessage];
  saveMessages(roomId, messagesByRoom[roomId]);
  chatStore.notify();
  return newMessage;
}

export const chatStore = {
  /* ---------------- rooms ---------------- */

  getRooms: () => roomsState,

  setRooms: (rooms: RoomInfo[]) => {
    roomsState = rooms;
    // Fall back to a room that actually exists (e.g. after a server restart).
    if (rooms.length > 0 && !rooms.some((r) => r.id === currentRoomId)) {
      currentRoomId = rooms[0].id;
    }
    chatStore.notify();
  },

  getCurrentRoom: () => currentRoomId,

  setCurrentRoom: (roomId: string) => {
    if (currentRoomId === roomId) return;
    currentRoomId = roomId;
    try {
      if (typeof window !== "undefined") localStorage.setItem(CURRENT_ROOM_KEY, roomId);
    } catch {
      // ignore unavailable storage
    }
    chatStore.notify();
  },

  /* ---------------- messages (per room) ---------------- */

  getMessages: (roomId?: string) => {
    const rid = roomId || currentRoomId;
    if (messagesByRoom[rid] === undefined) messagesByRoom[rid] = loadMessages(rid);
    return messagesByRoom[rid] ?? [];
  },

  /** Replace a room's messages with the server-authoritative history (on join). */
  setMessages: (roomId: string, messages: ChatMessage[]) => {
    messagesByRoom[roomId] = messages;
    saveMessages(roomId, messages);
    chatStore.notify();
  },

  sendMessage: (message: NewMessage, roomId?: string) => {
    pushMessage(roomId || currentRoomId, message);
  },

  /**
   * Add a message that arrived from another machine/tab. Idempotent: messages
   * with an id already present are ignored (echoes, storage events, races).
   */
  addIncomingMessage: (message: ChatMessage, roomId?: string) => {
    const rid = roomId || currentRoomId;
    const current = messagesByRoom[rid] ?? loadMessages(rid);
    if (current.some((m) => m.id === message.id)) return;
    messagesByRoom[rid] = [
      ...current,
      {
        ...message,
        id: message.id,
        time: message.time,
        reactions: message.reactions ?? {},
        userAvatar: message.userAvatar || initialsAvatar(message.userName),
      },
    ];
    saveMessages(rid, messagesByRoom[rid]);
    chatStore.notify();
  },

  /** Increment a reaction on a message that already exists locally. */
  addReactionIncoming: (messageId: string, emoji: string, roomId?: string) => {
    const rid = roomId || currentRoomId;
    let touched = false;
    messagesByRoom[rid] = (messagesByRoom[rid] ?? loadMessages(rid)).map((m) => {
      if (m.id === messageId) {
        touched = true;
        const reactions = { ...m.reactions };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    });
    if (!touched) return;
    saveMessages(rid, messagesByRoom[rid]);
    chatStore.notify();
  },

  /** Wipe a room's local message history (used from Settings). */
  clearMessages: (roomId?: string) => {
    const rid = roomId || currentRoomId;
    messagesByRoom[rid] = [];
    saveMessages(rid, []);
    chatStore.notify();
  },

  addReaction: (messageId: string, emoji: string, roomId?: string) => {
    const rid = roomId || currentRoomId;
    messagesByRoom[rid] = (messagesByRoom[rid] ?? loadMessages(rid)).map((m) => {
      if (m.id === messageId) {
        const reactions = { ...m.reactions };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    });
    saveMessages(rid, messagesByRoom[rid]);
    chatStore.notify();
  },

  /* ---------------- voice + presence (unchanged) ---------------- */

  getVoiceMembers: () => voiceMembersState,
  isInVoice: () => isUserInVoice,
  getPresenceCount: () => presenceCount,
  getPresenceUsers: () => presenceUsersState,

  subscribe: (listener: () => void) => {
    LISTENERS.add(listener);
    return () => {
      LISTENERS.delete(listener);
    };
  },

  notify: () => {
    LISTENERS.forEach((l) => l());
  },

  /** Number of people currently connected to the hub (server-authoritative). */
  setPresenceCount: (count: number) => {
    if (presenceCount === count) return;
    presenceCount = count;
    chatStore.notify();
  },

  /** List of users currently connected to the hub (server-authoritative). */
  setPresenceUsers: (users: PresenceUser[]) => {
    presenceUsersState = users;
    presenceCount = users.length;
    chatStore.notify();
  },

  /** Replace the voice roster with the server-authoritative list. */
  setVoiceRoster: (roster: VoiceParticipant[]) => {
    voiceMembersState = roster.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar || initialsAvatar(m.name),
      isSpeaking: !!m.isSpeaking,
      isMuted: !!m.isMuted,
      role: m.role || "Participant",
      conn: m.conn,
    }));
    chatStore.notify();
  },

  joinVoice: (user: { id: string; name: string; avatar?: string; muted?: boolean }) => {
    isUserInVoice = true;
    if (!voiceMembersState.some((m) => m.id === user.id)) {
      voiceMembersState = [
        ...voiceMembersState,
        {
          id: user.id,
          name: user.name,
          avatar: user.avatar || initialsAvatar(user.name),
          isSpeaking: false,
          isMuted: !!user.muted,
          role: "Participant",
        },
      ];
    }
    chatStore.notify();
  },

  leaveVoice: (userId: string) => {
    isUserInVoice = false;
    voiceMembersState = voiceMembersState.filter((m) => m.id !== userId);
    chatStore.notify();
  },

  toggleMute: (userId: string) => {
    voiceMembersState = voiceMembersState.map((m) => {
      if (m.id === userId) {
        return { ...m, isMuted: !m.isMuted };
      }
      return m;
    });
    chatStore.notify();
  },

  setSpeaking: (userId: string, isSpeaking: boolean) => {
    const member = voiceMembersState.find((m) => m.id === userId);
    if (!member || member.isSpeaking === isSpeaking) return;
    voiceMembersState = voiceMembersState.map((m) => {
      if (m.id === userId) {
        return { ...m, isSpeaking };
      }
      return m;
    });
    chatStore.notify();
  },
};