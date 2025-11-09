# Standardize Query Keys - Feature-Based Architecture

**Status**: draft
**Created**: 2025-11-09
**Package**: apps/app
**Total Complexity**: 118 points
**Phases**: 6
**Tasks**: 27
**Overall Avg Complexity**: 4.4/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Extract to queryKeys Files | 6 | 24 | 4.0/10 | 5/10 |
| Phase 2: Standardize Patterns | 5 | 28 | 5.6/10 | 7/10 |
| Phase 3: Create Workflow Keys | 3 | 17 | 5.7/10 | 8/10 |
| Phase 4: Update Workflow Usage | 8 | 32 | 4.0/10 | 6/10 |
| Phase 5: Fix Component Inline Keys | 5 | 10 | 2.0/10 | 3/10 |
| Phase 6: Verify & Test | 3 | 7 | 2.3/10 | 3/10 |
| **Total** | **30** | **118** | **3.9/10** | **8/10** |

## Overview

Standardize React Query key management across the codebase by extracting query key factories into dedicated `queryKeys.ts` files per feature, following TanStack Query best practices. This eliminates 20+ inline workflow keys, fixes pattern inconsistencies, and establishes a maintainable feature-based architecture for query cache management.

## User Story

As a developer
I want consistent, centralized query key management per feature
So that cache invalidation is predictable, keys are type-safe, and the codebase follows industry best practices

## Technical Approach

Follow TkDodo's (React Query maintainer) recommendation for feature-based query key organization. Extract existing key factories from hook files into dedicated `queryKeys.ts` files co-located with their features. Create missing `workflowKeys` factory to eliminate 20+ inline keys. Standardize all factories to use hierarchical patterns (lists/details helpers) where semantically appropriate, while keeping git keys flat due to their diverse operation types. All changes in single PR for cohesive review.

## Key Design Decisions

1. **Feature-based, not centralized**: Each feature gets its own `queryKeys.ts` file co-located with hooks, following TkDodo's recommendation. Avoids single monolithic file that causes merge conflicts and tight coupling.

2. **Hierarchical pattern with pragmatic exceptions**: Standardize to sessionKeys pattern (lists/details helpers) for resources with clear list/detail semantics. Keep gitKeys flat since git operations don't fit list/detail model (status, diff, commit, stash are different operation types, not variations of same resource).

3. **Expand factories for component usage**: Add `projectKeys.specs/branches` and `sessionKeys.file()` to eliminate remaining inline keys in components. Centralizes all keys in their respective factories.

4. **Fix projectKeys redundancy**: Make `list(filters?)` accept optional filters like sessionKeys, matching the pattern. Currently `lists()` and `list()` are redundant (both return identical keys), but adding optional filters future-proofs the design.

## Architecture

### File Structure
```
apps/app/src/client/
├── hooks/
│   └── queryKeys.ts (NEW - settingsKeys)
├── pages/projects/
│   ├── hooks/
│   │   ├── queryKeys.ts (NEW - projectKeys extracted)
│   │   └── useProjects.ts (import from ./queryKeys)
│   ├── sessions/hooks/
│   │   ├── queryKeys.ts (NEW - sessionKeys + slashCommandKeys)
│   │   ├── useAgentSessions.ts (import from ./queryKeys)
│   │   └── useSlashCommands.ts (import from ./queryKeys)
│   ├── git/hooks/
│   │   ├── queryKeys.ts (NEW - gitKeys extracted)
│   │   └── useGitOperations.ts (import from ./queryKeys)
│   ├── files/hooks/
│   │   ├── queryKeys.ts (NEW - fileKeys extracted)
│   │   └── useFiles.ts (import from ./queryKeys)
│   └── workflows/hooks/
│       ├── queryKeys.ts (NEW - workflowKeys created)
│       ├── useWorkflowDefinitions.ts (use workflowKeys)
│       ├── useWorkflowRuns.ts (use workflowKeys)
│       └── [...8 more files to update]
```

### Integration Points

**Query Key Factories (6 new files)**:
- `client/hooks/queryKeys.ts` - settingsKeys
- `pages/projects/hooks/queryKeys.ts` - projectKeys (expanded)
- `pages/projects/sessions/hooks/queryKeys.ts` - sessionKeys + slashCommandKeys
- `pages/projects/git/hooks/queryKeys.ts` - gitKeys (flat pattern)
- `pages/projects/files/hooks/queryKeys.ts` - fileKeys
- `pages/projects/workflows/hooks/queryKeys.ts` - workflowKeys (new)

**Hook Files (6 files import from queryKeys)**:
- `useProjects.ts`, `useAgentSessions.ts`, `useSlashCommands.ts`
- `useGitOperations.ts`, `useFiles.ts`, `useSettings.ts`

**Workflow Files (10 files use workflowKeys)**:
- 5 query hooks, 3 mutation hooks, 1 WebSocket handler, 1 component

**Components (5 files fix inline keys)**:
- Replace inline keys with factory imports

## Implementation Details

### 1. Extract Existing Keys to Dedicated Files

Each feature gets a `queryKeys.ts` file with its factory exported. Hook files import from relative `./queryKeys` path.

**Key Points**:
- One file per feature directory (not one global file)
- Export factory as named export: `export const projectKeys = { ... }`
- Import in hooks: `import { projectKeys } from './queryKeys'`
- Maintains co-location with feature code

### 2. Standardize Factory Patterns

**projectKeys** gets hierarchical structure with optional filters:
```typescript
lists: () => [...projectKeys.all, "list"] as const,
list: (filters?: ProjectFilters) => [...projectKeys.lists(), filters] as const,
```

**sessionKeys** gets expanded with `file()` method for SessionFileViewer.

**gitKeys** keeps flat pattern but adds grouping comments (status/diffs/history/stash/PR).

**Key Points**:
- Hierarchical (lists/details) for resources with clear list/detail semantics
- Flat for diverse operations (git) that don't fit the model
- All use `as const` for type safety
- All extend from base `all` key

### 3. Create Workflow Keys Factory

New file with complete hierarchy for definitions and runs:

```typescript
export const workflowKeys = {
  all: ['workflows'] as const,
  definitions: () => [...workflowKeys.all, 'definitions'] as const,
  definitionsList: (projectId: string, status?: string) =>
    [...workflowKeys.definitions(), projectId, status] as const,
  definition: (id: string) => [...workflowKeys.definitions(), id] as const,
  runs: () => [...workflowKeys.all, 'runs'] as const,
  runsList: (projectId: string, status?: string, search?: string, definitionId?: string) =>
    [...workflowKeys.runs(), projectId, status, search, definitionId] as const,
  run: (id: string) => [...workflowKeys.runs(), id] as const,
  inngestStatus: (runId: string) => [...workflowKeys.run(runId), 'inngest-status'] as const,
};
```

**Key Points**:
- Replaces 20+ inline keys across 10 files
- Fixes `useWorkflowRuns` filter object bug (destructure to primitives)
- Enables granular cache invalidation (all workflows, runs for project, single run)
- Matches sessionKeys pattern for consistency

### 4. Update All Imports and Usage

Replace every inline workflow key with workflowKeys factory call. Update components to use expanded projectKeys and sessionKeys.

**Key Points**:
- 10 workflow files updated
- 5 component files updated
- Fix over-invalidation in archive/unarchive (specify projectId)
- Fix WebSocket handler (8+ inline keys)

## Files to Create/Modify

### New Files (6)

1. `apps/app/src/client/hooks/queryKeys.ts` - settingsKeys factory
2. `apps/app/src/client/pages/projects/hooks/queryKeys.ts` - projectKeys (extracted + expanded)
3. `apps/app/src/client/pages/projects/sessions/hooks/queryKeys.ts` - sessionKeys + slashCommandKeys
4. `apps/app/src/client/pages/projects/git/hooks/queryKeys.ts` - gitKeys (extracted)
5. `apps/app/src/client/pages/projects/files/hooks/queryKeys.ts` - fileKeys (extracted)
6. `apps/app/src/client/pages/projects/workflows/hooks/queryKeys.ts` - workflowKeys (new)

### Modified Files (34)

**Hook files importing from queryKeys (6)**:
1. `apps/app/src/client/pages/projects/hooks/useProjects.ts` - Import projectKeys
2. `apps/app/src/client/pages/projects/sessions/hooks/useAgentSessions.ts` - Import sessionKeys
3. `apps/app/src/client/pages/projects/sessions/hooks/useSlashCommands.ts` - Import slashCommandKeys
4. `apps/app/src/client/pages/projects/git/hooks/useGitOperations.ts` - Import gitKeys
5. `apps/app/src/client/pages/projects/files/hooks/useFiles.ts` - Import fileKeys
6. `apps/app/src/client/hooks/useSettings.ts` - Import settingsKeys

**Workflow hooks using workflowKeys (10)**:
7. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinitions.ts` - Use workflowKeys.definitionsList
8. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinition.ts` - Use workflowKeys.definition
9. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowRuns.ts` - Use workflowKeys.runsList + fix filter bug
10. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowRun.ts` - Use workflowKeys.run
11. `apps/app/src/client/pages/projects/workflows/hooks/useInngestRunStatus.ts` - Use workflowKeys.inngestStatus
12. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts` - Use workflowKeys (6 invalidations)
13. `apps/app/src/client/pages/projects/workflows/hooks/useArchiveWorkflowDefinition.ts` - Use workflowKeys, fix over-invalidation
14. `apps/app/src/client/pages/projects/workflows/hooks/useUnarchiveWorkflowDefinition.ts` - Use workflowKeys, fix over-invalidation
15. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts` - Use workflowKeys (8+ inline keys)
16. `apps/app/src/client/pages/projects/workflows/components/WorkflowOnboardingDialog.tsx` - Use workflowKeys

**Components using expanded factories (5)**:
17. `apps/app/src/client/pages/projects/git/ProjectSourceControl.tsx` - Use gitKeys.status()
18. `apps/app/src/client/pages/projects/workflows/components/NewRunDialog.tsx` - Use projectKeys.specs/branches (2 keys)
19. `apps/app/src/client/pages/projects/sessions/components/SessionFileViewer.tsx` - Use sessionKeys.file()
20. `apps/app/src/client/components/sidebar/NavActivities.tsx` - Use workflowKeys.runsList()

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Extract Keys to queryKeys.ts Files

**Phase Complexity**: 24 points (avg 4.0/10)

<!-- prettier-ignore -->
- [ ] 1.1 [4/10] Create settingsKeys factory
  - Create new file with simple factory: `all: ['settings'] as const`
  - File: `apps/app/src/client/hooks/queryKeys.ts`
  - Export as named export

- [ ] 1.2 [4/10] Extract projectKeys from useProjects.ts
  - Create new file, copy projectKeys object (lines 22-31 from useProjects.ts)
  - Export projectKeys as named export
  - File: `apps/app/src/client/pages/projects/hooks/queryKeys.ts`

- [ ] 1.3 [4/10] Extract sessionKeys and slashCommandKeys
  - Create new file, copy both factories
  - sessionKeys from useAgentSessions.ts (lines 16-32)
  - slashCommandKeys from useSlashCommands.ts (lines 7-12)
  - Export both as named exports
  - File: `apps/app/src/client/pages/projects/sessions/hooks/queryKeys.ts`

- [ ] 1.4 [4/10] Extract gitKeys from useGitOperations.ts
  - Create new file, copy gitKeys object (lines 23-36)
  - Export as named export
  - File: `apps/app/src/client/pages/projects/git/hooks/queryKeys.ts`

- [ ] 1.5 [3/10] Extract fileKeys from useFiles.ts
  - Create new file, copy fileKeys object (lines 9-13)
  - Export as named export
  - File: `apps/app/src/client/pages/projects/files/hooks/queryKeys.ts`

- [ ] 1.6 [5/10] Update hook files to import from queryKeys.ts
  - Add imports to 6 hook files: `import { <factory> } from './queryKeys'`
  - Remove old factory definitions from hook files
  - Files: useProjects.ts, useAgentSessions.ts, useSlashCommands.ts, useGitOperations.ts, useFiles.ts, useSettings.ts
  - Run: `pnpm check-types` to verify imports work

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Standardize Factory Patterns

**Phase Complexity**: 28 points (avg 5.6/10)

<!-- prettier-ignore -->
- [ ] 2.1 [7/10] Refactor projectKeys to hierarchical pattern with expansions
  - Add optional filters parameter to `list()`: `list: (filters?: ProjectFilters) =>`
  - Add new methods: `specs: (id) => [...projectKeys.detail(id), "specs"]`
  - Add new methods: `branches: (id) => [...projectKeys.detail(id), "branches"]`
  - Keep `withSessions()` and `sync()` as special queries
  - File: `apps/app/src/client/pages/projects/hooks/queryKeys.ts`
  - Verify pattern matches sessionKeys style

- [ ] 2.2 [4/10] Add file() method to sessionKeys
  - Add: `file: (sessionId: string) => [...sessionKeys.all, "file", sessionId] as const`
  - File: `apps/app/src/client/pages/projects/sessions/hooks/queryKeys.ts`

- [ ] 2.3 [5/10] Refactor gitKeys with grouping comments
  - Keep flat structure (don't force lists/details)
  - Add comments grouping keys by purpose: "// Status & basic info", "// Diffs & changes", "// History & commits", "// Stash operations", "// PR data"
  - Verify all keys extend from gitKeys.all
  - File: `apps/app/src/client/pages/projects/git/hooks/queryKeys.ts`

- [ ] 2.4 [6/10] Verify fileKeys and slashCommandKeys patterns
  - Check both use hierarchical pattern (projects() → project(id))
  - Add `as const` if missing anywhere
  - Files: `apps/app/src/client/pages/projects/files/hooks/queryKeys.ts`, `apps/app/src/client/pages/projects/sessions/hooks/queryKeys.ts`

- [ ] 2.5 [6/10] Test all standardized factories
  - Run: `pnpm check-types`
  - Verify no TypeScript errors from refactored keys
  - Check existing hook usage still works with standardized patterns

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Create Workflow Keys Factory

**Phase Complexity**: 17 points (avg 5.7/10)

<!-- prettier-ignore -->
- [ ] 3.1 [8/10] Create workflowKeys factory
  - Create new file with complete hierarchical structure
  - Include: all, definitions(), definitionsList(projectId, status?), definition(id)
  - Include: runs(), runsList(projectId, status?, search?, definitionId?), run(id)
  - Include: inngestStatus(runId) as sub-resource of run
  - All keys use `as const` for type safety
  - File: `apps/app/src/client/pages/projects/workflows/hooks/queryKeys.ts`
  - Reference sessionKeys pattern for consistency

- [ ] 3.2 [5/10] Document workflowKeys structure
  - Add JSDoc comments explaining hierarchy
  - Document runsList parameters (status, search, definitionId all optional)
  - Note: destructures filter object to primitives (fixes cache bug)
  - File: `apps/app/src/client/pages/projects/workflows/hooks/queryKeys.ts`

- [ ] 3.3 [4/10] Verify workflowKeys compiles
  - Run: `pnpm check-types`
  - Check no TypeScript errors in new factory
  - Verify as const works for all methods

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Update Workflow Files to Use workflowKeys

**Phase Complexity**: 32 points (avg 4.0/10)

<!-- prettier-ignore -->
- [ ] 4.1 [4/10] Update useWorkflowDefinitions.ts
  - Import: `import { workflowKeys } from './queryKeys'`
  - Replace line 25: `queryKey: workflowKeys.definitionsList(projectId, status)`
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinitions.ts`

- [ ] 4.2 [4/10] Update useWorkflowDefinition.ts
  - Import workflowKeys
  - Replace line 20: `queryKey: workflowKeys.definition(definitionId)`
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDefinition.ts`

- [ ] 4.3 [5/10] Update useWorkflowRuns.ts and FIX filter bug
  - Import workflowKeys
  - Replace line 37: `queryKey: workflowKeys.runsList(projectId, filter?.status, filter?.search, filter?.definitionId)`
  - CRITICAL: Destructure filter object into primitives (fixes cache reference bug)
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowRuns.ts`

- [ ] 4.4 [3/10] Update useWorkflowRun.ts
  - Import workflowKeys
  - Replace line 20: `queryKey: workflowKeys.run(runId)`
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowRun.ts`

- [ ] 4.5 [3/10] Update useInngestRunStatus.ts
  - Import workflowKeys
  - Replace line 15: `queryKey: workflowKeys.inngestStatus(runId)`
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useInngestRunStatus.ts`

- [ ] 4.6 [5/10] Update useWorkflowMutations.ts (6 invalidations)
  - Import workflowKeys
  - Replace all inline keys with factory calls:
    - Line 48: `workflowKeys.runs()`
    - Line 70: `workflowKeys.run(runId)`
    - Lines 92, 114, 154, 196: `workflowKeys.run(variables.runId)`
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts`

- [ ] 4.7 [4/10] Update useArchiveWorkflowDefinition.ts - fix over-invalidation
  - Import workflowKeys
  - Replace line 25: `workflowKeys.definitionsList(projectId)` (specify projectId, not all)
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useArchiveWorkflowDefinition.ts`

- [ ] 4.8 [4/10] Update useUnarchiveWorkflowDefinition.ts - fix over-invalidation
  - Import workflowKeys
  - Replace line 25: `workflowKeys.definitionsList(projectId)` (specify projectId, not all)
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useUnarchiveWorkflowDefinition.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4B: Update Workflow WebSocket and Components

**Phase Complexity**: Included in Phase 4 total above

<!-- prettier-ignore -->
- [ ] 4.9 [6/10] Update useWorkflowWebSocket.ts (8+ inline keys)
  - Import workflowKeys
  - Replace all inline keys with factory calls:
    - Lines 33, 36: Use workflowKeys.run() and workflowKeys.runs()
    - Lines 58, 122, 165, 195: Use workflowKeys.run()
    - Line 71: Use workflowKeys.runs() in setQueriesData
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`

- [ ] 4.10 [3/10] Update WorkflowOnboardingDialog.tsx
  - Import workflowKeys
  - Replace line 31: `workflowKeys.definitionsList(projectId)`
  - File: `apps/app/src/client/pages/projects/workflows/components/WorkflowOnboardingDialog.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 5: Fix Component Inline Keys

**Phase Complexity**: 10 points (avg 2.0/10)

<!-- prettier-ignore -->
- [ ] 5.1 [2/10] Fix ProjectSourceControl.tsx inline git key
  - Import: `import { gitKeys } from './hooks/queryKeys'`
  - Replace line 153: `gitKeys.status(projectPath)`
  - File: `apps/app/src/client/pages/projects/git/ProjectSourceControl.tsx`

- [ ] 5.2 [3/10] Fix NewRunDialog.tsx project keys
  - Import: `import { projectKeys } from '../../hooks/queryKeys'`
  - Replace line 80: `projectKeys.specs(projectId)`
  - Replace line 92: `projectKeys.branches(projectId)`
  - File: `apps/app/src/client/pages/projects/workflows/components/NewRunDialog.tsx`

- [ ] 5.3 [2/10] Fix SessionFileViewer.tsx
  - Import: `import { sessionKeys } from '../hooks/queryKeys'`
  - Replace line 37: `sessionKeys.file(sessionId)`
  - File: `apps/app/src/client/pages/projects/sessions/components/SessionFileViewer.tsx`

- [ ] 5.4 [2/10] Fix NavActivities.tsx workflow key
  - Import: `import { workflowKeys } from '../../pages/projects/workflows/hooks/queryKeys'`
  - Replace line 73 in map: `queryKey: workflowKeys.runsList(project.id)`
  - File: `apps/app/src/client/components/sidebar/NavActivities.tsx`

- [ ] 5.5 [1/10] Verify all inline keys replaced
  - Search codebase for inline query keys: `queryKey: ["` or `queryKey: ['`
  - Ensure only queryKeys factories remain
  - Run: `pnpm check-types`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 6: Verify & Test

**Phase Complexity**: 7 points (avg 2.3/10)

<!-- prettier-ignore -->
- [ ] 6.1 [3/10] Type check and verify imports
  - Run: `pnpm check-types`
  - Fix any TypeScript errors from refactor
  - Verify all imports resolve correctly
  - Check no circular dependencies

- [ ] 6.2 [2/10] Test in React Query DevTools
  - Start app: `pnpm dev`
  - Open React Query DevTools
  - Navigate through app, verify query keys appear correctly
  - Check hierarchical structure visible in DevTools

- [ ] 6.3 [2/10] Test cache invalidation
  - Trigger workflow run → verify workflowKeys.runs() invalidates correctly
  - Archive workflow → verify specific project invalidated, not all
  - Update session → verify sessionKeys.detail() invalidates
  - Check browser console for errors

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

No new unit tests required - this is a refactoring that maintains existing behavior. Existing tests should continue to pass with updated imports.

### Integration Tests

**Query Key Structure**:
- Verify all factories export correctly from queryKeys.ts files
- Verify hooks can import and use factories
- Verify query keys maintain same structure (backward compatible)

### Manual Testing

**Cache Invalidation** - Verify granular invalidation works:
- Create workflow run → only project's runs invalidated
- Archive workflow definition → only project's definitions invalidated
- Update session → only that session's detail invalidated
- WebSocket updates → correct queries invalidated

**React Query DevTools** - Verify key structure:
- Check hierarchical keys visible in DevTools
- Verify workflow keys show proper hierarchy
- Check no duplicate keys from old inline usage

## Success Criteria

- [ ] All 6 queryKeys.ts files created and export factories
- [ ] All 6 hook files import from ./queryKeys.ts
- [ ] All 10 workflow files use workflowKeys (no inline keys)
- [ ] All 5 component files use factory imports (no inline keys)
- [ ] Type checking passes with no errors
- [ ] React Query DevTools shows proper hierarchical keys
- [ ] Cache invalidation works granularly (no over-invalidation)
- [ ] No inline query keys remain in codebase (except inside factories)
- [ ] Filter object bug in useWorkflowRuns fixed (primitives only)
- [ ] Archive/unarchive workflows invalidate specific project only

## Validation

Execute these commands to verify the refactor works correctly:

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
# Expected: No linting errors (unused imports removed)
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Open React Query DevTools (bottom-right icon)
3. Navigate to: `http://localhost:5173/projects/{any-project-id}`
4. Verify: Query keys show hierarchical structure
5. Test cache invalidation:
   - Create new workflow run → Check only project's runs invalidated
   - Archive workflow → Check only project's definitions invalidated
   - Navigate between sessions → Check session detail keys update
6. Check console: No errors or warnings
7. Check Network tab: No duplicate requests from cache issues

**Feature-Specific Checks:**

- All queryKeys.ts files exist in correct locations
- All factories use `as const` for type safety
- workflowKeys includes all methods (definitions, runs, inngestStatus)
- projectKeys includes specs() and branches() methods
- sessionKeys includes file() method
- gitKeys has grouping comments but stays flat
- No inline query keys remain outside factories
- WebSocket handlers use workflowKeys and sessionKeys

## Implementation Notes

### 1. Feature-Based Organization (TkDodo Pattern)

This follows the official TanStack Query maintainer's recommendation for query key organization. Each feature owns its keys, preventing naming collisions and keeping related code together.

### 2. Hierarchical Keys Enable Granular Invalidation

The lists/details pattern allows precise cache targeting:
- Invalidate all: `workflowKeys.all`
- Invalidate all runs: `workflowKeys.runs()`
- Invalidate project runs: `workflowKeys.runsList(projectId)`
- Invalidate single run: `workflowKeys.run(runId)`

### 3. Git Keys Exception

Git operations don't fit lists/details semantics - status, diff, commit, stash, branches are fundamentally different operation types, not variations of the same resource. Keeping flat structure is more semantically accurate.

### 4. Filter Object Bug Fix

`useWorkflowRuns` currently passes filter object directly to query key: `['workflow-runs', projectId, filter]`. Objects cause cache misses due to reference inequality. Solution: destructure to primitives: `['workflow-runs', projectId, filter?.status, filter?.search, filter?.definitionId]`.

### 5. Backward Compatibility

All changes maintain existing query key structures. Only the location (inline vs factory) changes, not the actual key arrays. This ensures existing cache entries remain valid during refactor.

## Dependencies

No new dependencies required - using existing packages:
- `@tanstack/react-query` (already installed)
- TypeScript const assertions (built-in)

## References

- [Effective React Query Keys - TkDodo's Blog](https://tkdodo.eu/blog/effective-react-query-keys)
- [Query Keys Guide - TanStack Query Docs](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [Query Key Factory Discussion - GitHub](https://github.com/TanStack/query/discussions/3362)
- Session refactor spec (spec #8) - Reference for sessionKeys pattern
- Comprehensive audit report (conversation context)

## Next Steps

1. Review and approve this spec
2. Run: `/implement-spec 9` to begin implementation
3. Test thoroughly after each phase
4. Verify in React Query DevTools during development
5. Check for any remaining inline keys after completion
6. Document the pattern in CLAUDE.md for future reference
