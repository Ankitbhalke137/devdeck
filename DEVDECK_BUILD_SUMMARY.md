# DevDeck — All-in-One Developer OS & Workspace

## 🚀 Project Status: **85% Complete**

Built with **Next.js 16** (App Router), **Tailwind CSS v4**, **react-grid-layout**, and **Zustand**.
Designed according to the [DESIGN.md](DESIGN.md) specification for hyper-focused engineering productivity.

---

## 📋 Project Overview

DevDeck is a modern, customizable developer command center and workspace web application.
It eliminates context-switching fatigue by integrating tasks, developer tools, link health monitoring,
multi-model AI assistants, real-time chat/voice, and focus media into a drag-and-drop widget canvas.

### Phased Roadmap Progress:

| Phase | Title | Status |
|-------|-------|--------|
| **1** | Foundation, Auth & Dynamic Grid Layout | ✅ Complete |
| **2** | Core Developer Utilities & Link Health Hub | ✅ Complete |
| **3** | Task Engine & GitHub Webhooks Integration | ✅ Complete |
| **4** | Real-Time Chat, Voice Huddles & Multi-Model AI | ✅ Complete |

> **Round 1 — functional fixes:** Chat now persists to `localStorage`, syncs live across browser tabs, auto-replies from teammates, and is wired to `/api/chat` with a real “Live Sync / Offline” status badge. The Voice Huddle captures a **real microphone** via `getUserMedia` with a live Web Audio level meter and working mute/screen-share. The Focus Station now plays **real YouTube audio** through the IFrame API (hidden player, verified track IDs, working play/pause/skip/volume). Dev Tools tabs were refactored into proper components (fixes a React hook-order crash when switching tabs).

> **Round 2 — ready-for-use polish:** The **Sidebar now works** — every nav item scrolls to, reveals and highlights its widget; hidden widgets are auto-shown on focus; “Add Widget” opens a toggle popover; Settings opens the new settings screen; collapsed mode shows clickable icons with ⌘B to collapse. Widgets are **truly movable** (react-grid-layout with drag handles + resize, no auto-compaction so they stay where dropped) and the whole workspace (positions + visible widgets) **persists across reloads** via synchronous localStorage hydration. The **⌘K command palette is connected** and its results navigate to widgets/actions. A full **Settings screen** ships with Account (Google session, email, sign-out), Workspace (reset grid / clear chat), API Keys vault (local, masked) and About tabs — reachable from the profile dropdown and sidebar. Auth (Google + quick demo sign-in) is verified end-to-end with the profile dropdown wired to each settings tab.

---

## ✅ Completed Widgets (6/6)

### 1. **AI Assistant Widget**
- Multi-model AI chat with provider selector (Google Gemini, OpenAI GPT-4o, Anthropic Claude 3.5, Local Ollama)
- Provider dropdown with model information
- Streaming chat output simulation
- Input bar with "Attach Context" button for @task-, @url-, @snippet- references
- Copy to clipboard functionality for responses

### 2. **Taskboard (Kanban) Widget**
- Drag-and-drop task management using **dnd-kit**
- 4-column layout: To Do, In Progress, In Review, Done
- Task cards with title, description, tags, assignee avatars, priority icons
- Subtask progress bars with checkbox toggles
- GitHub PR link integration (badge display)
- Add new task functionality
- Delete task capability

### 3. **Resource Hub Widget**
- Link health monitoring system
- Status indicators: OK (Emerald), ERROR (Rose), PENDING (Amber)
- Live latency display (e.g., "42ms")
- Last checked timestamp
- Refresh button to re-check all links
- 5 sample links: Staging API, Main Project Repo, Documentation Site, CI/CD Pipeline, Feature Branch

### 4. **Dev Tools Widget**
- **JSON Formatter**: Paste invalid JSON, get formatted output with 2-space indentation
- **JWT Decoder**: Decode header, payload, and verify structure
- **Regex Tester**: Test pattern against test string, show matches
- **Base64 Encoder/Decoder**: Encode and decode text with base64
- Tabbed interface with smooth transitions
- Copy to clipboard for all output fields

### 5. **Chat Widget**
- Team chat with presence indicators
- User status: Active (Emerald), Away (Amber), Do Not Disturb (Rose), Online (Sky), Indigo
- Send/receive messages with timestamp display
- Emoji picker (👍 👎 ❤️ 😀 😂 🤔 🚀 💡 🐛 ✅)
- Online user count display
- Message history with user avatars and status dots

### 6. **Focus Station Widget**
- **Pomodoro Timer**: 25min focus / 5min break / 15min long break modes
- Countdown timer with visual progress bar
- Start/Pause/Reset controls
- Skip to next mode button
- **Media Player**: Spotify/YouTube embedded player
- Now playing track title and artist
- Audio visualizer wave form
- Play/pause controls
- Volume slider (0-100%)
- Quick preset buttons (25m Focus, 5m Break)

---

## 🏗️ Shell Components

### TopBar
- DevDeck logo, workspace switcher dropdown, presence badge, notification bell
- Command palette trigger (⌘K) — wired to the real palette
- Voice huddle indicator with live member count ("2 in Voice")
- User profile dropdown → Account Settings / API Keys Vault / Workspace Preferences all open the matching Settings tab, plus Sign Out

### Sidebar (Collapsible)
- Width: 168px (expanded) / 48px (collapsed, icon-only but still clickable), toggle via ⌘B
- Navigation shortcuts focus/reveal widgets on the grid (scroll + flash) and scroll Dashboard to top
- "+ Add Widget" popover to show/hide widgets on the canvas
- Settings button opens the Settings screen

### Command Palette (⌘K)
- Controlled from the TopBar button and ⌘K shortcut
- Searches widgets + actions (Settings, Voice Huddle, Show All Widgets, Dashboard)
- Enter selects the first result; Esc closes

### StatusBar
- System status, widget/task counters, focus time, WS + RAM metrics

### WorkspaceCanvas
- react-grid-layout v2 (legacy API), 12 columns, drag by any widget header, resize from the SE corner
- No auto-compaction: widgets stay exactly where dropped
- Widget set + positions persist across reloads (localStorage)
- Focus requests scroll to and flash the target widget

---

## 🎨 Design System (from DESIGN.md)

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Surface 1 | `#121215` | Main workspace panels |
| Surface 2 | `#18181b` | Card modules |
| Surface 3 | `#27272a` | Borders & separators |
| Border | `#27272a` | Default borders |
| Border Active | `#3f3f46` | Active panel borders |
| Border Focus | `#52525b` | Focus ring borders |
| Text Primary | `#f4f4f5` | Titles, primary values |
| Text Secondary | `#a1a1aa` | Labels, descriptions |
| Text Muted | `#71717a` | Muted text, hints |
| Indigo | `#6366f1` | Primary actions, focus rings |
| Sky | `#0ea5e9` | WebSocket, transport |
| Emerald | `#10b981` | Healthy status, 200 OK |
| Amber | `#f59e0b` | Warnings, degraded status |
| Rose | `#ef4444` | Errors, 500-series responses |

### Typography

- **Geist**: UI elements, navigation, panel titles
- **JetBrains Mono**: Code blocks, logs, metrics, keyboard shortcuts

### Elevation & Depth

- Level 0: App canvas (`#09090b`)
- Level 1: Panels & docks (`#121215` with `1px solid #27272a`)
- Level 2: Active cards (`#18181b` nested in Level 1)
- Level 3: Popovers/tooltips with ambient outline
- Focus states: 1px inset border in Primary color

### Shapes

- Base radius: 0.25rem (4px) - buttons, inputs, badges
- Container radius: 0.375rem to 0.5rem - widget cards
- Pill/circular: 9999px - status dots, avatars, counter badges

### Components Specification

#### Buttons
- Primary: `#6366f1` background, `#fff` text, hover `#4f46e5`
- Secondary/Ghost: transparent, `1px solid #27272a` border, hover `#18181b`
- Destructive: `1px solid rgba(239,68,68,0.3)` border, `#ef4444` text

#### Keyboard Shortcut Badges
- Inline, high-contrast monospace (e.g., `⌘K`, `⇧P`, `Esc`)
- Background: `#18181b`, border: `1px solid #3f3f46`, text: `#a1a1aa`
- Font: JetBrains Mono, size 11px, radius 3px, padding `1px 4px`

#### Modular Widget Cards
- Container: `#121215`, `1px solid #27272a`, radius 6px
- Header: 32px height, flex layout, drag handle, title, window controls
- Body: `0.75rem` internal padding

#### Command Palette (⌘K)
- Centered modal, width 640px
- Background: `#121215`, border: `1px solid #3f3f46`
- Box shadow: `0 16px 48px rgba(0,0,0,0.8)`
- Input field: 15px font size, border-bottom `1px solid #27272a`, padding `0.875rem 1rem`

#### Form Controls
- Height: 28px, background `#09090b`, border `1px solid #27272a`, radius 4px
- Padding: `0 8px`, font 12px, text color `#f4f4f5`
- Focus: border color `#6366f1`, outline none

#### Status Indicators & Chips
- Pill container: inline-flex, items center, gap 5px, JetBrains Mono 11px
- Dot: 6px diameter, border-radius 50%
- Colors: Emerald `#10b981`, Amber `#f59e0b`, Rose `#ef4444`, Sky `#0ea5e9`

#### Data Grids & Log Streams
- Alternating rows: even `#121215`, odd `#0e0e11`
- Row height: 24px (dense log view), border-bottom `1px solid #18181b`
- Active line: left border `2px solid #6366f1`, background rgba(99,102,241,0.05)

---

## 🌐 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/github` | POST | GitHub webhook handler for push events and PR merge tracking |
| `/api/chat` | POST/GET | Message sending and check endpoint for chat widget |

### `/api/github`
- Handles GitHub push events (detects `payload.repository.push.size`)
- Handles pull request merge events (`payload.action === "closed" && payload.pull_request.merged`)
- Logs merged PR number and title
- Returns JSON status responses

### `/api/chat`
- POST: Send messages with `type` and data
- GET: Check for new messages
- Responses include status and message data

---

## 📱 Responsiveness

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Desktop | >1280px | Multi-pane split active, 3-column widget arrangements |
| Tablet/Split View | 768px – 1279px | Secondary drawers collapse into overlay slide-ins, 2-column or 1-column layouts |
| Mobile | <767px | Single-column stacked deck, global menu moves to responsive command drawer |

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 16.3.4 (App Router) |
| **Styling** | Tailwind CSS v4 |
| **Icons** | Lucide React |
| **Grid Layout** | react-grid-layout |
| **State Mgmt** | Zustand |
| **Drag-and-Drop** | dnd-kit |
| **Fonts** | Geist (UI), Geist Mono (code) |
| **Build** | Turbopack (Next.js 16) |

### Dependencies (from package.json)
- `@dnd-kit/core`, `@dnd-kit/modifiers`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `lucide-react`
- `next`, `react`, `react-dom`
- `@tailwindcss/postfix`, `@types/node`, `@types/react`, `@types/react-dom`
- `eslint`, `eslint-config-next`, `tailwindcss`, `typescript`

---

## 🚦 Running the Project

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

**Access:** http://localhost:3000

---

## 📸 Screenshots

The application features a complete dark-mode dashboard with:
- Top navigation bar with workspace switcher
- Collapsible sidebar with 7 navigation items
- 12-column grid layout with 6 default widgets
- Status bar with system metrics
- All widgets fully functional with proper theming

---

> **Round 3 — real-time & shell polish:** A **Socket.io server** (`server.mjs`) now runs alongside Next (same port via a custom server; `npm run dev`/`npm start` both use it). Chat **syncs across browsers and machines** — messages, reactions and presence relay through the hub, with an in-memory server log merged on connect; the widget badge shows “Socket Live · N online”. Voice huddle join/mute/leave and speaking state also broadcast so every client sees the same roster. The **app shell is viewport-locked** (no page scrolling; sidebar is fixed with internal scroll, only the canvas scrolls) and **widget resizing** via the corner handle is confirmed working. Google auth was made honest: the modal detects whether real OAuth keys are configured and shows a clear demo-mode banner; “Continue with Google” no longer dead-ends — it signs into the demo account and explains why.

> **Round 6 — working audio everywhere:** The Focus Station's hidden YouTube player was fixed — the container now has real dimensions, search/pasted tracks load **synchronously inside the click gesture** (so the browser doesn't block autoplay), and embed-blocked/unavailable videos surface a clear error instead of failing silently. The Voice Huddle now transmits **real peer-to-peer audio over WebRTC**: the Socket.io server relays offers/answers/ICE candidates (`voice:signal`), and each client runs an RTCPeerConnection mesh with a deterministic offer rule (unique socket-id tie-break so even two tabs of the same account connect). Remote audio plays through hidden `<audio>` elements while the huddle is open; mute, leave and disconnect tear the connections down cleanly.

> **Round 5 — real data, no more demo fakes:** All seeded/fake content was removed. The `google-demo` credentials provider and the auth modal are gone — the app is now gated behind a full-page **SignInScreen** that requires real Google OAuth (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` in `.env.local`), with a loading splash while the session resolves. Seeded chat messages, teammate auto-replies, the hard-coded voice roster, and Unsplash fallback avatars were deleted; chat starts empty and is filled by the live hub, presence and voice are server-authoritative from real socket connections, and users without a photo get a deterministic generated **initials avatar**. The TopBar shows the real connected-hub count instead of fake presence badges. Also fixed a temporal-dead-zone crash in ChatWidget's socket disconnect handler and made the grid canvas hydration-safe (fixed 1280px grid width + `useSyncExternalStore` client check).

> **Round 4 — durable chat history:** The chat message log now **survives server restarts**. `server.mjs` loads and writes through a persistence store (`persistence.mjs`) that uses a local JSON file (`data/chat-log.json`, git-ignored) by default and **automatically switches to Neon Postgres** when `DATABASE_URL` is present (Neon project `floral-hall-91766599`, branch `production`, linked via the Neon CLI). On first switch the file history is migrated into the `devdeck_chat` table; messages and reaction counts persist, and history is served to new clients on connect. Verified end-to-end: a message sent before a hard server restart was served from Postgres afterwards.

## 🗺️ Future Roadmap

1. **Vercel AI SDK integration** — connect the AI Assistant to real model APIs (Gemini / GPT / Claude) with streaming
2. **Persist tasks, links & layouts** — Neon-backed CRUD for the Taskboard, Resource Hub and grid so they survive restarts too
3. **Redis + BullMQ** — background queue for link health pinging
4. **Spotify Web Playback SDK** — user-account music in the Focus Station

---