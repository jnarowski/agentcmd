# Session Message Queue

**Status**: draft
**Created**: 2025-11-28
**Package**: apps/app
**Total Complexity**: 68 points
**Phases**: 6
**Tasks**: 18
**Overall Avg Complexity**: 3.8/10

## Complexity Breakdown

| Phase                  | Tasks | Total Points | Avg Complexity | Max Task |
| ---------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Queue Core    | 3     | 11           | 3.7/10         | 5/10     |
| Phase 2: WebSocket API | 2     | 7            | 3.5/10         | 4/10     |
| Phase 3: Server Logic  | 4     | 21           | 5.3/10         | 7/10     |
| Phase 4: Client State  | 3     | 11           | 3.7/10         | 5/10     |
| Phase 5: Client Events | 2     | 8            | 4.0/10         | 5/10     |
| Phase 6: UI Components | 4     | 10           | 2.5/10         | 4/10     |
| **Total**              | **18**| **68**       | **3.8/10**     | **7/10** |

## Overview

Add in-memory message queueing to prevent race conditions when users submit multiple messages while an agent session is actively processing. Messages are queued at the WebSocket handler level and automatically processed in FIFO order after each execution completes.

## User Story

As a user submitting multiple messages to an agent session
I want messages to queue automatically when the agent is busy
So that I can continue working without race conditions or lost messages

## Technical Approach

Extend the `ActiveSessionsManager` singleton with queue management methods. Add a guard clause in the WebSocket handler to check if a session is processing - if busy, enqueue the message and broadcast a `MESSAGE_QUEUED` event. After agent execution completes, automatically dequeue the next message and process it. Clear the queue on cancellation or error (fail-fast approach).

## Key Design Decisions

1. **In-memory queue**: Simpler than database persistence, matches active session lifecycle, acceptable trade-off for race condition prevention (not a durable job queue)
2. **WebSocket-level queueing**: Guards at handler level before CLI spawn, works with existing one-shot execution model, no SDK changes required
3. **Fail-fast on error**: Clear queue on execution failure or cancellation to avoid cascading failures and confusion
4. **Rate limiting**: Hard limit of 10 messages prevents memory bloat and user confusion
5. **Visual feedback**: Grayed-out messages with "Queued (#N)" badge provides immediate UX clarity

## Architecture

### File Structure

```
apps/app/src/
├── server/
│   ├── websocket/
│   │   ├── infrastructure/
│   │   │   └── active-sessions.ts         # Queue data structure + methods
│   │   └── handlers/
│   │       └── session.handler.ts         # Guard clause + dequeue logic
│   └── shared/
│       └── types/
│           └── websocket.types.ts         # New event types
├── client/
│   └── pages/projects/sessions/
│       ├── stores/
│       │   └── sessionStore.ts            # Queue state management
│       ├── hooks/
│       │   └── useSessionWebSocket.ts     # Event handlers
│       └── components/
│           ├── QueuedMessageBadge.tsx     # NEW badge component
│           └── session/claude/
│               └── UserMessage.tsx        # Visual styling
```

### Integration Points

**Server WebSocket Layer**:
- `active-sessions.ts` - Add queue storage + management methods
- `session.handler.ts` - Guard clause (line 62+), dequeue logic (line 177+), cancel/error handling

**Shared Types**:
- `websocket.types.ts` - New event types: `MESSAGE_QUEUED`, `MESSAGE_DEQUEUED`, `QUEUE_CLEARED`

**Client State Layer**:
- `sessionStore.ts` - Queue flags on UIMessage + actions for state management
- `useSessionWebSocket.ts` - Event handlers for queue lifecycle events

**Client UI Layer**:
- `QueuedMessageBadge.tsx` - Reusable badge showing queue status
- `UserMessage.tsx` - Apply opacity styling + render badge for queued messages

## Implementation Details

### 1. Queue Data Structure

Extend `ActiveSessionData` interface with optional queue array and processing flag. Each queued message includes server-generated UUID, content, images, config, and timestamp. Queue methods follow standard patterns: enqueue (push), dequeue (shift), check length, clear all.

**Key Points**:
- Queue stored as `QueuedMessage[]` array per session
- `isProcessing` flag prevents concurrent execution
- Methods: `enqueueMessage`, `dequeueMessage`, `hasQueuedMessages`, `getQueueLength`, `clearQueue`, `setProcessing`, `isProcessing`
- UUIDs prevent duplicate tracking issues

### 2. WebSocket Event Types

Add three new event types following existing dot notation pattern. Each event includes sessionId and relevant data (queued message details, queue position, cleared count).

**Key Points**:
- Event constants: `MESSAGE_QUEUED`, `MESSAGE_DEQUEUED`, `QUEUE_CLEARED`
- Data interfaces: `MessageQueuedData`, `MessageDequeuedData`, `QueueClearedData`
- Update discriminated union type for type safety

### 3. Server Guard Clause

Add guard clause after session ownership validation (line 62). Check if session is processing - if yes, validate queue size, enqueue message, broadcast event, return early. If no, set processing flag and continue to execution.

**Key Points**:
- Check `isProcessing()` before execution
- Rate limit: max 10 messages, reject with `QUEUE_FULL` error
- Broadcast `MESSAGE_QUEUED` with queue position
- Early return prevents race condition

### 4. Server Dequeue Logic

After successful execution completes (before setting state to idle at line 177), check if queue has messages. If yes, dequeue next message, broadcast event, process via `setImmediate` (async, non-blocking). If no, set processing flag to false and continue to idle state.

**Key Points**:
- Check `hasQueuedMessages()` after execution
- Dequeue and process via `setImmediate` (avoids blocking)
- Recursively calls `handleSessionSendMessage` with queued data
- Only set processing=false when queue empty

### 5. Cancellation and Error Handling

Update cancel handler to clear queue via `clearQueue()`, broadcast `QUEUE_CLEARED`, set processing=false. Update error handler similarly to clear queue on execution failure (fail-fast prevents cascading failures).

**Key Points**:
- Clear queue on both cancel and error
- Broadcast `QUEUE_CLEARED` for UI sync
- Set `isProcessing = false` to reset state
- Log cleared message count

### 6. Client State Management

Add three optional fields to `UIMessage` interface: `_queued`, `_queuePosition`, `_queuedAt`. Add three actions to `SessionStore`: `markMessageQueued`, `markMessageDequeued`, `clearQueuedMessages`. Actions map messages immutably using message ID.

**Key Points**:
- Underscore prefix indicates UI-only fields (not from server)
- Immutable updates using spread operators
- Actions check `currentSession?.id` for safety
- Queue position displayed in badge

### 7. Client Event Handlers

Add three switch cases to `handleEvent` function in `useSessionWebSocket.ts`. Match optimistic message by content on `MESSAGE_QUEUED`, update state on `MESSAGE_DEQUEUED`, clear queued messages on `QUEUE_CLEARED`.

**Key Points**:
- Find optimistic message by matching text content
- Update Zustand store via actions
- Debug logging in dev mode
- Handle edge case where message not found (log warning)

### 8. UI Badge Component

Create reusable badge component showing clock icon + "Queued" text + optional position. Uses `Badge` from ui components with secondary variant and small text size.

**Key Points**:
- Clock icon from lucide-react
- Optional queue position display: "Queued (#2)"
- Secondary variant styling (gray)
- Inline gap for icon spacing

### 9. UserMessage Styling

Update `UserMessage` component to check `message._queued` flag. Apply `opacity-50` class to container when queued. Render `QueuedMessageBadge` with queue position when queued.

**Key Points**:
- Conditional opacity styling via `cn()` utility
- Badge positioned after message content
- Queue position passed to badge
- Visual distinction without layout shift

## Files to Create/Modify

### New Files (1)

1. `apps/app/src/client/pages/projects/sessions/components/QueuedMessageBadge.tsx` - Reusable badge component for queued messages

### Modified Files (6)

1. `apps/app/src/server/websocket/infrastructure/active-sessions.ts` - Add queue data structure and management methods
2. `apps/app/src/shared/types/websocket.types.ts` - Add new event types and data interfaces
3. `apps/app/src/server/websocket/handlers/session.handler.ts` - Add guard clause, dequeue logic, cancel/error handling
4. `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts` - Add queue state fields and actions
5. `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Add event handlers for queue events
6. `apps/app/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx` - Add visual styling for queued messages

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Queue Core

**Phase Complexity**: 11 points (avg 3.7/10)

- [ ] 1.1 [3/10] Add `QueuedMessage` interface to active-sessions.ts
  - Define interface with id, message, images, config, enqueuedAt fields
  - File: `apps/app/src/server/websocket/infrastructure/active-sessions.ts`

- [ ] 1.2 [3/10] Add queue fields to `ActiveSessionData` interface
  - Add optional `messageQueue?: QueuedMessage[]` and `isProcessing?: boolean`
  - File: `apps/app/src/server/websocket/infrastructure/active-sessions.ts`

- [ ] 1.3 [5/10] Implement queue management methods in `ActiveSessionsManager`
  - Add methods: `enqueueMessage`, `dequeueMessage`, `hasQueuedMessages`, `getQueueLength`, `clearQueue`, `setProcessing`, `isProcessing`
  - Initialize queue as empty array on first enqueue
  - File: `apps/app/src/server/websocket/infrastructure/active-sessions.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: WebSocket API

**Phase Complexity**: 7 points (avg 3.5/10)

- [ ] 2.1 [3/10] Add new event type constants to `SessionEventTypes`
  - Add: `MESSAGE_QUEUED`, `MESSAGE_DEQUEUED`, `QUEUE_CLEARED`
  - File: `apps/app/src/shared/types/websocket.types.ts`

- [ ] 2.2 [4/10] Add data interfaces and update discriminated union
  - Define `MessageQueuedData`, `MessageDequeuedData`, `QueueClearedData` interfaces
  - Add three new cases to `SessionEvent` discriminated union type
  - File: `apps/app/src/shared/types/websocket.types.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Server Logic

**Phase Complexity**: 21 points (avg 5.3/10)

- [ ] 3.1 [7/10] Add guard clause with enqueue logic in `handleSessionSendMessage`
  - After line 62 (session ownership validation), check `activeSessions.isProcessing(sessionId)`
  - If processing: validate queue size (max 10), enqueue message, broadcast `MESSAGE_QUEUED`, return early
  - If not processing: set `activeSessions.setProcessing(sessionId, true)` and continue
  - Include rate limiting with `QUEUE_FULL` error
  - File: `apps/app/src/server/websocket/handlers/session.handler.ts`

- [ ] 3.2 [6/10] Add dequeue logic after execution completion
  - After line 177 (before setting state to idle), check `activeSessions.hasQueuedMessages(sessionId)`
  - If has messages: dequeue next, broadcast `MESSAGE_DEQUEUED`, process via `setImmediate`, return early
  - If no messages: set `isProcessing = false` and continue to idle state update
  - File: `apps/app/src/server/websocket/handlers/session.handler.ts`

- [ ] 3.3 [4/10] Update cancel handler to clear queue
  - In `handleSessionCancel`, after successful cancellation, clear queue via `clearQueue()`
  - Broadcast `QUEUE_CLEARED` event with cleared count
  - Set `isProcessing = false`
  - File: `apps/app/src/server/websocket/handlers/session.handler.ts`

- [ ] 3.4 [4/10] Update error handler to clear queue
  - After execution failure (line 144-152), clear queue via `clearQueue()`
  - Broadcast `QUEUE_CLEARED` event
  - Set `isProcessing = false`
  - File: `apps/app/src/server/websocket/handlers/session.handler.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 4: Client State

**Phase Complexity**: 11 points (avg 3.7/10)

- [ ] 4.1 [3/10] Add queue fields to UIMessage type
  - Add optional fields: `_queued?: boolean`, `_queuePosition?: number`, `_queuedAt?: number`
  - Note: Underscore prefix indicates UI-only fields
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 4.2 [5/10] Implement queue management actions in SessionStore
  - Add action signatures to interface: `markMessageQueued`, `markMessageDequeued`, `clearQueuedMessages`
  - Implement actions using immutable updates (map messages, update matching message ID)
  - Check `currentSession?.id` for safety
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

- [ ] 4.3 [3/10] Export queue state selectors (optional)
  - Add helper selector to get queued message count: `(state) => state.currentSession?.messages.filter(m => m._queued).length`
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 5: Client Events

**Phase Complexity**: 8 points (avg 4.0/10)

- [ ] 5.1 [5/10] Add WebSocket event handlers in useSessionWebSocket
  - Add three cases to `handleEvent` switch: `MESSAGE_QUEUED`, `MESSAGE_DEQUEUED`, `QUEUE_CLEARED`
  - For MESSAGE_QUEUED: find optimistic message by content matching, call `markMessageQueued`
  - For MESSAGE_DEQUEUED: call `markMessageDequeued` with messageId
  - For QUEUE_CLEARED: call `clearQueuedMessages`
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

- [ ] 5.2 [3/10] Add debug logging for queue events
  - Add dev-mode console logs for each queue event
  - Log queue position, message ID, cleared count
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 6: UI Components

**Phase Complexity**: 10 points (avg 2.5/10)

- [ ] 6.1 [4/10] Create QueuedMessageBadge component
  - Create new file with Badge component from ui
  - Show Clock icon from lucide-react + "Queued" text
  - Optional queue position display: "Queued (#2)"
  - Use secondary variant and small text size
  - File: `apps/app/src/client/pages/projects/sessions/components/QueuedMessageBadge.tsx`

- [ ] 6.2 [3/10] Import QueuedMessageBadge in UserMessage
  - Add import for QueuedMessageBadge
  - Add import for cn utility if not present
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx`

- [ ] 6.3 [2/10] Add queue state checks to UserMessage
  - Extract `isQueued` and `queuePosition` from message props
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx`

- [ ] 6.4 [1/10] Apply visual styling to UserMessage
  - Apply `opacity-50` class via `cn()` when `isQueued` is true
  - Render `<QueuedMessageBadge queuePosition={queuePosition} />` when `isQueued`
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

**`active-sessions.test.ts`** - Queue management methods:

```typescript
describe('ActiveSessionsManager queue', () => {
  it('should enqueue messages in FIFO order', () => {
    const manager = new ActiveSessionsManager();
    manager.enqueueMessage('session1', { id: '1', message: 'first', enqueuedAt: Date.now() });
    manager.enqueueMessage('session1', { id: '2', message: 'second', enqueuedAt: Date.now() });

    const first = manager.dequeueMessage('session1');
    expect(first?.message).toBe('first');

    const second = manager.dequeueMessage('session1');
    expect(second?.message).toBe('second');
  });

  it('should clear queue on clearQueue()', () => {
    const manager = new ActiveSessionsManager();
    manager.enqueueMessage('session1', { id: '1', message: 'msg', enqueuedAt: Date.now() });
    manager.clearQueue('session1');
    expect(manager.hasQueuedMessages('session1')).toBe(false);
  });
});
```

### Integration Tests

Manual testing with rapid message submission:

1. Start dev server: `pnpm dev`
2. Open session in browser
3. Submit 3 messages rapidly (within 1 second)
4. Verify: First message processes immediately, messages 2-3 show "Queued" badge
5. Verify: Messages process in order after each completion

### E2E Tests

**`session-message-queue.spec.ts`** - Queue behavior:

```typescript
test('should queue messages when agent is busy', async ({ page }) => {
  await page.goto('/projects/test-project/sessions/test-session');

  // Submit 3 rapid messages
  await page.fill('[data-testid="message-input"]', 'Message 1');
  await page.click('[data-testid="send-button"]');
  await page.fill('[data-testid="message-input"]', 'Message 2');
  await page.click('[data-testid="send-button"]');
  await page.fill('[data-testid="message-input"]', 'Message 3');
  await page.click('[data-testid="send-button"]');

  // Verify queue badges appear
  await expect(page.locator('text=Queued')).toHaveCount(2);

  // Wait for processing
  await expect(page.locator('text=Queued')).toHaveCount(0, { timeout: 30000 });
});
```

## Success Criteria

- [ ] Messages submitted while agent is busy are queued (not lost)
- [ ] Messages process in FIFO order
- [ ] Queue displays with grayed-out styling and "Queued" badge
- [ ] Queue position badge updates correctly (#1, #2, etc)
- [ ] Canceling session clears all queued messages
- [ ] Execution failure clears queue (fail-fast)
- [ ] Queue limit enforced (max 10 messages)
- [ ] `QUEUE_FULL` error shown when limit exceeded
- [ ] No race conditions or orphaned processes
- [ ] No type errors in TypeScript compilation
- [ ] All existing tests pass
- [ ] Queue works for all permission modes (default, plan, acceptEdits, bypassPermissions)

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

# Unit tests (if added)
cd apps/app && pnpm test active-sessions
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: `http://localhost:4101/projects/{project-id}/sessions/{session-id}`
3. Verify: Submit 3 rapid messages - first processes, other 2 show "Queued" badge
4. Test cancellation: Submit 3 messages, cancel session before queue processes
5. Check console: No errors or warnings
6. Test queue limit: Submit 12 rapid messages - 11th+ should show QUEUE_FULL error

**Feature-Specific Checks:**

- Submit messages in planning mode - queue works identically
- Submit messages with images - images preserved in queue
- Disconnect/reconnect WebSocket - queue lost (expected behavior)
- Check queue position badges update correctly as messages process
- Verify opacity styling distinguishes queued messages visually

## Implementation Notes

### 1. Queue vs Durable Job Queue

This is NOT a durable job queue like BullMQ/Redis. Messages are lost on server restart. This is acceptable because:
- Primary goal is race condition prevention (not persistence)
- In-flight messages already lost on restart
- User sees error and can resubmit
- Simpler implementation without database/Redis dependency

### 2. Recursive Processing Pattern

Dequeue logic uses `setImmediate(() => handleSessionSendMessage(...))` pattern to:
- Avoid blocking the current execution context
- Process next message asynchronously
- Allow other events to be handled between queue processing
- Recursively call the same handler (works because guard clause prevents re-entry)

### 3. Optimistic Message Matching

Client must match optimistic message to server queue event by content comparison. This is necessary because:
- Client creates optimistic message immediately on submit
- Server generates UUID for queued message
- Must link optimistic message to queued message for state updates
- Content matching is reliable for user-submitted messages

## Dependencies

- No new dependencies required
- Uses existing WebSocket infrastructure
- Uses existing Zustand store patterns
- Uses existing UI components (Badge, Clock icon)

## References

- Plan document: `/Users/devbot/.claude/plans/polished-juggling-quail.md`
- Prior exploration: Confirmed stdin not available in CLI execution model
- WebSocket patterns: `.agent/docs/websocket-architecture.md`
- Active sessions: `apps/app/src/server/websocket/infrastructure/active-sessions.ts`
- Session handler: `apps/app/src/server/websocket/handlers/session.handler.ts`

## Next Steps

1. Implement Phase 1 (Queue Core) - data structure and methods
2. Implement Phase 2 (WebSocket API) - event types
3. Implement Phase 3 (Server Logic) - guard clause and dequeue
4. Implement Phase 4 (Client State) - Zustand store updates
5. Implement Phase 5 (Client Events) - WebSocket handlers
6. Implement Phase 6 (UI Components) - badge and styling
7. Test manually with rapid message submission
8. Add E2E test for queue behavior
