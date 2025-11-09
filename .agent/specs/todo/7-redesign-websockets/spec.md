# Redesign WebSocket Reconnection Logic

**Status**: draft
**Created**: 2025-11-09
**Package**: apps/app
**Total Complexity**: 47 points
**Phases**: 4
**Tasks**: 12
**Overall Avg Complexity**: 3.9/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Extract Reconnection Logic | 3 | 15 | 5.0/10 | 6/10 |
| Phase 2: Implement Heartbeat | 2 | 8 | 4.0/10 | 5/10 |
| Phase 3: Update Banner & Context | 3 | 12 | 4.0/10 | 5/10 |
| Phase 4: Testing & Cleanup | 4 | 12 | 3.0/10 | 4/10 |
| **Total** | **12** | **47** | **3.9/10** | **6/10** |

## Overview

Refactor WebSocket reconnection logic by extracting clean patterns from react-use-websocket library. Replace convoluted multi-ref reconnection system with clean handler-based approach, implement proper heartbeat with timeout detection, and simplify connection state tracking to single source of truth.

## User Story

As a developer maintaining the WebSocket connection
I want clean, predictable reconnection logic based on proven patterns
So that connections reliably reconnect with clear state tracking and no banner display bugs

## Technical Approach

Extract reconnection patterns from react-use-websocket source code (specifically `attach-listener.ts` and `heartbeat.ts`) and adapt to our Phoenix Channels EventBus architecture. Replace dual counter system (`connectionAttempts` state + `reconnectAttemptsRef`) with single `reconnectAttempt` ref that serves both logic and UI. Implement heartbeat using interval-based checking with timeout detection (not ping/pong message roundtrip).

## Key Design Decisions

1. **Extract, don't install**: Copy proven patterns from react-use-websocket rather than adding dependency
2. **Single attempt counter**: Use `reconnectAttempt` ref (0-5) for both logic and banner display
3. **Heartbeat via interval checks**: Check last message time every 3s, timeout after 60s of silence
4. **Preserve EventBus**: Keep Phoenix Channels subscription pattern intact
5. **Hardcoded config**: Max 5 attempts, exponential backoff [1s, 2s, 4s, 8s, 16s]

## Architecture

### File Structure

```
apps/app/src/client/
├── providers/
│   └── WebSocketProvider.tsx          # Main refactor - clean handlers
├── components/
│   └── ConnectionStatusBanner.tsx     # Simplified display logic
├── contexts/
│   └── WebSocketContext.ts            # Updated interface
└── utils/
    ├── websocketHandlers.ts           # NEW: Extracted handler functions
    ├── websocketHeartbeat.ts          # NEW: Heartbeat implementation
    └── reconnectionStrategy.ts        # DELETE: Replaced by inline function
```

### Integration Points

**WebSocketProvider.tsx**:
- Replace manual reconnection with `bindCloseHandler` pattern
- Replace manual heartbeat with `startHeartbeat` utility
- Single `reconnectAttempt` ref replaces dual counters
- Expose `reconnectAttempt` in context

**ConnectionStatusBanner.tsx**:
- Use `reconnectAttempt` prop instead of `connectionAttempts`
- Show "Reconnecting... (X/5)" only when attempt > 0 and connecting
- Show "Disconnected" only when attempt >= 5 and closed

**WebSocketContext.ts**:
- Change `connectionAttempts: number` to `reconnectAttempt: number`

## Implementation Details

### 1. WebSocket Handler Functions

Extract handler pattern from react-use-websocket `attach-listener.ts`:

**Key Points**:
- `bindOpenHandler`: Reset `reconnectAttempt` to 0, start heartbeat
- `bindCloseHandler`: Check auth failure (1008), check attempt limit, schedule reconnection with exponential backoff
- `bindMessageHandler`: Track last message time for heartbeat
- `bindErrorHandler`: Log errors, emit to EventBus
- Clean timeout management with refs

### 2. Heartbeat Implementation

Adapt heartbeat from react-use-websocket `heartbeat.ts`:

**Key Points**:
- Check last message time every 3s (interval check)
- Close connection if no message received in 60s (timeout)
- Track last message timestamp in ref
- Clean up interval on connection close
- No ping/pong messages needed (simpler than current implementation)

### 3. Exponential Backoff

Simple inline function replacing `reconnectionStrategy.ts`:

**Key Points**:
- Array lookup: `[1000, 2000, 4000, 8000, 16000]`
- Return last value (16s) if attempt > 4
- No complex calculation needed

### 4. Connection State Simplification

**Key Points**:
- Remove `connectionAttempts` state (never resets, causes banner bugs)
- Use `reconnectAttempt` ref (resets on success, clean counter)
- Expose in context for banner display
- Single source of truth for reconnection tracking

## Files to Create/Modify

### New Files (2)

1. `apps/app/src/client/utils/websocketHandlers.ts` - Handler functions extracted from provider
2. `apps/app/src/client/utils/websocketHeartbeat.ts` - Heartbeat implementation

### Modified Files (3)

1. `apps/app/src/client/providers/WebSocketProvider.tsx` - Main refactor using new handlers
2. `apps/app/src/client/components/ConnectionStatusBanner.tsx` - Simplified display logic
3. `apps/app/src/client/contexts/WebSocketContext.ts` - Updated interface

### Deleted Files (1)

1. `apps/app/src/client/utils/reconnectionStrategy.ts` - Replaced by inline function

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Extract Reconnection Logic

**Phase Complexity**: 15 points (avg 5.0/10)

<!-- prettier-ignore -->
- [ ] handlers-1 [6/10] Extract handler functions into `websocketHandlers.ts`
  - Create file with `bindOpenHandler`, `bindCloseHandler`, `bindMessageHandler`, `bindErrorHandler`
  - Adapt from react-use-websocket `attach-listener.ts` patterns
  - Accept refs, setters, callbacks as params (pure functions)
  - File: `apps/app/src/client/utils/websocketHandlers.ts`
  - Complexity: Requires understanding both libraries, translating patterns
- [ ] handlers-2 [5/10] Add exponential backoff function
  - Inline function: `getReconnectDelay(attempt: number) => delays[attempt] ?? 16000`
  - Array: `[1000, 2000, 4000, 8000, 16000]`
  - File: `apps/app/src/client/utils/websocketHandlers.ts`
  - Complexity: Simple logic, but needs integration with handlers
- [ ] handlers-3 [4/10] Add cleanup utilities
  - `clearReconnectTimeout`, `clearConnectionTimeout` helper functions
  - Consolidate timeout management
  - File: `apps/app/src/client/utils/websocketHandlers.ts`
  - Complexity: Straightforward ref cleanup

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Implement Heartbeat

**Phase Complexity**: 8 points (avg 4.0/10)

<!-- prettier-ignore -->
- [ ] heartbeat-1 [5/10] Create heartbeat implementation
  - Adapt from react-use-websocket `heartbeat.ts`
  - Interval check every 3s, timeout after 60s
  - Track last message time in ref
  - Close connection on timeout
  - File: `apps/app/src/client/utils/websocketHeartbeat.ts`
  - Complexity: Needs adaptation from reference implementation
- [ ] heartbeat-2 [3/10] Add heartbeat cleanup
  - Return cleanup function
  - Clear interval on unmount
  - Auto-cleanup on socket close listener
  - File: `apps/app/src/client/utils/websocketHeartbeat.ts`
  - Complexity: Standard cleanup pattern

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Update Banner & Context

**Phase Complexity**: 12 points (avg 4.0/10)

<!-- prettier-ignore -->
- [ ] provider-1 [5/10] Refactor WebSocketProvider to use new handlers
  - Replace manual reconnection with `bindCloseHandler`
  - Replace manual heartbeat with `startHeartbeat`
  - Remove `connectionAttempts` state, keep only `reconnectAttempt` ref
  - Update message handler to track last message time
  - Remove refs: `heartbeatIntervalRef`, `heartbeatTimeoutRef`, manual ping/pong logic
  - File: `apps/app/src/client/providers/WebSocketProvider.tsx`
  - Complexity: Large refactor but clear patterns to follow
- [ ] banner-1 [4/10] Simplify ConnectionStatusBanner
  - Change prop from `connectionAttempts` to `reconnectAttempt`
  - Show "Reconnecting... (X/5)" when `reconnectAttempt > 0 && readyState === CONNECTING`
  - Show "Disconnected" when `reconnectAttempt >= 5 && readyState === CLOSED`
  - Remove `attemptNumber = connectionAttempts - 1` logic
  - File: `apps/app/src/client/components/ConnectionStatusBanner.tsx`
  - Complexity: UI logic simplification
- [ ] context-1 [3/10] Update WebSocketContext interface
  - Change `connectionAttempts: number` to `reconnectAttempt: number`
  - Update all consumers to use new prop name
  - File: `apps/app/src/client/contexts/WebSocketContext.ts`
  - Files: `apps/app/src/client/layouts/ProtectedLayout.tsx`, `apps/app/src/client/layouts/WorkflowLayout.tsx`
  - Complexity: Simple type change + find/replace

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Testing & Cleanup

**Phase Complexity**: 12 points (avg 3.0/10)

<!-- prettier-ignore -->
- [ ] cleanup-1 [2/10] Delete reconnectionStrategy.ts
  - Remove file: `apps/app/src/client/utils/reconnectionStrategy.ts`
  - Remove import from WebSocketProvider
  - Complexity: Simple deletion
- [ ] test-1 [4/10] Test reconnection scenarios
  - Stop server, verify 5 auto-reconnect attempts with correct delays
  - Verify banner shows "Reconnecting... (1/5)" → "Reconnecting... (5/5)"
  - After 5 attempts, verify "Disconnected" persists with manual "Reconnect" button
  - Click reconnect, verify counter resets and 5 fresh attempts
  - Complexity: Manual testing multiple scenarios
- [ ] test-2 [3/10] Test heartbeat
  - Start server, connect, observe heartbeat logs every 3s
  - Block network for 60s, verify auto-reconnect triggers
  - Verify connection stays alive with normal message traffic
  - Complexity: Requires simulating network conditions
- [ ] test-3 [3/10] Test auth failure handling
  - Modify token to invalid value
  - Verify immediate stop (no reconnection attempts)
  - Verify no "Reconnecting..." banner shown
  - Verify error toast displayed
  - Complexity: Requires token manipulation

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`websocketHandlers.test.ts`** - Test handler functions in isolation:

```typescript
describe('bindCloseHandler', () => {
  it('should not reconnect on auth failure (code 1008)', () => {
    // Mock close event with code 1008
    // Verify no timeout scheduled
  });

  it('should schedule reconnect with exponential backoff', () => {
    // Mock close event
    // Verify setTimeout called with correct delays
  });

  it('should stop after 5 attempts', () => {
    // Set reconnectAttempt to 5
    // Verify no timeout scheduled
    // Verify onReconnectStop callback called
  });
});

describe('getReconnectDelay', () => {
  it('should return exponential delays', () => {
    expect(getReconnectDelay(0)).toBe(1000);
    expect(getReconnectDelay(4)).toBe(16000);
    expect(getReconnectDelay(10)).toBe(16000); // Max
  });
});
```

### Integration Tests

Manual integration testing:

1. **Server disconnect/restart**: Stop server, observe 5 reconnection attempts with correct delays
2. **Auth failure**: Invalid token should immediately stop reconnection
3. **Heartbeat timeout**: Block network, verify reconnection after 60s
4. **Manual reconnect**: Click "Reconnect" button, verify counter resets

### E2E Tests

Not applicable - WebSocket reconnection is infrastructure-level

## Success Criteria

- [ ] Reconnection uses single `reconnectAttempt` ref (0-5)
- [ ] Banner shows accurate attempt count during reconnection
- [ ] Banner shows "Disconnected" only after 5 failed attempts
- [ ] Exponential backoff delays match [1s, 2s, 4s, 8s, 16s]
- [ ] Heartbeat checks every 3s, times out after 60s silence
- [ ] Auth failure (1008) stops reconnection immediately
- [ ] Manual "Reconnect" resets counter for 5 fresh attempts
- [ ] No TypeScript errors
- [ ] All console.log statements use `[WebSocket]` prefix
- [ ] EventBus pattern preserved (Phoenix Channels subscriptions work)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
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

1. Start application: `pnpm dev`
2. Open browser dev tools console
3. Verify: Initial connection succeeds, no errors
4. Stop server: Verify "Reconnecting... (1/5)" banner appears
5. Wait: Observe attempts 2/5, 3/5, 4/5, 5/5 with increasing delays
6. After 5 attempts: Verify "Disconnected" banner persists
7. Click "Reconnect": Verify counter resets, fresh 5 attempts start
8. Restart server during reconnection: Verify connection succeeds, banner disappears

**Feature-Specific Checks:**

- Connection logs show `[WebSocket] 🔄 Scheduling reconnect attempt X/5 in Yms`
- No dual counter bugs (banner always shows correct attempt number)
- Heartbeat logs appear every 3s when connected
- Auth failure (1008) logs "Authentication failed" with no reconnection
- Manual reconnect logs "Manual reconnect triggered" and resets counter

## Implementation Notes

### 1. Why Extract, Not Install?

react-use-websocket is 40KB with many features we don't need (shared sockets, EventSource, Socket.IO). Extracting ~200 lines of reconnection + heartbeat logic keeps bundle lean and gives us full control.

### 2. Heartbeat Design

Using interval-based checking (react-use-websocket pattern) rather than ping/pong roundtrip. Simpler and more reliable - checks last message time every 3s, closes if >60s since last message.

### 3. Single Counter Rationale

`connectionAttempts` state never resets, causing banner to show wrong numbers. `reconnectAttempt` ref resets on success and manual reconnect, providing accurate count for both logic and UI.

### 4. EventBus Preservation

Phoenix Channels pattern via EventBus is NOT being replaced - only improving the underlying WebSocket connection management. All channel subscriptions continue working unchanged.

## Dependencies

No new dependencies required - extracting patterns from react-use-websocket source code

## References

- [react-use-websocket GitHub](https://github.com/robtaussig/react-use-websocket)
- [react-use-websocket attach-listener.ts](https://github.com/robtaussig/react-use-websocket/blob/master/src/lib/attach-listener.ts)
- [react-use-websocket heartbeat.ts](https://github.com/robtaussig/react-use-websocket/blob/master/src/lib/heartbeat.ts)
- Current implementation: `apps/app/src/client/providers/WebSocketProvider.tsx`

## Next Steps

1. Create `websocketHandlers.ts` with extracted handler functions
2. Create `websocketHeartbeat.ts` with heartbeat implementation
3. Refactor `WebSocketProvider.tsx` to use new handlers
4. Update `ConnectionStatusBanner.tsx` and `WebSocketContext.ts`
5. Delete `reconnectionStrategy.ts`
6. Test all reconnection scenarios
