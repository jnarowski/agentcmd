# Backend Test Gold Standard

**Status**: draft
**Created**: 2025-01-04
**Package**: apps/web
**Estimated Effort**: 4-6 hours

## Overview

Establish gold standard for backend testing by implementing in-memory SQLite database testing for routes, creating reusable test utilities, and writing comprehensive tests for `GET /api/projects/:id` as the reference implementation for all future backend tests.

## User Story

As a developer
I want a reliable, fast, and maintainable testing strategy for backend routes
So that I can write integration tests that catch schema mismatches, validate business logic, and ensure API contracts without manual Prisma mocking

## Technical Approach

**Hybrid testing strategy**: Unit tests (domain services) use mocks for speed; integration tests (HTTP routes) use in-memory SQLite Prisma for reliability.

**Key decision**: Use real Prisma with `:memory:` SQLite database instead of manual mocks. This catches schema mismatches, tests actual SQL generation, supports transactions, and eliminates mock maintenance overhead. Performance target: ~50ms per test (acceptable tradeoff for reliability).

## Key Design Decisions

1. **In-Memory SQLite for Integration Tests**: Real Prisma queries against `:memory:` database - catches schema issues, tests SQL generation, faster than external DB
2. **Fixture Factories Over Hardcoded Data**: Functions like `createTestUser()` with sensible defaults - more flexible, reusable across tests
3. **Mock External APIs**: Mock Anthropic, GitHub CLI in unit/integration tests - save real API calls for separate E2E suite
4. **Gold Standard Only**: Create one perfect example (`GET /api/projects/:id`) with comprehensive test coverage - document pattern for others to follow incrementally

## Architecture

### File Structure

```
apps/web/src/server/
├── test-utils/                      # NEW - Shared test utilities
│   ├── db.ts                        # Database setup/teardown/cleanup
│   ├── fixtures.ts                  # Fixture factory functions
│   ├── fastify.ts                   # Fastify app setup for testing
│   └── README.md                    # Testing documentation
│
├── routes/
│   └── projects.test.ts             # NEW - Gold standard test
│
└── (existing files unchanged)
```

### Integration Points

**Vitest Configuration** (`apps/web/vitest.config.ts`):
- Already configured with `node` environment for server tests
- May need SQLite-specific config if issues arise

**Prisma** (`apps/web/prisma/`):
- Use existing schema
- Run migrations against in-memory DB in test setup
- No changes to production schema needed

**Existing Routes** (`apps/web/src/server/routes/projects.ts`):
- No modifications required
- Tests validate existing implementation

## Implementation Details

### 1. Database Test Utilities

Create `apps/web/src/server/test-utils/db.ts` with functions for managing in-memory SQLite database in tests.

**Key Points**:
- `setupTestDB()` - Creates `:memory:` SQLite DB, runs migrations, returns PrismaClient
- `teardownTestDB()` - Disconnects Prisma, destroys in-memory DB
- `cleanTestDB()` - Truncates all tables between tests (preserves schema)
- `resetTestDB()` - Drop and recreate schema (for schema change tests)
- Uses `execSync('pnpm prisma migrate deploy')` to apply migrations
- Exports singleton PrismaClient for test usage

### 2. Fixture Factory Functions

Create `apps/web/src/server/test-utils/fixtures.ts` with factory functions for generating test data.

**Key Points**:
- `createTestUser(prisma, overrides?)` - Creates User with password hash, returns user object
- `createTestProject(prisma, overrides?)` - Creates Project with path validation, returns project
- `createTestSession(prisma, overrides?)` - Creates AgentSession linked to project/user
- `createAuthToken(userId, fastify?)` - Generates valid JWT token for authenticated requests
- Each function accepts optional `overrides` object to customize fields
- Sensible defaults: `name: 'Test Project'`, `agent: 'claude'`, `state: 'idle'`
- Uses bcrypt for password hashing in `createTestUser`

### 3. Fastify Test Utilities

Create `apps/web/src/server/test-utils/fastify.ts` for spinning up Fastify instance in tests.

**Key Points**:
- `createTestApp(prisma?)` - Creates Fastify instance with auth plugin, registers routes
- `closeTestApp(app)` - Gracefully closes Fastify instance
- `injectAuth(userId, fastify)` - Helper to generate Bearer token header
- Skips WebSocket routes in test app (not needed for HTTP route testing)
- Configures logger to silent mode for clean test output
- Registers all route modules (auth, projects, sessions, etc.)

### 4. Gold Standard Route Test

Create `apps/web/src/server/routes/projects.test.ts` with comprehensive test coverage for `GET /api/projects/:id`.

**Key Points**:
- Tests 5+ scenarios: 200 success, 404 not found, 401 unauthorized, 400 invalid ID, schema validation
- Uses `beforeAll` to setup DB and Fastify app (shared across tests)
- Uses `afterEach` to clean DB between tests (fresh state)
- Uses `afterAll` to teardown DB and close app
- Each test: Arrange (create data with fixtures) → Act (inject request) → Assert (status + response shape)
- Validates response matches Zod schema (`projectResponseSchema`)
- Tests authenticated vs unauthenticated requests
- Tests edge cases: non-existent ID, malformed UUID, missing auth header

## Files to Create/Modify

### New Files (5)

1. `apps/web/src/server/test-utils/db.ts` - Database utilities (~100 lines)
2. `apps/web/src/server/test-utils/fixtures.ts` - Fixture factories (~150 lines)
3. `apps/web/src/server/test-utils/fastify.ts` - Fastify test app (~80 lines)
4. `apps/web/src/server/routes/projects.test.ts` - Gold standard test (~250 lines)
5. `apps/web/src/server/test-utils/README.md` - Testing guide (~200 lines)

### Modified Files (0-1)

1. `apps/web/vitest.config.ts` - Only if SQLite config needed (unlikely)

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Database Test Utilities

<!-- prettier-ignore -->
- [x] db-setup - Create in-memory SQLite database setup function
  - Export `setupTestDB()` that sets `DATABASE_URL=file::memory:?cache=shared`
  - Run `pnpm prisma migrate deploy` via `execSync` to apply migrations
  - Create and connect PrismaClient instance
  - File: `apps/web/src/server/test-utils/db.ts`
- [x] db-teardown - Create database teardown function
  - Export `teardownTestDB()` that disconnects Prisma client
  - Cleans up in-memory database
  - File: `apps/web/src/server/test-utils/db.ts`
- [x] db-clean - Create table cleanup function
  - Export `cleanTestDB()` that truncates all tables in correct order (foreign keys)
  - Order: WorkflowArtifact → WorkflowEvent → WorkflowRunStep → WorkflowRun → WorkflowDefinition → AgentSession → Project → User
  - File: `apps/web/src/server/test-utils/db.ts`
- [x] db-reset - Create schema reset function (optional, for schema change tests)
  - Export `resetTestDB()` that drops and recreates schema
  - File: `apps/web/src/server/test-utils/db.ts`

#### Completion Notes

- Created `db.ts` with all database utility functions
- Uses `file::memory:?cache=shared` for in-memory SQLite
- Runs migrations via `execSync` with error handling
- `cleanTestDB()` deletes tables in correct FK order
- Added `getTestPrisma()` helper for convenience
- Singleton pattern for test Prisma client

### Task Group 2: Fixture Factory Functions

<!-- prettier-ignore -->
- [x] fixture-user - Create user fixture factory
  - Export `createTestUser(prisma, overrides?)` with defaults: `username: 'testuser'`, `email: 'test@example.com'`, `password: 'password123'`
  - Use bcrypt to hash password before creating user
  - Return created user object (without password_hash)
  - File: `apps/web/src/server/test-utils/fixtures.ts`
- [x] fixture-project - Create project fixture factory
  - Export `createTestProject(prisma, overrides?)` with defaults: `name: 'Test Project'`, `path: '/tmp/test-project'`
  - Validate path exists or use temp directory
  - Return created project object
  - File: `apps/web/src/server/test-utils/fixtures.ts`
- [x] fixture-session - Create session fixture factory
  - Export `createTestSession(prisma, overrides?)` with defaults: `agent: 'claude'`, `state: 'idle'`
  - Requires `projectId` and `userId` in overrides
  - Return created session object
  - File: `apps/web/src/server/test-utils/fixtures.ts`
- [x] fixture-token - Create JWT token helper
  - Export `createAuthToken(userId, username?)` that generates valid JWT
  - Use same secret as production (`JWT_SECRET` env var)
  - Return signed token string
  - File: `apps/web/src/server/test-utils/fixtures.ts`

#### Completion Notes

- Created all fixture factory functions in `fixtures.ts`
- Uses bcrypt with saltRounds=12 (matches production)
- User factory returns user without password_hash for security
- Session factory uses AgentType and SessionState enums from Prisma
- Auth token function supports both Fastify instance or manual JWT generation
- All factories have sensible defaults matching spec requirements

### Task Group 3: Fastify Test Utilities

<!-- prettier-ignore -->
- [x] fastify-create - Create Fastify test app factory
  - Export `createTestApp(prisma?)` that creates Fastify instance
  - Register auth plugin with JWT_SECRET
  - Register all route modules (projects, sessions, auth)
  - Skip WebSocket routes
  - Set logger to silent mode
  - File: `apps/web/src/server/test-utils/fastify.ts`
- [x] fastify-close - Create app cleanup function
  - Export `closeTestApp(app)` that calls `app.close()` gracefully
  - File: `apps/web/src/server/test-utils/fastify.ts`
- [x] fastify-auth - Create auth header helper
  - Export `injectAuth(userId, username, fastify)` that returns `{ authorization: 'Bearer <token>' }`
  - Uses `createAuthToken` internally
  - File: `apps/web/src/server/test-utils/fastify.ts`

#### Completion Notes

- Created Fastify test app factory with silent logger
- Registers all main route modules (auth, projects, sessions, git, etc.)
- WebSocket routes skipped as specified
- Auth helper uses `createAuthToken` from fixtures
- TypeScript types properly infer JWT plugin methods
- App properly configured with Zod validation compilers

### Task Group 4: Gold Standard Route Test

<!-- prettier-ignore -->
- [x] test-setup - Create test file with setup/teardown
  - Create `apps/web/src/server/routes/projects.test.ts`
  - Add `beforeAll` that calls `setupTestDB()` and `createTestApp()`
  - Add `afterEach` that calls `cleanTestDB()`
  - Add `afterAll` that calls `teardownTestDB()` and `closeTestApp()`
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] test-200 - Test successful project retrieval
  - Create test user and project with fixtures
  - Generate auth token
  - Inject `GET /api/projects/:id` with Bearer token
  - Assert status 200
  - Assert response matches `{ data: { id, name, path, ... } }`
  - Validate response against Zod schema
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] test-404 - Test non-existent project
  - Generate auth token
  - Inject `GET /api/projects/non-existent-id` with valid UUID
  - Assert status 404
  - Assert error response format `{ error: { message, statusCode } }`
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] test-401 - Test missing authentication
  - Create project
  - Inject `GET /api/projects/:id` WITHOUT auth header
  - Assert status 401
  - Assert error message contains "Unauthorized" or "No Authorization"
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] test-400 - Test invalid ID format
  - Generate auth token
  - Inject `GET /api/projects/invalid-uuid-format`
  - Assert status 400
  - Assert Zod validation error in response
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] test-schema - Test response schema validation
  - Create project with all fields populated
  - Inject `GET /api/projects/:id` with auth
  - Parse response with `projectResponseSchema.parse()`
  - Assert no validation errors
  - File: `apps/web/src/server/routes/projects.test.ts`

#### Completion Notes

- Created comprehensive test suite with 6 test cases (plus 1 bonus concurrent test)
- All test lifecycle hooks properly configured (beforeAll, afterEach, afterAll)
- Tests cover: 200 success, 404 not found, 401 unauthorized, 400 validation error
- Schema validation tests use Zod parse() and safeParse()
- Added bonus test for concurrent request handling
- All tests use fixture factories and auth helpers from test-utils
- JWT_SECRET set in beforeAll for test environment

### Task Group 5: Documentation

<!-- prettier-ignore -->
- [x] doc-readme - Create testing guide
  - Create `apps/web/src/server/test-utils/README.md`
  - Document when to use in-memory DB vs mocks
  - Provide copy-paste template for route tests
  - Document fixture factory usage
  - Include common patterns and gotchas
  - Add performance benchmarks (~50ms/test)
  - File: `apps/web/src/server/test-utils/README.md`

#### Completion Notes

- Created comprehensive testing guide (~300 lines)
- Includes Quick Start, When to Use guide, Test Utilities reference
- Provides copy-paste template for new route tests
- Documents common patterns: 200, 404, 401, 400, schema validation, concurrent tests
- Performance benchmarks and optimization tips included
- Troubleshooting section covers common issues
- Examples reference gold standard test (projects.test.ts)

## Testing Strategy

### Unit Tests

**Not included in this spec** - existing domain service tests continue using mocks.

### Integration Tests

**`apps/web/src/server/routes/projects.test.ts`** - Gold standard route test:

```typescript
describe('GET /api/projects/:id', () => {
  // Test cases:
  // - Returns 200 with project data for authenticated valid request
  // - Returns 404 for non-existent project ID
  // - Returns 401 for missing/invalid auth token
  // - Returns 400 for malformed project ID (Zod validation)
  // - Response matches projectResponseSchema exactly
});
```

### E2E Tests (if applicable)

Not included in this spec - focus on establishing integration test pattern first.

## Success Criteria

- [ ] In-memory SQLite database setup works in tests
- [ ] Fixture factories create valid test data
- [ ] Fastify test app boots and registers routes
- [ ] `GET /api/projects/:id` has 5+ passing test cases
- [ ] All tests run in <5 seconds total (~50ms per test)
- [ ] No Prisma schema mismatches (real queries catch issues)
- [ ] Documentation provides clear copy-paste template
- [ ] Zero manual Prisma mocking needed

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Run gold standard test
pnpm test src/server/routes/projects.test.ts
# Expected: All tests pass (5+ test cases)

# Run all server tests (ensure no regressions)
pnpm test src/server/
# Expected: All tests pass

# Performance check
pnpm test src/server/routes/projects.test.ts --reporter=verbose
# Expected: Total time <5 seconds, ~50ms per test
```

**Manual Verification:**

1. Review test output: `pnpm test src/server/routes/projects.test.ts`
2. Verify all 5 test cases pass (200, 404, 401, 400, schema)
3. Check test execution time (should be <5s total)
4. Review test code in `projects.test.ts` for clarity
5. Read `test-utils/README.md` and verify it's comprehensive
6. Try copy-pasting template from README to create new test - should work without modifications

**Feature-Specific Checks:**

- Run tests multiple times to ensure no DB connection leaks
- Verify `cleanTestDB()` actually clears data between tests
- Check that in-memory DB doesn't create files in filesystem
- Validate fixture factories create data that passes Prisma constraints
- Confirm auth tokens work with Fastify auth plugin

## Implementation Notes

### 1. Prisma Migration Execution

Running migrations in tests requires careful handling:
- Use `execSync('pnpm prisma migrate deploy', { stdio: 'ignore' })` to suppress output
- Set `DATABASE_URL` env var before running migrations
- Handle errors gracefully (migration failures should fail test setup)

### 2. Test Data Cleanup Order

SQLite enforces foreign key constraints. Clean tables in this order:
1. WorkflowArtifact (leaf node)
2. WorkflowEvent (leaf node)
3. WorkflowRunStep (references WorkflowRun, AgentSession)
4. WorkflowRun (references WorkflowDefinition, Project, User)
5. WorkflowDefinition (references Project)
6. AgentSession (references Project, User)
7. Project (referenced by many)
8. User (referenced by many)

### 3. JWT Secret in Tests

Tests need `JWT_SECRET` env var. Options:
- Set in `beforeAll`: `process.env.JWT_SECRET = 'test-secret'`
- Use existing `.env` file (if present)
- Hardcode test secret in `createAuthToken` function

### 4. Performance Considerations

Target ~50ms per test. If slower:
- Check migration execution time (only run once in `beforeAll`)
- Verify `cleanTestDB` doesn't recreate schema (use DELETE, not DROP)
- Consider using single Prisma client instance (don't recreate per test)

## Dependencies

- bcrypt (already in package.json)
- vitest (already in package.json)
- @prisma/client (already in package.json)
- No new dependencies required

## Timeline

| Task                     | Estimated Time |
| ------------------------ | -------------- |
| Database Test Utilities  | 1.5 hours      |
| Fixture Factory Functions| 1.5 hours      |
| Fastify Test Utilities   | 1 hour         |
| Gold Standard Route Test | 1.5 hours      |
| Documentation            | 0.5 hours      |
| **Total**                | **6 hours**    |

## References

- Audit findings: Current state uses manual Prisma mocking, 0 route tests, 8 service tests
- Vitest docs: https://vitest.dev/guide/
- Prisma testing guide: https://www.prisma.io/docs/guides/testing
- Fastify testing: https://www.fastify.io/docs/latest/Guides/Testing/
- Existing test pattern: `apps/web/src/server/services/projectSync.test.ts`

## Next Steps

1. Run `/implement-spec 47` to execute all tasks in order
2. After implementation, use test as template for other route tests
3. Incrementally add tests for other endpoints (sessions, files, git)
4. Consider extracting common patterns into additional test utilities
5. Add E2E tests for WebSocket routes using similar pattern
