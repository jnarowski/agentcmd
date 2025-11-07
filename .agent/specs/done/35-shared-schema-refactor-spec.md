# Shared Schema Refactor

**Status**: draft
**Created**: 2025-10-31
**Package**: apps/web
**Estimated Effort**: 12-16 hours

## Overview

Consolidate duplicated types, validation schemas, constants, and utilities between frontend and backend into a shared directory to improve type safety, enable client-side validation, and establish a single source of truth for API contracts. This refactor addresses type mismatches at the client/server boundary and eliminates magic string duplication.

## User Story

As a developer
I want types, schemas, and utilities shared between client and server
So that the API contract is enforced at compile-time, client-side validation is consistent with server-side, and code duplication is eliminated

## Technical Approach

This refactor follows a phased migration approach:
1. **Phase 1**: Fix critical type mismatches (error responses, success responses) and extract constants
2. **Phase 2**: Move Zod validation schemas to shared and enable client-side validation
3. **Phase 3**: Create barrel exports, add comprehensive tests, and document shared code guidelines

All migrations maintain backward compatibility and are validated with existing tests plus new unit tests for shared code.

## Key Design Decisions

1. **Move ALL Zod schemas to shared**: Client benefits from pre-flight validation, automatic type inference, and consistent validation rules. The coupling already exists (API contract), so sharing schemas makes it explicit and type-safe.

2. **Keep error classes server-only, share error codes**: Error classes use Node.js Error inheritance which doesn't serialize well. Instead, share error code constants that both client and server can reference.

3. **Use barrel exports for discoverability**: Create `shared/index.ts` master export to enable clean imports like `import { X, Y } from '@/shared'`.

4. **Add comprehensive tests**: Shared code must work in both client and server contexts, so unit tests validate schemas, utilities, and constants independently.

## Architecture

### File Structure
```
apps/web/src/
├── shared/
│   ├── types/
│   │   ├── api.types.ts          # NEW: Unified API response types
│   │   ├── errors.types.ts       # NEW: Error codes and interfaces
│   │   └── [existing types]
│   ├── schemas/                  # NEW: Zod validation schemas
│   │   ├── session.schemas.ts    # MOVED from server/schemas/
│   │   ├── git.schemas.ts        # MOVED from server/schemas/
│   │   ├── shell.schemas.ts      # MOVED from server/schemas/
│   │   ├── project.schemas.ts    # MOVED from server/schemas/
│   │   ├── file.schemas.ts       # MOVED from server/schemas/
│   │   └── index.ts              # NEW: Barrel export
│   ├── constants/                # NEW: Shared constants
│   │   ├── session.constants.ts  # NEW: Session-related constants
│   │   ├── agent.constants.ts    # NEW: Agent-related constants
│   │   └── index.ts              # NEW: Barrel export
│   ├── utils/
│   │   ├── text.utils.ts         # NEW: Text manipulation (moved from client)
│   │   ├── text.utils.test.ts    # NEW: Unit tests
│   │   ├── message.utils.ts      # EXISTS: Keep as-is
│   │   └── index.ts              # UPDATE: Add text.utils export
│   └── index.ts                  # NEW: Master barrel export
├── client/
│   ├── lib/
│   │   └── api-types.ts          # UPDATE: Remove duplicates, import from shared
│   └── utils/
│       ├── truncate.ts           # DELETE: Moved to shared
│       └── getSessionDisplayName.ts # UPDATE: Use shared constants
├── server/
│   ├── schemas/                  # MOVE ALL to shared/schemas/
│   │   └── response.ts           # KEEP: Fastify-specific response schemas
│   ├── utils/
│   │   ├── error.ts              # UPDATE: Use shared types
│   │   ├── response.ts           # UPDATE: Use shared types
│   │   └── generateSessionName.ts # UPDATE: Use shared constants and truncate
│   └── domain/
│       └── [all domains]         # UPDATE: Import schemas from shared
```

### Integration Points

**Client (`apps/web/src/client/`)**:
- `lib/api-types.ts` - Import `ApiErrorResponse`, `ApiSuccessResponse` from shared
- `lib/error-handlers.ts` - Use shared error codes for structured handling
- `utils/getSessionDisplayName.ts` - Import `DEFAULT_SESSION_NAME` from shared constants
- `pages/*/components/*` - Use shared schemas for form validation

**Server (`apps/web/src/server/`)**:
- `utils/error.ts` - Import `ApiErrorResponse` from shared, use error codes
- `utils/response.ts` - Import `ApiSuccessResponse` from shared
- `utils/generateSessionName.ts` - Import constants and `truncate()` from shared
- `domain/*/services/*` - Import schemas from `@/shared/schemas`
- `routes/*` - Import schemas from `@/shared/schemas`

## Implementation Details

### 1. Unified API Response Types

Currently, client and server have incompatible response types. Server expects error responses to always be objects with `statusCode`, but client accepts either objects or strings. This causes type safety issues.

**Key Points**:
- Create `shared/types/api.types.ts` with standardized interfaces
- `ApiErrorResponse` always returns object with `message`, `statusCode`, `code`, `details`
- `ApiSuccessResponse<T>` wraps data in `{ data: T }` structure
- Both client and server import from shared to ensure consistency

### 2. Error Codes and Interfaces

Server has rich error class hierarchy (`NotFoundError`, `ValidationError`, etc.) but client can't use `instanceof` checks across network boundary. Error codes provide structured error handling without class inheritance.

**Key Points**:
- Create `ErrorCodes` const object with uppercase codes
- Define `AppErrorData` interface matching server error structure
- Keep actual Error classes in `server/errors/` (server-specific)
- Client uses error codes for conditional logic, not `instanceof`

### 3. Shared Constants

Magic strings like "Untitled Session" appear in both `getSessionDisplayName()` (client) and `generateSessionName()` (server). Changes require updating multiple files.

**Key Points**:
- Extract `DEFAULT_SESSION_NAME = 'Untitled Session'`
- Extract `SESSION_NAME_GENERATION_PROMPT_LENGTH = 200`
- Extract agent defaults and supported agent list
- Single location to update values

### 4. Text Utilities

Client has robust `truncate.ts` with three variants (`truncate`, `truncateAtWord`, `truncateMiddle`). Server uses raw `substring(0, 200)` which doesn't handle edge cases (word boundaries, emoji, etc.).

**Key Points**:
- Move `client/utils/truncate.ts` → `shared/utils/text.utils.ts`
- Server adopts `truncate()` function for session name generation
- Add unit tests for all three truncation variants
- Handle edge cases: empty strings, shorter-than-limit, emoji/unicode

### 5. Zod Validation Schemas

All validation schemas currently live in `server/schemas/`. Client manually defines TypeScript types which can drift from server schemas, causing runtime errors.

**Key Points**:
- Move all domain schemas to `shared/schemas/` (session, git, shell, project, file)
- Keep Fastify-specific response schemas in `server/schemas/response.ts` (framework-specific)
- Client imports shared schemas for form validation (pre-flight validation)
- Type inference automatic: `z.infer<typeof createSessionSchema>` works on both sides
- Server routes continue using schemas, just import path changes

### 6. Barrel Exports

Multiple import paths (`@/shared/types/api.types`, `@/shared/constants/session.constants`) are verbose. Barrel exports consolidate imports.

**Key Points**:
- Create `shared/index.ts` exporting from all subdirectories
- Create `shared/schemas/index.ts` exporting all schemas
- Create `shared/constants/index.ts` exporting all constants
- Enables: `import { ApiSuccessResponse, DEFAULT_SESSION_NAME, createSessionSchema } from '@/shared'`

## Files to Create/Modify

### New Files (11)

1. `apps/web/src/shared/types/api.types.ts` - Unified API response types
2. `apps/web/src/shared/types/errors.types.ts` - Error codes and interfaces
3. `apps/web/src/shared/schemas/session.schemas.ts` - Session validation (moved)
4. `apps/web/src/shared/schemas/git.schemas.ts` - Git validation (moved)
5. `apps/web/src/shared/schemas/shell.schemas.ts` - Shell validation (moved)
6. `apps/web/src/shared/schemas/project.schemas.ts` - Project validation (moved)
7. `apps/web/src/shared/schemas/file.schemas.ts` - File validation (moved)
8. `apps/web/src/shared/schemas/index.ts` - Schema barrel export
9. `apps/web/src/shared/constants/session.constants.ts` - Session constants
10. `apps/web/src/shared/constants/agent.constants.ts` - Agent constants
11. `apps/web/src/shared/constants/index.ts` - Constants barrel export
12. `apps/web/src/shared/utils/text.utils.ts` - Text utilities (moved)
13. `apps/web/src/shared/utils/text.utils.test.ts` - Text utility tests
14. `apps/web/src/shared/index.ts` - Master barrel export
15. `apps/web/src/shared/README.md` - Shared code documentation

### Modified Files (20+)

1. `apps/web/src/client/lib/api-types.ts` - Import from shared, remove duplicates
2. `apps/web/src/client/lib/error-handlers.ts` - Use shared error codes
3. `apps/web/src/client/utils/getSessionDisplayName.ts` - Use shared constants
4. `apps/web/src/server/utils/error.ts` - Use shared types
5. `apps/web/src/server/utils/response.ts` - Use shared types
6. `apps/web/src/server/utils/generateSessionName.ts` - Use shared constants and truncate
7. `apps/web/src/server/schemas/response.ts` - Keep Fastify schemas, remove moved ones
8. `apps/web/src/server/domain/session/services/*` - Import schemas from shared
9. `apps/web/src/server/domain/git/services/*` - Import schemas from shared
10. `apps/web/src/server/domain/project/services/*` - Import schemas from shared
11. `apps/web/src/server/domain/file/services/*` - Import schemas from shared
12. `apps/web/src/server/domain/shell/services/*` - Import schemas from shared
13. `apps/web/src/server/routes/sessions.ts` - Import schemas from shared
14. `apps/web/src/server/routes/projects.ts` - Import schemas from shared
15. `apps/web/src/server/routes/files.ts` - Import schemas from shared
16. `apps/web/src/server/routes/git.ts` - Import schemas from shared
17. `apps/web/src/server/websocket/handlers/shellHandler.ts` - Import schemas from shared
18. `apps/web/src/shared/utils/index.ts` - Add text.utils export
19. `apps/web/src/shared/types/index.ts` - Add api.types and errors.types exports

### Deleted Files (1)

1. `apps/web/src/client/utils/truncate.ts` - Moved to shared

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Foundation - API Response Types

<!-- prettier-ignore -->
- [ ] api-types-1 Create unified API response types file
  - Define `ApiErrorResponse` interface with required fields: message, statusCode, code?, details?
  - Define `ApiSuccessResponse<T>` generic interface with data wrapper
  - File: `apps/web/src/shared/types/api.types.ts`
- [ ] api-types-2 Update shared types barrel export
  - Add `export * from './api.types'` to barrel
  - File: `apps/web/src/shared/types/index.ts`
- [ ] api-types-3 Update server error utility to use shared types
  - Import `ApiErrorResponse` from `@/shared/types/api.types`
  - Update `ErrorResponse` type alias to use shared type
  - File: `apps/web/src/server/utils/error.ts`
- [ ] api-types-4 Update server response utility to use shared types
  - Import `ApiSuccessResponse` from `@/shared/types/api.types`
  - Update `SuccessResponse` type alias to use shared type
  - File: `apps/web/src/server/utils/response.ts`
- [ ] api-types-5 Update client API types to use shared types
  - Import `ApiErrorResponse`, `ApiSuccessResponse` from `@/shared`
  - Remove local duplicate definitions
  - File: `apps/web/src/client/lib/api-types.ts`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 2: Constants Extraction

<!-- prettier-ignore -->
- [ ] constants-1 Create session constants file
  - Define `DEFAULT_SESSION_NAME = 'Untitled Session'`
  - Define `SESSION_NAME_GENERATION_PROMPT_LENGTH = 200`
  - File: `apps/web/src/shared/constants/session.constants.ts`
- [ ] constants-2 Create agent constants file
  - Define `SUPPORTED_AGENTS = ['claude', 'codex', 'cursor', 'gemini'] as const`
  - Define `DEFAULT_AGENT: AgentType = 'claude'`
  - File: `apps/web/src/shared/constants/agent.constants.ts`
- [ ] constants-3 Create constants barrel export
  - Export all constants from session.constants and agent.constants
  - File: `apps/web/src/shared/constants/index.ts`
- [ ] constants-4 Update client getSessionDisplayName to use shared constant
  - Import `DEFAULT_SESSION_NAME` from `@/shared/constants`
  - Replace hardcoded string with constant
  - File: `apps/web/src/client/utils/getSessionDisplayName.ts`
- [ ] constants-5 Update server generateSessionName to use shared constants
  - Import `DEFAULT_SESSION_NAME`, `SESSION_NAME_GENERATION_PROMPT_LENGTH` from `@/shared/constants`
  - Replace hardcoded values with constants
  - File: `apps/web/src/server/utils/generateSessionName.ts`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 3: Text Utilities Migration

<!-- prettier-ignore -->
- [ ] text-utils-1 Move truncate utility to shared
  - Copy `apps/web/src/client/utils/truncate.ts` → `apps/web/src/shared/utils/text.utils.ts`
  - Verify all three functions exported: truncate, truncateAtWord, truncateMiddle
  - File: `apps/web/src/shared/utils/text.utils.ts`
- [ ] text-utils-2 Create unit tests for text utilities
  - Test truncate: basic, shorter than limit, empty string, emoji handling
  - Test truncateAtWord: word boundary detection, no spaces case
  - Test truncateMiddle: middle truncation, odd/even length strings
  - File: `apps/web/src/shared/utils/text.utils.test.ts`
  - Command: `pnpm test text.utils.test.ts`
- [ ] text-utils-3 Update shared utils barrel export
  - Add `export * from './text.utils'` to barrel
  - File: `apps/web/src/shared/utils/index.ts`
- [ ] text-utils-4 Update server to use shared truncate utility
  - Import `truncate` from `@/shared/utils`
  - Replace `userPrompt.substring(0, 200)` with `truncate(userPrompt, SESSION_NAME_GENERATION_PROMPT_LENGTH)`
  - File: `apps/web/src/server/utils/generateSessionName.ts`
- [ ] text-utils-5 Update client to import from shared
  - Change all imports from `@/client/utils/truncate` to `@/shared/utils`
  - File: Search and replace across client directory
- [ ] text-utils-6 Delete old client truncate utility
  - Remove file after verifying all imports updated
  - File: `apps/web/src/client/utils/truncate.ts`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 4: Error Codes and Types

<!-- prettier-ignore -->
- [ ] errors-1 Create shared error types file
  - Define `ErrorCodes` const object with all error codes (NOT_FOUND, UNAUTHORIZED, etc.)
  - Define `ErrorCode` type from ErrorCodes keys
  - Define `AppErrorData` interface matching server error structure
  - File: `apps/web/src/shared/types/errors.types.ts`
- [ ] errors-2 Update shared types barrel export
  - Add `export * from './errors.types'` to barrel
  - File: `apps/web/src/shared/types/index.ts`
- [ ] errors-3 Update server error classes to use shared error codes
  - Import `ErrorCodes`, `ErrorCode` from `@/shared/types/errors.types`
  - Update error class constructors to use `ErrorCodes` constants
  - File: `apps/web/src/server/errors/AppError.ts` and derived classes
- [ ] errors-4 Update client error handlers to use shared error codes
  - Import `ErrorCodes` from `@/shared/types/errors.types`
  - Add conditional logic based on error codes instead of string matching
  - File: `apps/web/src/client/lib/error-handlers.ts`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 5: Zod Schema Migration - Session

<!-- prettier-ignore -->
- [ ] schemas-session-1 Move session schemas to shared
  - Copy `apps/web/src/server/schemas/session.ts` → `apps/web/src/shared/schemas/session.schemas.ts`
  - Verify all exports: createSessionSchema, updateSessionSchema, deleteSessionSchema, etc.
  - File: `apps/web/src/shared/schemas/session.schemas.ts`
- [ ] schemas-session-2 Update server session routes to use shared schemas
  - Change imports from `@/server/schemas/session` to `@/shared/schemas/session.schemas`
  - File: `apps/web/src/server/routes/sessions.ts`
- [ ] schemas-session-3 Update server session services to use shared schemas
  - Update all imports in session domain services
  - Files: `apps/web/src/server/domain/session/services/*`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 6: Zod Schema Migration - Git

<!-- prettier-ignore -->
- [ ] schemas-git-1 Move git schemas to shared
  - Copy `apps/web/src/server/schemas/git.ts` → `apps/web/src/shared/schemas/git.schemas.ts`
  - Verify all exports: gitStatusSchema, commitSchema, branchSchema, etc.
  - File: `apps/web/src/shared/schemas/git.schemas.ts`
- [ ] schemas-git-2 Update server git routes to use shared schemas
  - Change imports from `@/server/schemas/git` to `@/shared/schemas/git.schemas`
  - File: `apps/web/src/server/routes/git.ts`
- [ ] schemas-git-3 Update server git services to use shared schemas
  - Update all imports in git domain services
  - Files: `apps/web/src/server/domain/git/services/*`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 7: Zod Schema Migration - Shell

<!-- prettier-ignore -->
- [ ] schemas-shell-1 Move shell schemas to shared
  - Copy `apps/web/src/server/schemas/shell.ts` → `apps/web/src/shared/schemas/shell.schemas.ts`
  - Verify all exports: shellMessageSchema, shellInputSchema, shellOutputSchema, etc.
  - File: `apps/web/src/shared/schemas/shell.schemas.ts`
- [ ] schemas-shell-2 Update server shell WebSocket handler to use shared schemas
  - Change imports from `@/server/schemas/shell` to `@/shared/schemas/shell.schemas`
  - File: `apps/web/src/server/websocket/handlers/shellHandler.ts`
- [ ] schemas-shell-3 Update server shell services to use shared schemas
  - Update all imports in shell domain services
  - Files: `apps/web/src/server/domain/shell/services/*`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 8: Zod Schema Migration - Project

<!-- prettier-ignore -->
- [ ] schemas-project-1 Move project schemas to shared
  - Copy `apps/web/src/server/schemas/project.ts` → `apps/web/src/shared/schemas/project.schemas.ts`
  - Verify all exports: createProjectSchema, updateProjectSchema, etc.
  - File: `apps/web/src/shared/schemas/project.schemas.ts`
- [ ] schemas-project-2 Update server project routes to use shared schemas
  - Change imports from `@/server/schemas/project` to `@/shared/schemas/project.schemas`
  - File: `apps/web/src/server/routes/projects.ts`
- [ ] schemas-project-3 Update server project services to use shared schemas
  - Update all imports in project domain services
  - Files: `apps/web/src/server/domain/project/services/*`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 9: Zod Schema Migration - File

<!-- prettier-ignore -->
- [ ] schemas-file-1 Move file schemas to shared
  - Copy `apps/web/src/server/schemas/file.ts` → `apps/web/src/shared/schemas/file.schemas.ts`
  - Verify all exports: readFileSchema, writeFileSchema, deleteFileSchema, etc.
  - File: `apps/web/src/shared/schemas/file.schemas.ts`
- [ ] schemas-file-2 Update server file routes to use shared schemas
  - Change imports from `@/server/schemas/file` to `@/shared/schemas/file.schemas`
  - File: `apps/web/src/server/routes/files.ts`
- [ ] schemas-file-3 Update server file services to use shared schemas
  - Update all imports in file domain services
  - Files: `apps/web/src/server/domain/file/services/*`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 10: Schema Barrel Exports

<!-- prettier-ignore -->
- [ ] schemas-barrel-1 Create schema barrel export
  - Export all schemas from session, git, shell, project, file
  - File: `apps/web/src/shared/schemas/index.ts`
- [ ] schemas-barrel-2 Clean up server schemas directory
  - Keep only `response.ts` (Fastify-specific schemas)
  - Remove old schema files that were moved to shared
  - Files: Delete `apps/web/src/server/schemas/{session,git,shell,project,file}.ts`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 11: Master Barrel Export

<!-- prettier-ignore -->
- [ ] barrel-1 Create master shared barrel export
  - Export from types, schemas, constants, utils, websocket
  - File: `apps/web/src/shared/index.ts`
- [ ] barrel-2 Update imports across codebase to use barrel exports (optional optimization)
  - Change verbose imports to use `@/shared` barrel
  - Example: `import { ApiSuccessResponse, DEFAULT_SESSION_NAME } from '@/shared'`
  - Files: Search and replace across client and server

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 12: Client-Side Validation

<!-- prettier-ignore -->
- [ ] client-validation-1 Add session form validation
  - Import `createSessionSchema` from `@/shared/schemas`
  - Add pre-flight validation before API call
  - Show validation errors in form UI
  - File: `apps/web/src/client/pages/sessions/components/CreateSessionForm.tsx` (or similar)
- [ ] client-validation-2 Add project form validation
  - Import `createProjectSchema` from `@/shared/schemas`
  - Add pre-flight validation before API call
  - File: `apps/web/src/client/pages/projects/components/CreateProjectForm.tsx` (or similar)
- [ ] client-validation-3 Add file operation validation
  - Import file schemas from `@/shared/schemas`
  - Validate file operations before sending to server
  - Files: File editor components

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 13: Documentation

<!-- prettier-ignore -->
- [ ] docs-1 Create shared README with guidelines
  - Document what belongs in shared vs. client/server
  - Explain import conventions
  - Provide examples of proper usage
  - List architectural boundaries (what NOT to share)
  - File: `apps/web/src/shared/README.md`
- [ ] docs-2 Update main CLAUDE.md with shared code section
  - Add section explaining shared directory structure
  - Document when to add code to shared
  - Reference shared/README.md
  - File: `apps/web/CLAUDE.md` or root `CLAUDE.md`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

**`apps/web/src/shared/utils/text.utils.test.ts`** - Text utility functions:
```typescript
describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('hello world', 5)).toBe('he...');
  });

  it('returns original if shorter than limit', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });

  it('handles empty strings', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('handles emoji correctly', () => {
    expect(truncate('👍👍👍👍👍', 3)).toHaveLength(4); // 2 emoji + ...
  });
});

describe('truncateAtWord', () => {
  it('truncates at word boundary', () => {
    expect(truncateAtWord('hello world foo', 10)).toBe('hello...');
  });
});

describe('truncateMiddle', () => {
  it('truncates from middle', () => {
    expect(truncateMiddle('hello world', 8)).toBe('hel...ld');
  });
});
```

**`apps/web/src/shared/schemas/*.test.ts`** - Schema validation (optional, but recommended):
```typescript
describe('createSessionSchema', () => {
  it('validates valid session data', () => {
    const result = createSessionSchema.safeParse({
      projectId: 'proj-123',
      agentType: 'claude',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid agent type', () => {
    const result = createSessionSchema.safeParse({
      projectId: 'proj-123',
      agentType: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

Existing integration tests in both client and server should continue passing:
- Server route tests validate schemas work server-side
- Client component tests validate schemas work client-side
- No new integration tests required (existing coverage sufficient)

### E2E Tests

Not applicable - this is a refactor with no user-facing changes. Existing E2E tests will validate that functionality remains intact.

## Success Criteria

- [ ] No type mismatches between client/server API responses
- [ ] All magic strings extracted to shared constants
- [ ] Zod schemas accessible from both client and server
- [ ] Client can validate inputs before API calls using shared schemas
- [ ] Server imports all schemas from shared directory
- [ ] All shared utilities have unit tests with >80% coverage
- [ ] No duplicate type definitions between client and server
- [ ] Existing tests pass without modification (backward compatible)
- [ ] Build succeeds with no TypeScript errors
- [ ] Documentation explains shared code guidelines

## Validation

Execute these commands to verify the refactor works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: Successful build with no errors

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests (shared utils)
pnpm test text.utils.test.ts
# Expected: All text utility tests pass

# All tests (client + server)
pnpm test
# Expected: All existing tests pass, no regressions

# Web app tests specifically
cd apps/web
pnpm test
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Verify: Create new session (tests session schema validation)
4. Verify: Create new project (tests project schema validation)
5. Verify: Session name displays "Untitled Session" if no name provided (tests shared constant)
6. Verify: Long session names are truncated properly (tests shared truncate utility)
7. Check console: No errors or warnings
8. Check server logs: `tail -f apps/web/logs/app.log` - no errors

**Feature-Specific Checks:**

- Form validation: Submit session form with invalid data → client-side validation error appears before API call
- Error handling: Trigger 404 error → client displays error using error code from shared constants
- Type safety: Hover over API response in IDE → shows `ApiSuccessResponse<T>` or `ApiErrorResponse` from shared
- Import paths: Search codebase for `@/server/schemas/` → should only find `response.ts`, all others use `@/shared/schemas/`

## Implementation Notes

### 1. Backward Compatibility

All changes maintain backward compatibility. Type aliases in server (`ErrorResponse`, `SuccessResponse`) point to shared types, so existing code continues working without modification.

### 2. Fastify Response Schemas

Fastify response schemas (in `server/schemas/response.ts`) are kept server-only because they're framework-specific and tightly coupled to Fastify's schema validation system. Only domain validation schemas are moved to shared.

### 3. Error Class Serialization

Error classes cannot be moved to shared because they rely on Node.js Error inheritance and don't serialize across the network boundary. Instead, we share error codes and interfaces, allowing client to handle errors structurally without `instanceof` checks.

### 4. Import Path Changes

All schema imports change from `@/server/schemas/` to `@/shared/schemas/`. The migration is safe because:
- TypeScript will catch any missing imports at compile time
- No runtime behavior changes (same schemas, different location)
- Search and replace can be done systematically per domain

### 5. Client-Side Validation Benefits

Moving schemas to shared enables client-side validation with zero duplication:
```typescript
// Client form component
const result = createSessionSchema.safeParse(formData);
if (!result.success) {
  // Show validation errors to user BEFORE API call
  setErrors(result.error.flatten());
  return;
}
// Only make API call if validation passes
await createSession(result.data);
```

This improves UX (instant feedback) and reduces server load (fewer invalid requests).

## Dependencies

- No new dependencies required
- Existing dependencies:
  - `zod` (already in both client and server)
  - `@fastify/type-provider-zod` (server-only, for Fastify integration)

## Timeline

| Task                          | Estimated Time |
| ----------------------------- | -------------- |
| API Response Types            | 1 hour         |
| Constants Extraction          | 1 hour         |
| Text Utilities Migration      | 2 hours        |
| Error Codes and Types         | 1.5 hours      |
| Session Schema Migration      | 1 hour         |
| Git Schema Migration          | 1 hour         |
| Shell Schema Migration        | 1 hour         |
| Project Schema Migration      | 1 hour         |
| File Schema Migration         | 1 hour         |
| Schema Barrel Exports         | 0.5 hours      |
| Master Barrel Export          | 0.5 hours      |
| Client-Side Validation        | 2 hours        |
| Documentation                 | 1.5 hours      |
| Testing & Validation          | 1 hour         |
| **Total**                     | **15-16 hours** |

## References

- [Audit Report](#) - Detailed findings from shared code audit
- [Zod Documentation](https://zod.dev/) - Schema validation library
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) - Type system reference
- Root `CLAUDE.md` - Import conventions and architecture guidelines

## Next Steps

1. Begin with Task Group 1: API Response Types (highest priority)
2. Continue sequentially through all task groups
3. Run validation commands after each task group
4. Update documentation as final step
5. Create PR with comprehensive changelist

---

**Implementation Command**: `/implement-spec 35`
