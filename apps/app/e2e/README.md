# E2E Testing with Playwright

Comprehensive end-to-end tests for the agentcmd application using Playwright.

## Overview

E2E tests validate critical user journeys across the full stack (frontend + backend + database + WebSocket + Inngest workflows). Tests use isolated E2E database (`e2e.db`) and dedicated E2E server (ports 5100/5101) to avoid interfering with development.

**Current Coverage:**
- Authentication (login failure, logout)
- Sessions (create session, agent response, follow-up messages)

## Quick Start

```bash
# Install Playwright browsers (one-time setup)
cd apps/app
pnpm e2e:install

# Run tests (auto-starts servers via webServer config)
pnpm e2e

# Or run with UI mode for debugging
pnpm e2e:ui

# Manual server start (optional - webServer handles this)
# Terminal 1: pnpm e2e:server
# Terminal 2: pnpm e2e
```

## Architecture

### Server Isolation

- **Dev Server**: `localhost:4100` (backend), `localhost:4101` (frontend), `dev.db`
- **E2E Server**: `localhost:5100` (backend), `localhost:5101` (frontend), `e2e.db`
- **Inngest**: `localhost:8288` (shared by both servers)

E2E and dev servers can run simultaneously without conflicts. Database isolation ensures E2E tests don't affect dev data.

### File Structure

```
apps/app/
├── playwright.config.ts       # Playwright configuration (at app root)
└── e2e/
    ├── tests/
    │   ├── auth/              # Authentication tests
    │   │   ├── login-failure.e2e.spec.ts
    │   │   └── logout.e2e.spec.ts
    │   └── sessions/          # Session tests (uses Claude Code CLI)
    │       └── create-session.e2e.spec.ts
    ├── pages/                 # Page Object Models (POMs)
    │   ├── index.ts               # Export all POMs
    │   ├── BasePage.ts            # Common page methods
    │   ├── LoginPage.ts           # Login page interactions
    │   ├── DashboardPage.ts       # Dashboard page interactions
    │   ├── ProjectsPage.ts        # Projects page interactions
    │   ├── NewSessionPage.ts      # New session creation
    │   └── SessionPage.ts         # Active session interactions
    ├── fixtures/
    │   ├── index.ts               # Merged fixtures (import from here)
    │   ├── authenticated-page.ts  # Auth token injection
    │   └── database.ts            # Prisma + seeding helpers
    ├── utils/
    │   ├── seed-database.ts       # Database seeding functions
    │   └── wait-for-websocket.ts  # WebSocket event helpers
    ├── global-setup.ts            # Auth user creation
    ├── global-teardown.ts         # Cleanup
    ├── .auth-state.json           # Auth state (gitignored)
    └── README.md                  # This file
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from "../../fixtures";
import { ProjectsPage } from "../../pages";

test.describe("Feature - Test Suite", () => {
  test("should do something", async ({ authenticatedPage, db, testUser, prisma }) => {
    const projectsPage = new ProjectsPage(authenticatedPage);

    // Seed data
    const project = await db.seedProject({ name: "Test Project", path: "/tmp/test" });

    // Navigate using POM
    await projectsPage.goto();

    // Interact with UI via POM
    await projectsPage.clickCreateProject();

    // Assert using POM
    await projectsPage.expectProjectVisible("Test Project");

    // Verify database
    const created = await prisma.project.findFirst({ where: { name: "Test Project" } });
    expect(created).toBeTruthy();
  });
});
```

### Using Page Object Models (POMs)

POMs encapsulate page interactions for reusability and maintainability.

```typescript
import { test, expect } from "../../fixtures";
import { LoginPage, DashboardPage, ProjectsPage } from "../../pages";

test("should login and view projects", async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const projectsPage = new ProjectsPage(page);

  // Login
  await loginPage.goto();
  await loginPage.login("user@example.com", "password");

  // Navigate to projects
  await dashboardPage.goToProjects();

  // Assert
  await projectsPage.expectProjectVisible("My Project");
});
```

**Available POMs:**
- `LoginPage` - Login form, validation, error handling
- `DashboardPage` - Main authenticated page, navigation, logout
- `ProjectsPage` - Project list, create, view details
- `NewSessionPage` - Create new session, send initial message
- `SessionPage` - Active session, send messages, wait for responses

**Creating New POMs:**
1. Extend `BasePage` class
2. Add to `e2e/pages/` directory
3. Export from `e2e/pages/index.ts`

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
- `baseURL: 'http://localhost:5101'` - Tests use relative URLs: `page.goto("/login")`
- `webServer` - Auto-starts backend and frontend servers
- `timeout: 30_000` - 30s per test
- `expect.timeout: 5_000` - 5s for assertions
- `retries: 0` locally, `2` in CI

### Environment Variables

E2E server uses `.env.e2e`:
- `DATABASE_URL=file:./prisma/e2e.db` - Isolated database
- `PORT=5100` - Backend port
- `VITE_PORT=5101` - Frontend port
- `NODE_ENV=test` - Test mode
- `JWT_SECRET` - Test JWT secret

**Single-User System:** This app is single-user. Global setup tries to login first, registers if needed, and saves auth state to `.auth-state.json`. All tests share this single test user.

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

## Gold Standard Tests

`apps/app/e2e/tests/auth/` demonstrates E2E patterns:
- `login-failure.e2e.spec.ts` - Form validation, error handling, `data-testid` selectors
- `logout.e2e.spec.ts` - Authenticated page fixture, localStorage assertions

**Key Patterns:**
1. Use `data-testid` for stable selectors: `page.getByTestId("login-email")`
2. Use `authenticatedPage` fixture for tests requiring login
3. Use `testUser` fixture for user credentials/token
4. Wait for UI state, not arbitrary timeouts
5. Assert URL changes with `expect(page.url()).toContain(...)`

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Writing Tests](https://playwright.dev/docs/writing-tests)
- [Fixtures](https://playwright.dev/docs/test-fixtures)
- [Locators](https://playwright.dev/docs/locators)
