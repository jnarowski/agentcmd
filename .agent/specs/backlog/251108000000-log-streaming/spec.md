# Real-Time Log Streaming

**Status**: draft
**Created**: 2025-11-08
**Package**: apps/app
**Total Complexity**: 68 points
**Phases**: 4
**Tasks**: 17
**Overall Avg Complexity**: 4.0/10

## Complexity Breakdown

| Phase                            | Tasks  | Total Points | Avg Complexity | Max Task |
| -------------------------------- | ------ | ------------ | -------------- | -------- |
| Phase 1: Backend Infrastructure  | 5      | 22           | 4.4/10         | 6/10     |
| Phase 2: WebSocket Integration   | 4      | 18           | 4.5/10         | 6/10     |
| Phase 3: Frontend Implementation | 6      | 22           | 3.7/10         | 5/10     |
| Phase 4: Testing & Polish        | 2      | 6            | 3.0/10         | 4/10     |
| **Total**                        | **17** | **68**       | **4.0/10**     | **6/10** |

## Overview

Add real-time log streaming from Fastify server and Inngest dev server to the web UI via WebSocket. Logs appear in both terminal (during dev) and app UI with 1000-line ring buffer for reconnection history. No special permissions required - any authenticated user can view logs.

## User Story

As a developer using the web app
I want to view Fastify and Inngest logs in real-time within the app UI
So that I can debug issues without switching to terminal or tailing log files

## Technical Approach

Use Phoenix Channels pattern with `logs:server` and `logs:inngest` channels. Capture Inngest stdout/stderr via `stdio: "pipe"` with passthrough to terminal. Hook into Pino logger via custom transport. Implement 1000-line ring buffer for reconnection history. Use virtual scrolling on frontend for performance with 100ms batching to prevent UI jank during high log volume.

## Key Design Decisions

1. **Batching (100ms intervals)**: Prevents overwhelming client with individual messages during high log volume (Inngest can produce 50+ logs/sec)
2. **Virtual scrolling**: Only render visible ~30 lines instead of all 1000 in DOM for performance
3. **Passthrough stdio**: Maintain terminal output during dev while also streaming to WebSocket (best of both worlds)

## Architecture

### File Structure

```
apps/app/
├── src/
│   ├── server/
│   │   ├── utils/
│   │   │   ├── logBroadcaster.ts          (new - ring buffer + broadcast)
│   │   │   └── pinoWsTransport.ts         (new - custom Pino transport)
│   │   ├── websocket/
│   │   │   ├── handlers/
│   │   │   │   └── logs.handler.ts        (new - logs channel handler)
│   │   │   └── index.ts                   (modified - route logs channels)
│   │   └── index.ts                       (modified - add Pino transport)
│   ├── cli/
│   │   └── commands/
│   │       └── start.ts                   (modified - capture Inngest streams)
│   ├── shared/
│   │   └── websocket/
│   │       └── types.ts                   (modified - add log types)
│   └── client/
│       ├── pages/
│       │   └── logs/
│       │       └── index.tsx              (new - logs page)
│       ├── components/
│       │   └── LogViewer.tsx              (new - log viewer component)
│       └── App.tsx                        (modified - add logs route)
```

### Integration Points

**Backend (Fastify)**:

- `apps/app/src/server/index.ts` - Add custom Pino transport to targets array
- `apps/app/src/server/utils/logBroadcaster.ts` - Central log broadcasting + ring buffer
- `apps/app/src/server/websocket/handlers/logs.handler.ts` - Handle subscribe/unsubscribe

**CLI (Inngest spawning)**:

- `apps/app/src/cli/commands/start.ts` - Change stdio from "inherit" to pipe, capture streams

**WebSocket Infrastructure**:

- `apps/app/src/server/websocket/index.ts` - Route `logs:*` channels to logs handler
- `apps/app/src/shared/websocket/types.ts` - Define LogsEventTypes and LogOutputData

**Frontend**:

- `apps/app/src/client/pages/logs/index.tsx` - Subscribe to logs channels, mount viewer
- `apps/app/src/client/components/LogViewer.tsx` - Render logs with virtual scrolling

## Implementation Details

### 1. Log Broadcasting Service

Centralized service managing ring buffers and WebSocket broadcasts for both log sources.

**Key Points**:

- Two separate 1000-line ring buffers (server, inngest)
- `broadcastLog(source, content, level?)` - adds to buffer + broadcasts
- `getLogHistory(source)` - returns buffer contents for new subscribers
- Batching: accumulates logs for 100ms before broadcasting batch
- Thread-safe: uses Map for subscriptions

### 2. Pino Custom Transport

Worker thread transport that intercepts Pino log output and broadcasts to WebSocket clients.

**Key Points**:

- Inherits from `pino-abstract-transport`
- Receives parsed JSON log objects
- Calls `broadcastLog('server', JSON.stringify(obj), obj.level)`
- Added to transport targets array in server startup

### 3. Inngest Stream Capture

Modify Inngest process spawning to capture stdout/stderr while maintaining terminal output.

**Key Points**:

- Change `stdio: "inherit"` → `stdio: ["inherit", "pipe", "pipe"]`
- Stdout listener: pipes to both `process.stdout.write()` AND `broadcastLog('inngest', data, 'stdout')`
- Stderr listener: pipes to both `process.stderr.write()` AND `broadcastLog('inngest', data, 'stderr')`
- No performance impact on Inngest process itself

### 4. Logs WebSocket Handler

Handle subscription/unsubscription to logs channels following existing pattern.

**Key Points**:

- Subscribe: send history from ring buffer + add to subscription list
- Unsubscribe: remove from subscription list
- Error handling: log errors, send error event to client
- Reuses existing subscription infrastructure

### 5. Log Viewer Component

React component with virtual scrolling, auto-scroll toggle, and source filtering.

**Key Points**:

- Virtual scrolling via `@tanstack/react-virtual` (only ~30 visible lines rendered)
- Auto-scroll toggle (default on, disables when user scrolls up)
- Filter by source (server/inngest) with toggle buttons
- Syntax highlighting for JSON logs (detect `{` prefix)
- Dark theme with monospace font
- Copy to clipboard button

## Files to Create/Modify

### New Files (4)

1. `apps/app/src/server/utils/logBroadcaster.ts` - Ring buffer + broadcast service
2. `apps/app/src/server/utils/pinoWsTransport.ts` - Custom Pino transport
3. `apps/app/src/server/websocket/handlers/logs.handler.ts` - Logs channel handler
4. `apps/app/src/client/pages/logs/index.tsx` - Logs page route
5. `apps/app/src/client/components/LogViewer.tsx` - Log viewer component

### Modified Files (5)

1. `apps/app/src/server/index.ts` - Add Pino transport to targets
2. `apps/app/src/cli/commands/start.ts` - Capture Inngest stdout/stderr
3. `apps/app/src/server/websocket/index.ts` - Route logs:\* channels
4. `apps/app/src/shared/websocket/types.ts` - Add log event types
5. `apps/app/src/client/App.tsx` - Add /logs route

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend Infrastructure

**Phase Complexity**: 22 points (avg 4.4/10)

<!-- prettier-ignore -->
- [ ] m4k-1 5/10 Create log broadcasting service with ring buffers
  - Implement `logBroadcaster.ts` with two 1000-line circular buffers
  - Add `broadcastLog(source, content, level?)` function
  - Add `getLogHistory(source)` function
  - Implement 100ms batching with `setInterval`
  - File: `apps/app/src/server/utils/logBroadcaster.ts`

- [ ] m4k-2 6/10 Create custom Pino transport for WebSocket broadcasting
  - Extend `pino-abstract-transport`
  - Parse incoming log objects
  - Call `broadcastLog('server', JSON.stringify(obj), obj.level)`
  - Handle errors gracefully
  - File: `apps/app/src/server/utils/pinoWsTransport.ts`

- [ ] m4k-3 3/10 Add Pino transport to server startup
  - Import custom transport in targets array
  - Add to both production and development transport configs
  - Set appropriate log level (inherit from config)
  - File: `apps/app/src/server/index.ts` (lines 39-101)

- [ ] m4k-4 4/10 Create logs WebSocket handler
  - Implement `handleLogsEvent()` function following session.handler.ts pattern
  - Handle 'subscribe' event: send history + add to subscriptions
  - Handle 'unsubscribe' event: remove from subscriptions
  - Add error handling with proper logging
  - File: `apps/app/src/server/websocket/handlers/logs.handler.ts`

- [ ] m4k-5 4/10 Define log event types and interfaces
  - Add `LogsEventTypes` constant (subscribe, log_output, error)
  - Add `LogOutputData` interface (source, content, timestamp, level, stream)
  - Export from shared types
  - File: `apps/app/src/shared/websocket/types.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: WebSocket Integration

**Phase Complexity**: 18 points (avg 4.5/10)

<!-- prettier-ignore -->
- [ ] m4k-6 4/10 Route logs channels in WebSocket router
  - Add `else if (channel?.startsWith("logs:"))` branch
  - Call `handleLogsEvent(socket, channel, type, data, userId!, fastify)`
  - Add before default case
  - File: `apps/app/src/server/websocket/index.ts` (around line 115)

- [ ] m4k-7 6/10 Capture Inngest stdout/stderr streams
  - Change `stdio: "inherit"` to `stdio: ["inherit", "pipe", "pipe"]`
  - Add `inngestProcess.stdout?.on('data', ...)` listener
  - Add `inngestProcess.stderr?.on('data', ...)` listener
  - Pipe to both `process.stdout/stderr.write()` AND `broadcastLog()`
  - File: `apps/app/src/cli/commands/start.ts` (lines 106-132)

- [ ] m4k-8 4/10 Import logBroadcaster in start.ts
  - Add import at top of file
  - Handle case where server not yet initialized (queue logs or skip)
  - File: `apps/app/src/cli/commands/start.ts`

- [ ] m4k-9 4/10 Test WebSocket subscription flow
  - Start dev server: `pnpm dev`
  - Open browser console
  - Send subscribe message via WebSocket
  - Verify history received + new logs stream
  - Expected: JSON log messages in WebSocket frames

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Frontend Implementation

**Phase Complexity**: 22 points (avg 3.7/10)

<!-- prettier-ignore -->
- [ ] m4k-10 5/10 Create LogViewer component with virtual scrolling
  - Install `@tanstack/react-virtual` if not present
  - Implement virtual list with 30 visible items
  - Add auto-scroll toggle (useRef to track user scroll)
  - Add source filter toggles (server/inngest)
  - Style with Tailwind: dark theme, monospace font
  - File: `apps/app/src/client/components/LogViewer.tsx`

- [ ] m4k-11 4/10 Add JSON syntax highlighting to LogViewer
  - Detect JSON logs (starts with `{`)
  - Parse and pretty-print with color coding
  - Handle parse errors gracefully (show raw)
  - Use Tailwind colors for keys/values/strings
  - File: `apps/app/src/client/components/LogViewer.tsx`

- [ ] m4k-12 5/10 Create logs page with WebSocket subscription
  - Subscribe to `logs:server` and `logs:inngest` on mount
  - Store logs in state (combine both sources with timestamps)
  - Handle reconnection (resubscribe + fetch history)
  - Unsubscribe on unmount
  - Mount LogViewer with logs prop
  - File: `apps/app/src/client/pages/logs/index.tsx`

- [ ] m4k-13 2/10 Add logs route to App.tsx
  - Import logs page component
  - Add route: `<Route path="/logs" element={<LogsPage />} />`
  - File: `apps/app/src/client/App.tsx`

- [ ] m4k-14 3/10 Add "Logs" navigation link
  - Find main navigation component (likely in layouts/ or components/)
  - Add navigation item with icon (terminal or file-text)
  - Link to `/logs`
  - File: (navigation component path)

- [ ] m4k-15 3/10 Add copy-to-clipboard button to LogViewer
  - Add button to copy all visible logs
  - Use `navigator.clipboard.writeText()`
  - Show toast/notification on success
  - File: `apps/app/src/client/components/LogViewer.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Testing & Polish

**Phase Complexity**: 6 points (avg 3.0/10)

<!-- prettier-ignore -->
- [ ] m4k-16 4/10 Manual testing of log streaming
  - Start dev server: `cd apps/app && pnpm dev`
  - Navigate to http://localhost:5173/logs
  - Verify server logs appear (Fastify startup, API requests)
  - Verify Inngest logs appear (executor grpc, event streams)
  - Test reconnection (kill server, restart, check history loads)
  - Test filtering (toggle server/inngest sources)
  - Test auto-scroll (scroll up, verify auto-scroll stops)
  - Expected: Real-time logs with <200ms latency

- [ ] m4k-17 2/10 Verify terminal output still works during dev
  - Start dev server: `cd apps/app && pnpm dev`
  - Check terminal shows both Fastify and Inngest logs
  - Verify no regression in log visibility
  - Expected: Terminal logs identical to before (passthrough works)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`apps/app/src/server/utils/logBroadcaster.test.ts`** - Ring buffer + batching:

```typescript
describe("logBroadcaster", () => {
  it("should maintain 1000-line ring buffer per source", () => {
    // Add 1001 logs, verify oldest dropped
  });

  it("should batch logs every 100ms", () => {
    // Mock timer, add logs, verify single broadcast after 100ms
  });

  it("should return history on getLogHistory", () => {
    // Add logs, call getLogHistory, verify correct order
  });
});
```

### Integration Tests

Manual integration testing via browser (WebSocket subscription flow):

1. Start dev server
2. Open logs page
3. Verify logs stream in real-time
4. Kill server, restart, verify reconnection + history
5. Generate high log volume (trigger multiple API requests), verify no UI jank

### E2E Tests

Not applicable - primarily infrastructure feature with minimal UI interaction.

## Success Criteria

- [ ] Fastify logs stream to UI in real-time (<200ms latency)
- [ ] Inngest logs stream to UI in real-time
- [ ] Terminal logs still appear during `pnpm dev` (no regression)
- [ ] Reconnection loads last 1000 lines of history
- [ ] Virtual scrolling handles 1000+ lines without UI jank
- [ ] Auto-scroll toggle works correctly
- [ ] Source filtering (server/inngest) works
- [ ] JSON logs syntax highlighted correctly
- [ ] No TypeScript errors (`pnpm check-types`)
- [ ] No ESLint errors (`pnpm lint`)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/app
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Build verification
pnpm build
# Expected: Clean build with no errors
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: `http://localhost:5173/logs`
3. Verify: Logs appear from both Fastify (API requests) and Inngest (grpc server startup)
4. Test reconnection: Stop server (Ctrl+C), restart, verify history loads
5. Check console: No errors or warnings
6. Test filtering: Click "Server" toggle, verify only Fastify logs shown
7. Test auto-scroll: Scroll up manually, verify auto-scroll button appears
8. Generate log volume: Make multiple API requests, verify batching prevents jank

**Feature-Specific Checks:**

- Terminal output during dev unchanged (logs still appear in terminal)
- JSON logs formatted with color highlighting (Pino structured logs)
- Copy-to-clipboard button copies visible logs successfully
- Log timestamps accurate (within 1 second of wall clock)

## Implementation Notes

### 1. Batching Critical for Performance

Without 100ms batching, Inngest can produce 50+ WebSocket messages/sec during workflow execution. This overwhelms React rendering and causes UI jank. Batching reduces messages to ~10/sec while maintaining acceptable latency.

### 2. Ring Buffer Size Trade-off

1000 lines chosen as balance between:

- Memory: ~100KB per source (200KB total) - negligible
- Reconnection UX: Enough history to see recent context
- Performance: Small enough to serialize/send quickly on subscribe

### 3. Pino Transport Worker Thread Overhead

Custom transports run in worker threads with messaging overhead (~1-5ms per log). This is acceptable since logs are asynchronous and don't block main thread. Alternative (tailing log file) would add polling overhead and miss Inngest logs.

## Dependencies

- `@tanstack/react-virtual` - Virtual scrolling for log viewer (if not already installed)
- `pino-abstract-transport` - Already installed (dev dependency in apps/app)
- No new server dependencies required

## References

- Phoenix Channels pattern: `apps/app/src/server/websocket/index.ts`
- Existing shell streaming: `apps/app/src/server/routes/shell.ts` (PTY example)
- Pino transports: https://github.com/pinojs/pino/blob/master/docs/transports.md
- Virtual scrolling: https://tanstack.com/virtual/latest

## Next Steps

1. Implement Phase 1 backend infrastructure (logBroadcaster + Pino transport)
2. Integrate with WebSocket router and capture Inngest streams (Phase 2)
3. Build frontend LogViewer component with virtual scrolling (Phase 3)
4. Manual testing and polish (Phase 4)
