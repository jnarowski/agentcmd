# CLAUDE.md

Project guidance for Claude Code when working in this web app.

## Overview

**Turborepo monorepo** - Full-stack React + Vite frontend, Fastify backend for managing AI agent workflows with Inngest orchestration.

## Commands

```bash
# Development
pnpm dev              # Start all (migrations, Inngest, server, client)
pnpm dev:server       # Backend only (port 3456)
pnpm dev:client       # Frontend only (port 5173)
pnpm inngest          # Inngest dev UI (port 8288)

# Database
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Create/run migrations
pnpm prisma:studio    # Database GUI
pnpm prisma:reset     # Reset DB + flatten migrations (pre-1.0 only)

# Build & Deploy
pnpm build            # Build all (client + server + CLI)
pnpm start            # Production server

# Quality
pnpm lint             # Lint
pnpm check-types      # Type check
pnpm test             # Run tests
```

## Critical Rules

### Import Paths

- ✅ **Always use `@/` aliases** - Never relative imports beyond same directory
  - `@/client/*` - Client code
  - `@/server/*` - Server code
  - `@/shared/*` - Shared code
- ❌ **No file extensions** in imports - `import { foo } from "./bar"` not `"./bar.js"`

### React Hooks

- **useEffect deps**: Only primitives (`id`, `userId`), never objects/arrays from React Query
- **Zustand**: Always immutable updates - `set((s) => ({ messages: [...s.messages, new] }))`
- **Store functions stable** - Safe to omit from useEffect deps with eslint-disable comment

### Types

- **Database fields**: `| null` (Prisma convention)
- **React props**: `?` optional syntax (undefined when omitted)
- **Never mix**: `| null | undefined` always wrong

### Backend

- **Domain-driven architecture** - One function per file in `domain/*/services/`
- **Pure functions** - No classes, explicit params
- **Routes are thin** - Delegate to domain services
- **Return null for "not found"** - Routes decide HTTP status

## Architecture

### Monorepo Structure

```
apps/web/                      # This app
  src/
    cli/                       # CLI tool (npx agentcmd)
      commands/                # install, start, config
      utils/                   # Config management, path helpers
    client/                    # React frontend
      components/              # Shared components
        ui/                    # shadcn/ui (kebab-case)
        ai-elements/           # Chat UI components
      pages/                   # Feature-based organization
        auth/                  # Login, signup
        projects/              # Projects + nested features
          sessions/            # Chat/agents (stores, hooks, components)
          files/               # File editor
          shell/               # Terminal
          workflows/           # Workflow runs
      stores/                  # Global Zustand stores
    server/                    # Fastify backend
      domain/                  # Business logic by domain
        auth/services/         # Authentication functions
        project/services/      # Project CRUD
        sessions/services/      # Agent sessions
        file/services/         # File operations
        git/services/          # Git operations
        shell/services/        # Terminal
        workflow/services/     # Workflow orchestration (Inngest)
          engine/              # Workflow runtime + step implementations
          runs/                # Run management
          events/              # Event tracking
          artifacts/           # Artifact storage
      routes/                  # Thin HTTP handlers
      websocket/               # WebSocket infrastructure
        handlers/              # Session, shell, global handlers
        infrastructure/        # EventBus, subscriptions, metrics
      config/                  # Configuration management
      plugins/                 # Fastify plugins (auth)
    shared/                    # Client + server shared code
      types/                   # Shared types
      schemas/                 # Zod validation schemas
      prisma.ts                # Prisma singleton
  prisma/                      # Database
    schema.prisma              # Schema definition
    migrations/                # Migration files
    dev.db                     # SQLite database
  logs/                        # Server logs
    app.log                    # Primary log file

packages/
  agent-cli-sdk/               # SDK for AI CLI tools (Claude, Codex, Gemini)
  agentcmd-workflows/          # Workflow SDK (used by Inngest integration)
```

### Backend Domain Pattern

**One function per file** - File name matches function name:

```typescript
// ✅ domain/project/services/getProjectById.ts
export async function getProjectById(id: string): Promise<Project | null> {
  return await prisma.project.findUnique({ where: { id } });
}

// ✅ domain/project/services/createProject.ts
export async function createProject(userId: string, data: CreateData) {
  return await prisma.project.create({ data: { ...data, userId } });
}
```

**Import from domain:**

```typescript
import { getProjectById } from "@/server/domain/project/services/getProjectById";
```

### Frontend Feature Organization

**Feature-based structure** - All related code together:

```
pages/{feature}/
  components/       # Feature UI components
  hooks/            # Feature hooks
  stores/           # Feature Zustand stores
  utils/            # Feature utilities
  {Feature}.tsx     # Main page component
```

**Only truly shared code** goes in top-level `components/`, `hooks/`, `utils/`

### Workflow Engine (Inngest)

**Key concepts:**

- Workflows defined in project `.workflows/` directory
- Inngest orchestrates execution with durable steps
- Custom step methods: `phase`, `agent`, `git`, `cli`, `artifact`, `ai`
- All steps tracked in database with events
- WebSocket broadcasts real-time updates

**Custom step types:**

```typescript
step.phase(); // Phase marker (no Inngest wrapping)
step.agent(); // Execute AI agent
step.git(); // Git operations
step.cli(); // Shell commands
step.artifact(); // Store artifacts
step.ai(); // AI SDK calls
step.setupWorkspace(); // Temp workspace
step.cleanupWorkspace(); // Cleanup
```

## Key Patterns

### Error Handling

```typescript
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/server/errors";

// Services return null
export async function getItem(id: string): Promise<Item | null> {
  return await prisma.item.findUnique({ where: { id } });
}

// Routes throw errors
const item = await getItem(id);
if (!item) throw new NotFoundError("Item not found"); // → 404
```

### Route Template

```typescript
import { z } from "zod";
import type { FastifyInstance } from "fastify";

const ParamsSchema = z.object({ id: z.string().uuid() });
const BodySchema = z.object({ name: z.string().min(1) });

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: z.infer<typeof ParamsSchema> }>(
    "/api/items/:id",
    {
      schema: { params: ParamsSchema },
      preHandler: fastify.authenticate, // JWT required
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.id;

      const item = await getItemById(id, userId);
      if (!item) throw new NotFoundError("Item not found");

      return reply.send({ data: item });
    }
  );
}
```

### WebSocket Pattern

**EventBus for broadcasting:**

```typescript
import { webSocketEventBus } from "@/server/websocket/infrastructure";

// Broadcast to project channel (channels use colons)
webSocketEventBus.emit("project:123", {
  type: "workflow.run.updated", // Events use dot notation
  data: { run_id: "456", changes: { status: "completed" } },
});

// Client subscribes in handler
webSocketEventBus.subscribe("project:123", (msg) => {
  socket.send(JSON.stringify(msg));
});
```

**Event naming conventions:**

- **Channels**: Use colons for namespacing (`session:123`, `project:abc`) - Phoenix Channels pattern
- **Events**: Use dots for hierarchy (`session.stream_output`, `workflow.run.updated`) - JavaScript/WebSocket standard

### State Management

**Zustand for client state:**

```typescript
// Store definition
export const useSessionStore = create<SessionStore>((set) => ({
  messages: [],
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg], // ✅ Immutable
    })),
}));

// Usage with selector
const messages = useSessionStore((s) => s.messages); // ✅ Only re-renders when messages change
```

**TanStack Query for server state:**

```typescript
const { data: projects } = useQuery({
  queryKey: ["projects"],
  queryFn: async () => {
    const res = await apiClient.get("/api/projects");
    return res.data.data;
  },
});
```

## CLI Tool

**Production distribution** via `npx agentcmd`:

```bash
# First-time install
npx agentcmd install   # Creates ~/.agentcmd/ with config, DB, logs

# Start server
npx agentcmd start     # Ports: 3456 (main), 8288 (Inngest)
npx agentcmd start --port 8080 --inngest-port 9000

# Config management
npx agentcmd config --show
npx agentcmd config --edit
npx agentcmd config --get port
npx agentcmd config --set port=7000
```

**Rebranding:** Change `CLI_NAME` in `src/cli/utils/constants.ts`

**Config priority:** CLI flags > config.json > defaults

## Environment Variables

**Required:**

- `JWT_SECRET` - Generate: `openssl rand -base64 32`

**Optional:**

- `PORT=3456` - Backend port
- `HOST=127.0.0.1` - Server host
- `LOG_LEVEL=info` - Logging level (trace, debug, info, warn, error, fatal)
- `ANTHROPIC_API_KEY` - For AI features
- `NODE_ENV=development` - Environment

**Config Access:**

All config accessed via centralized module with Zod validation:

```typescript
import { config } from '@/server/config';

const port = config.server.port;
const jwtSecret = config.jwt.secret;
const apiKey = config.apiKeys.anthropicApiKey;
const workflowAppId = config.workflow.appId;
```

## Database

**SQLite with Prisma ORM**

**Key models:**

- `User` - Authentication
- `Project` - Project management
- `AgentSession` - Chat sessions
- `WorkflowRun` - Workflow executions
- `WorkflowRunStep` - Step tracking
- `WorkflowEvent` - Event log
- `WorkflowArtifact` - Artifacts

**Migrations:**

- Auto-apply on `pnpm dev`
- Create new: `pnpm prisma:migrate`
- Pre-1.0 reset: `pnpm prisma:reset` (flattens all migrations)

## Debugging

**Server logs:** `logs/app.log`

```bash
tail -f logs/app.log | jq .                    # Pretty-print
tail -f logs/app.log | jq 'select(.level >= 50)' # Errors only
```

**Common issues:**

- WebSocket fails → Check JWT token, restart server
- DB locked → Kill node processes, restart
- Agent not streaming → Verify Claude CLI installed
- Type errors → Run `pnpm prisma:generate`, restart TS server

**Health check:**

```bash
curl http://localhost:3456/api/health
```

## Best Practices

### Backend

1. **One function per file** in `domain/*/services/`
2. **Pure functions** - No classes, explicit params
3. **Thin routes** - Delegate to domain services
4. **Return null for "not found"** - Routes decide errors
5. **Structured logging** - `fastify.log.info({ context }, 'message')`
6. **Custom error classes** - `throw new NotFoundError()`
7. **Prisma** - Don't add migrations. Instead use prisma:reset and then prisma:seed after modifying prisma.schema directly

### Frontend

7. **Feature-based organization** - Keep related code together
8. **Immutable Zustand updates** - Always return new objects/arrays
9. **Primitive useEffect deps** - Never objects from queries
10. **TanStack Query for server state** - Zustand for client state

### General

11. **No import extensions** - Let bundler add them
12. **Always `@/` aliases** - Never relative imports
13. **PascalCase components** - Except shadcn/ui (kebab-case)
14. **Database `| null`** - Props `?` optional

## Tech Stack

**Frontend:** React 19, Vite, React Router, TanStack Query, Zustand, Tailwind v4, shadcn/ui, CodeMirror, xterm.js
**Backend:** Fastify, WebSocket, Prisma (SQLite), JWT, Inngest, node-pty
**AI:** Vercel AI SDK, agent-cli-sdk (Claude/Codex/Gemini)
**Build:** Turborepo, pnpm, tsx, ESBuild

## Shared Schemas

**Hybrid approach** - Share validation schemas and enums, NOT model interfaces:

✅ **Share:**

- Zod validation schemas (`createProjectSchema`, etc.)
- Enum types (`WorkflowStatus`, `StepStatus`)
- Request/response validation

❌ **Don't share:**

- Model interfaces (WorkflowRun, etc.)
- Prisma types (backend only)
- UI types (frontend only)

**Location:** `src/shared/schemas/` (cross-cutting) or `src/server/domain/*/schemas/` (domain-specific)

**Usage:**

```typescript
// ✅ Backend - Import schemas for validation
import { createProjectSchema } from "@/shared/schemas";

// ✅ Frontend - Import enum types only
import type { WorkflowStatus } from "@/shared/schemas";

// ✅ Backend - Use Prisma types directly
const run = await prisma.workflowRun.findUnique({ where: { id } });
```

## Quick Reference

**Import paths:**

```typescript
import { prisma } from "@/shared/prisma";
import { NotFoundError } from "@/server/errors";
import { config } from "@/server/config";
import { getProjectById } from "@/server/domain/project/services/getProjectById";
import { webSocketEventBus } from "@/server/websocket/infrastructure";
```

**HTTP status codes:**

- 200 OK, 201 Created, 204 No Content
- 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found
- 409 Conflict, 500 Internal Server Error
