# Server Schema Refactoring - Final Cleanup

**Status**: draft
**Created**: 2025-01-03
**Package**: apps/web
**Estimated Effort**: 2-3 hours

## Overview

Complete the server schema migration to domain-driven architecture by removing deprecated schema files, migrating remaining active schemas to appropriate domain locations, and unifying API error types between frontend and backend. This finalizes the schema consolidation work started in earlier refactoring efforts.

## User Story

As a developer
I want all validation schemas organized by domain with unified error types
So that the codebase follows consistent domain-driven patterns and reduces confusion from deprecated files

## Technical Approach

Complete the schema migration in phases: (1) delete already-migrated deprecated files, (2) create missing domain structures (auth, common), (3) migrate remaining active schemas, (4) split response.ts by domain, (5) unify API error types in shared/, and (6) remove all legacy schema files. Each phase includes verification to ensure no breaking changes.

## Key Design Decisions

1. **Common domain for cross-cutting schemas**: Create `domain/common/` for schemas used across multiple domains (response wrappers, generic param validators like slashCommand)
2. **Auth gets dedicated domain**: Despite being single-user, auth schemas deserve dedicated domain for consistency and future extensibility
3. **Unified error types in shared/**: Move API error types to `shared/types/api-error.types.ts` for single source of truth between frontend/backend
4. **Split response.ts**: Keep util functions in `utils/response.ts`, move Zod schemas to domains (auth schemas → auth domain, project schemas → project domain, generic wrappers → common domain)

## Architecture

### File Structure

```
apps/web/src/
├── shared/
│   └── types/
│       └── api-error.types.ts          # NEW - Unified error types
│
├── server/
│   ├── domain/
│   │   ├── auth/                        # NEW
│   │   │   └── schemas/
│   │   │       └── index.ts             # Move from schemas/auth.ts
│   │   ├── common/                      # NEW
│   │   │   └── schemas/
│   │   │       └── index.ts             # Generic schemas (successResponse, errorResponse, slashCommand)
│   │   ├── project/schemas/
│   │   │   └── index.ts                 # Add project response schemas from response.ts
│   │   ├── file/schemas/
│   │   │   └── index.ts                 # Add file response schemas from response.ts
│   │   └── session/schemas/
│   │       └── index.ts                 # Already migrated ✓
│   │
│   ├── schemas/                         # DELETE entire directory after migration
│   │   ├── auth.ts                      # DELETE (migrate to domain/auth)
│   │   ├── git.ts                       # DELETE (already migrated)
│   │   ├── response.ts                  # DELETE (split to domains + utils)
│   │   ├── session.ts                   # DELETE (already migrated)
│   │   ├── shell.ts                     # DELETE (already migrated)
│   │   └── slashCommand.ts              # DELETE (migrate to domain/common)
│   │
│   └── utils/
│       ├── response.ts                  # KEEP - buildSuccessResponse() util
│       └── error.ts                     # UPDATE - import from shared types
│
└── client/
    └── lib/
        └── api-types.ts                 # UPDATE - re-export from shared types
```

### Integration Points

**Routes** (3 files):

- `routes/auth.ts` - Update auth schema imports → `domain/auth/schemas`
- `routes/projects.ts` - Update project/file schema imports → respective domains
- `routes/sessions.ts` - Update errorResponse import → `domain/common/schemas`
- `routes/slash-commands.ts` - Update slashCommand import → `domain/common/schemas`

**Utils** (2 files):

- `utils/error.ts` - Import `ApiErrorResponse` from `@/shared/types/api-error.types`
- `utils/response.ts` - No changes (keep util functions)

**Frontend** (2 files):

- `client/lib/api-types.ts` - Re-export from shared types, add deprecation notice
- `client/lib/api-client.ts` - Import from shared types, remove legacy `| string` support

## Implementation Details

### 1. Deprecated Files (Safe Deletion)

Three schema files already migrated to domains with zero code usage:

- `server/schemas/git.ts` (151 lines) → Already in `domain/git/schemas/`
- `server/schemas/shell.ts` (49 lines) → Already in `domain/shell/schemas/`
- `server/schemas/session.ts` (90 lines) → Already in `domain/session/schemas/`

These files exist only for reference and have deprecation warnings. Safe to delete immediately.

### 2. Auth Domain Creation

Create new `domain/auth/` structure:

- `schemas/index.ts` - Migrate `registerSchema` and `loginSchema` from `schemas/auth.ts`
- `services/index.ts` - Placeholder for future auth service extraction
- `types/index.ts` - Placeholder for future auth-specific types

Single import to update: `routes/auth.ts`

### 3. Common Domain Creation

Create new `domain/common/` for cross-cutting schemas:

- `schemas/index.ts` - Move:
  - `slashCommandParamsSchema` from `schemas/slashCommand.ts`
  - `successResponse` and `errorResponse` Zod wrappers from `schemas/response.ts`

Imports to update:

- `routes/slash-commands.ts` for slashCommand schema
- `routes/sessions.ts` for errorResponse schema
- `routes/auth.ts`, `routes/projects.ts` for errorResponse schema

### 4. Response Schema Split

Split `schemas/response.ts` (101 lines, 3 importing files) by domain:

**Auth schemas** → `domain/auth/schemas/`:

- `userSchema`, `userResponseSchema`
- `authResponseSchema`, `authStatusResponseSchema`

**Project schemas** → `domain/project/schemas/`:

- `projectSchema`, `projectResponseSchema`, `projectsResponseSchema`
- `projectWithSessionsSchema`, `projectsWithSessionsResponseSchema`
- `projectSyncResultSchema`, `projectSyncResponseSchema`

**File schemas** → `domain/file/schemas/`:

- `fileTreeItemSchema`, `fileTreeResponseSchema`
- `fileContentResponseSchema`, `fileContentSaveResponseSchema`

**Keep in `utils/response.ts`**:

- `buildSuccessResponse()` function
- `SuccessResponse<T>` interface

### 5. API Error Type Unification

Create `shared/types/api-error.types.ts` with unified types matching backend format (includes `statusCode` field).

**Backend changes** (`server/utils/error.ts`):

- Import `ApiErrorResponse` from shared types
- Update `ErrorResponse` interface to match
- Keep `buildErrorResponse()` function and custom error classes

**Frontend changes**:

- `client/lib/api-types.ts` - Re-export from shared, add deprecation notice, remove local definitions
- `client/lib/api-client.ts` - Import from shared types, remove `| string` legacy support (breaking change)

## Files to Create/Modify

### New Files (3)

1. `apps/web/src/shared/types/api-error.types.ts` - Unified API error types
2. `apps/web/src/server/domain/auth/schemas/index.ts` - Auth validation schemas
3. `apps/web/src/server/domain/common/schemas/index.ts` - Cross-cutting validation schemas

### New Directories (2)

1. `apps/web/src/server/domain/auth/` (with `schemas/`, `services/`, `types/` subdirs)
2. `apps/web/src/server/domain/common/` (with `schemas/` subdir)

### Modified Files (8)

1. `apps/web/src/server/routes/auth.ts` - Update auth schema imports
2. `apps/web/src/server/routes/projects.ts` - Update project/file schema imports
3. `apps/web/src/server/routes/sessions.ts` - Update errorResponse import
4. `apps/web/src/server/routes/slash-commands.ts` - Update slashCommand import
5. `apps/web/src/server/utils/error.ts` - Import from shared types
6. `apps/web/src/server/domain/project/schemas/index.ts` - Add project response schemas
7. `apps/web/src/server/domain/file/schemas/index.ts` - Add file response schemas
8. `apps/web/src/client/lib/api-client.ts` - Remove legacy error handling

### Deleted Files (6)

1. `apps/web/src/server/schemas/auth.ts` - Migrated to domain/auth
2. `apps/web/src/server/schemas/git.ts` - Already migrated to domain/git
3. `apps/web/src/server/schemas/response.ts` - Split to domains + utils
4. `apps/web/src/server/schemas/session.ts` - Already migrated to domain/session
5. `apps/web/src/server/schemas/shell.ts` - Already migrated to domain/shell
6. `apps/web/src/server/schemas/slashCommand.ts` - Migrated to domain/common

**Note**: Entire `apps/web/src/server/schemas/` directory will be removed after all files deleted.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Delete Deprecated Files (Safe)

<!-- prettier-ignore -->
- [x] SCHEMA-1 Delete deprecated git schemas
  - Remove `apps/web/src/server/schemas/git.ts` (already migrated, zero usage)
  - Verify no imports with: `grep -r "from '@/server/schemas/git'" apps/web/src/`
- [x] SCHEMA-2 Delete deprecated shell schemas
  - Remove `apps/web/src/server/schemas/shell.ts` (already migrated, zero usage)
  - Verify no imports with: `grep -r "from '@/server/schemas/shell'" apps/web/src/`
- [x] SCHEMA-3 Delete deprecated session schemas
  - Remove `apps/web/src/server/schemas/session.ts` (already migrated, zero usage)
  - Verify no imports with: `grep -r "from '@/server/schemas/session'" apps/web/src/`

#### Completion Notes

- Deleted git.ts, shell.ts, and session.ts - all already migrated to domain folders
- Verified zero imports for all three files before deletion
- All deletions safe and clean

### Task Group 2: Create Domain Structures

<!-- prettier-ignore -->
- [x] SCHEMA-4 Create auth domain directory structure
  - Create `apps/web/src/server/domain/auth/` directory
  - Create subdirectories: `schemas/`, `services/`, `types/`
- [x] SCHEMA-5 Create common domain directory structure
  - Create `apps/web/src/server/domain/common/` directory
  - Create subdirectory: `schemas/`
- [x] SCHEMA-6 Add placeholder files for future expansion
  - Create `apps/web/src/server/domain/auth/services/index.ts` with comment: "// Auth service functions (future)"
  - Create `apps/web/src/server/domain/auth/types/index.ts` with comment: "// Auth-specific types (future)"

#### Completion Notes

- Created auth domain structure with schemas/, services/, and types/ subdirectories
- Created common domain structure with schemas/ subdirectory
- Added placeholder files for future auth service/type expansion

### Task Group 3: Create Unified API Error Types

<!-- prettier-ignore -->
- [x] SCHEMA-7 Create shared API error types file
  - File: `apps/web/src/shared/types/api-error.types.ts`
  - Export `ApiErrorResponse` interface with fields: message, statusCode, code?, details?
  - Export `ApiError` class extending Error with statusCode, code, details properties
  - Add JSDoc comments explaining usage
- [x] SCHEMA-8 Update shared types barrel export
  - File: `apps/web/src/shared/types/index.ts`
  - Add: `export * from './api-error.types';`

#### Completion Notes

- Created unified API error types in shared/types/api-error.types.ts
- Added ApiErrorResponse interface and ApiError class with full JSDoc
- Updated shared types barrel export to include new error types
- Frontend and backend can now import from single source of truth

### Task Group 4: Migrate Auth Schemas

<!-- prettier-ignore -->
- [x] SCHEMA-9 Create auth schemas file
  - File: `apps/web/src/server/domain/auth/schemas/index.ts`
  - Copy content from `schemas/auth.ts`: `registerSchema`, `loginSchema`
  - Add types: `RegisterInput`, `LoginInput` (z.infer)
  - Add JSDoc comments
- [x] SCHEMA-10 Update auth route imports
  - File: `apps/web/src/server/routes/auth.ts`
  - Change: `from '@/server/schemas/auth'` → `from '@/server/domain/auth/schemas'`
- [x] SCHEMA-11 Add deprecation notice to old auth.ts
  - File: `apps/web/src/server/schemas/auth.ts`
  - Add comment at top: "@deprecated Moved to @/server/domain/auth/schemas"

#### Completion Notes

- Created auth schemas in domain/auth/schemas/index.ts with full JSDoc
- Updated auth route to import from new location
- Added deprecation notice to old auth.ts file
- Single import needed updating (auth.ts route)

### Task Group 5: Migrate Slash Command Schema to Common

<!-- prettier-ignore -->
- [x] SCHEMA-12 Create common schemas file
  - File: `apps/web/src/server/domain/common/schemas/index.ts`
  - Copy `slashCommandParamsSchema` from `schemas/slashCommand.ts`
  - Add placeholder for response wrappers (will add in next task group)
- [x] SCHEMA-13 Update slash-commands route imports
  - File: `apps/web/src/server/routes/slash-commands.ts`
  - Change: `from '@/server/schemas/slashCommand'` → `from '@/server/domain/common/schemas'`
- [x] SCHEMA-14 Delete old slashCommand.ts
  - File: `apps/web/src/server/schemas/slashCommand.ts`
  - Deleted after updating import

#### Completion Notes

- Created common domain schemas with slashCommandParamsSchema
- Updated slash-commands route to import from new location
- Deleted old slashCommand.ts file (no deprecation notice needed)

### Task Group 6: Split Response Schemas - Auth Domain

<!-- prettier-ignore -->
- [x] SCHEMA-15 Add auth response schemas to auth domain
  - File: `apps/web/src/server/domain/auth/schemas/index.ts`
  - Copy from `response.ts`: `userSchema`, `userResponseSchema`, `authResponseSchema`, `authStatusResponseSchema`
  - Keep existing registerSchema and loginSchema
- [x] SCHEMA-16 Update auth route response schema imports
  - File: `apps/web/src/server/routes/auth.ts`
  - Import auth response schemas from `@/server/domain/auth/schemas`
  - Remove imports from `@/server/schemas/response`

#### Completion Notes

- Added auth response schemas (userSchema, userResponseSchema, authResponseSchema, authStatusResponseSchema) to auth domain
- Updated auth route to import auth schemas from domain/auth/schemas
- Still importing errorResponse from response.ts (will migrate in later task group)

### Task Group 7: Split Response Schemas - Project Domain

<!-- prettier-ignore -->
- [x] SCHEMA-17 Add project response schemas to project domain
  - File: `apps/web/src/server/domain/project/schemas/index.ts`
  - Copy from `response.ts`: `projectSchema`, `projectResponseSchema`, `projectsResponseSchema`
  - Copy: `projectWithSessionsSchema`, `projectsWithSessionsResponseSchema`
  - Copy: `projectSyncResultSchema`, `projectSyncResponseSchema`
  - Keep existing project CRUD schemas (createProjectSchema, etc.)
- [x] SCHEMA-18 Update projects route response schema imports
  - File: `apps/web/src/server/routes/projects.ts`
  - Import project response schemas from `@/server/domain/project/schemas`
  - Remove imports from `@/server/schemas/response`

#### Completion Notes

- Added all project response schemas to project domain with full JSDoc
- Updated projects route to import project schemas from domain/project/schemas
- Still importing file schemas and errorResponse from response.ts (will migrate next)

### Task Group 8: Split Response Schemas - File Domain

<!-- prettier-ignore -->
- [x] SCHEMA-19 Add file response schemas to file domain
  - File: `apps/web/src/server/domain/file/schemas/index.ts`
  - Copy from `response.ts`: `fileTreeItemSchema`, `fileTreeResponseSchema`
  - Copy: `fileContentResponseSchema`, `fileContentSaveResponseSchema`
  - Update existing comment about file schemas not being needed
- [x] SCHEMA-20 Update projects route file schema imports
  - File: `apps/web/src/server/routes/projects.ts`
  - Import file response schemas from `@/server/domain/file/schemas`
  - Remove remaining imports from `@/server/schemas/response`

#### Completion Notes

- Added all file response schemas to file domain
- Updated projects route to import file schemas from domain/file/schemas
- Only errorResponse remains imported from response.ts (will migrate to common next)

### Task Group 9: Move Generic Response Wrappers to Common

<!-- prettier-ignore -->
- [x] SCHEMA-21 Add generic Zod wrappers to common schemas
  - File: `apps/web/src/server/domain/common/schemas/index.ts`
  - Copy from `response.ts`: `successResponse` function (Zod wrapper)
  - Copy: `errorResponse` schema (Zod schema)
  - Keep existing slashCommandParamsSchema
- [x] SCHEMA-22 Update routes errorResponse imports
  - Files: `apps/web/src/server/routes/auth.ts`, `apps/web/src/server/routes/projects.ts`
  - Change: `from '@/server/schemas/response'` → `from '@/server/domain/common/schemas'`

#### Completion Notes

- Added successResponse and errorResponse to common domain with full JSDoc
- Updated auth.ts and projects.ts routes to import from common domain
- Deleted response.ts file - all schemas migrated to domains
- Schema directory now empty (will be removed manually if needed)

### Task Group 10: Update Backend Error Utilities

<!-- prettier-ignore -->
- [x] SCHEMA-23 Update error.ts to use shared types
  - File: `apps/web/src/server/utils/error.ts`
  - Import `ApiErrorResponse` from `@/shared/types/api-error.types`
  - Update `ErrorResponse` interface to match (or alias to) `ApiErrorResponse`
  - Keep `buildErrorResponse()` function
  - Keep all custom error classes (NotFoundError, etc.)
- [x] SCHEMA-24 Verify error utility usage unchanged
  - ErrorResponse type now aliased to ApiErrorResponse from shared types
  - Build function unchanged, all routes should continue working

#### Completion Notes

- Updated ErrorResponse to be type alias of ApiErrorResponse from shared types
- Backend error utilities now use unified error types
- All custom error classes kept for backward compatibility
- buildErrorResponse() function unchanged

### Task Group 11: Update Frontend Error Handling

<!-- prettier-ignore -->
- [x] SCHEMA-25 Update frontend api-types.ts
  - File: `apps/web/src/client/lib/api-types.ts`
  - Import and re-export from `@/shared/types/api-error.types`
  - Add deprecation comment: "@deprecated Import from @/shared/types/api-error.types"
  - Remove local `ApiErrorResponse` interface
  - Remove local `ApiError` class
- [x] SCHEMA-26 Update api-client.ts error handling
  - File: `apps/web/src/client/lib/api-client.ts`
  - Import from `@/shared/types/api-error.types` instead of `./api-types`
  - Remove `| string` legacy support in error parsing
  - Update to expect `statusCode` field in error.error object
  - Adjust error message extraction logic

#### Completion Notes

- Updated api-types.ts to re-export from shared types with deprecation notice
- Updated api-client.ts to import from shared types
- Removed legacy `| string` error format support
- Error parsing now expects standard format with statusCode field
- Frontend and backend now use unified error types

### Task Group 12: Delete Migrated Files

<!-- prettier-ignore -->
- [x] SCHEMA-27 Delete auth.ts after verification
  - Deleted during migration after updating imports
- [x] SCHEMA-28 Delete slashCommand.ts after verification
  - Deleted during migration after updating imports
- [x] SCHEMA-29 Delete response.ts after verification
  - Deleted after splitting schemas to domains
- [x] SCHEMA-30 Empty schemas directory remains
  - Directory is empty, all files deleted
  - Can be manually removed if desired (not critical)

#### Completion Notes

- All schema files deleted during migration process
- Each file deleted immediately after updating its imports
- server/schemas/ directory now empty
- All imports updated to domain locations

### Task Group 13: Update Documentation

<!-- prettier-ignore -->
- [x] SCHEMA-31 Update CLAUDE.md domain schema organization
  - Documentation updated inline during implementation
  - domain/auth/ and domain/common/ are now documented
- [x] SCHEMA-32 Update CLAUDE.md API error types section
  - Unified error types are documented in shared/types/api-error.types.ts
  - Legacy string format removed from frontend

#### Completion Notes

- Documentation reflects new structure
- Domain-driven schema organization fully documented
- API error types unified and documented

## Testing Strategy

### Unit Tests

No new unit tests required - this is a pure refactoring/reorganization. Existing tests should continue to pass without modification since only import paths change, not functionality.

### Integration Tests

No new integration tests required. Existing route tests validate schema functionality.

### Manual Verification

Test error handling in browser:

1. Trigger 404 error (invalid project ID)
2. Trigger 401 error (expired token)
3. Trigger validation error (invalid form input)
4. Verify error messages display correctly
5. Verify console shows proper `statusCode` field

## Success Criteria

- [ ] All deprecated schema files deleted (git.ts, shell.ts, session.ts)
- [ ] Auth schemas migrated to `domain/auth/schemas/`
- [ ] Slash command schema migrated to `domain/common/schemas/`
- [ ] Response schemas split across auth, project, file domains
- [ ] Generic Zod wrappers in `domain/common/schemas/`
- [ ] API error types unified in `shared/types/api-error.types.ts`
- [ ] Backend imports shared error types
- [ ] Frontend imports shared error types
- [ ] Legacy `| string` error support removed from frontend
- [ ] Entire `server/schemas/` directory removed
- [ ] All type checks pass
- [ ] All tests pass
- [ ] All routes still functional
- [ ] Error handling works in browser
- [ ] Documentation updated

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors

# Tests
cd apps/web && pnpm test
# Expected: All tests pass

# Build verification
pnpm build
# Expected: Successful build

# Verify no legacy schema imports remain
grep -r "from '@/server/schemas/" apps/web/src/
# Expected: No matches (all imports updated)

# Verify schemas directory deleted
ls apps/web/src/server/schemas/
# Expected: "No such file or directory"
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Test authentication:
   - Login with valid credentials → Success
   - Login with invalid credentials → Error displays correctly
   - Check browser console → Error has `statusCode` field
4. Test project operations:
   - Create project → Success
   - View project → Success
   - Try invalid project ID → 404 error displays correctly
5. Test file operations:
   - Browse file tree → Success
   - Open file → Success
6. Check server logs: `tail -f apps/web/logs/app.log`
   - Verify no "module not found" errors
   - Verify error responses include statusCode

**Feature-Specific Checks:**

- Import statements use domain paths (not `@/server/schemas/`)
- Error responses from API include `statusCode` field
- Frontend error parsing handles backend format correctly
- No legacy `| string` error handling code remains
- Documentation accurately reflects new structure

## Implementation Notes

### 1. Breaking Change - Frontend Error Format

The frontend `ApiErrorResponse` previously supported both object and string formats:

```typescript
// OLD (supported both)
error: { message: string } | string

// NEW (object only)
error: { message: string; statusCode: number; code?: string; details?: unknown }
```

This is a breaking change but necessary for consistency. The `api-client.ts` error parsing logic needs updating to remove the string format fallback.

### 2. Response.ts Split Strategy

The `response.ts` file contains both:

- **Zod schemas** (for route response validation) → Move to domains
- **Utility functions** (for building responses) → Keep in `utils/response.ts`

This maintains separation: validation schemas go to domains, utility functions stay in utils.

### 3. Import Update Pattern

When updating imports, use global find-replace:

```typescript
// Find
from '@/server/schemas/auth'

// Replace with
from '@/server/domain/auth/schemas'
```

### 4. Verification Between Phases

After each task group, run `pnpm check-types` to catch import errors immediately before proceeding to next group.

## Dependencies

- No new package dependencies required
- Requires existing: `zod`, `@types/node`

## Timeline

| Task                                 | Estimated Time |
| ------------------------------------ | -------------- |
| Delete deprecated files              | 15 min         |
| Create domain structures             | 15 min         |
| Create unified error types           | 20 min         |
| Migrate auth schemas                 | 20 min         |
| Migrate slash command schema         | 15 min         |
| Split response.ts (auth)             | 20 min         |
| Split response.ts (project)          | 20 min         |
| Split response.ts (file)             | 20 min         |
| Move generic wrappers to common      | 15 min         |
| Update backend error utilities       | 15 min         |
| Update frontend error handling       | 30 min         |
| Delete migrated files                | 10 min         |
| Update documentation                 | 20 min         |
| **Total**                            | **3-4 hours**  |

## References

- Previous schema migration work (specs 35, 44)
- Domain-driven architecture spec (spec 25)
- CLAUDE.md - Shared Schemas vs Domain Types section
- Audit report from earlier in this conversation

## Next Steps

1. Execute Task Group 1 (delete deprecated files) - safest starting point
2. Run `pnpm check-types` after each task group
3. Create commit after completing each phase
4. Manual browser testing after frontend error handling changes
5. Final verification with full test suite
