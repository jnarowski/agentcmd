# Session State WebSocket Optimization

**Status**: draft
**Created**: 2025-10-30
**Updated**: 2025-10-30
**Package**: apps/web
**Estimated Effort**: 1-2 hours

## Overview

Optimize session state updates by sending real-time `session.updated` WebSocket events to enable direct cache updates in the frontend. Currently, session state changes trigger full project refetches via `queryClient.invalidateQueries()`. This spec implements a Phoenix Channels pattern where the backend broadcasts session state changes, and the frontend updates the React Query cache directly using `setQueryData()`, eliminating unnecessary API calls.

## User Story

As a user
I want to see session state changes (idle/working/error) update instantly in the sidebar
So that I always know the current status of my agent sessions without delays or unnecessary data transfers

## Technical Approach

**Phoenix Channels Pattern**: Use the existing WebSocket infrastructure with Phoenix Channels pattern (channel-based subscriptions). The backend broadcasts `session.updated` events on the session channel (`session:{sessionId}`), and the frontend subscribes to these events via the EventBus.

**Direct Cache Updates**: When the frontend receives `session.updated` events, use React Query's `setQueryData()` to directly update the cached session data, avoiding full API refetches.

## Key Design Decisions

1. **Phoenix Channels Event Pattern**: Use the existing `SessionEventTypes.SESSION_UPDATED` event type (not implemented yet) following the Phoenix Channels discriminated union pattern. All events flow through the EventBus with channel-based routing.

2. **Shared Type System**: Use types from `@/shared/websocket/` for consistency across client and server. Add `SESSION_UPDATED` to `SessionEventTypes` constant.

3. **Direct Cache Updates via `setQueryData`**: Update the React Query cache directly instead of invalidating. This provides instant UI updates without network round-trips.

4. **Backward Compatibility**: Keep existing `queryClient.invalidateQueries()` in `MESSAGE_COMPLETE` handler as fallback, but remove unnecessary invalidation calls that trigger full refetches.

5. **Minimal Payload**: Only send changed fields in `session.updated` events (state, error_message, updated_at, etc.) to reduce bandwidth.

## Architecture

### File Structure

```
apps/web/
├── src/
│   ├── shared/
│   │   └── websocket/
│   │       ├── types.ts (add SESSION_UPDATED to SessionEventTypes)
│   │       └── index.ts (re-export)
│   │
│   ├── server/
│   │   └── websocket/
│   │       └── handlers/
│   │           └── session.handler.ts (broadcast session.updated events)
│   │
│   └── client/
│       └── pages/
│           └── projects/
│               └── sessions/
│                   └── hooks/
│                       └── useSessionWebSocket.ts (handle session.updated)
```

### Integration Points

**Shared Types (`@/shared/websocket/`)**:

- `types.ts` - Add `SESSION_UPDATED` constant and `SessionUpdatedData` interface
- Follows existing Phoenix Channels discriminated union pattern

**Backend (WebSocket Handler)**:

- `session.handler.ts` - Use `broadcast()` utility to send events on session channel
- Add broadcasts after state changes (working, idle, error)

**Frontend (WebSocket Hook)**:

- `useSessionWebSocket.ts` - Add case for `SessionEventTypes.SESSION_UPDATED`
- Use `queryClient.setQueryData()` to update cached session
- Remove unnecessary `invalidateQueries()` calls

**Frontend (Query Keys)**:

- `useProjects.ts` - Already exports `projectKeys.withSessions()`

## Implementation Details

### 1. Shared Types - Add SESSION_UPDATED Event

Add new event type to `@/shared/websocket/types.ts` following the existing pattern.

**Key Points**:

- Add `SESSION_UPDATED: 'session_updated'` to `SessionEventTypes` constant
- Define `SessionUpdatedData` interface with optional fields
- Add to `SessionEvent` discriminated union
- All fields optional except `sessionId` (allows partial updates)

### 2. Backend - Broadcast session.updated Events

Use existing `broadcast()` utility in `session.handler.ts` to send events.

**Key Points**:

- Broadcast after setting state to 'working' (line ~120-127)
- Broadcast after setting state to 'idle' (line ~195-202)
- Broadcast after setting state to 'error' (line ~469-476)
- Use `Channels.session(sessionId)` for channel name
- Include minimal data: `sessionId`, `state`, `error_message`, `updated_at`
- Use existing `broadcast()` function (not `sendMessage()`)

### 3. Frontend - Handle session.updated Events

Add case to existing `handleEvent()` switch statement in `useSessionWebSocket.ts`.

**Key Points**:

- Add `case SessionEventTypes.SESSION_UPDATED:` to switch
- Use `queryClient.setQueryData()` to update cache
- Find project by `projectIdRef.current`
- Map over sessions to update matching session
- Merge updated data with existing session
- Keep exhaustive checking with `never` type

### 4. Frontend - Remove Unnecessary Invalidation

Review and optimize query invalidation calls.

**Key Points**:

- Keep invalidation in `MESSAGE_COMPLETE` for metadata updates
- Remove any redundant invalidation calls
- Rely on `session.updated` events for state changes

## Files to Create/Modify

### New Files (0)

No new files required.

### Modified Files (3)

1. `apps/web/src/shared/websocket/types.ts` - Add `SESSION_UPDATED` event type and data interface
2. `apps/web/src/server/websocket/handlers/session.handler.ts` - Broadcast `session.updated` events after state changes
3. `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Handle `session.updated` events with direct cache updates

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Shared Types - Add SESSION_UPDATED Event Type

<!-- prettier-ignore -->
- [x] Add SESSION_UPDATED constant to SessionEventTypes
  - File: `apps/web/src/shared/websocket/types.ts`
  - Add to SessionEventTypes object:
    ```typescript
    export const SessionEventTypes = {
      STREAM_OUTPUT: 'stream_output',
      MESSAGE_COMPLETE: 'message_complete',
      ERROR: 'error',
      SUBSCRIBE_SUCCESS: 'subscribe_success',
      SEND_MESSAGE: 'send_message',
      CANCEL: 'cancel',
      SUBSCRIBE: 'subscribe',
      SESSION_UPDATED: 'session_updated', // NEW
    } as const;
    ```

- [x] Add SessionUpdatedData interface
  - File: `apps/web/src/shared/websocket/types.ts`
  - Add interface after existing data interfaces:
    ```typescript
    export interface SessionUpdatedData {
      sessionId: string;
      state?: 'idle' | 'working' | 'error';
      error_message?: string | null;
      metadata?: Record<string, unknown>;
      name?: string;
      updated_at?: Date | string;
    }
    ```

- [x] Add SESSION_UPDATED to SessionEvent discriminated union
  - File: `apps/web/src/shared/websocket/types.ts`
  - Add to SessionEvent type:
    ```typescript
    export type SessionEvent =
      | { type: typeof SessionEventTypes.STREAM_OUTPUT; data: StreamOutputData }
      | { type: typeof SessionEventTypes.MESSAGE_COMPLETE; data: CompleteData }
      | { type: typeof SessionEventTypes.ERROR; data: ErrorData }
      | { type: typeof SessionEventTypes.SUBSCRIBE_SUCCESS; data: SubscribeSuccessData }
      | { type: typeof SessionEventTypes.SESSION_UPDATED; data: SessionUpdatedData }; // NEW
    ```

#### Completion Notes

- Added `SESSION_UPDATED: 'session_updated'` to SessionEventTypes constant
- Created `SessionUpdatedData` interface with all fields optional except `sessionId` to support partial updates
- Added SESSION_UPDATED to SessionEvent discriminated union for exhaustive type checking
- All changes follow existing Phoenix Channels pattern with consistent naming and structure

### Task Group 2: Backend - Broadcast session.updated Events After State Changes

<!-- prettier-ignore -->
- [x] Broadcast session.updated when state changes to 'working'
  - Add after line 127 in handleSessionSendMessage()
  - File: `apps/web/src/server/websocket/handlers/session.handler.ts`
  - Import from shared types: `import { SessionEventTypes } from '@/shared/websocket';`
  - Use broadcast utility:
    ```typescript
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.SESSION_UPDATED,
      data: {
        sessionId,
        state: 'working',
        error_message: null,
        updated_at: new Date().toISOString(),
      },
    });
    ```

- [x] Broadcast session.updated when state changes to 'idle'
  - Add after line 202 in handleSessionSendMessage()
  - File: `apps/web/src/server/websocket/handlers/session.handler.ts`
  - Get updated session data from database if needed
  - Use broadcast utility:
    ```typescript
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.SESSION_UPDATED,
      data: {
        sessionId,
        state: 'idle',
        error_message: null,
        updated_at: new Date().toISOString(),
      },
    });
    ```

- [x] Broadcast session.updated when state changes to 'error'
  - Add after line 476 in handleExecutionFailure()
  - File: `apps/web/src/server/websocket/handlers/session.handler.ts`
  - Use broadcast utility:
    ```typescript
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.SESSION_UPDATED,
      data: {
        sessionId,
        state: 'error',
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      },
    });
    ```

#### Completion Notes

- Added `session.updated` broadcasts after all three state transitions (working, idle, error)
- Added `session.updated` broadcast after session name generation (line 657-665)
- Used existing `broadcast()` utility with `Channels.session(sessionId)` for proper channel-based routing
- All broadcasts include minimal data: `sessionId`, `state`, `error_message`, `name`, and `updated_at` (ISO string)
- Broadcasts occur immediately after database updates to ensure consistency
- Error state broadcast includes the error message for client-side error display
- Name broadcast enables real-time session name updates in UI without page reload

### Task Group 3: Frontend - Handle session.updated Events

<!-- prettier-ignore -->
- [x] Add case for SESSION_UPDATED to handleEvent switch
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
  - Import projectKeys: `import { projectKeys } from '@/client/pages/projects/hooks/useProjects';`
  - Import type: `import type { ProjectWithSessions } from '@/client/pages/projects/hooks/useProjects';`
  - Add case after MESSAGE_COMPLETE case (around line 152):
    ```typescript
    case SessionEventTypes.SESSION_UPDATED: {
      const data = event.data;
      console.log('[useSessionWebSocket] session.updated received:', data);

      // Update cached session data directly (no refetch)
      queryClient.setQueryData<ProjectWithSessions[]>(
        projectKeys.withSessions(),
        (old) => {
          if (!old) return old;

          return old.map((project) => {
            // Find project containing this session
            if (project.id !== projectIdRef.current) return project;

            // Update the matching session
            return {
              ...project,
              sessions: project.sessions.map((session) =>
                session.id === sessionIdRef.current
                  ? {
                      ...session,
                      state: data.state ?? session.state,
                      error_message: data.error_message ?? session.error_message,
                      metadata: data.metadata ?? session.metadata,
                      name: data.name ?? session.name,
                      updated_at: data.updated_at
                        ? new Date(data.updated_at)
                        : session.updated_at,
                    }
                  : session
              ),
            };
          });
        }
      );
      break;
    }
    ```

- [x] Verify exhaustive checking still works
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
  - TypeScript should error if any SessionEvent cases are missing
  - The `default: const _exhaustive: never = event;` should catch any missed cases

#### Completion Notes

- Added SESSION_UPDATED case to handleEvent switch statement with direct cache updates
- Imported `projectKeys` and `ProjectWithSessions` type for proper query cache manipulation
- Used `queryClient.setQueryData()` to update React Query cache without triggering refetch
- Implemented immutable updates with proper TypeScript typing
- Used nullish coalescing (`??`) to merge partial updates with existing session data
- Converted `updated_at` string to Date object for proper typing
- Exhaustive type checking with `never` type still works - TypeScript will error if any SessionEvent cases are missing

## Testing Strategy

### Unit Tests

No new unit tests required. This is an optimization of existing functionality that maintains the same external behavior.

### Integration Tests

**Manual Integration Testing**:

1. **State Transition Test (Working → Idle)**:
   - Open app, navigate to a project
   - Create new session and send a message
   - Verify sidebar shows "Processing" badge immediately
   - Wait for message to complete
   - Verify sidebar shows no badge (idle state) immediately
   - Check Network tab: Should see WebSocket messages, NO new API calls to `/api/projects`

2. **State Transition Test (Working → Error)**:
   - Send a message that will fail (e.g., invalid command)
   - Verify sidebar shows "Processing" badge
   - Wait for error
   - Verify sidebar shows error badge with tooltip
   - Check Network tab: Should see WebSocket messages, NO new API calls

3. **Multi-Session Test**:
   - Create multiple sessions in same project
   - Send messages to different sessions
   - Verify only the active session's state updates in sidebar
   - Other sessions should remain unchanged

4. **WebSocket Reconnection Test**:
   - Start a session message
   - Kill WebSocket connection (DevTools → Network → WS → disconnect)
   - Reconnect WebSocket
   - Verify state still updates correctly (fallback to query invalidation)

### E2E Tests

Consider adding E2E test to verify real-time state updates:

**`apps/web/tests/e2e/session-state-updates.test.ts`**:

```typescript
test("session state updates in real-time via WebSocket", async ({ page }) => {
  // Navigate to project
  await page.goto("/projects/test-project-id");

  // Create session and send message
  await page.click('[data-testid="new-session-button"]');
  await page.fill('[data-testid="chat-input"]', "test message");
  await page.click('[data-testid="send-button"]');

  // Verify "Processing" badge appears immediately
  await expect(
    page.locator('[data-testid="session-state-badge"]')
  ).toContainText("Processing");

  // Wait for completion (timeout 30s)
  await expect(
    page.locator('[data-testid="session-state-badge"]')
  ).not.toBeVisible({ timeout: 30000 });

  // Verify no API calls to /api/projects were made (only WebSocket messages)
  const apiCalls = page
    .requests()
    .filter((req) => req.url().includes("/api/projects"));
  expect(apiCalls.length).toBe(1); // Only initial load, no refetch
});
```

## Success Criteria

- [ ] Session state changes trigger WebSocket `session.updated` events
- [ ] Frontend receives events and updates cache directly without API calls
- [ ] Sidebar session badges update instantly when state changes
- [ ] No new API calls to `/api/projects` when session state changes (except on MESSAGE_COMPLETE)
- [ ] WebSocket events follow Phoenix Channels pattern with discriminated unions
- [ ] Type safety maintained with `SessionUpdatedData` interface in shared types
- [ ] Exhaustive type checking works in frontend switch statement
- [ ] All existing functionality continues to work (backward compatible)
- [ ] No console errors or warnings in browser
- [ ] Performance improvement measurable (0-1 API calls vs multiple API calls per state change)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Build verification
pnpm build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Open browser: `http://localhost:5173`
3. Open DevTools → Network tab → Filter by WS (WebSocket)
4. Navigate to a project with sessions
5. Create new session and send a message
6. Verify in Network tab:
   - WebSocket messages: `session.{id}.updated` with `state: 'working'`
   - WebSocket messages: `session.{id}.updated` with `state: 'idle'`
   - NO new XHR/Fetch requests to `/api/projects`
7. Check sidebar:
   - Session shows "Processing" badge immediately when message starts
   - Badge disappears immediately when message completes
   - No delay or flash of old state
8. Test error case:
   - Send invalid message (e.g., nonsense command)
   - Verify error badge appears immediately
   - Check WebSocket message includes `state: 'error'` and `error_message`
9. Check console: No errors or warnings

**Feature-Specific Checks:**

- [ ] Open React DevTools → Components → QueryClientProvider
- [ ] Find query with key `["projects", "with-sessions"]`
- [ ] Verify `dataUpdatedAt` timestamp does NOT change when session state updates (proves no refetch)
- [ ] Verify session data within query DOES update with new state
- [ ] Test with multiple sessions in same project - only active session updates
- [ ] Test with multiple projects - only sessions in active project update

## Implementation Notes

### 1. Phoenix Channels Pattern

This implementation follows the Phoenix Channels pattern already established in the WebSocket system:
- **Channels**: Use `Channels.session(sessionId)` for routing
- **Events**: Use discriminated unions from `SessionEventTypes`
- **EventBus**: Subscribe via `eventBus.on<SessionEvent>(channel, handler)`
- **Broadcasting**: Use `broadcast()` utility on backend, not `sendMessage()`

For complete details, see: `.agent/docs/websockets.md`

### 2. Query Invalidation as Fallback

Keep the existing `queryClient.invalidateQueries({ queryKey: projectKeys.withSessions() })` call in the `MESSAGE_COMPLETE` handler as a fallback. This ensures that if WebSocket updates fail, the cache will still be refreshed when the message completes.

### 3. Timestamp Handling

The `updated_at` field should be sent as an ISO string from the backend (`new Date().toISOString()`) and converted to a Date object in the frontend. This ensures proper serialization over WebSocket and proper typing in the React Query cache.

### 4. Partial Updates

The `SessionUpdatedData` interface uses all optional fields (except `sessionId`) to support partial updates. This allows sending only the fields that changed, reducing payload size. The frontend merges the partial data with existing session data using the nullish coalescing operator (`??`).

### 5. Cache Immutability

Always create new objects when updating the cache - never mutate existing objects. The implementation uses `map()` to create new arrays and spread operators to create new objects, ensuring React Query detects changes and triggers re-renders.

### 6. Exhaustive Type Checking

The frontend switch statement uses TypeScript's exhaustive checking pattern with `never` type. When you add `SESSION_UPDATED` to the `SessionEvent` union, TypeScript will error until you add the corresponding case to the switch statement.

### 7. Session Not Found Edge Case

If the session or project is not found in the cache when the `SESSION_UPDATED` handler runs, the handler returns the unchanged cache. This is safe because the session will appear on the next full refetch (e.g., on page refresh or manual query invalidation).

## Dependencies

- No new dependencies required
- Uses existing WebSocket infrastructure (`@fastify/websocket`)
- Uses existing React Query (`@tanstack/react-query`)
- Uses existing type definitions (`SessionResponse`, `ProjectWithSessions`)

## Timeline

| Task                                 | Estimated Time |
| ------------------------------------ | -------------- |
| Shared Types - Add SESSION_UPDATED   | 15 minutes     |
| Backend - Broadcast session.updated  | 30 minutes     |
| Frontend - Handle WebSocket updates  | 30 minutes     |
| Testing - Manual integration tests   | 30 minutes     |
| **Total**                            | **1-2 hours**  |

## References

- [React Query - Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [React Query - setQueryData](https://tanstack.com/query/latest/docs/react/reference/QueryClient#queryclientsetquerydata)
- [Fastify WebSocket Plugin](https://github.com/fastify/fastify-websocket)
- Existing implementation: `apps/web/src/server/websocket/handlers/session.handler.ts`
- Existing query keys: `apps/web/src/client/pages/projects/hooks/useProjects.ts`

## Next Steps

1. Review and approve this spec
2. Implement backend changes (Task Groups 1-3)
3. Test backend WebSocket events in browser DevTools
4. Implement frontend changes (Task Group 4)
5. Run manual integration tests
6. Verify no regressions in existing functionality
7. Consider adding E2E tests for state transitions
8. Update spec status to 'completed'
