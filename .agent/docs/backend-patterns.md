# Backend Patterns

Comprehensive guide to backend development patterns in the agentcmd app.

## Domain-Driven Architecture

### Core Principle

**One function per file** in `domain/*/services/`:

```
domain/
├── project/services/
│   ├── getProjectById.ts       # One function
│   ├── createProject.ts        # One function
│   └── updateProject.ts        # One function
```

✅ DO:
- Pure functions with explicit parameters
- File name matches function name
- Export single function per file
- Pass dependencies as parameters

❌ DON'T:
- Classes or service objects
- Multiple functions in one file
- Importing from deprecated `services/` directory
- Hidden dependencies or globals

**Example:** `apps/app/src/server/domain/project/services/getProjectById.ts`

## Route Patterns

### Thin Route Handlers

Routes delegate to domain services, never contain business logic.

**Structure:**
```typescript
// apps/app/src/server/routes/projects.ts

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

    const project = await getProjectById({ projectId: id, userId });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    return project;
  }
);
```

**Best Practices:**
- Zod validation via schema
- Authentication via preHandler
- Delegate to domain services
- Type-safe responses
- Proper error handling (throw custom errors)

✅ DO:
- One route per HTTP method
- Thin handlers (< 20 lines)
- Delegate to services
- Use custom error classes

❌ DON'T:
- Business logic in routes
- Direct Prisma calls
- Complex transformations
- Multiple operations

**Example Files:**
- `apps/app/src/server/routes/projects.ts`
- `apps/app/src/server/routes/sessions.ts`
- `apps/app/src/server/routes/auth.ts`

## Domain Service Patterns

### Pure Functions

Services are pure functions that accept dependencies as parameters.

**Structure:**
```typescript
// domain/project/services/getProjectById.ts

export async function getProjectById({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  // Parallel operations for efficiency
  const [project, sessionCount, hasWorkflowPackage] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId, userId },
      include: { user: true },
    }),
    prisma.session.count({
      where: { projectId },
    }),
    checkWorkflowPackage({ projectPath: projectPath }),
  ]);

  if (!project) return null;

  // Transform to API format
  return transformProjectToResponse(project, {
    sessionCount,
    hasWorkflowPackage,
  });
}
```

**Best Practices:**
- Options object pattern for parameters
- Parallel async operations (Promise.all)
- Transform functions for API formatting
- Return null for "not found" (routes throw errors)
- Clear JSDoc comments

✅ DO:
- Pure functions
- Explicit parameters
- Parallel operations
- Clear return types

❌ DON'T:
- Stateful classes
- Hidden dependencies
- Sequential operations that could be parallel
- Mixing business logic with HTTP concerns

**Example Files:**
- `apps/app/src/server/domain/project/services/getProjectById.ts` (gold standard)
- `apps/app/src/server/domain/session/services/executeAgent.ts` (advanced)
- `apps/app/src/server/domain/project/services/createProject.ts`

## CRUD Gold Standard

### Naming Conventions Mirror Prisma

Use Prisma's naming pattern for consistency and predictable performance:

| Service Pattern | Prisma Method | Complexity | Use Case |
|----------------|---------------|------------|----------|
| `get{Entity}` | `findUnique` | O(1) | Get by id or unique key |
| `get{Entity}By` | `findFirst` | O(n) | Get by any filter |
| `get{Entity}s` | `findMany` | O(n) | List with filters |
| `create{Entity}` | `create` | O(1) | Create new record |
| `update{Entity}` | `update` | O(1) | Update by id |
| `upsert{Entity}` | `upsert` | O(1) | Create or update |
| `delete{Entity}` | `delete` | O(1) | Hard delete (use sparingly) |

**Reference Implementation:** `apps/app/src/server/domain/workflow/services/definitions/`

### CRUD Implementation Patterns

Each CRUD operation follows consistent patterns with options objects, default includes, and proper error handling.

**get{Entity}** (findUnique):
- O(1) indexed lookup by id or unique constraint
- Returns `null` if not found
- Example: `getWorkflowDefinition({ where: { id } })`

**get{Entity}By** (findFirst):
- O(n) query with any filter combination
- Supports `orderBy` for first match
- Example: `getWorkflowDefinitionBy({ where: { path, status }, orderBy: { created_at: "desc" } })`

**get{Entity}s** (findMany):
- Bulk queries with full Prisma API support
- Supports filtering, selection, sorting, pagination
- Example: `getWorkflowDefinitions({ where: { status: "active" }, skip: 20, take: 10 })`

**create{Entity}**:
- Returns created record or `null` on foreign key constraint failure
- Default includes applied
- Example: `createWorkflowDefinition({ data: { name, project_id } })`

**update{Entity}**:
- Generic update for any fields (replaces specialized functions like archive/unarchive)
- Returns updated record or `null` if not found (Prisma error P2025)
- Example: `updateWorkflowDefinition({ id, data: { status: "archived" } })`

**upsert{Entity}**:
- Atomic create-or-update using unique constraint
- Perfect for filesystem sync operations
- Example: `upsertWorkflowDefinition({ where: { project_id_identifier }, create: {...}, update: {...} })`

**delete{Entity}**:
- Hard delete (use sparingly - prefer soft delete via update)
- Returns deleted record or `null` if not found
- Example: `deleteWorkflowDefinition({ id })`

### Key Design Principles

1. **Options Pattern**: All services accept options object with Prisma's API (`where`, `select`, `include`, `orderBy`, `skip`, `take`)
2. **snake_case Fields**: Use Prisma field names (`project_id`, not `projectId`)
3. **Return null for Not Found**: Services return `null`, routes throw errors (`NotFoundError`)
4. **Default Includes**: Provide sensible defaults (e.g., `_count: { select: { runs: true } }`), allow override
5. **Error Handling**: Catch Prisma errors gracefully (P2025 = not found, foreign key = constraint failure)

### When to Use Each Pattern

**findUnique (`get{Entity}`):**
- Get by id (primary key)
- Get by compound unique key
- Fastest query (O(1) indexed lookup)
- Use when uniqueness guaranteed

**findFirst (`get{Entity}By`):**
- Get by any filter combination
- Get first match (ordering matters)
- O(n) query but index-optimized where possible
- Use when unique constraint unavailable

**findMany (`get{Entity}s`):**
- List all records
- Filter by multiple criteria
- Pagination and sorting
- Field selection for performance

**upsert:**
- Filesystem sync operations
- Idempotent updates
- Atomic create-or-update
- Perfect for external data sources

**Soft Delete (update) vs Hard Delete:**
- Prefer soft delete: `status: "archived"`
- Use hard delete only for:
  - Test data cleanup
  - GDPR compliance
  - Truly disposable records

**Reference Implementation:** Workflow definitions at `apps/app/src/server/domain/workflow/services/definitions/`

## Error Handling

### Custom Error Classes

Use custom error classes for consistent error handling.

**Available Errors:**
```typescript
// apps/app/src/server/errors.ts

class NotFoundError extends Error
class ValidationError extends Error
class UnauthorizedError extends Error
class ConflictError extends Error
class BadRequestError extends Error
```

**Usage:**
```typescript
// In services: return null
const project = await getProjectById({ projectId, userId });
if (!project) return null;

// In routes: throw errors
const project = await getProjectById({ projectId, userId });
if (!project) {
  throw new NotFoundError("Project not found");
}
```

**Best Practices:**
- Services return null for "not found"
- Routes throw custom errors
- Fastify error handler formats responses
- Use appropriate error class for HTTP status

✅ DO:
- Throw descriptive error messages
- Use appropriate error class
- Let Fastify handle formatting

❌ DON'T:
- Return error objects
- Throw generic Error
- Handle errors in services (let routes handle)

**Example:** `apps/app/src/server/errors.ts`

## Authentication

### JWT Authentication

Protect routes with `preHandler: fastify.authenticate`.

**Pattern:**
```typescript
fastify.get(
  "/protected",
  {
    preHandler: fastify.authenticate,
  },
  async (request, reply) => {
    const userId = request.user!.userId; // Type-safe after auth
    // ...
  }
);
```

**Token Generation:**
```typescript
const token = fastify.jwt.sign({
  userId: user.id,
  email: user.email,
});
```

**Best Practices:**
- Use preHandler for auth
- Access user via `request.user`
- Token includes userId and email
- Non-null assertion safe after auth

**Example:** `apps/app/src/server/routes/auth.ts`

## Validation

### Zod Schemas

Define Zod schemas in `domain/*/schemas/` or `shared/schemas/`.

**Pattern:**
```typescript
// domain/project/schemas/getProjectById.schema.ts
import { z } from "zod";

export const getProjectParamsSchema = z.object({
  id: z.string().uuid(),
});

export const projectResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  // ...
});

// In route
fastify.get(
  "/:id",
  {
    schema: {
      params: getProjectParamsSchema,
      response: { 200: projectResponseSchema },
    },
  },
  async (request, reply) => {
    // Validated params
  }
);
```

**Best Practices:**
- Separate schema files
- Validate params, body, query
- Type-safe response schemas
- Shared schemas in `shared/schemas/`

✅ DO:
- Define schemas near domain logic
- Use z.infer<typeof schema> for types
- Validate all inputs

❌ DON'T:
- Inline large schemas
- Skip validation
- Mix validation and business logic

**Example:** `apps/app/src/server/domain/project/schemas/`

## WebSocket Handlers

### Event-Based Handlers

WebSocket handlers subscribe to channels and broadcast events.

**Pattern:**
```typescript
// websocket/handlers/session.handler.ts

export function setupSessionHandler(eventBus: EventBus) {
  // Subscribe to events
  eventBus.on("session.stream_output", (data) => {
    const { sessionId, content, type } = data;

    // Broadcast to channel
    eventBus.broadcast(`session:${sessionId}`, {
      type: "session.stream_output",
      data: { content, type },
    });
  });
}
```

**Best Practices:**
- One handler file per domain
- Subscribe to domain events
- Broadcast to channels
- Use type-safe message format

✅ DO:
- Channel naming: `domain:id` (session:123)
- Event naming: `domain.action` (session.stream_output)
- Type-safe data payloads

❌ DON'T:
- Mix channel/event naming conventions
- Business logic in handlers
- Direct socket manipulation

**Example:** `apps/app/src/server/websocket/handlers/session.handler.ts`

**See Also:** `.agent/docs/websocket-architecture.md`

## Configuration

### Centralized Config

Always use centralized config, never access `process.env` directly.

**Pattern:**
```typescript
// ✅ DO
import { config } from "@/server/config";

const port = config.server.port;
const apiKey = config.apiKeys.anthropicApiKey;

// ❌ DON'T
const port = process.env.PORT;
const apiKey = process.env.ANTHROPIC_API_KEY;
```

**Config Structure:**
```typescript
// apps/app/src/server/config/index.ts

export const config = {
  server: {
    port: number,
    host: string,
    logLevel: string,
  },
  apiKeys: {
    anthropicApiKey: string | undefined,
    // ...
  },
  // ...
};
```

**Best Practices:**
- Import from `@/server/config`
- Type-safe config access
- Environment-specific defaults
- Validation at startup

## Testing Patterns

### Unit Tests

Test domain services in isolation.

**Pattern:**
```typescript
// domain/project/services/__tests__/createProject.test.ts

describe("createProject", () => {
  it("should create project with valid data", async () => {
    const project = await createProject({
      name: "Test Project",
      path: "/test/path",
      userId: "user-123",
    });

    expect(project).toMatchObject({
      name: "Test Project",
      path: "/test/path",
    });
  });
});
```

**Best Practices:**
- One test file per service
- Test file co-located with service in `__tests__/`
- Use fixtures for test data
- Clean up after tests (database)

**Example Files:**
- `apps/app/src/server/domain/project/services/__tests__/createProject.test.ts`
- See `.agent/docs/testing-best-practices.md` for comprehensive guide

### Route Tests

Test routes with Fastify test utilities.

**Pattern:**
```typescript
// routes/__tests__/projects.test.ts

describe("GET /api/projects/:id", () => {
  it("should return project for authenticated user", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: `/api/projects/${projectId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: projectId,
      name: "Test Project",
    });
  });
});
```

**Example:** `apps/app/src/server/routes/__tests__/projects.test.ts`

## Common Patterns

### Parallel Operations

Use `Promise.all` for independent async operations.

```typescript
// ✅ DO - Parallel
const [project, sessions, files] = await Promise.all([
  getProjectById({ projectId }),
  getProjectSessions({ projectId }),
  getProjectFiles({ projectPath }),
]);

// ❌ DON'T - Sequential
const project = await getProjectById({ projectId });
const sessions = await getProjectSessions({ projectId });
const files = await getProjectFiles({ projectPath });
```

### Transform Functions

Separate data fetching from transformation.

```typescript
function transformProjectToResponse(
  project: Project,
  metadata: { sessionCount: number }
) {
  return {
    id: project.id,
    name: project.name,
    sessionCount: metadata.sessionCount,
    // ... transform Prisma model to API format
  };
}
```

### Options Object Pattern

Use options object for functions with multiple parameters.

```typescript
// ✅ DO
async function getProjectById({
  projectId,
  userId,
  includeStats = false,
}: {
  projectId: string;
  userId: string;
  includeStats?: boolean;
}) {
  // ...
}

// ❌ DON'T
async function getProjectById(
  projectId: string,
  userId: string,
  includeStats?: boolean
) {
  // ...
}
```

## Quick Reference

**Domain Structure:**
```
domain/
├── {domain}/
│   ├── services/           # One function per file
│   ├── schemas/            # Zod validation
│   ├── types/              # TypeScript types
│   └── utils/              # Domain utilities
```

**Key Files:**
- Routes: `apps/app/src/server/routes/projects.ts`
- Services: `apps/app/src/server/domain/project/services/getProjectById.ts`
- Errors: `apps/app/src/server/errors.ts`
- Config: `apps/app/src/server/config/index.ts`
- WebSocket: `apps/app/src/server/websocket/handlers/session.handler.ts`

**Related Docs:**
- `.agent/docs/websocket-architecture.md` - WebSocket patterns
- `.agent/docs/testing-best-practices.md` - Testing guide
- `.agent/docs/database-guide.md` - Database patterns
