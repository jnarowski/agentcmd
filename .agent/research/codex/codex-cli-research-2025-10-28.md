# Codex CLI Research Report

## Executive Summary

This report details hands-on research conducted on OpenAI's Codex CLI (version 0.46.0) to understand:

1. The difference between streaming data (during execution) and stored session data
2. Format compatibility and unification potential
3. Codex capabilities and features

**Key Finding**: Codex uses **two distinct but related formats**:

- **Streaming format**: Simplified, real-time event stream (JSONL with event types)
- **Stored session format**: Comprehensive, archival format (JSONL with timestamps and encrypted content)

These formats can be unified with proper mapping logic.

---

## 1. Installation & Version Information

**Binary Location**: `/opt/homebrew/bin/codex`
**Version**: `codex-cli 0.46.0`
**Configuration**: `~/.codex/config.toml`
**Sessions Directory**: `~/.codex/sessions/YYYY/MM/DD/`

---

## 2. Streaming Output Format (--json flag)

### Format Structure

When running `codex exec --json`, output is streamed as JSONL with simplified event structure:

```json
{"type":"thread.started","thread_id":"<uuid>"}
{"type":"turn.started"}
{"type":"item.completed","item":{...}}
{"type":"turn.completed","usage":{...}}
```

### Event Types in Streaming Format

#### 2.1 thread.started

```json
{
  "type": "thread.started",
  "thread_id": "019a2d7a-41c4-78b1-b7cc-a45d62a89cd5"
}
```

- **Purpose**: Marks start of new session
- **Fields**:
  - `type`: Always "thread.started"
  - `thread_id`: UUID identifier (matches stored session)

#### 2.2 turn.started

```json
{
  "type": "turn.started"
}
```

- **Purpose**: Marks beginning of agent turn (can be multiple per session)
- **Fields**: None (simple marker)

#### 2.3 item.started

```json
{
  "type": "item.started",
  "item": {
    "id": "item_1",
    "type": "command_execution",
    "command": "bash -lc ls",
    "aggregated_output": "",
    "status": "in_progress"
  }
}
```

- **Purpose**: Command/operation begins executing
- **Fields**:
  - `id`: Item identifier (e.g., "item_0", "item_1")
  - `type`: Item type (see Item Types below)
  - `status`: "in_progress"
  - Additional fields based on type

#### 2.4 item.completed

```json
{
  "type": "item.completed",
  "item": {
    "id": "item_1",
    "type": "command_execution",
    "command": "bash -lc ls",
    "aggregated_output": "file1.txt\nfile2.txt\n",
    "exit_code": 0,
    "status": "completed"
  }
}
```

- **Purpose**: Command/operation finished
- **Fields**: Same as item.started plus:
  - `status`: "completed"
  - `exit_code`: For command executions
  - `aggregated_output`: Full command output

#### 2.5 turn.completed

```json
{
  "type": "turn.completed",
  "usage": {
    "input_tokens": 2946,
    "cached_input_tokens": 0,
    "output_tokens": 7
  }
}
```

- **Purpose**: Agent turn finished
- **Fields**:
  - `usage`: Token usage statistics
    - `input_tokens`: Total input tokens
    - `cached_input_tokens`: Cached tokens (cost savings)
    - `output_tokens`: Generated tokens

### Item Types in Streaming Format

#### reasoning

Agent's internal thought process:

```json
{
  "id": "item_0",
  "type": "reasoning",
  "text": "**Providing simple answer**"
}
```

#### agent_message

Agent's response to user:

```json
{
  "id": "item_1",
  "type": "agent_message",
  "text": "4"
}
```

#### command_execution

Shell command execution:

```json
{
  "id": "item_1",
  "type": "command_execution",
  "command": "bash -lc ls",
  "aggregated_output": "file1.txt\nfile2.txt\n",
  "exit_code": 0,
  "status": "completed"
}
```

#### file_change

File modification operations:

```json
{
  "id": "item_1",
  "type": "file_change",
  "changes": [
    {
      "path": "/path/to/file.txt",
      "kind": "add"
    }
  ],
  "status": "completed"
}
```

### Real Examples from Testing

**Example 1: Simple Math Question**

```
Input: "what is 2+2? just give me the answer"
Output:
{"type":"thread.started","thread_id":"019a2d7a-41c4-78b1-b7cc-a45d62a89cd5"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"**Providing simple answer**"}}
{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"4"}}
{"type":"turn.completed","usage":{"input_tokens":2946,"cached_input_tokens":0,"output_tokens":7}}
```

**Example 2: File Listing**

```
Input: "list the files in this directory"
Output:
{"type":"thread.started","thread_id":"019a2d7a-6455-7170-a661-c6d8b94c630a"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"**Preparing to list files with bash shell**"}}
{"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"bash -lc ls","aggregated_output":"","status":"in_progress"}}
{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"bash -lc ls","aggregated_output":"stream-output-1.jsonl\nstream-output-2.jsonl\ntest.js\n","exit_code":0,"status":"completed"}}
{"type":"item.completed","item":{"id":"item_2","type":"agent_message","text":"Files here: `stream-output-1.jsonl`, `stream-output-2.jsonl`, `test.js`."}}
{"type":"turn.completed","usage":{"input_tokens":6040,"cached_input_tokens":4992,"output_tokens":129}}
```

**Example 3: File Creation**

```
Input: "create a new file called hello.txt with the text 'Hello from Codex'"
Output:
{"type":"thread.started","thread_id":"019a2d7a-8e1c-7111-b1a6-8cec551a55a0"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"**Creating new file with patch**"}}
{"type":"item.completed","item":{"id":"item_1","type":"file_change","changes":[{"path":"/private/tmp/codex-research-test/hello.txt","kind":"add"}],"status":"completed"}}
{"type":"item.completed","item":{"id":"item_2","type":"agent_message","text":"Created `hello.txt` containing `Hello from Codex`."}}
{"type":"turn.completed","usage":{"input_tokens":6008,"cached_input_tokens":4096,"output_tokens":51}}
```

---

## 3. Stored Session Format

### File Structure

Sessions are stored as JSONL files at:
`~/.codex/sessions/YYYY/MM/DD/rollout-YYYY-MM-DDTHH-MM-SS-<thread_id>.jsonl`

Example filename:
`rollout-2025-10-28T18-59-38-019a2d7a-41c4-78b1-b7cc-a45d62a89cd5.jsonl`

### Record Types in Stored Format

#### 3.1 session_meta

First line of every session file:

```json
{
  "timestamp": "2025-10-29T00:59:38.317Z",
  "type": "session_meta",
  "payload": {
    "id": "019a2d7a-41c4-78b1-b7cc-a45d62a89cd5",
    "timestamp": "2025-10-29T00:59:38.308Z",
    "cwd": "/private/tmp/codex-research-test",
    "originator": "codex_exec",
    "cli_version": "0.46.0",
    "instructions": null,
    "source": "exec",
    "git": {}
  }
}
```

**Key Fields**:

- `id`: Session UUID (matches thread_id from streaming)
- `cwd`: Working directory
- `originator`: How session was started ("codex_exec", etc.)
- `cli_version`: Codex version
- `source`: Session source ("exec", "interactive", etc.)
- `git`: Git repository info (if in repo)

#### 3.2 response_item

Represents conversation messages and tool calls:

```json
{
  "timestamp": "2025-10-29T00:59:38.317Z",
  "type": "response_item",
  "payload": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "what is 2+2? just give me the answer"
      }
    ]
  }
}
```

**Payload Types**:

- `message`: User or assistant messages
- `reasoning`: Agent's thought process (with encrypted_content)
- `function_call`: Tool invocation
- `function_call_output`: Tool result
- `custom_tool_call`: File operations (apply_patch, etc.)
- `custom_tool_call_output`: Custom tool results

**Important**: Reasoning content is **encrypted** in stored sessions:

```json
{
  "type": "response_item",
  "payload": {
    "type": "reasoning",
    "summary": [
      { "type": "summary_text", "text": "**Providing simple answer**" }
    ],
    "content": null,
    "encrypted_content": "gAAAAABpAWb7tWR9GyUhlS7YvxvYDD_b-xlYv..."
  }
}
```

#### 3.3 event_msg

Represents streaming events (mirrors some streaming output):

```json
{
  "timestamp": "2025-10-29T00:59:39.522Z",
  "type": "event_msg",
  "payload": {
    "type": "agent_reasoning",
    "text": "**Providing simple answer**"
  }
}
```

**Event Payload Types**:

- `user_message`: User's input
- `agent_reasoning`: Agent's thought process
- `agent_message`: Agent's response
- `token_count`: Token usage and rate limits

#### 3.4 turn_context

Environment and execution context:

```json
{
  "timestamp": "2025-10-29T00:59:38.317Z",
  "type": "turn_context",
  "payload": {
    "cwd": "/private/tmp/codex-research-test",
    "approval_policy": "never",
    "sandbox_policy": {
      "mode": "workspace-write",
      "network_access": false,
      "exclude_tmpdir_env_var": false,
      "exclude_slash_tmp": false
    },
    "model": "gpt-5-codex",
    "effort": "high",
    "summary": "auto"
  }
}
```

### Full Stored Session Example

Session: "what is 2+2? just give me the answer"

```jsonl
{"timestamp":"2025-10-29T00:59:38.317Z","type":"session_meta","payload":{"id":"019a2d7a-41c4-78b1-b7cc-a45d62a89cd5","timestamp":"2025-10-29T00:59:38.308Z","cwd":"/private/tmp/codex-research-test","originator":"codex_exec","cli_version":"0.46.0","instructions":null,"source":"exec","git":{}}}
{"timestamp":"2025-10-29T00:59:38.317Z","type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"<environment_context>\n  <cwd>/private/tmp/codex-research-test</cwd>\n  <approval_policy>never</approval_policy>\n  <sandbox_mode>workspace-write</sandbox_mode>\n  <network_access>restricted</network_access>\n  <shell>zsh</shell>\n</environment_context>"}]}}
{"timestamp":"2025-10-29T00:59:38.317Z","type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"what is 2+2? just give me the answer"}]}}
{"timestamp":"2025-10-29T00:59:38.317Z","type":"event_msg","payload":{"type":"user_message","message":"what is 2+2? just give me the answer","kind":"plain"}}
{"timestamp":"2025-10-29T00:59:38.317Z","type":"turn_context","payload":{"cwd":"/private/tmp/codex-research-test","approval_policy":"never","sandbox_policy":{"mode":"workspace-write","network_access":false,"exclude_tmpdir_env_var":false,"exclude_slash_tmp":false},"model":"gpt-5-codex","effort":"high","summary":"auto"}}
{"timestamp":"2025-10-29T00:59:38.856Z","type":"event_msg","payload":{"type":"token_count","info":null,"rate_limits":{"primary":{"used_percent":0.0,"window_minutes":299,"resets_in_seconds":17388},"secondary":{"used_percent":7.0,"window_minutes":10079,"resets_in_seconds":491245}}}}
{"timestamp":"2025-10-29T00:59:39.522Z","type":"event_msg","payload":{"type":"agent_reasoning","text":"**Providing simple answer**"}}
{"timestamp":"2025-10-29T00:59:39.644Z","type":"event_msg","payload":{"type":"agent_message","message":"4"}}
{"timestamp":"2025-10-29T00:59:39.656Z","type":"event_msg","payload":{"type":"token_count","info":{...},"rate_limits":{...}}}
{"timestamp":"2025-10-29T00:59:39.656Z","type":"response_item","payload":{"type":"reasoning","summary":[{"type":"summary_text","text":"**Providing simple answer**"}],"content":null,"encrypted_content":"gAAAAABpAWb7..."}}
{"timestamp":"2025-10-29T00:59:39.656Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"4"}]}}
```

---

## 4. Format Comparison: Streaming vs Stored

### Structural Differences

| Aspect           | Streaming Format     | Stored Format                             |
| ---------------- | -------------------- | ----------------------------------------- |
| **Timestamps**   | No timestamps        | Every line has ISO timestamp              |
| **Envelope**     | Direct event objects | Wrapped in type/payload structure         |
| **Encryption**   | No encryption        | Reasoning content encrypted               |
| **Session Info** | Only thread_id       | Full session_meta with cwd, version, etc. |
| **Context**      | Not included         | turn_context records                      |
| **Rate Limits**  | Not included         | token_count events with rate limits       |
| **Format**       | Simplified events    | Comprehensive archival                    |

### Field Mapping

#### Streaming → Stored Mapping

1. **thread.started** → **session_meta**
   - `thread_id` → `payload.id`
   - Additional stored fields: cwd, cli_version, originator, git

2. **turn.started** → **turn_context**
   - Streaming has no context
   - Stored includes: model, approval_policy, sandbox_policy

3. **item.completed (reasoning)** → **event_msg (agent_reasoning)** + **response_item (reasoning)**
   - Streaming: `item.text` (plaintext)
   - Stored: `event_msg.payload.text` (plaintext) + `response_item.payload.encrypted_content`

4. **item.completed (agent_message)** → **event_msg (agent_message)** + **response_item (message)**
   - Streaming: `item.text`
   - Stored: `event_msg.payload.message` + `response_item.payload.content[].text`

5. **item.started/completed (command_execution)** → **response_item (function_call)** + **response_item (function_call_output)**
   - Streaming: Direct command/output in item
   - Stored: Separated into call and output records

6. **turn.completed** → **event_msg (token_count)**
   - Streaming: `usage` object
   - Stored: `event_msg.payload.info.total_token_usage` + rate_limits

### What's in Streaming but NOT in Stored

- **item.started events**: Stored format doesn't track "in_progress" state
- **Simplified structure**: Easier to parse in real-time

### What's in Stored but NOT in Streaming

- **Timestamps**: Precise timing of every event
- **session_meta**: Full session context (cwd, version, git info)
- **turn_context**: Environment and policy settings
- **Encrypted reasoning**: Full reasoning preserved but encrypted
- **Rate limit info**: API usage and limits
- **Environment context**: Shell, network access, sandbox mode
- **call_id**: Unique identifiers for function calls

---

## 5. Codex Capabilities Summary

### Command Structure

```bash
codex [OPTIONS] [PROMPT]              # Interactive mode
codex exec [OPTIONS] [PROMPT]         # Non-interactive mode
codex resume [SESSION_ID]             # Resume session
codex apply                           # Apply diff to local git
codex cloud                           # Browse cloud tasks
```

### Key Features

#### 5.1 Execution Modes

- **Interactive**: `codex "prompt"`
- **Non-interactive**: `codex exec "prompt"`
- **Resume**: `codex resume <session-id>` or `codex resume --last`

#### 5.2 Output Formats

- **JSON streaming**: `--json` (JSONL to stdout)
- **Last message**: `--output-last-message <file>` (text file with final response)
- **Default**: Pretty terminal output (not captured in research)

#### 5.3 Sandbox Modes

```bash
--sandbox read-only              # Can only read files
--sandbox workspace-write        # Can modify workspace (default with --full-auto)
--sandbox danger-full-access     # Full system access
```

#### 5.4 Approval Policies

```bash
--ask-for-approval untrusted     # Ask before untrusted commands
--ask-for-approval on-failure    # Ask if command fails
--ask-for-approval on-request    # Model decides when to ask
--ask-for-approval never         # Never ask (with --full-auto)
```

#### 5.5 Model Selection

```bash
-m, --model <MODEL>              # Specify model (default: gpt-5-codex)
--oss                            # Use local Ollama model
```

#### 5.6 Configuration

```bash
-c, --config key=value           # Override config.toml values
-p, --profile <PROFILE>          # Use config profile
```

Example:

```bash
codex exec "task" -c model="o3" -c 'sandbox_permissions=["disk-full-read-access"]'
```

#### 5.7 Additional Capabilities

- **Image attachments**: `-i, --image <FILE>...`
- **Working directory**: `-C, --cd <DIR>`
- **Web search**: `--search` (enables web_search tool)
- **Session management**: Sessions auto-saved to `~/.codex/sessions/`
- **Git integration**: Detects git repos, can apply diffs
- **MCP server**: Experimental Model Context Protocol support

### Session Storage

- **Location**: `~/.codex/sessions/YYYY/MM/DD/`
- **Naming**: `rollout-YYYY-MM-DDTHH-MM-SS-<thread-id>.jsonl`
- **Format**: JSONL with timestamps and encrypted reasoning
- **Persistence**: All sessions automatically saved

---

## 6. Unification Feasibility Assessment

### Can the Formats Be Unified?

**YES**, with careful design. Here's how:

### 6.1 Recommended Unified Structure

Create a **hybrid format** that combines the best of both:

```typescript
interface UnifiedCodexMessage {
  // Core fields (from streaming)
  type:
    | "thread.started"
    | "turn.started"
    | "item.started"
    | "item.completed"
    | "turn.completed";

  // Metadata (from stored)
  timestamp?: string; // ISO timestamp
  session_id: string; // Always include

  // Event-specific data
  item?: {
    id: string;
    type: "reasoning" | "agent_message" | "command_execution" | "file_change";
    status?: "in_progress" | "completed";

    // Type-specific fields
    text?: string; // For reasoning/agent_message
    command?: string; // For command_execution
    aggregated_output?: string; // For command_execution
    exit_code?: number; // For command_execution
    changes?: FileChange[]; // For file_change
  };

  // Usage info (from turn.completed)
  usage?: {
    input_tokens: number;
    cached_input_tokens: number;
    output_tokens: number;
  };

  // Context (from stored)
  context?: {
    cwd?: string;
    model?: string;
    approval_policy?: string;
    sandbox_mode?: string;
  };

  // Original record for reference
  _raw?: {
    streaming?: any; // Original streaming event
    stored?: any; // Original stored record
  };
}
```

### 6.2 Conversion Strategy

#### From Streaming to Unified

```typescript
function streamingToUnified(
  event: StreamingEvent,
  sessionContext: Context
): UnifiedCodexMessage {
  return {
    type: event.type,
    timestamp: new Date().toISOString(),
    session_id: sessionContext.thread_id,
    item: event.item,
    usage: event.usage,
    context: sessionContext,
    _raw: { streaming: event },
  };
}
```

#### From Stored to Unified

```typescript
function storedToUnified(record: StoredRecord): UnifiedCodexMessage[] {
  const messages: UnifiedCodexMessage[] = [];

  if (record.type === "session_meta") {
    messages.push({
      type: "thread.started",
      timestamp: record.timestamp,
      session_id: record.payload.id,
      context: {
        cwd: record.payload.cwd,
        // ... extract context
      },
      _raw: { stored: record },
    });
  }

  if (record.type === "event_msg") {
    // Map event_msg to appropriate unified type
    if (record.payload.type === "agent_message") {
      messages.push({
        type: "item.completed",
        timestamp: record.timestamp,
        session_id: extractSessionId(record),
        item: {
          type: "agent_message",
          text: record.payload.message,
          status: "completed",
        },
        _raw: { stored: record },
      });
    }
  }

  return messages;
}
```

### 6.3 Key Unification Challenges

1. **Encrypted Reasoning Content**
   - Stored format encrypts reasoning
   - Need to decide: use summary or try to decrypt?
   - **Recommendation**: Use `summary` field from stored, full text from streaming

2. **Multiple Records for One Event**
   - Stored format has both `event_msg` and `response_item` for same event
   - **Recommendation**: Merge into single unified message, preserve both in `_raw`

3. **Missing Timestamps in Streaming**
   - Streaming has no timestamps
   - **Recommendation**: Add client-side timestamps when consuming stream

4. **Context Availability**
   - Streaming doesn't include full context
   - **Recommendation**: Extract from first `session_meta` and cache

5. **item.started vs Completed**
   - Streaming has both, stored only has completed
   - **Recommendation**: Support both, mark stored items as status='completed'

### 6.4 Bidirectional Conversion

```typescript
class CodexFormatConverter {
  // Streaming → Unified
  streamToUnified(
    stream: StreamingEvent[],
    context: SessionContext
  ): UnifiedCodexMessage[] {
    return stream.map((event) => this.convertStreamEvent(event, context));
  }

  // Stored → Unified
  storedToUnified(storedFile: StoredRecord[]): UnifiedCodexMessage[] {
    const messages: UnifiedCodexMessage[] = [];
    let sessionContext: Context | null = null;

    for (const record of storedFile) {
      if (record.type === "session_meta") {
        sessionContext = this.extractContext(record);
      }
      messages.push(...this.convertStoredRecord(record, sessionContext));
    }

    return messages;
  }

  // Unified → Streaming (for replay/testing)
  unifiedToStream(unified: UnifiedCodexMessage[]): StreamingEvent[] {
    return unified
      .map((msg) => ({
        type: msg.type,
        thread_id: msg.type === "thread.started" ? msg.session_id : undefined,
        item: msg.item,
        usage: msg.usage,
      }))
      .filter((e) => e !== null);
  }
}
```

---

## 7. Integration Recommendations

### For the Agent Workflows Project

#### 7.1 Immediate Actions

1. **Adopt Unified Format**

   ```typescript
   // In agent-cli-sdk/src/codex/types.ts
   export interface CodexMessage {
     type: CodexEventType;
     timestamp: string;
     session_id: string;
     item?: CodexItem;
     usage?: TokenUsage;
     context?: SessionContext;
   }
   ```

2. **Support Both Sources**

   ```typescript
   // Stream from live execution
   const liveMessages = await codexSDK.exec(prompt, { stream: true });

   // Load from stored session
   const storedMessages = await codexSDK.loadSession(sessionId);

   // Both return CodexMessage[]
   ```

3. **Parser Implementation**

   ```typescript
   // In agent-cli-sdk/src/codex/parse.ts
   export function parseCodexStream(jsonl: string): CodexMessage[] {
     return jsonl
       .split("\n")
       .filter((line) => line.trim())
       .map((line) => {
         const event = JSON.parse(line);
         return streamingToUnified(event);
       });
   }

   export function parseCodexSession(sessionFile: string): CodexMessage[] {
     const records = sessionFile
       .split("\n")
       .filter((line) => line.trim())
       .map((line) => JSON.parse(line));

     return storedToUnified(records);
   }
   ```

#### 7.2 Feature Parity with Claude

To match Claude Code integration, implement:

1. **Session Loading**
   - Read from `~/.codex/sessions/`
   - Parse stored format
   - Display in UI

2. **Real-time Streaming**
   - Use `--json` flag
   - Parse streaming format
   - Update UI in real-time

3. **Session Management**
   - List available sessions
   - Resume previous sessions
   - Export sessions

4. **Token Tracking**
   - Extract from `usage` field
   - Track cumulative tokens
   - Display costs

#### 7.3 Code Structure

```
packages/agent-cli-sdk/src/codex/
├── types.ts              # Unified types
├── stream.ts             # Streaming execution
├── session.ts            # Session loading/management
├── parse.ts              # Format conversion
├── convert.ts            # Bidirectional conversion
└── index.ts              # Public API
```

### 7.4 Testing Strategy

```typescript
// tests/codex/parse.test.ts
describe("Codex Format Parsing", () => {
  it("parses streaming format", () => {
    const stream = readFixture("stream-output-1.jsonl");
    const messages = parseCodexStream(stream);

    expect(messages[0]).toMatchObject({
      type: "thread.started",
      session_id: expect.any(String),
    });
  });

  it("parses stored format", () => {
    const stored = readFixture("stored-session-1.jsonl");
    const messages = parseCodexSession(stored);

    expect(messages[0]).toMatchObject({
      type: "thread.started",
      timestamp: expect.any(String),
      context: expect.objectContaining({
        cwd: expect.any(String),
      }),
    });
  });

  it("unified formats are equivalent", () => {
    const streamUnified = parseCodexStream(streamFixture);
    const storedUnified = parseCodexSession(storedFixture);

    // Should have same core structure
    expect(streamUnified.map((m) => m.type)).toEqual(
      storedUnified.map((m) => m.type)
    );
  });
});
```

---

## 8. Additional Findings

### 8.1 Session Naming Convention

Sessions use predictable naming:

```
rollout-<ISO-DATE>T<TIME>-<UUID>.jsonl
rollout-2025-10-28T18-59-38-019a2d7a-41c4-78b1-b7cc-a45d62a89cd5.jsonl
```

This makes it easy to:

- Find recent sessions: `ls -t ~/.codex/sessions/YYYY/MM/DD/ | head`
- Find by UUID: `find ~/.codex/sessions -name "*<uuid>*"`
- Group by date: Already organized by YYYY/MM/DD

### 8.2 Tool Invocations

Codex uses function calling for tools:

**Streaming**:

```json
{
  "type": "item.completed",
  "item": { "type": "command_execution", "command": "bash -lc ls" }
}
```

**Stored**:

```json
{"type":"response_item","payload":{"type":"function_call","name":"shell","arguments":"{...}"}}
{"type":"response_item","payload":{"type":"function_call_output","call_id":"call_xxx","output":"{...}"}}
```

### 8.3 File Operations

File changes use `apply_patch` tool:

**Streaming**:

```json
{
  "type": "item.completed",
  "item": {
    "type": "file_change",
    "changes": [{ "path": "...", "kind": "add" }]
  }
}
```

**Stored**:

```json
{"type":"response_item","payload":{"type":"custom_tool_call","name":"apply_patch","input":"*** Begin Patch..."}}
{"type":"response_item","payload":{"type":"custom_tool_call_output","output":"{\"output\":\"Success..."}}
```

### 8.4 Token Caching

Codex supports prompt caching:

```json
{
  "usage": {
    "input_tokens": 6040,
    "cached_input_tokens": 4992, // Significant savings!
    "output_tokens": 129
  }
}
```

This is crucial for:

- Long conversations
- Repeated context
- Cost optimization

---

## 9. Conclusion

### Key Takeaways

1. **Two Distinct Formats**: Streaming (simplified, real-time) vs Stored (comprehensive, archival)

2. **Unification is Feasible**: With proper mapping and hybrid design

3. **Streaming Format Benefits**:
   - Simple to parse
   - Real-time updates
   - Lower overhead

4. **Stored Format Benefits**:
   - Complete history
   - Timestamps
   - Context preservation
   - Encrypted reasoning

5. **Recommended Approach**:
   - Create unified internal format
   - Support both input sources
   - Preserve original in `_raw` field
   - Add timestamps to streaming

### Next Steps

1. Implement unified types in `agent-cli-sdk`
2. Create parsers for both formats
3. Add session loading capabilities
4. Build format converter utilities
5. Test with real Codex sessions
6. Update web app to support Codex alongside Claude

### Files Generated During Research

- `stream-output-1.jsonl`: Simple math question (streaming)
- `stream-output-2.jsonl`: File listing (streaming)
- `stream-output-3.jsonl`: File creation (streaming)
- `stream-output-4.jsonl`: File reading (streaming)
- `stream-output-5.jsonl`: Directory listing (streaming)

Corresponding stored sessions in:

- `~/.codex/sessions/2025/10/28/rollout-2025-10-28T18-59-*.jsonl`

---

## Appendix: Quick Reference

### Codex Commands Cheat Sheet

```bash
# Execute non-interactively with JSON output
codex exec "prompt" --json --full-auto

# Resume last session
codex resume --last

# Resume specific session
codex resume <session-id>

# Export last message
codex exec "prompt" --output-last-message output.txt

# Custom model
codex exec "prompt" -m o3

# Read-only sandbox
codex exec "prompt" --sandbox read-only

# Full automation
codex exec "prompt" --dangerously-bypass-approvals-and-sandbox
```

### Session File Locations

```bash
# Today's sessions
ls ~/.codex/sessions/$(date +%Y/%m/%d)/

# All sessions
find ~/.codex/sessions -name "*.jsonl"

# Session by UUID
find ~/.codex/sessions -name "*<uuid>*"
```

### Event Type Quick Reference

**Streaming**: `thread.started`, `turn.started`, `item.started`, `item.completed`, `turn.completed`

**Stored**: `session_meta`, `response_item`, `event_msg`, `turn_context`

**Item Types**: `reasoning`, `agent_message`, `command_execution`, `file_change`

---

_Research conducted: October 28, 2025_
_Codex Version: 0.46.0_
_Platform: macOS (Darwin 25.0.0)_
