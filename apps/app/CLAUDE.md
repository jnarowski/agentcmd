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
```

### Quality Commands

```bash
pnpm check-types    # TypeScript type checking
pnpm lint           # ESLint
pnpm test           # Vitest tests (parallel execution)
pnpm build          # Production build
```

## Testing

Vitest 4 with parallel execution and database-per-worker isolation (4 workers locally, 2 in CI).

**See:** `.agent/docs/testing-best-practices.md` for comprehensive guide and gold standard examples.

## Architecture

### Client ↔ Server Integration

**REST APIs:**

- Fastify routes at `/api/*`
- JWT authentication via headers
- Type-safe with shared types from `@/shared/types`

**WebSocket (Real-time):**

- Socket.IO + EventBus for decoupled event handling
- Channels: colon notation (`session:123`)
- Events: dot notation (`session.stream_output`)

**See:** `.agent/docs/websocket-architecture.md` and Root CLAUDE.md for conventions.

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

**See:** Root CLAUDE.md for CRUD naming conventions and `.agent/docs/backend-patterns.md` for comprehensive patterns.

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
