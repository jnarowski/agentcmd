# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Project Overview

**Turborepo monorepo** for AI agent workflow tools:

- **`apps/app`**: Full-stack application (React + Vite frontend, Fastify backend) for managing AI agent workflows with chat, file editor, terminal, and visual workflow builder
- **`agent-cli-sdk`**: TypeScript SDK for orchestrating AI CLI tools (Claude Code, OpenAI Codex, Gemini)
- **`agentcmd-workflows`**: Workflow utilities library with state persistence, logging, error handling

## Critical Rules

### Import Conventions

**NO file extensions in imports**:

- ✅ `import { foo } from "./bar"`
- ❌ `import { foo } from "./bar.js"`

**Always use `@/` aliases, never relative imports**:

- ✅ `@/client/*`, `@/server/*`, `@/shared/*`
- ❌ `../../../components/Foo`

### React Best Practices

**useEffect Dependencies - Only Primitives**:

```typescript
// ❌ BAD - Objects cause infinite loops
useEffect(() => { ... }, [user, project, data]);

// ✅ GOOD - Only primitives
useEffect(() => { ... }, [userId, projectId, isEnabled]);

// ✅ GOOD - Omit stable functions with eslint-disable
useEffect(() => {
  fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [id]);
```

**Zustand State - Always Immutable**:

```typescript
// ❌ BAD - Mutation
set((state) => {
  state.messages.push(newMsg);
  return { messages: state.messages };
});

// ✅ GOOD - Immutable
set((state) => ({
  messages: [...state.messages, newMsg],
}));
```

**Null vs Undefined**:

- Database fields (Prisma): `value: string | null`
- React props: `value?: string`
- Never mix: ❌ `value: string | null | undefined`

### Backend Architecture

**Domain-Driven Structure**:

```
server/domain/
├── workflow/          # Workflow engine domain
│   ├── services/      # One function per file
│   ├── schemas/       # Zod validation
│   ├── types/         # Domain types
│   └── utils/         # Domain utilities
├── session/           # Agent sessions
├── project/           # Project management
├── file/              # File operations
├── git/               # Git operations
└── shell/             # Terminal
```

**Key Principles**:

- ✅ One function per file in `domain/*/services/`
- ✅ Pure functions - pass dependencies as params, no classes
- ✅ Routes are thin - delegate to domain services
- ✅ Centralized config - never access `process.env` directly
- ❌ Never import from old `services/` directory

**Import Pattern**:

```typescript
// ✅ GOOD
import { getProjectById } from "@/server/domain/project/services/getProjectById";

// ❌ BAD
import { getProjectById } from "@/server/services/project.service";
```

### Schema Organization

**Hybrid Approach** - Share validation schemas, keep model interfaces separate:

```typescript
// ✅ Share enums and validation schemas
// apps/app/src/shared/schemas/workflow.schemas.ts
export const workflowStatusSchema = z.enum(["pending", "running", "completed"]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

// ✅ Backend uses Prisma types directly
import { prisma } from "@/shared/prisma";
const run = await prisma.workflowRun.findUnique({ where: { id } });

// ✅ Frontend defines custom interfaces with UI needs
export interface WorkflowRun {
  id: string;
  status: WorkflowStatus; // ← Uses shared enum
  // ... other fields frontend needs
}

// ❌ Don't derive full model interfaces from schemas
export interface WorkflowRun extends z.infer<typeof workflowResponseSchema> {
  // This couples frontend to backend response shape
}
```

**Schema Locations**:

- Cross-cutting: `apps/app/src/shared/schemas/` (workflows, events)
- Domain-specific: `apps/app/src/server/domain/{domain}/schemas/`
- Legacy: `apps/app/src/server/schemas/` (deprecated, DO NOT use)

## Essential Commands

### Development

```bash
# Root-level (builds all packages)
pnpm install
pnpm build
pnpm check          # lint + type-check

# App development (from apps/app/)
pnpm dev            # Both client + server (auto-runs prisma migrate deploy)
pnpm dev:client     # Frontend only (port 5173)
pnpm dev:server     # Backend only (port 3456)

# Database
pnpm prisma:generate   # Regenerate Prisma client
pnpm prisma:migrate    # Create and run migration
pnpm prisma:studio     # Open database GUI

# Quality
pnpm check-types    # Type-check from root
pnpm test           # Run tests (package level)
```

### Package Development

```bash
# Build specific package
pnpm --filter agent-cli-sdk build
pnpm --filter agentcmd-workflows build

# Tests (from package directory)
cd packages/agent-cli-sdk
pnpm test                # Unit tests
pnpm test:e2e            # E2E tests with real CLI
```

## Architecture

### Monorepo Structure

```
.
├── apps/
│   ├── app/                    # Main full-stack app (agentcmd)
│   │   ├── src/
│   │   │   ├── client/         # React frontend (Vite)
│   │   │   │   ├── components/ # Shared components
│   │   │   │   │   ├── ui/     # shadcn/ui (kebab-case)
│   │   │   │   │   └── ai-elements/ # AI chat components
│   │   │   │   ├── pages/      # Feature-based organization
│   │   │   │   │   ├── auth/
│   │   │   │   │   └── projects/
│   │   │   │   │       ├── workflows/  # Workflow builder UI
│   │   │   │   │       ├── sessions/   # Chat/agents
│   │   │   │   │       ├── files/      # File editor
│   │   │   │   │       └── shell/      # Terminal
│   │   │   │   ├── hooks/
│   │   │   │   └── stores/     # Zustand stores
│   │   │   │
│   │   │   ├── server/         # Fastify backend
│   │   │   │   ├── domain/     # Business logic
│   │   │   │   │   ├── workflow/   # NEW: Workflow engine
│   │   │   │   │   ├── session/
│   │   │   │   │   ├── project/
│   │   │   │   │   ├── file/
│   │   │   │   │   ├── git/
│   │   │   │   │   └── shell/
│   │   │   │   ├── routes/     # Thin HTTP handlers
│   │   │   │   ├── websocket/  # WebSocket infrastructure
│   │   │   │   └── config/     # Centralized config
│   │   │   │
│   │   │   ├── shared/         # Client + server
│   │   │   │   ├── types/
│   │   │   │   ├── schemas/    # Cross-cutting validation
│   │   │   │   └── prisma.ts
│   │   │   │
│   │   │   └── cli/            # CLI tool distribution
│   │   │
│   │   ├── prisma/             # Database
│   │   │   ├── schema.prisma
│   │   │   └── dev.db
│   │   │
│   │   └── logs/app.log        # Server logs
│   │
│   └── website/                # Marketing site
│
├── packages/
│   ├── agent-cli-sdk/          # AI CLI SDK
│   ├── agentcmd-workflows/     # Workflow utilities
│   ├── ui/                     # Shared UI components
│   ├── eslint-config/
│   └── typescript-config/
│
├── .agent/
│   ├── generated/              # Auto-generated (DO NOT edit)
│   │   └── slash-commands.ts
│   ├── docs/                   # Extended docs
│   └── specs/                  # Feature specs
│
├── .claude/commands/           # Slash command definitions
├── turbo.json                  # Turborepo config
└── pnpm-workspace.yaml
```

### Key Technologies

**Frontend**: React 19, Vite, React Router, TanStack Query, Zustand, Tailwind CSS v4, shadcn/ui, @xyflow/react (workflow visualization)

**Backend**: Fastify, WebSocket, Prisma (SQLite), JWT auth, Inngest (workflows), node-pty (terminals)

**Build**: Turborepo, pnpm, TypeScript 5.9, ESBuild, Bunchee

**AI**: Vercel AI SDK, Claude Code, OpenAI Codex, Gemini (via agent-cli-sdk)

### Workflow Engine (NEW)

**Visual workflow builder** with drag-and-drop interface:

**Domain**: `apps/app/src/server/domain/workflow/`

- `services/` - Workflow execution engine, step runners
- `services/engine/` - Core runtime engine (createWorkflowRuntime.ts)
- `types/` - Workflow definitions, execution context, step types
- `schemas/` - Zod validation

**Frontend**: `apps/app/src/client/pages/projects/workflows/`

- Drag-drop workflow builder (@xyflow/react)
- Real-time execution monitoring
- Step configuration UI

**Database**: WorkflowDefinition, WorkflowRun, WorkflowRunStep tables

**Execution**:

- Runs via Inngest (background jobs)
- WebSocket streaming for live updates
- Step types: AI (Claude/Codex/Gemini), Bash, Conditional, Loop

### Feature-Based Frontend Organization

```
pages/
└── projects/
    ├── workflows/           # Workflow builder feature
    │   ├── components/      # Feature-specific
    │   ├── hooks/
    │   ├── stores/
    │   ├── types/
    │   └── ProjectWorkflows.tsx
    │
    ├── sessions/            # Chat feature
    │   ├── components/
    │   ├── hooks/
    │   ├── stores/
    │   └── ProjectSession.tsx
    │
    └── files/               # File editor feature
        ├── components/
        ├── hooks/
        └── ProjectFiles.tsx
```

**Naming**:

- PascalCase: All components except shadcn/ui
- kebab-case: Only `components/ui/` (shadcn/ui)

## Workflow System Best Practices

### Workflow Definitions

```typescript
// Define workflow with typed steps
const workflow: WorkflowDefinition = {
  name: "AI Code Review",
  steps: [
    {
      type: "ai",
      name: "Review Code",
      agentType: "claude",
      prompt: "Review this PR and suggest improvements",
    },
    {
      type: "bash",
      name: "Run Tests",
      command: "pnpm test",
    },
    {
      type: "conditional",
      name: "Check Results",
      condition: "{{ steps.runTests.exitCode === 0 }}",
      onTrue: { ... },
      onFalse: { ... },
    },
  ],
};
```

### Step Types

**AI Step**: Executes Claude/Codex/Gemini with prompt
**Bash Step**: Runs shell command
**Conditional Step**: Branch based on condition
**Loop Step**: Iterate over array/range

### Execution Context

```typescript
interface StepExecutionContext {
  workflow: WorkflowDefinition;
  run: WorkflowRun;
  step: WorkflowDefinitionStep;
  projectPath: string;
  variables: Record<string, unknown>;
  stepOutputs: Record<string, StepOutput>;
  onEvent: (event: WorkflowEvent) => void;
}
```

### Event Streaming

Workflows emit real-time events via WebSocket:

- `workflow.*.started`
- `workflow.*.step.*.progress`
- `workflow.*.step.*.completed`
- `workflow.*.completed`
- `workflow.*.failed`

Frontend subscribes via `useWorkflowWebSocket()` hook.

## Database Best Practices

**Prisma Client Singleton**:

```typescript
// ✅ GOOD
import { prisma } from "@/shared/prisma";

// ❌ BAD - Creates connection leak
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
```

**Pre-1.0 Migration Reset** (dev only):

```bash
# Collapse migrations when accumulating too many
pnpm prisma:reset  # = rm migrations/ && prisma migrate dev --name init
```

**Production**:

```bash
# Apply migrations (no dev mode)
prisma migrate deploy
```

## WebSocket Patterns

**Event Naming**: Flat dot notation

```typescript
// ✅ GOOD
"workflow.{runId}.step.{stepId}.progress";
"session.{sessionId}.stream_output";
"shell.{sessionId}.output";

// ❌ BAD
"workflow:step:progress";
```

**Message Structure**:

```typescript
interface WebSocketMessage<T = unknown> {
  type: string; // Event type
  data: T; // Payload
}
```

## Debugging

**Server Logs**: `apps/app/logs/app.log`

```bash
# Watch logs
tail -f apps/app/logs/app.log | jq .

# Filter errors
tail -f apps/app/logs/app.log | jq 'select(.level >= 50)'

# Search workflows
grep "workflow" apps/app/logs/app.log | jq .
```

**Health Check**:

```bash
curl http://localhost:3456/api/health
```

**Log Levels**: `trace`, `debug`, `info`, `warn`, `error`, `fatal` (default: `info`)

## Common Issues

**WebSocket not connecting**: Check JWT token, verify server running, check CORS

**Database locked**: Kill node processes, restart `pnpm dev`

**Agent not streaming**: Verify CLI installed (`which claude`), check logs

**TypeScript errors**: `pnpm prisma:generate`, clear node_modules, `pnpm install`

**Infinite re-renders**: Check useEffect deps (use only primitives, not objects)

## Environment Variables

```bash
# Required
JWT_SECRET=<openssl rand -base64 32>
DATABASE_URL=file:./dev.db

# Optional (with defaults)
PORT=3456
HOST=127.0.0.1
LOG_LEVEL=info
ANTHROPIC_API_KEY=<for AI features>
```

See `.env.example` for full template.

## Quick Reference

**Ports**:

- Frontend: 5173
- Backend: 3456
- Inngest UI: 8288

**File Locations**:

- Logs: `apps/app/logs/app.log`
- Database: `apps/app/prisma/dev.db`
- Generated files: `.agent/generated/` (DO NOT edit)

**Key Packages**:

- `agentcmd`: Main app (published to npm)
- `agent-cli-sdk`: AI CLI orchestration
- `agentcmd-workflows`: Workflow utilities

## Additional Resources

- **App Guide**: `apps/app/CLAUDE.md` (detailed architecture)
- **CLI Guide**: `apps/app/CLI.md` (CLI tool usage)
- **Workflow Docs**: `.agent/docs/workflow-engine.md`
- **WebSocket Docs**: `.agent/docs/websockets.md`
- **Tool Patterns**: `.agent/docs/claude-tool-result-patterns.md`
- **SDK Guide**: `packages/agent-cli-sdk/CLAUDE.md`

## Important

- Be extremely concise in all interactions and commit messages - sacrifice grammar for concision.

## Plans

- At end of plans, list unresolved questions (extremely concise)
- Pre-1.0: Can use `prisma:reset` to flatten migrations
