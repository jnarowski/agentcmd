# Active Project Spec Watcher

**Status**: draft
**Created**: 2025-11-22
**Package**: apps/app
**Total Complexity**: 38 points
**Phases**: 3
**Tasks**: 11
**Overall Avg Complexity**: 3.5/10

## Complexity Breakdown

| Phase                    | Tasks | Total Points | Avg Complexity | Max Task |
| ------------------------ | ----- | ------------ | -------------- | -------- |
| Phase 1: Backend Watcher | 4     | 20           | 5.0/10         | 6/10     |
| Phase 2: Frontend Hook   | 3     | 8            | 2.7/10         | 4/10     |
| Phase 3: Integration     | 4     | 10           | 2.5/10         | 3/10     |
| **Total**                | **11**| **38**       | **3.5/10**     | **6/10** |

## Overview

Automatically update sidebar specs when `.agent/specs/index.json` changes by watching the active project's spec directory. Only watches the currently open project (active-project-only approach) with reference-counted lifecycle management and silent fallback on errors. Includes one-time rescan when user navigates to `/projects` page.

## User Story

As a developer
I want specs in the sidebar to update automatically when I modify spec files
So that I don't have to manually refresh to see changes

## Technical Approach

Use chokidar to watch `.agent/specs/index.json` for the active project only. When file changes are detected, broadcast a WebSocket event to the `project:{id}` channel, triggering React Query cache invalidation on the frontend. Watcher lifecycle is tied to WebSocket subscription (starts when user opens project, stops when they navigate away). Reference counting ensures single watcher per project even with multiple tabs open.

## Key Design Decisions

1. **Active-project-only watching**: Only watch the currently open project to minimize resource usage (1 watcher vs 100+ for all projects)
2. **Watch index.json only**: Single file per project instead of entire directory tree (reduces file descriptors from ~100 to 1 per project)
3. **Reference counting**: Multiple tabs viewing same project share a single watcher instance (prevents duplicate watchers)
4. **Silent fallback**: Watcher failures logged but don't break UX (falls back to existing 30s cache + manual rescan)
5. **WebSocket lifecycle coupling**: Watcher starts on `project:{id}` subscription, stops on unsubscription (mirrors existing workflow patterns)

## Architecture

### File Structure

```
apps/app/
├── src/
│   ├── client/
│   │   ├── hooks/
│   │   │   └── useSpecWebSocket.ts         # NEW: WebSocket subscription hook
│   │   ├── layouts/
│   │   │   └── ProjectLoader.tsx           # MODIFY: Add hook call
│   │   └── pages/
│   │       └── ProjectsPage.tsx            # MODIFY: Add one-time rescan
│   └── server/
│       ├── domain/
│       │   └── spec/
│       │       └── services/
│       │           └── watchSpecs.ts       # NEW: Watcher service
│       ├── websocket/
│       │   └── handlers/
│       │       └── global.handler.ts       # MODIFY: Start/stop watchers
│       └── utils/
│           └── shutdown.ts                 # MODIFY: Cleanup on shutdown
└── package.json                            # MODIFY: Add chokidar dependency
```

### Integration Points

**Frontend WebSocket**:
- `useSpecWebSocket.ts` - Subscribes to `project:{id}` channel, invalidates React Query cache on events
- `ProjectLoader.tsx` - Calls `useSpecWebSocket(activeProjectId)` on mount

**Backend WebSocket**:
- `global.handler.ts` - Starts watcher on `subscribe` to `project:{id}`, stops on `unsubscribe`
- `watchSpecs.ts` - Manages chokidar instances with reference counting

**Cleanup**:
- `shutdown.ts` - Calls `closeAllSpecWatchers()` on graceful shutdown

## Implementation Details

### 1. Backend Spec Watcher Service

Reference-counted file watcher using chokidar. Maintains singleton map of `projectId → FSWatcher` and reference count map of `projectId → subscriberCount`. When count reaches 0, watcher is closed.

**Key Points**:
- Watches single file: `.agent/specs/index.json` per project
- Debounces changes with `awaitWriteFinish` (200ms stability threshold)
- Clears server-side cache on change
- Broadcasts `spec.updated` event to `project:{id}` channel
- Silent error handling (logs but doesn't throw)

### 2. Frontend WebSocket Hook

Follows same pattern as `useWorkflowWebSocket` and `useSessionWebSocket`. Subscribes to `project:{id}` channel, listens for `spec.updated` events, invalidates React Query cache.

**Key Points**:
- Uses existing `useWebSocket()` hook for EventBus access
- Guards against null projectId and disconnected state
- Cleans up subscription on unmount via `eventBus.off()`
- Triggers refetch in `NavSpecs` component automatically

### 3. WebSocket Handler Integration

Extends `global.handler.ts` to start/stop watchers when clients subscribe/unsubscribe from `project:{id}` channels. Uses `parseChannel()` to extract projectId from channel name.

**Key Points**:
- Check if channel resource is "project" before starting watcher
- Wrap watcher calls in try/catch with error logging
- Watcher lifecycle tied to subscription lifecycle (automatic cleanup)

### 4. One-Time Rescan on Projects Page

Calls `useRescanSpecs()` mutation on `ProjectsPage` mount to ensure all specs are fresh before user opens any project.

**Key Points**:
- Single call in `useEffect` with empty dependencies (runs once)
- Non-blocking (doesn't prevent page render)
- Uses existing `/api/specs/rescan` endpoint

## Files to Create/Modify

### New Files (2)

1. `apps/app/src/client/hooks/useSpecWebSocket.ts` - Frontend WebSocket subscription hook for specs
2. `apps/app/src/server/domain/spec/services/watchSpecs.ts` - Backend chokidar watcher service with reference counting

### Modified Files (5)

1. `apps/app/src/client/layouts/ProjectLoader.tsx` - Add `useSpecWebSocket(activeProjectId)` call
2. `apps/app/src/client/pages/ProjectsPage.tsx` - Add one-time `rescanSpecs.mutate()` on mount
3. `apps/app/src/server/websocket/handlers/global.handler.ts` - Start/stop watchers on subscribe/unsubscribe
4. `apps/app/src/server/utils/shutdown.ts` - Add `closeAllSpecWatchers()` call
5. `apps/app/package.json` - Add `chokidar: ^4.0.3` dependency

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend Watcher Service

**Phase Complexity**: 20 points (avg 5.0/10)

- [ ] 1.1 [6/10] Create backend spec watcher service with chokidar
  - Implement `startSpecWatcher()`, `stopSpecWatcher()`, `closeAllSpecWatchers()`
  - Use reference counting maps: `watchers` (projectId → FSWatcher), `refCounts` (projectId → number)
  - Watch `.agent/specs/index.json` only (single file per project)
  - Configure `awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }`
  - On change: call `clearSpecsCache()` + broadcast to `Channels.project(projectId)`
  - File: `apps/app/src/server/domain/spec/services/watchSpecs.ts`

- [ ] 1.2 [5/10] Integrate watcher lifecycle into global WebSocket handler
  - Import `startSpecWatcher`, `stopSpecWatcher`, `parseChannel`
  - In `handleSubscribe`: after `subscribe(channelId, socket)`, check if resource is "project" and call `startSpecWatcher(projectId)`
  - In `handleUnsubscribe`: after `unsubscribe(channelId, socket)`, check if resource is "project" and call `stopSpecWatcher(projectId)`
  - Wrap watcher calls in try/catch with error logging
  - File: `apps/app/src/server/websocket/handlers/global.handler.ts`

- [ ] 1.3 [5/10] Add watcher cleanup to graceful shutdown
  - Import `closeAllSpecWatchers` from watchSpecs service
  - Call in shutdown sequence before closing server
  - Ensure all watchers closed to prevent orphaned processes
  - File: `apps/app/src/server/utils/shutdown.ts`

- [ ] 1.4 [4/10] Add chokidar dependency
  - Add `"chokidar": "^4.0.3"` to dependencies
  - Run `pnpm install` to install
  - Verify installation with `pnpm list chokidar`
  - File: `apps/app/package.json`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Frontend WebSocket Hook

**Phase Complexity**: 8 points (avg 2.7/10)

- [ ] 2.1 [4/10] Create useSpecWebSocket hook
  - Follow pattern from `useWorkflowWebSocket.ts` and `useSessionWebSocket.ts`
  - Subscribe to `Channels.project(projectId)` on mount
  - Listen for `spec.updated` events
  - Call `queryClient.invalidateQueries({ queryKey: ["specs", projectId] })` on event
  - Cleanup subscription on unmount
  - File: `apps/app/src/client/hooks/useSpecWebSocket.ts`

- [ ] 2.2 [2/10] Add hook to ProjectLoader
  - Import `useSpecWebSocket` from hooks
  - Call `useSpecWebSocket(activeProjectId)` after existing useEffect
  - No additional logic needed (hook handles everything)
  - File: `apps/app/src/client/layouts/ProjectLoader.tsx`

- [ ] 2.3 [2/10] Add one-time rescan to ProjectsPage
  - Import `useRescanSpecs` from hooks
  - Add `useEffect(() => { rescanSpecs.mutate(); }, [])` after existing hooks
  - Ensures fresh spec data before user opens any project
  - File: `apps/app/src/client/pages/ProjectsPage.tsx`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Integration Testing & Verification

**Phase Complexity**: 10 points (avg 2.5/10)

- [ ] 3.1 [3/10] Test watcher lifecycle
  - Start dev server: `pnpm dev`
  - Open project in browser
  - Check logs for "Spec watcher started for project {id}"
  - Navigate away from project
  - Check logs for "Spec watcher stopped for project {id}"
  - Verify no watcher leaks (logs should show cleanup)

- [ ] 3.2 [3/10] Test spec updates
  - Open project in browser
  - Run `/refresh-spec-index` to update index.json
  - Verify sidebar specs update automatically (no manual refresh)
  - Check browser console for WebSocket event: `spec.updated`
  - Verify React Query refetch triggered

- [ ] 3.3 [2/10] Test multi-tab scenario
  - Open same project in 2 browser tabs
  - Check logs: only 1 watcher instance (reference counting working)
  - Close 1 tab: watcher should remain active
  - Close 2nd tab: watcher should stop

- [ ] 3.4 [2/10] Test error handling
  - Delete `.agent/specs/index.json` from project
  - Open project in browser
  - Verify error logged but no crash
  - Verify sidebar shows empty state or cached data
  - Verify manual rescan still works

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

Not required for this feature (integration-heavy, relies on filesystem and WebSocket infrastructure).

### Integration Tests

Manual testing sufficient (automated tests would require mocking chokidar and WebSocket connections, adding complexity without proportional value).

### E2E Tests

**Manual E2E Test Plan**:

1. **Happy Path**: Open project → modify spec → verify sidebar updates
2. **Lifecycle**: Open project → navigate away → verify watcher stops
3. **Multi-tab**: Open 2 tabs → close 1 → verify watcher persists → close 2nd → verify watcher stops
4. **Error Handling**: Delete index.json → open project → verify no crash
5. **One-time Rescan**: Navigate to /projects → verify specs loaded fresh

## Success Criteria

- [ ] Specs sidebar updates automatically when `.agent/specs/index.json` changes
- [ ] Only 1 watcher active per project (reference counting works)
- [ ] Watcher stops when user navigates away from project
- [ ] Multiple tabs viewing same project share single watcher
- [ ] Watcher failures don't crash app (silent fallback)
- [ ] One-time rescan runs on /projects page load
- [ ] No TypeScript errors or build failures
- [ ] No WebSocket connection errors in browser console
- [ ] Server logs show watcher start/stop events
- [ ] Memory usage stable over time (no watcher leaks)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Build verification
pnpm build
# Expected: Successful build with no errors

# Linting
pnpm lint
# Expected: No lint errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects`
3. Verify: One-time rescan triggered (check network tab for `/api/specs/rescan`)
4. Open any project
5. Verify: Server logs show "Spec watcher started for project {id}"
6. Run: `/refresh-spec-index` in terminal
7. Verify: Sidebar specs update automatically without page refresh
8. Navigate away from project
9. Verify: Server logs show "Spec watcher stopped for project {id}"

**Feature-Specific Checks:**

- Open same project in 2 tabs → verify logs show only 1 watcher
- Close 1 tab → verify watcher still active
- Close 2nd tab → verify watcher stopped
- Delete `.agent/specs/index.json` → open project → verify no crash (error logged)
- Check browser console: WebSocket events visible (`spec.updated`)
- Check React Query DevTools: Cache invalidation on events

## Implementation Notes

### 1. Why Watch index.json Only?

Watching entire `.agent/specs/` directory would require 20-100 file descriptors per project. Watching only `index.json` reduces to 1 FD per project. All spec changes flow through `index.json` via `/refresh-spec-index` slash command, so we catch all updates.

### 2. Reference Counting Pattern

Multiple tabs viewing same project would create duplicate watchers without reference counting. Reference counting ensures single watcher per project regardless of subscriber count, preventing resource waste.

### 3. Silent Fallback Strategy

If watcher fails (permissions, missing directory, chokidar error), we log the error but don't break UX. User still has:
- Existing 30s cache
- Manual rescan button
- One-time rescan on page load

This graceful degradation prevents blocking users when file watching unavailable.

### 4. WebSocket Lifecycle Coupling

Tying watcher lifecycle to WebSocket subscriptions provides automatic cleanup. When user navigates away, `ProjectLoader` unmounts → `useSpecWebSocket` cleanup runs → unsubscribe event sent → backend stops watcher. No manual lifecycle management needed in React components.

## Dependencies

- `chokidar`: ^4.0.3 (file watcher library, already in pnpm-lock.yaml as transitive dependency)
- No other new dependencies required

## References

- Existing pattern: `apps/app/src/client/hooks/useWorkflowWebSocket.ts`
- Existing pattern: `apps/app/src/server/websocket/handlers/session.handler.ts`
- WebSocket infrastructure: `apps/app/src/server/websocket/infrastructure/subscriptions.ts`
- Chokidar docs: https://github.com/paulmillr/chokidar

## Next Steps

1. Install chokidar dependency: `pnpm add chokidar`
2. Create backend watcher service: `watchSpecs.ts`
3. Integrate watcher into global WebSocket handler
4. Create frontend hook: `useSpecWebSocket.ts`
5. Add hook to `ProjectLoader.tsx`
6. Add one-time rescan to `ProjectsPage.tsx`
7. Test watcher lifecycle manually
8. Verify multi-tab reference counting
9. Test error handling scenarios
10. Run `/cmd:implement-spec 2511220157` to begin implementation
