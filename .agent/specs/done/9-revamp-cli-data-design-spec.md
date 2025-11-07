# Feature: Revamp CLI Data Design with Standardized Message Format

## What We're Building

A standardized message format system that normalizes CLI outputs (Claude primarily) at the SDK level, eliminating redundant parsing across backend and frontend layers. This refactor achieves **~70% code reduction** by removing agent abstraction layers and buggy streaming logic, while providing end-to-end type safety.

## User Story

As a developer maintaining the agent workflows system
I want CLI messages standardized at the SDK level with strong typing
So that I can easily debug message flows, have confidence that messages are correctly typed throughout the entire stack, and maintain a simpler codebase

## Technical Approach

**Core Strategy**: Move all message normalization to the SDK layer (agent-cli-sdk) where CLI outputs are first received. The SDK will expose a `StandardMessage` type that all adapters transform their CLI-specific formats into. This standardized format flows unchanged through backend WebSocket handlers to the frontend.

**Key Design Decisions** (Updated after extensive design review):

1. **Rename `events` → `messages`**: Use `messages: StandardMessage[]` for clarity
2. **Preserve `response.data`**: JSON/text extraction via `responseSchema` remains unchanged (serves different purpose than messages)
3. **Include `_original` field always**: Available in both dev and production for debugging
4. **NO backward compatibility**: Breaking change, clean slate, refactor all at once
5. **Structured metadata**: Type-safe `MessageMetadata` interface (not `Record<string, unknown>`)
6. **Remove `isStreaming` flag**: Frontend extends StandardMessage with its own StreamingMessage interface
7. **Remove `isError` flag**: Redundant - just check if `error` field exists
8. **Skip ImageBlock**: Defer to future - no image handling changes
9. **Add `error` field**: `error?: { code, message, details }` for structured error info
10. **Create Zod schemas**: Runtime validation at all boundaries
11. **Delete transformStreaming**: Process StandardMessage[] directly - no intermediate transforms
12. **Delete transformMessages**: Replace with shared `filterSystemMessages()` util
13. **Delete updateStreamingMessage**: Try simpler approach first, add back if needed
14. **Delete entire agent registry**: Inline Claude components directly - no abstraction needed
15. **Rename standardizer → transformMessages**: Clearer naming convention

**Simplified Streaming**: Backend transforms incremental chunks to StandardMessage[] during streaming (for UI state only). Frontend receives complete StandardMessage[] in `message_complete` event.

**No Incremental Updates**: Frontend skips message updates during streaming - only shows loading indicator. Messages appended once on completion.

**Per-Message Usage**: SDK extracts token usage per message. Frontend/backend aggregate if needed.

**Cache Token Exclusion**: `total_tokens = input_tokens + output_tokens` only (cache tokens separate).

## Ultra-Simplified Architecture

**BEFORE:**

```
CLI → SDK (events) → Backend (parseFormat) → Frontend (transformStreaming + transformMessages) → UI
      └─ StreamEvent[]   └─ manual parsing    └─ agent.getAgent() registry with 3 methods
```

**AFTER:**

```
CLI → SDK (transform) → Backend (forward) → Frontend (append on complete) → UI
      └─ StandardMessage[]  └─ send in message_complete   └─ direct rendering (no registry)
```

**Code Elimination:**

- ❌ All `parseFormat` files (backend)
- ❌ All `transformStreaming` files (frontend)
- ❌ All `transformMessages` files (frontend)
- ❌ Entire `client/lib/agents/` directory (~20 files)
- ❌ `updateStreamingMessage` (buggy logic)
- ❌ `ClientAgent` interface and registry
- ❌ `getAgent()` function

**New Simplicity:**

- ✅ One SDK transformer per CLI
- ✅ Shared `filterSystemMessages()` selector
- ✅ Simple `addMessage()` on completion (no streaming updates)
- ✅ Direct component rendering (no abstraction)

## Files to Touch

### New Files (2 total)

**SDK Layer:**

- `packages/agent-cli-sdk/src/utils/standard-message.ts` - StandardMessage, ContentBlock, TokenUsage types + Zod schemas
- `packages/agent-cli-sdk/src/adapters/claude/transformMessages.ts` - Transform Claude events to StandardMessage[]

### Updated Files (10 total)

**SDK Layer:**

- `packages/agent-cli-sdk/src/utils/types.ts` - Change `events?` → `messages` (BREAKING)
- `packages/agent-cli-sdk/src/adapters/claude/transform.ts` - Call transformMessages, return messages
- `packages/agent-cli-sdk/src/index.ts` - Export StandardMessage types and transformer

**Backend Layer:**

- `apps/web/src/server/websocket.ts` - Transform incremental chunks, forward to frontend
- `apps/web/src/server/agents/claude/loadSession.ts` - Use SDK transformer
- `apps/web/src/shared/types/websocket.ts` - Update to `{ messages: StandardMessage[] }`

**Frontend Layer:**

- `apps/web/src/shared/types/message.types.ts` - Alias SessionMessage = StandardMessage
- `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts` - Replace updateStreamingMessage with upsertMessage
- `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Process StandardMessage[] directly
- `apps/web/src/client/pages/projects/sessions/components/ChatInterface.tsx` - Inline Claude components

### Deleted Files (~25+ total)

**Backend:**

- `apps/web/src/server/agents/claude/parseFormat.ts`
- `apps/web/src/server/agents/codex/parseFormat.ts`
- `apps/web/src/server/agents/claude/parseFormat.test.ts`

**Frontend (ENTIRE directory):**

- `apps/web/src/client/lib/agents/` - Delete entire directory including:
  - `index.tsx` (registry)
  - `claude/transformMessages.ts`
  - `claude/transformStreaming.ts`
  - `claude/*.test.ts`
  - `codex/*` (all files)
  - `cursor/*` (all files)
  - `gemini/*` (all files)
  - `__mocks__/*` (all files)

## Implementation Plan

### Phase 1: SDK Foundation

**Create `packages/agent-cli-sdk/src/utils/standard-message.ts`:**

```typescript
export interface StandardMessage {
  id: string;
  role: "user" | "assistant";
  timestamp: number;
  content: ContentBlock[];
  usage?: StandardTokenUsage;
  metadata: MessageMetadata;
  error?: {
    // Replaces isError - just check if this exists
    code: string;
    message: string;
    details?: unknown;
  };
  _original: unknown; // Always included for debugging
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock;
// Note: NO ImageBlock - deferred to future

export interface StandardTokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number; // input + output ONLY (excludes cache)
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  service_tier?: string;
}

export interface MessageMetadata {
  source: "claude" | "codex" | "cursor" | "gemini";
  model?: string;
  sessionId?: string;
  cliVersion?: string;
  stop_reason?: string;
  stop_sequence?: string;
}

// + Zod schemas for all types
```

**Update `packages/agent-cli-sdk/src/utils/types.ts`:**

```typescript
export interface ExecutionResponse<T = string> {
  data: T; // JSON/text extraction (via responseSchema)
  messages: StandardMessage[]; // Changed from events?: StreamEvent[]
  // ... rest unchanged
}
```

### Phase 2: Claude Transformer Implementation

**Create `packages/agent-cli-sdk/src/adapters/claude/transformMessages.ts`:**

```typescript
import type { ClaudeStreamEvent } from "./events";
import type { StandardMessage } from "../../utils/standard-message";

/**
 * Transform Claude CLI events to StandardMessage[]
 * Filters to user/assistant messages only, extracts per-message usage
 */
export function transformMessages(
  events: ClaudeStreamEvent[]
): StandardMessage[] {
  return events
    .filter((e) => e.type === "user" || e.type === "assistant")
    .map((event) => {
      const data = event.data!;
      const message = data.message;

      return {
        id: data.uuid,
        role: event.type as "user" | "assistant",
        timestamp: new Date(data.timestamp).getTime(),
        content: Array.isArray(message.content)
          ? message.content
          : [{ type: "text", text: String(message.content) }],
        usage: message.usage
          ? {
              input_tokens: message.usage.input_tokens || 0,
              output_tokens: message.usage.output_tokens || 0,
              total_tokens:
                (message.usage.input_tokens || 0) +
                (message.usage.output_tokens || 0),
              cache_creation_input_tokens:
                message.usage.cache_creation_input_tokens,
              cache_read_input_tokens: message.usage.cache_read_input_tokens,
              service_tier: message.usage.service_tier,
            }
          : undefined,
        metadata: {
          source: "claude",
          model: message.model,
          sessionId: data.sessionId,
          cliVersion: data.version,
          stop_reason: message.stop_reason ?? undefined,
          stop_sequence: message.stop_sequence ?? undefined,
        },
        _original: event,
      };
    });
}
```

**Update `packages/agent-cli-sdk/src/adapters/claude/parser.ts`:**

```typescript
import { transformMessages } from './transformMessages';
import type { ClaudeStreamEvent } from './events';

export async function parseClaudeOutput<T = string>(
  stdout: string,
  duration: number,
  exitCode: number,
  responseSchema?: /* ... */
): Promise<ExecutionResponse<T>> {
  // Parse JSONL events
  const events = parseJSONL(stdout) as ClaudeStreamEvent[];

  // Transform to StandardMessage[]
  const messages = transformMessages(events);

  // Extract final output for response.data (unchanged)
  // ... existing logic ...

  return {
    data: output,
    messages,  // Changed from events
    sessionId,
    status,
    exitCode,
    duration,
    // ... rest unchanged
  };
}
```

**Export from SDK:**

```typescript
// packages/agent-cli-sdk/src/index.ts
export { transformMessages as transformClaudeMessages } from "./adapters/claude/transformMessages";
export type {
  StandardMessage,
  StandardTokenUsage,
  MessageMetadata,
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  ToolUseBlock,
  ToolResultBlock,
} from "./utils/standard-message";
export {
  StandardMessageSchema,
  StandardTokenUsageSchema,
  MessageMetadataSchema,
  ContentBlockSchema,
} from "./utils/standard-message";
```

### Phase 3: Backend WebSocket Simplification

**Update `apps/web/src/shared/types/websocket.ts`:**

```typescript
import type { StandardMessage } from "@repo/agent-cli-sdk";

export interface SessionStreamOutputData {
  messages: StandardMessage[]; // Changed from { content: { events } }
}

export interface SessionMessageCompleteData {
  messages: StandardMessage[]; // NEW: Full message payload on completion
}
```

**Update `apps/web/src/server/websocket.ts`:**

**Add imports:**
```typescript
import { transformClaudeMessages } from '@repo/agent-cli-sdk';
import type { ClaudeStreamEvent } from '@repo/agent-cli-sdk';
```

**Replace onOutput callback (line ~170):**
```typescript
onOutput: (outputData: any) => {
  // Transform incremental events from this chunk
  const messages = transformClaudeMessages(
    outputData.events as ClaudeStreamEvent[]
  );

  // Forward StandardMessage[] to frontend (for UI state only)
  sendMessage(socket, `session.${sessionId}.stream_output`, { messages });
},
```

**Update message_complete event (line ~314):**
```typescript
// DELETE lines 249-301 (usage extraction from events)

// After successful execution, send complete StandardMessage[] payload
sendMessage(socket, `session.${sessionId}.message_complete`, {
  messages: response.messages || [], // Full StandardMessage[] from SDK
});
```

**Update `apps/web/src/server/agents/claude/loadSession.ts`:**

```typescript
import { parseJSONL, transformClaudeMessages } from "@repo/agent-cli-sdk";
import type { ClaudeStreamEvent } from "@repo/agent-cli-sdk";

export async function loadSession(sessionId: string, projectPath: string) {
  const content = await fs.readFile(filePath, "utf-8");
  const events = parseJSONL(content) as ClaudeStreamEvent[];
  return transformClaudeMessages(events);
}
```

**Delete files:**

- `apps/web/src/server/agents/claude/parseFormat.ts`
- `apps/web/src/server/agents/codex/parseFormat.ts`
- `apps/web/src/server/agents/claude/parseFormat.test.ts`

### Phase 4: Add Message Filtering Selector

**Update `sessionStore.ts` - Add filtered messages selector:**

```typescript
import type { StandardMessage } from "@repo/agent-cli-sdk";

// Add selector for filtered messages (exported at bottom of file)
export const selectFilteredMessages = (
  state: SessionStore
): SessionMessage[] => {
  if (!state.session?.messages) return [];

  return state.session.messages.filter((msg) => {
    const allSystem = msg.content.every((block) => {
      if (block.type === "text") {
        return isSystemMessage(block.text);
      }
      return false;
    });
    return !allSystem || msg.content.length === 0;
  });
};

function isSystemMessage(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith("<command-") ||
    trimmed.startsWith("<warmup") ||
    trimmed.includes("<system-reminder>")
  );
}
```

### Phase 5: Frontend Store Simplification

**Update `sessionStore.ts` - Simplify message handling:**

```typescript
// DELETE updateStreamingMessage entirely (lines 220-272)

// Keep existing addMessage (or simplify if needed)
addMessage: (message: SessionMessage) => {
  set((state) => {
    if (!state.session) return state;
    return {
      session: {
        ...state.session,
        messages: [...state.session.messages, message],
      },
    };
  });
},

// SIMPLIFY loadSession - store raw messages, filter on render
loadSession: async (sessionId, projectId, queryClient) => {
  try {
    // ... existing session fetch logic ...

    // Fetch messages from API
    const data = await api.get<{ data: StandardMessage[] }>(
      `/api/projects/${projectId}/sessions/${sessionId}/messages`
    );
    const messages = data.data || [];

    // Store raw messages (filtering happens via selector)
    set((state) => ({
      session: state.session
        ? {
            ...state.session,
            messages,  // Store unfiltered
            loadingState: "loaded",
          }
        : null,
    }));
  } catch (error) {
    // ... error handling ...
  }
},
```

### Phase 6: Frontend Hook Simplification

**Update `useSessionWebSocket.ts`:**

**handleStreamOutput - Just set streaming flag:**
```typescript
const handleStreamOutput = useCallback((data: SessionStreamOutputData) => {
  // Just set streaming flag - don't modify messages
  useSessionStore.getState().setStreaming(true);
}, []);
```

**handleMessageComplete - Add complete messages:**
```typescript
const handleMessageComplete = useCallback((data: SessionMessageCompleteData) => {
  const store = useSessionStore.getState();

  // Add complete messages to store
  if (data.messages && data.messages.length > 0) {
    data.messages.forEach((message) => {
      store.addMessage(message);
    });
  }

  store.setStreaming(false);

  // Invalidate sessions query to update sidebar
  queryClient.invalidateQueries({ queryKey: sessionKeys.byProject(projectIdRef.current) });
}, [queryClient]);
```

**Remove agent registry:**
```typescript
// DELETE:
// import { getAgent } from "../../../../lib/agents";
// const agent = getAgent(session.agent);
// const streamingMessage = agent.transformStreaming(data);
// agent.transformMessages() calls
```

### Phase 7: Inline Components & Delete Registry

**Update `ChatInterface.tsx` - Delete agent registry, inline Claude components:**

```typescript
import { UserMessage } from './session/claude/UserMessage';
import { AssistantMessage } from './session/claude/AssistantMessage';
import { selectFilteredMessages } from '../stores/sessionStore';
import { useSessionStore } from '../stores/sessionStore';
import type { StandardMessage } from '@repo/agent-cli-sdk';

export function ChatInterface({
  projectId,
  sessionId,
  isLoading = false,
  error = null,
  isStreaming = false,
  isLoadingHistory = false,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get filtered messages from store selector
  const filteredMessages = useSessionStore(selectFilteredMessages);

  // Build tool results map (for Claude's tool_use/tool_result rendering)
  const toolResults = useMemo(() => {
    const map = new Map<string, { content: string; is_error?: boolean }>();
    filteredMessages.forEach(msg => {
      msg.content.forEach(block => {
        if (block.type === 'tool_result') {
          map.set(block.tool_use_id, {
            content: block.content || '',
            is_error: block.is_error,
          });
        }
      });
    });
    return map;
  }, [filteredMessages]);

  // ... loading/error/empty states unchanged ...

  return (
    <div ref={containerRef} className="h-full overflow-y-auto relative">
      <div className="chat-container max-w-4xl mx-auto px-4 py-8">
        {/* Direct rendering - no agent registry */}
        {filteredMessages.map(message => (
          message.role === 'user'
            ? <UserMessage key={message.id} message={message} />
            : <AssistantMessage
                key={message.id}
                message={message}
                toolResults={toolResults}
              />
        ))}
        <AgentLoadingIndicator isStreaming={isStreaming} />
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
```

**Delete entire directory:**

- `apps/web/src/client/lib/agents/` - ALL files and subdirectories
- `apps/web/src/client/lib/message-utils.ts` - No longer needed (filtering in selector)

**Remove imports:**

```typescript
// DELETE:
import { getAgent } from "../../../../lib/agents";
const agentImpl = getAgent(agent);
const AgentMessageRenderer = agentImpl.MessageRenderer;
```

### Phase 8: Type Alignment & Error Handling

**Update `apps/web/src/shared/types/message.types.ts`:**

```typescript
// Import SDK types
import type { StandardMessage } from "@repo/agent-cli-sdk";

// Re-export SDK types
export type {
  StandardMessage,
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  ToolUseBlock,
  ToolResultBlock,
  StandardTokenUsage,
  MessageMetadata,
} from "@repo/agent-cli-sdk";

// Frontend extends StandardMessage with UI state
export interface SessionMessage extends StandardMessage {
  isStreaming?: boolean; // Frontend-only UI state
}
```

**Search and update all `isError` usage:**

```bash
# Find all isError usage in codebase
grep -r "isError" apps/web/src

# Replace with error field checks:
# Before: if (message.isError)
# After:  if (message.error)
```

**Update error rendering components:**

```typescript
// Update any components that check isError
// Before:
{message.isError && <ErrorBanner />}

// After:
{message.error && <ErrorBanner message={message.error} />}
```

## Step-by-Step Task List

### 1: SDK Foundation - Types and Schemas

- [ ] 1.1 Create StandardMessage interface (NO isError, NO isStreaming - pure SDK type)
- [ ] 1.2 Create ContentBlock types (NO ImageBlock - defer to future)
- [ ] 1.3 Create StandardTokenUsage (total_tokens excludes cache tokens)
- [ ] 1.4 Create MessageMetadata (structured, not Record)
- [ ] 1.5 Create Zod schemas for all types
- [ ] 1.6 Write unit tests for schemas
- [ ] 1.7 Update ExecutionResponse interface (BREAKING: events → messages)
- [ ] 1.8 Export all types and schemas from SDK index

### 2: Claude Transformer Implementation

- [ ] 2.1 Create transformMessages function
- [ ] 2.2 Extract per-message usage (not aggregated)
- [ ] 2.3 Calculate total_tokens = input + output (no cache)
- [ ] 2.4 Include \_original field always
- [ ] 2.5 Filter to user/assistant messages only
- [ ] 2.6 Handle both user and assistant events
- [ ] 2.7 Write unit tests for transformer
- [ ] 2.8 Integrate into Claude parser
- [ ] 2.9 Export transformer publicly from SDK

### 3: Backend WebSocket Simplification

- [ ] 3.1 Update SessionStreamOutputData type (messages: StandardMessage[])
- [ ] 3.2 Import transformClaudeMessages from SDK
- [ ] 3.3 Update onOutput to transform incremental chunks
- [ ] 3.4 Forward StandardMessage[] to frontend
- [ ] 3.5 Update loadSession to use SDK transformer
- [ ] 3.6 Delete parseFormat files

### 4: Add Message Filtering Selector

- [ ] 4.1 Add selectFilteredMessages selector to sessionStore
- [ ] 4.2 Add isSystemMessage helper function to sessionStore
- [ ] 4.3 Export selector for use in components

### 5: Frontend Store Simplification

- [ ] 5.1 Delete updateStreamingMessage (lines 220-272)
- [ ] 5.2 Keep addMessage simple (just append to messages array)
- [ ] 5.3 Update loadSession to store raw messages (no filtering)
- [ ] 5.4 Remove agent.transformMessages calls

### 6: Frontend Hook Simplification

- [ ] 6.1 Update handleStreamOutput to process StandardMessage[] directly
- [ ] 6.2 Cast to SessionMessage and add isStreaming for assistant messages
- [ ] 6.3 Call addMessage to append messages
- [ ] 6.4 Remove agent.transformStreaming calls
- [ ] 6.5 Remove getAgent import

### 7: Inline Components & Delete Registry

- [ ] 7.1 Import UserMessage and AssistantMessage directly in ChatInterface
- [ ] 7.2 Import selectFilteredMessages selector from sessionStore
- [ ] 7.3 Use useSessionStore(selectFilteredMessages) to get filtered messages
- [ ] 7.4 Build tool results map in ChatInterface from filtered messages
- [ ] 7.4 Replace AgentMessageRenderer with direct rendering
- [ ] 7.5 Delete getAgent() call
- [ ] 7.6 Delete entire client/lib/agents/ directory
- [ ] 7.7 Delete updateStreamingMessage.test.ts

### 8: Type Alignment & Error Handling

- [ ] 8.1 Create SessionMessage that extends StandardMessage with isStreaming
- [ ] 8.2 Re-export StandardMessage and related types
- [ ] 8.3 Update WebSocket types
- [ ] 8.3 Search for all `isError` usage in codebase
- [ ] 8.4 Replace `message.isError` with `message.error` checks
- [ ] 8.5 Update error rendering components
- [ ] 8.6 Fix all type errors
- [ ] 8.7 Run pnpm check-types

### 9: Testing and Validation

- [ ] 9.1 Manual test: Load existing session
- [ ] 9.2 Manual test: Send new message, verify streaming
- [ ] 9.3 Manual test: Verify token usage displays
- [ ] 9.4 Manual test: Check error rendering (no isError flag)
- [ ] 9.5 Manual test: Verify \_original field in dev tools
- [ ] 9.6 Manual test: Test user message handling
- [ ] 9.7 Verify no console errors
- [ ] 9.8 Run pnpm build
- [ ] 9.9 Run pnpm test

### 10: Documentation

- [ ] 10.1 Update CLAUDE.md files with new architecture
- [ ] 10.2 Document StandardMessage schema
- [ ] 10.3 Document message flow (CLI → SDK → Backend → Frontend)
- [ ] 10.4 Add debugging guide using \_original field

## Acceptance Criteria

**Must Work:**

- [ ] Claude messages stream correctly with incremental StandardMessage[]
- [ ] Usage tokens display correctly (per-message extraction)
- [ ] Message deduplication works (no duplicate messages during streaming)
- [ ] Error messages render without isError flag (using error field)
- [ ] Existing sessions load correctly
- [ ] System messages filtered out
- [ ] TypeScript compilation succeeds
- [ ] No console errors during streaming
- [ ] \_original field available for debugging
- [ ] User messages handled correctly

**Should Not:**

- [ ] Cause performance degradation (should be faster - fewer transforms)
- [ ] Introduce memory leaks
- [ ] Lose message data
- [ ] Break structured output feature

**Code Reduction Achieved:**

- [ ] Deleted ~25 files
- [ ] Removed 3+ transformation layers
- [ ] Eliminated agent registry abstraction
- [ ] Fixed updateStreamingMessage bug

## Validation Commands

```bash
# SDK build and tests
cd packages/agent-cli-sdk
pnpm build && pnpm test

# Type checking
cd ../.. && pnpm check-types

# Web app build
cd apps/web && pnpm build

# Manual testing
cd apps/web && pnpm dev
# Test: Load session, send message, verify streaming
```

## Key Decisions Summary

1. **Skip ImageBlock** - Defer to future
2. **Remove isStreaming from SDK** - Frontend extends StandardMessage with isStreaming
3. **Remove isError** - Use `message.error` field instead (check if exists)
4. **Add error field** - Structured error details
5. **Delete transformStreaming** - Not needed with StandardMessage
6. **Delete transformMessages** - Replaced with filterSystemMessages util
7. **Delete updateStreamingMessage** - Try simpler approach first, add back if needed
8. **Delete agent registry** - Inline Claude components directly
9. **Incremental streaming** - Backend forwards StandardMessage[] chunks
10. **Per-message usage** - SDK extracts usage per message
11. **Cache token exclusion** - total_tokens = input + output only
12. **Rename standardizer → transformMessages** - Clearer naming

## Breaking Changes

- ❌ NO backward compatibility - refactor all at once
- `ExecutionResponse.events` → `ExecutionResponse.messages`
- WebSocket payload: `{ content: { events } }` → `{ messages: StandardMessage[] }`
- Apps consuming SDK must update to `response.messages`
- Frontend checks `message.error` instead of `message.isError`
- Existing JSONL files work unchanged (parsed with new transformer on load)
