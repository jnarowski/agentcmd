# Internal Session Framework

**Status**: draft
**Type**: issue
**Created**: 2025-11-22
**Package**: apps/app
**Total Complexity**: 39 points
**Tasks**: 8
**Avg Complexity**: 4.9/10

## Complexity Summary

| Metric          | Value    |
| --------------- | -------- |
| Total Tasks     | 8        |
| Total Points    | 39       |
| Avg Complexity  | 4.9/10   |
| Max Task        | 6/10     |

## Overview

Add programmatic command execution infrastructure to execute slash commands outside of user chat sessions. Introduces `internal` session type for hidden sessions and `executeCommand()` service supporting both sync/async execution modes. Includes spec move dropdown UI for moving specs between workflow folders.

## User Story

As a developer
I want to execute slash commands programmatically from UI components and API endpoints
So that internal operations (like moving specs) can leverage existing slash commands without appearing in user's session list

## Technical Approach

Add `internal` to `SessionType` enum to distinguish programmatic executions from user-initiated chats. Create `executeCommand()` service that supports both synchronous (await completion) and asynchronous (fire-and-forget) modes. Update session queries to filter out internal sessions by default. Implement dropdown menu in SpecItem component with "Move to..." submenu that calls synchronous command execution for immediate UI refresh.

**Key Points**:
- Reuses existing session infrastructure (no new execution path)
- Both sync/async modes use `type: 'internal'` (hidden from UI)
- Sync mode awaits `executeAgent()` completion, async mode fire-and-forget
- Dropdown follows ProjectItem.tsx pattern (hover state, absolute positioning)

## Files to Create/Modify

### New Files (2)

1. `apps/app/src/server/domain/session/services/executeCommand.ts` - Unified command execution service
2. `apps/app/src/server/routes/api/specs.routes.ts` - Spec management API (move endpoint)

### Modified Files (4)

1. `apps/app/prisma/schema.prisma` - Add `internal` to SessionType enum
2. `apps/app/src/server/domain/session/services/getSessions.ts` - Filter internal sessions
3. `apps/app/src/client/components/sidebar/SpecItem.tsx` - Add move dropdown menu
4. `.agent/specs/index.json` - Add this spec entry

## Tasks

**IMPORTANT: Execute every task in order, top to bottom**

- [ ] **task-1** [3/10] Add `internal` to SessionType enum
  - Add `internal` value to `SessionType` enum in schema.prisma:246-249
  - Run `pnpm prisma:migrate` to create migration
  - File: `apps/app/prisma/schema.prisma`
  - Command: `pnpm prisma:migrate`

- [ ] **task-2** [6/10] Create `executeCommand()` service
  - Create new service file with sync/async mode support
  - Sync mode: creates session, awaits executeAgent, returns result
  - Async mode: creates session, fire-and-forget, returns sessionId
  - Both modes use `type: 'internal'` for hidden sessions
  - Export interfaces: `ExecuteCommandOptions`, `ExecuteCommandResult`
  - File: `apps/app/src/server/domain/session/services/executeCommand.ts`

- [ ] **task-3** [3/10] Update `getSessions()` to filter internal sessions
  - Add filter: `type: { not: 'internal' }` to where clause (default)
  - Keep existing filters for type, permission_mode, etc.
  - No new parameters needed (internal sessions always hidden)
  - File: `apps/app/src/server/domain/session/services/getSessions.ts:31-38`

- [ ] **task-4** [5/10] Create spec move API endpoint
  - Create new route file: `POST /api/projects/:projectId/specs/:specId/move`
  - Body schema: `{ targetFolder: z.enum(['backlog', 'todo', 'done']) }`
  - Authentication: `preHandler: fastify.authenticate`
  - Call `executeCommand()` with mode='sync', prompt='/cmd:move-spec {specId} {folder}'
  - Return 200 on success
  - File: `apps/app/src/server/routes/api/specs.routes.ts`

- [ ] **task-5** [5/10] Add dropdown menu to SpecItem component
  - Add hover state (`useState<string | null>`) and menu open state
  - Extract current folder from `spec.specPath` (e.g., "done/..." → "done")
  - Add MoreHorizontal trigger button (absolute right-1, show on hover/menu open)
  - Follow ProjectItem.tsx pattern (lines 131-184)
  - File: `apps/app/src/client/components/sidebar/SpecItem.tsx`

- [ ] **task-6** [6/10] Implement "Move to..." submenu
  - Use `DropdownMenuSub` + `DropdownMenuSubContent`
  - Options: Backlog, To Do, Done (map to folder names)
  - Filter out current folder from options
  - Icons: `FolderInput` for submenu trigger, none for items
  - onClick: call moveSpec API, invalidate specs query, show toast
  - File: `apps/app/src/client/components/sidebar/SpecItem.tsx`

- [ ] **task-7** [5/10] Create frontend API client function
  - Create `moveSpec()` function: `POST /api/projects/:id/specs/:specId/move`
  - Parameters: `{ projectId, specId, targetFolder }`
  - Use fetch with JWT auth headers
  - Handle errors with toast notification
  - File: `apps/app/src/client/api/specs.ts` (create if doesn't exist)

- [ ] **task-8** [6/10] Wire dropdown to API and query invalidation
  - Import `useQueryClient` from @tanstack/react-query
  - Import `moveSpec` from client API
  - onClick handler: await moveSpec(), invalidate ['specs'], show success toast
  - Error handling: catch, show error toast, don't invalidate
  - Add loading state during move operation
  - File: `apps/app/src/client/components/sidebar/SpecItem.tsx`

## Testing Strategy

### Unit Tests

**`apps/app/src/server/domain/session/services/executeCommand.test.ts`**:
- Sync mode creates session, awaits completion, returns result
- Async mode creates session, returns immediately with sessionId
- Both modes use type='internal'
- Error handling for invalid agent/prompt

### Integration Tests

**`apps/app/src/server/routes/api/specs.test.ts`**:
- POST /move with valid folder returns 200
- POST /move with invalid folder returns 400
- POST /move without auth returns 401
- Verify slash command executed with correct args

### Frontend Tests

**Manual**:
- Hover over spec item shows "..." button
- Click "..." opens dropdown menu
- "Move to..." submenu shows folders (excludes current)
- Click folder moves spec, refreshes sidebar
- Error handling shows toast

## Success Criteria

- [ ] `internal` session type added to schema and migrated
- [ ] `executeCommand()` service supports sync/async modes
- [ ] `getSessions()` filters out internal sessions by default
- [ ] Spec move API endpoint works with slash command execution
- [ ] Dropdown menu appears on hover, follows ProjectItem pattern
- [ ] "Move to..." submenu shows correct folder options
- [ ] Clicking folder moves spec and refreshes sidebar
- [ ] Error handling shows appropriate toast notifications
- [ ] Type checking passes (`pnpm check-types`)
- [ ] No regressions in existing session/spec functionality

## Validation

**Automated:**

```bash
# Type check
pnpm check-types
# Expected: no errors

# Build
pnpm build
# Expected: successful build

# Migrations
pnpm prisma:migrate
# Expected: migration created and applied
```

**Manual:**

1. Start app: `pnpm dev`
2. Navigate to project with specs
3. Hover over spec item in sidebar
4. Verify "..." button appears
5. Click "..." and verify dropdown menu
6. Click "Move to..." and verify submenu shows folders
7. Click target folder and verify:
   - Spec moves to new folder
   - Sidebar refreshes automatically
   - Success toast appears
8. Verify internal session NOT in session list
9. Check session type in database (should be 'internal')

## Implementation Notes

### Session Type Distinction

The `internal` session type serves a different purpose than `chat` and `workflow`:
- `chat` - User-initiated sessions (shown in sidebar)
- `workflow` - Workflow-bound sessions (shown in workflow UI)
- `internal` - Programmatic executions (hidden from all UI)

All three types use the same execution infrastructure but differ in visibility and context.

### Sync vs Async Modes

Sync mode is preferred for:
- UI actions requiring immediate feedback (spec move)
- Fast operations (< 5 seconds)
- Operations affecting displayed data

Async mode is preferred for:
- Long-running operations (spec implementation, code generation)
- Background jobs
- Operations not affecting immediate UI state

### Error Handling

API endpoint should catch execution failures and return appropriate HTTP errors:
- 400 for invalid folder names
- 404 for spec not found
- 500 for execution failures

Frontend should show toast notifications for both success and error cases.

## Dependencies

No new dependencies - leverages existing:
- Prisma migrations
- agent-cli-sdk
- shadcn/ui components (DropdownMenu)
- TanStack Query

## References

- Root CLAUDE.md - Import conventions, React rules
- apps/app/CLAUDE.md - Full-stack patterns
- .agent/docs/backend-patterns.md - Domain service patterns
- ProjectItem.tsx - Dropdown menu reference implementation
