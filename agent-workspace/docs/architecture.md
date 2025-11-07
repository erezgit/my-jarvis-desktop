# My Jarvis Desktop Architecture

**Version**: 1.33.7
**Status**: ✅ Production-Ready Cloud Application
**Framework**: React 19 + TypeScript + Claude Code WebUI + Fly.io

> **Deployment**: See [deployment.md](./deployment.md) for deployment instructions and repository information.

---

## Overview

My Jarvis Desktop is a cloud-deployed AI-powered web application featuring a three-panel IDE-like interface. Built on the claude-code-webui foundation, it combines a file tree browser, file preview system, and Claude AI chat in a responsive, resizable layout deployed on Fly.io.

**Tech Stack**:
- **Frontend**: React 19, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Hono server (port 10000), WebSocket terminal (port 3001)
- **AI SDK**: @anthropic-ai/claude-code 1.0.108
- **Deployment**: Docker + Fly.io with persistent volumes
- **Build**: Vite

---

## Core Architecture

### Three-Panel IDE Layout

**Desktop Layout** (3 resizable panels):
- File Tree (20% default) - VirtualizedFileTree with directory browsing
- File Preview (50% default) - Markdown/MDX rendering with syntax highlighting
- Chat Panel (30% default) - Claude AI integration

**Mobile Layout** (single panel with tabs):
- Uses `h-dvh` (dynamic viewport height) for proper mobile browser bar handling
- Single ChatPage instance shared between desktop and mobile (no duplication)
- Sticky navigation with panel/view switchers
- MobileScrollLock component prevents scroll during interactions

### Message Processing Pipeline

**UnifiedMessageProcessor** (`app/utils/UnifiedMessageProcessor.ts`):
- Transforms Claude SDK NDJSON messages into UI-ready message objects
- Caches tool_use information for intelligent result processing
- Handles both real-time streaming and batch history with identical logic
- Extensible pattern for custom message types (voice, todo, etc.)

**Message Types**:
- ChatMessage, ToolMessage, VoiceMessage, TodoMessage, ThinkingMessage, PlanMessage

**Key Capabilities**:
- Voice message detection (jarvis_voice.sh in Bash results)
- Token usage extraction and tracking
- Permission error handling and approval workflows

### Voice Message System

**Integration**: OpenAI TTS via `jarvis_voice.sh` script

**Flow**:
1. Claude executes `./tools/src/jarvis_voice.sh --voice echo "[message]"` via Bash tool
2. Script calls OpenAI TTS API, generates MP3 in `/workspace/tools/voice/`
3. UnifiedMessageProcessor detects voice file path in Bash result and creates VoiceMessage
4. Frontend auto-plays during streaming with HTML5 Audio API
5. Global tracker prevents replay on component remount

**Components**:
- VoiceMessageComponent (play/pause controls, progress slider, transcript display)
- voicePlayedTracker (global singleton to track played/playing/failed states)

### Token Usage Tracking

**Architecture**: Context → Hook → Component pattern
- `TokenUsageContext` - Global state management
- `useTokenUsage` - Hook for accessing token data
- `TokenContextBar` - UI visualization with gradient colors

**Tracking**: 200K context window, cumulative session tracking, real-time percentage display

### Workspace Management

**SettingsContext Integration**:
- `workingDirectory` - Claude Code working directory (always `/workspace` in production)
- `fileTreeDirectory` - File tree display directory (user-configurable)
- Both stored in SettingsContext alongside theme and enterBehavior
- Auto-persisted to localStorage
- Reactive file tree updates via useEffect dependency
- No prop drilling or state duplication

**Workspaces**: My Jarvis, My Jarvis Onboarding (easily extensible)

### File Preview System

**Markdown Rendering**: react-markdown with GitHub Flavored Markdown (remark-gfm)

**MDX Support**: next-mdx-remote for interactive React components

**Custom MDX Components**:
- AgentStatus, MetricCard, TaskProgress, ArchitectureDiagram
- TicketStack (visual ticket planning with collapsible cards)
- OnboardingTicketV1/V2/V3 (progressive onboarding experience)

**Features**:
- Syntax highlighting (rehype-highlight)
- Dark/light mode support
- PDF viewer (@react-pdf-viewer)
- Sandpack integration for live code preview

---

## Project Structure

```
my-jarvis-desktop/
├── app/                            # React frontend
│   ├── components/
│   │   ├── Layout/                 # ResponsiveLayout, DesktopLayout, MobileLayout
│   │   ├── FileTree/               # VirtualizedFileTree
│   │   ├── FilePreview/            # FilePreview, PDFViewer, SandpackPreview, MDX support
│   │   ├── ChatPage.tsx            # AI chat interface (shared between desktop/mobile)
│   │   ├── chat/                   # ChatInput, ChatMessages, Permission panels, MobileScrollLock
│   │   ├── messages/               # MessageContainer, VoiceMessageComponent, FileOperationComponent
│   │   ├── settings/               # GeneralSettings, SettingsModal
│   │   ├── terminal/               # WebTerminal, ElectronTerminal
│   │   └── ui/                     # shadcn/ui components (Slider, etc.)
│   ├── contexts/
│   │   ├── SettingsContext.tsx     # Theme, workingDirectory, fileTreeDirectory, enterBehavior
│   │   ├── ChatStateContext.tsx    # Messages, session state
│   │   ├── TokenUsageContext.tsx   # Token tracking
│   │   └── MessageProcessorContext.tsx  # UnifiedMessageProcessor provider
│   ├── hooks/
│   │   ├── chat/                   # useChatState, usePermissions, usePermissionMode, useAbortController
│   │   ├── streaming/              # useMessageProcessor, useStreamParser
│   │   ├── useClaudeStreaming.ts
│   │   ├── useSettings.ts
│   │   ├── useTokenUsage.ts
│   │   ├── useHistoryLoader.ts
│   │   └── useMessageConverter.ts
│   ├── utils/
│   │   ├── UnifiedMessageProcessor.ts  # ⭐ Core message transformation
│   │   ├── messageTypes.ts
│   │   ├── messageConversion.ts
│   │   ├── toolUtils.ts
│   │   ├── pathUtils.ts
│   │   ├── thinkingMessageGenerator.ts
│   │   └── presentation-pdf-exporter.ts
│   ├── lib/
│   │   └── voice-played-tracker.ts  # Global voice playback state tracker
│   ├── types/
│   │   └── settings.ts
│   ├── config/
│   │   ├── api.ts
│   │   └── deployment.ts
│   ├── App.tsx
│   └── main.tsx                    # Vite entry point
├── lib/
│   └── claude-webui-server/        # Hono backend server
│       ├── cli/node.ts             # Server entry point
│       ├── handlers/               # API request handlers
│       └── history/                # Chat history processing
├── scripts/
│   ├── init-claude-config.sh       # Auto-runs on container start
│   ├── setup-new-app.sh            # Manual - once after first deploy
│   ├── health-check.sh             # Health monitoring script
│   └── health-monitor.sh           # Continuous health monitoring
├── Dockerfile                      # Docker build configuration
├── fly.toml                        # Fly.io deployment (2GB memory, ports 10000/3001)
├── package.json                    # Version 1.33.7
└── vite.web.config.mts             # Vite build configuration
```

---

## Key Features

### Production AI Chat
- Real-time streaming with NDJSON responses
- Comprehensive message types (chat, tool, plan, todo, thinking, voice)
- Session management and conversation history
- Tool use support with permission approval workflows
- Request cancellation with abort controllers

### Voice Integration
- OpenAI TTS via jarvis_voice.sh
- Auto-play during streaming
- Manual controls (play/pause) with transcript display
- Seamless integration via UnifiedMessageProcessor

### UI/UX Design
- Neutral color palette (neutral-50/100/200/600/700)
- Green-100 user messages with sans-serif font
- Transparent thinking/loading messages
- Static input field with minimal styling
- Dark/light mode support

### Cloud Deployment
- Docker containerization
- Fly.io platform with auto-scaling
- Persistent volumes (10GB at /workspace)
- Multi-user support with isolated instances
- 2GB memory, shared CPU

---

## Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Fly.io
./deploy.sh
```

### Entry Point
- `app/main.tsx` - Vite entry point
- Port 10000 (HTTP/HTTPS)
- Port 3001 (WebSocket terminal)

---

## Deployment Architecture

### Three-Layer System
1. **Docker Image** (`/app/`) - Application code, built during deployment
2. **Persistent Volume** (`/workspace/`) - User data, chat history, workspace files
3. **Ephemeral Runtime** (`/root/`) - Temporary files, recreated on restart

### Key Scripts
- `init-claude-config.sh` - Automatic on every container start (creates .claude symlinks)
- `setup-new-app.sh` - Manual once after first deployment (copies workspace template)

### Configuration
- **Memory**: 2GB (fly.toml)
- **Ports**: 10000 (HTTP), 3001 (WebSocket)
- **Environment**: PORT, TERMINAL_WS_PORT, NODE_ENV, WORKSPACE_DIR

See [deployment.md](./deployment.md) for complete deployment procedures.

---

## License

Proprietary - Privately owned by Erez Fern

## Contributors

- Erez Fern (@erezgit)

---

*Last Updated: 2025-11-01*
*Version: 1.33.7*
*Architecture: Three-Panel Cloud IDE with Voice Integration*
