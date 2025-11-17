# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Documentation Map

### CLAUDE.md Files

- **Root** (this file) - Monorepo essentials + critical rules
- `apps/app/CLAUDE.md` - Full-stack app integration
- `apps/app/src/client/CLAUDE.md` - Frontend patterns
- `packages/agent-cli-sdk/CLAUDE.md` - AI CLI SDK
- `packages/agentcmd-workflows/CLAUDE.md` - Workflow SDK

### .agent/docs/ Reference Guides

- `backend-patterns.md` - Domain services, routes, error handling
- `frontend-patterns.md` - React patterns, state management
- `workflow-system.md` - Workflow engine, Inngest integration
- `websocket-architecture.md` - WebSocket patterns, EventBus
- `database-guide.md` - Prisma patterns, migrations
- `troubleshooting.md` - Common issues and solutions
- `deployment.md` - Build, deploy, production
- `architecture-decisions.md` - Why we chose these technologies
- `testing-best-practices.md` - Testing patterns
- `branding.md` - Project identity, design system

## Project Overview

**Turborepo monorepo** for AI agent workflow tools:

- **`apps/app`**: Full-stack application (React + Vite frontend, Fastify backend)
- **`apps/appsite`**: Marketing site (Next.js)
- **`packages/agent-cli-sdk`**: TypeScript SDK for AI CLI orchestration
- **`packages/agentcmd-workflows`**: Workflow utilities library

**Tech Stack:**

- Frontend: React 19, Vite, TanStack Query, Zustand, Tailwind v4
- Backend: Fastify, Prisma (SQLite), Inngest, WebSocket
- Build: Turborepo, pnpm, TypeScript 5.9

## Critical Rules

### Import Conventions

✅ **DO** - No file extensions, @/ aliases only:

```typescript
import { foo } from "./bar";
import { getProjectById } from "@/server/domain/project/services/getProjectById";
```

❌ **DON'T** - File extensions, relative paths:

```typescript
import { foo } from "./bar.js";
import { getProjectById } from "../../../domain/project/services/getProjectById";
```

✅ **DO** - Top-level imports:

```typescript
import type { PhaseDefinition } from "agentcmd-workflows";
```

❌ **DON'T** - Inline imports:

```typescript
function foo(phase: import("agentcmd-workflows").PhaseDefinition) {}
```

### React Best Practices

✅ **DO** - Primitives only in useEffect deps:

```typescript
const { userId, projectId } = project;
useEffect(() => {
  fetchData(userId, projectId);
}, [userId, projectId]);
```

❌ **DON'T** - Objects cause infinite loops:

```typescript
useEffect(() => {
  fetchData(project);
}, [project]);
```

✅ **DO** - Immutable Zustand updates:

```typescript
set((state) => ({
  messages: [...state.messages, newMessage],
}));
```

❌ **DON'T** - Mutations:

```typescript
set((state) => {
  state.messages.push(newMessage);
  return { messages: state.messages };
});
```

### Code Organization

**One export per file:**

- **Services** - server-side only (`domain/*/services/*.ts`)
- **Utils** - everywhere (client and server utils)
- File name matches export: `createProject.ts` → `export function createProject()`
- **Shared types** - import from `.types.ts` files
- **Private types** - keep in file (not exported)
- **Non-shared exported types** - can stay in file

```
domain/
├── project/services/
│   ├── getProjectById.ts       # exports getProjectById only
│   ├── createProject.ts        # exports createProject + non-shared types
│   └── types.ts                # shared types used by multiple services
```

**CRUD Gold Standard:** Follow Prisma naming patterns for domain services:

- `get{Entity}` (findUnique), `get{Entity}By` (findFirst), `get{Entity}s` (findMany)
- `create{Entity}`, `update{Entity}`, `upsert{Entity}`, `delete{Entity}`
- See `.agent/docs/backend-patterns.md` for comprehensive patterns
- Reference: `apps/app/src/server/domain/workflow/services/definitions/`

**File structure:**

- Imports → Module constants/private types → `// PUBLIC API` separator → Public exports with JSDoc → `// PRIVATE HELPERS` separator → Private functions
- One function export per file, file name matches export
- Shared types from `.types.ts`, private types stay in file
- Route files and `*.types.ts` files are exceptions

**See:** `.agent/docs/backend-patterns.md` for detailed examples and patterns

### Schema Organization

**Hybrid approach** - share validation schemas, keep model interfaces separate:

```typescript
// ✅ Share enums and validation
// apps/app/src/shared/schemas/workflow.schemas.ts
export const workflowStatusSchema = z.enum(["pending", "running", "completed"]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

// ✅ Backend uses Prisma types
import { prisma } from "@/shared/prisma";
const run = await prisma.workflowRun.findUnique({ where: { id } });

// ✅ Frontend defines custom interfaces
export interface WorkflowRun {
  id: string;
  status: WorkflowStatus;
}
```

### Type Conventions

✅ **DO** - Database fields use `null`:

```typescript
interface Project {
  description: string | null; // Prisma field
}
```

✅ **DO** - React props use `undefined`:

```typescript
interface Props {
  description?: string; // Optional prop
}
```

❌ **DON'T** - Mix both:

```typescript
interface Project {
  description: string | null | undefined;
}
```

### WebSocket Conventions

✅ **DO** - Colon notation for channels:

```typescript
"project:123";
"workflow:abc:step:xyz";
```

✅ **DO** - Dot notation for events:

```typescript
"workflow.started";
"step.completed";
```

❌ **DON'T** - Mix notations:

```typescript
"project.123"; // Wrong - use colon
"workflow:started"; // Wrong - use dot
```

**See:** `.agent/docs/websocket-architecture.md` for comprehensive patterns

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

## Architecture Overview

**Monorepo Structure:**

```
.
├── apps/
│   ├── app/                    # Main full-stack app
│   │   ├── src/
│   │   │   ├── client/         # React frontend
│   │   │   ├── server/         # Fastify backend
│   │   │   │   └── domain/     # Business logic
│   │   │   │       ├── workflow/   # Workflow engine
│   │   │   │       ├── session/    # Agent sessions
│   │   │   │       ├── project/    # Projects
│   │   │   │       └── */          # Other domains
│   │   │   └── shared/         # Client + server
│   │   └── prisma/             # Database
│   └── website/                # Marketing site
├── packages/
│   ├── agent-cli-sdk/          # AI CLI SDK
│   └── agentcmd-workflows/     # Workflow utilities
├── .agent/
│   ├── docs/                   # Extended docs
│   └── specs/                  # Feature specs
└── .claude/commands/           # Slash commands
```

**See:** `.agent/docs/architecture-decisions.md` for rationale behind key choices.

## Quick Reference

**Common Patterns:**

- Parallel operations: `Promise.all()` for independent async calls
- Config: Use `@/server/config`, not `process.env` directly
- Prisma: Import singleton from `@/shared/prisma`
- See `.agent/docs/backend-patterns.md` for comprehensive patterns

**Ports:**

- Frontend: 5173
- Backend: 3456
- Inngest UI: 8288

**File Locations:**

- Logs: `apps/app/logs/app.log`
- Database: `apps/app/prisma/dev.db`
- Generated: `.agent/generated/` (DO NOT edit)

**Key Commands:**

- Dev: `pnpm dev`
- Build: `pnpm build`
- Check: `pnpm check`
- Migrate: `pnpm prisma:migrate`

## Debugging

**Server Logs:**

```bash
tail -f apps/app/logs/app.log | jq .
```

**Health Check:**

```bash
curl http://localhost:3456/api/health
```

**See:** `.agent/docs/troubleshooting.md` for common issues.

## Plans

- Ultrathink - analyze deeply before executing
- Ask clarifying questions ONE AT A TIME if implementation approach is unclear:
  - Don't use AskUserQuestion tool
  - Use this template:

    ```md
    **Question**: [Your question]
    **Suggestions**:

    1. [Option 1] (recommended - why)
    2. [Option 2]
    3. Other - user specifies
    ```

## Be Extremely Concise

Sacrifice grammar for concision in all interactions and commit messages.

## Additional Resources

### .agent/docs/ (Detailed Guides)

- `backend-patterns.md` - Routes, services, error handling, WebSocket handlers
- `frontend-patterns.md` - React components, hooks, state, WebSocket client
- `workflow-system.md` - Workflow engine architecture, Inngest, step types
- `websocket-architecture.md` - EventBus, channels, events, real-time
- `database-guide.md` - Prisma patterns, migrations, queries, transactions
- `troubleshooting.md` - Common errors, type issues, runtime problems
- `deployment.md` - Production build, environment, migrations, monitoring
- `architecture-decisions.md` - Why domain-driven, Zustand, SQLite, Inngest
- `testing-best-practices.md` - Testing patterns, fixtures, mocking

### App-Specific Guides

- `apps/app/CLAUDE.md` - Full-stack app integration patterns
- `apps/app/src/client/CLAUDE.md` - Frontend development guide

### Package Docs

- `packages/agent-cli-sdk/CLAUDE.md` - AI CLI SDK usage
- `packages/agentcmd-workflows/CLAUDE.md` - Workflow SDK API
