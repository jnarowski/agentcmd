# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Fastify-based backend server with domain-driven architecture, WebSocket support, Inngest workflow engine, and Prisma ORM.

**Tech Stack:**
- **Server:** Fastify + fastify-type-provider-zod
- **Database:** Prisma + SQLite (`:memory:` for tests)
- **Workflows:** Inngest (background jobs)
- **Real-time:** WebSocket (Socket.IO protocol, Phoenix Channels format)
- **Auth:** JWT (via @fastify/jwt)

## Development Commands

```bash
# Start server only (from apps/app/)
pnpm dev:server          # Auto-runs prisma migrate deploy

# Database
pnpm prisma:generate     # Regenerate Prisma client
pnpm prisma:migrate      # Create migration
pnpm prisma:studio       # Open database GUI (port 5555)

# IMPORTANT: Always create migrations for schema changes (never reset in production)

# Testing
pnpm test                # Run all tests (parallel workers)
pnpm test:watch          # Watch mode
pnpm test src/server/routes/projects.test.ts  # Single file

# Type checking
pnpm check-types         # TypeScript across all configs
tsc --noEmit -p tsconfig.server.json  # Server only

# Build
pnpm build:server        # Production build (esbuild)
```

## Architecture

### Utils

Scan first: `shared/utils/` → `server/utils/` → `domain/*/utils/` (one export per file). Cross-domain pure function → extract to server utils.

See `.agent/docs/backend-patterns.md` for patterns.

### Domain-Driven Services

Business logic organized by domain with **one function per file**:

```
domain/
├── project/services/
│   ├── getProjectById.ts       # One function export
│   ├── createProject.ts        # One function export
│   └── updateProject.ts        # One function export
├── session/services/
│   ├── createSession.ts
│   └── getSessionById.ts
└── workflow/services/
    ├── engine/                 # Inngest workflow runtime
    ├── definitions/            # Workflow CRUD
    ├── runs/                   # Run management
    └── steps/                  # Step execution
```

**Rules:**
- File name matches function export (e.g., `getProjectById.ts` exports `getProjectById`)
- Pure functions with explicit parameters (no hidden dependencies)
- Shared types in `.types.ts` files, private types stay in file
- Tests alongside files (`.test.ts`), not in `__tests__/`

**Example:** `domain/project/services/getProjectById.ts`

### Routes

Thin handlers that delegate to domain services:

```typescript
// routes/projects.ts
fastify.get(
  "/:id",
  {
    preHandler: fastify.authenticate,
    schema: {
      params: getProjectParamsSchema,
      response: { 200: projectResponseSchema },
    },
  },
  async (request, reply) => {
    const { id } = request.params;
    const userId = request.user!.userId;

    const project = await getProjectById({ id });
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    return project;
  }
);
```

**Best Practices:**
- Zod validation via `schema` option
- Authentication via `preHandler: fastify.authenticate`
- Delegate to domain services
- Throw custom error classes (AppError subclasses)
- Routes handle HTTP, services handle business logic

### Error Handling

Custom error classes extend `AppError` (base class):

```typescript
// Throw in services or routes
throw new NotFoundError("Project not found");
throw new BadRequestError("Invalid input", { field: "name" });
throw new UnauthorizedError("Invalid token");
throw new ConflictError("Resource already exists");
throw new ServiceUnavailableError("Database unavailable", {}, 60);
```

**Available Errors:**
- `NotFoundError` (404)
- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `ConflictError` (409)
- `InternalServerError` (500)
- `ServiceUnavailableError` (503)
- `ValidationError` (400)

**Global Error Handler:**
- Handles Zod validation errors
- Prisma errors (P2025 → 404, P2002 → 409)
- AppError subclasses (uses `.toJSON()` method)
- Uncaught exceptions (logs + graceful shutdown)

**Location:** `index.ts:162-381` (global error handler)

### Configuration

Zod-validated config with sensible defaults:

```typescript
import { config } from "@/server/config";

const port = config.server.port;        // 4100
const jwtSecret = config.jwt.secret;    // Required
const dbUrl = config.database.url;      // file:./prisma/dev.db
const inngestAppId = config.workflow.appId;
```

**Environment Variables:**
- `JWT_SECRET` - **Required** (validation fails without it)
- `DATABASE_URL` - Default: `file:./prisma/dev.db`
- `PORT` - Default: 4100
- `HOST` - Default: 127.0.0.1
- `NODE_ENV` - Default: development
- `LOG_LEVEL` - Default: info
- `ANTHROPIC_API_KEY` - Optional (for AI workflows)
- `OPENAI_API_KEY` - Optional (for AI workflows)
- `INNGEST_*` - Workflow engine config

**See:** `config/index.ts`, `config/schemas.ts`

### WebSocket Architecture

Unified WebSocket endpoint at `/ws` with Phoenix Channels protocol:

**Connection Flow:**
1. Client connects with JWT (`/ws?token=...` or `Authorization: Bearer ...`)
2. Server authenticates and sends `CONNECTED` event
3. Client subscribes to channels (`session:123`, `project:456`, `global`)
4. Server broadcasts events to subscribed clients

**Message Format:**
```typescript
// Incoming from client
{ channel: "session:123", type: "subscribe", data: {} }
{ channel: "session:123", type: "send_input", data: { content: "..." } }

// Outgoing to client
{ channel: "session:123", type: "stream_output", data: { content: "..." } }
{ channel: "global", type: "error", data: { error: "...", message: "..." } }
```

**Channel Types:**
- `session:{id}` - Agent session events (handled by `session.handler.ts`)
- `shell:{id}` - Shell execution events (handled by `shell.handler.ts`)
- `project:{id}` - Workflow/project events (broadcast-only)
- `global` - Connection lifecycle, errors

**Broadcasting to Clients:**
```typescript
import { eventBus } from "@/server/websocket/event-bus";

// Emit event (automatically broadcasts to subscribed clients)
eventBus.emit("session.stream_output", {
  sessionId: "123",
  content: "Hello",
  timestamp: Date.now(),
});
```

**Infrastructure:**
- `websocket/infrastructure/subscriptions.ts` - Channel subscriptions
- `websocket/infrastructure/send-message.ts` - Send to socket
- `websocket/infrastructure/active-sessions.ts` - Session state
- `websocket/infrastructure/reconnection.ts` - 30s grace period

**See:** `.agent/docs/websocket-architecture.md`

### Workflow Engine

Inngest-based workflow execution with real-time WebSocket updates:

**Architecture:**
- `workflow/services/engine/` - Workflow runtime + Inngest functions
- `workflow/services/definitions/` - Workflow CRUD operations
- `workflow/services/runs/` - Run management
- `workflow/services/steps/` - Step execution (AI, Bash, Conditional, Loop)

**Initialization:**
```typescript
// index.ts startup
await initializeWorkflowEngine(fastify);
```

**Step Types:**
- `ai` - Claude/OpenAI/Gemini execution
- `bash` - Shell command execution
- `conditional` - Branch based on condition
- `loop` - Iterate over array/range

**Real-time Updates:**
- Workflow events broadcast via WebSocket (`project:{id}` channel)
- Step execution streamed to clients
- Error handling + retry logic

**See:** `.agent/docs/workflow-system.md`

## Testing

### Parallel Test Execution

Tests run in parallel using Vitest 4's worker pool with **database-per-worker isolation**:

```bash
# Each worker gets isolated SQLite
test-worker-1.db
test-worker-2.db
test-worker-3.db
test-worker-4.db

# Worker count: 4 locally, 2 in CI
# VITEST_POOL_ID: Stable worker ID (1 to maxWorkers)
```

**Setup:**
- `vitest.global-setup.ts` - Creates all worker databases (runs once)
- `vitest.setup.ts` - Sets `DATABASE_URL` per worker using `VITEST_POOL_ID`
- Tests run in parallel without conflicts

**See:** `test-utils/README.md` for comprehensive guide

### Integration Tests (Gold Standard)

Use in-memory SQLite for route tests:

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { setupTestDB, cleanTestDB, teardownTestDB } from "@/server/test-utils/db";
import { createTestApp, closeTestApp, injectAuth } from "@/server/test-utils/fastify";
import { createTestUser, createTestProject } from "@/server/test-utils/fixtures";

describe("GET /api/projects/:id", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    prisma = await setupTestDB();
    app = await createTestApp();
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
    await teardownTestDB();
  });

  it("should return project data", async () => {
    const user = await createTestUser(prisma);
    const project = await createTestProject(prisma, { name: "Test" });
    const headers = injectAuth(user.id, user.email, app);

    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}`,
      headers,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.name).toBe("Test");
  });
});
```

**Test Utilities:**
- `setupTestDB()` - Creates `:memory:` DB + runs migrations (~500ms one-time)
- `cleanTestDB()` - Truncates all tables (~20ms per test)
- `createTestApp()` - Fastify instance with routes + auth
- `injectAuth()` - Generate JWT Bearer token
- Fixtures: `createTestUser()`, `createTestProject()`, `createTestSession()`

**Gold Standard Tests:**
- `routes/projects.test.ts`
- `routes/sessions.test.ts`
- `domain/project/services/createProject.test.ts`

**Performance:**
- Setup: ~500ms (once per suite)
- Per test: ~50ms
- 6-test suite: <5 seconds

### Unit Tests

Use mocks for domain services testing business logic in isolation:

```typescript
import { vi } from "vitest";

vi.mock("@/shared/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn().mockResolvedValue({ id: "1", name: "Mock" })
    },
  },
}));
```

**When to Use:**
- Testing domain service logic
- External API calls (Claude, OpenAI)
- Performance-critical tests (1000s of iterations)

**When NOT to Use:**
- Route testing (use integration tests)
- Prisma query validation (use real DB)

## Common Patterns

### CRUD Naming (Prisma-style)

Follow Prisma naming for consistency:

```typescript
// Get operations
getProjectById({ id })           // findUnique - O(1), by unique key
getProjectBy({ path })           // findFirst - O(n), any filter
getProjects({ userId, limit })   // findMany - O(n), with pagination

// Mutations
createProject({ name, path })    // create
updateProject({ id, data })      // update (prefer over archive/unarchive)
upsertProject({ id, data })      // upsert (atomic create-or-update)
deleteProject({ id })            // delete (prefer soft delete via update)
```

**Reference:** `domain/workflow/services/definitions/`

### Parallel Operations

Maximize parallelism for independent operations:

```typescript
// ✅ DO - Parallel
const [project, sessions, workflows] = await Promise.all([
  getProjectById({ id }),
  getSessionsByProject({ projectId: id }),
  getWorkflowsByProject({ projectId: id }),
]);

// ❌ DON'T - Sequential
const project = await getProjectById({ id });
const sessions = await getSessionsByProject({ projectId: id });
const workflows = await getWorkflowsByProject({ projectId: id });
```

### File Structure (Domain Services)

```typescript
// Imports
import { prisma } from "@/shared/prisma";
import type { SharedType } from "./types";

// Module-level constants, private types
const RETRY_LIMIT = 3;
type HelperType = { ... };  // Private, not exported

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Create a new project
 */
export async function createProject({ name, path }: CreateProjectInput) {
  validateInput(name);
  return await saveProject(name, path);
}

export type CreateProjectInput = {
  name: string;
  path: string;
};

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

function validateInput(name: string): void {
  if (!name) throw new Error("Name required");
}

async function saveProject(name: string, path: string) {
  return await prisma.project.create({ data: { name, path } });
}
```

**Rules:**
- Public API before private helpers
- Separators: `// ============================================================================`
- JSDoc on all public functions
- Export types only if shared with other files

### Graceful Shutdown

Process-level handlers in `index.ts` ensure clean shutdown:

```typescript
// Handles uncaught exceptions, unhandled rejections
setupProcessErrorHandlers(fastify);

// Handles SIGTERM, SIGINT
await setupGracefulShutdown(server, activeSessions, reconnectionManager);
```

**Shutdown Sequence:**
1. Stop accepting new connections
2. Close active WebSocket connections (notify clients)
3. Wait for in-flight requests (10s timeout)
4. Disconnect Prisma client
5. Exit process (code 0 for graceful, 1 for errors)

**See:** `utils/shutdown.ts`

## Key Files

**Entry Point:**
- `index.ts` - Server creation, error handlers, route registration

**Core Infrastructure:**
- `routes.ts` - Route registration
- `config/` - Zod-validated environment config
- `plugins/auth.ts` - JWT authentication

**Domains:**
- `domain/project/services/` - Project CRUD
- `domain/session/services/` - Agent session management
- `domain/workflow/services/` - Workflow engine + Inngest
- `domain/shell/services/` - Shell execution
- `domain/auth/services/` - User auth

**WebSocket:**
- `websocket/index.ts` - Unified `/ws` endpoint
- `websocket/handlers/` - Event handlers (session, shell, global)
- `websocket/infrastructure/` - Subscriptions, active sessions, metrics

**Testing:**
- `test-utils/db.ts` - In-memory SQLite setup
- `test-utils/fastify.ts` - Test app creation
- `test-utils/fixtures/` - Test data factories
- `test-utils/README.md` - Comprehensive testing guide

**Errors:**
- `errors/AppError.ts` - Base error class
- `errors/` - Specific error types (NotFoundError, etc.)

## Import Conventions

```typescript
// ✅ DO - @/ aliases, no extensions
import { getProjectById } from "@/server/domain/project/services/getProjectById";
import { prisma } from "@/shared/prisma";
import { config } from "@/server/config";

// ❌ DON'T - Relative paths, extensions
import { getProjectById } from "../../../domain/project/services/getProjectById.js";
```

## Health Check

```bash
curl http://localhost:4100/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-16T12:00:00.000Z",
  "database": { "connected": true },
  "server": { "name": "@spectora/agent-workflows-ui", "version": "0.1.0", "uptime": 123 },
  "features": { "aiEnabled": true }
}
```

## Logging

Pino logger with different transports per environment:

**Development:**
- Pretty console output (pino-pretty)
- File output with rotation (pino-roll): `logs/app.log`
- 7-day retention

**Production:**
- Stdout (for Docker/PM2/systemd)
- File output with rotation: `logs/app.log`
- 30-day retention

**Tail Logs:**
```bash
tail -f apps/app/logs/app.log | jq .
```

## Additional Resources

**Root CLAUDE.md:**
- Import conventions
- React best practices
- Code organization rules

**App-Level CLAUDE.md:**
- Full-stack integration
- Client ↔ Server patterns
- Shared types

**.agent/docs/:**
- `backend-patterns.md` - Comprehensive backend guide
- `websocket-architecture.md` - WebSocket patterns
- `workflow-system.md` - Inngest workflow engine
- `database-guide.md` - Prisma patterns
- `testing-best-practices.md` - Testing guide
- `troubleshooting.md` - Common issues

**Gold Standard Examples:**
- `routes/projects.test.ts` - Route testing pattern
- `domain/project/services/getProjectById.ts` - Domain service pattern
- `domain/workflow/services/definitions/` - CRUD naming pattern
