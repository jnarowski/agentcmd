# Backend Testing Guide

This guide explains the gold standard testing pattern for backend routes using in-memory SQLite, Prisma, and Fastify.

## Table of Contents

- [Quick Start](#quick-start)
- [When to Use In-Memory DB vs Mocks](#when-to-use-in-memory-db-vs-mocks)
- [Test Utilities](#test-utilities)
- [Copy-Paste Template](#copy-paste-template)
- [Common Patterns](#common-patterns)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import {
  setupTestDB,
  cleanTestDB,
  teardownTestDB,
} from "@/server/test-utils/db";
import {
  createTestApp,
  closeTestApp,
  injectAuth,
} from "@/server/test-utils/fastify";
import {
  createTestUser,
  createTestProject,
} from "@/server/test-utils/fixtures";

describe("GET /api/my-endpoint", () => {
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

  it("should return 200 for authenticated request", async () => {
    const user = await createTestUser(prisma);
    const headers = injectAuth(user.id, user.email, app);

    const response = await app.inject({
      method: "GET",
      url: "/api/my-endpoint",
      headers,
    });

    expect(response.statusCode).toBe(200);
  });
});
```

---

## When to Use In-Memory DB vs Mocks

### ✅ Use In-Memory SQLite (Integration Tests) For:

- **HTTP Route Testing** - Testing full request → database → response flow
- **Schema Validation** - Catching Prisma schema mismatches
- **Complex Queries** - Relations, transactions, joins
- **Error Cases** - Constraint violations, not found errors

**Benefits:**

- Real Prisma queries (catches schema issues)
- No manual mocking overhead
- Fast (~50ms per test with setup)
- Reliable and predictable

**Example:**

```typescript
// Testing GET /api/projects/:id route
const project = await createTestProject(prisma, { name: "Test" });
const response = await app.inject({
  method: "GET",
  url: `/api/projects/${project.id}`,
  headers,
});
expect(response.statusCode).toBe(200);
```

### ⚠️ Use Mocks (Unit Tests) For:

- **Domain Service Functions** - Testing business logic in isolation
- **External APIs** - Anthropic AI, GitHub CLI, external services
- **Performance-Critical Tests** - Tests that run 1000s of times

**Example:**

```typescript
// Unit test for domain service
import { vi } from "vitest";

vi.mock("@/shared/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn().mockResolvedValue({ id: "1", name: "Mock" }),
    },
  },
}));

const result = await getProjectById("1");
expect(result?.name).toBe("Mock");
```

### 🚫 Don't Mock Prisma in Integration Tests

Avoid manual Prisma mocking for route tests—use in-memory DB instead:

```typescript
// ❌ BAD - Manual Prisma mocking in route test
vi.mock("@/shared/prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
  },
}));

// ✅ GOOD - Real Prisma with in-memory DB
const project = await createTestProject(prisma, { name: "Test" });
```

---

## Test Utilities

### Database Utilities (`db.ts`)

```typescript
import {
  setupTestDB,
  cleanTestDB,
  teardownTestDB,
} from "@/server/test-utils/db";

// Setup in-memory SQLite DB with migrations
const prisma = await setupTestDB();

// Clean all tables (fast, preserves schema)
await cleanTestDB(prisma);

// Teardown and disconnect
await teardownTestDB();
```

**How it Works:**

- `setupTestDB()` - Creates `:memory:` SQLite DB, runs `pnpm prisma migrate deploy`
- `cleanTestDB()` - Truncates all tables in correct FK order
- `teardownTestDB()` - Disconnects Prisma client

**Performance:**

- Setup: ~500ms (once per test suite)
- Clean: ~20ms (between tests)
- Total test time: ~50ms per test

### Fixture Factories (`fixtures.ts`)

```typescript
import {
  createTestUser,
  createTestProject,
  createTestSession,
  createAuthToken,
} from "@/server/test-utils/fixtures";

// Create test user (password auto-hashed with bcrypt)
const user = await createTestUser(prisma, {
  email: "user@example.com",
  password: "password123",
});

// Create test project
const project = await createTestProject(prisma, {
  name: "My Project",
  path: "/tmp/my-project",
  is_starred: true,
});

// Create test session (requires projectId + userId)
const session = await createTestSession(prisma, {
  projectId: project.id,
  userId: user.id,
  agent: AgentType.claude,
  state: SessionState.idle,
});

// Generate JWT token
const token = createAuthToken(user.id, user.email, fastify);
```

**Defaults:**

- `createTestUser` - `email: "test@example.com"`, `password: "testpassword123"`
- `createTestProject` - `name: "Test Project"`, `path: "/tmp/test-project"`
- `createTestSession` - `agent: "claude"`, `state: "idle"`

### Fastify Test App (`fastify.ts`)

```typescript
import {
  createTestApp,
  closeTestApp,
  injectAuth,
} from "@/server/test-utils/fastify";

// Create Fastify app (auth + routes registered)
const app = await createTestApp();

// Generate Bearer token header
const headers = injectAuth(userId, email, app);

// Make authenticated request
const response = await app.inject({
  method: "GET",
  url: "/api/projects",
  headers,
});

// Close app
await closeTestApp(app);
```

---

## Copy-Paste Template

Use this template for new route tests:

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import {
  setupTestDB,
  cleanTestDB,
  teardownTestDB,
} from "@/server/test-utils/db";
import {
  createTestApp,
  closeTestApp,
  injectAuth,
} from "@/server/test-utils/fastify";
import {
  createTestUser,
  createTestProject,
} from "@/server/test-utils/fixtures";
import { myResponseSchema } from "@/server/domain/my-domain/schemas";

describe("GET /api/my-endpoint", () => {
  let app: FastifyInstance & { jwt: { sign: (payload: object) => string } };
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Set JWT secret for tests
    process.env.JWT_SECRET = "test-secret-for-integration-tests";

    // Setup database and app
    prisma = await setupTestDB();
    app = await createTestApp();
  });

  afterEach(async () => {
    // Clean DB between tests (fresh state)
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    // Teardown resources
    await closeTestApp(app);
    await teardownTestDB();
  });

  it("should return 200 for valid request", async () => {
    // Arrange
    const user = await createTestUser(prisma);
    const headers = injectAuth(user.id, user.email, app);

    // Act
    const response = await app.inject({
      method: "GET",
      url: "/api/my-endpoint",
      headers,
    });

    // Assert
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    const validationResult = myResponseSchema.safeParse(body);
    expect(validationResult.success).toBe(true);
  });

  it("should return 404 for non-existent resource", async () => {
    const user = await createTestUser(prisma);
    const headers = injectAuth(user.id, user.email, app);

    const response = await app.inject({
      method: "GET",
      url: "/api/my-endpoint/non-existent-id",
      headers,
    });

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("error");
    expect(body.error.message).toContain("not found");
  });

  it("should return 401 for missing authentication", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/my-endpoint",
      // No headers - missing auth
    });

    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body.error.message).toMatch(/unauthorized|invalid|missing token/i);
  });

  it("should return 400 for invalid input", async () => {
    const user = await createTestUser(prisma);
    const headers = injectAuth(user.id, user.email, app);

    const response = await app.inject({
      method: "POST",
      url: "/api/my-endpoint",
      headers,
      payload: {
        // Invalid data
        name: "", // Empty string
      },
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error).toHaveProperty("code", "VALIDATION_ERROR");
    expect(body.error).toHaveProperty("details");
  });
});
```

---

## Common Patterns

### Testing 200 Success

```typescript
it("should return project data", async () => {
  const user = await createTestUser(prisma);
  const project = await createTestProject(prisma, { name: "Test Project" });
  const headers = injectAuth(user.id, user.email, app);

  const response = await app.inject({
    method: "GET",
    url: `/api/projects/${project.id}`,
    headers,
  });

  expect(response.statusCode).toBe(200);

  const body = JSON.parse(response.body);
  expect(body.data).toMatchObject({
    id: project.id,
    name: "Test Project",
  });

  // Validate with Zod schema
  const validationResult = projectResponseSchema.safeParse(body);
  expect(validationResult.success).toBe(true);
});
```

### Testing 404 Not Found

```typescript
it("should return 404 for non-existent project", async () => {
  const user = await createTestUser(prisma);
  const headers = injectAuth(user.id, user.email, app);

  // Valid CUID format but doesn't exist
  const nonExistentId = "clx0000000000000000000001";

  const response = await app.inject({
    method: "GET",
    url: `/api/projects/${nonExistentId}`,
    headers,
  });

  expect(response.statusCode).toBe(404);

  const body = JSON.parse(response.body);
  expect(body.error.message).toContain("not found");
});
```

### Testing 401 Unauthorized

```typescript
it("should require authentication", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/projects",
    // No headers - missing auth
  });

  expect(response.statusCode).toBe(401);
});
```

### Testing 400 Validation Error

```typescript
it("should validate request body", async () => {
  const user = await createTestUser(prisma);
  const headers = injectAuth(user.id, user.email, app);

  const response = await app.inject({
    method: "POST",
    url: "/api/projects",
    headers,
    payload: {
      name: "", // Invalid: empty string
      path: "/tmp/test",
    },
  });

  expect(response.statusCode).toBe(400);

  const body = JSON.parse(response.body);
  expect(body.error).toHaveProperty("code", "VALIDATION_ERROR");
  expect(body.error.details).toBeDefined();
});
```

### Testing Schema Validation

```typescript
it("should match response schema", async () => {
  const user = await createTestUser(prisma);
  const project = await createTestProject(prisma);
  const headers = injectAuth(user.id, user.email, app);

  const response = await app.inject({
    method: "GET",
    url: `/api/projects/${project.id}`,
    headers,
  });

  const body = JSON.parse(response.body);

  // Use Zod parse() - throws if invalid
  const parseResult = projectResponseSchema.parse(body);

  expect(parseResult.data.id).toBe(project.id);
  expect(parseResult.data.created_at).toBeInstanceOf(Date);
});
```

### Testing Concurrent Requests

```typescript
it("should handle concurrent requests", async () => {
  const user = await createTestUser(prisma);
  const headers = injectAuth(user.id, user.email, app);

  const project1 = await createTestProject(prisma, { path: "/tmp/p1" });
  const project2 = await createTestProject(prisma, { path: "/tmp/p2" });

  const [response1, response2] = await Promise.all([
    app.inject({ method: "GET", url: `/api/projects/${project1.id}`, headers }),
    app.inject({ method: "GET", url: `/api/projects/${project2.id}`, headers }),
  ]);

  expect(response1.statusCode).toBe(200);
  expect(response2.statusCode).toBe(200);

  const body1 = JSON.parse(response1.body);
  const body2 = JSON.parse(response2.body);

  expect(body1.data.id).toBe(project1.id);
  expect(body2.data.id).toBe(project2.id);
});
```

---

## Performance

### Benchmarks

Based on gold standard test (`projects.test.ts`):

| Operation                       | Duration   |
| ------------------------------- | ---------- |
| `setupTestDB()` (one-time)      | ~500ms     |
| Single test execution           | ~50ms      |
| `cleanTestDB()` (between tests) | ~20ms      |
| Full test suite (6 tests)       | <5 seconds |

### Performance Tips

1. **Share DB/App Across Tests** - Use `beforeAll` (not `beforeEach`)
2. **Clean, Don't Recreate** - Use `cleanTestDB()` between tests (don't teardown/setup)
3. **Minimize Fixtures** - Only create data needed for specific test
4. **Use Transactions** - Prisma transactions rollback automatically on error

### Slow Tests?

If tests exceed ~50ms each:

1. Check migration execution (should only run once in `beforeAll`)
2. Verify `cleanTestDB` uses DELETE, not DROP/CREATE
3. Ensure single Prisma client instance (singleton pattern)
4. Profile with `pnpm test --reporter=verbose`

---

## Troubleshooting

### "Database is locked"

**Cause**: Multiple Prisma clients or unclosed connections

**Fix**:

```bash
# Kill zombie processes
killall node

# Restart tests
pnpm test
```

### "Migration failed"

**Cause**: Prisma schema out of sync with migrations

**Fix**:

```bash
cd apps/app
pnpm prisma:generate
pnpm prisma:migrate
```

### "JWT_SECRET not set"

**Cause**: Environment variable missing

**Fix**: Add to `beforeAll`:

```typescript
beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  // ...
});
```

### "Prisma client not initialized"

**Cause**: `setupTestDB()` not called or failed

**Fix**: Check `beforeAll` hook runs successfully:

```typescript
beforeAll(async () => {
  prisma = await setupTestDB(); // ← Ensure this succeeds
  app = await createTestApp();
});
```

### Tests Pass Individually, Fail Together

**Cause**: Data leaking between tests (not cleaning DB)

**Fix**: Ensure `afterEach` cleans database:

```typescript
afterEach(async () => {
  await cleanTestDB(prisma); // ← Critical
});
```

### "Cannot find module"

**Cause**: Path alias not resolved

**Fix**: Use `@/server/` aliases (not relative paths):

```typescript
// ✅ GOOD
import { setupTestDB } from "@/server/test-utils/db";

// ❌ BAD
import { setupTestDB } from "../test-utils/db";
```

---

## Next Steps

1. **Copy template** from above
2. **Create test file** in `apps/app/src/server/routes/{route}.test.ts`
3. **Run tests**: `pnpm test src/server/routes/{route}.test.ts`
4. **Add coverage** for edge cases (errors, validation, concurrent requests)

For more examples, see the gold standard test:

```
apps/app/src/server/routes/projects.test.ts
```

---

**Happy Testing! 🎉**
