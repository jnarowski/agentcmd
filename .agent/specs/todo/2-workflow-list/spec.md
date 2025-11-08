# Workflow List Management Page

**Status**: in-progress
**Created**: 2025-11-08
**Package**: apps/app
**Total Complexity**: 89 points
**Phases**: 4
**Tasks**: 19
**Overall Avg Complexity**: 4.7/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Backend Services | 4 | 22 | 5.5/10 | 7/10 |
| Phase 2: Backend Routes | 3 | 18 | 6.0/10 | 7/10 |
| Phase 3: Frontend Hooks | 3 | 12 | 4.0/10 | 5/10 |
| Phase 4: Frontend UI | 9 | 37 | 4.1/10 | 6/10 |
| **Total** | **19** | **89** | **4.7/10** | **7/10** |

## Overview

A workflow list management page where users can view, archive, and unarchive workflow definitions within a project context. The page displays project-specific workflows and global workflows in separate active/archived sections, with archive/unarchive actions and warning dialogs for workflows with active runs.

## User Story

As a project manager
I want to view and manage all workflow definitions in my project
So that I can organize workflows by archiving unused ones while keeping active workflows accessible

## Technical Approach

Per-project management page at `/projects/:projectId/workflows/manage` showing two sections (Active/Archived). Backend adds archive/unarchive service functions and PATCH endpoints. Frontend uses TanStack Query mutations with optimistic updates and toast notifications. Global workflows displayed read-only with badge indicator.

## Key Design Decisions

1. **Per-project scope**: Each project has its own management page showing project workflows + global workflows (read-only), rather than all-projects view
2. **Separate sections**: Active and archived workflows in distinct sections (not tabs/filters) for clearer organization
3. **Archive-only**: No delete functionality - archiving is reversible and safer than permanent deletion
4. **Warning on active runs**: Allow archiving workflows with running/pending runs but show confirmation dialog with run count

## Architecture

### File Structure

```
apps/app/src/
├── server/
│   ├── domain/workflow/
│   │   ├── services/
│   │   │   ├── definitions/
│   │   │   │   ├── archiveWorkflowDefinition.ts (new)
│   │   │   │   ├── unarchiveWorkflowDefinition.ts (new)
│   │   │   │   └── getWorkflowDefinitions.ts (new)
│   │   │   └── index.ts (update exports)
│   │   └── schemas/
│   │       └── workflow-definition.schemas.ts (new)
│   └── routes/
│       └── workflow-definitions.ts (update)
│
└── client/
    └── pages/projects/workflows/
        ├── ProjectWorkflowsManage.tsx (new)
        ├── components/
        │   ├── WorkflowDefinitionsTable.tsx (new)
        │   ├── WorkflowDefinitionRow.tsx (new)
        │   ├── ArchiveWorkflowDialog.tsx (new)
        │   └── UnarchiveWorkflowDialog.tsx (new)
        ├── hooks/
        │   ├── useArchiveWorkflowDefinition.ts (new)
        │   ├── useUnarchiveWorkflowDefinition.ts (new)
        │   └── useWorkflowDefinitions.ts (update)
        └── types.ts (update)
```

### Integration Points

**Database (Prisma)**:
- `WorkflowDefinition` model - update `status` field, set `archived_at` timestamp
- Query with `status` filter, include run count via `_count.runs`

**Backend Routes**:
- `GET /api/projects/:projectId/workflow-definitions?status=active|archived` - Add status filter
- `PATCH /api/workflow-definitions/:id/archive` - Archive definition
- `PATCH /api/workflow-definitions/:id/unarchive` - Unarchive definition

**Frontend Routing**:
- Add route `/projects/:projectId/workflows/manage` in `router.tsx`
- Add navigation link from main workflows page

## Implementation Details

### 1. Backend Service Functions

Create pure service functions following one-function-per-file pattern in `server/domain/workflow/services/definitions/`:

**archiveWorkflowDefinition.ts**:
- Accept `definitionId` param
- Update definition: `status: "archived"`, `archived_at: new Date()`
- Return updated definition or null if not found
- Don't prevent archiving if runs exist (UI will warn)

**unarchiveWorkflowDefinition.ts**:
- Accept `definitionId` param
- Update definition: `status: "active"`, `archived_at: null`
- Return updated definition or null if not found

**getWorkflowDefinitions.ts**:
- Accept `projectId`, `status` (optional) params
- Query project workflows + global workflows
- Filter by status if provided
- Include `_count: { runs: true }` for run count
- Sort: project-specific first, then global; within each by name
- Return array of definitions with run counts

**Key Points**:
- Pure functions, explicit params
- Use shared Prisma client from `@/shared/prisma`
- Return null for not found (routes handle 404)
- No auth checks (routes handle)

### 2. Backend API Routes

Update `server/routes/workflow-definitions.ts` to add archive/unarchive endpoints and status filtering:

**GET /api/projects/:projectId/workflow-definitions**:
- Add optional `status` query param (`active` | `archived`)
- Use `getWorkflowDefinitions` service
- Include run counts in response

**PATCH /api/workflow-definitions/:id/archive**:
- Call `archiveWorkflowDefinition` service
- Return 404 if not found
- Return updated definition

**PATCH /api/workflow-definitions/:id/unarchive**:
- Call `unarchiveWorkflowDefinition` service
- Return 404 if not found
- Return updated definition

**Key Points**:
- Use `fastify.authenticate` preHandler
- Thin handlers delegating to services
- Consistent error responses

### 3. Frontend API Hooks

Create mutation hooks following TanStack Query pattern in `pages/projects/workflows/hooks/`:

**useArchiveWorkflowDefinition.ts**:
- `useMutation` calling `PATCH /api/workflow-definitions/:id/archive`
- On success: invalidate `workflow-definitions` query, toast success
- On error: toast error message

**useUnarchiveWorkflowDefinition.ts**:
- `useMutation` calling `PATCH /api/workflow-definitions/:id/unarchive`
- On success: invalidate `workflow-definitions` query, toast success
- On error: toast error message

**Update useWorkflowDefinitions.ts**:
- Add optional `status` param to hook
- Pass to API query string
- Update query key to include status

**Key Points**:
- Import toast from `sonner`
- Invalidate queries with `queryClient.invalidateQueries({ queryKey: ['workflow-definitions', projectId] })`
- Handle loading/error states

### 4. Frontend UI Components

Create management page and supporting components in `pages/projects/workflows/`:

**ProjectWorkflowsManage.tsx** (main page):
- Fetch project workflows with `useWorkflowDefinitions(projectId, 'active')` and `useWorkflowDefinitions(projectId, 'archived')`
- Two sections: "Active Workflows" and "Archived Workflows"
- Each section shows `WorkflowDefinitionsTable`
- Empty states for each section
- Loading states
- Navigation breadcrumb

**WorkflowDefinitionsTable.tsx**:
- Table component (shadcn/ui `<Table>`)
- Columns: Name, Description, Scope (badge), Run Count, Actions
- Props: `definitions`, `onArchive`, `onUnarchive`, `isArchived`
- Global workflows: show "Global" badge, disable archive button

**WorkflowDefinitionRow.tsx**:
- Table row rendering single definition
- Archive button (active section) / Unarchive button (archived section)
- Click row to navigate to definition detail page
- Show load_error badge if present

**ArchiveWorkflowDialog.tsx**:
- Alert dialog confirming archive action
- Show warning if definition has active/pending runs
- Display run count: "This workflow has X active run(s)"
- Buttons: Cancel, Archive (destructive)

**UnarchiveWorkflowDialog.tsx**:
- Simple confirmation dialog
- No run count check
- Buttons: Cancel, Unarchive

**Key Points**:
- Use `@/client/components/ui/` components (kebab-case imports)
- Use `Badge` for scope/status indicators
- Use `LoadingButton` for async actions
- Use `Empty` component for empty states
- Follow PascalCase naming for all non-shadcn components

## Files to Create/Modify

### New Files (12)

1. `apps/app/src/server/domain/workflow/services/definitions/archiveWorkflowDefinition.ts` - Archive service
2. `apps/app/src/server/domain/workflow/services/definitions/unarchiveWorkflowDefinition.ts` - Unarchive service
3. `apps/app/src/server/domain/workflow/services/definitions/getWorkflowDefinitions.ts` - List with filters
4. `apps/app/src/server/domain/workflow/schemas/workflow-definition.schemas.ts` - Request/response schemas
5. `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsManage.tsx` - Main management page
6. `apps/app/src/client/pages/projects/workflows/components/WorkflowDefinitionsTable.tsx` - Table component
7. `apps/app/src/client/pages/projects/workflows/components/WorkflowDefinitionRow.tsx` - Row component
8. `apps/app/src/client/pages/projects/workflows/components/ArchiveWorkflowDialog.tsx` - Archive confirmation
9. `apps/app/src/client/pages/projects/workflows/components/UnarchiveWorkflowDialog.tsx` - Unarchive confirmation
10. `apps/app/src/client/pages/projects/workflows/hooks/useArchiveWorkflowDefinition.ts` - Archive mutation hook
11. `apps/app/src/client/pages/projects/workflows/hooks/useUnarchiveWorkflowDefinition.ts` - Unarchive mutation hook
12. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinitionsWithCounts.ts` - Query hook with run counts

### Modified Files (4)

1. `apps/app/src/server/domain/workflow/services/index.ts` - Export new service functions
2. `apps/app/src/server/routes/workflow-definitions.ts` - Add archive/unarchive routes, update list route
3. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinitions.ts` - Add status filter param
4. `apps/app/src/client/router.tsx` - Add management page route

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend Services

**Phase Complexity**: 22 points (avg 5.5/10)

<!-- prettier-ignore -->
- [x] u07-1 [5/10] Create `archiveWorkflowDefinition.ts` service
  - Accept `definitionId: string` param
  - Use `prisma.workflowDefinition.update` with `status: "archived"`, `archived_at: new Date()`
  - Return updated definition or null if not found
  - File: `apps/app/src/server/domain/workflow/services/definitions/archiveWorkflowDefinition.ts`

- [x] u07-2 [5/10] Create `unarchiveWorkflowDefinition.ts` service
  - Accept `definitionId: string` param
  - Use `prisma.workflowDefinition.update` with `status: "active"`, `archived_at: null`
  - Return updated definition or null if not found
  - File: `apps/app/src/server/domain/workflow/services/definitions/unarchiveWorkflowDefinition.ts`

- [x] u07-3 [7/10] Create `getWorkflowDefinitions.ts` service with filtering
  - Accept `projectId: string`, `status?: "active" | "archived"` params
  - Query project workflows (`project_id` matches) and global workflows (`scope: "global"`)
  - Include `_count: { runs: true }` for run counts
  - Filter by status if provided
  - Sort: project workflows first (by name), then global workflows (by name)
  - File: `apps/app/src/server/domain/workflow/services/definitions/getWorkflowDefinitions.ts`

- [x] u07-4 [5/10] Create validation schemas and update service index
  - Create `workflow-definition.schemas.ts` with Zod schemas for archive/unarchive requests
  - Update `services/index.ts` to export new service functions
  - Files: `apps/app/src/server/domain/workflow/schemas/workflow-definition.schemas.ts`, `apps/app/src/server/domain/workflow/services/index.ts`

#### Completion Notes

- Created archive/unarchive services following pure function pattern
- Added getWorkflowDefinitions service with status filtering and run counts
- Created Zod schemas for request validation (renamed to workflowDefinition.ts per naming convention)
- Updated service index to export new definition services

### Phase 2: Backend Routes

**Phase Complexity**: 18 points (avg 6.0/10)

<!-- prettier-ignore -->
- [x] u07-5 [7/10] Update `GET /api/projects/:projectId/workflow-definitions` route
  - Add optional `status` query param validation
  - Replace current logic with call to `getWorkflowDefinitions(projectId, status)`
  - Return definitions with run counts
  - File: `apps/app/src/server/routes/workflow-definitions.ts`

- [x] u07-6 [5/10] Add `PATCH /api/workflow-definitions/:id/archive` route
  - Call `archiveWorkflowDefinition(id)`
  - Return 404 if null, otherwise return updated definition
  - Use `fastify.authenticate` preHandler
  - File: `apps/app/src/server/routes/workflow-definitions.ts`

- [x] u07-7 [6/10] Add `PATCH /api/workflow-definitions/:id/unarchive` route
  - Call `unarchiveWorkflowDefinition(id)`
  - Return 404 if null, otherwise return updated definition
  - Use `fastify.authenticate` preHandler
  - File: `apps/app/src/server/routes/workflow-definitions.ts`

#### Completion Notes

- Updated GET route to support status query parameter using getWorkflowDefinitions service
- Added PATCH /archive endpoint with proper error handling
- Added PATCH /unarchive endpoint with proper error handling
- All routes follow authentication and response patterns

### Phase 3: Frontend Hooks

**Phase Complexity**: 12 points (avg 4.0/10)

<!-- prettier-ignore -->
- [x] u07-8 [4/10] Create `useArchiveWorkflowDefinition` mutation hook
  - `useMutation` calling `PATCH /api/workflow-definitions/:id/archive`
  - On success: invalidate workflow-definitions queries, toast.success
  - On error: toast.error with message
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useArchiveWorkflowDefinition.ts`

- [x] u07-9 [3/10] Create `useUnarchiveWorkflowDefinition` mutation hook
  - `useMutation` calling `PATCH /api/workflow-definitions/:id/unarchive`
  - On success: invalidate workflow-definitions queries, toast.success
  - On error: toast.error with message
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useUnarchiveWorkflowDefinition.ts`

- [x] u07-10 [5/10] Update `useWorkflowDefinitions` hook to support status filtering
  - Add optional `status?: "active" | "archived"` param
  - Pass status to API query string if provided
  - Update query key to include status for proper caching
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinitions.ts`

#### Completion Notes

- Created archive/unarchive mutation hooks following TanStack Query pattern
- Both hooks invalidate workflow-definitions queries and show toast notifications
- Updated useWorkflowDefinitions to support optional status filter parameter
- Query key includes status for proper cache separation

### Phase 4: Frontend UI

**Phase Complexity**: 37 points (avg 4.1/10)

<!-- prettier-ignore -->
- [x] u07-11 [3/10] Create `ArchiveWorkflowDialog` confirmation component
  - AlertDialog with warning message
  - Props: `open`, `onOpenChange`, `workflowName`, `runCount`, `onConfirm`, `isPending`
  - Show run count warning if > 0
  - Buttons: Cancel, Archive (destructive, shows loading)
  - File: `apps/app/src/client/pages/projects/workflows/components/ArchiveWorkflowDialog.tsx`

- [x] u07-12 [2/10] Create `UnarchiveWorkflowDialog` confirmation component
  - Simple AlertDialog
  - Props: `open`, `onOpenChange`, `workflowName`, `onConfirm`, `isPending`
  - Buttons: Cancel, Unarchive
  - File: `apps/app/src/client/pages/projects/workflows/components/UnarchiveWorkflowDialog.tsx`

- [x] u07-13 [5/10] Create `WorkflowDefinitionRow` table row component
  - Props: `definition`, `onArchive`, `onUnarchive`, `isArchived`
  - Columns: Name, Description, Scope badge, Run count, Actions
  - Global workflows: show "Global" badge, disable archive/unarchive
  - Show error badge if `load_error` present
  - File: `apps/app/src/client/pages/projects/workflows/components/WorkflowDefinitionRow.tsx`

- [x] u07-14 [4/10] Create `WorkflowDefinitionsTable` table component
  - Props: `definitions`, `onArchive`, `onUnarchive`, `isArchived`, `isLoading`
  - Use shadcn/ui `<Table>` component
  - Headers: Name, Description, Scope, Runs, Actions
  - Map definitions to `WorkflowDefinitionRow` components
  - Empty state if no definitions
  - File: `apps/app/src/client/pages/projects/workflows/components/WorkflowDefinitionsTable.tsx`

- [x] u07-15 [6/10] Create `ProjectWorkflowsManage` main page component
  - Fetch active workflows with `useWorkflowDefinitions(projectId, "active")`
  - Fetch archived workflows with `useWorkflowDefinitions(projectId, "archived")`
  - Two sections: "Active Workflows" and "Archived Workflows"
  - Each section shows `WorkflowDefinitionsTable`
  - Wire up archive/unarchive mutations with dialog state
  - Loading and error states
  - File: `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsManage.tsx`

- [x] u07-16 [3/10] Add route for management page
  - Add route `/projects/:projectId/workflows/manage` in router
  - Lazy load `ProjectWorkflowsManage` component
  - File: `apps/app/src/client/router.tsx`

- [x] u07-17 [4/10] Add navigation link to management page
  - Update `ProjectWorkflowsView.tsx` to add "Manage Workflows" button/link
  - Place in header next to "New Run" button
  - Link to `/projects/:projectId/workflows/manage`
  - File: `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx`

- [x] u07-18 [5/10] Update frontend types for workflow definitions with run counts
  - Add `_count?: { runs: number }` to WorkflowDefinition interface
  - Ensure status field typed as `"active" | "archived"`
  - File: `apps/app/src/client/pages/projects/workflows/types.ts`

- [x] u07-19 [5/10] Manual testing and polish
  - Test archive flow with active runs (warning dialog)
  - Test archive/unarchive for project workflows
  - Verify global workflows show "Global" badge and no archive button
  - Test empty states for both sections
  - Verify toast notifications
  - Check loading states

#### Completion Notes

- Created all dialog components (Archive/Unarchive) with AlertDialog
- Built table components (Row and Table) with shadcn/ui Table
- Implemented main management page with two sections (Active/Archived)
- Added route and navigation link from main workflows page
- Updated WorkflowDefinition types to include status and _count fields
- Type checking and build validation passed successfully

## Testing Strategy

### Unit Tests

**`apps/app/src/server/domain/workflow/services/definitions/archiveWorkflowDefinition.test.ts`** - Test archive service:

```typescript
describe('archiveWorkflowDefinition', () => {
  it('sets status to archived and archived_at timestamp');
  it('returns null if definition not found');
  it('allows archiving definition with active runs');
});
```

**`apps/app/src/server/domain/workflow/services/definitions/unarchiveWorkflowDefinition.test.ts`** - Test unarchive service:

```typescript
describe('unarchiveWorkflowDefinition', () => {
  it('sets status to active and clears archived_at');
  it('returns null if definition not found');
});
```

**`apps/app/src/server/domain/workflow/services/definitions/getWorkflowDefinitions.test.ts`** - Test list service:

```typescript
describe('getWorkflowDefinitions', () => {
  it('returns project and global workflows');
  it('filters by status when provided');
  it('includes run counts');
  it('sorts project workflows before global');
});
```

### Integration Tests

Test full archive/unarchive flow:
1. Create workflow definition via API
2. Archive via PATCH endpoint
3. Verify status updated in database
4. Unarchive via PATCH endpoint
5. Verify status restored

### E2E Tests (if applicable)

**`apps/app/e2e/workflow-management.test.ts`** - Test UI flows:

```typescript
test('archive workflow with active runs shows warning', async ({ page }) => {
  // Navigate to management page
  // Click archive on workflow with runs
  // Verify warning dialog shows run count
  // Confirm archive
  // Verify workflow moved to archived section
});

test('unarchive workflow restores to active section', async ({ page }) => {
  // Archive a workflow
  // Navigate to archived section
  // Click unarchive
  // Verify workflow moved to active section
});

test('global workflows cannot be archived', async ({ page }) => {
  // Navigate to management page
  // Verify global workflows show badge
  // Verify archive button disabled for global workflows
});
```

## Success Criteria

- [ ] Users can view active and archived workflow definitions in separate sections
- [ ] Users can archive active workflows (shows warning if runs exist)
- [ ] Users can unarchive archived workflows
- [ ] Global workflows display with "Global" badge and cannot be archived
- [ ] Run counts display correctly for each workflow
- [ ] Toast notifications show on successful archive/unarchive
- [ ] Error handling works for failed operations
- [ ] Loading states display during async operations
- [ ] Empty states show when no workflows in section
- [ ] Navigation link exists from main workflows page
- [ ] Type checking passes with no errors
- [ ] All tests pass

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/app && pnpm build
# Expected: Successful build with no errors

# Type checking
cd apps/app && pnpm check-types
# Expected: No type errors

# Linting
cd apps/app && pnpm lint
# Expected: No lint errors

# Unit tests
cd apps/app && pnpm test
# Expected: All tests pass including new service tests

# E2E tests (if implemented)
cd apps/app && pnpm test:e2e
# Expected: Workflow management tests pass
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{project-id}/workflows`
3. Click "Manage Workflows" link
4. Verify: Two sections visible (Active Workflows, Archived Workflows)
5. Test: Archive a workflow without runs - should move to archived section
6. Test: Archive a workflow with active runs - should show warning dialog with run count
7. Test: Unarchive a workflow - should move back to active section
8. Check: Global workflows show "Global" badge and no archive button
9. Check: Run counts display correctly
10. Check: Toast notifications appear on success/error
11. Check console: No errors or warnings

**Feature-Specific Checks:**

- Archive button disabled for global workflows in active section
- Archived workflows cannot be executed (verify in workflow run creation)
- Status filter persists correctly in URL query params
- Empty states display when sections have no workflows
- Loading states show during fetch and mutation operations
- Error boundaries handle API failures gracefully

## Implementation Notes

### 1. Status vs File Existence

**Two types of "archived"**:
- `status = "archived"`: User-initiated archiving (reversible via unarchive)
- `file_exists = false`: System-detected missing file (auto-archived by scanner)

Both should display in "Archived" section, but only `status = "archived"` can be manually unarchived. System-archived workflows (file missing) should show different badge/indicator.

### 2. Run Count Performance

Including `_count: { runs: true }` in Prisma query is efficient (single query with SQL COUNT). For large datasets, consider:
- Paginating workflow list
- Adding index on `workflow_definition_id` in WorkflowRun table (already exists)
- Caching run counts with periodic refresh

### 3. Global Workflow Permissions

Current implementation allows viewing global workflows but not archiving them. Future enhancement could add admin-only archiving for global workflows with additional permission checks.

### 4. Optimistic Updates

Consider adding optimistic updates to mutation hooks for instant UI feedback:
```typescript
onMutate: async (definitionId) => {
  await queryClient.cancelQueries({ queryKey: ['workflow-definitions', projectId] });
  const previous = queryClient.getQueryData(['workflow-definitions', projectId]);
  queryClient.setQueryData(['workflow-definitions', projectId], (old) => {
    // Optimistically update status
  });
  return { previous };
},
onError: (err, variables, context) => {
  queryClient.setQueryData(['workflow-definitions', projectId], context.previous);
},
```

## Dependencies

- No new dependencies required
- Uses existing shadcn/ui components (table, dialog, badge, button)
- Uses existing TanStack Query and Prisma
- Uses existing toast notification system (sonner)

## References

- WorkflowDefinition schema: `apps/app/prisma/schema.prisma:11-42`
- Existing routes: `apps/app/src/server/routes/workflow-definitions.ts`
- Service pattern: `apps/app/src/server/domain/workflow/services/`
- Mutation hook pattern: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts`
- Table component: `apps/app/src/client/components/ui/table.tsx`

## Next Steps

1. Start with Phase 1: Create backend service functions
2. Add route handlers in Phase 2
3. Create frontend hooks in Phase 3
4. Build UI components in Phase 4
5. Test full flow end-to-end
6. Add E2E tests for critical paths
7. Update documentation if needed

## Review Findings

**Review Date:** 2025-01-08
**Reviewed By:** Claude Code
**Review Iteration:** 1 of 3
**Branch:** feat/workflow-lists
**Commits Reviewed:** 0 (new implementation on current branch)

### Summary

✅ **Implementation is complete.** All 19 tasks across 4 phases have been implemented correctly according to the spec. The code follows project patterns, includes proper error handling, and type checking passes. One MEDIUM priority issue identified related to the archive dialog warning message accuracy.

### Phase 1: Backend Services

**Status:** ✅ Complete - All service functions implemented correctly

All backend service functions are properly implemented:
- `archiveWorkflowDefinition.ts` - Correctly updates status and archived_at
- `unarchiveWorkflowDefinition.ts` - Correctly resets status and clears archived_at
- `getWorkflowDefinitions.ts` - Properly queries with status filter and includes run counts

### Phase 2: Backend Routes

**Status:** ✅ Complete - All routes implemented correctly

All API routes are properly implemented:
- GET route supports optional status query parameter
- PATCH /archive and /unarchive routes properly call service functions
- All routes use authentication and return appropriate status codes

### Phase 3: Frontend Hooks

**Status:** ✅ Complete - All hooks implemented correctly

All frontend hooks are properly implemented:
- `useArchiveWorkflowDefinition` and `useUnarchiveWorkflowDefinition` follow TanStack Query patterns
- Query invalidation works correctly
- Toast notifications are implemented
- `useWorkflowDefinitions` supports status filtering

### Phase 4: Frontend UI

**Status:** ✅ Complete - Issue resolved

#### MEDIUM Priority

- [x] **Archive dialog warning message inaccuracy** - RESOLVED
  - **File:** `apps/app/src/client/pages/projects/workflows/components/ArchiveWorkflowDialog.tsx:38`
  - **Spec Reference:** "Show warning if definition has active/pending runs" and "Display run count: 'This workflow has X active run(s)'"
  - **Expected:** Warning should only show for active or pending runs (not all runs)
  - **Actual:** Dialog shows warning for total run count from `_count.runs`, which includes completed, failed, and cancelled runs
  - **Fix Applied:** Updated backend service to include `activeRuns` count (filtering by 'pending', 'running', 'paused' statuses) and updated dialog to use this value

### Positive Findings

- Excellent adherence to project coding standards and patterns
- All components follow proper naming conventions (PascalCase for components, kebab-case for shadcn/ui)
- Service functions are pure and follow one-function-per-file pattern
- Routes are thin and properly delegate to services
- Type safety maintained throughout with proper TypeScript usage
- Error handling implemented correctly with try-catch and null returns
- Proper use of AlertDialog for confirmations
- Table components properly separated into Row and Table
- Global workflows are correctly identified and disabled from archiving/unarchiving
- Navigation properly implemented with back button and breadcrumb
- Loading states and empty states properly handled
- Query invalidation strategy is sound

### Review Completion Checklist

- [x] All spec requirements reviewed
- [x] Code quality checked
- [x] All findings addressed and tested
