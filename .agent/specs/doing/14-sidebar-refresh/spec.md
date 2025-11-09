# Sidebar Refresh Buttons

**Status**: in-progress
**Created**: 2025-11-09
**Package**: apps/app
**Total Complexity**: 13 points
**Phases**: 2
**Tasks**: 4
**Overall Avg Complexity**: 3.3/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: NavActivities Refresh | 2 | 7 | 3.5/10 | 4/10 |
| Phase 2: NavProjects Refresh | 2 | 6 | 3.0/10 | 3/10 |
| **Total** | **4** | **13** | **3.3/10** | **4/10** |

## Overview

Add icon-only refresh buttons to sidebar panels (Activities and Projects) that sync data from `.claude/projects` directory and invalidate TanStack Query caches. Buttons show spinner during loading state.

## User Story

As a user
I want to manually refresh sessions and projects from my `.claude/projects` directory
So that I can see the latest sessions without reloading the app or waiting for auto-sync

## Technical Approach

Leverage existing `useSyncProjectsMutation()` hook and `POST /api/projects/sync` endpoint. Add compact icon buttons next to filter/view toggles that trigger sync, invalidate queries, and show loading state with spinner animation.

## Key Design Decisions

1. **Reuse existing sync endpoint** - No backend changes needed, `POST /api/projects/sync` already imports from `.claude/projects`
2. **Icon-only buttons** - Compact `RefreshCw` icon to save sidebar space
3. **TanStack Query invalidation** - Chain sync → invalidate → auto-refetch pattern
4. **Spinner on loading** - Replace icon with rotating animation during `isPending` state

## Architecture

### File Structure

```
apps/app/src/client/components/sidebar/
├── NavActivities.tsx          # Add refresh button
└── NavProjects.tsx            # Add refresh button
```

### Integration Points

**NavActivities**:
- `apps/app/src/client/components/sidebar/NavActivities.tsx` - Add refresh button next to toggle group
- `apps/app/src/client/pages/projects/hooks/useProjects.ts` - Import `useSyncProjectsMutation()`
- `apps/app/src/client/pages/projects/sessions/hooks/useAgentSessions.ts` - Import `sessionKeys` for invalidation

**NavProjects**:
- `apps/app/src/client/components/sidebar/NavProjects.tsx` - Add refresh button next to toggle group
- `apps/app/src/client/pages/projects/hooks/useProjects.ts` - Import `useSyncProjectsMutation()`

## Implementation Details

### 1. NavActivities Refresh Button

Icon-only button that syncs projects/sessions from `.claude/projects`, then invalidates sessions and workflow runs queries.

**Key Points**:
- Position: Right-aligned after filter toggle group (line 136-169)
- Hook: `useSyncProjectsMutation()` from `useProjects.ts`
- Invalidation: Sessions lists + workflow runs for all projects
- Loading state: `isPending` → show rotating `RefreshCw` icon
- Success feedback: Toast message

### 2. NavProjects Refresh Button

Icon-only button that syncs projects from `.claude/projects`, then invalidates projects query.

**Key Points**:
- Position: Right-aligned after view toggle group (line 70-95)
- Hook: `useSyncProjectsMutation()` from `useProjects.ts`
- Invalidation: Projects list query
- Loading state: `isPending` → show rotating `RefreshCw` icon
- Success feedback: Toast message (already in hook)

## Files to Create/Modify

### New Files (0)

None - only modifying existing components

### Modified Files (2)

1. `apps/app/src/client/components/sidebar/NavActivities.tsx` - Add refresh button UI and handler
2. `apps/app/src/client/components/sidebar/NavProjects.tsx` - Add refresh button UI and handler

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: NavActivities Refresh Button

**Phase Complexity**: 7 points (avg 3.5/10)

<!-- prettier-ignore -->
- [x] na-1 4/10 Add refresh button UI to NavActivities
  - Import `RefreshCw` from `lucide-react`, `Button` from `@/client/components/ui/button`
  - Import `useQueryClient` from `@tanstack/react-query`
  - Import `useSyncProjectsMutation` from `@/client/pages/projects/hooks/useProjects`
  - Import `sessionKeys` from `@/client/pages/projects/sessions/hooks/queryKeys`
  - Add button after toggle group (line 169), before scrollable area
  - Button: `size="sm"`, `variant="ghost"`, icon-only with `RefreshCw`
  - Add `className="ml-auto"` to align right
  - File: `apps/app/src/client/components/sidebar/NavActivities.tsx`
- [x] na-2 3/10 Implement refresh handler with sync + invalidation
  - Get `syncProjectsMutation` hook instance
  - Create handler that calls `syncProjectsMutation.mutate()`
  - In `onSuccess` callback: invalidate sessions queries and workflow runs queries
  - Use `queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })`
  - Loop through projects to invalidate workflow runs: `projects?.forEach((p) => queryClient.invalidateQueries({ queryKey: ["workflow-runs", p.id] }))`
  - Show spinner during `isPending`: conditional render with `className="animate-spin"`
  - File: `apps/app/src/client/components/sidebar/NavActivities.tsx`

#### Completion Notes

- Added refresh button next to filter toggle group with icon-only design
- Button shows spinning animation during sync via `isPending` state
- Handler chains sync → invalidate sessions → invalidate workflow runs
- Used flex container with `ml-auto` to right-align button
- Success toast handled by `useSyncProjectsMutation` hook

### Phase 2: NavProjects Refresh Button

**Phase Complexity**: 6 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] np-1 3/10 Add refresh button UI to NavProjects
  - Import `RefreshCw` from `lucide-react`, `Button` from `@/client/components/ui/button`
  - Import `useSyncProjectsMutation` from `@/client/pages/projects/hooks/useProjects`
  - Add button after toggle group (line 95), before scrollable area
  - Button: `size="sm"`, `variant="ghost"`, icon-only with `RefreshCw`
  - Add `className="ml-auto"` to align right
  - File: `apps/app/src/client/components/sidebar/NavProjects.tsx`
- [x] np-2 3/10 Implement refresh handler with sync
  - Get `syncProjectsMutation` hook instance
  - Create handler that calls `syncProjectsMutation.mutate()`
  - Show spinner during `isPending`: conditional render with `className="animate-spin"`
  - Success toast already handled by `useSyncProjectsMutation` hook
  - File: `apps/app/src/client/components/sidebar/NavProjects.tsx`

#### Completion Notes

- Added refresh button next to view toggle group with icon-only design
- Button shows spinning animation during sync via `isPending` state
- Handler calls `syncProjectsMutation.mutate()` which handles project invalidation automatically
- Used flex container with `ml-auto` to right-align button
- Success toast and query invalidation handled by `useSyncProjectsMutation` hook

## Testing Strategy

### Unit Tests

Not applicable - UI components with existing hooks

### Integration Tests

Manual testing of refresh flow

### E2E Tests (if applicable)

Not applicable - low-risk UI enhancement

## Success Criteria

- [x] NavActivities has icon-only refresh button next to filter toggle
- [x] NavProjects has icon-only refresh button next to view toggle
- [x] Clicking NavActivities refresh triggers sync and invalidates sessions + workflows
- [x] Clicking NavProjects refresh triggers sync and invalidates projects
- [x] Buttons show spinner animation during loading (`isPending` state)
- [x] Success toast appears on completion (from mutation hook)
- [x] Sessions/workflows update after NavActivities refresh
- [x] Projects list updates after NavProjects refresh
- [x] No TypeScript errors
- [x] No console errors during refresh

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Build verification
pnpm build
# Expected: Successful build, no errors

# Linting
pnpm lint
# Expected: No lint errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Login and view sidebar
4. **NavActivities Panel:**
   - Click refresh button (should see spinner)
   - Verify sessions list updates after sync
   - Check console for no errors
   - Verify success toast appears
5. **NavProjects Panel:**
   - Click refresh button (should see spinner)
   - Verify projects list updates after sync
   - Check console for no errors
   - Verify success toast appears
6. **Edge cases:**
   - Click refresh multiple times rapidly (should handle gracefully)
   - Refresh with no `.claude/projects` directory (should show error toast)
   - Refresh with large number of sessions/projects (should complete without timeout)

**Feature-Specific Checks:**

- Verify button positioning (right-aligned, next to toggles)
- Verify icon size matches toggle buttons (consistent visual weight)
- Verify spinner animation is smooth (no jank)
- Verify queries refetch automatically after invalidation
- Verify sync imports sessions from `~/.claude/projects/`

## Implementation Notes

### 1. Sync Endpoint Already Handles Import

The `POST /api/projects/sync` endpoint (via `useSyncProjectsMutation`) already:
- Scans `~/.claude/projects/` for project directories
- Auto-imports projects with >3 valid sessions
- Syncs all sessions for discovered projects
- Returns stats: `{ projectsImported, projectsUpdated, totalSessionsSynced }`

No backend changes needed.

### 2. Query Invalidation Pattern

The mutation's `onSuccess` callback should chain invalidations:
1. Sync completes → Update sync query cache
2. Invalidate projects lists → Auto-refetch projects
3. Invalidate sessions lists → Auto-refetch sessions
4. Invalidate workflow runs → Auto-refetch workflows

This ensures all affected UI updates automatically via TanStack Query.

### 3. Loading State with Spinner

Use conditional rendering based on `isPending`:
```tsx
<Button onClick={handleRefresh} disabled={isPending}>
  <RefreshCw className={isPending ? "animate-spin" : ""} />
</Button>
```

### 4. Button Alignment

Use `ml-auto` on button or wrap toggle group + button in flex container with `justify-between`.

## Dependencies

- No new dependencies required
- Uses existing `useSyncProjectsMutation` hook
- Uses existing `RefreshCw` icon from `lucide-react`
- Uses existing `Button` component from shadcn/ui

## References

- Existing sync hook: `apps/app/src/client/pages/projects/hooks/useProjects.ts` (line 263-289)
- Sync endpoint: `apps/app/src/server/routes/projects.ts` (`POST /api/projects/sync`)
- Session import service: `apps/app/src/server/domain/project/services/syncProjectFromClaude.ts`
- Session sync service: `apps/app/src/server/domain/session/services/syncProjectSessions.ts`

## Next Steps

1. Implement Phase 1: NavActivities refresh button
2. Implement Phase 2: NavProjects refresh button
3. Test both buttons with real `.claude/projects` data
4. Verify spinner animations and toast messages
5. Check type safety and build
