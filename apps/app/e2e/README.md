# E2E Testing with Playwright

Comprehensive end-to-end tests for the agentcmd application using Playwright.

## Overview

E2E tests validate critical user journeys across the full stack (frontend + backend + database + WebSocket + Inngest workflows). Tests use isolated E2E database (`e2e.db`) and dedicated E2E server (ports 5100/5101) to avoid interfering with development.

**Coverage:**
- Authentication (login, logout, error handling)
- Projects (CRUD operations, authorization)
- Sessions (create, streaming, stop/resume)
- Workflows (list, execute, monitor)
- Files (browse, open, edit)

## Quick Start

```bash
# Install Playwright browsers (one-time setup)
cd apps/app
pnpm e2e:install

# Terminal 1: Start dev server (for Inngest)
pnpm dev

# Terminal 2: Start E2E server
pnpm e2e:server

# Terminal 3: Run all E2E tests
pnpm e2e

# Or run with UI mode for debugging
pnpm e2e:ui
```

## Architecture

### Server Isolation

- **Dev Server**: `localhost:4100` (backend), `localhost:4101` (frontend), `dev.db`
- **E2E Server**: `localhost:5100` (backend), `localhost:5101` (frontend), `e2e.db`
- **Inngest**: `localhost:8288` (shared by both servers)

E2E and dev servers can run simultaneously without conflicts. Database isolation ensures E2E tests don't affect dev data.

### File Structure

```
apps/app/e2e/
├── tests/
│   ├── auth/              # Authentication tests
│   ├── projects/          # Project CRUD tests
│   ├── sessions/          # Session lifecycle tests
│   ├── workflows/         # Workflow execution tests
│   └── files/             # File operations tests
├── fixtures/
│   ├── authenticated-page.ts  # Auto-auth fixture
│   ├── database.ts            # Database seeding fixture
│   ├── websocket.ts           # WebSocket fixture
│   └── index.ts               # Merged fixtures
├── utils/
│   ├── seed-database.ts       # Database seeding helpers
│   ├── wait-for-websocket.ts  # WebSocket event helpers
│   ├── api-helpers.ts         # API request helpers
│   └── test-data.ts           # Test data factories
├── playwright.config.ts   # Playwright configuration
├── global-setup.ts        # Database migration
├── global-teardown.ts     # Cleanup
├── tsconfig.json          # TypeScript config
└── README.md              # This file
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from "../../fixtures";

test.describe("Feature - Test Suite", () => {
  test("should do something", async ({ authenticatedPage, db, testUser, prisma }) => {
    // Seed data
    const [project] = await db.seedProjects([
      { name: "Test Project", path: "/tmp/test", userId: testUser.id }
    ]);

    // Navigate
    await authenticatedPage.goto(`http://localhost:5101/projects/${project.id}`);

    // Interact with UI
    await authenticatedPage.click('button:has-text("Create")');

    // Assert
    await expect(authenticatedPage.locator('text="Success"')).toBeVisible();

    // Verify database
    const created = await prisma.project.findFirst({ where: { name: "Test Project" } });
    expect(created).toBeTruthy();
  });
});
```

### Using Fixtures

#### authenticatedPage
Provides page with authenticated user (auto-created via register API).

```typescript
test("my test", async ({ authenticatedPage, testUser }) => {
  // testUser: { id, email, token }
  // authenticatedPage: Page with auth token in localStorage
  await authenticatedPage.goto("http://localhost:5101/dashboard");
});
```

#### db
Database seeding helpers with auto-cleanup.

```typescript
test("seed data", async ({ db, testUser }) => {
  // Seed projects
  const projects = await db.seedProjects([
    { name: "Project 1", path: "/tmp/p1", userId: testUser.id },
    { name: "Project 2", path: "/tmp/p2", userId: testUser.id }
  ]);

  // Seed sessions
  const sessions = await db.seedSessions([
    { title: "Session 1", projectId: projects[0].id, userId: testUser.id, status: "active" }
  ]);

  // Seed messages
  const messages = await db.seedMessages([
    { content: "Hello", role: "user", sessionId: sessions[0].id }
  ]);
});
```

#### prisma
Direct Prisma client access for queries and assertions.

```typescript
test("verify database", async ({ prisma }) => {
  const project = await prisma.project.findUnique({ where: { id: "..." } });
  expect(project?.name).toBe("Expected Name");
});
```

### WebSocket Testing

```typescript
import { setupWebSocketForwarding, waitForWebSocketEvent } from "../../utils/wait-for-websocket";

test("websocket events", async ({ authenticatedPage }) => {
  // Set up event capturing
  await setupWebSocketForwarding(authenticatedPage);

  // Trigger action that emits WebSocket event
  await authenticatedPage.click('button:has-text("Send")');

  // Wait for specific event
  const event = await waitForWebSocketEvent(
    authenticatedPage,
    "session.stream_output",
    10000 // timeout
  );

  expect(event.type).toBe("session.stream_output");
  expect(event.data).toBeDefined();
});
```

## Available Scripts

```bash
# Run all E2E tests (headless)
pnpm e2e

# Run with UI mode (interactive)
pnpm e2e:ui

# Run in headed mode (see browser)
pnpm e2e:headed

# Run specific test file
pnpm e2e tests/auth/login.e2e.spec.ts

# Run tests matching pattern
pnpm e2e --grep "auth"

# Debug mode (pause on failure)
pnpm e2e:debug

# Generate tests using Playwright codegen
pnpm e2e:codegen http://localhost:5101

# View last test report
pnpm e2e:report

# Start E2E server
pnpm e2e:server
```

## Configuration

### playwright.config.ts

Key settings:
- `testMatch: '**/*.e2e.spec.ts'` - Only run files ending in `.e2e.spec.ts`
- `workers: 1` - Sequential execution (SQLite limitation)
- `baseURL: 'http://localhost:5101'` - E2E frontend URL
- `timeout: 30000` - 30s default timeout per test
- `retries: 0` - No retries (tests should be deterministic)

### Environment Variables

E2E server uses:
- `DATABASE_URL=file:./e2e.db` - Isolated database
- `PORT=5100` - Backend port
- `VITE_PORT=5101` - Frontend port
- `NODE_ENV=test` - Test mode

## Troubleshooting

### Tests failing with "connection refused"

**Cause**: E2E server not running.

**Solution**:
```bash
# Terminal 1: Start E2E server
cd apps/app && pnpm e2e:server

# Terminal 2: Run tests
cd apps/app && pnpm e2e
```

### Tests failing with "Inngest function not found"

**Cause**: Inngest dev server not running or E2E server not registered.

**Solution**:
```bash
# Start dev server (includes Inngest)
cd apps/app && pnpm dev

# Verify Inngest running at http://localhost:8288
```

### Tests flaking with database errors

**Cause**: Parallel execution or database not migrated.

**Solution**:
1. Verify `workers: 1` in `playwright.config.ts`
2. Run migrations: `cd apps/app && DATABASE_URL=file:./e2e.db pnpm prisma:migrate`
3. Delete `e2e.db` and re-run global setup

### UI selectors not finding elements

**Cause**: Frontend component structure changed.

**Solution**:
1. Use flexible selectors: `button:has-text("Login"), button[aria-label*="login" i]`
2. Use Playwright codegen to generate updated selectors: `pnpm e2e:codegen`
3. Update test to match new UI structure

### WebSocket events not received

**Cause**: WebSocket forwarding not set up or connection issues.

**Solution**:
1. Ensure `setupWebSocketForwarding(page)` called before triggering action
2. Check WebSocket connection in browser: `ws://localhost:5101/ws`
3. Verify backend WebSocket handler registered

## Best Practices

### 1. Use Descriptive Test Names

```typescript
// Good
test("should create project and redirect to project details page", async ({ ... }) => {});

// Bad
test("create project", async ({ ... }) => {});
```

### 2. Seed Data in Tests

Don't rely on existing data. Seed everything needed for the test.

```typescript
test("my test", async ({ db, testUser }) => {
  const [project] = await db.seedProjects([{ name: "Test", path: "/tmp", userId: testUser.id }]);
  // Now use project in test
});
```

### 3. Verify in Database

Don't just check UI. Verify data persisted correctly.

```typescript
test("should save project", async ({ prisma, ... }) => {
  // ... UI actions ...

  // Verify in database
  const project = await prisma.project.findFirst({ where: { name: "Test" } });
  expect(project).toBeTruthy();
});
```

### 4. Use Flexible Selectors

UI may change. Use flexible selectors that work with variations.

```typescript
// Good - multiple alternatives
const button = page.locator('button:has-text("Submit"), button:has-text("Save"), button[type="submit"]');

// Bad - brittle
const button = page.locator('#submit-button-id-12345');
```

### 5. Wait for Events, Not Timeouts

Use explicit waits for events/conditions, not arbitrary timeouts.

```typescript
// Good
await page.waitForSelector('text="Success"');
await waitForWebSocketEvent(page, "session.created", 10000);

// Bad
await page.waitForTimeout(5000); // Arbitrary delay
```

### 6. Clean Up After Tests

Fixtures handle cleanup automatically, but if you create data outside fixtures, clean it up.

```typescript
test("my test", async ({ prisma }) => {
  const user = await prisma.user.create({ data: { ... } });

  // ... test logic ...

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});
```

## CI/CD Integration

E2E tests run in GitHub Actions:

```yaml
# .github/workflows/e2e.yml
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm playwright install --with-deps
      - run: pnpm build
      - run: pnpm e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/app/playwright-report/
```

## Gold Standard Test

`apps/app/e2e/tests/sessions/session-lifecycle.e2e.spec.ts` demonstrates all E2E patterns:
- Authentication via API
- Database seeding (users, projects, sessions)
- WebSocket event forwarding and waiting
- UI navigation and interaction
- Database verification
- Real-time streaming

Reference this test when writing new E2E tests.

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Writing Tests](https://playwright.dev/docs/writing-tests)
- [Fixtures](https://playwright.dev/docs/test-fixtures)
- [Locators](https://playwright.dev/docs/locators)
