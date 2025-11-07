# Server Development Guide

This guide provides patterns, templates, and best practices for developing the Fastify backend server.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Adding New Endpoints](#adding-new-endpoints)
3. [Error Handling](#error-handling)
4. [Authentication](#authentication)
5. [Validation with Zod](#validation-with-zod)
6. [Services Pattern](#services-pattern)
7. [WebSocket Patterns](#websocket-patterns)
8. [Common Type Errors & Fixes](#common-type-errors--fixes)

---

## Architecture Overview

### Folder Structure

```
src/server/
├── index.ts                 # Server entry point, error handling, graceful shutdown
├── routes/                  # Route handlers (API endpoints)
│   ├── auth.ts             # Authentication endpoints
│   ├── projects.ts         # Project CRUD operations
│   ├── sessions.ts         # Session management
│   ├── shell.ts            # Shell WebSocket endpoint
│   └── slash-commands.ts   # Slash command endpoints
├── services/               # Business logic (functional exports)
│   ├── project.service.ts
│   ├── agent-session.service.ts
│   ├── file.service.ts
│   ├── shell.service.ts
│   ├── slash-command.service.ts
│   └── project-sync.service.ts
├── plugins/                # Fastify plugins
│   └── auth.ts            # JWT authentication plugin
├── utils/                  # Shared utilities
│   ├── auth.utils.ts      # JWTPayload interface
│   ├── error.utils.ts     # Custom error classes and builders
│   ├── path.utils.ts      # Claude projects path utilities
│   ├── response.utils.ts  # Standard response builders
│   └── shutdown.utils.ts  # Graceful shutdown handler
├── agents/                 # Agent-specific logic
│   ├── claude/
│   ├── codex/
│   ├── cursor/
│   └── gemini/
├── websocket.ts           # Main WebSocket handler
└── websocket.types.ts     # WebSocket TypeScript interfaces
```

### Key Patterns

1. **Functional Services**: All services export pure functions (no classes)
2. **Centralized Utilities**: Shared types and helpers in `utils/`
3. **Type Safety**: No `any` types, proper TypeScript throughout
4. **Consistent Errors**: Custom error classes with standard response format
5. **Structured Logging**: Use `fastify.log` with context objects
6. **Graceful Shutdown**: SIGINT/SIGTERM handlers prevent data corruption

---

## Adding New Endpoints

### Step-by-Step Guide

1. **Create or update a route file** in `src/server/routes/`
2. **Import required utilities** (error classes, services, validators)
3. **Define Zod schemas** for request/response validation
4. **Write route handler** with proper error handling
5. **Register route** in `src/server/routes/index.ts`

### Template: Protected CRUD Endpoint

```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotFoundError, buildErrorResponse } from '@/server/utils/error';
import { buildSuccessResponse } from '@/server/utils/response';
import { getItemById, createItem, updateItem, deleteItem } from '@/server/services/item';

// Request/Response Schemas
const CreateItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const UpdateItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const ItemParamsSchema = z.object({
  itemId: z.string().uuid(),
});

export async function registerItemRoutes(fastify: FastifyInstance) {
  // GET /api/items/:itemId - Get single item
  fastify.get<{
    Params: z.infer<typeof ItemParamsSchema>;
  }>(
    '/api/items/:itemId',
    {
      schema: {
        params: ItemParamsSchema,
      },
      preHandler: fastify.authenticate, // Requires JWT
    },
    async (request, reply) => {
      const { itemId } = request.params;
      const userId = request.user!.id;

      fastify.log.info({ userId, itemId }, 'Fetching item');

      const item = await getItemById(itemId, userId);
      if (!item) {
        throw new NotFoundError('Item not found');
      }

      return reply.send(buildSuccessResponse(item));
    }
  );

  // POST /api/items - Create new item
  fastify.post<{
    Body: z.infer<typeof CreateItemSchema>;
  }>(
    '/api/items',
    {
      schema: {
        body: CreateItemSchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const body = request.body;

      fastify.log.info({ userId, name: body.name }, 'Creating item');

      const item = await createItem(userId, body);

      return reply.code(201).send(buildSuccessResponse(item));
    }
  );

  // PATCH /api/items/:itemId - Update item
  fastify.patch<{
    Params: z.infer<typeof ItemParamsSchema>;
    Body: z.infer<typeof UpdateItemSchema>;
  }>(
    '/api/items/:itemId',
    {
      schema: {
        params: ItemParamsSchema,
        body: UpdateItemSchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { itemId } = request.params;
      const userId = request.user!.id;
      const body = request.body;

      fastify.log.info({ userId, itemId }, 'Updating item');

      const item = await updateItem(itemId, userId, body);
      if (!item) {
        throw new NotFoundError('Item not found');
      }

      return reply.send(buildSuccessResponse(item));
    }
  );

  // DELETE /api/items/:itemId - Delete item
  fastify.delete<{
    Params: z.infer<typeof ItemParamsSchema>;
  }>(
    '/api/items/:itemId',
    {
      schema: {
        params: ItemParamsSchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { itemId } = request.params;
      const userId = request.user!.id;

      fastify.log.info({ userId, itemId }, 'Deleting item');

      await deleteItem(itemId, userId);

      return reply.code(204).send();
    }
  );
}
```

### Registering Routes

In `src/server/routes/index.ts`:

```typescript
import { registerItemRoutes } from './items';

export async function registerRoutes(fastify: FastifyInstance) {
  // ... existing routes
  await registerItemRoutes(fastify);
}
```

---

## Error Handling

### Custom Error Classes

Located in `src/server/utils/error.utils.ts`:

- **`NotFoundError(message)`** - 404 errors (resource not found)
- **`UnauthorizedError(message)`** - 401 errors (authentication required)
- **`ForbiddenError(message)`** - 403 errors (insufficient permissions)
- **`ValidationError(message)`** - 400 errors (validation failures)

### Usage Examples

```typescript
import { NotFoundError, UnauthorizedError, ForbiddenError } from '@/server/utils/error';

// Throw custom errors - they're automatically caught by error handler
if (!project) {
  throw new NotFoundError('Project not found');
}

if (!hasPermission) {
  throw new ForbiddenError('You do not have permission to access this project');
}

if (!token) {
  throw new UnauthorizedError('Authentication required');
}
```

### Error Response Format

All errors return a consistent format:

```json
{
  "error": {
    "message": "Project not found",
    "statusCode": 404,
    "code": "NOT_FOUND" // Optional error code
  }
}
```

### Building Error Responses

```typescript
import { buildErrorResponse } from '@/server/utils/error';

// Manual error response (use custom errors instead when possible)
return reply.code(404).send(buildErrorResponse(404, 'Resource not found'));

// With error code
return reply.code(400).send(buildErrorResponse(400, 'Invalid input', 'VALIDATION_ERROR'));
```

### Global Error Handler

Located in `src/server/index.ts`, automatically handles:

1. **Zod validation errors** (400 with validation details)
2. **Custom error classes** (NotFoundError, UnauthorizedError, etc.)
3. **Prisma errors**:
   - `P2025` → 404 (record not found)
   - `P2002` → 409 (unique constraint violation)
4. **Generic errors** (500 with error message)

---

## Authentication

### Protecting Routes

Use the `preHandler: fastify.authenticate` option:

```typescript
fastify.get(
  '/api/protected',
  {
    preHandler: fastify.authenticate, // Requires valid JWT
  },
  async (request, reply) => {
    // Access authenticated user
    const userId = request.user!.id;
    const username = request.user!.username;

    return { message: `Hello, ${username}!` };
  }
);
```

### Accessing User Info

After authentication, `request.user` is available:

```typescript
interface FastifyRequest {
  user?: {
    id: string;
    username: string;
    is_active: boolean;
  };
}
```

### JWT Payload Type

Import the shared type:

```typescript
import { JWTPayload } from '@/server/utils/auth';

// JWTPayload interface:
// {
//   userId: string;
//   username: string;
// }
```

### Issuing Tokens

```typescript
const token = fastify.jwt.sign({
  userId: user.id,
  username: user.username,
} satisfies JWTPayload);
```

---

## Validation with Zod

### Request Schemas

Define schemas for params, query, body:

```typescript
import { z } from 'zod';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
});

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const BodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
```

### Using Schemas in Routes

```typescript
fastify.post<{
  Params: z.infer<typeof ParamsSchema>;
  Querystring: z.infer<typeof QuerySchema>;
  Body: z.infer<typeof BodySchema>;
}>(
  '/api/projects/:projectId',
  {
    schema: {
      params: ParamsSchema,
      querystring: QuerySchema,
      body: BodySchema,
    },
  },
  async (request, reply) => {
    // TypeScript knows the exact types!
    const { projectId } = request.params;      // string (UUID)
    const { page, limit } = request.query;     // number
    const { name, description } = request.body; // string

    // ...
  }
);
```

### Validation Errors

Zod validation failures automatically return:

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": [
      {
        "validation": "uuid",
        "code": "invalid_string",
        "message": "Invalid uuid",
        "path": ["projectId"]
      }
    ]
  }
}
```

---

## Services Pattern

### Functional Services

Services are **pure functions** (no classes):

```typescript
// ❌ OLD (class-based)
class ProjectService {
  async getProjectById(id: string) { ... }
}
export const projectService = new ProjectService();

// ✅ NEW (functional)
export async function getProjectById(id: string) { ... }
```

### Service Template

```typescript
import { prisma } from '@/shared/prisma';

/**
 * Get item by ID for a specific user
 */
export async function getItemById(itemId: string, userId: string) {
  return await prisma.item.findFirst({
    where: {
      id: itemId,
      userId,
    },
  });
}

/**
 * Create a new item for a user
 */
export async function createItem(
  userId: string,
  data: { name: string; description?: string }
) {
  return await prisma.item.create({
    data: {
      ...data,
      userId,
    },
  });
}

/**
 * Update an existing item (user ownership required)
 */
export async function updateItem(
  itemId: string,
  userId: string,
  data: { name?: string; description?: string }
) {
  // Verify ownership
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId },
  });

  if (!item) {
    return null; // Let route handler throw NotFoundError
  }

  return await prisma.item.update({
    where: { id: itemId },
    data,
  });
}

/**
 * Delete an item (user ownership required)
 */
export async function deleteItem(itemId: string, userId: string) {
  await prisma.item.deleteMany({
    where: {
      id: itemId,
      userId,
    },
  });
}
```

### Service Guidelines

1. **Export pure functions** (no classes or singletons)
2. **Accept parameters explicitly** (no hidden state)
3. **Return null for "not found"** (let routes decide error handling)
4. **Keep business logic in services** (routes should be thin)
5. **Use Prisma for database access** (import from `@/shared/prisma`)
6. **Add JSDoc comments** for function documentation

---

## WebSocket Patterns

### WebSocket Types

All WebSocket types are in `src/server/websocket.types.ts`:

```typescript
import type { WebSocketMessage, SessionSendMessageData } from '@/server/websocket.types';
```

### Message Format

```typescript
interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
}
```

### Sending Messages

```typescript
import type { WebSocket } from '@fastify/websocket';

function sendMessage<T>(socket: WebSocket, type: string, data: T): void {
  if (socket.readyState === 1) { // OPEN state
    socket.send(JSON.stringify({ type, data }));
  }
}

// Usage
sendMessage(socket, 'session:message', {
  messageId: '123',
  content: 'Hello',
});
```

### WebSocket Handler Template

```typescript
import type { FastifyInstance } from 'fastify';
import type { WebSocketMessage } from '@/server/websocket.types';

export async function registerMyWebSocket(fastify: FastifyInstance) {
  fastify.get(
    '/my-websocket',
    { websocket: true },
    (socket, request) => {
      fastify.log.info('WebSocket client connected');

      socket.on('message', async (rawMessage) => {
        try {
          // Parse message
          const buffer = rawMessage instanceof Buffer ? rawMessage : Buffer.from(rawMessage as ArrayBuffer);
          const message = JSON.parse(buffer.toString('utf-8')) as WebSocketMessage;

          fastify.log.debug({ type: message.type }, 'Received WebSocket message');

          // Route to handlers
          if (message.type === 'my:event') {
            await handleMyEvent(socket, message.data);
          } else {
            fastify.log.warn({ type: message.type }, 'Unknown WebSocket message type');
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          fastify.log.error({ err }, 'WebSocket message handling error');
          sendMessage(socket, 'error', { message: err.message });
        }
      });

      socket.on('close', () => {
        fastify.log.info('WebSocket client disconnected');
        // Cleanup logic here
      });

      socket.on('error', (err) => {
        fastify.log.error({ err }, 'WebSocket error');
      });
    }
  );
}

async function handleMyEvent(socket: WebSocket, data: unknown) {
  // Event handling logic
  sendMessage(socket, 'my:response', { success: true });
}

function sendMessage<T>(socket: WebSocket, type: string, data: T): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({ type, data }));
  }
}
```

### Active Sessions Management

```typescript
import type { ActiveSessionData } from '@/server/websocket.types';

// Module-level Map for active sessions
export const activeSessions = new Map<string, ActiveSessionData>();

// Add session
activeSessions.set(sessionId, {
  socket,
  projectId,
  userId,
  tempImageDir: '/tmp/session-123',
});

// Get session
const session = activeSessions.get(sessionId);

// Remove session
activeSessions.delete(sessionId);
```

---

## Common Type Errors & Fixes

### Error: "Property 'user' does not exist on type 'FastifyRequest'"

**Cause**: TypeScript doesn't know about the `user` property added by auth plugin.

**Fix**: The type augmentation is already in `src/server/plugins/auth.ts`. Use the non-null assertion:

```typescript
const userId = request.user!.id; // ✅ Correct (after preHandler: authenticate)
```

### Error: "Argument of type 'X' is not assignable to parameter of type 'never'"

**Cause**: Zod schema types not inferred correctly.

**Fix**: Use `z.infer<typeof Schema>`:

```typescript
fastify.post<{
  Body: z.infer<typeof BodySchema>; // ✅ Correct
}>(/* ... */);
```

### Error: "Cannot find module '@/server/...'"

**Cause**: Path alias not resolved.

**Fix**: Always use `@/server/`, `@/client/`, or `@/shared/` aliases:

```typescript
import { prisma } from '@/shared/prisma';           // ✅ Correct
import { getProjectById } from '@/server/services/project.service'; // ✅ Correct
```

### Error: "Object is possibly 'undefined'"

**Cause**: Value might be undefined.

**Fix**: Check before use or throw error:

```typescript
if (!project) {
  throw new NotFoundError('Project not found');
}
// Now TypeScript knows project is defined
return project.name;
```

### Error: "Unsafe assignment of 'any' value"

**Cause**: Using `any` type.

**Fix**: Use proper types or `unknown`:

```typescript
// ❌ Bad
const data: any = JSON.parse(msg);

// ✅ Good
const data: WebSocketMessage = JSON.parse(msg) as WebSocketMessage;

// ✅ Better (validate)
const parsedData = JSON.parse(msg);
const validated = MessageSchema.parse(parsedData);
```

### Error: "Cannot read property 'log' of undefined"

**Cause**: Trying to use `fastify.log` in a service function.

**Fix**: Services don't have access to `fastify.log`. Either:

1. Pass logger as parameter (optional):
   ```typescript
   export async function myService(id: string, logger?: FastifyBaseLogger) {
     logger?.info({ id }, 'Processing item');
     // ...
   }
   ```

2. Or remove debug logs from services (preferred for simplicity)

---

## Best Practices Summary

1. ✅ **Use functional services** (no classes)
2. ✅ **Import shared utilities** (don't duplicate JWTPayload, path utils, etc.)
3. ✅ **Throw custom errors** (NotFoundError, UnauthorizedError, etc.)
4. ✅ **Use Zod for validation** (params, query, body)
5. ✅ **Structure logging** with context objects
6. ✅ **No `any` types** - use `unknown` or proper types
7. ✅ **Protect routes** with `preHandler: fastify.authenticate`
8. ✅ **Return standard responses** with `buildSuccessResponse()`
9. ✅ **Handle WebSocket errors** with try/catch
10. ✅ **Export activeSessions** for graceful shutdown cleanup

---

## Quick Reference

### Import Paths

```typescript
// Utilities
import { JWTPayload } from '@/server/utils/auth';
import { NotFoundError, buildErrorResponse } from '@/server/utils/error';
import { buildSuccessResponse } from '@/server/utils/response';
import { getSessionFilePath } from '@/server/utils/path';

// Services
import { getProjectById, createProject } from '@/server/services/project.service';

// WebSocket
import type { WebSocketMessage } from '@/server/websocket.types';
import { activeSessions } from '@/server/websocket';

// Shared
import { prisma } from '@/shared/prisma';
```

### HTTP Status Codes

- `200` - OK (successful GET/PATCH)
- `201` - Created (successful POST)
- `204` - No Content (successful DELETE)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error (unexpected error)

---

For more examples, see existing route handlers in `src/server/routes/`.
