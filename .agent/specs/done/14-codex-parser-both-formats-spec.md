# Codex Parser - Support Both Streaming and Persisted Formats

## Overview

Update the Codex parser to handle both event formats output by the Codex CLI:
1. **Streaming format** (`item.completed`) - Used during CLI execution
2. **Persisted format** (`response_item`, `event_msg`) - Saved in session files

Both formats must be transformed into Claude-compatible `UnifiedMessage` structures.

---

## Problem Statement

### Current State
- Codex parser only handles `item.completed` events (streaming format)
- Session files contain `response_item` and `event_msg` events (persisted format)
- Loading messages from saved sessions returns empty array (parser returns `null` for all events)
- Real-time streaming works, but page reload shows no message history

### Root Cause
Codex CLI outputs **two different JSONL formats**:
- **During execution** (with `--json` flag): Streams `item.completed` events
- **In saved sessions** (`~/.codex/sessions/`): Persists `response_item` and `event_msg` events

The parser was built for streaming format only.

---

## Event Format Inventory

### Streaming Format (item.completed)
Output during `codex exec --json`:

```json
{
  "type": "item.completed",
  "item": {
    "id": "item_1",
    "type": "command_execution",
    "command": "bash -lc ls",
    "aggregated_output": "file1\nfile2\n...",
    "exit_code": 0,
    "status": "completed"
  }
}
```

**Item types:**
- `reasoning` - Thinking blocks
- `agent_message` - Assistant text
- `command_execution` - Shell commands
- `file_change` - File modifications

### Persisted Format (response_item + event_msg)
Saved in `~/.codex/sessions/YYYY/MM/DD/*.jsonl`:

**response_item events** (177 per session avg):
```json
// User/Assistant messages
{"timestamp":"2025-10-28T22:42:36.506Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Hello"}]}}

// Reasoning (thinking)
{"timestamp":"2025-10-28T22:42:36.506Z","type":"response_item","payload":{"type":"reasoning","summary":[{"type":"summary_text","text":"Planning..."}],"content":null,"encrypted_content":"..."}}

// Function call (tool use)
{"timestamp":"2025-10-28T22:42:23.022Z","type":"response_item","payload":{"type":"function_call","name":"shell","arguments":"{\"command\":[\"zsh\",\"-lc\",\"ls\"],\"workdir\":\".\"}","call_id":"call_123"}}

// Function output (tool result)
{"timestamp":"2025-10-28T22:42:23.022Z","type":"response_item","payload":{"type":"function_call_output","call_id":"call_123","output":"{\"output\":\"file1\\nfile2\",\"metadata\":{\"exit_code\":0,\"duration_seconds\":0.1}}"}}
```

**event_msg events** (118 per session avg):
```json
// Agent message
{"timestamp":"2025-10-28T22:42:36.492Z","type":"event_msg","payload":{"type":"agent_message","message":"I'm Codex"}}

// Agent reasoning
{"timestamp":"2025-10-28T22:42:36.244Z","type":"event_msg","payload":{"type":"agent_reasoning","text":"**Planning next steps**"}}

// User message
{"timestamp":"2025-10-28T22:42:34.380Z","type":"event_msg","payload":{"type":"user_message","message":"what's your name?","kind":"plain"}}

// Token count (ignore)
{"timestamp":"2025-10-28T22:42:36.505Z","type":"event_msg","payload":{"type":"token_count","info":{...},"rate_limits":{...}}}
```

**Metadata events** (ignore):
- `session_meta` - Session initialization (1 per session)
- `turn_context` - Turn configuration (59 per session avg)

---

## Required Transformations

### 1. Tool Name Mapping (Codex → Claude)
```
"shell" → "Bash"
(Add more as discovered)
```

### 2. Function Call Input Transformation
**Codex format:**
```json
{
  "command": ["zsh", "-lc", "ls"],
  "workdir": ".",
  "timeout_ms": 120000
}
```

**Claude format:**
```json
{
  "command": "ls"
}
```

**Transformation:**
- Extract actual command from array (last element)
- Remove `workdir`, `timeout_ms` (Codex-specific)

### 3. Function Output Extraction
**Codex format (JSON string):**
```json
{
  "output": "file1\nfile2\n",
  "metadata": {
    "exit_code": 0,
    "duration_seconds": 0.1
  }
}
```

**Claude format:**
```typescript
{
  content: "file1\nfile2\n",
  is_error: false  // exit_code !== 0
}
```

**Transformation:**
- Parse JSON wrapper
- Extract `output` field as content
- Map `exit_code !== 0` to `is_error`

---

## Implementation Plan

### Phase 1: Update Types

**File:** `packages/agent-cli-sdk/src/codex/types.ts`

Add persisted format types:

```typescript
export type CodexEvent =
  // Streaming format (existing)
  | ItemCompletedEvent
  | ThreadStartedEvent
  | TurnStartedEvent
  | TurnCompletedEvent
  | TurnFailedEvent
  | ErrorEvent
  // Persisted format (new)
  | ResponseItemEvent
  | EventMessageEvent
  | SessionMetaEvent
  | TurnContextEvent;

export interface ResponseItemEvent {
  timestamp: string;
  type: 'response_item';
  payload:
    | ResponseItemMessage
    | ResponseItemReasoning
    | ResponseItemFunctionCall
    | ResponseItemFunctionCallOutput;
}

export interface ResponseItemMessage {
  type: 'message';
  role: 'user' | 'assistant';
  content: Array<{
    type: 'input_text' | 'output_text';
    text: string;
  }>;
}

export interface ResponseItemReasoning {
  type: 'reasoning';
  summary: Array<{
    type: 'summary_text';
    text: string;
  }>;
  content: null;
  encrypted_content: string;
}

export interface ResponseItemFunctionCall {
  type: 'function_call';
  name: string;
  arguments: string; // JSON string
  call_id: string;
}

export interface ResponseItemFunctionCallOutput {
  type: 'function_call_output';
  call_id: string;
  output: string; // JSON string: {output, metadata}
}

export interface EventMessageEvent {
  timestamp: string;
  type: 'event_msg';
  payload:
    | { type: 'agent_message'; message: string }
    | { type: 'agent_reasoning'; text: string }
    | { type: 'user_message'; message: string; kind: string }
    | { type: 'token_count'; info: unknown; rate_limits: unknown };
}

export interface SessionMetaEvent {
  timestamp: string;
  type: 'session_meta';
  payload: {
    id: string;
    timestamp: string;
    cwd: string;
    originator: string;
    cli_version: string;
    instructions: string | null;
    git?: {
      commit_hash: string;
      branch: string;
      repository_url: string;
    };
  };
}

export interface TurnContextEvent {
  timestamp: string;
  type: 'turn_context';
  payload: {
    cwd: string;
    approval_policy: string;
    sandbox_policy: { mode: string };
    model: string;
    effort: string;
    summary: string;
  };
}
```

### Phase 2: Update Parser

**File:** `packages/agent-cli-sdk/src/codex/parse.ts`

Add clear section comments and new transformers:

```typescript
/**
 * Parse a single JSONL line from Codex CLI into UnifiedMessage format.
 *
 * Codex outputs TWO DIFFERENT FORMATS:
 *
 * 1. STREAMING FORMAT (item.completed)
 *    - Output during CLI execution with --json flag
 *    - Used by execute() function for real-time message streaming
 *
 * 2. PERSISTED FORMAT (response_item, event_msg)
 *    - Saved in session files (~/.codex/sessions/YYYY/MM/DD/*.jsonl)
 *    - Used by loadSession() function for loading message history
 *
 * Both formats are parsed into the same UnifiedMessage structure.
 *
 * @param jsonlLine - Raw JSONL string from Codex CLI or session file
 * @returns UnifiedMessage if parseable, null for metadata/unparseable events
 */
export function parse(jsonlLine: string): UnifiedMessage | null {
  try {
    const event: CodexEvent = JSON.parse(jsonlLine);

    // ============================================================================
    // STREAMING FORMAT - item.completed
    // ============================================================================
    // These events stream during CLI execution (execute() function)
    if (event.type === 'item.completed') {
      return transformItemCompleted(event);
    }

    // ============================================================================
    // PERSISTED FORMAT - response_item
    // ============================================================================
    // These events are saved in session files (loadSession() function)
    // Contains: messages, reasoning, function_call, function_call_output
    if (event.type === 'response_item') {
      return transformResponseItem(event);
    }

    // ============================================================================
    // PERSISTED FORMAT - event_msg
    // ============================================================================
    // Supplementary events in session files
    // Contains: agent_message, agent_reasoning, user_message, token_count
    if (event.type === 'event_msg') {
      return transformEventMessage(event);
    }

    // ============================================================================
    // METADATA EVENTS (not parsed into messages)
    // ============================================================================
    // - session_meta: Session initialization metadata
    // - turn_context: Turn configuration metadata
    // - thread.started, turn.started, turn.completed: Control flow events
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// STREAMING FORMAT TRANSFORMERS
// ============================================================================

// Keep existing transformItemCompleted implementation

// ============================================================================
// PERSISTED FORMAT TRANSFORMERS - response_item
// ============================================================================

function transformResponseItem(event: ResponseItemEvent): UnifiedMessage | null {
  const { payload, timestamp } = event;

  // Messages (user/assistant text)
  if (payload.type === 'message') {
    const content: UnifiedContent[] = payload.content.map(item => ({
      type: 'text' as const,
      text: item.text,
    }));

    return {
      id: generateId(timestamp),
      role: payload.role,
      content,
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // Reasoning (thinking blocks)
  if (payload.type === 'reasoning') {
    const thinkingText = payload.summary.map(s => s.text).join('\n');

    return {
      id: generateId(timestamp),
      role: 'assistant',
      content: [{ type: 'thinking', thinking: thinkingText }],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // Function calls (tool_use) - TRANSFORM TO CLAUDE FORMAT
  if (payload.type === 'function_call') {
    // Parse arguments JSON string
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(payload.arguments);
    } catch {
      parsedArgs = { raw: payload.arguments };
    }

    // Transform Codex tool names to Claude tool names
    const claudeToolName = mapCodexToolToClaude(payload.name);

    // Transform input structure based on tool
    const input = transformToolInput(payload.name, parsedArgs);

    return {
      id: payload.call_id,
      role: 'assistant',
      content: [{
        type: 'tool_use',
        id: payload.call_id,
        name: claudeToolName,
        input,
      }],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // Function outputs (tool_result) - EXTRACT FROM JSON WRAPPER
  if (payload.type === 'function_call_output') {
    // Parse output JSON string: {"output": "...", "metadata": {...}}
    let actualOutput: string;
    let exitCode = 0;

    try {
      const parsed = JSON.parse(payload.output);
      actualOutput = parsed.output || payload.output;
      exitCode = parsed.metadata?.exit_code ?? 0;
    } catch {
      // If not JSON, use raw output
      actualOutput = payload.output;
    }

    return {
      id: generateId(timestamp),
      role: 'assistant',
      content: [{
        type: 'tool_result',
        tool_use_id: payload.call_id,
        content: actualOutput,
        is_error: exitCode !== 0,
      }],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  return null;
}

// ============================================================================
// PERSISTED FORMAT TRANSFORMERS - event_msg
// ============================================================================

function transformEventMessage(event: EventMessageEvent): UnifiedMessage | null {
  const { payload, timestamp } = event;

  // Agent messages (assistant text)
  if (payload.type === 'agent_message') {
    return {
      id: generateId(timestamp),
      role: 'assistant',
      content: [{ type: 'text', text: payload.message }],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // Agent reasoning (thinking summaries)
  if (payload.type === 'agent_reasoning') {
    return {
      id: generateId(timestamp),
      role: 'assistant',
      content: [{ type: 'thinking', thinking: payload.text }],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // User messages
  if (payload.type === 'user_message') {
    return {
      id: generateId(timestamp),
      role: 'user',
      content: [{ type: 'text', text: payload.message }],
      timestamp: new Date(timestamp).getTime(),
      tool: 'codex',
      _original: event,
    };
  }

  // Ignore: token_count (metadata only)
  return null;
}

// ============================================================================
// TOOL TRANSFORMATION HELPERS
// ============================================================================

/**
 * Map Codex tool names to Claude tool names
 */
function mapCodexToolToClaude(codexToolName: string): string {
  const mapping: Record<string, string> = {
    'shell': 'Bash',
    // Add more mappings as discovered:
    // 'read_file': 'Read',
    // 'write_file': 'Write',
    // 'edit_file': 'Edit',
  };

  return mapping[codexToolName] || codexToolName;
}

/**
 * Transform Codex tool input to Claude tool input format
 */
function transformToolInput(
  codexToolName: string,
  codexInput: Record<string, unknown>
): Record<string, unknown> {
  // Shell/Bash transformation
  if (codexToolName === 'shell') {
    // Codex format: {"command": ["zsh", "-lc", "ls"], "workdir": ".", "timeout_ms": 120000}
    // Claude format: {"command": "ls"}

    const command = codexInput.command;

    if (Array.isArray(command)) {
      // Extract actual command from array format
      // ["zsh", "-lc", "ls"] → "ls"
      const actualCommand = command[command.length - 1];
      return { command: actualCommand };
    }

    return { command: String(command) };
  }

  // Default: pass through
  return codexInput;
}

/**
 * Generate stable ID from timestamp
 */
function generateId(timestamp: string): string {
  const hash = simpleHash(timestamp + Math.random());
  return `msg_${hash}`;
}
```

### Phase 3: Add Tests

**File:** `packages/agent-cli-sdk/src/codex/parse.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { parse } from './parse.js';

describe('Codex Parser - Streaming Format', () => {
  it('parses item.completed with command_execution', () => {
    const line = '{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"ls","aggregated_output":"file1\\nfile2","exit_code":0}}';
    const result = parse(line);

    expect(result).toBeTruthy();
    expect(result?.role).toBe('assistant');
    expect(result?.content).toHaveLength(2); // tool_use + tool_result
    expect(result?.content[0]).toMatchObject({ type: 'tool_use', name: 'Bash' });
  });
});

describe('Codex Parser - Persisted Format', () => {
  describe('response_item events', () => {
    it('parses message (user)', () => {
      const line = '{"timestamp":"2025-10-28T22:42:36.506Z","type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"Hello"}]}}';
      const result = parse(line);

      expect(result?.role).toBe('user');
      expect(result?.content[0]).toMatchObject({ type: 'text', text: 'Hello' });
    });

    it('parses message (assistant)', () => {
      const line = '{"timestamp":"2025-10-28T22:42:36.506Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Hello"}]}}';
      const result = parse(line);

      expect(result?.role).toBe('assistant');
      expect(result?.content[0]).toMatchObject({ type: 'text', text: 'Hello' });
    });

    it('parses reasoning', () => {
      const line = '{"timestamp":"2025-10-28T22:42:36.506Z","type":"response_item","payload":{"type":"reasoning","summary":[{"type":"summary_text","text":"Planning..."}],"content":null,"encrypted_content":"..."}}';
      const result = parse(line);

      expect(result?.content[0]).toMatchObject({ type: 'thinking', thinking: 'Planning...' });
    });

    it('transforms shell function_call to Bash tool_use', () => {
      const line = '{"timestamp":"2025-10-28T22:42:23.022Z","type":"response_item","payload":{"type":"function_call","name":"shell","arguments":"{\\"command\\":[\\"zsh\\",\\"-lc\\",\\"ls\\"],\\"workdir\\":\\".\\"}","call_id":"call_123"}}';
      const result = parse(line);

      expect(result?.content[0]).toMatchObject({
        type: 'tool_use',
        name: 'Bash', // Transformed from "shell"
        input: { command: 'ls' }, // Extracted from array
      });
    });

    it('extracts output and exit_code from function_call_output', () => {
      const line = '{"timestamp":"2025-10-28T22:42:23.022Z","type":"response_item","payload":{"type":"function_call_output","call_id":"call_123","output":"{\\"output\\":\\"file1\\\\nfile2\\",\\"metadata\\":{\\"exit_code\\":0,\\"duration_seconds\\":0.1}}"}}';
      const result = parse(line);

      expect(result?.content[0]).toMatchObject({
        type: 'tool_result',
        tool_use_id: 'call_123',
        content: 'file1\nfile2', // Extracted from JSON wrapper
        is_error: false, // exit_code === 0
      });
    });

    it('detects errors from non-zero exit_code', () => {
      const line = '{"timestamp":"2025-10-28T22:42:23.022Z","type":"response_item","payload":{"type":"function_call_output","call_id":"call_123","output":"{\\"output\\":\\"error\\",\\"metadata\\":{\\"exit_code\\":1}}"}}';
      const result = parse(line);

      expect(result?.content[0]).toMatchObject({
        is_error: true, // exit_code !== 0
      });
    });
  });

  describe('event_msg events', () => {
    it('parses agent_message', () => {
      const line = '{"timestamp":"2025-10-28T22:42:36.492Z","type":"event_msg","payload":{"type":"agent_message","message":"I am Codex"}}';
      const result = parse(line);

      expect(result?.content[0]).toMatchObject({ type: 'text', text: 'I am Codex' });
    });

    it('parses agent_reasoning', () => {
      const line = '{"timestamp":"2025-10-28T22:42:36.244Z","type":"event_msg","payload":{"type":"agent_reasoning","text":"**Planning**"}}';
      const result = parse(line);

      expect(result?.content[0]).toMatchObject({ type: 'thinking', thinking: '**Planning**' });
    });

    it('parses user_message', () => {
      const line = '{"timestamp":"2025-10-28T22:42:34.380Z","type":"event_msg","payload":{"type":"user_message","message":"Hello","kind":"plain"}}';
      const result = parse(line);

      expect(result?.role).toBe('user');
      expect(result?.content[0]).toMatchObject({ type: 'text', text: 'Hello' });
    });

    it('returns null for token_count', () => {
      const line = '{"timestamp":"2025-10-28T22:42:36.505Z","type":"event_msg","payload":{"type":"token_count","info":{}}}';
      const result = parse(line);

      expect(result).toBeNull();
    });
  });

  describe('metadata events', () => {
    it('returns null for session_meta', () => {
      const line = '{"timestamp":"2025-10-28T22:42:34.380Z","type":"session_meta","payload":{"id":"123"}}';
      const result = parse(line);

      expect(result).toBeNull();
    });

    it('returns null for turn_context', () => {
      const line = '{"timestamp":"2025-10-28T22:42:34.380Z","type":"turn_context","payload":{"cwd":"."}}';
      const result = parse(line);

      expect(result).toBeNull();
    });
  });
});
```

---

## Testing Strategy

### Unit Tests
- Test each event type transformation individually
- Test Codex → Claude tool name mapping
- Test input/output format transformations
- Test error handling (malformed JSON, missing fields)

### Integration Tests
- Load actual session file from `tests/fixtures/codex/sessions/`
- Verify all messages parse correctly
- Compare message count against expected count
- Verify no duplicate messages (both event_msg and response_item may contain same content)

### E2E Tests
- Test streaming during execution (already working)
- Test loading from session file (currently broken, should work after fix)
- Test both flows produce identical UnifiedMessage structures

---

## Success Criteria

✅ **Streaming format works** - Real-time messages appear during execution
✅ **Persisted format works** - Messages load correctly from session files on page reload
✅ **Claude compatibility** - Tool names and formats match Claude conventions
✅ **Type safety** - All event types properly typed with no `any`
✅ **Clear documentation** - Comments explain what each section handles
✅ **Comprehensive tests** - All event types covered with unit tests
✅ **No web app changes** - SDK handles both formats transparently

---

## Potential Issues & Solutions

### Issue: Duplicate Messages
Both `event_msg` and `response_item` may contain the same content (e.g., agent_message appears in both).

**Solution:** Deduplicate based on timestamp + content hash, or prioritize `response_item` over `event_msg`.

### Issue: Missing Tool Mappings
More Codex tool names may need mapping beyond `shell → Bash`.

**Solution:** Add mappings incrementally as discovered. Default to pass-through for unknown tools.

### Issue: Complex Argument Structures
Some tools may have complex nested argument structures requiring custom transformations.

**Solution:** Add tool-specific transformation logic in `transformToolInput()` function.

---

## Files to Modify

1. `packages/agent-cli-sdk/src/codex/types.ts` - Add persisted format types
2. `packages/agent-cli-sdk/src/codex/parse.ts` - Add transformers for both formats
3. `packages/agent-cli-sdk/src/codex/parse.test.ts` - Add comprehensive tests

## Files to Reference

- `packages/agent-cli-sdk/tests/fixtures/codex/full/*.jsonl` - Real session files
- `packages/agent-cli-sdk/tests/fixtures/codex/individual/*.jsonl` - Individual event examples
- User's session: `~/.codex/sessions/2025/10/28/rollout-2025-10-28T16-42-34-019a2cfc-c4f3-7423-bd24-8c454f4b8d58.jsonl`
