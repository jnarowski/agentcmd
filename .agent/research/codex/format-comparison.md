# Codex Format Comparison - Quick Visual Guide

## Side-by-Side Comparison

### Simple Question: "what is 2+2?"

#### Streaming Format (--json)

```jsonl
{"type":"thread.started","thread_id":"019a2d7a-41c4-78b1-b7cc-a45d62a89cd5"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"**Providing simple answer**"}}
{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"4"}}
{"type":"turn.completed","usage":{"input_tokens":2946,"cached_input_tokens":0,"output_tokens":7}}
```

**Characteristics**:

- Clean, minimal structure
- No timestamps
- Direct event objects
- Reasoning in plaintext
- Usage data in turn.completed

#### Stored Format (~/.codex/sessions/)

```jsonl
{"timestamp":"2025-10-29T00:59:38.317Z","type":"session_meta","payload":{"id":"019a2d7a-41c4-78b1-b7cc-a45d62a89cd5","timestamp":"2025-10-29T00:59:38.308Z","cwd":"/private/tmp/codex-research-test","originator":"codex_exec","cli_version":"0.46.0","instructions":null,"source":"exec","git":{}}}
{"timestamp":"2025-10-29T00:59:38.317Z","type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"<environment_context>...</environment_context>"}]}}
{"timestamp":"2025-10-29T00:59:38.317Z","type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"what is 2+2? just give me the answer"}]}}
{"timestamp":"2025-10-29T00:59:38.317Z","type":"event_msg","payload":{"type":"user_message","message":"what is 2+2? just give me the answer","kind":"plain"}}
{"timestamp":"2025-10-29T00:59:38.317Z","type":"turn_context","payload":{"cwd":"/private/tmp/codex-research-test","approval_policy":"never","sandbox_policy":{"mode":"workspace-write"...},"model":"gpt-5-codex","effort":"high","summary":"auto"}}
{"timestamp":"2025-10-29T00:59:39.522Z","type":"event_msg","payload":{"type":"agent_reasoning","text":"**Providing simple answer**"}}
{"timestamp":"2025-10-29T00:59:39.644Z","type":"event_msg","payload":{"type":"agent_message","message":"4"}}
{"timestamp":"2025-10-29T00:59:39.656Z","type":"response_item","payload":{"type":"reasoning","summary":[{"type":"summary_text","text":"**Providing simple answer**"}],"content":null,"encrypted_content":"gAAAAABpAWb7..."}}
{"timestamp":"2025-10-29T00:59:39.656Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"4"}]}}
```

**Characteristics**:

- Every line has timestamp
- Wrapped in type/payload structure
- Full session metadata (cwd, version, git)
- Context information (model, policies)
- Reasoning content encrypted
- Dual representation (event_msg + response_item)
- Rate limit tracking

---

## Command Execution Example: "list files"

### Streaming Format

```jsonl
{"type":"thread.started","thread_id":"019a2d7a-6455-7170-a661-c6d8b94c630a"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"**Preparing to list files with bash shell**"}}
{"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"bash -lc ls","aggregated_output":"","status":"in_progress"}}
{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"bash -lc ls","aggregated_output":"file1.txt\nfile2.txt\n","exit_code":0,"status":"completed"}}
{"type":"item.completed","item":{"id":"item_2","type":"agent_message","text":"Files here: `file1.txt`, `file2.txt`."}}
{"type":"turn.completed","usage":{"input_tokens":6040,"cached_input_tokens":4992,"output_tokens":129}}
```

**Key Points**:

- Shows progress: item.started → item.completed
- Direct command/output in item
- Cached tokens visible (4992 cached!)

### Stored Format

```jsonl
{"timestamp":"2025-10-29T00:59:49.783Z","type":"response_item","payload":{"type":"function_call","name":"shell","arguments":"{\"command\":[\"bash\",\"-lc\",\"ls\"],\"workdir\":\"/private/tmp/codex-research-test\"}","call_id":"call_AnMStssFtufeBXJJ9HuJQeb0"}}
{"timestamp":"2025-10-29T00:59:49.783Z","type":"response_item","payload":{"type":"function_call_output","call_id":"call_AnMStssFtufeBXJJ9HuJQeb0","output":"{\"output\":\"file1.txt\\nfile2.txt\\n\",\"metadata\":{\"exit_code\":0,\"duration_seconds\":0.0}}"}}
```

**Key Points**:

- Separated into function_call + function_call_output
- Has call_id for matching
- Includes duration_seconds

---

## File Creation Example

### Streaming Format

```jsonl
{
  "type": "item.completed",
  "item": {
    "id": "item_1",
    "type": "file_change",
    "changes": [
      {
        "path": "/private/tmp/codex-research-test/hello.txt",
        "kind": "add"
      }
    ],
    "status": "completed"
  }
}
```

### Stored Format

```jsonl
{"timestamp":"2025-10-29T00:59:59.751Z","type":"response_item","payload":{"type":"custom_tool_call","status":"completed","call_id":"call_fnIi6MnTDYfAHIKJsyUyzkvr","name":"apply_patch","input":"*** Begin Patch\n*** Add File: hello.txt\n+Hello from Codex\n*** End Patch"}}
{"timestamp":"2025-10-29T00:59:59.751Z","type":"response_item","payload":{"type":"custom_tool_call_output","call_id":"call_fnIi6MnTDYfAHIKJsyUyzkvr","output":"{\"output\":\"Success. Updated the following files:\\nA hello.txt\\n\",\"metadata\":{\"exit_code\":0,\"duration_seconds\":0.0}}"}}
```

---

## Mapping Table

| Streaming Event                              | Stored Record(s)                                       | Notes                                                               |
| -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| `thread.started`                             | `session_meta`                                         | Streaming only has thread_id, stored has full context               |
| `turn.started`                               | `turn_context`                                         | Streaming is empty marker, stored has policies/model                |
| `item.completed` (reasoning)                 | `event_msg` + `response_item`                          | Stored has both plaintext (event_msg) and encrypted (response_item) |
| `item.completed` (agent_message)             | `event_msg` + `response_item`                          | Dual representation in stored                                       |
| `item.started/completed` (command_execution) | `response_item` (function_call + function_call_output) | Streaming combines, stored separates                                |
| `item.completed` (file_change)               | `response_item` (custom_tool_call + output)            | Different tool representation                                       |
| `turn.completed`                             | `event_msg` (token_count)                              | Stored adds rate limits                                             |

---

## Data Available ONLY in Streaming

1. `item.started` events (in-progress state)
2. Simplified structure (easier parsing)

## Data Available ONLY in Stored

1. Timestamps (precise timing)
2. Session metadata (cwd, cli_version, git info)
3. Turn context (model, approval_policy, sandbox_policy)
4. Encrypted reasoning content
5. Rate limit information
6. Environment context (shell, network access)
7. Function call IDs
8. Command duration metrics

---

## Unified Format Recommendation

```typescript
interface UnifiedCodexMessage {
  // Required
  type:
    | "thread.started"
    | "turn.started"
    | "item.started"
    | "item.completed"
    | "turn.completed";
  session_id: string;

  // Optional metadata
  timestamp?: string;

  // Event data
  item?: {
    id: string;
    type: "reasoning" | "agent_message" | "command_execution" | "file_change";
    status?: "in_progress" | "completed";

    // Content
    text?: string;
    command?: string;
    aggregated_output?: string;
    exit_code?: number;
    changes?: Array<{ path: string; kind: string }>;
  };

  usage?: {
    input_tokens: number;
    cached_input_tokens: number;
    output_tokens: number;
  };

  context?: {
    cwd?: string;
    model?: string;
    approval_policy?: string;
    sandbox_mode?: string;
  };
}
```

This unified format:

- Works for both streaming and stored sources
- Preserves essential information
- Allows optional enrichment (timestamps, context)
- Enables consistent processing regardless of source

---

## Parsing Strategy

```typescript
// For streaming
function parseStreamingLine(
  line: string,
  sessionContext: Context
): UnifiedCodexMessage {
  const event = JSON.parse(line);
  return {
    type: event.type,
    session_id: event.thread_id || sessionContext.session_id,
    timestamp: new Date().toISOString(), // Add client-side
    item: event.item,
    usage: event.usage,
    context: sessionContext,
  };
}

// For stored
function parseStoredLine(
  line: string,
  sessionContext: Context
): UnifiedCodexMessage[] {
  const record = JSON.parse(line);
  const messages: UnifiedCodexMessage[] = [];

  // Map based on record.type and record.payload.type
  if (record.type === "event_msg" && record.payload.type === "agent_message") {
    messages.push({
      type: "item.completed",
      session_id: sessionContext.session_id,
      timestamp: record.timestamp,
      item: {
        id: generateItemId(),
        type: "agent_message",
        text: record.payload.message,
        status: "completed",
      },
    });
  }

  return messages;
}
```

---

## Testing Commands Used

```bash
# Create test environment
mkdir /tmp/codex-research-test && cd /tmp/codex-research-test
git init

# Test 1: Simple math
codex exec "what is 2+2? just give me the answer" --json --full-auto > stream-output-1.jsonl

# Test 2: File operations
codex exec "list the files in this directory" --json --full-auto > stream-output-2.jsonl

# Test 3: File creation
codex exec "create a new file called hello.txt with the text 'Hello from Codex'" --json --full-auto > stream-output-3.jsonl

# Test 4: File reading
codex exec "read the test.js file and tell me what it does" --json --full-auto > stream-output-4.jsonl

# Stored sessions automatically saved to:
~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
```

---

_This comparison is based on hands-on testing with Codex CLI 0.46.0 on October 28, 2025_
