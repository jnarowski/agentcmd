# Chat Format Adapters

## Overview

The adapter system allows us to load historical chat sessions from different JSONL formats without modifying the source files. This is useful when:
- Claude Code changes its output format
- Supporting different chatbot systems (Claude, Codex, etc.)
- Loading old conversation files

## Architecture

```
JSONL File → Auto-detect Format → Transform → Unified ChatMessage → UI Components
```

### Primary Use Case: WebSocket (Real-time)
```typescript
// Real-time messages - no adapter needed
useClaudeWebSocket(sessionId) → messages arrive pre-formatted → UI
```

### Secondary Use Case: Historical Sessions (JSONL)
```typescript
// Load old conversations - adapter transforms format
useClaudeSession(file) → adapter detects format → transforms → UI
```

## Supported Formats

### Claude Code JSONL Format
**Example File**: `955542ae-9772-459d-a33f-d12f5586d961.jsonl`

**Structure**:
```jsonl
{"type":"user","message":{"role":"user","content":[...]},"uuid":"...","timestamp":"..."}
{"type":"assistant","message":{"role":"assistant","content":[...]},"uuid":"...","timestamp":"..."}
{"type":"file-history-snapshot","messageId":"...","snapshot":{...}}
```

**Content Types** (inside `message.content[]`):
- `{"type":"text","text":"..."}` - Text content
- `{"type":"tool_use","id":"...","name":"...","input":{...}}` - Tool invocation
- `{"type":"tool_result","tool_use_id":"...","content":"..."}` - Tool result
- `{"type":"thinking","thinking":"..."}` - Extended thinking content

**Detection**: Looks for `"type":"user"` or `"type":"assistant"`

**Adapter**: `transformClaudeCliEvent()` in `sessionAdapters.ts`

**Important Note on Streaming Events:**
Streaming events like `message_start`, `content_block_start`, `content_block_delta`, and `message_stop` only occur during **real-time WebSocket streaming** and are **never written to JSONL files**. JSONL files contain only complete, finalized messages. These streaming events exist in memory during live conversations but are not persisted.

## How It Works

### 1. Format Detection (Auto)
```typescript
// In sessionAdapters.ts
function detectFormat(jsonlContent: string): TransformFn {
  if (jsonlContent.includes('"type":"user"')) {
    return transformClaudeCliEvent; // Claude Code format
  }
  return (event) => event; // Unknown format (passthrough)
}
```

### 2. Transform Function
```typescript
// Simple transform: raw event → normalized event or null
function transformClaudeCliEvent(event: any): any | null {
  if (!event.type || !['user', 'assistant'].includes(event.type)) {
    return null; // Skip non-message events
  }

  return {
    type: event.type === 'user' ? 'user_message' : 'assistant_message',
    id: event.uuid,
    role: event.type,
    content: event.message.content, // Already in right format
    timestamp: event.timestamp
  };
}
```

### 3. Parse with Adapter
```typescript
// In parseClaudeSession.ts
export function parseJSONLSession(jsonlContent: string): ChatMessage[] {
  // Use adapter-based parsing (handles Claude Code JSONL format)
  return parseJSONLWithAdapter(jsonlContent);
}
```

## Adding a New Format

Want to support a new chatbot or format change? Here's how:

### Step 1: Create Transform Function
```typescript
// In sessionAdapters.ts
function transformCodexEvent(event: any): any | null {
  // Your detection logic
  if (!event.format === 'codex') return null;

  // Transform to normalized format
  return {
    type: event.role === 'user' ? 'user_message' : 'assistant_message',
    id: event.id,
    role: event.role,
    content: event.messages, // Map to our content structure
    timestamp: event.created_at
  };
}
```

### Step 2: Update Format Detection
```typescript
// In sessionAdapters.ts
function detectFormat(jsonlContent: string): TransformFn {
  // Check for Codex format
  if (jsonlContent.includes('"format":"codex"')) {
    return transformCodexEvent;
  }

  // Check for Claude Code format
  if (jsonlContent.includes('"type":"user"')) {
    return transformClaudeCliEvent;
  }

  // Default to passthrough
  return (event) => event;
}
```

### Step 3: Test
```typescript
// Create a test mock file
// apps/web/public/mocks/codex-session.jsonl

// Use in component
const { messages } = useClaudeSession('codex-session.jsonl');
```

That's it! The adapter will auto-detect and transform the format.

## Key Principles

1. **Never modify mock files** - Adapters transform them
2. **Keep transforms simple** - One function per format
3. **Auto-detect format** - No manual configuration
4. **Unified output** - All adapters produce `ChatMessage[]`
5. **WebSocket is primary** - Adapters only for historical sessions

## Files

- `sessionAdapters.ts` - Transform functions and auto-detection
- `parseClaudeSession.ts` - Main parsing logic (uses adapters)
- `useClaudeSession.ts` - Hook for loading JSONL files
- `types/chat.ts` - Unified `ChatMessage` interface

## Testing

```typescript
// Test Claude Code format
const { messages } = useClaudeSession('955542ae-9772-459d-a33f-d12f5586d961.jsonl');

// Messages are automatically parsed and rendered
```

## Future: WebSocket Hook

For real-time conversations, create a WebSocket hook (no adapter needed):

```typescript
// hooks/useClaudeWebSocket.ts
export function useClaudeWebSocket(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`/ws/session/${sessionId}`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // Messages already in ChatMessage format
      setMessages(prev => [...prev, message]);
    };

    return () => ws.close();
  }, [sessionId]);

  return { messages, isConnected: true };
}
```

Components can then choose which hook to use:
```typescript
// For historical sessions
const { messages } = useClaudeSession('file.jsonl');

// For real-time chat
const { messages } = useClaudeWebSocket(sessionId);
```
