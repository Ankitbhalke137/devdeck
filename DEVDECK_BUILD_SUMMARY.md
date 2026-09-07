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
| **4** | Real-Time Chat, Voice Huddles & Multi-Model AI | ⚠️ In Progress |

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
- DevDeck logo (clickable)
- Workspace switcher dropdown (Personal Dev, Team Alpha, Org Beta)
- Command palette trigger (⌘K)
- Voice huddle indicator ("2 in Voice" with pulsing dot)
- Presence badge ("Coding - Deep Work")
- Notification bell (3 notifications)
- User profile dropdown

### Sidebar (Collapsible)
- Width: 160px (expanded) / 48px (collapsed)
- Navigation shortcuts: Dashboard, Tasks, AI Assistant, Resources, Dev Tools, Chat, Focus, Settings
- Quick action: "+ Add Widget" button
- Collapsible arrow/chevron toggle

### StatusBar
- System status: "🟢 Coding - Deep Work"
- Widget count: "12 widgets"
- Task count: "42 tasks"
- Focus timer: "2h 15m focus"
- WebSocket status: "📡 WS active"
- RAM usage: "💾 87% RAM"

### WorkspaceCanvas
- 12-column CSS grid layout
- Default 6-widget layout:
  - AI Assistant (6x8)
  - Taskboard (4x10)
  - Resources (4x6)
  - Dev Tools (3x5)
  - Chat (5x6)
  - Focus Station (5x5)
- Drag-and-drop handles on widget headers
- Resizable bottom-right corner handles
- Smooth transitions and animations

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

## � roadmap Next Steps

1. **Vercel AI SDK Integration** - Connect AI Assistant to real AI models with streaming
2. **Spotify Web Playback SDK** - Embedded player with visualizer for Focus Station
3. **Real-time WebSocket chat** - Socket.io integration for live messaging
4. **User authentication** - NextAuth.js with Google OAuth 2.0
5. **PostgreSQL database** - Prisma ORM for persisting tasks, layouts, links
6. **Redis + BullMQ** - Background queue for link health pinging

---