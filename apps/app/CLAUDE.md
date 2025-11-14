# apps/app/CLAUDE.md

Full-stack application development guide for agentcmd.

## Overview

**Tech Stack:**
- **Frontend**: React 19, Vite, React Router, TanStack Query, Zustand, Tailwind v4
- **Backend**: Fastify, Prisma (SQLite), Inngest, WebSocket, JWT auth
- **AI**: Claude Code, OpenAI Codex, Gemini (via agent-cli-sdk)

## Development Workflow

### Start Development

```bash
# From apps/app/ - runs client + server + inngest
pnpm dev

# Auto-runs: prisma migrate deploy on start
# Starts:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3456
# - Inngest: http://localhost:8288

# Or run separately:
pnpm dev:client     # Frontend only
pnpm dev:server     # Backend only
```

### Database Commands

```bash
pnpm prisma:generate   # Regenerate Prisma client
pnpm prisma:migrate    # Create migration (prompts for name)
pnpm prisma:studio     # Open database GUI (http://localhost:5555)
pnpm prisma:reset      # Reset database (dev only, destructive)
```

### Quality Commands

```bash
pnpm check-types    # TypeScript type checking
pnpm lint           # ESLint
pnpm test           # Vitest tests (parallel execution)
pnpm build          # Production build
```

## Testing

**Parallel Test Execution**: Tests run in parallel using Vitest 4's worker pool with database-per-worker isolation.

- **Worker databases**: Each worker gets isolated SQLite (`test-worker-1.db`, `test-worker-2.db`, etc.)
- **VITEST_POOL_ID**: Stable worker ID for database naming (1 to maxWorkers)
- **Worker count**: 4 workers locally, 2 in CI
- **Database setup**: `vitest.global-setup.ts` creates all worker databases
- **Per-worker config**: `vitest.setup.ts` sets `DATABASE_URL` using `VITEST_POOL_ID`
- **Cleanup**: Global teardown removes all worker databases

**Gold Standard Tests:**
- `src/server/domain/project/services/__tests__/createProject.test.ts`
- `src/server/routes/__tests__/projects.test.ts`

**See:** `.agent/docs/testing-best-practices.md` for comprehensive guide.

## Architecture

### Client ↔ Server Integration

**REST APIs:**
- Fastify routes at `/api/*`
- JWT authentication via headers
- Type-safe with shared types from `@/shared/types`

**WebSocket (Real-time):**
- Socket.IO for bidirectional communication
- EventBus for decoupled event handling
- Channels: `domain:id` (e.g., `session:123`)
- Events: `domain.action` (e.g., `session.stream_output`)

**Example:**
```typescript
// Backend emits event
eventBus.emit("session.stream_output", {
  sessionId: "123",
  content: "Hello",
});

// Frontend subscribes via WebSocket
socket.emit("subscribe", "session:123");
socket.on("session.stream_output", (data) => {
  setMessages((prev) => [...prev, data.content]);
});
```

**See:** `.agent/docs/websocket-architecture.md` for comprehensive patterns.

### Shared Types

Types shared between client and server live in `src/shared/`:

```
shared/
├── types/           # TypeScript interfaces
├── schemas/         # Zod validation (cross-cutting)
└── prisma.ts        # Prisma client singleton
```

**Pattern:**
```typescript
// Share enums and validation
// src/shared/schemas/workflow.schemas.ts
export const statusSchema = z.enum(["pending", "running", "completed"]);
export type WorkflowStatus = z.infer<typeof statusSchema>;

// Backend uses Prisma types
import { prisma } from "@/shared/prisma";

// Frontend defines custom interfaces
export interface WorkflowRun {
  id: string;
  status: WorkflowStatus; // Uses shared enum
}
```

## Feature Organization

### Frontend - Feature-Based

All related code lives together:

```
pages/projects/sessions/    # Feature
├── components/             # Feature-specific
├── hooks/                  # Feature-specific
├── stores/                 # Feature-specific
├── types/                  # Feature-specific
└── ProjectSession.tsx
```

**See:** `apps/app/src/client/CLAUDE.md` for frontend patterns.

### Backend - Domain-Driven

Business logic organized by domain:

```
server/domain/
├── project/services/
│   ├── getProjectById.ts       # One function per file
│   ├── createProject.ts
│   └── updateProject.ts
├── session/services/
├── workflow/services/
└── */services/
```

**See:** `.agent/docs/backend-patterns.md` for comprehensive patterns.

## Workflow System

Workflows execute via **Inngest** (background jobs) with real-time updates via WebSocket.

**Key Features:**
- Visual workflow builder (@xyflow/react)
- Step types: AI (Claude/Codex/Gemini), Bash, Conditional, Loop
- Real-time execution monitoring
- WebSocket streaming for live updates

**Example Workflow:**
```typescript
const workflow = {
  name: "AI Code Review",
  steps: [
    {
      type: "ai",
      agentType: "claude",
      prompt: "Review this PR",
    },
    {
      type: "bash",
      command: "pnpm test",
    },
  ],
};
```

**Inngest Dev Server:** http://localhost:8288

**See:** `.agent/docs/workflow-system.md` for comprehensive guide.

## CLI Tool Distribution

App published as `agentcmd` npm package:

```bash
# Run without installing
npx agentcmd

# Or install globally
npm install -g agentcmd
agentcmd
```

**CLI Source:** `src/cli/`

## Environment Variables

### Required

```bash
JWT_SECRET=<openssl rand -base64 32>
DATABASE_URL=file:./dev.db
```

### Optional

```bash
PORT=3456
HOST=127.0.0.1
NODE_ENV=development
LOG_LEVEL=info

# AI API Keys (for workflow features)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

**See:** `.env.example` for complete template.

## Deployment

```bash
# Build
pnpm build

# Apply migrations (production)
pnpm prisma migrate deploy

# Start server (with PM2 or Docker)
pm2 start dist/server/index.js --name agentcmd
```

**See:** `.agent/docs/deployment.md` for comprehensive guide.

## Quick Reference

**Ports:**
- Frontend: 5173
- Backend: 3456
- Inngest: 8288
- Prisma Studio: 5555

**File Locations:**
- Database: `prisma/dev.db`
- Logs: `logs/app.log`
- Migrations: `prisma/migrations/`

**Key Patterns:**
- Import from `@/server/`, `@/client/`, `@/shared/`
- One function per file in `domain/*/services/`
- Feature-based frontend organization
- Immutable state updates (Zustand)
- Primitives only in useEffect deps

## Detailed Documentation

### Architecture & Patterns
- `.agent/docs/backend-patterns.md` - Domain services, routes, errors
- `.agent/docs/frontend-patterns.md` - React, state management, hooks
- `.agent/docs/architecture-decisions.md` - Why we chose these technologies

### Systems & Integration
- `.agent/docs/workflow-system.md` - Workflow engine, Inngest
- `.agent/docs/websocket-architecture.md` - Real-time communication
- `.agent/docs/database-guide.md` - Prisma patterns, migrations

### Operations
- `.agent/docs/testing-best-practices.md` - Testing patterns
- `.agent/docs/troubleshooting.md` - Common issues
- `.agent/docs/deployment.md` - Production deployment

### Component Guides
- `apps/app/src/client/CLAUDE.md` - Frontend development
- Root `CLAUDE.md` - Critical rules (imports, React, backend)
