# Testing Best Practices

Comprehensive guide for writing and executing tests in this monorepo. Use this as a reference when writing or running tests.

## Quick Start

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## Test Structure

This project uses [Vitest](https://vitest.dev/) with automatic environment detection:

### Server Tests (`src/server/**/*.test.ts`)

- **Environment:** Node.js
- **Use for:** Services, routes, utilities, business logic
- **Example:** `createProject.test.ts`, `projects.test.ts`

### Client Tests (`src/client/**/*.test.ts`)

- **Environment:** happy-dom (lightweight DOM simulation)
- **Use for:** React hooks, components, stores, utilities
- **Example:** `useProjects.test.ts`, `sessionStore.test.ts`

## Gold Standard Principles

These principles apply to **ALL tests** regardless of type:

### 1. Minimal Mocking

- **Prefer real implementations** over mocks when possible
- Use real Prisma database with cleanup between tests
- Only mock external dependencies (filesystem, git commands, CLI processes)
- Example: Mock `isGitRepository()` but use real `prisma.project.create()`

### 2. Behavior Over Implementation

- **Test outcomes, not internals**
- Don't test private methods or internal state
- Focus on what the function returns or what side effects it has
- Example: Test that a project is created in DB, not how the SQL query is built

### 3. AAA Structure (Arrange-Act-Assert)

```typescript
it("should create project with git capabilities", async () => {
  // Arrange: Setup test data and mocks
  const mockIsGitRepository = vi.mocked(isGitRepository);
  mockIsGitRepository.mockResolvedValue({ initialized: true, branch: "main" });

  // Act: Execute the function
  const project = await createProject({
    data: { name: "Test", path: "/tmp/test" },
  });

  // Assert: Verify the outcome
  expect(project.capabilities.git.initialized).toBe(true);
  expect(project.capabilities.git.branch).toBe("main");
});
```

### 4. Descriptive Test Names

- Use `it("should ...")` format
- Name should explain expected behavior
- Include context when needed
- Examples:
  - ✅ `"should return 404 for non-existent project ID"`
  - ✅ `"should handle concurrent requests correctly"`
  - ❌ `"test project creation"`
  - ❌ `"works"`

### 5. Test Edge Cases

- Success cases (happy path)
- Error cases (not found, validation errors, unauthorized)
- Boundary conditions (empty strings, null values, concurrent operations)
- Race conditions (missing process, state transitions)

## Decision Guide

### When to Mock vs Real Implementation

**Use Real Implementation:**

- ✅ Prisma database operations (use `cleanTestDB` between tests)
- ✅ Domain services (call actual service functions)
- ✅ Fastify app (use `app.inject()` for route tests)
- ✅ Pure utility functions

**Mock External Dependencies:**

- ❌ Filesystem operations (`fs.readFile`, `fs.writeFile`)
- ❌ Git commands (`isGitRepository`, `getCurrentBranch`)
- ❌ CLI processes (agent execution, shell sessions)
- ❌ External APIs (GitHub API, AI services)
- ❌ Time-dependent operations (`Date.now()`)

### Unit vs Integration Tests

**Service Tests (Unit/Integration Hybrid):**

- Test single service function
- Use real Prisma database
- Mock external dependencies only
- Example: `createProject.test.ts`

**Route Tests (Integration):**

- Test full HTTP request lifecycle
- Use fixtures for setup (`createAuthenticatedUser`, `createTestProject`)
- Test authentication, validation, response format
- Example: `projects.test.ts`

**Integration Tests (Placeholder):**

- Test multiple services working together
- Test WebSocket + database + service interactions
- TODO: Add examples when identified

### Test Data Management

**Route Tests - Use Fixtures:**

```typescript
// Use helper functions for complex setup
const { headers } = await createAuthenticatedUser(prisma, app, {
  email: "test@example.com",
});

const project = await createTestProject(prisma, {
  name: "Test Project",
  path: "/tmp/test-project",
});
```

**Service Tests - Direct Calls:**

```typescript
// Call services directly, let DB generate IDs
const project = await createProject({
  data: { name: "Test Project", path: "/tmp/test" },
});

expect(project.id).toBeDefined(); // Don't hardcode IDs
```

**Avoid Hardcoded Values:**

- ❌ Don't use hardcoded CUIDs: `const id = "clx123456789"`
- ✅ Let database generate: `const project = await createProject(...)`
- ❌ Don't hardcode dates: `created_at: new Date("2024-01-01")`
- ✅ Use current time: `created_at: new Date()`

## Server Testing

### Service Tests

Service tests focus on domain logic with minimal mocking.

#### Gold Standard Example: `createProject.test.ts`

**Why This is Gold Standard:**

- Uses **real Prisma database** (not mocked)
- Mocks **only external dependencies** (git, filesystem)
- Tests **behavior** (project created, capabilities detected)
- Tests **edge cases** (concurrent creation, errors, validation)
- **Clean setup/teardown** with `cleanTestDB`

**Key Patterns:**

```typescript
import { describe, it, expect, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createProject } from "./createProject";
import * as isGitRepositoryModule from "@/server/domain/git/services/isGitRepository";

// Mock external dependencies only
vi.mock("@/server/domain/git/services/isGitRepository", () => ({
  isGitRepository: vi.fn(),
}));

describe("createProject", () => {
  afterEach(async () => {
    await cleanTestDB(prisma); // Clean database between tests
    vi.clearAllMocks();
  });

  it("creates project with git branch detection", async () => {
    // Arrange: Mock external dependency
    const mockIsGitRepository = vi.mocked(
      isGitRepositoryModule.isGitRepository
    );
    mockIsGitRepository.mockResolvedValue({
      initialized: true,
      error: null,
      branch: "main",
    });

    // Act: Call service directly (no fixtures needed)
    const project = await createProject({
      data: {
        name: "Test Project",
        path: "/tmp/test-project",
      },
    });

    // Assert: Verify behavior
    expect(project).toBeDefined();
    expect(project.id).toBeDefined(); // DB generates ID
    expect(project.name).toBe("Test Project");
    expect(project.capabilities.git.initialized).toBe(true);
    expect(project.capabilities.git.branch).toBe("main");

    // Verify it's actually in database
    const dbProject = await prisma.project.findUnique({
      where: { id: project.id },
    });
    expect(dbProject).toBeDefined();
    expect(dbProject?.name).toBe("Test Project");
  });

  it("handles errors gracefully and doesn't fail project creation", async () => {
    // Arrange: Mock external dependency throwing error
    const mockIsGitRepository = vi.mocked(
      isGitRepositoryModule.isGitRepository
    );
    mockIsGitRepository.mockRejectedValue(new Error("Git command failed"));

    // Act
    const project = await createProject({
      data: { name: "Test Project", path: "/tmp/test-project" },
    });

    // Assert: Project created with error in capabilities
    expect(project).toBeDefined();
    expect(project.capabilities.git.initialized).toBe(false);
    expect(project.capabilities.git.error).toBe("Git command failed");
  });

  it("creates multiple projects concurrently", async () => {
    // Arrange: Mock external dependency
    const mockIsGitRepository = vi.mocked(
      isGitRepositoryModule.isGitRepository
    );
    mockIsGitRepository.mockResolvedValue({
      initialized: true,
      branch: "main",
    });

    // Act: Concurrent operations
    const [project1, project2, project3] = await Promise.all([
      createProject({ data: { name: "Project 1", path: "/tmp/project-1" } }),
      createProject({ data: { name: "Project 2", path: "/tmp/project-2" } }),
      createProject({ data: { name: "Project 3", path: "/tmp/project-3" } }),
    ]);

    // Assert: All created successfully
    expect(project1.name).toBe("Project 1");
    expect(project2.name).toBe("Project 2");
    expect(project3.name).toBe("Project 3");

    const projects = await prisma.project.findMany();
    expect(projects).toHaveLength(3);
  });
});
```

**Service Test Pattern Summary:**

1. Mock **only** external dependencies at module level
2. Use `cleanTestDB(prisma)` in `afterEach`
3. Call service functions directly (no fixtures)
4. Verify both return value **and** database state
5. Test error handling and edge cases

### Route Tests

Route tests verify full HTTP request lifecycle with authentication.

#### Gold Standard Example: `projects.test.ts`

**Why This is Gold Standard:**

- Uses **real Prisma database** with cleanup
- Uses **fixtures** for complex setup (`createAuthenticatedUser`)
- Uses **app.inject()** (no HTTP server needed)
- Tests **full request lifecycle** (auth → validation → response)
- **Validates responses** with Zod schemas (`parseResponse`)
- Tests **all error cases** (404, 401, 400)
- Tests **concurrent requests**

**Key Patterns:**

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";
import { createTestApp, closeTestApp } from "@/server/test-utils/fastify";
import {
  createAuthenticatedUser,
  createTestProject,
} from "@/server/test-utils/fixtures";
import { parseResponse } from "@/server/test-utils/requests";
import { projectResponseSchema } from "@/server/domain/project/schemas";

describe("GET /api/projects/:id", () => {
  let app: FastifyInstance & { jwt: { sign: (payload: object) => string } };

  beforeAll(async () => {
    // Create Fastify app once for all tests
    app = await createTestApp();
  });

  afterEach(async () => {
    // Clean data between tests (preserves schema)
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    // Cleanup resources
    await closeTestApp(app);
  });

  it("should return 200 with project data for authenticated valid request", async () => {
    // Arrange: Create test user and project using fixtures
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Act: Make HTTP request using app.inject
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}`,
      headers,
    });

    // Assert: Verify status and validate response with Zod
    expect(response.statusCode).toBe(200);

    const body = parseResponse({
      response,
      schema: projectResponseSchema,
    });

    expect(body.data).toMatchObject({
      id: project.id,
      name: "Test Project",
      path: "/tmp/test-project",
      is_hidden: false,
      is_starred: false,
    });
  });

  it("should return 404 for non-existent project ID", async () => {
    // Arrange: Create authenticated user (but no project)
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const nonExistentId = "clx0000000000000000000001";

    // Act
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${nonExistentId}`,
      headers,
    });

    // Assert: Verify 404 response
    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("message");
    expect(body.error.message).toContain("not found");
  });

  it("should return 401 for missing authentication", async () => {
    // Arrange: Create project (but don't authenticate)
    const project = await createTestProject(prisma, {
      name: "Test Project",
      path: "/tmp/test-project",
    });

    // Act: Make request WITHOUT auth header
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}`,
      // No headers - missing authentication
    });

    // Assert: Verify 401 response
    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("statusCode", 401);
    expect(body.error.message).toMatch(/unauthorized|invalid|missing token/i);
  });

  it("should return 400 for invalid project ID format", async () => {
    // Arrange
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const invalidId = "not-a-valid-cuid-format";

    // Act
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${invalidId}`,
      headers,
    });

    // Assert: Verify 400 validation error
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("statusCode", 400);
    expect(body).toHaveProperty("error", "Bad Request");
    expect(body).toHaveProperty("message");
    expect(body.message).toContain("Invalid");
  });

  it("should handle concurrent requests correctly", async () => {
    // Arrange: Create user and multiple projects
    const { headers } = await createAuthenticatedUser(prisma, app, {
      email: "test@example.com",
    });

    const project1 = await createTestProject(prisma, {
      name: "Project 1",
      path: "/tmp/project-1",
    });

    const project2 = await createTestProject(prisma, {
      name: "Project 2",
      path: "/tmp/project-2",
    });

    // Act: Make concurrent requests
    const [response1, response2] = await Promise.all([
      app.inject({
        method: "GET",
        url: `/api/projects/${project1.id}`,
        headers,
      }),
      app.inject({
        method: "GET",
        url: `/api/projects/${project2.id}`,
        headers,
      }),
    ]);

    // Assert: Both succeed with correct data
    expect(response1.statusCode).toBe(200);
    expect(response2.statusCode).toBe(200);

    const body1 = parseResponse({
      response: response1,
      schema: projectResponseSchema,
    });
    const body2 = parseResponse({
      response: response2,
      schema: projectResponseSchema,
    });

    expect(body1.data.id).toBe(project1.id);
    expect(body1.data.name).toBe("Project 1");

    expect(body2.data.id).toBe(project2.id);
    expect(body2.data.name).toBe("Project 2");
  });
});
```

**Route Test Pattern Summary:**

1. Use `createTestApp()` once in `beforeAll`
2. Use fixtures for complex setup (`createAuthenticatedUser`, `createTestProject`)
3. Use `app.inject()` to simulate HTTP requests (no server needed)
4. Use `parseResponse()` with Zod schemas to validate responses
5. Test all error cases: 404, 401, 400, etc.
6. Clean database with `cleanTestDB(prisma)` in `afterEach`
7. Close app with `closeTestApp(app)` in `afterAll`

### Integration Tests

**TODO:** Add examples when identified.

Integration tests should cover:

- Multiple services working together
- WebSocket + database + service interactions
- Full workflow execution (session creation → execution → completion)
- Git operations + file operations + database updates

Example scenarios:

- Session creation → Agent execution → Message streaming → Completion
- Workflow trigger → Phase execution → Artifact creation → Completion
- File editing → Git commit → Branch creation → PR creation

## Client Testing

### Component Tests

**TODO:** Add gold standard example when identified.

Component tests should:

- Use React Testing Library
- Query by semantic roles (`getByRole`, `getByLabelText`)
- Test user interactions (`fireEvent`, `userEvent`)
- Test visual states and accessibility

**Query priority:** `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByTestId`

**Example Pattern:**

```typescript
it('should submit form with entered credentials', async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<LoginForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/username/i), 'testuser');
  await user.type(screen.getByLabelText(/password/i), 'pass123');
  await user.click(screen.getByRole('button', { name: /log in/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    username: 'testuser',
    password: 'pass123',
  });
});
```

### Hook Tests

**TODO:** Add gold standard example when identified.

Hook tests should:

- Use `renderHook` from Testing Library
- Provide appropriate wrappers (QueryClientProvider, etc.)
- Test state updates and side effects
- Test cleanup on unmount

**Example Pattern:**

```typescript
it("should fetch data", async () => {
  const { result } = renderHook(() => useMyHook(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});
```

### Store Tests

**TODO:** Add gold standard example when identified.

Zustand store tests should:

- Test store directly (no React wrapper needed)
- Reset state between tests
- Test immutable updates
- Test derived state and selectors

**Example Pattern:**

```typescript
describe("SessionStore", () => {
  beforeEach(() => {
    useSessionStore.setState({ sessionId: null, messages: [] });
    vi.clearAllMocks();
  });

  it("should add message", () => {
    const { addMessage } = useSessionStore.getState();

    addMessage({
      id: "msg-1",
      role: "user",
      content: [{ type: "text", text: "Hi" }],
    });

    expect(useSessionStore.getState().messages).toHaveLength(1);
  });
});
```

## E2E Testing

**TODO:** Define E2E testing strategy.

Considerations:

- Playwright for browser automation
- Test critical user flows end-to-end
- Real backend + real frontend + real database
- Authentication flow, session lifecycle, workflow execution

## Test Utilities

Located in `apps/app/src/server/test-utils/`:

### Fixtures (`fixtures.ts`)

**User & Auth:**

```typescript
// Create user with JWT token
const { user, token, headers } = await createAuthenticatedUser(prisma, app, {
  email: "test@example.com",
});

// Create test user without token
const user = await createTestUser(prisma, {
  username: "testuser",
  email: "test@example.com",
});

// Generate JWT token
const token = createAuthToken(app, {
  userId: user.id,
  username: user.username,
});
```

**Projects:**

```typescript
const project = await createTestProject(prisma, {
  name: "Test Project",
  path: "/tmp/test-project",
  is_hidden: false,
  is_starred: false,
});
```

**Sessions:**

```typescript
const session = await createTestSession(prisma, {
  projectId: project.id,
  agent: "claude",
  type: "chat",
});
```

**Workflows:**

```typescript
const workflow = await createTestWorkflowDefinition(prisma, {
  projectId: project.id,
  name: "Test Workflow",
  description: "Test description",
});
```

### Helpers

**Fastify App:**

```typescript
// Create test app with routes
const app = await createTestApp();

// Close app after tests
await closeTestApp(app);
```

**Database Cleanup:**

```typescript
// Clean all test data (preserves schema)
await cleanTestDB(prisma);
```

**Response Validation:**

```typescript
// Parse and validate response with Zod schema
const body = parseResponse({
  response,
  schema: projectResponseSchema,
});
```

## Common Patterns

### Mocking Services

```typescript
vi.mock("@/server/domain/git/services/isGitRepository", () => ({
  isGitRepository: vi.fn(),
}));

// In test
const mockIsGitRepository = vi.mocked(isGitRepository);
mockIsGitRepository.mockResolvedValue({
  initialized: true,
  branch: "main",
});
```

### Testing Async Code

```typescript
it("should handle async operations", async () => {
  const result = await asyncFunction();
  expect(result).toBe(expectedValue);
});

// Testing promises
it("should resolve with value", async () => {
  await expect(promise).resolves.toBe(expectedValue);
});
```

### Testing Errors

```typescript
it("should throw error", async () => {
  await expect(failingFunction()).rejects.toThrow("Error message");
});

// With custom error class
it("should throw NotFoundError", async () => {
  await expect(service()).rejects.toThrow(NotFoundError);
});
```

### File System Testing

```typescript
import fs from "fs/promises";
import path from "path";
import os from "os";

beforeEach(async () => {
  const testDir = path.join(os.tmpdir(), "test-data");
  await fs.mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});
```

## Anti-patterns

### 1. Over-Mocking

**❌ Bad:**

```typescript
vi.mock("@/shared/prisma", () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Too brittle - breaks if implementation changes
```

**✅ Good:**

```typescript
// Use real Prisma, mock only external deps
import { prisma } from "@/shared/prisma";

afterEach(async () => {
  await cleanTestDB(prisma);
});
```

### 2. Testing Implementation Details

**❌ Bad:**

```typescript
it("should call helper function", () => {
  const spy = vi.spyOn(myModule, "internalHelper");
  myModule.publicFunction();
  expect(spy).toHaveBeenCalled(); // Testing internals
});
```

**✅ Good:**

```typescript
it("should return processed data", () => {
  const result = myModule.publicFunction(input);
  expect(result).toEqual(expectedOutput); // Testing behavior
});
```

### 3. Test Pollution (Shared State)

**❌ Bad:**

```typescript
let sharedProject; // Tests modify shared state

it("test 1", () => {
  sharedProject.name = "Modified";
});

it("test 2", () => {
  expect(sharedProject.name).toBe("Original"); // Fails!
});
```

**✅ Good:**

```typescript
afterEach(async () => {
  await cleanTestDB(prisma); // Clean between tests
  vi.clearAllMocks();
});

it("test 1", async () => {
  const project = await createTestProject(prisma, { name: "Test 1" });
  // ... test uses isolated data
});
```

### 4. Flaky Tests (Async Issues)

**❌ Bad:**

```typescript
it("should update state", () => {
  triggerAsyncUpdate();
  expect(state.value).toBe(newValue); // Race condition!
});
```

**✅ Good:**

```typescript
it("should update state", async () => {
  await triggerAsyncUpdate();
  // Or use waitFor
  await waitFor(() => expect(state.value).toBe(newValue));
});
```

### 5. Hardcoded Test Data

**❌ Bad:**

```typescript
const userId = "clx123456789"; // Hardcoded CUID
const createdAt = new Date("2024-01-01"); // Hardcoded date
```

**✅ Good:**

```typescript
const user = await createTestUser(prisma, { ... });
const userId = user.id; // DB-generated
const createdAt = new Date(); // Current time
```

### 6. Testing Library Behavior

**❌ Bad:**

```typescript
// Testing that React state works
it("should update state", () => {
  expect(wrapper.state("username")).toBe("");
});
```

**✅ Good:**

```typescript
// Trust libraries work, test your code
it("should display username input", () => {
  expect(screen.getByRole("textbox", { name: /username/i })).toHaveValue("");
});
```

## Troubleshooting

### Tests Fail Intermittently

**Problem:** Race conditions in async code

**Fix:**

- Add `await` for all async operations
- Use `waitFor()` for async updates
- Increase timeout if needed: `it('test', () => {}, 10000)`

### Mocks Not Working

**Problem:** Mocks not being applied

**Fix:**

- Clear mocks with `vi.clearAllMocks()` in `beforeEach`
- Verify mock path matches import path exactly
- Use `vi.mocked()` helper for TypeScript support

### Environment Issues

**Problem:** Wrong environment (Node vs happy-dom)

**Fix:**

- Server tests should use Node.js environment
- Client tests should use happy-dom environment
- Check file location matches pattern in `vitest.config.ts`

### Database Locked

**Problem:** SQLite database locked

**Fix:**

- Kill node processes: `killall node`
- Restart dev server: `pnpm dev`
- Ensure `cleanTestDB(prisma)` is called in `afterEach`

### Type Errors in Tests

**Problem:** TypeScript errors for test utilities

**Fix:**

- Run `pnpm prisma:generate` to regenerate Prisma types
- Restart TypeScript server in editor
- Check imports use correct path aliases (`@/server/`, `@/client/`)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Fastify Testing](https://fastify.dev/docs/latest/Guides/Testing/)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing/unit-testing)
