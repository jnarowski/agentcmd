# Migrate Sessions + Workflows to Zustand Stores

**Status**: draft
**Created**: 2025-11-09
**Package**: apps/app
**Total Complexity**: 152 points
**Phases**: 8
**Tasks**: 47
**Overall Avg Complexity**: 3.2/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Create Workflow Store | 1 | 8 | 8.0/10 | 8/10 |
| Phase 2: Expand Session Store | 1 | 5 | 5.0/10 | 5/10 |
| Phase 3: Update Fetch Strategy | 1 | 6 | 6.0/10 | 6/10 |
| Phase 4: Simplify WebSocket Handlers | 8 | 28 | 3.5/10 | 5/10 |
| Phase 5: Update Components | 14 | 56 | 4.0/10 | 6/10 |
| Phase 6: Backend Routes | 2 | 6 | 3.0/10 | 4/10 |
| Phase 7: Delete React Query Hooks | 9 | 18 | 2.0/10 | 2/10 |
| Phase 8: Cleanup & Testing | 11 | 25 | 2.3/10 | 4/10 |
| **Total** | **47** | **152** | **3.2/10** | **8/10** |

## Overview

Replace React Query hooks with Zustand stores for sessions and workflows to provide a single source of truth and simplify WebSocket real-time updates. This eliminates duplicate fetches (currently fetching once per project) and reduces cache synchronization complexity from 3+ cache operations per WebSocket event to a single store update.

## User Story

As a developer
I want sessions and workflows managed in Zustand stores
So that WebSocket updates are simpler (1 line instead of 3+ cache operations), duplicate fetches are eliminated, and state management follows a consistent pattern for real-time data

## Technical Approach

Atomic migration of both domains simultaneously. Create `workflowStore` for all workflow state (runs + definitions), expand existing `sessionStore` for session lists. Implement dual-fetch strategy: immediate fetch on mount for stale data, then refetch after project sync completes. Simplify WebSocket handlers by replacing `queryClient` operations with direct store updates. Update all components to use store selectors instead of React Query hooks.

## Key Design Decisions

1. **Atomic Migration**: Both sessions and workflows migrated together to avoid mixed state and ensure architectural consistency
2. **Definitions in Store**: Workflow definitions stay in workflowStore (not React Query) for domain cohesion, even though they rarely change
3. **Dual-Fetch Strategy**: Fetch on mount (stale data, instant UX) + refetch after sync (fresh data) balances speed and accuracy
4. **Pure Zustand**: No hybrid React Query + Zustand - stores handle fetch, loading states, and mutations entirely

## Architecture

### File Structure

```
apps/app/src/
├── client/
│   ├── stores/
│   │   └── workflowStore.ts                    # NEW - All workflow state
│   ├── pages/projects/
│   │   ├── sessions/
│   │   │   ├── stores/
│   │   │   │   └── sessionStore.ts             # EXPAND - Add session lists
│   │   │   └── hooks/
│   │   │       ├── useSessionWebSocket.ts      # SIMPLIFY - Remove queryClient
│   │   │       └── useAgentSessions.ts         # DELETE
│   │   └── workflows/
│   │       ├── hooks/
│   │       │   ├── useWorkflowWebSocket.ts     # SIMPLIFY - Remove queryClient
│   │       │   ├── useWorkflowRuns.ts          # DELETE
│   │       │   ├── useWorkflowRun.ts           # DELETE
│   │       │   ├── useWorkflowDefinitions.ts   # DELETE
│   │       │   ├── useWorkflowDefinition.ts    # DELETE
│   │       │   ├── useWorkflowMutations.ts     # DELETE
│   │       │   ├── useArchiveWorkflowDefinition.ts # DELETE
│   │       │   ├── useUnarchiveWorkflowDefinition.ts # DELETE
│   │       │   └── useInngestRunStatus.ts      # DELETE
│   │       ├── ProjectWorkflowsView.tsx        # UPDATE - Use store
│   │       ├── ProjectWorkflowsManage.tsx      # UPDATE - Use store
│   │       ├── WorkflowRunDetail.tsx           # UPDATE - Use store
│   │       └── WorkflowDefinitionView.tsx      # UPDATE - Use store
│   ├── layouts/
│   │   └── ProtectedLayout.tsx                 # UPDATE - Dual fetch
│   └── components/
│       └── sidebar/
│           └── NavActivities.tsx               # UPDATE - Use both stores
└── server/
    └── routes/
        ├── workflows.ts                        # UPDATE - Optional project_id
        └── sessions.ts                         # Already supports optional ✓
```

### Integration Points

**Stores (State Management)**:
- `workflowStore.ts` (new) - Runs, definitions, loading states, mutations, WebSocket updates
- `sessionStore.ts` (expand) - Add session lists, fetchAllSessions, list management

**WebSocket Handlers**:
- `useWorkflowWebSocket.ts` - Remove queryClient, replace cache updates with store calls
- `useSessionWebSocket.ts` - Remove queryClient, sessionKeys, projectKeys imports

**Components (7 files)**:
- Workflow views (4 files) - Replace useQuery hooks with store selectors
- Session views (1 file) - Remove invalidation calls
- NavActivities (1 file) - Aggregate from stores instead of useQueries
- Mutation components (~5 files) - Replace useMutation with store actions

**Backend Routes**:
- `workflows.ts` - Make project_id optional for cross-project queries

## Implementation Details

### 1. Workflow Store

Create centralized Zustand store managing all workflow state. Uses Maps for fast lookup by ID (`runsById`, `definitionsById`) and arrays for lists. Includes loading states, error handling, and all mutations (create, pause, resume, cancel, archive). Selectors handle client-side filtering by project, status, search term, and definition ID.

**Key Points**:
- Immutable updates using `set((s) => ({ ...s }))` pattern
- Separate list (array) and detail (Map) storage for performance
- All API calls encapsulated in store actions
- No external queryClient dependencies

### 2. Session Store Expansion

Expand existing `sessionStore` with cross-project session state. Add `allSessions` array, `isLoadingSessions` flag, and actions for fetching/updating session lists. Current session state (messages, streaming) remains unchanged - only adding list management capabilities.

**Key Points**:
- Reuse existing store instead of creating new one
- Separate loading states for current session vs session lists
- Selector for filtering sessions by project
- Backwards compatible with existing session message functionality

### 3. Dual-Fetch Strategy

Implement two-phase fetch: (1) Immediate on mount for instant UX with stale data, (2) Refetch after project sync completes for fresh data. Use `syncComplete` flag from `useSyncProjects` to trigger second fetch. All three resources (projects, sessions, workflows) refetch in parallel post-sync.

**Key Points**:
- User sees stale data within ~50ms (no loading spinner)
- Sync takes 2-3 seconds, then data refreshes automatically
- Promise.all for parallel fetching (no waterfalls)
- Projects refetch handled by existing React Query

### 4. WebSocket Handler Simplification

Remove all `queryClient.setQueryData` and `invalidateQueries` calls from WebSocket handlers. Replace with single-line store updates: `useWorkflowStore.getState().updateRun(runId, changes)`. Eliminate debounced invalidation "safety net" - no longer needed with direct store updates. Keep toast notifications for user feedback.

**Key Points**:
- Handlers go from 30+ lines to 3-5 lines each
- No cache key management or staleness concerns
- Store mutations trigger re-renders automatically via Zustand subscriptions
- Simpler debugging - direct state inspection instead of cache archaeology

### 5. Component Updates

Replace all `useQuery` and `useMutation` hooks with store selectors and actions. Use memoized selectors for filtering (`selectProjectRuns`, `selectProjectDefs`). Replace mutation patterns (`mutation.mutate`) with async/await store actions. Loading states come from `useWorkflowStore(s => s.isLoading)` instead of query destructuring.

**Key Points**:
- Pattern: `const runs = useWorkflowStore(selectProjectRuns(projectId, { search }))`
- Mutations: `await createWorkflow(input)` instead of callback-based mutate
- Error handling moves from `onError` callbacks to try/catch blocks
- Detail views fetch on mount if not in store

### 6. Backend Route Updates

Make `project_id` optional in workflow runs filter schema to support cross-project queries. When omitted, return all runs for authenticated user. Session routes already support this pattern - no changes needed.

**Key Points**:
- Change Zod schema from `.cuid()` to `.cuid().optional()`
- Query filter: `project_id: project_id || undefined`
- Maintains security - always filtered by user ID
- No breaking changes to existing API consumers

## Files to Create/Modify

### New Files (1)

1. `apps/app/src/client/stores/workflowStore.ts` - Centralized Zustand store for all workflow state

### Modified Files (18)

1. `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts` - Add session list state and actions
2. `apps/app/src/client/layouts/ProtectedLayout.tsx` - Implement dual-fetch strategy
3. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts` - Remove queryClient, simplify handlers
4. `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Remove queryClient, remove invalidations
5. `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx` - Use workflowStore selectors
6. `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsManage.tsx` - Use workflowStore for definitions and mutations
7. `apps/app/src/client/pages/projects/workflows/WorkflowRunDetail.tsx` - Use workflowStore for run and definition detail
8. `apps/app/src/client/pages/projects/workflows/WorkflowDefinitionView.tsx` - Use workflowStore selectors
9. `apps/app/src/client/pages/projects/sessions/NewSession.tsx` - Remove invalidation calls
10. `apps/app/src/client/components/sidebar/NavActivities.tsx` - Aggregate from both stores
11. `apps/app/src/server/routes/workflows.ts` - Make project_id optional
12. `apps/app/src/client/pages/projects/hooks/useProjects.ts` - Remove legacy withSessions
13. Additional components with workflow mutations (~5 files)

### Deleted Files (9)

1. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowRuns.ts`
2. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowRun.ts`
3. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinitions.ts`
4. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinition.ts`
5. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts`
6. `apps/app/src/client/pages/projects/workflows/hooks/useArchiveWorkflowDefinition.ts`
7. `apps/app/src/client/pages/projects/workflows/hooks/useUnarchiveWorkflowDefinition.ts`
8. `apps/app/src/client/pages/projects/workflows/hooks/useInngestRunStatus.ts`
9. `apps/app/src/client/pages/projects/sessions/hooks/useAgentSessions.ts`

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Create Workflow Store

**Phase Complexity**: 8 points (avg 8.0/10)

<!-- prettier-ignore -->
- [ ] 1.1 [8/10] Create `apps/app/src/client/stores/workflowStore.ts` with full implementation
  - State: runs[], runsById Map, definitions[], definitionsById Map, isLoading, error
  - Actions: fetchAll, fetchRun, fetchDefinition, updateRun, updateStep, addEvent, addArtifact
  - Mutations: createWorkflow, pauseWorkflow, resumeWorkflow, cancelWorkflow, archiveDefinition, unarchiveDefinition
  - Selectors: selectProjectRuns(projectId, filter), selectProjectDefs(projectId, status), selectRunsByDefinition(definitionId)
  - File: `apps/app/src/client/stores/workflowStore.ts`
  - Verify: TypeScript compiles, store exports correctly

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Expand Session Store

**Phase Complexity**: 5 points (avg 5.0/10)

<!-- prettier-ignore -->
- [ ] 2.1 [5/10] Add session list state and actions to existing sessionStore
  - Add to interface: allSessions[], isLoadingSessions, fetchAllSessions, addSessionToList, updateSessionInList, deleteSessionFromList
  - Implement fetchAllSessions with API call to /api/sessions
  - Add selector: selectProjectSessions(projectId)
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`
  - Verify: Existing session functionality unchanged, new exports available

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Update Fetch Strategy in ProtectedLayout

**Phase Complexity**: 6 points (avg 6.0/10)

<!-- prettier-ignore -->
- [ ] 3.1 [6/10] Implement dual-fetch strategy in ProtectedLayout
  - Import useSessionStore, useWorkflowStore
  - Create fetchAllData function calling fetchProjects, fetchSessions, fetchWorkflows in parallel
  - Trigger 1: Call fetchAllData + syncProjects on mount
  - Trigger 2: Call fetchAllData when syncComplete becomes true
  - File: `apps/app/src/client/layouts/ProtectedLayout.tsx`
  - Test: Verify fetch happens on mount, then again after sync completes (~2-3s later)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Simplify WebSocket Handlers

**Phase Complexity**: 28 points (avg 3.5/10)

<!-- prettier-ignore -->
- [ ] 4.1 [2/10] Remove queryClient import from useWorkflowWebSocket
  - Delete: `import { useQueryClient } from "@tanstack/react-query";`
  - Delete: `const queryClient = useQueryClient();`
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] 4.2 [2/10] Remove debouncedInvalidate function from useWorkflowWebSocket
  - Delete lines 27-40 (debounced invalidation logic)
  - This safety net is no longer needed with direct store updates
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] 4.3 [5/10] Replace handleRunUpdated with store update
  - Remove all queryClient.setQueryData and invalidateQueries calls
  - Replace with: `useWorkflowStore.getState().updateRun(run_id, changes)`
  - Keep toast notifications for completed/failed status
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] 4.4 [4/10] Replace handleStepUpdated with store update
  - Remove queryClient operations
  - Replace with: `useWorkflowStore.getState().updateStep(run_id, step_id, changes)`
  - Keep toast for failed steps
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] 4.5 [3/10] Replace handleEventCreated with store update
  - Replace with: `useWorkflowStore.getState().addEvent(run_id, event)`
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] 4.6 [3/10] Replace handleArtifactCreated with store update
  - Replace with: `useWorkflowStore.getState().addArtifact(run_id, artifact)`
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] 4.7 [4/10] Remove queryClient from useSessionWebSocket
  - Delete imports: useQueryClient, sessionKeys, projectKeys
  - Delete: `const queryClient = useQueryClient();`
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
- [ ] 4.8 [5/10] Remove all queryClient operations from useSessionWebSocket
  - Delete all queryClient.setQueryData calls (lines 173-243)
  - Delete all queryClient.invalidateQueries calls (lines 162-169)
  - Keep existing useSessionStore.getState() calls (already correct)
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 5: Update Components to Use Stores

**Phase Complexity**: 56 points (avg 4.0/10)

<!-- prettier-ignore -->
- [ ] 5.1 [4/10] Update ProjectWorkflowsView imports and hooks
  - Remove: useWorkflowRuns, useWorkflowDefinitions imports
  - Add: import { useWorkflowStore, selectProjectRuns, selectProjectDefs }
  - Replace hooks with selectors
  - File: `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx`
- [ ] 5.2 [5/10] Update ProjectWorkflowsManage imports and hooks
  - Remove: useWorkflowDefinitions, useArchiveWorkflowDefinition, useUnarchiveWorkflowDefinition
  - Add: import { useWorkflowStore, selectProjectDefs }
  - Use store actions: archiveDefinition, unarchiveDefinition
  - File: `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsManage.tsx`
- [ ] 5.3 [6/10] Replace mutations in ProjectWorkflowsManage with store actions
  - Replace archiveMutation.mutate with await archiveDefinition(defId)
  - Replace unarchiveMutation.mutate with await unarchiveDefinition(defId)
  - Add try/catch for error handling, toast on success/error
  - File: `apps/app/src/client/pages/projects/workflows/ProjectWorkflowsManage.tsx`
- [ ] 5.4 [5/10] Update WorkflowRunDetail imports and hooks
  - Remove: useWorkflowRun, useWorkflowDefinition imports
  - Add: import { useWorkflowStore }
  - Use runsById Map and definitionsById Map for detail data
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetail.tsx`
- [ ] 5.5 [4/10] Add fetch-on-mount logic to WorkflowRunDetail
  - Add useEffect to fetch run if not in store
  - Condition: if (runId && !run) { useWorkflowStore.getState().fetchRun(runId) }
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetail.tsx`
- [ ] 5.6 [4/10] Update WorkflowDefinitionView imports and hooks
  - Remove: useWorkflowDefinition, useWorkflowRuns imports
  - Add: import { useWorkflowStore, selectRunsByDefinition }
  - Use selectors for definition and executions
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowDefinitionView.tsx`
- [ ] 5.7 [3/10] Add fetch-on-mount logic to WorkflowDefinitionView
  - Add useEffect to fetch definition if not in store
  - Condition: if (definitionId && !definition)
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowDefinitionView.tsx`
- [ ] 5.8 [3/10] Update NewSession to remove query invalidations
  - Remove imports: sessionKeys, projectKeys
  - Delete queryClient.invalidateQueries calls (lines ~66-74)
  - Sessions auto-added via WebSocket - no manual update needed
  - File: `apps/app/src/client/pages/projects/sessions/NewSession.tsx`
- [ ] 5.9 [6/10] Update NavActivities to aggregate from stores
  - Remove: useSessions, useQueries imports
  - Add: import useSessionStore, useWorkflowStore
  - Get data: sessions from sessionStore, workflowRuns from workflowStore
  - File: `apps/app/src/client/components/sidebar/NavActivities.tsx`
- [ ] 5.10 [4/10] Create aggregation logic in NavActivities
  - useMemo to combine session and workflow activities
  - Map to common shape with type, id, timestamp, data
  - Sort by timestamp desc, slice(0, 20)
  - File: `apps/app/src/client/components/sidebar/NavActivities.tsx`
- [ ] 5.11 [3/10] Find all components using useCreateWorkflow mutation
  - Search codebase for useCreateWorkflow, useWorkflowMutations imports
  - List files that need mutation pattern updates
  - Typically in NewRunDialog or similar components
- [ ] 5.12 [4/10] Replace mutation pattern in workflow creation components
  - Remove: const createMutation = useCreateWorkflow()
  - Add: const createWorkflow = useWorkflowStore(s => s.createWorkflow)
  - Replace: createMutation.mutate(input, { onSuccess }) with await createWorkflow(input)
  - Add try/catch with toast.success/toast.error
- [ ] 5.13 [3/10] Replace mutation pattern for pause/resume/cancel workflows
  - Find components using these mutations
  - Replace with store actions: pauseWorkflow, resumeWorkflow, cancelWorkflow
  - Update to async/await pattern with error handling
- [ ] 5.14 [2/10] Verify all workflow components compile
  - Run TypeScript compiler on workflow pages directory
  - Fix any type errors from hook replacements
  - Command: `pnpm check-types`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 6: Update Backend Routes

**Phase Complexity**: 6 points (avg 3.0/10)

<!-- prettier-ignore -->
- [ ] 6.1 [4/10] Make project_id optional in workflows route schema
  - Change workflowRunFiltersSchema project_id from .cuid() to .cuid().optional()
  - Update handler to use: project_id: project_id || undefined
  - Maintains user_id security filter
  - File: `apps/app/src/server/routes/workflows.ts`
  - Line: ~122-128
- [ ] 6.2 [2/10] Verify sessions route already supports optional project_id
  - Confirm sessions.ts route has project_id as optional
  - No changes needed - already implemented
  - File: `apps/app/src/server/routes/sessions.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 7: Delete React Query Hooks

**Phase Complexity**: 18 points (avg 2.0/10)

<!-- prettier-ignore -->
- [ ] 7.1 [2/10] Delete useWorkflowRuns.ts
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowRuns.ts`
- [ ] 7.2 [2/10] Delete useWorkflowRun.ts
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowRun.ts`
- [ ] 7.3 [2/10] Delete useWorkflowDefinitions.ts
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinitions.ts`
- [ ] 7.4 [2/10] Delete useWorkflowDefinition.ts
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinition.ts`
- [ ] 7.5 [2/10] Delete useWorkflowMutations.ts
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts`
- [ ] 7.6 [2/10] Delete useArchiveWorkflowDefinition.ts
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useArchiveWorkflowDefinition.ts`
- [ ] 7.7 [2/10] Delete useUnarchiveWorkflowDefinition.ts
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useUnarchiveWorkflowDefinition.ts`
- [ ] 7.8 [2/10] Delete useInngestRunStatus.ts
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useInngestRunStatus.ts`
- [ ] 7.9 [2/10] Delete useAgentSessions.ts
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useAgentSessions.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 8: Cleanup & Testing

**Phase Complexity**: 25 points (avg 2.3/10)

<!-- prettier-ignore -->
- [ ] 8.1 [3/10] Remove legacy projectKeys.withSessions from useProjects
  - Delete projectKeys.withSessions() query key definition if exists
  - Delete useProjectsWithSessions() hook if exists
  - These were backward-compat for sessions - no longer needed
  - File: `apps/app/src/client/pages/projects/hooks/useProjects.ts`
- [ ] 8.2 [2/10] Search codebase for remaining workflow/session query usage
  - Search for: import.*useQuery.*workflow
  - Search for: import.*useQuery.*session
  - Search for: import.*useMutation.*workflow
  - Verify all found imports are in non-workflow/session domains
- [ ] 8.3 [2/10] TypeScript compilation check
  - Run: `pnpm check-types`
  - Expected: No type errors
  - Fix any errors found before proceeding
- [ ] 8.4 [3/10] Test workflow list view renders
  - Start dev server: `pnpm dev`
  - Navigate to workflows page
  - Verify: Workflow runs and definitions display
  - Check console: No errors
- [ ] 8.5 [3/10] Test workflow detail view and WebSocket updates
  - Navigate to workflow run detail page
  - Create or trigger workflow run
  - Verify: Real-time status updates appear
  - Check: Steps update, events appear, no console errors
- [ ] 8.6 [3/10] Test workflow mutations
  - Test: Create new workflow run
  - Test: Pause workflow (if running)
  - Test: Resume workflow
  - Test: Cancel workflow
  - Test: Archive definition
  - Verify: Toast notifications appear, UI updates
- [ ] 8.7 [2/10] Test session list renders
  - Navigate to sessions page or sidebar
  - Verify: Sessions display
  - Check console: No errors
- [ ] 8.8 [2/10] Test session creation
  - Create new session
  - Verify: Session appears in list immediately
  - No invalidation errors in console
- [ ] 8.9 [3/10] Test NavActivities aggregation
  - Navigate to activities component
  - Verify: Shows both sessions and workflows
  - Check: Sorted by timestamp
  - Verify: Limit to 20 items
- [ ] 8.10 [4/10] Test fetch timing (critical)
  - Clear browser cache, reload app
  - Observe network tab: Immediate fetch for sessions/workflows
  - Wait ~2-3 seconds: Project sync completes
  - Observe: Second fetch for sessions/workflows triggers
  - Verify: No duplicate fetches before sync completes
- [ ] 8.11 [2/10] Manual verification checklist
  - Page refresh works (data reloads)
  - Navigate between projects (data filters correctly)
  - No infinite loops or memory leaks
  - All toasts appear for mutations

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`workflowStore.test.ts`** - Test store actions and selectors:

```typescript
describe('workflowStore', () => {
  it('should fetch all workflows and definitions', async () => {
    // Test fetchAll populates runs and definitions
  });

  it('should update run via WebSocket', () => {
    // Test updateRun immutably updates state
  });

  it('should filter runs by project', () => {
    // Test selectProjectRuns selector
  });

  it('should handle mutations', async () => {
    // Test createWorkflow, pauseWorkflow, etc.
  });
});
```

**`sessionStore.test.ts`** - Test session list additions:

```typescript
describe('sessionStore session lists', () => {
  it('should fetch all sessions', async () => {
    // Test fetchAllSessions populates allSessions
  });

  it('should filter sessions by project', () => {
    // Test selectProjectSessions selector
  });

  it('should update session in list', () => {
    // Test updateSessionInList immutability
  });
});
```

### Integration Tests

Test WebSocket → Store → Component flow:
1. Mock WebSocket connection
2. Send RUN_UPDATED event
3. Verify store updated
4. Verify component re-rendered with new data

Test dual-fetch timing:
1. Mock useSyncProjects to control syncComplete
2. Verify fetchAllData called on mount
3. Set syncComplete to true
4. Verify fetchAllData called again

### E2E Tests

**`workflow-store-migration.e2e.test.ts`** - End-to-end verification:

1. Create workflow run
2. Watch real-time updates in UI
3. Pause/resume/cancel workflow
4. Archive definition
5. Verify NavActivities updates

## Success Criteria

- [ ] All TypeScript compiles with no errors
- [ ] No React Query imports in workflow/session components
- [ ] WebSocket handlers use store.getState() (no queryClient)
- [ ] Dual-fetch works: on mount + after sync completes
- [ ] NavActivities aggregates from both stores correctly
- [ ] Workflow mutations work (create, pause, cancel, archive)
- [ ] Session creation works without invalidation errors
- [ ] Real-time updates appear instantly (WebSocket → Store)
- [ ] Page refresh reloads data correctly
- [ ] No duplicate fetches (screenshot issue resolved)
- [ ] All 9 React Query hook files deleted
- [ ] Backend supports cross-project queries (optional project_id)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: 0 errors

# Linting
pnpm lint
# Expected: No errors in modified files

# Build verification
pnpm build
# Expected: Successful build, no errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects/<project-id>/workflows`
3. Verify: Workflows load immediately (stale data)
4. Wait 2-3s: Data refreshes after sync
5. Create workflow: Should appear in list instantly
6. WebSocket test: Run workflow, watch status update in real-time
7. Navigate to activities: Both sessions and workflows appear
8. Check console: No errors, no warnings

**Feature-Specific Checks:**

- Open Network tab, reload: See dual-fetch pattern (immediate + post-sync)
- Verify no per-project fetches (no more screenshot issue)
- WebSocket updates: Watch run status change without manual refresh
- Mutations: Create/pause/cancel workflows, verify toasts appear
- NavActivities: Shows max 20 items, sorted by timestamp
- Session creation: No invalidation errors in console

## Implementation Notes

### 1. Immutability is Critical

Zustand requires immutable updates. Always return new objects/arrays:

```typescript
// ✅ CORRECT
set((s) => ({
  runs: s.runs.map(r => r.id === id ? { ...r, ...updates } : r)
}));

// ❌ WRONG - Mutation
set((s) => {
  s.runs.find(r => r.id === id).status = 'completed';
  return s;
});
```

### 2. Map vs Array for Detail Storage

Use Map for detail views (fast O(1) lookup by ID), arrays for lists (easy filtering):

```typescript
runsById: new Map<string, WorkflowRunDetail>();  // For /runs/:id pages
runs: WorkflowRunListItem[];  // For /runs list pages
```

### 3. Selector Memoization

Selectors create new functions each call - wrap in useMemo in components if passing complex filters:

```typescript
// In component
const selector = useMemo(
  () => selectProjectRuns(projectId, { search, status }),
  [projectId, search, status]
);
const runs = useWorkflowStore(selector);
```

### 4. Fetch Timing Edge Case

If user navigates to detail page before global fetch completes, component-level fetchRun ensures data loads. Store deduplicates if already fetching.

### 5. WebSocket Event Ordering

WebSocket events may arrive out of order. Store updates are idempotent - applying same update twice is safe.

## Dependencies

- zustand (already installed)
- No new dependencies required

## References

- Zustand docs: https://docs.pmnd.rs/zustand/getting-started/introduction
- Existing sessionStore pattern: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`
- WebSocket infrastructure: `apps/app/src/server/websocket/`
- React Query migration guide: https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose (for understanding what we're removing)

## Next Steps

1. Create workflowStore with all state, actions, selectors (Phase 1)
2. Expand sessionStore with list management (Phase 2)
3. Implement dual-fetch in ProtectedLayout (Phase 3)
4. Simplify WebSocket handlers - remove queryClient (Phase 4)
5. Update all components to use stores (Phase 5)
6. Make backend routes support cross-project queries (Phase 6)
7. Delete all 9 React Query hook files (Phase 7)
8. Comprehensive testing and verification (Phase 8)
