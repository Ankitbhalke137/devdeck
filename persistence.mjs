// Persistent message log for the DevDeck chat hub.
//
// Two backends:
//   1. "file"  – a local JSON file (data/chat-log.json). Always available,
//                no credentials required. Chat survives server restarts.
//   2. "neon"  – serverless Postgres (Neon), activated automatically when
//                DATABASE_URL is present in the environment.
//
// The rest of the server talks to this module through loadMessages /
// appendMessage / incrementReaction, so the runtime always has the history
// available again after a restart.

import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "data");
const LOG_FILE = join(DATA_DIR, "chat-log.json");
const MESSAGE_LIMIT = 200;

let backend = "file";
let neonSql = null;
let writeTimer = null;
let memoryCache = null; // used only by the file backend

function currentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ------------------------------ file backend ------------------------------ */

function readFileLog() {
  try {
    if (!existsSync(LOG_FILE)) return [];
    const raw = readFileSync(LOG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function scheduleFileWrite(messages) {
  memoryCache = messages;
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      const tmp = LOG_FILE + ".tmp";
      writeFileSync(tmp, JSON.stringify(memoryCache, null, 2), "utf8");
      renameSync(tmp, LOG_FILE);
    } catch (err) {
      console.error("[persistence] could not write chat log:", err?.message);
    }
  }, 120);
}

/* ------------------------------ neon backend ------------------------------ */

async function ensureNeonTable() {
  try {
    await neonSql`
      CREATE TABLE IF NOT EXISTS devdeck_chat (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        "userId" TEXT,
        "userName" TEXT,
        "userAvatar" TEXT,
        time TEXT,
        "isCode" BOOLEAN NOT NULL DEFAULT false,
        "codeLanguage" TEXT,
        reactions JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  } catch (err) {
    console.error("[persistence] neon init failed:", err?.message);
    throw err;
  }
}

/* --------------------------------- public --------------------------------- */

async function insertMessageNeon(entry) {
  await neonSql`
    INSERT INTO devdeck_chat
      (id, content, "userId", "userName", "userAvatar", time, "isCode", "codeLanguage")
    VALUES
      (${entry.id}, ${entry.content}, ${entry.userId}, ${entry.userName},
       ${entry.userAvatar}, ${entry.time}, ${entry.isCode}, ${entry.codeLanguage})
    ON CONFLICT (id) DO NOTHING
  `;
}

/** Pick a backend and return the messages that should seed the in-memory log. */
export async function initPersistence() {
  if (process.env.DATABASE_URL) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      neonSql = neon(process.env.DATABASE_URL);
      await ensureNeonTable();
      backend = "neon";
      const rows = await neonSql`
        SELECT * FROM devdeck_chat ORDER BY "createdAt" ASC
      `;

      // First switch to Postgres: carry over anything saved in the local file
      // so no history is lost.
      if (rows.length === 0) {
        const fileMessages = readFileLog();
        if (fileMessages.length > 0) {
          for (const m of fileMessages) {
            try {
              await insertMessageNeon(m);
            } catch {
              // skip individual rows that fail
            }
          }
          console.log(`[persistence] migrated ${fileMessages.length} messages from local file to Neon`);
          return fileMessages;
        }
      }

      console.log(`[persistence] neon backend ready · ${rows.length} messages loaded`);
      return rows.map(rowToMessage);
    } catch (err) {
      console.error(
        "[persistence] neon unavailable (" + err?.message + ") — falling back to local file"
      );
      neonSql = null;
    }
  }

  backend = "file";
  const messages = readFileLog();
  console.log(`[persistence] file backend ready (${LOG_FILE}) · ${messages.length} messages loaded`);
  return messages;
}

function rowToMessage(row) {
  return {
    id: row.id,
    content: row.content,
    userId: row.userId || "unknown",
    userName: row.userName || "Guest",
    userAvatar: row.userAvatar || null,
    time: row.time || "",
    isCode: !!row.isCode,
    codeLanguage: row.codeLanguage || undefined,
    reactions: row.reactions || {},
  };
}

/** Persist a new chat message. Returns its normalized entry. */
export async function appendMessage(message) {
  const entry = {
    id: message.id,
    content: message.content,
    userId: message.userId || "unknown",
    userName: message.userName || "Guest",
    userAvatar: message.userAvatar || null,
    time: message.time || currentTime(),
    isCode: !!message.isCode,
    codeLanguage: message.codeLanguage || undefined,
    reactions: {},
  };

  if (backend === "neon") {
    try {
      await insertMessageNeon(entry);
      // Keep the table bounded like the in-memory log.
      await neonSql`
        DELETE FROM devdeck_chat WHERE id NOT IN (
          SELECT id FROM devdeck_chat ORDER BY "createdAt" DESC LIMIT ${MESSAGE_LIMIT}
        )
      `;
    } catch (err) {
      console.error("[persistence] neon insert failed:", err?.message);
    }
    return entry;
  }

  const log = readFileLog();
  log.push(entry);
  while (log.length > MESSAGE_LIMIT) log.shift();
  scheduleFileWrite(log);
  return entry;
}

/** Increment the reaction count on a stored message (fire-and-forget safe). */
export async function incrementReaction(messageId, emoji) {
  if (!messageId || !emoji) return;

  if (backend === "neon") {
    try {
      const rows = await neonSql`SELECT reactions FROM devdeck_chat WHERE id = ${messageId}`;
      if (rows.length === 0) return;
      const reactions = { ...(rows[0].reactions || {}) };
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      await neonSql`
        UPDATE devdeck_chat SET reactions = ${JSON.stringify(reactions)} WHERE id = ${messageId}
      `;
    } catch (err) {
      console.error("[persistence] neon reaction update failed:", err?.message);
    }
    return;
  }

  const log = readFileLog();
  let changed = false;
  for (const m of log) {
    if (m.id === messageId) {
      m.reactions = { ...(m.reactions || {}) };
      m.reactions[emoji] = (m.reactions[emoji] || 0) + 1;
      changed = true;
      break;
    }
  }
  if (changed) scheduleFileWrite(log);
}