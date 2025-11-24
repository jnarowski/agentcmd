# Background Project Sync

**Status**: draft
**Type**: issue
**Created**: 2025-11-24
**Package**: apps/app
**Total Complexity**: 22 points
**Tasks**: 5
**Avg Complexity**: 4.4/10

## Complexity Summary

| Metric          | Value    |
| --------------- | -------- |
| Total Tasks     | 5        |
| Total Points    | 22       |
| Avg Complexity  | 4.4/10   |
| Max Task        | 6/10     |

## Overview

Project sync currently blocks app load for 12+ seconds while syncing 14 projects and 2,706 sessions from Claude CLI. This creates poor UX, especially on first load. Moving to fire-and-forget background sync with WebSocket completion notification will allow instant app load while maintaining the "Importing Projects" UI experience.

## User Story

As a user
I want the app to load instantly
So that I can start working immediately without waiting 12 seconds for projects to sync

## Technical Approach

Convert blocking sync endpoint to fire-and-forget pattern with WebSocket completion event:

1. Add `projects.sync.completed` event type to shared WebSocket types
2. Update `/api/projects/sync` to return immediately and run sync in background
3. Emit global WebSocket event when sync completes
4. Frontend triggers sync on mount, listens for completion, updates UI

**Key Points**:
- Use global channel (single-user app) with userId filter
- Existing "Importing Projects" UI works automatically
- First-time users see spinner, returning users see cached data
- No schema changes, no new dependencies

## Files to Create/Modify

### New Files (0)

None - using existing infrastructure

### Modified Files (4)

1. `apps/app/src/shared/types/websocket.types.ts` - Add projects sync event types
2. `apps/app/src/server/routes/projects.ts` - Make sync non-blocking, emit completion
3. `apps/app/src/client/pages/projects/hooks/useProjects.ts` - Convert to fire-and-forget hook
4. `apps/app/src/client/layouts/AppLayout.tsx` - Listen for completion, trigger sync

## Tasks

**IMPORTANT: Execute every task in order, top to bottom**

- [ ] **task-1** [3/10] Add WebSocket event types for project sync completion
  - Add `PROJECTS_SYNC_COMPLETED: "projects.sync.completed"` to `GlobalEventTypes`
  - Add `ProjectsSyncCompletedData` interface with userId, stats, timestamp
  - Add to `GlobalEvent` discriminated union
  - File: `apps/app/src/shared/types/websocket.types.ts`

- [ ] **task-2** [6/10] Convert sync endpoint to fire-and-forget with event emission
  - Import eventBus and GlobalEventTypes
  - Return `{ status: "syncing" }` immediately
  - Run `syncFromClaudeProjects()` in background promise
  - Emit `projects.sync.completed` event on success with stats
  - Log errors silently (don't throw)
  - File: `apps/app/src/server/routes/projects.ts`

- [ ] **task-3** [4/10] Update useSyncProjects hook to fire-and-forget pattern
  - Remove blocking TanStack Query
  - Add local state: `const [isSyncing, setIsSyncing] = useState(false)`
  - Add `triggerSync()` function that calls API and sets syncing state
  - Return `{ isSyncing, triggerSync, setIsSyncing }`
  - File: `apps/app/src/client/pages/projects/hooks/useProjects.ts`

- [ ] **task-4** [6/10] Add WebSocket listener and sync trigger in AppLayout
  - Import `useSyncProjects` hook
  - Trigger sync on mount via `useEffect`
  - Listen for `projects.sync.completed` on global channel
  - Filter by userId (current user only)
  - Update `isSyncing` state and invalidate projects queries
  - Optional: show toast notification with sync stats
  - File: `apps/app/src/client/layouts/AppLayout.tsx`

- [ ] **task-5** [3/10] Test and verify behavior
  - Verify app loads instantly
  - Verify "Importing Projects" UI shows during sync
  - Verify projects appear after sync completes
  - Verify returning users see cached data immediately
  - Test with network tab: sync endpoint returns instantly
  - Commands: `pnpm dev`, open http://localhost:5173

## Testing Strategy

### Manual Testing

Primary validation through manual testing due to WebSocket + background async complexity.

### Integration Tests (if applicable)

Could add route test to verify sync returns immediately, but end-to-end behavior requires manual validation.

## Success Criteria

- [ ] App loads in <1 second (no 12-second block)
- [ ] "Importing Projects" UI shows while syncing
- [ ] Projects appear automatically after sync completes
- [ ] Returning users see cached projects instantly
- [ ] WebSocket event properly filtered by userId
- [ ] No TypeScript errors

## Validation

**Automated:**

```bash
# Type check
pnpm check-types
# Expected: no errors

# Build
pnpm build
# Expected: successful build
```

**Manual:**

1. Start app: `pnpm dev`
2. Open browser: http://localhost:5173
3. Clear cache and hard reload (first-time user simulation)
4. Verify: App loads instantly
5. Verify: "Importing Projects" spinner shows
6. Verify: After ~12s, projects appear automatically
7. Refresh page (returning user simulation)
8. Verify: Cached projects show instantly
9. Check Network tab: `/api/projects/sync` returns in <100ms
10. Check browser console: WebSocket event received

## Implementation Notes

### Global Channel vs User Channel

Using `global` channel with userId filter instead of creating `user:${userId}` channel because:
- Single-user application (per permissions.ts:42-43)
- Simpler implementation (no permission validator changes)
- Client-side filtering is trivial (`event.userId === currentUserId`)

### Existing UI Compatibility

ProjectsPage.tsx:44-59 already checks `isSyncing` from hook - no changes needed to UI components.

### Error Handling

Background sync errors logged but don't block UI - users can manually retry via refresh or future "Sync Now" button.

## Dependencies

- No new dependencies

## References

- `.agent/docs/websocket-architecture.md` - WebSocket patterns
- `apps/app/src/shared/types/websocket.types.ts` - Event type conventions
- `apps/app/src/client/pages/ProjectsPage.tsx:44-59` - "Importing Projects" UI
