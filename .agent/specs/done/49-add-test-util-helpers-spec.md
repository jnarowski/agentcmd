# Test Utility Helpers Consolidation

**Status**: draft
**Created**: 2025-01-04
**Package**: apps/web
**Estimated Effort**: 2-3 hours

## Overview

Consolidate repeated testing patterns into reusable utilities by restructuring fixtures into a folder structure and adding helper functions for authenticated requests. This reduces boilerplate in route tests from 6+ lines per test to 1-2 lines while maintaining explicitness.

## User Story

As a developer writing route tests
I want to reuse common test patterns (user creation, authentication, requests)
So that I can write tests faster with less boilerplate and better maintainability

## Technical Approach

Extract high-value patterns identified in `projects.test.ts`:
1. Restructure single `fixtures.ts` file into organized folder with resource-specific files
2. Add `createAuthenticatedUser()` combining user creation + auth headers (eliminates 6x repetition)
3. Add `makeAuthenticatedRequest()` for simplified authenticated API calls (eliminates 6x repetition)

Avoid over-abstraction by NOT creating assertion helpers, lifecycle wrappers, or compound fixtures.

## Key Design Decisions

1. **Fixtures folder structure**: Organize by resource (user, project, session) for better discoverability and separation of concerns
2. **Explicit helpers only**: Only add helpers that save 3+ lines and appear 5+ times across tests
3. **No magic abstractions**: Avoid compound fixtures (createProjectWithOwner) that hide what's being created

## Architecture

### File Structure

```
apps/web/src/server/test-utils/
├── db.ts                           # Existing - database utilities
├── fastify.ts                      # Existing - app setup (UPDATE imports)
├── fixtures.ts                     # DELETE - replace with folder
├── fixtures/                       # NEW - organized fixtures
│   ├── index.ts                   # Barrel export all fixtures
│   ├── user.ts                    # User + auth fixtures
│   ├── project.ts                 # Project fixtures
│   └── session.ts                 # Session fixtures
└── requests.ts                     # NEW - authenticated request helper
```

### Integration Points

**Test Files**:
- `routes/projects.test.ts` - Primary consumer, will use new helpers
- `routes/sessions.test.ts` - Future consumer
- `routes/git.test.ts` - Future consumer
- Any future route test files

**Test Utilities**:
- `test-utils/fastify.ts` - Update imports from `fixtures.ts` to `fixtures/`

## Implementation Details

### 1. Fixtures Folder Structure

Split monolithic `fixtures.ts` (152 lines) into organized folder:

**Key Points**:
- `fixtures/user.ts` - User creation, password hashing, auth token generation
- `fixtures/project.ts` - Project creation with various overrides
- `fixtures/session.ts` - Agent session creation
- `fixtures/index.ts` - Barrel export for clean imports

### 2. Create Authenticated User Helper

Add convenience function to `fixtures/user.ts`:

```typescript
export async function createAuthenticatedUser(
  prisma: PrismaClient,
  app: FastifyInstance & { jwt: { sign: (payload: object) => string } },
  overrides?: { email?: string; password?: string; is_active?: boolean }
): Promise<{
  user: { id: string; email: string; created_at: Date; last_login: Date | null; is_active: boolean };
  token: string;
  headers: { authorization: string };
}> {
  const user = await createTestUser(prisma, overrides);
  const token = createAuthToken(user.id, user.email, app);
  const headers = { authorization: `Bearer ${token}` };
  return { user, token, headers };
}
```

**Key Points**:
- Combines `createTestUser()` + `createAuthToken()` + header formatting
- Returns user, token, and headers for flexibility
- Eliminates 3-line pattern repeated 6x in `projects.test.ts`

### 3. Authenticated Request Helper

Add to new `test-utils/requests.ts`:

```typescript
export async function makeAuthenticatedRequest(
  app: FastifyInstance,
  user: { id: string; email: string },
  options: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    url: string;
    body?: unknown;
    query?: Record<string, string>;
  }
) {
  const token = app.jwt.sign({ userId: user.id, email: user.email });

  return await app.inject({
    method: options.method,
    url: options.url,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    ...(options.body ? { payload: options.body } : {}),
    ...(options.query ? { query: options.query } : {}),
  });
}
```

**Key Points**:
- Handles auth header generation automatically
- Supports all HTTP methods and request options
- Returns standard `app.inject()` response

## Files to Create/Modify

### New Files (5)

1. `apps/web/src/server/test-utils/fixtures/index.ts` - Barrel export all fixtures
2. `apps/web/src/server/test-utils/fixtures/user.ts` - User + auth fixtures with `createAuthenticatedUser()`
3. `apps/web/src/server/test-utils/fixtures/project.ts` - Project fixtures
4. `apps/web/src/server/test-utils/fixtures/session.ts` - Session fixtures
5. `apps/web/src/server/test-utils/requests.ts` - `makeAuthenticatedRequest()` helper

### Modified Files (2)

1. `apps/web/src/server/test-utils/fastify.ts` - Update import from `./fixtures` to `./fixtures/`
2. `apps/web/src/server/routes/projects.test.ts` - Use new helpers to reduce boilerplate

### Deleted Files (1)

1. `apps/web/src/server/test-utils/fixtures.ts` - Replaced by fixtures/ folder

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Create Fixtures Folder Structure

<!-- prettier-ignore -->
- [x] 1.1 Create `fixtures/index.ts` barrel export
  - Export all fixture functions from user, project, session modules
  - File: `apps/web/src/server/test-utils/fixtures/index.ts`
- [x] 1.2 Create `fixtures/user.ts` with user fixtures
  - Move `createTestUser()` from old fixtures.ts
  - Move `createAuthToken()` from old fixtures.ts
  - Add new `createAuthenticatedUser()` helper
  - File: `apps/web/src/server/test-utils/fixtures/user.ts`
- [x] 1.3 Create `fixtures/project.ts` with project fixtures
  - Move `createTestProject()` from old fixtures.ts
  - File: `apps/web/src/server/test-utils/fixtures/project.ts`
- [x] 1.4 Create `fixtures/session.ts` with session fixtures
  - Move `createTestSession()` from old fixtures.ts
  - File: `apps/web/src/server/test-utils/fixtures/session.ts`

#### Completion Notes

- Created fixtures folder with organized resource-specific files
- All existing fixture functions migrated from old fixtures.ts
- Added new `createAuthenticatedUser()` helper combining user + token + headers
- Barrel export provides clean import path: `import { ... } from "./fixtures"`

### Task Group 2: Create Request Helper

<!-- prettier-ignore -->
- [x] 2.1 Create `requests.ts` with `makeAuthenticatedRequest()`
  - Accept app, user, and request options
  - Generate JWT token automatically
  - Handle all HTTP methods (GET, POST, PATCH, DELETE, PUT)
  - Support body, query, and custom headers
  - File: `apps/web/src/server/test-utils/requests.ts`

#### Completion Notes

- Created `makeAuthenticatedRequest()` helper function
- Handles JWT token generation automatically from user object
- Supports all HTTP methods and request options (body, query)
- Automatically sets Content-Type header when body is present

### Task Group 3: Update Imports

<!-- prettier-ignore -->
- [x] 3.1 Update `fastify.ts` imports
  - Change `import { createAuthToken } from "./fixtures"` to `import { createAuthToken } from "./fixtures"`
  - File: `apps/web/src/server/test-utils/fastify.ts`
- [x] 3.2 Delete old `fixtures.ts` file
  - Remove after confirming all code migrated
  - File: `apps/web/src/server/test-utils/fixtures.ts`

#### Completion Notes

- Import path in `fastify.ts` already works correctly (barrel export)
- Deleted old `fixtures.ts` file after confirming all code migrated to fixtures folder
- All tests now import from `./fixtures/` directory via barrel export

### Task Group 4: Refactor projects.test.ts

<!-- prettier-ignore -->
- [x] 4.1 Update test imports
  - Import `createAuthenticatedUser` from `test-utils/fixtures`
  - Import `makeAuthenticatedRequest` from `test-utils/requests`
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] 4.2 Refactor "should return 200" test
  - Replace user + headers pattern with `createAuthenticatedUser()`
  - Optionally use `makeAuthenticatedRequest()` for inject call
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] 4.3 Refactor "should return 404" test
  - Replace user + headers pattern with `createAuthenticatedUser()`
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] 4.4 Refactor "should return 401" test
  - Keep as-is (no auth needed for this test)
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] 4.5 Refactor "should return 400" test
  - Replace user + headers pattern with `createAuthenticatedUser()`
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] 4.6 Refactor "should validate response schema" test
  - Replace user + headers pattern with `createAuthenticatedUser()`
  - File: `apps/web/src/server/routes/projects.test.ts`
- [x] 4.7 Refactor "should handle concurrent requests" test
  - Replace user + headers pattern with `createAuthenticatedUser()`
  - File: `apps/web/src/server/routes/projects.test.ts`

#### Completion Notes

- Updated imports to use `createAuthenticatedUser` instead of `createTestUser` + `injectAuth`
- Refactored all 6 tests that required authentication (kept 401 test unchanged)
- Reduced boilerplate from 3 lines (createTestUser + injectAuth) to 1 line (createAuthenticatedUser)
- All tests now use destructured `{ headers }` from createAuthenticatedUser result
- Did not use `makeAuthenticatedRequest()` as current inject pattern is clear enough

## Testing Strategy

### Unit Tests

No new unit tests needed - helpers are tested implicitly through existing route tests.

### Integration Tests

**Validation via existing tests**:
- `apps/web/src/server/routes/projects.test.ts` - Should pass with new helpers
- All 6 existing test cases should continue passing
- Test output should be identical to before refactor

### E2E Tests (if applicable)

Not applicable - this is a test utility refactor with no user-facing changes.

## Success Criteria

- [ ] All 6 tests in `projects.test.ts` pass without modification to assertions
- [ ] Test boilerplate reduced from 6+ lines to 1-2 lines per test
- [ ] `createAuthenticatedUser()` returns user, token, and headers
- [ ] `makeAuthenticatedRequest()` supports all HTTP methods
- [ ] Fixtures organized by resource (user, project, session)
- [ ] No type errors in test files
- [ ] Old `fixtures.ts` deleted after migration

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web
pnpm check-types
# Expected: No type errors

# Run projects tests
pnpm vitest run src/server/routes/projects.test.ts
# Expected: All 6 tests pass
#   ✓ should return 200 with project data for authenticated valid request
#   ✓ should return 404 for non-existent project ID
#   ✓ should return 401 for missing authentication
#   ✓ should return 400 for invalid project ID format
#   ✓ should validate response schema with all fields populated
#   ✓ should handle concurrent requests correctly

# Run all server tests
pnpm test
# Expected: All tests pass (no regressions)

# Linting
pnpm lint
# Expected: No lint errors
```

**Manual Verification:**

1. Review `projects.test.ts` - Confirm tests are more readable with less boilerplate
2. Check test output - All assertions should pass identically to before
3. Verify imports - All test files should import from `fixtures/` not `fixtures.ts`
4. Confirm file deletion - `test-utils/fixtures.ts` should not exist

**Feature-Specific Checks:**

- `createAuthenticatedUser()` returns object with `{ user, token, headers }` structure
- `makeAuthenticatedRequest()` correctly generates JWT and sets Authorization header
- Fixtures folder exports all functions through barrel export (`fixtures/index.ts`)
- No breaking changes to existing test utilities

## Implementation Notes

### 1. Maintain Backward Compatibility During Migration

During implementation, temporarily keep both old and new fixtures:
1. Create new fixtures folder structure
2. Update imports incrementally
3. Delete old `fixtures.ts` only after all imports updated

### 2. Don't Over-Abstract

Explicitly NOT implementing:
- Assertion helpers (`expectSuccessResponse`, `expectErrorResponse`) - too granular
- Lifecycle helpers (`setupRouteTests`) - hides important setup
- Compound fixtures (`createProjectWithOwner`) - too magical

### 3. Future Expansion

When adding more route tests, consider:
- Adding workflow fixtures to `fixtures/workflow.ts`
- Adding git fixtures to `fixtures/git.ts`
- Keep one fixture file per database table/resource

## Dependencies

No new dependencies required - uses existing test infrastructure:
- `vitest` - Already configured
- `@fastify/jwt` - Already available in test app
- `@prisma/client` - Already used for fixtures

## Timeline

| Task                          | Estimated Time |
| ----------------------------- | -------------- |
| Create fixtures folder        | 30 minutes     |
| Create request helper         | 15 minutes     |
| Update imports                | 15 minutes     |
| Refactor projects.test.ts     | 45 minutes     |
| Testing and validation        | 30 minutes     |
| **Total**                     | **2-3 hours**  |

## References

- Existing test patterns: `apps/web/src/server/routes/projects.test.ts`
- Current fixtures: `apps/web/src/server/test-utils/fixtures.ts`
- Test utilities: `apps/web/src/server/test-utils/fastify.ts`

## Next Steps

1. Create fixtures folder structure with barrel export
2. Move existing fixture functions to resource-specific files
3. Add `createAuthenticatedUser()` helper to `fixtures/user.ts`
4. Create `requests.ts` with `makeAuthenticatedRequest()` helper
5. Update imports in `fastify.ts`
6. Refactor `projects.test.ts` to use new helpers
7. Run tests to validate no regressions
8. Delete old `fixtures.ts` file
