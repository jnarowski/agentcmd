# Refactor Service API - Universal Object Arguments Pattern

**Status**: draft
**Created**: 2025-11-05
**Package**: apps/web
**Estimated Effort**: 12-16 hours

## Overview

Standardize all service function signatures to use a universal object arguments pattern, removing inconsistencies and improving developer experience. Every service function will accept exactly one parameter - an options object - with specific patterns for CRUD operations vs actions. This refactor touches 70 service functions across 6 domains and ~150 call sites.

## User Story

As a developer working on the backend
I want consistent service function signatures across all domains
So that I can write predictable code without remembering different patterns for each function

## Technical Approach

Implement a zero-exception universal pattern where every function takes a single options object. Differentiate between entity CRUD operations (which use `{ data }` or `{ id, data }` wrappers) and action/operation functions (which use flat parameters). Remove all logger parameters and toggle helper functions. Co-locate TypeScript types with Zod schemas for runtime validation.

## Key Design Decisions

1. **Universal Object Pattern**: Every function takes exactly one parameter (an options object) - zero exceptions for consistency
2. **CRUD vs Actions**: Entity CRUD uses `{ data }` wrapper for creates and `{ id, data }` for updates; actions use flat parameters
3. **Remove Toggle Helpers**: Delete `toggleProjectStarred` and `toggleProjectHidden` - use `updateProject` directly
4. **Co-located Types**: Zod schema + TypeScript type in same file, single source of truth via `z.infer`
5. **Remove Logger DI**: Delete all `logger?: FastifyBaseLogger` parameters - logging moves to route/handler layer
6. **Query Modifiers vs Filters**: Use flat options for query modifiers (includes, pagination), wrap actual WHERE filters in `{ filters }`

## Architecture

### File Structure

```
apps/web/src/server/domain/
├── file/
│   ├── services/
│   │   ├── readFile.ts
│   │   ├── writeFile.ts
│   │   └── getFileTree.ts
│   ├── types/
│   │   ├── ReadFileOptions.ts        # NEW: Zod + TS type
│   │   ├── WriteFileOptions.ts       # NEW
│   │   ├── GetFileTreeOptions.ts     # NEW
│   │   └── index.ts                  # NEW: re-exports
│   └── index.ts                      # UPDATED: export types
├── shell/
│   ├── services/ (14 functions)
│   ├── types/ (14 new option types)   # NEW
│   └── index.ts
├── project/
│   ├── services/ (12 functions)
│   ├── types/ (12 new option types)   # NEW
│   └── index.ts
├── git/
│   ├── services/ (28 functions)
│   ├── types/ (28 new option types)   # NEW
│   └── index.ts
├── session/
│   ├── services/ (17 functions)
│   ├── types/ (17 new option types)   # NEW
│   └── index.ts
└── workflow/
    ├── services/ (30+ functions)
    ├── types/ (30+ new option types)  # NEW
    └── index.ts
```

### Integration Points

**Route Handlers** (`server/routes/*.ts`):
- All service calls updated to use object arguments
- Zod schemas imported for request validation
- Logger calls moved from services to routes

**WebSocket Handlers** (`server/websocket/handlers/*.ts`):
- Service calls updated to object arguments
- Event broadcasting logic updated

**Service-to-Service Calls**:
- Internal service calls updated throughout

**Tests** (`**/*.test.ts`):
- Mock signatures updated
- Test calls updated to object pattern

## Implementation Details

### 1. Pattern Rules (Final)

**Entity CRUD Operations:**
- **CREATE**: `createEntity({ data: { field1, field2 } })`
- **UPDATE**: `updateEntity({ id, data: { field1?, field2? } })`
- **DELETE**: `deleteEntity({ id })`
- **READ by ID**: `getEntityById({ id })`
- **READ list (query modifiers)**: `getAllEntities({ includeSessions?, limit? })` - FLAT
- **READ list (WHERE filters)**: `getEntities({ filters: { status?, projectId? } })`

**Actions/Operations:**
- Flat parameters: `commitChanges({ projectPath, message, files })`
- No `{ data }` wrapper

**Specialized Updates:**
- Use `{ id, data }` pattern: `updateSessionName({ id, data: { name } })`

**Logger Removal:**
- Remove all `logger?: FastifyBaseLogger` parameters
- Move logging to route/handler boundaries

### 2. Type Definition Pattern

Each service function gets a co-located type file:

```typescript
// domain/{domain}/types/{FunctionName}Options.ts
import { z } from 'zod'

// Zod schema (runtime validation)
export const createProjectOptionsSchema = z.object({
  data: z.object({
    name: z.string().min(1, 'Name required'),
    path: z.string().min(1, 'Path required'),
    userId: z.string().uuid().optional()
  })
})

// TypeScript type (compile-time) - single source of truth
export type CreateProjectOptions = z.infer<typeof createProjectOptionsSchema>
```

### 3. Service Function Transformation

**Before:**
```typescript
export async function createSession(
  projectId: string,
  userId: string,
  sessionId: string,
  agent: AgentType = 'claude',
  name?: string,
  metadata?: Record<string, unknown>
): Promise<SessionResponse> {
  // implementation
}
```

**After:**
```typescript
import type { CreateSessionOptions } from '../types/CreateSessionOptions'

export async function createSession({
  data
}: CreateSessionOptions): Promise<SessionResponse> {
  const { projectId, userId, sessionId, agent = 'claude', name, metadata } = data
  // implementation
}
```

### 4. Route Handler Updates

**Before:**
```typescript
fastify.post('/api/sessions', async (request, reply) => {
  const session = await createSession(
    body.projectId,
    userId,
    sessionId,
    'claude',
    undefined,
    body.metadata
  )
  return reply.send({ data: session })
})
```

**After:**
```typescript
import { createSessionOptionsSchema } from '@/server/domain/session/types/CreateSessionOptions'

fastify.post('/api/sessions', {
  schema: {
    body: createSessionOptionsSchema
  }
}, async (request, reply) => {
  request.log.info({ projectId: request.body.data.projectId }, 'Creating session')

  const session = await createSession(request.body)

  return reply.send({ data: session })
})
```

## Files to Create/Modify

### New Files (~84)

**File Domain Types (3):**
1. `apps/web/src/server/domain/file/types/ReadFileOptions.ts`
2. `apps/web/src/server/domain/file/types/WriteFileOptions.ts`
3. `apps/web/src/server/domain/file/types/GetFileTreeOptions.ts`
4. `apps/web/src/server/domain/file/types/index.ts`

**Shell Domain Types (14):**
5. `apps/web/src/server/domain/shell/types/CreateShellSessionOptions.ts`
6. `apps/web/src/server/domain/shell/types/DestroyShellSessionOptions.ts`
7. `apps/web/src/server/domain/shell/types/GetShellSessionOptions.ts`
8. `apps/web/src/server/domain/shell/types/SetShellSessionOptions.ts`
9. `apps/web/src/server/domain/shell/types/RemoveShellSessionOptions.ts`
10. `apps/web/src/server/domain/shell/types/GetUserSessionsOptions.ts`
11. `apps/web/src/server/domain/shell/types/WriteToShellOptions.ts`
12. `apps/web/src/server/domain/shell/types/ResizeShellOptions.ts`
13. `apps/web/src/server/domain/shell/types/CleanupShellSessionOptions.ts`
14. `apps/web/src/server/domain/shell/types/CleanupUserSessionsOptions.ts`
15. `apps/web/src/server/domain/shell/types/index.ts`

**Project Domain Types (12):**
16. `apps/web/src/server/domain/project/types/GetProjectByIdOptions.ts`
17. `apps/web/src/server/domain/project/types/GetProjectByPathOptions.ts`
18. `apps/web/src/server/domain/project/types/GetAllProjectsOptions.ts`
19. `apps/web/src/server/domain/project/types/CreateProjectOptions.ts`
20. `apps/web/src/server/domain/project/types/UpdateProjectOptions.ts`
21. `apps/web/src/server/domain/project/types/DeleteProjectOptions.ts`
22. `apps/web/src/server/domain/project/types/CreateOrUpdateProjectOptions.ts`
23. `apps/web/src/server/domain/project/types/ProjectExistsByPathOptions.ts`
24. `apps/web/src/server/domain/project/types/HasEnoughSessionsOptions.ts`
25. `apps/web/src/server/domain/project/types/SyncFromClaudeProjectsOptions.ts`
26. `apps/web/src/server/domain/project/types/GetProjectSlashCommandsOptions.ts`
27. `apps/web/src/server/domain/project/types/index.ts`

**Git Domain Types (28):**
28-55. One type file per git service function (getCurrentBranch, getBranches, switchBranch, etc.)
56. `apps/web/src/server/domain/git/types/index.ts`

**Session Domain Types (17):**
57-73. One type file per session service function (createSession, updateSession, etc.)
74. `apps/web/src/server/domain/session/types/index.ts`

**Workflow Domain Types (estimated 30+):**
75-84+. One type file per workflow service function

### Files to Delete (2)

1. `apps/web/src/server/domain/project/services/toggleProjectStarred.ts`
2. `apps/web/src/server/domain/project/services/toggleProjectHidden.ts`

### Modified Files (~160+)

**Service Functions (70):**
- All 3 file domain services
- All 14 shell domain services
- All 12 project domain services (minus 2 deleted)
- All 28 git domain services
- All 17 session domain services
- All 30+ workflow domain services

**Route Handlers (~50):**
- `apps/web/src/server/routes/files.ts`
- `apps/web/src/server/routes/projects.ts`
- `apps/web/src/server/routes/git.ts`
- `apps/web/src/server/routes/sessions.ts`
- `apps/web/src/server/routes/workflow.ts`
- Other route files using services

**WebSocket Handlers (~10):**
- `apps/web/src/server/websocket/handlers/executeAgent.ts`
- `apps/web/src/server/websocket/handlers/cancelSession.ts`
- Other WebSocket handlers using services

**Domain Index Files (6):**
- `apps/web/src/server/domain/file/index.ts` - export types
- `apps/web/src/server/domain/shell/index.ts` - export types
- `apps/web/src/server/domain/project/index.ts` - export types
- `apps/web/src/server/domain/git/index.ts` - export types
- `apps/web/src/server/domain/session/index.ts` - export types
- `apps/web/src/server/domain/workflow/index.ts` - export types

**Tests (~30+):**
- All test files that mock or call service functions

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Preparation & Toggle Removal

<!-- prettier-ignore -->
- [ ] prep-01: Create `.agent/specs/todo/54-refactor-service-api-spec.md` spec file
  - This spec outlines the complete refactoring plan
- [ ] prep-02: Delete toggle helper functions
  - Delete: `apps/web/src/server/domain/project/services/toggleProjectStarred.ts`
  - Delete: `apps/web/src/server/domain/project/services/toggleProjectHidden.ts`
- [ ] prep-03: Update toggle helper call sites to use updateProject
  - Find all calls to `toggleProjectStarred` and `toggleProjectHidden`
  - Replace with: `updateProject({ id, data: { is_starred: true/false } })`
  - Update route handlers, WebSocket handlers
- [ ] prep-04: Run type check to identify all affected call sites
  - Command: `cd apps/web && pnpm check-types`
  - Expected: Type errors showing all places that need updates

#### Completion Notes

(To be filled in after completion)

### Task Group 2: Create Type Definitions - File Domain

<!-- prettier-ignore -->
- [ ] types-file-01: Create ReadFileOptions type
  - File: `apps/web/src/server/domain/file/types/ReadFileOptions.ts`
  - Schema: `{ projectId: string, filePath: string }`
  - Include Zod schema + TypeScript type
- [ ] types-file-02: Create WriteFileOptions type
  - File: `apps/web/src/server/domain/file/types/WriteFileOptions.ts`
  - Schema: `{ projectId: string, filePath: string, content: string }`
- [ ] types-file-03: Create GetFileTreeOptions type
  - File: `apps/web/src/server/domain/file/types/GetFileTreeOptions.ts`
  - Schema: `{ projectId: string }`
- [ ] types-file-04: Create file domain types index
  - File: `apps/web/src/server/domain/file/types/index.ts`
  - Re-export all schemas and types

#### Completion Notes

(To be filled in after completion)

### Task Group 3: Create Type Definitions - Shell Domain

<!-- prettier-ignore -->
- [ ] types-shell-01: Create CreateShellSessionOptions type
  - File: `apps/web/src/server/domain/shell/types/CreateShellSessionOptions.ts`
  - Schema: `{ projectId: string, userId: string, cols: number, rows: number }`
- [ ] types-shell-02: Create DestroyShellSessionOptions type
  - File: `apps/web/src/server/domain/shell/types/DestroyShellSessionOptions.ts`
  - Schema: `{ sessionId: string }`
- [ ] types-shell-03: Create GetShellSessionOptions type
  - File: `apps/web/src/server/domain/shell/types/GetShellSessionOptions.ts`
  - Schema: `{ sessionId: string }`
- [ ] types-shell-04: Create SetShellSessionOptions type
  - File: `apps/web/src/server/domain/shell/types/SetShellSessionOptions.ts`
  - Schema: `{ sessionId: string, session: ShellSession }`
- [ ] types-shell-05: Create RemoveShellSessionOptions type
  - File: `apps/web/src/server/domain/shell/types/RemoveShellSessionOptions.ts`
  - Schema: `{ sessionId: string }`
- [ ] types-shell-06: Create GetUserSessionsOptions type
  - File: `apps/web/src/server/domain/shell/types/GetUserSessionsOptions.ts`
  - Schema: `{ userId: string }`
- [ ] types-shell-07: Create WriteToShellOptions type
  - File: `apps/web/src/server/domain/shell/types/WriteToShellOptions.ts`
  - Schema: `{ ptyProcess: pty.IPty, data: string }`
- [ ] types-shell-08: Create ResizeShellOptions type
  - File: `apps/web/src/server/domain/shell/types/ResizeShellOptions.ts`
  - Schema: `{ ptyProcess: pty.IPty, cols: number, rows: number }`
- [ ] types-shell-09: Create CleanupShellSessionOptions type
  - File: `apps/web/src/server/domain/shell/types/CleanupShellSessionOptions.ts`
  - Schema: `{ ptyProcess: pty.IPty, sessionId: string }`
- [ ] types-shell-10: Create CleanupUserSessionsOptions type
  - File: `apps/web/src/server/domain/shell/types/CleanupUserSessionsOptions.ts`
  - Schema: `{ userId: string }`
- [ ] types-shell-11: Create shell domain types index
  - File: `apps/web/src/server/domain/shell/types/index.ts`
  - Re-export all schemas and types

#### Completion Notes

(To be filled in after completion)

### Task Group 4: Create Type Definitions - Project Domain

<!-- prettier-ignore -->
- [ ] types-project-01: Create GetProjectByIdOptions type
  - File: `apps/web/src/server/domain/project/types/GetProjectByIdOptions.ts`
  - Schema: `{ id: string }`
- [ ] types-project-02: Create GetProjectByPathOptions type
  - File: `apps/web/src/server/domain/project/types/GetProjectByPathOptions.ts`
  - Schema: `{ path: string }`
- [ ] types-project-03: Create GetAllProjectsOptions type
  - File: `apps/web/src/server/domain/project/types/GetAllProjectsOptions.ts`
  - Schema: `{ includeSessions?: boolean, sessionLimit?: number }` (FLAT, no filters wrapper)
- [ ] types-project-04: Create CreateProjectOptions type
  - File: `apps/web/src/server/domain/project/types/CreateProjectOptions.ts`
  - Schema: `{ data: { name: string, path: string, userId?: string } }`
- [ ] types-project-05: Create UpdateProjectOptions type
  - File: `apps/web/src/server/domain/project/types/UpdateProjectOptions.ts`
  - Schema: `{ id: string, data: { name?: string, path?: string, is_hidden?: boolean, is_starred?: boolean } }`
- [ ] types-project-06: Create DeleteProjectOptions type
  - File: `apps/web/src/server/domain/project/types/DeleteProjectOptions.ts`
  - Schema: `{ id: string }`
- [ ] types-project-07: Create CreateOrUpdateProjectOptions type
  - File: `apps/web/src/server/domain/project/types/CreateOrUpdateProjectOptions.ts`
  - Schema: `{ data: { name: string, path: string } }`
- [ ] types-project-08: Create ProjectExistsByPathOptions type
  - File: `apps/web/src/server/domain/project/types/ProjectExistsByPathOptions.ts`
  - Schema: `{ path: string }`
- [ ] types-project-09: Create HasEnoughSessionsOptions type
  - File: `apps/web/src/server/domain/project/types/HasEnoughSessionsOptions.ts`
  - Schema: `{ projectName: string, minSessions?: number }`
- [ ] types-project-10: Create SyncFromClaudeProjectsOptions type
  - File: `apps/web/src/server/domain/project/types/SyncFromClaudeProjectsOptions.ts`
  - Schema: `{ userId: string }`
- [ ] types-project-11: Create GetProjectSlashCommandsOptions type
  - File: `apps/web/src/server/domain/project/types/GetProjectSlashCommandsOptions.ts`
  - Schema: `{ projectId: string }`
- [ ] types-project-12: Create project domain types index
  - File: `apps/web/src/server/domain/project/types/index.ts`
  - Re-export all schemas and types

#### Completion Notes

(To be filled in after completion)

### Task Group 5: Create Type Definitions - Git Domain (28 types)

<!-- prettier-ignore -->
- [ ] types-git-01: Create all 28 git operation type files
  - Pattern: One file per function following naming convention
  - Examples: GetCurrentBranchOptions, CommitChangesOptions, CreatePullRequestOptions
  - All use flat parameters (no data wrapper - these are actions)
  - Common fields: projectPath (always required)
- [ ] types-git-02: Create git domain types index
  - File: `apps/web/src/server/domain/git/types/index.ts`
  - Re-export all 28 schemas and types

#### Completion Notes

(To be filled in after completion)

### Task Group 6: Create Type Definitions - Session Domain (17 types)

<!-- prettier-ignore -->
- [ ] types-session-01: Create CreateSessionOptions type
  - File: `apps/web/src/server/domain/session/types/CreateSessionOptions.ts`
  - Schema: `{ data: { projectId: string, userId: string, agent: string, name?: string } }`
- [ ] types-session-02: Create UpdateSessionOptions type
  - File: `apps/web/src/server/domain/session/types/UpdateSessionOptions.ts`
  - Schema: `{ id: string, data: { status?, name?, metadata? } }`
- [ ] types-session-03: Create UpdateSessionNameOptions type
  - File: `apps/web/src/server/domain/session/types/UpdateSessionNameOptions.ts`
  - Schema: `{ id: string, data: { name: string } }`
- [ ] types-session-04: Create UpdateSessionMetadataOptions type
  - File: `apps/web/src/server/domain/session/types/UpdateSessionMetadataOptions.ts`
  - Schema: `{ id: string, data: { metadata: Record<string, unknown> } }`
- [ ] types-session-05: Create UpdateSessionStateOptions type
  - File: `apps/web/src/server/domain/session/types/UpdateSessionStateOptions.ts`
  - Schema: `{ id: string, data: { state: 'idle' | 'working' | 'error', error_message?: string } }`
- [ ] types-session-06: Create GetSessionsByProjectOptions type
  - File: `apps/web/src/server/domain/session/types/GetSessionsByProjectOptions.ts`
  - Schema: `{ filters: { projectId: string } }`
- [ ] types-session-07: Create remaining 11 session type files
  - GetSessionMessages, StoreCliSessionId, CancelSession, ParseJSONLFile, etc.
  - Follow action pattern (flat params) or CRUD pattern (data wrapper) as appropriate
- [ ] types-session-08: Create session domain types index
  - File: `apps/web/src/server/domain/session/types/index.ts`
  - Re-export all schemas and types

#### Completion Notes

(To be filled in after completion)

### Task Group 7: Update Service Signatures - File Domain

<!-- prettier-ignore -->
- [ ] service-file-01: Update readFile signature
  - File: `apps/web/src/server/domain/file/services/readFile.ts`
  - Change from: `readFile(projectId: string, filePath: string, logger?: FastifyBaseLogger)`
  - Change to: `readFile({ projectId, filePath }: ReadFileOptions)`
  - Import type from `../types/ReadFileOptions`
  - Remove logger usage inside function
- [ ] service-file-02: Update writeFile signature
  - File: `apps/web/src/server/domain/file/services/writeFile.ts`
  - Change to: `writeFile({ projectId, filePath, content }: WriteFileOptions)`
  - Remove logger parameter
- [ ] service-file-03: Update getFileTree signature
  - File: `apps/web/src/server/domain/file/services/getFileTree.ts`
  - Change to: `getFileTree({ projectId }: GetFileTreeOptions)`
  - Remove logger parameter

#### Completion Notes

(To be filled in after completion)

### Task Group 8: Update Service Signatures - Shell Domain

<!-- prettier-ignore -->
- [ ] service-shell-01: Update createShellSession signature
  - File: `apps/web/src/server/domain/shell/services/createShellSession.ts`
  - Change to: `createShellSession({ projectId, userId, cols, rows }: CreateShellSessionOptions)`
- [ ] service-shell-02: Update all remaining shell service signatures (13 functions)
  - Follow pattern: destructure options object, use typed options
  - Remove all logger parameters
  - Files: destroyShellSession, getShellSession, setShellSession, removeShellSession, getUserSessions, writeToShell, resizeShell, cleanupShellSession, cleanupUserSessions

#### Completion Notes

(To be filled in after completion)

### Task Group 9: Update Service Signatures - Project Domain

<!-- prettier-ignore -->
- [ ] service-project-01: Update getProjectById signature
  - File: `apps/web/src/server/domain/project/services/getProjectById.ts`
  - Change to: `getProjectById({ id }: GetProjectByIdOptions)`
- [ ] service-project-02: Update getAllProjects signature
  - File: `apps/web/src/server/domain/project/services/getAllProjects.ts`
  - Change to: `getAllProjects({ includeSessions, sessionLimit }: GetAllProjectsOptions = {})`
  - Keep flat (no filters wrapper)
- [ ] service-project-03: Update createProject signature
  - File: `apps/web/src/server/domain/project/services/createProject.ts`
  - Change to: `createProject({ data }: CreateProjectOptions)`
  - Destructure: `const { name, path, userId } = data`
- [ ] service-project-04: Update updateProject signature
  - File: `apps/web/src/server/domain/project/services/updateProject.ts`
  - Change to: `updateProject({ id, data }: UpdateProjectOptions)`
- [ ] service-project-05: Update remaining project services (8 functions)
  - Follow CRUD patterns for entity operations
  - Files: deleteProject, createOrUpdateProject, getProjectByPath, projectExistsByPath, hasEnoughSessions, syncFromClaudeProjects, getProjectSlashCommands

#### Completion Notes

(To be filled in after completion)

### Task Group 10: Update Service Signatures - Git Domain

<!-- prettier-ignore -->
- [ ] service-git-01: Update all 28 git service signatures
  - All follow action pattern: flat parameters in options object
  - Every function accepts `{ projectPath, ...otherParams }`
  - Remove any logger parameters (check generateCommitMessage)
  - Files: getCurrentBranch, getBranches, switchBranch, createAndSwitchBranch, getGitStatus, getFileDiff, getCommitDiff, getCommitHistory, getCommitsSinceBase, stageFiles, unstageFiles, commitChanges, generateCommitMessage, discardChanges, stashSave, stashPop, stashApply, stashList, resetToCommit, fetchFromRemote, pullFromRemote, pushToRemote, mergeBranch, createPullRequest, checkGhCliAvailable

#### Completion Notes

(To be filled in after completion)

### Task Group 11: Update Service Signatures - Session Domain

<!-- prettier-ignore -->
- [ ] service-session-01: Update createSession signature
  - File: `apps/web/src/server/domain/session/services/createSession.ts`
  - Change to: `createSession({ data }: CreateSessionOptions)`
  - Destructure: `const { projectId, userId, agent, name } = data`
- [ ] service-session-02: Update updateSession signature
  - File: `apps/web/src/server/domain/session/services/updateSession.ts`
  - Change to: `updateSession({ id, data }: UpdateSessionOptions)`
- [ ] service-session-03: Update specialized update functions
  - updateSessionName: `{ id, data: { name } }`
  - updateSessionMetadata: `{ id, data: { metadata } }`
  - updateSessionState: `{ id, data: { state, error_message? } }`
  - storeCliSessionId: `{ id, data: { cliSessionId, sessionPath } }`
- [ ] service-session-04: Update getSessionsByProject signature
  - File: `apps/web/src/server/domain/session/services/getSessionsByProject.ts`
  - Change to: `getSessionsByProject({ filters }: { filters: { projectId: string } })`
- [ ] service-session-05: Update remaining session services (13 functions)
  - Remove logger parameters from: cancelSession, handleExecutionFailure, cleanupSessionImages, executeAgent
  - Update to options pattern: getSessionMessages, parseJSONLFile, parseExecutionConfig, validateSessionOwnership, validateAgentSupported, syncProjectSessions, generateSessionName, extractUsageFromEvents, processImageUploads

#### Completion Notes

(To be filled in after completion)

### Task Group 12: Update Domain Index Exports

<!-- prettier-ignore -->
- [ ] export-01: Update file domain index
  - File: `apps/web/src/server/domain/file/index.ts`
  - Add: `export * from './types'`
- [ ] export-02: Update shell domain index
  - File: `apps/web/src/server/domain/shell/index.ts`
  - Add: `export * from './types'`
- [ ] export-03: Update project domain index
  - File: `apps/web/src/server/domain/project/index.ts`
  - Add: `export * from './types'`
- [ ] export-04: Update git domain index
  - File: `apps/web/src/server/domain/git/index.ts`
  - Add: `export * from './types'`
- [ ] export-05: Update session domain index
  - File: `apps/web/src/server/domain/session/index.ts`
  - Add: `export * from './types'`

#### Completion Notes

(To be filled in after completion)

### Task Group 13: Update Route Handlers

<!-- prettier-ignore -->
- [ ] routes-01: Update file routes
  - File: `apps/web/src/server/routes/files.ts`
  - Import Zod schemas for validation
  - Update all service calls to object pattern
  - Add logging at route level (replace logger passed to services)
- [ ] routes-02: Update project routes
  - File: `apps/web/src/server/routes/projects.ts`
  - Update all service calls including removed toggle helpers
  - Replace toggle calls with: `updateProject({ id, data: { is_starred/is_hidden } })`
- [ ] routes-03: Update git routes
  - File: `apps/web/src/server/routes/git.ts`
  - Update all 28+ git operation calls
- [ ] routes-04: Update session routes
  - File: `apps/web/src/server/routes/sessions.ts`
  - Update all session operation calls
  - Add Zod validation schemas
- [ ] routes-05: Update remaining route files (~40+ files)
  - Identify all route files calling services via: `grep -r "from '@/server/domain" apps/web/src/server/routes/`
  - Update each file's service calls
  - Add logging at route level
  - Import and use Zod schemas for validation

#### Completion Notes

(To be filled in after completion)

### Task Group 14: Update WebSocket Handlers

<!-- prettier-ignore -->
- [ ] ws-01: Update executeAgent WebSocket handler
  - File: `apps/web/src/server/websocket/handlers/executeAgent.ts`
  - Update executeAgent call to: `executeAgent({ config, socket, userId })`
  - Remove logger parameter
  - Add logging at handler level
- [ ] ws-02: Update cancelSession WebSocket handler
  - File: `apps/web/src/server/websocket/handlers/cancelSession.ts`
  - Update cancelSession call to: `cancelSession({ sessionId, userId })`
- [ ] ws-03: Update remaining WebSocket handlers (~8 files)
  - Identify all WebSocket handlers calling services
  - Update service calls to object pattern
  - Remove logger parameters, add logging at handler level

#### Completion Notes

(To be filled in after completion)

### Task Group 15: Update Tests

<!-- prettier-ignore -->
- [ ] test-01: Update file domain tests
  - Find test files for file services
  - Update mock signatures to match new patterns
  - Update test calls to use object arguments
- [ ] test-02: Update shell domain tests
  - Update mocks and calls for all shell services
- [ ] test-03: Update project domain tests
  - Update mocks for CRUD operations with data wrappers
  - Remove toggle helper tests (or convert to updateProject tests)
- [ ] test-04: Update git domain tests
  - Update all git service test calls
- [ ] test-05: Update session domain tests
  - Update CRUD test patterns with data wrappers
  - Update action test patterns with flat options
- [ ] test-06: Run full test suite
  - Command: `cd apps/web && pnpm test`
  - Expected: All tests pass
  - Fix any remaining test failures

#### Completion Notes

(To be filled in after completion)

### Task Group 16: Final Validation

<!-- prettier-ignore -->
- [ ] validate-01: Run type checking
  - Command: `cd apps/web && pnpm check-types`
  - Expected: No type errors
- [ ] validate-02: Run linting
  - Command: `cd apps/web && pnpm lint`
  - Expected: No lint errors
- [ ] validate-03: Run full test suite
  - Command: `cd apps/web && pnpm test`
  - Expected: All tests pass
- [ ] validate-04: Build verification
  - Command: `cd apps/web && pnpm build`
  - Expected: Successful build with no errors
- [ ] validate-05: Manual smoke test
  - Start dev server: `pnpm dev`
  - Test basic operations: create project, create session, git operations
  - Verify WebSocket operations work
  - Check logs for proper logging at boundaries

#### Completion Notes

(To be filled in after completion)

## Testing Strategy

### Unit Tests

**Service Function Tests:**
- Update all service function tests to use new signatures
- Mock dependencies appropriately
- Test parameter validation via Zod schemas

**Example:**
```typescript
// Before
test('createSession creates session with correct params', async () => {
  const result = await createSession(
    'project-id',
    'user-id',
    'session-id',
    'claude'
  )
  expect(result.projectId).toBe('project-id')
})

// After
test('createSession creates session with correct params', async () => {
  const result = await createSession({
    data: {
      projectId: 'project-id',
      userId: 'user-id',
      sessionId: 'session-id',
      agent: 'claude'
    }
  })
  expect(result.projectId).toBe('project-id')
})
```

### Integration Tests

**Route Handler Tests:**
- Test that routes properly validate requests using Zod schemas
- Test that routes call services with correct object arguments
- Verify logging happens at route level

**Example:**
```typescript
test('POST /api/sessions validates and creates session', async () => {
  const response = await fastify.inject({
    method: 'POST',
    url: '/api/sessions',
    payload: {
      data: {
        projectId: 'test-project',
        userId: 'test-user',
        sessionId: 'test-session',
        agent: 'claude'
      }
    }
  })
  expect(response.statusCode).toBe(200)
})
```

### Manual Tests

**Critical Paths:**
1. Project creation and management
2. Session creation and execution
3. Git operations (commit, branch, PR)
4. File operations (read, write, tree)
5. Shell session management
6. WebSocket agent execution

## Success Criteria

- [ ] All 70 service functions updated to universal object pattern
- [ ] 2 toggle helpers removed, all call sites updated
- [ ] ~70 new type files created with co-located Zod schemas
- [ ] All logger parameters removed from service signatures
- [ ] All route handlers updated with proper validation
- [ ] All WebSocket handlers updated
- [ ] All tests pass with updated signatures
- [ ] Type checking passes with no errors
- [ ] Build succeeds with no errors
- [ ] Linting passes with no errors
- [ ] Manual testing confirms all features work
- [ ] No regression in existing functionality

## Validation

Execute these commands to verify the refactor is complete:

**Automated Verification:**

```bash
# Type checking
cd apps/web && pnpm check-types
# Expected: No type errors

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors (or only style warnings)

# Unit tests
cd apps/web && pnpm test
# Expected: All tests pass

# Build verification
cd apps/web && pnpm build
# Expected: Successful build

# Grep for old patterns (should return no results)
grep -r "logger?: FastifyBaseLogger" apps/web/src/server/domain/*/services/
# Expected: No matches

grep -r "toggleProjectStarred\|toggleProjectHidden" apps/web/src/server/
# Expected: No matches (function deleted)
```

**Manual Verification:**

1. Start dev server: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Test project operations:
   - Create new project
   - Update project name
   - Star/unstar project (verify uses updateProject)
   - Delete project
4. Test session operations:
   - Create new session
   - Execute agent command
   - Cancel running session
   - View session history
5. Test git operations:
   - View git status
   - Stage files
   - Commit changes
   - Create branch
   - Create pull request
6. Test file operations:
   - Read file
   - Write file
   - View file tree
7. Test shell operations:
   - Create shell session
   - Execute commands
   - Resize terminal
8. Check server logs: `tail -f apps/web/logs/app.log`
   - Verify logging happens at route/handler level
   - No logger-related errors
9. Check browser console:
   - No errors or warnings
   - WebSocket connections successful

**Feature-Specific Checks:**

- Verify all API responses have correct structure
- Test error handling with invalid inputs (Zod validation)
- Verify WebSocket events broadcast correctly
- Test concurrent operations (multiple sessions)
- Verify file operations don't corrupt data
- Test git operations don't break repository state

## Implementation Notes

### 1. Logger Migration Strategy

Logging moves from services to route/handler boundaries:

**Before:**
```typescript
// Service
export async function createProject(data: CreateProjectInput, logger?: FastifyBaseLogger) {
  logger?.info({ data }, 'Creating project')
  // ...
}

// Route
const project = await createProject(data, request.log)
```

**After:**
```typescript
// Service (pure business logic)
export async function createProject({ data }: CreateProjectOptions) {
  // ... no logging
}

// Route (owns logging)
request.log.info({ data }, 'Creating project')
const project = await createProject({ data })
request.log.debug({ projectId: project.id }, 'Project created')
```

### 2. Zod Schema Usage

Use Zod schemas at API boundaries for runtime validation:

```typescript
// Type file
export const createProjectOptionsSchema = z.object({
  data: z.object({
    name: z.string().min(1),
    path: z.string().min(1)
  })
})

// Route
fastify.post('/api/projects', {
  schema: {
    body: createProjectOptionsSchema  // Fastify validates
  }
}, async (request, reply) => {
  // request.body is already validated and typed
  const project = await createProject(request.body)
  return reply.send({ data: project })
})
```

### 3. TypeScript Compiler as Guide

After updating service signatures, run type check to find all call sites:

```bash
cd apps/web && pnpm check-types 2>&1 | grep "error TS"
```

TypeScript will show exactly which files need updates and what's wrong.

### 4. Incremental Testing

After each task group, run type check and tests:

```bash
pnpm check-types && pnpm test
```

Don't wait until the end - catch issues early.

### 5. Git Strategy

Commit after each major task group:
- Commit 1: Toggle removal
- Commit 2: Type definitions created
- Commit 3: Service signatures updated
- Commit 4: Route handlers updated
- Commit 5: WebSocket handlers updated
- Commit 6: Tests updated
- Commit 7: Final validation

This makes it easier to debug and rollback if needed.

## Dependencies

- No new package dependencies required
- Existing Zod dependency (`zod`) already in project
- TypeScript 5.9+ (already in project)
- Node.js 18+ (already required)

## Timeline

| Task                        | Estimated Time |
| --------------------------- | -------------- |
| Preparation & Toggle Removal | 1 hour         |
| Create Type Definitions     | 3 hours        |
| Update Service Signatures   | 3 hours        |
| Update Route Handlers       | 2 hours        |
| Update WebSocket Handlers   | 1 hour         |
| Update Tests                | 2 hours        |
| Final Validation            | 0.5 hours      |
| **Total**                   | **12-16 hours** |

## References

- Prisma CRUD API: https://www.prisma.io/docs/concepts/components/prisma-client/crud
- Zod Documentation: https://zod.dev/
- TypeScript Utility Types: https://www.typescriptlang.org/docs/handbook/utility-types.html
- Fastify Validation: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/

## Next Steps

1. Review this spec for completeness
2. Assign to developer or execute via subagents
3. Create git branch: `git checkout -b feat/refactor-service-api`
4. Execute task groups in order
5. Create PR when complete
6. Review and merge

---

**Ready to implement? Run:** `/implement-spec 54`
