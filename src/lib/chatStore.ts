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

const LISTENERS = new Set<() => void>();
let messagesState: ChatMessage[] = [...DEFAULT_MESSAGES];
let voiceMembersState: VoiceParticipant[] = [...DEFAULT_VOICE_MEMBERS];
let isUserInVoice = false;

export const chatStore = {
  getMessages: () => messagesState,
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
    const newMessage: ChatMessage = {
      ...message,
      id: "msg-" + Date.now(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      reactions: {},
    };
    messagesState = [...messagesState, newMessage];
    chatStore.notify();
  },

  addReaction: (messageId: string, emoji: string) => {
    messagesState = messagesState.map((m) => {
      if (m.id === messageId) {
        const reactions = { ...m.reactions };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    });
    chatStore.notify();
  },

  joinVoice: (user: { id: string; name: string; avatar?: string }) => {
    isUserInVoice = true;
    if (!voiceMembersState.some((m) => m.id === user.id)) {
      voiceMembersState = [
        ...voiceMembersState,
        {
          id: user.id,
          name: user.name,
          avatar: user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          isSpeaking: false,
          isMuted: false,
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
    voiceMembersState = voiceMembersState.map((m) => {
      if (m.id === userId) {
        return { ...m, isSpeaking };
      }
      return m;
    });
    chatStore.notify();
  },
};
