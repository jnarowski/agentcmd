# Critical Path Test Coverage

**Status**: draft
**Created**: 2025-11-13
**Package**: apps/app
**Total Complexity**: 118 points
**Phases**: 5
**Tasks**: 20
**Overall Avg Complexity**: 5.9/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 0: Quick Wins | 5 | 15 | 3.0/10 | 4/10 |
| Phase 1: Session Services | 4 | 26 | 6.5/10 | 8/10 |
| Phase 2: Route Handlers | 2 | 20 | 10.0/10 | 10/10 |
| Phase 3: Git Operations | 5 | 30 | 6.0/10 | 7/10 |
| Phase 4: Shell & Files | 4 | 27 | 6.8/10 | 8/10 |
| **Total** | **20** | **118** | **5.9/10** | **10/10** |

## Overview

Implement high-value unit and service tests for critical paths where bugs cause user-facing failures or data loss. Focus on session management, route security, git operations, shell process management, and file security. This spec targets the most impactful test coverage gaps identified in the audit, skipping integration tests for now.

## User Story

As a developer
I want comprehensive test coverage on critical paths
So that I can refactor code confidently, catch bugs before deployment, and prevent data loss or security vulnerabilities

## Technical Approach

Follow gold standard patterns from existing tests (`createProject.test.ts`, `projects.test.ts`):
- Use real Prisma database with `cleanTestDB(prisma)` cleanup
- Mock external dependencies only (CLIs, filesystem, git)
- Test behavior and outcomes, not implementation details
- Test all error cases and edge conditions
- Mock at appropriate boundaries (CLI spawn, simpleGit commands)

## Key Design Decisions

1. **Quick Wins First**: Start with 5 easiest tests to build momentum and establish patterns
2. **Mock at CLI Boundary**: Mock agent execution at `spawn()` level for speed and control
3. **Mock Specific Git Commands**: Only mock commands actually used, not entire module
4. **Skip Integration Tests**: Focus on unit/service level tests first, integration tests later
5. **Real Database**: Use Prisma with test database for predictable state management

## Architecture

### File Structure

```
apps/app/src/server/
├── domain/
│   ├── session/
│   │   ├── services/
│   │   │   ├── createSession.ts
│   │   │   ├── getSessionById.ts
│   │   │   ├── getSessionMessages.ts
│   │   │   ├── syncProjectSessions.ts
│   │   │   ├── handleExecutionFailure.ts
│   │   │   └── validateSessionOwnership.ts
│   │   └── __tests__/
│   │       ├── createSession.test.ts (NEW)
│   │       ├── getSessionById.test.ts (NEW)
│   │       ├── getSessionMessages.test.ts (NEW)
│   │       ├── syncProjectSessions.test.ts (NEW)
│   │       ├── handleExecutionFailure.test.ts (NEW)
│   │       └── validateSessionOwnership.test.ts (NEW)
│   ├── git/
│   │   └── __tests__/ (NEW - 5 files)
│   ├── file/
│   │   └── __tests__/ (NEW - 3 files)
│   └── shell/
│       └── __tests__/ (NEW - 3 files)
├── routes/
│   └── __tests__/
│       ├── sessions.test.ts (NEW)
│       ├── workflows.test.ts (NEW)
│       └── auth.test.ts (NEW)
└── test-utils/
    ├── fixtures.ts (UPDATE - add session helpers)
    ├── agent.ts (NEW - agent mocking utilities)
    ├── git.ts (NEW - git mocking utilities)
    └── shell.ts (NEW - shell mocking utilities)
```

### Integration Points

**Session Domain**:
- `apps/app/src/server/domain/session/services/` - Add `__tests__/` subdirectory with 6 test files
- `apps/app/src/server/test-utils/fixtures.ts` - Add `createTestSession()` helper

**Git Domain**:
- `apps/app/src/server/domain/git/services/` - Add `__tests__/` subdirectory with 5 test files
- `apps/app/src/server/test-utils/git.ts` - New file with git mocking helpers

**Route Handlers**:
- `apps/app/src/server/routes/__tests__/` - Add 3 new test files

**Test Utilities**:
- `apps/app/src/server/test-utils/agent.ts` - New agent mocking utilities
- `apps/app/src/server/test-utils/shell.ts` - New shell mocking utilities

## Implementation Details

### 1. Test Utilities Foundation

Create reusable mocking utilities to support all test phases.

**Key Points**:
- Agent execution mocking at spawn boundary
- Git command mocking at simpleGit level
- Shell process mocking for node-pty
- Session fixture helpers for test setup

### 2. Quick Win Tests

Simple tests that establish patterns and deliver immediate value.

**Key Points**:
- Single-file, straightforward logic
- Follow existing test patterns
- Low complexity, high confidence
- Build team momentum

### 3. Session Service Tests

Core session lifecycle tests covering creation, loading, and error handling.

**Key Points**:
- Real Prisma database with cleanup
- Mock CLI execution boundary
- Test JSONL parsing robustness
- Verify session state integrity

### 4. Route Handler Tests

Security-focused tests for authentication, validation, and state transitions.

**Key Points**:
- Test all HTTP status codes
- Verify auth checks on all endpoints
- Test concurrent requests
- Follow `projects.test.ts` gold standard

### 5. Git Operation Tests

Data safety tests for git commands that affect user commits and branches.

**Key Points**:
- Mock specific simpleGit commands
- Test error paths (conflicts, auth failures)
- Verify command arguments
- Prevent data loss scenarios

### 6. Shell & File Security Tests

Process management and security boundary tests.

**Key Points**:
- Verify process cleanup
- Test path traversal prevention
- Mock PTY interface
- Prevent resource leaks

## Files to Create/Modify

### New Files (24)

**Test Utilities (4 files)**:
1. `apps/app/src/server/test-utils/agent.ts` - Agent mocking utilities
2. `apps/app/src/server/test-utils/git.ts` - Git mocking utilities
3. `apps/app/src/server/test-utils/shell.ts` - Shell mocking utilities
4. `apps/app/src/server/test-utils/session.ts` - Session test helpers

**Session Tests (6 files)**:
5. `apps/app/src/server/domain/session/__tests__/getSessionById.test.ts`
6. `apps/app/src/server/domain/session/__tests__/validateSessionOwnership.test.ts`
7. `apps/app/src/server/domain/session/__tests__/createSession.test.ts`
8. `apps/app/src/server/domain/session/__tests__/getSessionMessages.test.ts`
9. `apps/app/src/server/domain/session/__tests__/syncProjectSessions.test.ts`
10. `apps/app/src/server/domain/session/__tests__/handleExecutionFailure.test.ts`

**Route Tests (3 files)**:
11. `apps/app/src/server/routes/__tests__/auth.test.ts`
12. `apps/app/src/server/routes/__tests__/sessions.test.ts`
13. `apps/app/src/server/routes/__tests__/workflows.test.ts`

**Git Tests (5 files)**:
14. `apps/app/src/server/domain/git/__tests__/isGitRepository.test.ts`
15. `apps/app/src/server/domain/git/__tests__/getCurrentBranch.test.ts`
16. `apps/app/src/server/domain/git/__tests__/commitChanges.test.ts`
17. `apps/app/src/server/domain/git/__tests__/createAndSwitchBranch.test.ts`
18. `apps/app/src/server/domain/git/__tests__/pushToRemote.test.ts`

**Shell Tests (3 files)**:
19. `apps/app/src/server/domain/shell/__tests__/createShellSession.test.ts`
20. `apps/app/src/server/domain/shell/__tests__/destroyShellSession.test.ts`
21. `apps/app/src/server/domain/shell/__tests__/cleanupUserSessions.test.ts`

**File Tests (3 files)**:
22. `apps/app/src/server/domain/file/__tests__/readFile.test.ts`
23. `apps/app/src/server/domain/file/__tests__/writeFile.test.ts`
24. `apps/app/src/server/domain/file/__tests__/getFileTree.test.ts`

### Modified Files (1)

1. `apps/app/src/server/test-utils/fixtures.ts` - Add `createTestSession()` helper

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 0: Quick Wins (Build Momentum)

**Phase Complexity**: 15 points (avg 3.0/10)

<!-- prettier-ignore -->
- [ ] test-001 [2/10] Create getSessionById.test.ts
  - Test simple Prisma query with real database
  - Test 404 for non-existent session
  - Test returns correct session data
  - File: `apps/app/src/server/domain/session/__tests__/getSessionById.test.ts`

- [ ] test-002 [3/10] Create validateSessionOwnership.test.ts
  - Test ownership validation logic
  - Test returns true for correct owner
  - Test returns false for wrong owner
  - Test handles missing session
  - File: `apps/app/src/server/domain/session/__tests__/validateSessionOwnership.test.ts`

- [ ] test-003 [3/10] Create isGitRepository.test.ts
  - Mock simpleGit status command
  - Test detects git repo correctly
  - Test handles non-git directories
  - Test error handling for git command failures
  - File: `apps/app/src/server/domain/git/__tests__/isGitRepository.test.ts`

- [ ] test-004 [3/10] Create getCurrentBranch.test.ts
  - Mock simpleGit branch command
  - Test returns current branch name
  - Test handles detached HEAD state
  - Test error handling
  - File: `apps/app/src/server/domain/git/__tests__/getCurrentBranch.test.ts`

- [ ] test-005 [4/10] Create auth.test.ts route tests
  - Test POST /api/auth/login endpoint
  - Test POST /api/auth/signup endpoint
  - Test token validation
  - Test 401 for invalid credentials
  - Follow `projects.test.ts` pattern with app.inject()
  - File: `apps/app/src/server/routes/__tests__/auth.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 1: Session Services (Core Workflow)

**Phase Complexity**: 26 points (avg 6.5/10)

<!-- prettier-ignore -->
- [ ] test-006 [4/10] Create test-utils/agent.ts
  - Implement mockAgentExecution helper
  - Mock child_process.spawn at boundary
  - Support streaming output simulation
  - Support exit codes and errors
  - File: `apps/app/src/server/test-utils/agent.ts`

- [ ] test-007 [6/10] Create createSession.test.ts
  - Test session creation with valid data
  - Test project association
  - Test initial state setup
  - Test validation errors
  - Test concurrent session creation
  - Use real Prisma with cleanTestDB
  - File: `apps/app/src/server/domain/session/__tests__/createSession.test.ts`

- [ ] test-008 [8/10] Create getSessionMessages.test.ts
  - Test JSONL file parsing
  - Test message ordering
  - Test corrupt JSONL handling
  - Test missing file handling
  - Test empty session
  - Mock filesystem for controlled testing
  - File: `apps/app/src/server/domain/session/__tests__/getSessionMessages.test.ts`

- [ ] test-009 [8/10] Create syncProjectSessions.test.ts
  - Test filesystem sync with database
  - Test new session detection
  - Test conflict resolution
  - Test handles missing files
  - Test concurrent sync operations
  - File: `apps/app/src/server/domain/session/__tests__/syncProjectSessions.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Route Handlers (Security Critical)

**Phase Complexity**: 20 points (avg 10.0/10)

<!-- prettier-ignore -->
- [ ] test-010 [10/10] Create sessions.test.ts route tests
  - Test all 10 session endpoints (GET, POST, PATCH)
  - Test authentication on all endpoints (401)
  - Test authorization (403 for wrong user)
  - Test validation errors (400)
  - Test 404 for non-existent sessions
  - Test concurrent requests
  - Use fixtures: createAuthenticatedUser, createTestSession
  - Follow `projects.test.ts` gold standard
  - File: `apps/app/src/server/routes/__tests__/sessions.test.ts`

- [ ] test-011 [10/10] Create workflows.test.ts route tests
  - Test workflow run creation endpoint
  - Test pause/resume/cancel state transitions
  - Test invalid state transitions (e.g., pause completed run)
  - Test cleanup verification on cancel
  - Test concurrent state changes
  - Test authentication and authorization
  - File: `apps/app/src/server/routes/__tests__/workflows.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Git Operations (Data Safety)

**Phase Complexity**: 30 points (avg 6.0/10)

<!-- prettier-ignore -->
- [ ] test-012 [3/10] Create test-utils/git.ts
  - Implement mockGitCommand helper
  - Mock specific simpleGit methods
  - Support expectGitCalled assertions
  - File: `apps/app/src/server/test-utils/git.ts`

- [ ] test-013 [7/10] Create commitChanges.test.ts
  - Test successful commit creation
  - Test commit message validation
  - Test merge conflict handling
  - Test empty commit prevention
  - Test error handling (no changes, git errors)
  - Mock simpleGit commit command
  - File: `apps/app/src/server/domain/git/__tests__/commitChanges.test.ts`

- [ ] test-014 [7/10] Create createAndSwitchBranch.test.ts
  - Test branch creation and checkout
  - Test handles uncommitted changes
  - Test duplicate branch name error
  - Test invalid branch names
  - Mock simpleGit branch/checkout commands
  - File: `apps/app/src/server/domain/git/__tests__/createAndSwitchBranch.test.ts`

- [ ] test-015 [6/10] Create pushToRemote.test.ts
  - Test successful push
  - Test auth failure handling
  - Test network error handling
  - Test upstream not set handling
  - Mock simpleGit push command
  - File: `apps/app/src/server/domain/git/__tests__/pushToRemote.test.ts`

- [ ] test-016 [7/10] Create createPullRequest.test.ts (if exists)
  - Test gh CLI integration
  - Test PR creation with title/body
  - Test auth errors
  - Test missing gh CLI
  - Mock child_process for gh commands
  - File: `apps/app/src/server/domain/git/__tests__/createPullRequest.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Shell & File Security

**Phase Complexity**: 27 points (avg 6.8/10)

<!-- prettier-ignore -->
- [ ] test-017 [3/10] Create test-utils/shell.ts
  - Implement mockPtyProcess helper
  - Mock node-pty IPty interface
  - Support process.kill() verification
  - File: `apps/app/src/server/test-utils/shell.ts`

- [ ] test-018 [8/10] Create shell session lifecycle tests
  - createShellSession.test.ts: PTY creation, session storage
  - destroyShellSession.test.ts: Process kill, cleanup verification
  - cleanupUserSessions.test.ts: Bulk cleanup completeness
  - Test no zombie processes
  - Test cleanup on error
  - Files: `apps/app/src/server/domain/shell/__tests__/*.test.ts`

- [ ] test-019 [8/10] Create file security tests
  - readFile.test.ts: Path traversal prevention, permissions
  - writeFile.test.ts: Write restrictions, overwrite protection
  - Test malicious paths (../../../etc/passwd)
  - Use real filesystem in /tmp for testing
  - Files: `apps/app/src/server/domain/file/__tests__/readFile.test.ts`, `writeFile.test.ts`

- [ ] test-020 [8/10] Create getFileTree.test.ts
  - Test directory listing
  - Test hidden file filtering
  - Test .gitignore respect
  - Test symlink handling
  - Test path traversal prevention
  - File: `apps/app/src/server/domain/file/__tests__/getFileTree.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

All tests follow gold standard patterns:

**Service Tests Pattern** (from `createProject.test.ts`):
```typescript
import { describe, it, expect, afterEach, vi } from "vitest";
import { prisma } from "@/shared/prisma";
import { cleanTestDB } from "@/server/test-utils/db";

// Mock external dependencies only
vi.mock("external-module", () => ({
  externalFunction: vi.fn(),
}));

describe("serviceName", () => {
  afterEach(async () => {
    await cleanTestDB(prisma);
    vi.clearAllMocks();
  });

  it("should perform expected behavior", async () => {
    // Arrange: Mock external deps
    // Act: Call service directly
    // Assert: Verify behavior and database state
  });
});
```

**Route Tests Pattern** (from `projects.test.ts`):
```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { createTestApp, closeTestApp } from "@/server/test-utils/fastify";
import { createAuthenticatedUser, createTestProject } from "@/server/test-utils/fixtures";
import { parseResponse } from "@/server/test-utils/requests";

describe("GET /api/endpoint", () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await cleanTestDB(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("should return 200 with valid data", async () => {
    const { headers } = await createAuthenticatedUser(prisma, app);
    const response = await app.inject({ method: "GET", url: "/api/endpoint", headers });
    expect(response.statusCode).toBe(200);
  });
});
```

### Integration Tests

Deferred to future spec. Will cover:
- Session creation → Agent execution → Completion flow
- Workflow trigger → Execution → Artifact creation
- WebSocket + database + service interactions

### E2E Tests

Not applicable - focusing on unit/service tests only.

## Success Criteria

- [ ] 20 new test files created covering critical paths
- [ ] All tests follow gold standard patterns from existing tests
- [ ] Session creation/loading has robust test coverage
- [ ] Route authentication verified on all endpoints
- [ ] Git operations have data safety tests
- [ ] Process cleanup verified in shell tests
- [ ] Path traversal attacks prevented in file tests
- [ ] Test utilities reusable for future tests
- [ ] All tests pass in CI
- [ ] Type checking passes: `pnpm check-types`
- [ ] No regressions introduced to existing tests

## Validation

Execute these commands to verify implementation:

**Automated Verification:**

```bash
# Build verification
pnpm --filter apps/app build
# Expected: ✓ Build successful

# Type checking
pnpm --filter apps/app check-types
# Expected: No type errors

# Run new tests
pnpm --filter apps/app test
# Expected: All 20 new test files pass

# Run specific test suites
pnpm --filter apps/app test session
pnpm --filter apps/app test routes
pnpm --filter apps/app test git
pnpm --filter apps/app test shell
pnpm --filter apps/app test file
# Expected: All tests pass in each suite
```

**Manual Verification:**

1. Verify test files created in correct locations
2. Check test utilities exist and export expected functions
3. Run tests individually to verify isolation
4. Check test coverage report shows improvements
5. Verify no test pollution (tests pass in isolation and together)

**Feature-Specific Checks:**

- Session tests verify JSONL parsing robustness
- Route tests verify all HTTP status codes
- Git tests mock at correct boundary (simpleGit commands)
- Shell tests verify process.kill() called
- File tests block path traversal attempts

## Implementation Notes

### 1. Test Isolation

Each test must be isolated:
- Use `cleanTestDB(prisma)` in `afterEach`
- Use `vi.clearAllMocks()` to reset mocks
- Avoid shared state between tests
- Use unique test data per test

### 2. Mocking Strategy

**Agent Execution**:
```typescript
// Mock at spawn boundary
vi.mock('child_process', () => ({
  spawn: vi.fn(() => mockChildProcess)
}));
```

**Git Operations**:
```typescript
// Mock specific commands only
vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => ({
    status: vi.fn().mockResolvedValue(mockStatus),
    commit: vi.fn().mockResolvedValue(mockCommit),
  }))
}));
```

**Shell Processes**:
```typescript
// Mock node-pty interface
vi.mock('node-pty', () => ({
  spawn: vi.fn(() => mockPty)
}));
```

### 3. Error Testing

Always test error paths:
- Network failures
- Permission errors
- Invalid input
- Missing resources
- Concurrent operation conflicts

## Dependencies

- No new dependencies required
- Uses existing vitest, @vitest/ui
- Uses existing test utilities in `apps/app/src/server/test-utils/`

## References

- Testing Best Practices: `.agent/docs/testing-best-practices.md`
- Gold Standard Service Test: `apps/app/src/server/domain/project/services/__tests__/createProject.test.ts`
- Gold Standard Route Test: `apps/app/src/server/routes/__tests__/projects.test.ts`
- Test Utilities: `apps/app/src/server/test-utils/`

## Next Steps

1. Implement Phase 0 quick wins to establish patterns
2. Create test utility files (agent.ts, git.ts, shell.ts)
3. Implement session service tests
4. Implement route handler tests
5. Implement git operation tests
6. Implement shell and file security tests
7. Review test coverage improvements
8. Document learnings for future tests
