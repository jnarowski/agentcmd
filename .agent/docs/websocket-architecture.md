# WebSocket Architecture

Comprehensive guide to WebSocket patterns and real-time communication in agentcmd.

## Overview

The app uses WebSockets for real-time bidirectional communication between frontend and backend for:
- Agent session streaming
- Workflow execution updates
- Terminal output
- Git operations
- File system changes

**Tech Stack:**
- **Socket.IO** - WebSocket library
- **EventBus** - Custom event system for pub/sub
- **JWT Authentication** - Secure WebSocket connections

## Architecture

### Event-Driven Design

The WebSocket system uses an EventBus for decoupled event handling.

```
Client ←→ WebSocket Server ←→ EventBus ←→ Domain Services
```

**Flow:**
1. Domain services emit events to EventBus
2. EventBus routes events to WebSocket handlers
3. WebSocket handlers broadcast to subscribed clients
4. Clients receive real-time updates

### Backend Structure

```
apps/app/src/server/websocket/
├── index.ts                 # WebSocket server setup
├── eventBus.ts              # Central event bus
├── handlers/                # Domain-specific handlers
│   ├── session.handler.ts   # Agent sessions
│   ├── workflow.handler.ts  # Workflow execution
│   ├── shell.handler.ts     # Terminal
│   └── git.handler.ts       # Git operations
└── middleware/
    └── auth.middleware.ts   # JWT authentication
```

### Frontend Integration

```
apps/app/src/client/
├── hooks/
│   └── useWebSocket.ts      # Global WebSocket hook
└── pages/
    └── projects/
        ├── sessions/hooks/useSessionWebSocket.ts
        ├── workflows/hooks/useWorkflowWebSocket.ts
        └── shell/hooks/useShellWebSocket.ts
```

## Naming Conventions

### Channels: Colon Notation

Channels use colons for namespacing (Phoenix Channels pattern).

```typescript
// ✅ DO - Channels use colons
"session:123"
"project:abc"
"workflow:run:456"
"shell:terminal:789"

// ❌ DON'T - Don't use dots for channels
"session.123"
"project.abc"
```

**Pattern:** `{domain}:{resource}:{id}`

### Events: Dot Notation

Events use dots for hierarchy (JavaScript/WebSocket standard).

```typescript
// ✅ DO - Events use dots
"session.stream_output"
"workflow.run.updated"
"workflow.run.step.completed"
"shell.output"
"git.operation.completed"

// ❌ DON'T - Don't use colons for events
"session:stream_output"
"workflow:run:updated"
```

**Pattern:** `{domain}.{action}.{detail}`

## Message Structure

### Standard Message Format

All WebSocket messages follow consistent structure.

```typescript
interface WebSocketMessage<T = unknown> {
  type: string; // Event type (dot notation)
  data: T;      // Payload
}
```

**Example:**
```typescript
{
  type: "session.stream_output",
  data: {
    sessionId: "123",
    content: "Hello world",
    type: "stdout"
  }
}
```

## EventBus Implementation

### Central Event Bus

The EventBus is a central pub/sub system for application-wide events.

```typescript
// apps/app/src/server/websocket/eventBus.ts

type EventHandler<T = any> = (data: T) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  // Subscribe to events
  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  // Emit events
  async emit<T = any>(event: string, data: T): Promise<void> {
    const handlers = this.handlers.get(event);

    if (!handlers) return;

    await Promise.all(
      Array.from(handlers).map((handler) => handler(data))
    );
  }

  // Broadcast to WebSocket channel
  broadcast(channel: string, message: WebSocketMessage): void {
    io.to(channel).emit("message", message);
  }
}

export const eventBus = new EventBus();
```

### Usage in Domain Services

Domain services emit events, don't directly manipulate sockets.

```typescript
// domain/session/services/executeAgent.ts

export async function executeAgent({
  sessionId,
  prompt,
  onEvent,
}: ExecuteAgentParams) {
  // Emit events via callback
  onEvent({
    type: "session.stream_output",
    data: {
      sessionId,
      content: "Starting agent...",
      type: "system",
    },
  });

  // Execute agent with streaming
  for await (const chunk of agentStream) {
    onEvent({
      type: "session.stream_output",
      data: {
        sessionId,
        content: chunk.text,
        type: "stdout",
      },
    });
  }

  onEvent({
    type: "session.completed",
    data: { sessionId },
  });
}
```

## WebSocket Handlers

### Handler Pattern

Handlers subscribe to EventBus events and broadcast to WebSocket channels.

```typescript
// websocket/handlers/session.handler.ts

export function setupSessionHandler(eventBus: EventBus) {
  // Subscribe to session events
  eventBus.on("session.stream_output", (data) => {
    const { sessionId, content, type } = data;

    // Broadcast to session channel
    eventBus.broadcast(`session:${sessionId}`, {
      type: "session.stream_output",
      data: { content, type },
    });
  });

  eventBus.on("session.completed", (data) => {
    const { sessionId } = data;

    eventBus.broadcast(`session:${sessionId}`, {
      type: "session.completed",
      data: { sessionId },
    });
  });

  // More event subscriptions...
}
```

### Handler Registration

All handlers registered at startup.

```typescript
// websocket/index.ts

import { setupSessionHandler } from "./handlers/session.handler";
import { setupWorkflowHandler } from "./handlers/workflow.handler";
import { setupShellHandler } from "./handlers/shell.handler";

export function setupWebSocket(server: FastifyInstance) {
  const io = new Server(server.server);

  // Setup EventBus
  const eventBus = new EventBus();

  // Register all handlers
  setupSessionHandler(eventBus);
  setupWorkflowHandler(eventBus);
  setupShellHandler(eventBus);

  // Handle client connections
  io.on("connection", (socket) => {
    handleConnection(socket, eventBus);
  });

  return { io, eventBus };
}
```

## Authentication

### JWT Authentication

WebSocket connections authenticated via JWT tokens.

```typescript
// websocket/middleware/auth.middleware.ts

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = fastify.jwt.verify(token);
    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});
```

### Frontend Authentication

Pass JWT token when connecting.

```typescript
// hooks/useWebSocket.ts

import { io } from "socket.io-client";
import { useAuthStore } from "@/client/stores/authStore";

export function useWebSocket() {
  const token = useAuthStore((state) => state.token);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const newSocket = io("http://localhost:4100", {
      auth: { token },
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connected");
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return {
    socket,
    isConnected: socket?.connected ?? false,
  };
}
```

## Client Patterns

### Feature-Level WebSocket Hooks

Each feature implements custom hook for WebSocket communication.

```typescript
// pages/projects/sessions/hooks/useSessionWebSocket.ts

export function useSessionWebSocket(sessionId: string) {
  const { socket, isConnected } = useWebSocket();
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [status, setStatus] = useState<SessionStatus>("idle");

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to session channel
    socket.emit("subscribe", `session:${sessionId}`);

    // Handle events
    const handleStreamOutput = (message: WebSocketMessage) => {
      if (message.type === "session.stream_output") {
        setMessages((prev) => [...prev, message.data]);
      }
    };

    const handleCompleted = (message: WebSocketMessage) => {
      if (message.type === "session.completed") {
        setStatus("completed");
      }
    };

    socket.on("message", (message) => {
      handleStreamOutput(message);
      handleCompleted(message);
    });

    // Cleanup
    return () => {
      socket.emit("unsubscribe", `session:${sessionId}`);
      socket.off("message");
    };
  }, [socket, isConnected, sessionId]);

  return {
    messages,
    status,
    isConnected,
  };
}
```

### Subscription Management

Always subscribe on mount and unsubscribe on unmount.

```typescript
// ✅ DO - Proper subscription lifecycle
useEffect(() => {
  if (!socket || !isConnected) return;

  socket.emit("subscribe", channel);

  return () => {
    socket.emit("unsubscribe", channel);
  };
}, [socket, isConnected, channel]);

// ❌ DON'T - Forget to unsubscribe
useEffect(() => {
  if (!socket || !isConnected) return;

  socket.emit("subscribe", channel);
  // Missing unsubscribe!
}, [socket, isConnected, channel]);
```

## Event Patterns

### Domain Events

Each domain defines its event types.

**Session Events:**
```typescript
"session.stream_output"      // Agent streaming output
"session.completed"          // Session finished
"session.error"              // Session error
"session.cancelled"          // User cancelled
```

**Workflow Events:**
```typescript
"workflow.run.started"       // Workflow execution started
"workflow.run.updated"       // Workflow status changed
"workflow.run.completed"     // Workflow completed
"workflow.run.failed"        // Workflow failed
"workflow.run.step.started"  // Step started
"workflow.run.step.progress" // Step progress
"workflow.run.step.completed" // Step completed
"workflow.run.step.failed"   // Step failed
```

**Shell Events:**
```typescript
"shell.output"               // Terminal output
"shell.exit"                 // Process exited
"shell.error"                // Process error
```

### Progress Events

For long-running operations, emit progress events.

```typescript
// Emit progress updates during execution
for (const item of items) {
  await processItem(item);

  eventBus.emit("workflow.run.step.progress", {
    runId,
    stepId,
    progress: {
      current: index + 1,
      total: items.length,
      percentage: ((index + 1) / items.length) * 100,
    },
  });
}
```

## Best Practices

### Backend

✅ DO:
- Emit events from domain services
- Use EventBus for decoupling
- Validate event data with Zod
- Handle errors gracefully
- Log WebSocket errors

❌ DON'T:
- Access sockets directly from services
- Skip authentication
- Emit sensitive data
- Forget error handling

### Frontend

✅ DO:
- Always check connection status
- Subscribe/unsubscribe properly
- Handle reconnection
- Show connection status in UI
- Use immutable state updates

❌ DON'T:
- Forget cleanup in useEffect
- Mutate state
- Skip error handling
- Assume socket is always connected

### Event Design

✅ DO:
- Use consistent naming (dots for events, colons for channels)
- Include context in event data (IDs, timestamps)
- Keep events focused (one concern)
- Document event schemas

❌ DON'T:
- Mix naming conventions
- Emit large payloads
- Create ambiguous event names
- Skip data validation

## Debugging

### Backend Debugging

```typescript
// Enable debug logging
const eventBus = new EventBus({ debug: true });

// Log all events
eventBus.on("*", (data) => {
  console.log("Event emitted:", data);
});
```

### Frontend Debugging

```typescript
// Log all WebSocket messages
useEffect(() => {
  if (!socket) return;

  socket.onAny((eventName, ...args) => {
    console.log("WebSocket event:", eventName, args);
  });

  return () => {
    socket.offAny();
  };
}, [socket]);
```

### Browser DevTools

Monitor WebSocket traffic in Network tab:
1. Open DevTools → Network
2. Filter: WS (WebSocket)
3. Click connection
4. View Messages tab

## Quick Reference

**Naming:**
- Channels: `domain:id` (session:123)
- Events: `domain.action` (session.stream_output)

**Key Files:**
- EventBus: `apps/app/src/server/websocket/eventBus.ts`
- Handlers: `apps/app/src/server/websocket/handlers/`
- Global Hook: `apps/app/src/client/hooks/useWebSocket.ts`
- Feature Hooks: `apps/app/src/client/pages/projects/*/hooks/`

**Example Handlers:**
- Session: `websocket/handlers/session.handler.ts`
- Workflow: `websocket/handlers/workflow.handler.ts`

**Related Docs:**
- `.agent/docs/workflow-system.md` - Workflow events
- `.agent/docs/frontend-patterns.md` - WebSocket client hooks
- `.agent/docs/backend-patterns.md` - Domain services
