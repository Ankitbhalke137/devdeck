// DevDeck custom server: boots Next.js and mounts Socket.io on the same HTTP
// server so chat, presence and voice roster sync across browsers and machines.
//
//   dev   → NODE_ENV !== "production"  (npm run dev)
//   prod  → NODE_ENV === "production"  (npm run build && npm start)
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import next from "next";
import { Server } from "socket.io";
import { initPersistence, appendMessage, incrementReaction } from "./persistence.mjs";

// Load local env files before anything else so persistence can see DATABASE_URL.
// (Next.js loads these itself during app.prepare(), but our hub initializes first.)
for (const file of [".env", ".env.local"]) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      // ignore malformed env files
    }
  }
}

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "localhost";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const MESSAGE_LIMIT = 200;

// In-memory hub state (one process). The message log is additionally written
// through to disk (or Neon Postgres when DATABASE_URL is set) so chat history
// survives server restarts. Clients merge the log on connect.
const messageLog = await initPersistence();
const presence = new Map(); // userId -> { id, name, avatar }
const voiceRoster = new Map(); // userId -> VoiceParticipant

// Seed the huddle stage with the demo teammates (they have no sockets, so
// they never disconnect and always show in the roster).
voiceRoster.set("voice-1", {
  id: "voice-1",
  name: "Sarah Infrastructure",
  avatar:
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  isSpeaking: false,
  isMuted: false,
  role: "Host",
});
voiceRoster.set("voice-2", {
  id: "voice-2",
  name: "Alex Developer",
  avatar:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  isSpeaking: false,
  isMuted: false,
  role: "Participant",
});

function toPresenceList() {
  return [...presence.values()];
}

function toVoiceList() {
  return [...voiceRoster.values()];
}

try {
  await app.prepare();
} catch (err) {
  console.error("Failed to prepare Next.js:", err);
  process.exit(1);
}

const httpServer = createServer((req, res) => {
  handle(req, res);
});

const io = new Server(httpServer, {
  path: "/socket.io",
  maxHttpBufferSize: 1e6,
  cors: { origin: true, credentials: true },
});

io.on("connection", (socket) => {
  let userId = null;

  // Send current hub state to the freshly connected client.
  socket.emit("chat:history", { messages: messageLog });
  socket.emit("presence", toPresenceList());
  socket.emit("voice:state", toVoiceList());

  socket.on("chat:join", (user) => {
    userId = user?.id || socket.id;
    presence.set(userId, {
      id: userId,
      name: user?.name || "Guest",
      avatar: user?.avatar || null,
    });
    socket.broadcast.emit("presence", toPresenceList());
  });

  // New chat message → append to hub log and relay to every other client.
  socket.on("chat:message", async (msg) => {
    if (!msg?.id || typeof msg.content !== "string" || !msg.content.trim()) return;
    const entry = await appendMessage(msg);
    messageLog.push(entry);
    if (messageLog.length > MESSAGE_LIMIT) messageLog.shift();
    socket.broadcast.emit("chat:message", entry);
  });

  // Reaction intents are relayed to other clients and recorded in the log so
  // counts survive restarts (each client still keeps its own live counters).
  socket.on("chat:reaction", (payload) => {
    if (!payload?.messageId || !payload?.emoji) return;
    const stored = messageLog.find((m) => m.id === payload.messageId);
    if (stored) {
      stored.reactions = { ...(stored.reactions || {}) };
      stored.reactions[payload.emoji] = (stored.reactions[payload.emoji] || 0) + 1;
    }
    incrementReaction(payload.messageId, payload.emoji);
    socket.broadcast.emit("chat:reaction", {
      messageId: payload.messageId,
      emoji: payload.emoji,
    });
  });

  // ---- Voice huddle roster sync (join / leave / mute / role updates) ----
  socket.on("voice:join", (participant) => {
    if (!participant?.id) return;
    const p = {
      id: participant.id,
      name: participant.name || "Guest",
      avatar: participant.avatar || null,
      isMuted: !!participant.isMuted,
      isSpeaking: false,
      role: participant.role || "Participant",
    };
    voiceRoster.set(p.id, p);
    socket.broadcast.emit("voice:state", toVoiceList());
  });

  socket.on("voice:update", (participant) => {
    if (!participant?.id) return;
    const existing = voiceRoster.get(participant.id);
    if (!existing) return;
    voiceRoster.set(participant.id, {
      ...existing,
      isMuted: participant.isMuted ?? existing.isMuted,
      isSpeaking: participant.isSpeaking ?? existing.isSpeaking,
    });
    socket.broadcast.emit("voice:state", toVoiceList());
  });

  socket.on("voice:leave", (id) => {
    if (!id) return;
    if (voiceRoster.delete(id)) {
      socket.broadcast.emit("voice:state", toVoiceList());
    }
  });

  socket.on("disconnect", () => {
    if (userId && presence.delete(userId)) {
      socket.broadcast.emit("presence", toPresenceList());
    }
    if (userId && voiceRoster.delete(userId)) {
      socket.broadcast.emit("voice:state", toVoiceList());
    }
  });
});

httpServer.listen(port, () => {
  console.log(
    `> DevDeck ready on http://${hostname}:${port} (${dev ? "development" : "production"}) · Socket.io mounted on /socket.io`
  );
});