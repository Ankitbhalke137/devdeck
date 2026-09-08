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
}

export interface VoiceParticipant {
  id: string;
  name: string;
  avatar: string;
  isSpeaking: boolean;
  isMuted: boolean;
  role: string;
}

const STORAGE_KEY = "devdeck.chat.messages.v1";

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    content: "Hey team, just deployed the new Auth layer with Google OAuth & Live WebSockets! 🚀",
    userId: "user-system",
    userName: "Alice (Lead)",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    time: "10:20 AM",
    reactions: { "🚀": 3, "❤️": 2 },
  },
  {
    id: "msg-2",
    content: "```typescript\n// Real-time link health listener\nexport const pingHealth = async (url: string) => {\n  const res = await fetch(`/api/health?url=${url}`);\n  return res.status === 200;\n};\n```",
    userId: "user-tech",
    userName: "Alex Developer",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    time: "10:22 AM",
    isCode: true,
    codeLanguage: "typescript",
    reactions: { "💡": 4, "👍": 2 },
  },
  {
    id: "msg-3",
    content: "Starting audio huddle in the Standup Channel now! Join if you have questions on the schema.",
    userId: "user-sarah",
    userName: "Sarah Infrastructure",
    userAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    time: "10:25 AM",
    reactions: { "🔥": 2 },
  },
];

const DEFAULT_VOICE_MEMBERS: VoiceParticipant[] = [
  {
    id: "voice-1",
    name: "Sarah Infrastructure",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    isSpeaking: true,
    isMuted: false,
    role: "Host",
  },
  {
    id: "voice-2",
    name: "Alex Developer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    isSpeaking: false,
    isMuted: false,
    role: "Participant",
  },
];

/** Teammates who can auto-reply so the chat feels alive. */
const TEAMMATES = [
  {
    name: "Alice (Lead)",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    replies: [
      "Nice! I'll review it in a sec 👍",
      "On it — adding to my queue.",
      "LGTM so far. Can you also update the docs?",
      "Merged the latest changes, should be live on staging.",
      "Let's pair on this after standup.",
      "🔥 Great work everyone!",
    ],
  },
  {
    name: "Alex Developer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    replies: [
      "Yep, works on my machine 😄",
      "I'll check the logs and report back.",
      "Pushing a fix now...",
      "Good catch! Adding a regression test.",
      "Sounds good to me.",
    ],
  },
  {
    name: "Sarah Infrastructure",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    replies: [
      "Deploying to production in 10 min 🚀",
      "Latency looks fine, monitoring is green.",
      "The huddle is still open if anyone wants to jump in.",
      "Scaling the workers — should be done shortly.",
      "I'll keep an eye on the dashboards.",
    ],
  },
];

const LISTENERS = new Set<() => void>();
let messagesState: ChatMessage[] | null = null;
let voiceMembersState: VoiceParticipant[] = [...DEFAULT_VOICE_MEMBERS];
let isUserInVoice = false;

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [...DEFAULT_MESSAGES];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // corrupted storage — fall through to defaults
  }
  return [...DEFAULT_MESSAGES];
}

function saveMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // storage full or unavailable — chat still works in memory
  }
}

// Sync chat across browser tabs in real time (storage events fire in other tabs).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          messagesState = parsed;
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

function pushMessage(message: Omit<ChatMessage, "id" | "time" | "reactions">) {
  const newMessage: ChatMessage = {
    ...message,
    id: "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    time: nowTime(),
    reactions: {},
  };
  messagesState = [...(messagesState ?? loadMessages()), newMessage];
  saveMessages(messagesState);
  chatStore.notify();
  return newMessage;
}

/** Have a random teammate reply to a real user message after a short delay. */
function scheduleBotReply() {
  const teammate = TEAMMATES[Math.floor(Math.random() * TEAMMATES.length)];
  const reply = teammate.replies[Math.floor(Math.random() * teammate.replies.length)];
  const delay = 1200 + Math.random() * 2000;
  setTimeout(() => {
    pushMessage({
      content: reply,
      userId: "bot-" + teammate.name,
      userName: teammate.name,
      userAvatar: teammate.avatar,
    });
  }, delay);
}

export const chatStore = {
  getMessages: () => {
    if (!messagesState) messagesState = loadMessages();
    return messagesState;
  },
  getVoiceMembers: () => voiceMembersState,
  isInVoice: () => isUserInVoice,

  subscribe: (listener: () => void) => {
    LISTENERS.add(listener);
    return () => {
      LISTENERS.delete(listener);
    };
  },

  notify: () => {
    LISTENERS.forEach((l) => l());
  },

  sendMessage: (message: Omit<ChatMessage, "id" | "time" | "reactions">) => {
    pushMessage(message);
    // Real teammates reply back so the room feels live.
    scheduleBotReply();
  },

  /**
   * Add a message that arrived from another machine/tab. Idempotent: messages
   * with an id already present are ignored (echoes, storage events, races).
   */
  addIncomingMessage: (message: ChatMessage) => {
    const current = messagesState ?? loadMessages();
    if (current.some((m) => m.id === message.id)) return;
    messagesState = [
      ...current,
      {
        ...message,
        id: message.id,
        time: message.time,
        reactions: message.reactions ?? {},
        userAvatar:
          message.userAvatar ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      },
    ];
    saveMessages(messagesState);
    chatStore.notify();
  },

  /** Increment a reaction on a message that already exists locally. */
  addReactionIncoming: (messageId: string, emoji: string) => {
    let touched = false;
    messagesState = (messagesState ?? loadMessages()).map((m) => {
      if (m.id === messageId) {
        touched = true;
        const reactions = { ...m.reactions };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    });
    if (!touched) return;
    saveMessages(messagesState);
    chatStore.notify();
  },

  /** Replace the voice roster with the server-authoritative list. */
  setVoiceRoster: (roster: VoiceParticipant[]) => {
    voiceMembersState = roster.map((m) => ({
      id: m.id,
      name: m.name,
      avatar:
        m.avatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      isSpeaking: !!m.isSpeaking,
      isMuted: !!m.isMuted,
      role: m.role || "Participant",
    }));
    chatStore.notify();
  },

  /** Wipe local message history (used from Settings). */
  clearMessages: () => {
    messagesState = [];
    saveMessages([]);
    chatStore.notify();
  },

  addReaction: (messageId: string, emoji: string) => {
    messagesState = (messagesState ?? loadMessages()).map((m) => {
      if (m.id === messageId) {
        const reactions = { ...m.reactions };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    });
    saveMessages(messagesState);
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
          avatar: user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
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