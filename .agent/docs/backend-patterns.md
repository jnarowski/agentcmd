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

### Get Single Record (findUnique)

Use `get{Entity}` for O(1) indexed lookups by unique constraint.

```typescript
// apps/app/src/server/domain/workflow/services/definitions/getWorkflowDefinition.ts

import { prisma } from "@/shared/prisma";
import type { GetWorkflowDefinitionOptions } from "../../types/GetWorkflowDefinitionOptions";

/**
 * Get single workflow definition by unique constraint (O(1) indexed lookup)
 * Supports id OR project_id_identifier compound key
 * Returns null if not found (routes handle error throwing)
 */
export async function getWorkflowDefinition(
  options: GetWorkflowDefinitionOptions
): Promise<WorkflowDefinition | null> {
  const { where, include } = options;

  const includeConfig = include ?? {
    _count: { select: { runs: true } },
  };

  return await prisma.workflowDefinition.findUnique({
    where,
    include: includeConfig,
  });
}
```

**Type Definition:**
```typescript
// apps/app/src/server/domain/workflow/types/GetWorkflowDefinitionOptions.ts

export type GetWorkflowDefinitionOptions = {
  where:
    | { id: string }
    | {
        project_id_identifier: {
          project_id: string;
          identifier: string;
        };
      };
  include?: Prisma.WorkflowDefinitionInclude;
};
```

**Usage:**
```typescript
// By id (fastest)
const def = await getWorkflowDefinition({ where: { id: "def-123" } });

// By compound unique key
const def = await getWorkflowDefinition({
  where: {
    project_id_identifier: {
      project_id: "proj-1",
      identifier: "workflow-1",
    },
  },
});
```

### Get Single Record (findFirst)

Use `get{Entity}By` for O(n) queries with any filter combination.

```typescript
// apps/app/src/server/domain/workflow/services/definitions/getWorkflowDefinitionBy.ts

/**
 * Get single workflow definition by any filter combination (O(n) query)
 * Uses findFirst for flexible non-unique lookups
 * Returns null if not found
 */
export async function getWorkflowDefinitionBy(
  options: GetWorkflowDefinitionByOptions
): Promise<WorkflowDefinition | null> {
  const { where, orderBy, include } = options;

  const includeConfig = include ?? {
    _count: { select: { runs: true } },
  };

  return await prisma.workflowDefinition.findFirst({
    where,
    orderBy,
    include: includeConfig,
  });
}
```

**Usage:**
```typescript
// By any filter
const def = await getWorkflowDefinitionBy({
  where: { path: "/workflows/main.ts", status: "active" },
  orderBy: { created_at: "desc" },
});
```

### Get Multiple Records (findMany)

Use `get{Entity}s` for bulk queries with full Prisma API support.

```typescript
// apps/app/src/server/domain/workflow/services/definitions/getWorkflowDefinitions.ts

/**
 * Get multiple workflow definitions with full Prisma API support
 * Supports filtering, selection, sorting, and pagination
 */
export async function getWorkflowDefinitions(
  options: GetWorkflowDefinitionsOptions = {}
) {
  const { where, select, include, orderBy, skip, take } = options;

  const includeConfig = include ?? (select ? undefined : {
    _count: { select: { runs: true } },
  });

  return await prisma.workflowDefinition.findMany({
    where,
    select,
    include: includeConfig,
    orderBy,
    skip,
    take,
  });
}
```

**Usage:**
```typescript
// All active definitions
const defs = await getWorkflowDefinitions({
  where: { status: "active" },
  orderBy: { name: "asc" },
});

// Project-scoped with pagination
const defs = await getWorkflowDefinitions({
  where: { project_id: "proj-1", status: "active" },
  skip: 20,
  take: 10,
});

// Field selection for performance
const defs = await getWorkflowDefinitions({
  where: { status: "active" },
  select: { id: true, name: true, identifier: true },
});
```

### Create Record

```typescript
// apps/app/src/server/domain/workflow/services/definitions/createWorkflowDefinition.ts

/**
 * Create new workflow definition with validation
 * Returns created definition or null if project not found
 */
export async function createWorkflowDefinition(
  options: CreateWorkflowDefinitionOptions
): Promise<WorkflowDefinition | null> {
  const { data, include } = options;

  const includeConfig = include ?? {
    _count: { select: { runs: true } },
  };

  try {
    return await prisma.workflowDefinition.create({
      data,
      include: includeConfig,
    });
  } catch (error) {
    // Foreign key constraint failure
    if (error instanceof Error && error.message.includes("Foreign key constraint")) {
      return null;
    }
    throw error;
  }
}
```

### Update Record

```typescript
// apps/app/src/server/domain/workflow/services/definitions/updateWorkflowDefinition.ts

/**
 * Generic update for any workflow definition fields
 * Replaces specialized functions (archive, unarchive, etc.)
 * Returns updated definition or null if not found
 */
export async function updateWorkflowDefinition(
  options: UpdateWorkflowDefinitionOptions
): Promise<WorkflowDefinition | null> {
  const { id, data, include } = options;

  const includeConfig = include ?? {
    _count: { select: { runs: true } },
  };

  try {
    return await prisma.workflowDefinition.update({
      where: { id },
      data,
      include: includeConfig,
    });
  } catch (error) {
    // Handle record not found (P2025)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  }
}
```

**Usage (replaces archive/unarchive):**
```typescript
// Archive definition (soft delete)
const archived = await updateWorkflowDefinition({
  id: "def-123",
  data: {
    status: "archived",
    archived_at: new Date(),
  },
});

// Unarchive definition
const unarchived = await updateWorkflowDefinition({
  id: "def-123",
  data: {
    status: "active",
    archived_at: null,
  },
});
```

### Upsert Record

```typescript
// apps/app/src/server/domain/workflow/services/definitions/upsertWorkflowDefinition.ts

/**
 * Atomic create-or-update using compound unique key
 * Perfect for workflow scanning (sync filesystem → DB)
 */
export async function upsertWorkflowDefinition(
  options: UpsertWorkflowDefinitionOptions
): Promise<WorkflowDefinition> {
  const { where, create, update, include } = options;

  const includeConfig = include ?? {
    _count: { select: { runs: true } },
  };

  return await prisma.workflowDefinition.upsert({
    where,
    create,
    update,
    include: includeConfig,
  });
}
```

**Usage:**
```typescript
// Sync workflow from filesystem
const def = await upsertWorkflowDefinition({
  where: {
    project_id_identifier: {
      project_id: "proj-1",
      identifier: "workflow-1",
    },
  },
  create: {
    name: "New Workflow",
    path: "/workflows/new.ts",
    project_id: "proj-1",
    identifier: "workflow-1",
    // ... other fields
  },
  update: {
    name: "Updated Workflow",
    path: "/workflows/new.ts",
  },
});
```

### Delete Record

```typescript
// apps/app/src/server/domain/workflow/services/definitions/deleteWorkflowDefinition.ts

/**
 * Hard delete workflow definition (use sparingly)
 * Prefer updateWorkflowDefinition with status: "archived" for soft delete
 */
export async function deleteWorkflowDefinition(
  options: DeleteWorkflowDefinitionOptions
): Promise<WorkflowDefinition | null> {
  const { id, include } = options;

  const includeConfig = include ?? {
    _count: { select: { runs: true } },
  };

  try {
    return await prisma.workflowDefinition.delete({
      where: { id },
      include: includeConfig,
    });
  } catch (error) {
    // Handle record not found (P2025)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  }
}
```

### Key Design Principles

**1. Options Pattern**
All services use options object with Prisma's API:
```typescript
type GetWorkflowDefinitionsOptions = {
  where?: Prisma.WorkflowDefinitionWhereInput;
  select?: Prisma.WorkflowDefinitionSelect;
  include?: Prisma.WorkflowDefinitionInclude;
  orderBy?: Prisma.WorkflowDefinitionOrderByWithRelationInput;
  skip?: number;
  take?: number;
};
```

**2. Prisma Field Names**
Use snake_case field names matching database schema:
```typescript
// ✅ DO
where: { project_id: "proj-1", is_template: true }

// ❌ DON'T
where: { projectId: "proj-1", isTemplate: true }
```

**3. Return null for Not Found**
Services return `null`, routes throw errors:
```typescript
// Service
const project = await getProjectById({ projectId });
if (!project) return null;

// Route
const project = await getProjectById({ projectId });
if (!project) {
  throw new NotFoundError("Project not found");
}
```

**4. Default Includes**
Provide sensible defaults, allow override:
```typescript
const includeConfig = include ?? {
  _count: { select: { runs: true } },
};
```

**5. Error Handling**
Handle Prisma errors gracefully:
```typescript
try {
  return await prisma.entity.update({ ... });
} catch (error) {
  // P2025 = Record not found
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return null;
  }
  throw error;
}
```

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
