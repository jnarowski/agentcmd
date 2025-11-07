# Frontend WebSocket Re-Subscription

**Status**: draft
**Created**: 2025-01-30
**Package**: apps/web
**Estimated Effort**: 1-2 hours

## Overview

Fix the issue where streaming messages don't appear in the UI after page reload. The backend broadcast/subscription system (spec #20) is working, but the frontend doesn't re-subscribe to session channels after reconnecting, causing ongoing streaming sessions to appear frozen until the user sends a new message.

## User Story

As a user
I want to reload the page during an active agent session
So that I can continue seeing real-time streaming updates without having to send another message

## Technical Approach

Add explicit session subscription on the frontend when loading a session. The frontend will send a `session.{id}.subscribe` WebSocket message when the session loads, triggering the backend to subscribe the socket to that session's broadcast channel. This decouples subscription from message sending, enabling passive session viewing and reconnection scenarios.

## Key Design Decisions

1. **Explicit Subscribe Event**: Use `session.{id}.subscribe` message type rather than overloading existing events or using global subscriptions
2. **Subscribe on Session Load**: Trigger subscription when `sessionId` changes or WebSocket reconnects, not just on mount
3. **Backend Handler Reuse**: Leverage existing `validateSessionOwnership` and `subscribe()` functions rather than duplicating logic
4. **Backward Compatible**: Keep existing auto-subscribe on `send_message` for redundancy and backward compatibility

## Architecture

### File Structure

```
apps/web/src/
├── client/
│   └── pages/projects/sessions/
│       └── hooks/
│           └── useSessionWebSocket.ts          # MODIFY: Add subscribe message
└── server/
    └── websocket/
        └── handlers/
            └── session.handler.ts               # MODIFY: Add subscribe handler
```

### Integration Points

**Frontend WebSocket Hook** (`useSessionWebSocket.ts`):
- Send `session.{id}.subscribe` message when session loads
- Trigger on `sessionId` or `isConnected` state changes
- Reuse existing `sendWsMessage` function

**Backend Session Handler** (`session.handler.ts`):
- Add `handleSessionSubscribe()` function
- Route `.subscribe` events in `handleSessionEvent()`
- Validate ownership before subscribing

## Implementation Details

### 1. Backend Subscribe Handler

Add a new handler function that:
1. Validates user owns the session (reuse `validateSessionOwnership`)
2. Subscribes the socket to the session channel (reuse `subscribe()` from subscriptions.ts)
3. Logs the subscription for debugging
4. Sends no response (fire-and-forget style)

**Key Points**:
- No response message needed (subscription is transparent to client)
- Uses existing validation and subscription infrastructure
- Lightweight operation (just adds socket to Set in Map)
- Idempotent (re-subscribing is safe)

### 2. Frontend Subscribe Message

Modify `useSessionWebSocket` hook to:
1. Send subscribe message when `sessionId` is set and WebSocket is connected
2. Use existing `sendWsMessage` utility
3. Trigger on dependency array: `[sessionId, isConnected, sendWsMessage]`
4. No need to wait for response or handle errors (backend logs failures)

**Key Points**:
- Fire-and-forget message (no response handling needed)
- Runs on every sessionId change (session navigation)
- Runs on reconnection (isConnected changes from false → true)
- Cleanup not needed (backend handles unsubscribe on disconnect)

## Files to Create/Modify

### New Files (0)

No new files required.

### Modified Files (2)

1. `apps/web/src/server/websocket/handlers/session.handler.ts` - Add `handleSessionSubscribe()` function and routing
2. `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Send subscribe message on session load

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Backend Subscribe Handler

<!-- prettier-ignore -->
- [x] ws-resub-1 Add handleSessionSubscribe function
  - File: `apps/web/src/server/websocket/handlers/session.handler.ts`
  - Add new exported async function after `handleSessionCancel`
  - Signature: `handleSessionSubscribe(socket: WebSocket, sessionId: string, userId: string, fastify: FastifyInstance): Promise<void>`
  - Validate session ownership with `await validateSessionOwnership(sessionId, userId)`
  - Subscribe socket: `const channel = sessionChannel(sessionId); subscribe(channel, socket);`
  - Log: `fastify.log.info({ sessionId, channel }, "[WebSocket] Client subscribed to session channel")`
- [x] ws-resub-2 Add routing for .subscribe events
  - File: `apps/web/src/server/websocket/handlers/session.handler.ts`
  - In `handleSessionEvent()` function, add new condition after `.cancel` check
  - Add: `else if (type.endsWith(".subscribe")) { await handleSessionSubscribe(socket, sessionId, userId, fastify); }`
  - Keep existing error handling in catch block

#### Completion Notes

- Added `handleSessionSubscribe()` function to session.handler.ts (lines 186-203)
- Function validates session ownership using existing `validateSessionOwnership()` helper
- Subscribes socket to session channel using existing `subscribe()` utility
- Logs subscription with sessionId and channel for debugging
- Added routing in `handleSessionEvent()` for `.subscribe` events (line 238-239)
- Routing follows same pattern as `.cancel` handler - clean and consistent
- All existing error handling and logging remains intact

### Task Group 2: Frontend Subscribe Message

<!-- prettier-ignore -->
- [x] ws-resub-3 Send subscribe message on session load
  - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
  - Find the useEffect that sets up event listeners (around line 186-210)
  - At the start of the effect (before EventBus subscriptions), add:
    ```typescript
    // Subscribe to session channel on backend
    if (sessionId && isConnected) {
      sendWsMessage(`session.${sessionId}.subscribe`, {});
    }
    ```
  - Update dependency array to include: `[sessionId, isConnected, eventBus, sendWsMessage]`
  - This ensures subscribe happens on sessionId change AND reconnection

#### Completion Notes

- Added subscribe message at the start of the useEffect (lines 189-192)
- Subscribe message is sent when `sessionId` is set AND `isConnected` is true
- Updated dependency array to include `isConnected` and `sendWsMessage` (lines 209-217)
- This ensures the subscribe message is sent:
  - On initial session load
  - When navigating to a different session
  - After WebSocket reconnection (when `isConnected` changes from false → true)
- No response handling needed (fire-and-forget pattern as specified)

## Testing Strategy

### Unit Tests

No new unit tests required. Existing tests for `subscribe()` and `validateSessionOwnership()` cover the functionality.

### Manual Testing

**Test Case 1: Page Reload During Streaming**

1. Start dev server: `pnpm dev`
2. Login and create a new session
3. Send a message that takes 10+ seconds (e.g., "Analyze this entire codebase in detail")
4. After 3 seconds of streaming, reload the page (Cmd+R)
5. **Expected**: Streaming continues automatically without sending a new message
6. **Before fix**: Streaming stops, must send new message to resume

**Test Case 2: Navigate to Active Session**

1. Have an active session streaming in one tab
2. Open new tab, navigate to the same session
3. **Expected**: New tab shows streaming updates in real-time
4. **Before fix**: New tab shows static state until user sends message

**Test Case 3: WebSocket Reconnection**

1. Start session streaming
2. Simulate network interruption (disable WiFi for 2 seconds)
3. Re-enable WiFi
4. **Expected**: Streaming resumes automatically
5. **Before fix**: Streaming stops

### Browser Console Verification

Check browser DevTools > Network > WS for:

1. **On session load**:
   - Outgoing: `{"type":"session.abc123.subscribe","data":{}}`
2. **Backend logs** (`tail -f apps/web/logs/app.log`):
   - `[WebSocket] Client subscribed to session channel`
   - Channel ID shown (e.g., `session:abc123`)

## Success Criteria

- [ ] Page reload during streaming continues to show new messages
- [ ] Navigating to active session shows real-time updates immediately
- [ ] Multiple tabs viewing same session all receive broadcasts
- [ ] Subscribe message sent on every session load
- [ ] Backend logs show subscription events
- [ ] No errors in browser console or backend logs
- [ ] TypeScript compilation succeeds
- [ ] Existing auto-subscribe on send_message still works

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
# Expected: Existing errors only (no new errors)

# Build verification
pnpm build
# Expected: Successful build
```

**Manual Verification:**

1. **Start application**:
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **Open two browser tabs**:
   - Tab 1: Login and create session
   - Tab 2: Navigate to same session URL

3. **Test streaming in Tab 1**:
   - Send message: "Write a detailed analysis of this codebase"
   - Verify: Tab 2 shows streaming updates in real-time ✓

4. **Test page reload**:
   - In Tab 1, send long-running message
   - After 3 seconds, reload Tab 1 (Cmd+R)
   - Verify: Streaming continues after reload ✓

5. **Check WebSocket messages**:
   - Browser DevTools > Network > WS
   - Verify: `session.{id}.subscribe` message sent on page load ✓

6. **Check server logs**:
   ```bash
   tail -f apps/web/logs/app.log | grep -i "subscri"
   ```
   - Verify: "Client subscribed to session channel" logged ✓

**Feature-Specific Checks:**

- Subscribe message sent immediately when session loads ✓
- Subscribe message re-sent after WebSocket reconnection ✓
- Backend logs show subscription with correct channel ID ✓
- Multiple tabs can view same session simultaneously ✓
- Page reload doesn't interrupt ongoing streaming ✓

## Implementation Notes

### 1. Why Fire-and-Forget?

The subscribe message doesn't need a response because:

- Subscription is transparent to the client (no UI feedback needed)
- Backend logs subscription success/failure for debugging
- If subscription fails (e.g., permission denied), broadcasts won't reach client, which is the correct behavior
- Simplifies frontend code (no response handling)

### 2. Idempotency

Calling `subscribe()` multiple times for the same socket/channel is safe:

- `Set.add(socket)` is idempotent (adding existing element is no-op)
- No duplicate subscriptions created
- Safe to send subscribe message on every reconnection

### 3. Backward Compatibility

Keep the auto-subscribe in `handleSessionSendMessage()`:

- Acts as redundancy if subscribe message is missed
- Ensures existing behavior works
- No breaking changes to API

### 4. Error Handling

Subscription failures are logged but not sent to client:

- Permission denied: Logged as warning, broadcasts won't reach socket
- Session not found: Logged as error, broadcasts won't reach socket
- Database error: Logged as error, caught by existing error handling

## Dependencies

No new dependencies required ✓

## Timeline

| Task                     | Estimated Time |
| ------------------------ | -------------- |
| Backend subscribe handler| 30 minutes     |
| Frontend subscribe message| 15 minutes     |
| Testing & validation     | 15-30 minutes  |
| **Total**                | **1-2 hours**  |

## References

- Spec #20: WebSocket Subscription System (backend infrastructure)
- `apps/web/src/server/websocket/utils/subscriptions.ts` - Subscription manager
- `apps/web/src/server/websocket/utils/channels.ts` - Channel naming helpers

## Next Steps

1. Review this spec for accuracy
2. Execute Task Group 1 (backend handler)
3. Execute Task Group 2 (frontend message)
4. Test with manual verification steps
5. Verify in production-like environment
6. Mark spec as completed
