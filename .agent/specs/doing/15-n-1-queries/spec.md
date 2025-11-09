# Eliminate N+1 Workflow Queries in Sidebar

**Status**: in-progress
**Created**: 2025-11-09
**Package**: apps/app
**Total Complexity**: 52 points
**Phases**: 4
**Tasks**: 11
**Overall Avg Complexity**: 4.7/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Backend Services | 2 | 8 | 4.0/10 | 5/10 |
| Phase 2: Backend Routes | 2 | 12 | 6.0/10 | 7/10 |
| Phase 3: Frontend Hooks & Keys | 3 | 16 | 5.3/10 | 6/10 |
| Phase 4: Update Components & Mutations | 4 | 16 | 4.0/10 | 5/10 |
| **Total** | **11** | **52** | **4.7/10** | **7/10** |

## Overview

Eliminate N+1 query problem in NavActivities sidebar by adding user-wide workflow endpoints that fetch all runs and definitions across all projects in a single request. Currently making N separate requests (one per project) using useQueries.

## User Story

As a user viewing the sidebar
I want to see my recent workflow activity instantly
So that I don't have to wait for N separate API requests to complete

## Technical Approach

Make `project_id` optional in existing `/api/workflow-runs` endpoint and create new `/api/workflow-definitions` top-level route. Add `getAllWorkflowRuns` and `getAllWorkflowDefinitions` service functions that query all user data. Update NavActivities to use single `useAllWorkflowRuns()` hook instead of `useQueries` loop. Update all mutations to invalidate new `allRuns` cache key.

## Key Design Decisions

1. **Optional project_id**: Make existing route more flexible instead of creating `/api/workflow-runs/all` - follows RESTful patterns
2. **Accept cache duplication**: Don't try to share cache between `allRuns()` and `runsList(projectId)` - simpler invalidation
3. **Update all mutations**: Every mutation that affects runs must invalidate both project-specific and user-wide caches
4. **Keep existing hooks unchanged**: Project pages continue using `useWorkflowRuns(projectId)` - only sidebar uses new hook

## Architecture

### File Structure
```
apps/app/src/
├── server/
│   ├── domain/workflow/services/
│   │   ├── runs/
│   │   │   ├── getAllWorkflowRuns.ts (NEW)
│   │   │   └── getWorkflowRuns.ts (existing)
│   │   ├── definitions/
│   │   │   ├── getAllWorkflowDefinitions.ts (NEW)
│   │   │   └── getWorkflowDefinitions.ts (existing)
│   │   └── index.ts (MODIFY - export new services)
│   └── routes/
│       └── workflows.ts (MODIFY - make project_id optional)
│
├── client/
│   ├── components/sidebar/
│   │   └── NavActivities.tsx (MODIFY - use new hook)
│   └── pages/projects/workflows/hooks/
│       ├── queryKeys.ts (MODIFY - add allRuns, allDefinitions)
│       ├── useAllWorkflowRuns.ts (NEW)
│       ├── useAllWorkflowDefinitions.ts (NEW)
│       ├── useWorkflowMutations.ts (MODIFY - invalidate allRuns)
│       └── useWorkflowWebSocket.ts (MODIFY - invalidate allRuns)
```

### Integration Points

**Backend Routes**:
- `workflows.ts` - Make `project_id` optional in GET /api/workflow-runs
- `workflows.ts` - Add GET /api/workflow-definitions (top-level, no project param)

**Frontend Hooks**:
- `queryKeys.ts` - Add `allRuns()` and `allDefinitions()` factories
- `useAllWorkflowRuns.ts` - New hook for sidebar
- `useAllWorkflowDefinitions.ts` - New hook for sidebar

**Components**:
- `NavActivities.tsx` - Replace useQueries with useAllWorkflowRuns

**Mutations**:
- `useWorkflowMutations.ts` - Add allRuns invalidation
- `useWorkflowWebSocket.ts` - Add allRuns invalidation

## Implementation Details

### 1. Backend Services

**getAllWorkflowRuns**:
- Thin wrapper around `getWorkflowRuns({ user_id })`
- No `project_id` filter
- Returns all runs user has access to
- Reuses existing optimized query (WorkflowRunListItem)

**getAllWorkflowDefinitions**:
- Query all definitions where user is owner OR scope='global'
- Include counts (_count.runs, _count.activeRuns)
- Optional status filter (active|archived)
- Similar to getWorkflowDefinitions but without project filtering

**Key Points**:
- Follow domain service pattern ({ object } params)
- Pure functions, no classes
- Return null handling in routes
- Leverage existing Prisma queries

### 2. Backend Routes

**GET /api/workflow-runs (modify)**:
- Make `project_id` query param optional
- When omitted: call `getAllWorkflowRuns({ userId })`
- When provided: existing behavior
- No breaking changes

**GET /api/workflow-definitions (new)**:
- Top-level route (not under /api/projects/:id)
- Optional `?status=active|archived` query param
- Call `getAllWorkflowDefinitions({ userId, status })`
- Parse JSON fields (phases, args_schema)

**Key Points**:
- Auth required (preHandler: authenticate)
- Return `{ data: [...] }` format
- Structured logging with context
- Zod schema validation

### 3. Frontend Query Keys

Add to workflowKeys factory:
```typescript
allRuns: () => [...workflowKeys.runs(), 'all'] as const,
allDefinitions: (status?) => [...workflowKeys.definitions(), 'all', status] as const,
```

Hierarchical structure ensures proper invalidation:
- `workflowKeys.runs()` invalidates both project lists AND allRuns
- `workflowKeys.allRuns()` only invalidates user-wide cache

### 4. Frontend Hooks

**useAllWorkflowRuns**:
- Fetch from `/api/workflow-runs` (no project_id param)
- Use `workflowKeys.allRuns()` query key
- Standard TanStack Query pattern
- No special config (use global 1min staleTime)

**useAllWorkflowDefinitions**:
- Fetch from `/api/workflow-definitions` (no project_id param)
- Use `workflowKeys.allDefinitions(status?)` query key
- Standard TanStack Query pattern

### 5. NavActivities Component

Replace useQueries loop with single query:
```typescript
// OLD: N queries
const workflowQueries = useQueries({
  queries: (projects || []).map((project) => ({
    queryKey: workflowKeys.runsList(project.id),
    queryFn: () => fetchWorkflowRuns(project.id),
  })),
});

// NEW: 1 query
const { data: allRuns } = useAllWorkflowRuns();
```

Client-side join with projects for display.

### 6. Mutation Invalidation

Update these hooks to invalidate `workflowKeys.allRuns()`:
- `useWorkflowMutations.ts` - CREATE mutation (already invalidates `runs()` - verify covers allRuns)
- `useWorkflowWebSocket.ts` - Run updates (add explicit allRuns invalidation)
- `NavActivities.tsx` - Refresh button (replace per-project loop)

## Files to Create/Modify

### New Files (4)

1. `apps/app/src/server/domain/workflow/services/runs/getAllWorkflowRuns.ts` - Service to fetch all runs for user
2. `apps/app/src/server/domain/workflow/services/definitions/getAllWorkflowDefinitions.ts` - Service to fetch all definitions for user
3. `apps/app/src/client/pages/projects/workflows/hooks/useAllWorkflowRuns.ts` - Hook for sidebar
4. `apps/app/src/client/pages/projects/workflows/hooks/useAllWorkflowDefinitions.ts` - Hook for sidebar

### Modified Files (6)

1. `apps/app/src/server/domain/workflow/services/index.ts` - Export new services
2. `apps/app/src/server/routes/workflows.ts` - Make project_id optional, add definitions route
3. `apps/app/src/client/pages/projects/workflows/hooks/queryKeys.ts` - Add allRuns, allDefinitions
4. `apps/app/src/client/components/sidebar/NavActivities.tsx` - Use useAllWorkflowRuns
5. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts` - Verify allRuns invalidation
6. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts` - Add allRuns invalidation

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend Services

**Phase Complexity**: 8 points (avg 4.0/10)

<!-- prettier-ignore -->
- [x] 1.1 [3/10] Create getAllWorkflowRuns service
  - File: `apps/app/src/server/domain/workflow/services/runs/getAllWorkflowRuns.ts`
  - Wrapper around `getWorkflowRuns({ user_id: userId })`
  - Use object param pattern: `{ userId }: { userId: string }`
  - Return `Promise<WorkflowRun[]>`

- [x] 1.2 [5/10] Create getAllWorkflowDefinitions service
  - File: `apps/app/src/server/domain/workflow/services/definitions/getAllWorkflowDefinitions.ts`
  - Query all definitions user owns OR scope='global'
  - Params: `{ userId, status }: { userId: string; status?: 'active' | 'archived' }`
  - Include `_count.runs` and `_count.activeRuns`
  - Return `Promise<WorkflowDefinitionWithCount[]>`

#### Completion Notes

- Created getAllWorkflowRuns as thin wrapper around getWorkflowRuns({ user_id })
- Created getAllWorkflowDefinitions with user ownership check (project.user_id OR scope='global')
- Both services follow domain pattern with object params
- Reused existing query logic and types (WorkflowDefinitionWithCount)

### Phase 2: Backend Routes

**Phase Complexity**: 12 points (avg 6.0/10)

<!-- prettier-ignore -->
- [x] 2.1 [5/10] Export new services from index
  - File: `apps/app/src/server/domain/workflow/services/index.ts`
  - Add: `export { getAllWorkflowRuns } from './runs/getAllWorkflowRuns'`
  - Add: `export { getAllWorkflowDefinitions } from './definitions/getAllWorkflowDefinitions'`

- [x] 2.2 [7/10] Modify workflow-runs route to make project_id optional
  - File: `apps/app/src/server/routes/workflows.ts`
  - Find GET /api/workflow-runs route
  - Update schema: make `project_id` optional in `workflowRunFiltersSchema`
  - Update handler: if no project_id, call `getAllWorkflowRuns({ userId })`
  - If project_id provided: existing behavior
  - Remove 400 error for missing project_id

#### Completion Notes

- Modified GET /api/workflow-runs to branch on project_id presence
- If project_id missing: calls getAllWorkflowRuns({ userId }) for user-wide data
- If project_id provided: existing behavior unchanged (backward compatible)
- Removed 400 error check for missing project_id
- Schema already had project_id as optional, no change needed

### Phase 3: Frontend Hooks & Keys

**Phase Complexity**: 16 points (avg 5.3/10)

<!-- prettier-ignore -->
- [x] 3.1 [4/10] Add allRuns and allDefinitions to queryKeys
  - File: `apps/app/src/client/pages/projects/workflows/hooks/queryKeys.ts`
  - Add: `allRuns: () => [...workflowKeys.runs(), 'all'] as const`
  - Add: `allDefinitions: (status?) => [...workflowKeys.definitions(), 'all', status] as const`

- [x] 3.2 [6/10] Create useAllWorkflowRuns hook
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useAllWorkflowRuns.ts`
  - Fetch from `/api/workflow-runs` (no params)
  - Use `workflowKeys.allRuns()` query key
  - Return type: `WorkflowRunListItem[]`
  - Standard useQuery pattern

- [x] 3.3 [6/10] Create useAllWorkflowDefinitions hook
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useAllWorkflowDefinitions.ts`
  - Fetch from `/api/workflow-definitions?status={status}`
  - Use `workflowKeys.allDefinitions(status)` query key
  - Optional status param
  - Parse response data

#### Completion Notes

- Added allRuns() and allDefinitions(status?) to workflowKeys
- Created useAllWorkflowRuns hook - fetches from /api/workflow-runs (no params)
- Created useAllWorkflowDefinitions hook - fetches from /api/workflow-definitions
- Both hooks follow existing patterns with standard useQuery setup
- Note: /api/workflow-definitions route doesn't exist yet - will need to add in routes file

### Phase 4: Update Components & Mutations

**Phase Complexity**: 16 points (avg 4.0/10)

<!-- prettier-ignore -->
- [x] 4.1 [5/10] Update NavActivities to use useAllWorkflowRuns
  - File: `apps/app/src/client/components/sidebar/NavActivities.tsx`
  - Replace `useQueries` with `useAllWorkflowRuns()`
  - Remove per-project loop (lines 80-93)
  - Map allRuns to activities (join with projects client-side)
  - Update refresh handler: invalidate `workflowKeys.allRuns()` instead of loop

- [x] 4.2 [3/10] Verify useWorkflowMutations invalidation
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts`
  - Check CREATE mutation (line 48): already invalidates `workflowKeys.runs()`
  - Verify this covers `allRuns()` due to hierarchical keys
  - If not, add explicit: `queryClient.invalidateQueries({ queryKey: workflowKeys.allRuns() })`

- [x] 4.3 [5/10] Update useWorkflowWebSocket to invalidate allRuns
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
  - Find run update handler (around line 58-71)
  - After invalidating `workflowKeys.runs()`, add allRuns invalidation
  - Add: `queryClient.invalidateQueries({ queryKey: workflowKeys.allRuns() })`

- [x] 4.4 [3/10] Run type checking and validation
  - Run: `pnpm check-types`
  - Expected: No TypeScript errors
  - Verify imports resolve correctly
  - Check no circular dependencies

#### Completion Notes

- Replaced useQueries loop with single useAllWorkflowRuns() call in NavActivities
- Updated refresh handler to invalidate workflowKeys.allRuns() instead of per-project loop
- Verified mutations already invalidate workflowKeys.runs() which cascades to allRuns()
- WebSocket handler already invalidates workflowKeys.runs() which covers allRuns()
- Added project_id to WorkflowRunListItem type and backend query
- Fixed getAllWorkflowDefinitions to work without user_id filter (single-user system)
- **Backend filtering**: Updated schema to accept comma-separated statuses (e.g., "pending,running,failed")
- Modified WorkflowRunFilters to accept single or array of statuses
- Updated getWorkflowRuns to handle array status filters with Prisma `in` operator
- Sidebar now passes ['pending', 'running', 'failed'] to backend (server-side filtering)
- Type checking passes with no errors

## Testing Strategy

### Unit Tests

No new unit tests required - this is a refactoring that maintains existing behavior with performance optimization.

### Integration Tests

**Query Key Structure**:
- Verify `workflowKeys.allRuns()` returns correct hierarchical key
- Verify `workflowKeys.allDefinitions(status)` includes status in key
- Verify invalidating `workflowKeys.runs()` invalidates both project lists AND allRuns

### Manual Testing

**Cache Behavior**:
- Open sidebar → verify single `/api/workflow-runs` request (no project_id)
- Navigate to project workflows page → verify separate `/api/workflow-runs?project_id=xxx` request
- Verify both caches coexist without conflicts

**Invalidation**:
- Create new workflow run → verify both caches invalidate
- Update run via WebSocket → verify both caches invalidate
- Click refresh in sidebar → verify only allRuns invalidates

## Success Criteria

- [ ] NavActivities makes 1 request instead of N requests
- [ ] GET /api/workflow-runs accepts optional project_id
- [ ] GET /api/workflow-definitions route exists at top level
- [ ] `workflowKeys.allRuns()` and `allDefinitions()` exist
- [ ] useAllWorkflowRuns and useAllWorkflowDefinitions hooks created
- [ ] All mutations properly invalidate allRuns cache
- [ ] Type checking passes with no errors
- [ ] React Query DevTools shows correct query keys
- [ ] No duplicate network requests
- [ ] Existing project pages still work (no breaking changes)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No TypeScript errors

# Build verification
pnpm build
# Expected: Successful build with no errors

# Linting
pnpm lint
# Expected: No linting errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Open browser DevTools → Network tab
3. Navigate to sidebar
4. Verify: Single `/api/workflow-runs` request (no project_id param)
5. Count: Should see 1 request instead of N (where N = number of projects)
6. Navigate to project workflows page
7. Verify: Separate `/api/workflow-runs?project_id=xxx` request
8. Check React Query DevTools:
   - `['workflows', 'runs', 'all']` key exists
   - `['workflows', 'runs', projectId, ...]` keys still exist
9. Test cache invalidation:
   - Create workflow run → both caches invalidate
   - Update run → both caches invalidate
   - Click sidebar refresh → only allRuns invalidates
10. Check console: No errors or warnings

**Feature-Specific Checks:**

- Sidebar shows all workflow runs across all projects
- Workflow runs are correctly joined with project names
- Refresh button in sidebar works
- No performance regression on project pages
- Cache keys are correctly hierarchical

## Implementation Notes

### 1. Backward Compatibility

Making `project_id` optional in existing route maintains backward compatibility. All existing clients continue to work without changes.

### 2. Cache Duplication is Acceptable

Having the same run data in both `allRuns()` and `runsList(projectId)` caches is fine. React Query handles this efficiently, and the simplicity outweighs memory concerns.

### 3. Hierarchical Keys Enable Smart Invalidation

Structure `allRuns()` under `runs()` means:
- Invalidating `runs()` → invalidates allRuns AND all project lists
- Invalidating `allRuns()` → only invalidates user-wide cache
- Invalidating `runsList(projectId)` → only invalidates that project

### 4. Mutation Verification

Most mutations already invalidate `workflowKeys.runs()` which should cascade to `allRuns()`. Verify this works, otherwise add explicit invalidation.

## Dependencies

No new dependencies required - using existing packages:
- `@tanstack/react-query` (already installed)
- Prisma (already installed)
- Existing domain services

## References

- React Query Spec (#13) - Query key patterns and best practices
- TkDodo Blog - Effective React Query Keys
- NavActivities current implementation (useQueries pattern)

## Next Steps

1. Review and approve this spec
2. Run: `/implement-spec 15`
3. Test in browser with Network tab open
4. Verify single request in sidebar
5. Check React Query DevTools for correct keys
6. Mark spec complete: `/move-spec 15 done`
