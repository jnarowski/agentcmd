# Message Queue

**Status**: draft
**Created**: 2025-11-09
**Package**: apps/app
**Total Complexity**: 38 points
**Phases**: 4
**Tasks**: 11
**Overall Avg Complexity**: 3.5/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Queue State Management | 2 | 10 | 5.0/10 | 6/10 |
| Phase 2: Message Processing Flow | 3 | 13 | 4.3/10 | 5/10 |
| Phase 3: UI Feedback | 3 | 9 | 3.0/10 | 4/10 |
| Phase 4: Edge Cases & Polish | 3 | 6 | 2.0/10 | 3/10 |
| **Total** | **11** | **38** | **3.5/10** | **6/10** |

## Overview

Implements client-side message queuing for chat sessions, allowing users to submit multiple messages while an agent is processing. Messages are queued locally and processed sequentially with visual feedback showing queue position and status.

## User Story

As a user
I want to submit multiple messages while the agent is processing
So that I can continue my workflow without waiting for each response

## Technical Approach

Client-side queue stored in Zustand sessionStore with sequential processing triggered by WebSocket `message_complete` events. No backend changes or persistence - simple in-memory queue that processes messages one at a time with clear UI feedback.

## Key Design Decisions

1. **Client-side only queue**: No backend changes or database persistence. Queue lives in Zustand store and is lost on page reload. Simple, fast, and sufficient for v1.
2. **Sequential processing**: Process one message at a time. When `message_complete` event fires, automatically send next queued message. Prevents race conditions with agent execution.
3. **Visual feedback in chat**: Queued messages appear immediately in chat with "Queued (X/Y)" badge. User sees feedback instantly, clear distinction between queued/sending/sent states.

## Architecture

### File Structure

```
apps/app/src/client/pages/projects/sessions/
├── stores/
│   └── sessionStore.ts           # Add queue state + actions
├── hooks/
│   └── useSessionWebSocket.ts    # Trigger queue processing on events
├── components/
│   ├── ChatPromptInput.tsx       # Queue indicator in input
│   └── ChatMessage.tsx           # Queue badge on messages
└── ProjectSession.tsx            # Update handleSubmit to enqueue
```

### Integration Points

**Session Store (`sessionStore.ts`)**:
- Add `messageQueue: QueuedMessage[]` to SessionData
- Add `isProcessingQueue: boolean` flag
- Add queue actions: enqueueMessage, dequeueMessage, processNextInQueue, clearQueue

**WebSocket Hook (`useSessionWebSocket.ts`)**:
- On `message_complete` event → trigger processNextInQueue()
- Sync isProcessingQueue with session state

**Submit Handler (`ProjectSession.tsx`)**:
- Change handleSubmit to enqueue instead of direct send
- Add useEffect to auto-process queue when idle

## Implementation Details

### 1. Queue Data Structure

Store queue in Zustand with status tracking per message.

**Key Points**:
- Each queued message has unique ID (nanoid or UUID)
- Status: 'pending' | 'sending' | 'sent' | 'error'
- Includes message text, images, config, timestamp
- Queue is per-session (keyed by sessionId in store)

### 2. Queue Processing Logic

Sequential processing triggered by WebSocket events.

**Key Points**:
- Only one message can be "sending" at a time
- When idle and queue not empty → send first pending message
- Mark message as 'sending' before WebSocket send
- On message_complete → mark as 'sent', process next
- On error → mark as 'error', stop queue (simple v1 behavior)

### 3. UI Feedback

Show queue status directly in chat and input area.

**Key Points**:
- Queued messages render in chat with dimmed/gray styling
- Badge shows position: "Queued (2 of 5)"
- Input shows queue count when non-empty
- Sending message shows loading spinner (existing)
- Error messages show red badge with error state

## Files to Create/Modify

### New Files (0)

No new files required - all changes to existing files.

### Modified Files (4)

1. `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts` - Add queue state, types, actions
2. `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx` - Change submit to enqueue, add auto-process effect
3. `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Trigger queue on message_complete
4. `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx` - Show queue indicator

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Queue State Management

**Phase Complexity**: 10 points (avg 5.0/10)

<!-- prettier-ignore -->
- [ ] 1.1 [6/10] Add queue types and state to sessionStore.ts
  - Define `QueuedMessage` interface (id, text, images, config, status, timestamp)
  - Define status type: `'pending' | 'sending' | 'sent' | 'error'`
  - Add to SessionData: `messageQueue: QueuedMessage[]`, `isProcessingQueue: boolean`
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`
  - Lines ~300-309 (SessionData interface)
- [ ] 1.2 [4/10] Add queue actions to sessionStore.ts
  - `enqueueMessage(sessionId, message)` - Add to queue with pending status
  - `dequeueMessage(sessionId)` - Remove first pending message
  - `updateMessageStatus(sessionId, messageId, status)` - Update status
  - `clearQueue(sessionId)` - Clear all queued messages
  - `processNextInQueue(sessionId)` - Send next pending message if idle
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`
  - Lines ~379-500 (actions section)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Message Processing Flow

**Phase Complexity**: 13 points (avg 4.3/10)

<!-- prettier-ignore -->
- [ ] 2.1 [5/10] Update ProjectSession handleSubmit to enqueue
  - Change handleSubmit to call enqueueMessage instead of direct wsSendMessage
  - Keep optimistic UI - add message to chat immediately with 'pending' status
  - Remove old direct send logic
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx`
  - Lines ~129-172 (handleSubmit function)
- [ ] 2.2 [4/10] Add auto-process effect in ProjectSession
  - Add useEffect watching messageQueue and isProcessingQueue
  - If not processing and queue not empty → call processNextInQueue()
  - Dependency: [messageQueue.length, isProcessingQueue, sessionId]
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx`
  - Add after handleSubmit definition
- [ ] 2.3 [4/10] Trigger queue processing in useSessionWebSocket
  - In message_complete handler (line ~112-168) → call processNextInQueue()
  - In error handlers → update message status to 'error', stop processing
  - Sync isProcessingQueue with session state (working/idle)
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
  - Lines ~112-168 (message_complete handler)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: UI Feedback

**Phase Complexity**: 9 points (avg 3.0/10)

<!-- prettier-ignore -->
- [ ] 3.1 [4/10] Add queue badge to messages
  - In ChatMessage or message rendering logic, check message status
  - If status === 'pending', show Badge: "Queued (X of Y)"
  - Calculate position from messageQueue index
  - Apply dimmed/gray styling to pending messages (opacity-60)
  - File: `apps/app/src/client/pages/projects/sessions/components/ChatMessage.tsx` (or inline in ProjectSession.tsx)
  - Check how messages currently render
- [ ] 3.2 [3/10] Show queue count in ChatPromptInput
  - If messageQueue.length > 0, show indicator near input
  - Example: "3 messages queued" as subtle text or badge
  - File: `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`
  - Add to component render, below or above textarea
- [ ] 3.3 [2/10] Add error state styling
  - If message status === 'error', show red badge with error icon
  - Keep message in queue (user can manually retry by resending)
  - File: Same as 3.1 (message rendering)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Edge Cases & Polish

**Phase Complexity**: 6 points (avg 2.0/10)

<!-- prettier-ignore -->
- [ ] 4.1 [3/10] Handle disconnection/reconnection
  - On disconnect (globalIsConnected = false), pause queue processing
  - On reconnect, resume processing if queue not empty
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
  - Add logic in WebSocket connection handlers
- [ ] 4.2 [2/10] Clear queue on session switch
  - When user switches to different session, decide behavior
  - Option A: Clear queue (simple) - recommended for v1
  - Option B: Keep per-session queues (more complex)
  - File: `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx`
  - Add useEffect on sessionId change
- [ ] 4.3 [1/10] Update input disabled logic
  - Input currently disabled when waitingForFirstResponse
  - No change needed - allow input while processing (queuing is the feature)
  - Just verify disabled logic doesn't interfere with queuing
  - File: `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`
  - Lines ~210-213

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`sessionStore.test.ts`** - Queue state management:

```typescript
describe('Message Queue', () => {
  it('should enqueue message with pending status', () => {
    const store = useSessionStore.getState();
    store.enqueueMessage('session1', { text: 'Hello', ... });
    const queue = store.sessions.session1.messageQueue;
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('pending');
  });

  it('should process next message when idle', () => {
    // Enqueue 2 messages
    // Call processNextInQueue
    // Verify first message status changed to 'sending'
    // Verify WebSocket send was called
  });

  it('should not process if already processing', () => {
    // Set isProcessingQueue = true
    // Call processNextInQueue
    // Verify no WebSocket send
  });
});
```

### Integration Tests

Manual testing of queue flow:
1. Start session, send message while agent processing
2. Verify message appears with "Queued" badge
3. Wait for first message to complete
4. Verify queued message automatically sends
5. Test with 3+ queued messages

### E2E Tests (if applicable)

Not critical for v1 - manual testing sufficient given simple scope.

## Success Criteria

- [ ] User can submit multiple messages while agent processing
- [ ] Messages queue locally and process sequentially
- [ ] Queued messages show "Queued (X/Y)" badge in chat
- [ ] Only one message sends to agent at a time
- [ ] Queue automatically processes on message_complete event
- [ ] Failed messages show error state and stop queue
- [ ] No race conditions or duplicate sends
- [ ] TypeScript compiles without errors
- [ ] No console errors during queue processing

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: Build completes without errors

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm check
# Expected: No lint errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:4101/projects/[project-id]/sessions/[session-id]`
3. Verify:
   - Send first message, immediately send 2 more while processing
   - See 2 messages with "Queued (1/2)" and "Queued (2/2)" badges
   - Wait for first message to complete
   - Verify second message automatically sends
4. Test edge cases:
   - Queue 5+ messages, verify all process sequentially
   - Refresh page mid-queue (queue should clear - expected behavior)
   - Switch sessions with queued messages (queue should clear)
5. Check console: No errors or warnings during queue processing

**Feature-Specific Checks:**

- Queue indicator appears in input area when messages queued
- Message status transitions: pending → sending → sent
- Failed messages show error badge and stop queue
- Reconnection resumes queue processing
- Input remains enabled while messages queued (can add more to queue)

## Implementation Notes

### 1. Queue Processing Race Conditions

Prevent multiple messages from processing simultaneously:
- Always check `isProcessingQueue` before sending next message
- Set `isProcessingQueue = true` before WebSocket send
- Set `isProcessingQueue = false` only on message_complete or error
- Use session state sync as secondary safeguard (state === 'working')

### 2. Message ID Generation

Use nanoid or crypto.randomUUID() for queued message IDs:
```typescript
import { nanoid } from 'nanoid';
const messageId = nanoid();
```

### 3. Immutable Queue Updates

Follow existing Zustand patterns - always create new arrays:
```typescript
// ✅ GOOD
set((state) => ({
  sessions: {
    ...state.sessions,
    [sessionId]: {
      ...state.sessions[sessionId],
      messageQueue: [...state.sessions[sessionId].messageQueue, newMessage]
    }
  }
}));

// ❌ BAD
state.sessions[sessionId].messageQueue.push(newMessage);
```

## Dependencies

- No new dependencies required
- Uses existing: nanoid (already in project), Zustand, WebSocket infrastructure

## References

- Session store patterns: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`
- WebSocket event handling: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
- Message rendering: `apps/app/src/client/pages/projects/sessions/ProjectSession.tsx`
- Immutable updates pattern: See CLAUDE.md React Best Practices

## Next Steps

1. Read sessionStore.ts to understand current structure
2. Add queue types and state to SessionData interface
3. Implement queue actions (enqueue, dequeue, processNext)
4. Update ProjectSession.handleSubmit to enqueue messages
5. Add auto-process effect and WebSocket triggers
6. Add UI feedback (badges, queue indicator)
7. Test with multiple queued messages
8. Handle edge cases (disconnect, session switch)
9. Final validation and polish
