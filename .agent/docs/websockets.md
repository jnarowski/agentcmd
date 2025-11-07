# WebSocket Architecture Guide

**Last Updated:** January 2025
**Status:** Production
**Pattern:** Phoenix Channels

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Concepts](#core-concepts)
3. [Shared Types System](#shared-types-system)
4. [Backend Usage](#backend-usage)
5. [Frontend Usage](#frontend-usage)
6. [Adding New Features](#adding-new-features)
7. [Debugging](#debugging)
8. [Best Practices](#best-practices)
9. [Connection Management](#connection-management)
10. [Common Patterns](#common-patterns)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Phoenix Channels Pattern

This application uses the **Phoenix Channels pattern** for WebSocket communication, separating channel subscription from event handling. This pattern is industry-proven and used by Phoenix Framework, Rails ActionCable, and SignalR.

**Key Principles:**

1. **Channels** - Logical namespaces for messages (e.g., `session:123`, `global`)
2. **Events** - Typed messages within channels (e.g., `{type: 'stream_output', data: {...}}`)
3. **Subscriptions** - Clients subscribe to channels and receive all events on that channel
4. **Type Safety** - Discriminated unions with exhaustive checking using TypeScript

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  WebSocketProvider                                               │
│    ├─ Connect/Reconnect Logic                                   │
│    ├─ Heartbeat (30s ping/5s timeout)                           │
│    ├─ Message Queue (max 100)                                   │
│    └─ Error Toast Notifications                                 │
│                                                                  │
│  WebSocketEventBus                                               │
│    ├─ Channel-based subscriptions                               │
│    ├─ Map<channel, Set<handlers>>                               │
│    └─ Error isolation per handler                               │
│                                                                  │
│  Hooks (useSessionWebSocket, useShellWebSocket)                 │
│    ├─ Subscribe to channels                                     │
│    ├─ Handle events with switch statements                      │
│    └─ Exhaustive type checking                                  │
│                                                                  │
│  WebSocketMetrics                                                │
│    ├─ Track sent/received/latency                               │
│    ├─ Expose window.__WS_METRICS__ (dev only)                   │
│    └─ Rolling window of 100 latency samples                     │
│                                                                  │
│  WebSocketDevTools (dev only)                                   │
│    ├─ Message log (last 50)                                     │
│    ├─ Active subscriptions                                      │
│    ├─ Metrics dashboard                                         │
│    └─ Keyboard shortcut: Ctrl+Shift+W                           │
├─────────────────────────────────────────────────────────────────┤
│                    Shared Types (/shared/websocket/)             │
│    ├─ types.ts - Event types, constants, unions                 │
│    ├─ channels.ts - Channel builders (Channels.session())       │
│    └─ guards.ts - Type guards (isSessionEvent())                │
├─────────────────────────────────────────────────────────────────┤
│                        Backend (Fastify)                         │
├─────────────────────────────────────────────────────────────────┤
│  WebSocket Handlers                                              │
│    ├─ global.handler.ts - Ping/pong, subscriptions              │
│    └─ session.handler.ts - Session events                       │
│                                                                  │
│  Subscription Manager                                            │
│    ├─ Map<channel, Set<sockets>>                                │
│    ├─ broadcast() - Send to all channel subscribers             │
│    └─ sendMessage() - Send to specific socket                   │
└─────────────────────────────────────────────────────────────────┘
```

### Why Shell WebSocket is Separate

**Decision:** Shell WebSocket connection is maintained separately from the main session WebSocket.

**Reasons:**

1. **Protocol Needs** - Shell requires raw PTY streams (high-frequency, low-latency binary data)
2. **Lifecycle** - Shell connections are ephemeral (start/stop with terminal), while sessions persist
3. **Isolation** - Shell crashes shouldn't affect session streaming
4. **Optimization** - Shell doesn't need message queuing or reconnection delays

**Shared Patterns:**
- Both use Phoenix Channels pattern
- Both use shared type system from `/shared/websocket/`
- Both use `calculateReconnectDelay()` utility
- Both emit structured events `{type, data}`

---

## Core Concepts

### Channels vs Events

**Channel** - A logical grouping for messages, like a "room" or "topic":

```typescript
const channel = Channels.session('abc123');  // 'session:abc123'
const channel = Channels.global();           // 'global'
const channel = Channels.shell('xyz789');    // 'shell:xyz789'
```

**Event** - A typed message sent to a channel:

```typescript
const event: SessionEvent = {
  type: SessionEventTypes.STREAM_OUTPUT,
  data: { message: 'Hello world' }
};
```

### Message Format

All WebSocket messages follow this structure:

```typescript
interface WebSocketMessage {
  channel: string;       // e.g., 'session:abc123'
  type: string;          // e.g., 'stream_output'
  data: unknown;         // Event-specific payload
}
```

**Example:**

```json
{
  "channel": "session:abc123",
  "type": "stream_output",
  "data": {
    "message": "Processing your request..."
  }
}
```

### Discriminated Unions

Events use TypeScript discriminated unions for type safety:

```typescript
export type SessionEvent =
  | { type: typeof SessionEventTypes.STREAM_OUTPUT, data: StreamOutputData }
  | { type: typeof SessionEventTypes.MESSAGE_COMPLETE, data: CompleteData }
  | { type: typeof SessionEventTypes.ERROR, data: ErrorData }
  | { type: typeof SessionEventTypes.SUBSCRIBE_SUCCESS, data: SubscribeSuccessData };
```

**Benefits:**

- TypeScript narrows types in switch statements
- Exhaustive checking with `never` type
- Autocomplete for `event.data` fields
- Compile-time errors when adding new event types

### Exhaustive Checking

Always use exhaustive checking in switch statements:

```typescript
function handleEvent(event: SessionEvent) {
  switch (event.type) {
    case SessionEventTypes.STREAM_OUTPUT:
      // TypeScript knows event.data is StreamOutputData
      console.log(event.data.message);
      break;
    case SessionEventTypes.MESSAGE_COMPLETE:
      // TypeScript knows event.data is CompleteData
      console.log(event.data.messageId);
      break;
    case SessionEventTypes.ERROR:
      // TypeScript knows event.data is ErrorData
      console.error(event.data.error);
      break;
    case SessionEventTypes.SUBSCRIBE_SUCCESS:
      console.log('Subscribed!');
      break;
    default:
      // Exhaustive check - compiler error if missing a case
      const _exhaustive: never = event;
      console.warn('Unknown event type:', _exhaustive);
  }
}
```

---

## Shared Types System

### Location

All shared WebSocket types live in: `/apps/web/src/shared/websocket/`

```
shared/websocket/
├── index.ts        # Barrel exports
├── types.ts        # Event types, constants, discriminated unions
├── channels.ts     # Channel name builders
└── guards.ts       # Type guards
```

### Event Type Constants

**File:** `types.ts`

```typescript
export const SessionEventTypes = {
  STREAM_OUTPUT: 'stream_output',
  MESSAGE_COMPLETE: 'message_complete',
  ERROR: 'error',
  SUBSCRIBE_SUCCESS: 'subscribe_success',
} as const;

export const GlobalEventTypes = {
  CONNECTED: 'connected',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',
  SUBSCRIPTION_SUCCESS: 'subscription_success',
  SUBSCRIPTION_ERROR: 'subscription_error',
} as const;

export const ShellEventTypes = {
  INIT: 'init',
  INPUT: 'input',
  OUTPUT: 'output',
  RESIZE: 'resize',
  EXIT: 'exit',
  ERROR: 'error',
} as const;
```

**Usage:**

```typescript
// ✅ GOOD - Using constants
import { SessionEventTypes } from '@/shared/websocket';

broadcast(channel, {
  type: SessionEventTypes.STREAM_OUTPUT,
  data: { message: 'hello' }
});

// ❌ BAD - Magic strings
broadcast(channel, {
  type: 'stream_output',  // Typo-prone, no autocomplete
  data: { message: 'hello' }
});
```

### Channel Builders

**File:** `channels.ts`

```typescript
export const Channels = {
  session: (id: string) => `session:${id}` as const,
  project: (id: string) => `project:${id}` as const,
  shell: (id: string) => `shell:${id}` as const,
  global: () => 'global' as const,
};

export function parseChannel(channel: string): { resource: string; id: string } | null {
  const parts = channel.split(':');
  if (parts.length !== 2) return null;
  return { resource: parts[0], id: parts[1] };
}
```

**Usage:**

```typescript
// ✅ GOOD - Using channel builders
const channel = Channels.session(sessionId);
eventBus.on(channel, handleEvent);

// ✅ Parsing channels
const parsed = parseChannel('session:abc123');
if (parsed) {
  console.log(parsed.resource); // 'session'
  console.log(parsed.id);       // 'abc123'
}
```

### Type Guards

**File:** `guards.ts`

```typescript
export function isSessionEvent(event: ChannelEvent): event is SessionEvent {
  return Object.values(SessionEventTypes).includes(event.type as string);
}

export function isGlobalEvent(event: ChannelEvent): event is GlobalEvent {
  return Object.values(GlobalEventTypes).includes(event.type as string);
}

export function isShellEvent(event: ChannelEvent): event is ShellEvent {
  return Object.values(ShellEventTypes).includes(event.type as string);
}

export function isWebSocketMessage(message: unknown): message is WebSocketMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'channel' in message &&
    'type' in message &&
    'data' in message
  );
}
```

**Usage:**

```typescript
// Runtime validation with type narrowing
if (isSessionEvent(event)) {
  // TypeScript knows event is SessionEvent
  handleSessionEvent(event);
} else if (isGlobalEvent(event)) {
  // TypeScript knows event is GlobalEvent
  handleGlobalEvent(event);
}
```

### Adding New Event Types

**Steps:**

1. Add constant to appropriate `EventTypes` object in `types.ts`
2. Define data interface for the event
3. Add event variant to discriminated union
4. Update all switch statements (compiler will error on missing cases)

**Example:**

```typescript
// 1. Add constant
export const SessionEventTypes = {
  STREAM_OUTPUT: 'stream_output',
  MESSAGE_COMPLETE: 'message_complete',
  ERROR: 'error',
  SUBSCRIBE_SUCCESS: 'subscribe_success',
  PROGRESS_UPDATE: 'progress_update',  // NEW
} as const;

// 2. Define data interface
export interface ProgressUpdateData {
  sessionId: string;
  progress: number;
  total: number;
  message?: string;
}

// 3. Add to discriminated union
export type SessionEvent =
  | { type: typeof SessionEventTypes.STREAM_OUTPUT, data: StreamOutputData }
  | { type: typeof SessionEventTypes.MESSAGE_COMPLETE, data: CompleteData }
  | { type: typeof SessionEventTypes.ERROR, data: ErrorData }
  | { type: typeof SessionEventTypes.SUBSCRIBE_SUCCESS, data: SubscribeSuccessData }
  | { type: typeof SessionEventTypes.PROGRESS_UPDATE, data: ProgressUpdateData };  // NEW

// 4. TypeScript will now error in all switch statements until you add:
case SessionEventTypes.PROGRESS_UPDATE:
  handleProgress(event.data);
  break;
```

---

## Backend Usage

### Broadcasting Events

**File:** `handlers/session.handler.ts`

```typescript
import { Channels, SessionEventTypes } from '@/shared/websocket';
import { broadcast } from '../utils/subscriptions';

// Broadcast to all subscribers of a channel
broadcast(
  Channels.session(sessionId),
  {
    type: SessionEventTypes.STREAM_OUTPUT,
    data: {
      sessionId,
      message: 'Processing...',
      timestamp: Date.now(),
    }
  }
);
```

### Sending to Specific Socket

**File:** `handlers/global.handler.ts`

```typescript
import { Channels, GlobalEventTypes } from '@/shared/websocket';
import { sendMessage } from '../utils/send-message';

// Send to single socket
sendMessage(
  socket,
  Channels.global(),
  {
    type: GlobalEventTypes.PONG,
    data: { timestamp: Date.now() }
  }
);
```

### Handling Incoming Messages

**File:** `handlers/session.handler.ts`

```typescript
import { Channels, SessionEventTypes, isSessionEvent } from '@/shared/websocket';

socket.on('message', (raw) => {
  const message = JSON.parse(raw.toString());

  // Validate message format
  if (!isWebSocketMessage(message)) {
    console.warn('Invalid message format');
    return;
  }

  const { channel, type, data } = message;

  // Route to appropriate handler based on event type
  if (type === SessionEventTypes.SEND_MESSAGE) {
    await handleSendMessage(channel, data);
  }
});
```

### Permission Checks

Always verify permissions before broadcasting:

```typescript
// Check if user owns the session before broadcasting
const session = await prisma.agentSession.findUnique({
  where: { id: sessionId },
  select: { userId: true, projectId: true },
});

if (!session || session.userId !== userId) {
  sendMessage(socket, Channels.session(sessionId), {
    type: SessionEventTypes.ERROR,
    data: { error: 'Unauthorized', sessionId }
  });
  return;
}

// Safe to broadcast now
broadcast(Channels.session(sessionId), {
  type: SessionEventTypes.STREAM_OUTPUT,
  data: { message: 'Starting...' }
});
```

---

## Frontend Usage

### Subscribing to Channels

**Pattern:**

```typescript
import { useEffect } from 'react';
import { useWebSocket } from '@/client/contexts/WebSocketContext';
import { Channels, SessionEventTypes, type SessionEvent } from '@/shared/websocket';

function useSessionEvents(sessionId: string) {
  const { eventBus } = useWebSocket();

  useEffect(() => {
    const channel = Channels.session(sessionId);

    const handleEvent = (event: SessionEvent) => {
      switch (event.type) {
        case SessionEventTypes.STREAM_OUTPUT:
          console.log('Stream:', event.data.message);
          break;
        case SessionEventTypes.MESSAGE_COMPLETE:
          console.log('Complete:', event.data.messageId);
          break;
        case SessionEventTypes.ERROR:
          console.error('Error:', event.data.error);
          break;
        case SessionEventTypes.SUBSCRIBE_SUCCESS:
          console.log('Subscribed!');
          break;
        default:
          const _exhaustive: never = event;
          console.warn('Unknown event:', _exhaustive);
      }
    };

    // Subscribe
    eventBus.on<SessionEvent>(channel, handleEvent);

    // Cleanup
    return () => {
      eventBus.off(channel, handleEvent);
    };
  }, [sessionId, eventBus]);
}
```

### Sending Messages

**Pattern:**

```typescript
import { useWebSocket } from '@/client/contexts/WebSocketContext';
import { Channels, SessionEventTypes } from '@/shared/websocket';

function sendChatMessage(message: string) {
  const { sendMessage } = useWebSocket();

  sendMessage(
    Channels.session(sessionId),
    {
      type: SessionEventTypes.SEND_MESSAGE,
      data: {
        message,
        sessionId,
        timestamp: Date.now(),
      }
    }
  );
}
```

### Checking Connection State

```typescript
import { useWebSocket } from '@/client/contexts/WebSocketContext';
import { ReadyState } from '@/shared/types/websocket';

function MyComponent() {
  const { readyState, isConnected, isReady, connectionAttempts } = useWebSocket();

  if (readyState === ReadyState.CONNECTING) {
    return <div>Connecting...</div>;
  }

  if (!isConnected) {
    return <div>Disconnected (attempt {connectionAttempts}/5)</div>;
  }

  if (!isReady) {
    return <div>Establishing connection...</div>;
  }

  return <div>Connected and ready!</div>;
}
```

---

## Adding New Features

### Step-by-Step Guide

**Scenario:** Add a new "typing indicator" feature that shows when a user is typing.

#### 1. Define Event Type

**File:** `/shared/websocket/types.ts`

```typescript
// Add constant
export const SessionEventTypes = {
  // ... existing
  TYPING_INDICATOR: 'typing_indicator',
} as const;

// Add data interface
export interface TypingIndicatorData {
  sessionId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

// Add to discriminated union
export type SessionEvent =
  | { type: typeof SessionEventTypes.STREAM_OUTPUT, data: StreamOutputData }
  | { type: typeof SessionEventTypes.MESSAGE_COMPLETE, data: CompleteData }
  | { type: typeof SessionEventTypes.ERROR, data: ErrorData }
  | { type: typeof SessionEventTypes.SUBSCRIBE_SUCCESS, data: SubscribeSuccessData }
  | { type: typeof SessionEventTypes.TYPING_INDICATOR, data: TypingIndicatorData };  // NEW
```

#### 2. Backend Handler

**File:** `/server/websocket/handlers/session.handler.ts`

```typescript
import { SessionEventTypes, Channels } from '@/shared/websocket';
import { broadcast } from '../utils/subscriptions';

// Handle incoming typing indicator
if (type === SessionEventTypes.TYPING_INDICATOR) {
  const { sessionId, userId, userName, isTyping } = data;

  // Broadcast to all session subscribers
  broadcast(
    Channels.session(sessionId),
    {
      type: SessionEventTypes.TYPING_INDICATOR,
      data: { sessionId, userId, userName, isTyping }
    }
  );
}
```

#### 3. Frontend Hook

**File:** `/client/pages/projects/sessions/hooks/useTypingIndicator.ts`

```typescript
import { useEffect, useState } from 'react';
import { useWebSocket } from '@/client/contexts/WebSocketContext';
import { Channels, SessionEventTypes, type SessionEvent } from '@/shared/websocket';

export function useTypingIndicator(sessionId: string) {
  const { eventBus, sendMessage } = useWebSocket();
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  // Subscribe to typing indicators
  useEffect(() => {
    const channel = Channels.session(sessionId);

    const handleEvent = (event: SessionEvent) => {
      if (event.type === SessionEventTypes.TYPING_INDICATOR) {
        const { userId, userName, isTyping } = event.data;

        setTypingUsers((prev) => {
          const next = new Map(prev);
          if (isTyping) {
            next.set(userId, userName);
          } else {
            next.delete(userId);
          }
          return next;
        });
      }
    };

    eventBus.on<SessionEvent>(channel, handleEvent);

    return () => {
      eventBus.off(channel, handleEvent);
    };
  }, [sessionId, eventBus]);

  // Send typing indicator
  const setTyping = (isTyping: boolean) => {
    sendMessage(
      Channels.session(sessionId),
      {
        type: SessionEventTypes.TYPING_INDICATOR,
        data: {
          sessionId,
          userId: 'current-user-id',  // Get from auth context
          userName: 'Current User',
          isTyping,
        }
      }
    );
  };

  return { typingUsers: Array.from(typingUsers.values()), setTyping };
}
```

#### 4. Use in Component

**File:** `/client/pages/projects/sessions/ProjectSession.tsx`

```typescript
import { useTypingIndicator } from './hooks/useTypingIndicator';

function ChatInterface({ sessionId }: { sessionId: string }) {
  const { typingUsers, setTyping } = useTypingIndicator(sessionId);

  const handleInputChange = (value: string) => {
    // Send typing indicator when user types
    setTyping(value.length > 0);
  };

  return (
    <div>
      {/* Chat messages */}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="text-sm text-gray-500">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input */}
      <input onChange={(e) => handleInputChange(e.target.value)} />
    </div>
  );
}
```

#### 5. Test

```typescript
// Unit test for hook
describe('useTypingIndicator', () => {
  test('tracks typing users', () => {
    const { result } = renderHook(() => useTypingIndicator('session-123'));

    act(() => {
      // Simulate receiving typing indicator
      eventBus.emit(Channels.session('session-123'), {
        type: SessionEventTypes.TYPING_INDICATOR,
        data: { userId: 'user-1', userName: 'Alice', isTyping: true }
      });
    });

    expect(result.current.typingUsers).toEqual(['Alice']);
  });
});
```

---

## Debugging

### WebSocket DevTools

**Keyboard Shortcut:** `Ctrl+Shift+W` (or `Cmd+Shift+W` on Mac)

**Features:**

1. **Messages Tab**
   - View last 50 sent/received messages
   - Filter by channel
   - Expand to see full data payload
   - Clear logs button

2. **Subscriptions Tab**
   - List all active channel subscriptions
   - Shows which channels have registered handlers

3. **Metrics Tab**
   - Messages sent/received counts
   - Reconnection attempts
   - Average latency
   - Latency sparkline graph (last 100 pings)
   - Reset metrics button

4. **Manual Controls**
   - Reconnect button (force reconnection)
   - Connection status indicator

### Console Logs (Dev Mode)

**WebSocketProvider logs:**

```
[WebSocket] Connecting to ws://localhost:3456/ws (attempt 1)
[WebSocket] ✓ Socket opened (readyState = OPEN)
[WebSocket] ⏳ Waiting for global.connected message from server...
[WebSocket] ✓ Received connected from server
[WebSocket] ✓ Connection fully established and ready
[WebSocket] 📤 Flushing message queue: 2 messages
[WebSocket] Sent: { channel: 'session:123', type: 'send_message' }
[WebSocket] Received: { channel: 'session:123', type: 'stream_output' }
[WebSocket] Pong received, latency: 45 ms
```

**To enable debug logging:**

```typescript
// WebSocketProvider.tsx already logs in dev mode (import.meta.env.DEV)

// To log in production, add console.log statements or integrate with logging service
if (import.meta.env.PROD) {
  console.log('[WebSocket]', ...);
}
```

### Metrics API (Dev Mode)

```typescript
// Access metrics in browser console (dev mode only)
window.__WS_METRICS__

// Get snapshot
window.__WS_METRICS__.snapshot()
// Returns:
// {
//   messagesSent: 42,
//   messagesReceived: 38,
//   reconnections: 1,
//   averageLatency: 52,
//   latencySamples: 15
// }

// Reset metrics
window.__WS_METRICS__.reset()
```

### Common Debug Scenarios

**1. Messages not received**

- Check DevTools > Subscriptions tab - is the channel subscribed?
- Check DevTools > Messages tab - are messages being received?
- Check console for WebSocket errors
- Verify event type matches (use constants, not strings)

**2. Handler not firing**

- Verify handler signature: `(event: ChannelEvent) => void`
- Check if handler is being registered (use `getActiveChannels()`)
- Check for errors in handler (EventBus isolates errors, check console)

**3. High latency**

- Check DevTools > Metrics tab for latency graph
- Look for spikes during reconnection
- Verify network conditions (VPN, WiFi)
- Check server logs for processing delays

---

## Best Practices

### 1. Always Use Constants

```typescript
// ✅ GOOD
import { SessionEventTypes } from '@/shared/websocket';
broadcast(channel, { type: SessionEventTypes.STREAM_OUTPUT, data });

// ❌ BAD
broadcast(channel, { type: 'stream_output', data });  // Typo-prone
```

### 2. Exhaustive Type Checking

```typescript
// ✅ GOOD
switch (event.type) {
  case SessionEventTypes.STREAM_OUTPUT:
    handleStream(event.data);
    break;
  case SessionEventTypes.MESSAGE_COMPLETE:
    handleComplete(event.data);
    break;
  default:
    const _exhaustive: never = event;  // Compiler error if missing cases
    console.warn('Unknown event:', _exhaustive);
}

// ❌ BAD
switch (event.type) {
  case SessionEventTypes.STREAM_OUTPUT:
    handleStream(event.data);
    break;
  // Missing MESSAGE_COMPLETE case - no compiler error!
}
```

### 3. Always Clean Up Subscriptions

```typescript
// ✅ GOOD
useEffect(() => {
  const handleEvent = (event: SessionEvent) => {
    // Handle event
  };

  eventBus.on<SessionEvent>(channel, handleEvent);

  return () => {
    eventBus.off(channel, handleEvent);  // Cleanup!
  };
}, [channel, eventBus]);

// ❌ BAD
useEffect(() => {
  eventBus.on<SessionEvent>(channel, handleEvent);
  // No cleanup - memory leak!
}, [channel, eventBus]);
```

### 4. Type-Safe Event Handlers

```typescript
// ✅ GOOD
const handleEvent = (event: SessionEvent) => {
  switch (event.type) {
    case SessionEventTypes.STREAM_OUTPUT:
      // TypeScript knows event.data is StreamOutputData
      console.log(event.data.message);
      break;
  }
};

// ❌ BAD
const handleEvent = (event: any) => {  // Loses type safety
  console.log(event.data.message);  // No autocomplete, runtime errors
};
```

### 5. Use Type Guards for Validation

```typescript
// ✅ GOOD
import { isWebSocketMessage, isSessionEvent } from '@/shared/websocket';

const message = JSON.parse(raw);
if (!isWebSocketMessage(message)) {
  console.warn('Invalid message');
  return;
}

if (isSessionEvent({ type: message.type, data: message.data })) {
  handleSessionEvent(message);
}

// ❌ BAD
const message = JSON.parse(raw);
handleSessionEvent(message);  // No validation, runtime errors
```

### 6. Permission Checks on Backend

```typescript
// ✅ GOOD
const session = await prisma.agentSession.findUnique({
  where: { id: sessionId },
  select: { userId: true },
});

if (!session || session.userId !== userId) {
  sendMessage(socket, channel, {
    type: SessionEventTypes.ERROR,
    data: { error: 'Unauthorized' }
  });
  return;
}

// ❌ BAD
// No permission check - any user can broadcast to any session!
broadcast(channel, event);
```

### 7. Error Isolation

**EventBus automatically isolates handler errors:**

```typescript
// If handler1 throws, handler2 still executes
eventBus.on(channel, handler1);  // Throws error
eventBus.on(channel, handler2);  // Still executes

// Errors are logged but don't propagate
```

**Manual error handling in handlers:**

```typescript
const handleEvent = (event: SessionEvent) => {
  try {
    switch (event.type) {
      case SessionEventTypes.STREAM_OUTPUT:
        processStreamOutput(event.data);
        break;
    }
  } catch (error) {
    console.error('Failed to handle event:', error);
    // Optionally report to error tracking service
  }
};
```

---

## Connection Management

### Heartbeat System

**Ping Interval:** 30 seconds
**Pong Timeout:** 5 seconds

**How it works:**

1. Every 30 seconds, client sends `GlobalEventTypes.PING` with timestamp
2. Server immediately responds with `GlobalEventTypes.PONG` with same timestamp
3. Client calculates latency: `Date.now() - pingTimestamp`
4. If no pong received within 5 seconds, client reconnects

**Why 30 seconds?**

- Industry standard (Phoenix, Rails, SignalR)
- Balance between timely detection and unnecessary traffic
- TCP keepalive is typically 60s, we want to detect earlier

### Reconnection Strategy

**Exponential Backoff:**

```
Attempt 1: 1 second
Attempt 2: 2 seconds
Attempt 3: 4 seconds
Attempt 4: 8 seconds
Attempt 5: 16 seconds
Max: 30 seconds
```

**Max Attempts:** 5 (configurable)

**Manual Reconnect:**

- ConnectionStatusBanner shows "Reconnect" button
- DevTools has "Reconnect" button
- Resets attempt counter to 0

**Graceful Degradation:**

- Messages queued while disconnected (max 100)
- Queue flushed on reconnection
- Oldest messages dropped if queue full

### Message Queue

**Max Size:** 100 messages

**Behavior:**

- Messages sent before `isReady === true` are queued
- Queue flushed on `global.connected` event
- If queue exceeds 100, oldest message is dropped
- Warning logged when dropping messages

**Why limit queue?**

- Prevents memory leaks if connection never opens
- Unbounded queue could cause out-of-memory errors
- 100 messages is ~3-5 seconds of high-frequency updates

### Connection States

```typescript
export enum ReadyState {
  CONNECTING = 0,  // Socket connecting
  OPEN = 1,        // Socket opened, waiting for global.connected
  CLOSING = 2,     // Socket closing
  CLOSED = 3,      // Socket closed
}

// Additional state:
isReady: boolean  // Socket OPEN + global.connected received
```

**State Transitions:**

```
CLOSED
  ↓ (connect())
CONNECTING
  ↓ (socket.onopen)
OPEN (isReady = false)
  ↓ (global.connected event)
OPEN (isReady = true)
  ↓ (socket.close() or error)
CLOSING
  ↓
CLOSED
```

---

## Common Patterns

### Pattern 1: Subscribe to Channel

```typescript
import { useEffect } from 'react';
import { useWebSocket } from '@/client/contexts/WebSocketContext';
import { Channels, SessionEventTypes, type SessionEvent } from '@/shared/websocket';

function useSessionEvents(sessionId: string) {
  const { eventBus } = useWebSocket();

  useEffect(() => {
    const channel = Channels.session(sessionId);

    const handleEvent = (event: SessionEvent) => {
      switch (event.type) {
        case SessionEventTypes.STREAM_OUTPUT:
          console.log('Stream:', event.data.message);
          break;
        case SessionEventTypes.MESSAGE_COMPLETE:
          console.log('Complete:', event.data.messageId);
          break;
        case SessionEventTypes.ERROR:
          console.error('Error:', event.data.error);
          break;
        case SessionEventTypes.SUBSCRIBE_SUCCESS:
          console.log('Subscribed!');
          break;
        default:
          const _exhaustive: never = event;
          console.warn('Unknown event:', _exhaustive);
      }
    };

    eventBus.on<SessionEvent>(channel, handleEvent);

    return () => {
      eventBus.off(channel, handleEvent);
    };
  }, [sessionId, eventBus]);
}
```

### Pattern 2: Handle Multiple Events

```typescript
function handleSessionEvent(event: SessionEvent) {
  switch (event.type) {
    case SessionEventTypes.STREAM_OUTPUT:
      handleStreamOutput(event.data);
      break;
    case SessionEventTypes.MESSAGE_COMPLETE:
      handleMessageComplete(event.data);
      break;
    case SessionEventTypes.ERROR:
      handleError(event.data);
      break;
    case SessionEventTypes.SUBSCRIBE_SUCCESS:
      handleSubscribeSuccess();
      break;
    default:
      const _exhaustive: never = event;
      console.warn('Unknown event:', _exhaustive);
  }
}

function handleStreamOutput(data: StreamOutputData) {
  // Update UI with streaming content
  appendMessage(data.message);
}

function handleMessageComplete(data: CompleteData) {
  // Mark message as complete
  markComplete(data.messageId);
}

function handleError(data: ErrorData) {
  // Show error toast
  toast.error(data.error);
}

function handleSubscribeSuccess() {
  // Notify user or update UI
  console.log('Successfully subscribed to session');
}
```

### Pattern 3: Global Error Handling

```typescript
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useWebSocket } from '@/client/contexts/WebSocketContext';
import { Channels, GlobalEventTypes, type GlobalEvent } from '@/shared/websocket';

function useGlobalErrors() {
  const { eventBus, reconnect } = useWebSocket();

  useEffect(() => {
    const channel = Channels.global();

    const handleEvent = (event: GlobalEvent) => {
      if (event.type === GlobalEventTypes.ERROR) {
        const { error, message } = event.data;

        toast.error(error || 'Connection Error', {
          description: message,
          action: {
            label: 'Retry',
            onClick: () => reconnect(),
          },
        });
      }
    };

    eventBus.on<GlobalEvent>(channel, handleEvent);

    return () => {
      eventBus.off(channel, handleEvent);
    };
  }, [eventBus, reconnect]);
}
```

### Pattern 4: Conditional Subscriptions

```typescript
function useConditionalSubscription(sessionId: string | null) {
  const { eventBus } = useWebSocket();

  useEffect(() => {
    if (!sessionId) {
      return; // Don't subscribe if no sessionId
    }

    const channel = Channels.session(sessionId);
    const handleEvent = (event: SessionEvent) => {
      // Handle event
    };

    eventBus.on<SessionEvent>(channel, handleEvent);

    return () => {
      eventBus.off(channel, handleEvent);
    };
  }, [sessionId, eventBus]);
}
```

### Pattern 5: Multi-Channel Subscriptions

```typescript
function useMultiChannelSubscriptions(sessionIds: string[]) {
  const { eventBus } = useWebSocket();

  useEffect(() => {
    const handlers: Array<{ channel: string; handler: (event: SessionEvent) => void }> = [];

    sessionIds.forEach((sessionId) => {
      const channel = Channels.session(sessionId);
      const handleEvent = (event: SessionEvent) => {
        console.log(`Event from ${sessionId}:`, event);
      };

      eventBus.on<SessionEvent>(channel, handleEvent);
      handlers.push({ channel, handler: handleEvent });
    });

    return () => {
      handlers.forEach(({ channel, handler }) => {
        eventBus.off(channel, handler);
      });
    };
  }, [sessionIds, eventBus]);
}
```

---

## Testing

### Unit Tests

#### Testing EventBus

```typescript
import { describe, test, expect, vi } from 'vitest';
import { WebSocketEventBus } from '@/client/lib/WebSocketEventBus';
import { Channels, SessionEventTypes } from '@/shared/websocket';

describe('WebSocketEventBus - Phoenix Pattern', () => {
  test('subscribes to channel and receives events', () => {
    const eventBus = new WebSocketEventBus();
    const handler = vi.fn();

    eventBus.on(Channels.session('123'), handler);
    eventBus.emit(Channels.session('123'), {
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'test' }
    });

    expect(handler).toHaveBeenCalledWith({
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'test' }
    });
  });

  test('multiple handlers on same channel', () => {
    const eventBus = new WebSocketEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    eventBus.on(Channels.session('123'), handler1);
    eventBus.on(Channels.session('123'), handler2);
    eventBus.emit(Channels.session('123'), {
      type: SessionEventTypes.ERROR,
      data: { error: 'test' }
    });

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  test('handlers isolated from errors', () => {
    const eventBus = new WebSocketEventBus();
    const handler1 = vi.fn(() => {
      throw new Error('Handler 1 failed');
    });
    const handler2 = vi.fn();

    eventBus.on(Channels.session('123'), handler1);
    eventBus.on(Channels.session('123'), handler2);
    eventBus.emit(Channels.session('123'), {
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'test' }
    });

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();  // Still executes despite handler1 error
  });
});
```

#### Testing Channel Builders

```typescript
import { describe, test, expect } from 'vitest';
import { Channels, parseChannel } from '@/shared/websocket';

describe('Channel Builders', () => {
  test('session channel format', () => {
    expect(Channels.session('abc123')).toBe('session:abc123');
  });

  test('parseChannel extracts resource and ID', () => {
    expect(parseChannel('session:abc123')).toEqual({
      resource: 'session',
      id: 'abc123'
    });
  });

  test('parseChannel returns null for invalid format', () => {
    expect(parseChannel('invalid')).toBeNull();
    expect(parseChannel('session:123:extra')).toBeNull();
  });
});
```

#### Testing Type Guards

```typescript
import { describe, test, expect } from 'vitest';
import { isSessionEvent, isGlobalEvent, SessionEventTypes, GlobalEventTypes } from '@/shared/websocket';

describe('Type Guards', () => {
  test('isSessionEvent identifies session events', () => {
    const event = { type: SessionEventTypes.STREAM_OUTPUT, data: {} };
    expect(isSessionEvent(event)).toBe(true);
  });

  test('isSessionEvent rejects other events', () => {
    const event = { type: GlobalEventTypes.PING, data: {} };
    expect(isSessionEvent(event)).toBe(false);
  });

  test('isGlobalEvent identifies global events', () => {
    const event = { type: GlobalEventTypes.PING, data: {} };
    expect(isGlobalEvent(event)).toBe(true);
  });
});
```

### Integration Tests

#### Testing WebSocket Message Flow

```typescript
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { WebSocketProvider } from '@/client/providers/WebSocketProvider';
import { useWebSocket } from '@/client/contexts/WebSocketContext';
import { Channels, SessionEventTypes } from '@/shared/websocket';

describe('WebSocket Integration', () => {
  let mockServer: MockWebSocketServer;

  beforeEach(() => {
    mockServer = new MockWebSocketServer('ws://localhost:3456/ws');
  });

  afterEach(() => {
    mockServer.close();
  });

  test('receives and routes messages correctly', async () => {
    const { result } = renderHook(() => useWebSocket(), {
      wrapper: WebSocketProvider,
    });

    const handler = vi.fn();
    act(() => {
      result.current.eventBus.on(Channels.session('123'), handler);
    });

    // Simulate server message
    mockServer.send({
      channel: 'session:123',
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message: 'test' }
    });

    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledWith({
        type: SessionEventTypes.STREAM_OUTPUT,
        data: { message: 'test' }
      });
    });
  });
});
```

### E2E Tests

#### Testing Session Streaming with Reconnection

```typescript
import { test, expect } from '@playwright/test';

test('session streaming with reconnection', async ({ page }) => {
  // 1. Navigate to session
  await page.goto('/projects/test-project/session/test-session');

  // 2. Send message
  await page.fill('[data-testid="chat-input"]', 'Hello world');
  await page.click('[data-testid="send-button"]');

  // 3. Verify streaming starts
  await expect(page.locator('[data-testid="streaming-indicator"]')).toBeVisible();

  // 4. Reload page during streaming (simulate reconnection)
  await page.reload();

  // 5. Verify reconnection
  await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

  // 6. Verify streaming resumes
  await expect(page.locator('[data-testid="message-content"]')).toContainText('Hello world');
});
```

---

## Troubleshooting

### Issue: Connection Fails Immediately

**Symptoms:**

- WebSocket closes immediately after opening
- Console shows "Authentication failed" or code 1008

**Solutions:**

1. Check JWT token is valid:
   ```typescript
   // Browser DevTools > Application > Local Storage
   const token = localStorage.getItem('authToken');
   console.log('Token:', token);
   ```

2. Verify token format:
   ```bash
   # Backend logs should show:
   [WebSocket] User authenticated: { userId: '...', username: '...' }
   ```

3. Check `ALLOWED_ORIGINS` environment variable:
   ```bash
   # .env
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3456
   ```

4. Regenerate token:
   ```bash
   # Re-login through UI or API
   curl -X POST http://localhost:3456/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"password"}'
   ```

### Issue: Events Not Received

**Symptoms:**

- Handler subscribed but never called
- DevTools shows messages received but handler doesn't fire

**Solutions:**

1. Verify subscription:
   ```typescript
   // Check DevTools > Subscriptions tab
   // Or in console:
   eventBus.getActiveChannels()
   ```

2. Check event type matches:
   ```typescript
   // ❌ BAD
   if (event.type === 'stream_output') { ... }  // String comparison

   // ✅ GOOD
   if (event.type === SessionEventTypes.STREAM_OUTPUT) { ... }
   ```

3. Verify channel format:
   ```typescript
   // ✅ GOOD
   const channel = Channels.session(sessionId);  // 'session:123'

   // ❌ BAD
   const channel = `session-${sessionId}`;  // Wrong format!
   ```

4. Check handler signature:
   ```typescript
   // ✅ GOOD
   const handleEvent = (event: SessionEvent) => { ... };

   // ❌ BAD
   const handleEvent = (data: unknown) => { ... };  // Wrong signature
   ```

### Issue: High Latency / Slow Messages

**Symptoms:**

- DevTools shows latency > 200ms
- Messages take seconds to appear

**Solutions:**

1. Check network conditions:
   ```bash
   # Run ping test
   ping localhost  # Should be < 1ms

   # Check for VPN or proxy
   # Disable temporarily and test
   ```

2. Check server load:
   ```bash
   # Check server logs for slow queries
   tail -f apps/web/logs/app.log | grep -i "slow\|timeout"

   # Monitor CPU/memory
   top
   ```

3. Optimize message size:
   ```typescript
   // ❌ BAD - Sending large payload
   broadcast(channel, {
     type: SessionEventTypes.STREAM_OUTPUT,
     data: {
       message: 'short',
       metadata: hugeObjectWithMBsOfData  // Slows down serialization
     }
   });

   // ✅ GOOD - Send minimal data
   broadcast(channel, {
     type: SessionEventTypes.STREAM_OUTPUT,
     data: {
       message: 'short',
       metadataId: 'ref-123'  // Reference instead
     }
   });
   ```

4. Check for message backlog:
   ```typescript
   // DevTools > Metrics tab
   // Check messagesSent vs messagesReceived
   // Large gap indicates backlog
   ```

### Issue: Memory Leak / Growing Memory Usage

**Symptoms:**

- Browser memory grows over time
- Page slows down after minutes/hours
- EventEmitter leak warnings

**Solutions:**

1. Verify subscription cleanup:
   ```typescript
   // ✅ GOOD
   useEffect(() => {
     eventBus.on(channel, handler);
     return () => {
       eventBus.off(channel, handler);  // Cleanup!
     };
   }, [channel, eventBus]);

   // ❌ BAD - Missing cleanup
   useEffect(() => {
     eventBus.on(channel, handler);
   }, [channel, eventBus]);
   ```

2. Check for duplicate subscriptions:
   ```typescript
   // DevTools > Subscriptions tab
   // Should only show one subscription per channel
   // Multiple subscriptions = memory leak
   ```

3. Clear message log periodically:
   ```typescript
   // WebSocketDevTools stores last 50 messages
   // This is bounded, but if you're storing elsewhere:

   // ✅ GOOD - Bounded storage
   const [messages, setMessages] = useState<Message[]>([]);

   const addMessage = (msg: Message) => {
     setMessages((prev) => [...prev.slice(-49), msg]);  // Keep last 50
   };

   // ❌ BAD - Unbounded storage
   const addMessage = (msg: Message) => {
     setMessages((prev) => [...prev, msg]);  // Grows forever!
   };
   ```

4. Check for circular references:
   ```typescript
   // Avoid storing socket or eventBus in state
   // These have circular references

   // ❌ BAD
   const [socket, setSocket] = useState(socketRef.current);

   // ✅ GOOD
   const { eventBus } = useWebSocket();  // Use context
   ```

### Issue: Reconnection Loops

**Symptoms:**

- Connection keeps reconnecting every few seconds
- DevTools shows multiple reconnection attempts
- ConnectionStatusBanner constantly shows "Reconnecting..."

**Solutions:**

1. Check server availability:
   ```bash
   curl http://localhost:3456/api/health
   # Should return 200 OK
   ```

2. Check for infinite error loops:
   ```typescript
   // Backend logs
   tail -f apps/web/logs/app.log | grep -i "error\|close"

   // Look for repeating errors indicating server issue
   ```

3. Check reconnection delay:
   ```typescript
   // Should have exponential backoff
   // Attempt 1: 1s, Attempt 2: 2s, Attempt 3: 4s, etc.

   // If delays are too short, connections thrash
   // If delays are too long, recovery is slow
   ```

4. Check for permission errors:
   ```typescript
   // If user doesn't have permission to a channel,
   // they shouldn't subscribe in the first place

   // ✅ GOOD
   if (hasPermission(sessionId)) {
     eventBus.on(Channels.session(sessionId), handler);
   }
   ```

### Issue: Type Errors After Update

**Symptoms:**

- TypeScript errors: `Type 'X' is not assignable to type 'never'`
- Build fails with type errors

**Solutions:**

1. Add missing case to switch statement:
   ```typescript
   // Error: Type 'NEW_EVENT' is not assignable to type 'never'

   // Add missing case:
   switch (event.type) {
     case SessionEventTypes.STREAM_OUTPUT:
       break;
     case SessionEventTypes.MESSAGE_COMPLETE:
       break;
     case SessionEventTypes.NEW_EVENT:  // ADD THIS
       break;
     default:
       const _exhaustive: never = event;
   }
   ```

2. Regenerate types:
   ```bash
   # If using generated types
   pnpm build
   ```

3. Restart TypeScript server:
   ```bash
   # VS Code: Command Palette > "TypeScript: Restart TS Server"
   ```

---

## Summary

This WebSocket architecture provides:

- **Type Safety** - Discriminated unions with exhaustive checking
- **Scalability** - Channel-based subscriptions, not flat event names
- **Reliability** - Heartbeat, reconnection, queue limits
- **Debuggability** - DevTools, metrics, console logs
- **Maintainability** - Shared types, constants, documented patterns

**Key Takeaways:**

1. Always use constants from `@/shared/websocket`, never magic strings
2. Always use exhaustive checking in switch statements
3. Always clean up subscriptions in useEffect return
4. Use DevTools (Ctrl+Shift+W) for debugging
5. Follow Phoenix Channels pattern: channels + events, not flat event names

**For More Help:**

- Check DevTools for real-time debugging
- Review code examples in this guide
- Check TypeScript errors (exhaustive checking catches most issues)
- Ask for help in team chat with DevTools screenshots
