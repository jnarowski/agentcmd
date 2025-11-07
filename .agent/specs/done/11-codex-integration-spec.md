# Codex Integration Specification

## Overview

Add Codex support to the agent-cli-sdk package to achieve feature parity with the existing Claude implementation. The critical requirement is that Codex output must be transformed to match Claude's `UnifiedMessage` and `UnifiedContent[]` format exactly, ensuring frontend components can consume both providers identically without modification.

## Goals

- **Primary Goal:** Transform Codex events into Claude-compatible `UnifiedMessage` format for frontend compatibility
- **Type Safety:** Use Codex-specific types for parsing input and typing `_original` field only
- **Feature Parity:** Support all features that Claude implementation provides (execute, loadSession, detectCli)
- **Test Coverage:** Match Claude's comprehensive test patterns
- **Full Implementation:** Include CLI execution and E2E tests

## Key Architectural Principles

1. **Codex types are input-only** - Used for parsing incoming JSONL, typing `_original` field, and TypeScript safety during transformation
2. **Output types are always Claude's types** - `UnifiedMessage`, `UnifiedContent[]`, tool types, etc.
3. **Frontend sees no difference** - Same components, same data structures, regardless of provider
4. **Original preserved** - Raw Codex events stored in typed `_original` field for debugging

## Research Summary

### Codex Event Format

Based on analysis of fixtures in `tests/fixtures/codex/full/`:

**Event Types:**
- `response_item` - Contains messages, function calls, outputs, and reasoning
- `event_msg` - Token counts and metadata
- `turn_context` - Turn information
- `session_meta` - Session and git context

**Key Differences from Claude:**

| Aspect | Codex | Claude | Transformation |
|--------|-------|--------|----------------|
| Tool calls | `function_call` with `call_id`, `name`, `arguments` (JSON string) | `tool_use` content block with `id`, `name`, `input` (object) | Parse JSON string → object, map names |
| Tool results | `function_call_output` with `call_id`, `output` | `tool_result` content block with `tool_use_id`, `content` | Map field names |
| Tool names | `shell` | `Bash` | Direct mapping |
| Reasoning | Separate `reasoning` events with `summary`/`content` | `thinking` content blocks inline | Transform to content block |
| Content | `input_text` type | `text` type | Map type name |
| Token usage | Separate `event_msg` events | Inline in message `usage` | Attach to appropriate message |

## Implementation Plan

### Phase 1: Types & Parser Foundation

#### 1.1 Create `src/codex/types.ts`

Define input-only types for parsing Codex JSONL events:

```typescript
// Top-level event structure
interface CodexEvent {
  timestamp: string;
  type: 'response_item' | 'event_msg' | 'turn_context' | 'session_meta';
  payload: ResponseItemPayload | EventMsgPayload | TurnContextPayload | SessionMetaPayload;
}

// Response items
interface ResponseItemPayload {
  type: 'message' | 'function_call' | 'function_call_output' | 'reasoning';
  role?: 'user' | 'assistant';
  content?: ContentBlock[];
  // Function call fields
  name?: string;
  arguments?: string;  // JSON string
  call_id?: string;
  // Function output fields
  output?: string;
  // Reasoning fields
  summary?: string[];
  encrypted_content?: string;
}

interface ContentBlock {
  type: 'input_text';
  text: string;
}

interface EventMsgPayload {
  type: 'token_count' | 'agent_reasoning' | 'user_message' | 'agent_message';
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
  total_tokens?: number;
}

interface SessionMetaPayload {
  session_id: string;
  model: string;
  // ... other metadata
}

interface TurnContextPayload {
  // ... turn context fields
}
```

**Testing:**
- Type checking only - no runtime tests needed

#### 1.2 Implement `src/codex/parse.ts`

Main function: `parse(jsonlLine: string): UnifiedMessage | null`

**Transformation Logic:**

```typescript
export function parse(jsonlLine: string): UnifiedMessage | null {
  try {
    const event: CodexEvent = JSON.parse(jsonlLine);

    // Skip non-message events
    if (event.type !== 'response_item' && event.type !== 'event_msg') {
      return null;
    }

    const payload = event.payload;

    // Handle different response item types
    if ('type' in payload) {
      switch (payload.type) {
        case 'message':
          return transformMessage(event);
        case 'function_call':
          return transformFunctionCall(event);
        case 'function_call_output':
          return transformFunctionCallOutput(event);
        case 'reasoning':
          return transformReasoning(event);
        case 'token_count':
          return transformTokenCount(event);
      }
    }

    return null;
  } catch (error) {
    // Silently skip invalid events (match Claude behavior)
    return null;
  }
}
```

**Key Transformations:**

1. **Function Call → tool_use:**
```typescript
function transformFunctionCall(event: CodexEvent): UnifiedMessage {
  const payload = event.payload as ResponseItemPayload;

  // Parse JSON arguments string
  const input = JSON.parse(payload.arguments || '{}');

  // Map tool name
  const name = mapToolName(payload.name || '');

  return {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: payload.call_id,
        name,
        input
      }
    ],
    timestamp: event.timestamp,
    _original: event
  };
}
```

2. **Function Call Output → tool_result:**
```typescript
function transformFunctionCallOutput(event: CodexEvent): UnifiedMessage {
  const payload = event.payload as ResponseItemPayload;

  return {
    role: 'assistant',
    content: [
      {
        type: 'tool_result',
        tool_use_id: payload.call_id,
        content: payload.output
      }
    ],
    timestamp: event.timestamp,
    _original: event
  };
}
```

3. **Reasoning → thinking:**
```typescript
function transformReasoning(event: CodexEvent): UnifiedMessage {
  const payload = event.payload as ResponseItemPayload;

  // Use summary if content is encrypted
  const text = payload.content || payload.summary?.join('\n') || '';

  return {
    role: 'assistant',
    content: [
      {
        type: 'thinking',
        thinking: text
      }
    ],
    timestamp: event.timestamp,
    _original: event
  };
}
```

4. **Tool Name Mapping:**
```typescript
const TOOL_NAME_MAP: Record<string, string> = {
  'shell': 'Bash',
  // Add more mappings as discovered
};

function mapToolName(codexName: string): string {
  return TOOL_NAME_MAP[codexName] || codexName;
}
```

**Testing:** `src/codex/parse.test.ts`

Test cases using fixture files:
- ✅ Parse function_call → verify tool_use structure matches Claude
- ✅ Parse function_call_output → verify tool_result structure matches Claude
- ✅ Parse reasoning → verify thinking block matches Claude
- ✅ Parse message with input_text → verify text content block matches Claude
- ✅ Tool name mapping (shell → Bash)
- ✅ JSON argument parsing
- ✅ Invalid events return null
- ✅ _original field contains typed Codex event
- ✅ Compare with Claude fixture output for structural equivalence

### Phase 2: CLI Detection & Session Loading

#### 2.1 Implement `src/codex/detectCli.ts`

```typescript
export function detectCli(): string | undefined {
  // Check environment variable first
  if (process.env.CODEX_CLI_PATH) {
    return process.env.CODEX_CLI_PATH;
  }

  // Try using 'which codex' command
  try {
    const result = execSync('which codex', { encoding: 'utf-8' });
    const path = result.trim();
    if (path && fs.existsSync(path)) {
      return path;
    }
  } catch {
    // Continue to check common paths
  }

  // Search common installation paths
  const commonPaths = [
    '/opt/homebrew/bin/codex',      // Homebrew on Apple Silicon
    '/usr/local/bin/codex',          // Homebrew on Intel, or standard install
    `${process.env.HOME}/.local/bin/codex`,  // User local install
  ];

  for (const path of commonPaths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }

  return undefined;
}
```

**Implementation Notes:**
- Primary detection via `which codex` shell command
- Environment variable override for custom installations
- Common paths based on actual installations observed

#### 2.2 Implement `src/codex/loadSession.ts`

```typescript
export async function loadSession(
  sessionId: string
): Promise<UnifiedMessage[]> {
  // Codex stores sessions in ~/.codex/sessions/YYYY/MM/DD/rollout-{timestamp}-{uuid}.jsonl
  // We need to search for the session ID in the filename

  const codexHome = process.env.CODEX_HOME || `${process.env.HOME}/.codex`;
  const sessionsDir = `${codexHome}/sessions`;

  // Search for session file by ID (contained in filename)
  const sessionPath = await findSessionFile(sessionsDir, sessionId);

  if (!sessionPath) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const content = await fs.readFile(sessionPath, 'utf-8');
  const lines = content.trim().split('\n');

  const messages: UnifiedMessage[] = [];

  for (const line of lines) {
    const message = parse(line);
    if (message) {
      messages.push(message);
    }
  }

  // Sort by timestamp (match Claude behavior)
  return messages.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

async function findSessionFile(sessionsDir: string, sessionId: string): Promise<string | null> {
  // Recursively search sessions directory for file containing session ID
  // Codex format: ~/.codex/sessions/2025/10/27/rollout-2025-10-27T16-14-10-{sessionId}.jsonl
  // Use glob pattern: sessions/**/*-{sessionId}.jsonl

  const pattern = `${sessionsDir}/**/*-${sessionId}.jsonl`;
  const files = await glob(pattern);

  return files[0] || null;
}
```

**Implementation Notes:**
- Codex uses date-based directory structure unlike Claude's project-based structure
- Session files named with timestamp and UUID
- No project path parameter needed - session ID is globally unique

**Testing:** `src/codex/loadSession.test.ts`
- ✅ Load fixture files as sessions
- ✅ Verify messages are parsed correctly
- ✅ Verify sorting by timestamp
- ✅ Verify Claude-compatible output

### Phase 3: CLI Execution

#### 3.1 Implement `src/codex/execute.ts`

```typescript
export async function execute<T = unknown>(
  options: ExecuteOptions
): Promise<ExecuteResult<T>> {
  const cliPath = detectCli();
  if (!cliPath) {
    return {
      success: false,
      error: 'Codex CLI not found',
      messages: []
    };
  }

  // Research: Codex CLI argument structure
  const args = buildCliArgs(options);

  const messages: UnifiedMessage[] = [];
  let sessionId: string | undefined;
  let lineBuffer = '';

  const result = await spawnProcess({
    command: cliPath,
    args,
    onStdout: (chunk) => {
      lineBuffer += chunk;
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const event: CodexEvent = JSON.parse(line);

          // Extract session ID from session_meta
          if (event.type === 'session_meta') {
            sessionId = event.payload.session_id;
          }

          // Parse to unified format
          const message = parse(line);

          // Call callbacks
          options.onEvent?.({
            raw: line,
            event,
            message
          });

          if (message) {
            messages.push(message);
            options.onMessage?.(message);
          }
        } catch (error) {
          // Silently skip invalid lines
        }
      }
    },
    onStderr: (chunk) => {
      options.onStderr?.(chunk);
    }
  });

  // Extract JSON if requested
  let data: T | undefined;
  if (options.extractJson) {
    const lastTextContent = findLastTextContent(messages);
    if (lastTextContent) {
      data = extractJson<T>(lastTextContent);
    }
  }

  return {
    success: result.exitCode === 0,
    messages,
    sessionId,
    data,
    exitCode: result.exitCode
  };
}

function buildCliArgs(options: ExecuteOptions): string[] {
  const args: string[] = ['exec'];  // Use non-interactive mode

  // Handle session resumption
  if (options.sessionId) {
    args.push('resume', options.sessionId);
  }

  // Map permission modes to Codex flags
  if (options.permissionMode) {
    const { approval, sandbox } = mapPermissionMode(options.permissionMode);
    args.push('-a', approval, '-s', sandbox);
  } else if (options.dangerouslySkipPermissions) {
    args.push('--dangerously-bypass-approvals-and-sandbox');
  } else {
    // Default: equivalent to Claude 'default' mode
    args.push('-a', 'untrusted', '-s', 'workspace-write');
  }

  // Working directory
  if (options.workingDir) {
    args.push('-C', options.workingDir);
  }

  // Model selection
  if (options.model) {
    args.push('-m', options.model);
  }

  // Prompt comes last
  if (options.prompt) {
    args.push(options.prompt);
  }

  return args;
}

function mapPermissionMode(mode: string): { approval: string; sandbox: string } {
  switch (mode) {
    case 'bypassPermissions':
      return { approval: 'never', sandbox: 'danger-full-access' };
    case 'acceptEdits':
      return { approval: 'on-failure', sandbox: 'workspace-write' };
    case 'plan':
      return { approval: 'on-request', sandbox: 'read-only' };
    case 'default':
    default:
      return { approval: 'untrusted', sandbox: 'workspace-write' };
  }
}
```

**Implementation Notes:**
- Use `codex exec` for non-interactive execution
- Permission mode mapping based on research findings
- Session resume via `codex exec resume [SESSION_ID]`

**Testing:** `src/codex/execute.test.ts`
- ✅ Unit tests with mocked spawn
- ✅ Verify JSONL parsing
- ✅ Verify session ID extraction
- ✅ Verify message streaming
- ✅ Verify Claude-compatible output
- ✅ E2E tests with actual Codex CLI
- ✅ Test tool_use/tool_result flow

### Phase 4: Integration & Testing

#### 4.1 Create `src/codex/index.ts`

```typescript
export { parse } from './parse';
export { execute } from './execute';
export { loadSession } from './loadSession';
export { detectCli } from './detectCli';
export type * from './types';
```

#### 4.2 Update `src/index.ts`

Add Codex routing in existing switch statements:

```typescript
export function loadMessages(
  tool: ToolType,
  projectPath: string,
  sessionId: string
): Promise<UnifiedMessage[]> {
  switch (tool) {
    case 'claude':
      return claude.loadSession(projectPath, sessionId);
    case 'codex':
      return codex.loadSession(projectPath, sessionId);
    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }
}

export function execute<T = unknown>(
  tool: ToolType,
  options: ExecuteOptions
): Promise<ExecuteResult<T>> {
  switch (tool) {
    case 'claude':
      return claude.execute(options);
    case 'codex':
      return codex.execute(options);
    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }
}
```

#### 4.3 Integration Tests

Create tests that verify end-to-end compatibility:

```typescript
describe('Provider Compatibility', () => {
  it('tool_use blocks have identical structure', () => {
    const claudeToolUse = parseClaudeToolUse(claudeFixture);
    const codexToolUse = parseCodexToolUse(codexFixture);

    // Verify structure is identical
    expect(claudeToolUse).toMatchObject({
      type: 'tool_use',
      id: expect.any(String),
      name: expect.any(String),
      input: expect.any(Object)
    });

    expect(codexToolUse).toMatchObject({
      type: 'tool_use',
      id: expect.any(String),
      name: expect.any(String),
      input: expect.any(Object)
    });
  });

  it('frontend can consume both providers identically', () => {
    // Mock frontend component
    const component = new MessageRenderer();

    const claudeMessages = loadClaudeFixture();
    const codexMessages = loadCodexFixture();

    // Both should render without errors
    expect(() => component.render(claudeMessages)).not.toThrow();
    expect(() => component.render(codexMessages)).not.toThrow();
  });
});
```

#### 4.4 Create `tests/fixtures/README.md`

Document fixture formats and transformations:

```markdown
# Test Fixtures

## Claude Fixtures

Location: `tests/fixtures/claude/`

Format: JSONL with Claude event structure
- Events have `type: 'user' | 'assistant'`
- Content blocks: text, thinking, tool_use, tool_result
- Tool names: Bash, Read, Write, etc.

## Codex Fixtures

Location: `tests/fixtures/codex/full/`

Format: JSONL with Codex event structure
- Events have `type: 'response_item' | 'event_msg' | ...`
- Function calls and outputs are separate events
- Tool names: shell, etc.

## Transformation Examples

### Function Call
**Codex Input:**
```json
{
  "type": "response_item",
  "payload": {
    "type": "function_call",
    "name": "shell",
    "arguments": "{\"command\": [\"bash\", \"-lc\", \"ls\"]}",
    "call_id": "call_123"
  }
}
```

**Unified Output (Claude-compatible):**
```json
{
  "role": "assistant",
  "content": [
    {
      "type": "tool_use",
      "id": "call_123",
      "name": "Bash",
      "input": {
        "command": ["bash", "-lc", "ls"]
      }
    }
  ]
}
```
```

### Phase 5: Documentation

#### 5.1 Update Package README

Add Codex documentation:

```markdown
# Agent CLI SDK

Multi-provider SDK for agent CLI tools (Claude, Codex).

## Features

- **Unified Interface**: Both providers output identical `UnifiedMessage` format
- **Frontend Compatible**: Use same components for both providers
- **Type Safe**: Full TypeScript support
- **Original Preserved**: Raw events available in `_original` field

## Usage

### Execute with Codex

```typescript
import { execute } from '@agent-cli-sdk';

const result = await execute('codex', {
  prompt: 'List files in current directory',
  onMessage: (message) => {
    console.log(message.content);
  }
});
```

### Load Session History

```typescript
import { loadMessages } from '@agent-cli-sdk';

const messages = await loadMessages('codex', '/path/to/project', 'session-id');
```

## Unified Message Format

Both Claude and Codex output the same structure:

```typescript
interface UnifiedMessage {
  role: 'user' | 'assistant';
  content: UnifiedContent[];
  timestamp: string;
  _original?: unknown;  // Original provider event
}

type UnifiedContent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string };
```

## Provider Differences (Internal)

The SDK handles these transformations automatically:

| Feature | Codex | Claude | SDK Output |
|---------|-------|--------|------------|
| Tool calls | function_call | tool_use | tool_use |
| Tool names | shell | Bash | Bash |
| Reasoning | separate event | inline thinking | thinking |
```

## Success Criteria

### Critical Requirements

- ✅ Frontend components work with both Claude and Codex without modification
- ✅ Tool calls (tool_use/tool_result) have identical structure between providers
- ✅ Thinking blocks have identical structure
- ✅ Content blocks are interchangeable
- ✅ Codex types provide type safety for parsing only
- ✅ Original Codex format preserved in typed `_original` field

### Test Coverage

- ✅ Unit tests for all transformation functions
- ✅ Fixture-based tests for all Codex event types
- ✅ Integration tests verifying provider compatibility
- ✅ E2E tests with actual Codex CLI
- ✅ Match Claude test coverage patterns

### Code Quality

- ✅ Full TypeScript typing
- ✅ No `any` types without justification
- ✅ Consistent error handling (silent skipping like Claude)
- ✅ Clear separation: input types vs output types

## File Structure

```
packages/agent-cli-sdk/
├── src/
│   ├── codex/
│   │   ├── types.ts              # Input-only types for parsing
│   │   ├── parse.ts              # JSONL → UnifiedMessage
│   │   ├── parse.test.ts
│   │   ├── execute.ts            # CLI execution
│   │   ├── execute.test.ts
│   │   ├── loadSession.ts        # Session history
│   │   ├── loadSession.test.ts
│   │   ├── detectCli.ts          # CLI detection
│   │   └── index.ts              # Exports
│   ├── claude/                   # Existing
│   ├── types/
│   │   └── unified.ts            # Shared output types
│   └── index.ts                  # Updated routing
├── tests/
│   ├── fixtures/
│   │   ├── codex/full/          # Existing fixtures
│   │   ├── claude/              # Existing fixtures
│   │   └── README.md            # New documentation
│   └── integration/
│       └── compatibility.test.ts # New compatibility tests
└── README.md                     # Updated docs
```

## Implementation Order

1. **Phase 1: Parser** (Immediate - have fixtures)
   - types.ts
   - parse.ts + tests
   - Validate output matches Claude format

2. **Phase 2: Session Loading** (After parser working)
   - Research session location
   - loadSession.ts + tests
   - detectCli.ts

3. **Phase 3: CLI Execution** (Requires CLI access)
   - Research CLI arguments
   - execute.ts + tests
   - E2E tests

4. **Phase 4: Integration** (After all above)
   - Update main index.ts
   - Compatibility tests
   - Documentation

5. **Phase 5: Documentation** (Final)
   - README updates
   - Fixture documentation

## Research Findings (COMPLETED)

### 1. CLI Location
- **Installation**: `/opt/homebrew/bin/codex` (or `which codex`)
- **Environment Variable**: `CODEX_CLI_PATH` (custom)
- **Config Directory**: `~/.codex/`
- **Detection Strategy**:
  1. Check `process.env.CODEX_CLI_PATH`
  2. Try `which codex` via shell
  3. Check common paths: `/opt/homebrew/bin/codex`, `/usr/local/bin/codex`

### 2. CLI Arguments & Command Structure
**Interactive Mode**: `codex [OPTIONS] [PROMPT]`
**Non-Interactive**: `codex exec [OPTIONS] [PROMPT]`
**Resume Session**: `codex resume [SESSION_ID] [PROMPT]` or `codex exec resume [SESSION_ID]`

**Key Options**:
- `-a, --ask-for-approval <POLICY>`: `untrusted` | `on-failure` | `on-request` | `never`
- `-s, --sandbox <MODE>`: `read-only` | `workspace-write` | `danger-full-access`
- `--full-auto`: Alias for `-a on-failure --sandbox workspace-write`
- `--dangerously-bypass-approvals-and-sandbox`: Skip all safety checks
- `-C, --cd <DIR>`: Working directory
- `-m, --model <MODEL>`: Model selection
- `-c, --config <key=value>`: Override config values

**Permission Mode Mapping** (Codex → Claude equivalents):
- Codex `never` + `danger-full-access` = Claude `bypassPermissions`
- Codex `on-failure` + `workspace-write` = Claude `acceptEdits`
- Codex `on-request` + `read-only` = Claude `plan`
- Codex `untrusted` + `workspace-write` = Claude `default`

### 3. Session Storage
- **Location**: `~/.codex/sessions/YYYY/MM/DD/rollout-{timestamp}-{uuid}.jsonl`
- **Format**: JSONL files with timestamp-based organization
- **Naming Pattern**: `rollout-2025-10-27T16-14-10-019a27bc-6b2a-71c2-8cf3-54a82f6c6fb8.jsonl`
- **Session ID**: Extracted from `session_meta` event payload `id` field
- **No Path Encoding**: Unlike Claude, Codex doesn't encode project paths in session filenames

### 4. Tool Name Mappings
Based on fixture analysis, confirmed tool mappings:
```typescript
const TOOL_NAME_MAP: Record<string, string> = {
  'shell': 'Bash',
  'update_plan': 'TodoWrite',
  // Codex likely uses similar tool names to Claude for others
};
```

### 5. Encrypted Reasoning Content
- **Strategy**: Use `summary` field array when `encrypted_content` is present
- **Summary Format**: Array of `{ type: 'summary_text', text: string }` objects
- **Transformation**: Join summary text blocks with newlines for `thinking` content
- **No Decryption**: Encrypted content is not accessible without decryption key

## Estimated Effort

- **Phase 1**: 4-6 hours (types + parser + tests)
- **Phase 2**: 2-3 hours (session loading + CLI detection)
- **Phase 3**: 4-6 hours (execution + E2E tests + research)
- **Phase 4**: 2-3 hours (integration + compatibility tests)
- **Phase 5**: 1-2 hours (documentation)

**Total**: ~15-20 hours

## Notes

- Prioritize getting parser working first - it's the core transformation
- Use fixture files extensively for testing since they're comprehensive
- Research CLI details can happen in parallel with parser work
- Keep transformation logic simple and testable
- Mirror Claude's patterns for consistency

## Review Findings

**Review Date:** 2025-10-28
**Reviewed By:** Claude Code
**Review Iteration:** 1 of 3
**Branch:** feat/v3-codex
**Commits Reviewed:** 0 (changes not yet committed)

### Summary

The implementation is nearly complete with all core functionality implemented and 161 unit tests passing. The transformation logic correctly converts Codex events to Claude-compatible UnifiedMessage format. However, there are several HIGH priority issues related to missing E2E tests and documentation that must be addressed before this implementation can be considered production-ready.

### Phase 1: Types & Parser Foundation

**Status:** ✅ Complete - All parser functionality implemented and tested

No issues found. The types and parser implementation are complete with comprehensive test coverage (26 tests passing).

### Phase 2: CLI Detection & Session Loading

**Status:** ✅ Complete - CLI detection and session loading fully implemented

No issues found. Both `detectCli.ts` and `loadSession.ts` are implemented with proper error handling and tests (5 tests passing).

### Phase 3: CLI Execution

**Status:** ⚠️ Incomplete - Core implementation complete but missing E2E tests

#### HIGH Priority

- [ ] **Missing E2E tests for Codex**
  - **File:** N/A (tests/e2e/codex/ directory does not exist)
  - **Spec Reference:** "Phase 3: **Testing:** `src/codex/execute.test.ts` - ✅ E2E tests with actual Codex CLI"
  - **Expected:** E2E test files similar to Claude's structure at `tests/e2e/codex/basic.test.ts`, `tests/e2e/codex/json.test.ts`, etc.
  - **Actual:** Only unit tests exist (execute.test.ts with 5 basic type tests). No actual CLI execution tests.
  - **Fix:** Create E2E test suite:
    - `tests/e2e/codex/basic.test.ts` - Basic command execution
    - `tests/e2e/codex/json.test.ts` - JSON extraction
    - `tests/e2e/codex/resume.test.ts` - Session resumption
    - `tests/e2e/codex/session-continuation.test.ts` - Session continuation
  - **Impact:** Without E2E tests, we cannot verify the implementation works with actual Codex CLI

- [ ] **Execute tests are only type validation**
  - **File:** `packages/agent-cli-sdk/src/codex/execute.test.ts:1-109`
  - **Spec Reference:** "Phase 3: **Testing:** - ✅ Unit tests with mocked spawn, ✅ Verify JSONL parsing, ✅ Verify session ID extraction, ✅ Verify message streaming"
  - **Expected:** Unit tests that mock `spawnProcess` and verify actual execution logic
  - **Actual:** Tests only validate TypeScript types and structure, no actual execution logic tested
  - **Fix:** Add unit tests with mocked spawn:
    - Mock `spawnProcess` to return fixture data
    - Verify JSONL line-by-line parsing
    - Verify session ID extraction from events
    - Verify callbacks are invoked correctly
    - Verify permission mode mapping
    - Verify CLI args construction

### Phase 4: Integration & Testing

**Status:** ✅ Complete - Integration properly implemented

No issues found. The main `index.ts` correctly routes to codex functions with exhaustive type checking.

### Phase 5: Documentation

**Status:** ⚠️ Incomplete - Missing critical documentation

#### HIGH Priority

- [ ] **Missing fixtures README documentation**
  - **File:** `tests/fixtures/README.md` does not exist
  - **Spec Reference:** "Phase 4: Create `tests/fixtures/README.md` - Document fixture formats and transformations"
  - **Expected:** Comprehensive README documenting Codex fixture format, transformation examples, and comparison with Claude format
  - **Actual:** No README exists in fixtures directory
  - **Fix:** Create `tests/fixtures/README.md` following the template provided in spec section "4.4 Create `tests/fixtures/README.md`"

#### MEDIUM Priority

- [ ] **Package README needs Codex documentation**
  - **File:** `packages/agent-cli-sdk/README.md:1`
  - **Spec Reference:** "Phase 5: Update Package README - Add Codex documentation"
  - **Expected:** README should include Codex usage examples, provider differences table, and Codex-specific information
  - **Actual:** README likely only documents Claude (needs verification)
  - **Fix:** Add sections:
    - "Execute with Codex" usage examples
    - "Load Codex Session History" examples
    - Update "Provider Differences" table to include Codex
    - Ensure all examples work with both Claude and Codex

- [ ] **Missing integration/compatibility tests**
  - **File:** `tests/integration/compatibility.test.ts` does not exist
  - **Spec Reference:** "Phase 4: Integration Tests - Create tests that verify end-to-end compatibility"
  - **Expected:** Tests verifying tool_use, tool_result, and thinking blocks have identical structure between Claude and Codex
  - **Actual:** No compatibility tests exist
  - **Fix:** Create `tests/integration/compatibility.test.ts` with tests:
    - Compare tool_use block structure between providers
    - Compare tool_result block structure
    - Compare thinking block structure
    - Verify frontend components can consume both identically

### Positive Findings

- **Excellent type safety:** Full TypeScript typing with proper exhaustive checks using `never` type
- **Comprehensive unit test coverage:** 161 tests passing with good coverage of parsing logic
- **Clean separation of concerns:** Input types vs output types clearly separated
- **Consistent error handling:** Silent skipping pattern matches Claude behavior
- **Well-structured code:** Clear section comments, consistent file naming, proper exports
- **Integration complete:** Main routing functions properly handle both Claude and Codex
- **Good fixture organization:** Individual event fixtures available for granular testing

### Review Completion Checklist

- [x] All spec requirements reviewed
- [x] Code quality checked
- [ ] All findings addressed and tested
