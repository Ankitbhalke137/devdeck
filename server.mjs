// DevDeck custom server: boots Next.js and mounts Socket.io on the same HTTP
// server so chat, presence and voice roster sync across browsers and machines.
//
//   dev   → NODE_ENV !== "production"  (npm run dev)
//   prod  → NODE_ENV === "production"  (npm run build && npm start)
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import next from "next";
import { Server } from "socket.io";
import {
  initPersistence,
  incrementReaction,
  loadRooms,
  persistRoom,
  appendRoomMessage,
  saveRoomMusic,
} from "./persistence.mjs";

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

// In-memory hub state (one process). Chat history is written through to disk
// (or Neon Postgres when DATABASE_URL is set) so it survives server restarts.
//
// Rooms: each room has its own chat log + shared music state. "general" keeps
// the legacy single-log persistence path; extra rooms persist to rooms.json.
const generalLog = await initPersistence();
const rooms = new Map(); // id -> { id, name, createdBy, createdAt, messages, music }
rooms.set("general", {
  id: "general",
  name: "General",
  createdBy: null,
  createdAt: Date.now(),
  messages: generalLog,
  music: null,
});
for (const [id, room] of (await loadRooms()).entries()) {
  rooms.set(id, room);
}
const presence = new Map(); // userId -> { id, name, avatar }
const voiceRoster = new Map(); // userId -> VoiceParticipant
const socketsByUser = new Map(); // userId -> socket (WebRTC signaling relay)
const sharedNotes = new Map(); // id -> { id, title, content, updatedAt, updatedBy }

function toPresenceList() {
  return [...presence.values()];
}

function toVoiceList() {
  return [...voiceRoster.values()];
}

function roomList() {
  return [...rooms.values()].map((r) => ({
    id: r.id,
    name: r.name,
    members: io.sockets.adapter.rooms.get(r.id)?.size || 0,
  }));
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
  socket.emit("chat:rooms", roomList());
  socket.emit("chat:history", { messages: generalLog }); // legacy general-room history
  socket.emit("presence", toPresenceList());
  socket.emit("voice:state", toVoiceList());

  socket.on("chat:join", (user) => {
    userId = user?.id || socket.id;
    presence.set(userId, {
      id: userId,
      name: user?.name || "Guest",
      avatar: user?.avatar || null,
    });
    socketsByUser.set(userId, socket);
    socket.broadcast.emit("presence", toPresenceList());
  });

  // ---- Chat rooms (each room: own log + shared music state) ----

  // Join a room: native socket.io rooms scope message/music fan-out to members.
  socket.on("chat:join-room", (payload) => {
    const roomId = payload?.roomId;
    if (!roomId || !rooms.has(roomId)) return;
    if (socket.data.roomId) socket.leave(socket.data.roomId);
    socket.data.roomId = roomId;
    socket.join(roomId);
    const room = rooms.get(roomId);
    socket.emit("chat:room-history", { roomId, messages: room.messages.slice(-MESSAGE_LIMIT) });
    socket.emit("chat:music-state", { roomId, music: room.music });
  });

  // Create a room: the creator is switched into it, everyone gets the new list.
  socket.on("chat:create-room", (payload) => {
    const name = String(payload?.name || "").trim().slice(0, 40);
    if (!name) return;
    const id = "room-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const room = { id, name, createdBy: userId || null, createdAt: Date.now(), messages: [], music: null };
    rooms.set(id, room);
    persistRoom(room);
    if (socket.data.roomId) socket.leave(socket.data.roomId);
    socket.data.roomId = id;
    socket.join(id);
    socket.emit("chat:room-created", { roomId: id, name: room.name });
    socket.emit("chat:room-history", { roomId: id, messages: [] });
    socket.emit("chat:music-state", { roomId: id, music: null });
    io.emit("chat:rooms", roomList());
  });

  // New chat message → append to the room's log and relay to everyone in it
  // (sender included; clients dedupe by id).
  socket.on("chat:message", async (msg) => {
    if (!msg?.id || typeof msg.content !== "string" || !msg.content.trim()) return;
    const roomId = msg.roomId || socket.data.roomId || "general";
    const room = rooms.get(roomId);
    if (!room) return;
    const entry = await appendRoomMessage(roomId, msg);
    room.messages.push(entry);
    if (room.messages.length > MESSAGE_LIMIT) room.messages.shift();
    io.to(roomId).emit("chat:message", entry);
  });

  // Reaction intents are relayed within the room and recorded so counts
  // survive restarts (each client still keeps its own live counters).
  socket.on("chat:reaction", (payload) => {
    const roomId = payload?.roomId || socket.data.roomId || "general";
    const { messageId, emoji } = payload || {};
    if (!messageId || !emoji) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const stored = room.messages.find((m) => m.id === messageId);
    if (stored) {
      stored.reactions = { ...(stored.reactions || {}) };
      stored.reactions[emoji] = (stored.reactions[emoji] || 0) + 1;
    }
    incrementReaction(messageId, emoji);
    io.to(roomId).emit("chat:reaction", { roomId, messageId, emoji });
  });

  // Shared music: whoever changes the track or playback updates the whole room.
  socket.on("music:update", (payload) => {
    const roomId = payload?.roomId || socket.data.roomId || "general";
    const room = rooms.get(roomId);
    if (!room) return;
    const m = payload?.music;
    room.music = m
      ? {
          videoId: String(m.videoId || "").slice(0, 200),
          title: String(m.title || "Unknown").slice(0, 120),
          artist: String(m.artist || "").slice(0, 120),
          isPlaying: !!m.isPlaying,
        }
      : null;
    saveRoomMusic(roomId, room.music);
    io.to(roomId).emit("chat:music-state", { roomId, music: room.music });
  });

  // ---- Voice huddle roster sync (join / leave / mute / role updates) ----
  socket.on("voice:join", (participant) => {
    if (!participant?.id) return;
    userId = participant.id;
    socket.data.voiceUserId = participant.id;
    socketsByUser.set(userId, socket);
    const p = {
      id: participant.id,
      name: participant.name || "Guest",
      avatar: participant.avatar || null,
      isMuted: !!participant.isMuted,
      isSpeaking: false,
      role: participant.role || "Participant",
      conn: socket.id, // unique per connection — used to break offer/answer ties
    };
    voiceRoster.set(p.id, p);
    // Everyone (including the joiner) gets the full roster so each client can
    // reconcile its WebRTC peer connections.
    io.emit("voice:state", toVoiceList());
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
    const participantId = id || socket.data.voiceUserId || userId;
    if (!participantId) return;
    socket.data.voiceUserId = null;
    if (voiceRoster.delete(participantId)) {
      socketsByUser.delete(participantId);
      socket.broadcast.emit("voice:state", toVoiceList());
    }
  });

  // WebRTC signaling relay: routes offers/answers/ICE candidates between
  // huddle peers so real peer-to-peer audio flows with no third-party service.
  socket.on("voice:signal", (payload) => {
    const to = payload?.to;
    const signal = payload?.signal;
    const senderId = payload?.from || socket.data.voiceUserId || userId;
    if (!to || !signal || to === senderId) return;
    let target = socketsByUser.get(to);
    // Fallback: look up peer in voice roster by conn/socket ID if not found by user ID
    if (!target) {
      const peer = voiceRoster.get(to);
      if (peer?.conn) {
        target = io.sockets.sockets.get(peer.conn);
      }
    }
    if (target?.connected) {
      target.emit("voice:signal", { from: senderId, signal });
    }
  });

  // ---- Shared notes (real-time collaborative editing) ----
  socket.on("notes:list", () => {
    socket.emit("notes:list", [...sharedNotes.values()]);
  });

  socket.on("notes:create", (payload) => {
    const note = {
      id: "note-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: String(payload?.title || "Untitled").slice(0, 200),
      content: "",
      updatedAt: Date.now(),
      updatedBy: userId || "Anonymous",
    };
    sharedNotes.set(note.id, note);
    io.emit("notes:update", note);
  });

  socket.on("notes:update", (payload) => {
    if (!payload?.id) return;
    const existing = sharedNotes.get(payload.id);
    const note = {
      id: payload.id,
      title: String(payload.title ?? existing?.title ?? "Untitled").slice(0, 200),
      content: String(payload.content ?? existing?.content ?? ""),
      updatedAt: Date.now(),
      updatedBy: userId || "Anonymous",
    };
    sharedNotes.set(note.id, note);
    socket.broadcast.emit("notes:update", note);
  });

  socket.on("notes:delete", (payload) => {
    if (!payload?.id) return;
    sharedNotes.delete(payload.id);
    socket.broadcast.emit("notes:delete", { id: payload.id });
  });

  socket.on("disconnect", () => {
    const voiceId = socket.data.voiceUserId || userId;
    if (voiceId) {
      voiceRoster.delete(voiceId);
      socketsByUser.delete(voiceId);
      socket.broadcast.emit("voice:state", toVoiceList());
    }
    if (userId) {
      presence.delete(userId);
      socketsByUser.delete(userId);
      socket.broadcast.emit("presence", toPresenceList());
    }
  });
});

httpServer.listen(port, () => {
  console.log(
    `> DevDeck ready on http://${hostname}:${port} (${dev ? "development" : "production"}) · Socket.io mounted on /socket.io`
  );
});