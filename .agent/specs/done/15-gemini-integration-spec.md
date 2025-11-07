# Gemini CLI Integration Specification

**Status**: Draft
**Created**: 2025-10-29
**Package**: `@repo/agent-cli-sdk`
**Estimated Effort**: 11-14 hours

## Overview

Implement full Gemini CLI support in `packages/agent-cli-sdk` following the **exact same transformation pattern as Codex** - converting Gemini's format to Claude-compatible UnifiedMessage format, while preserving the original Gemini data in `_original`.

## Critical Design Principle

**Transform to Claude Format**: Like Codex, Gemini messages will be transformed to match Claude's structure:
- Gemini tool names → Claude tool names (e.g., `read_file` → `Read`)
- Gemini thoughts → Claude `thinking` blocks
- Gemini tool calls with embedded results → Separate `tool_use` and `tool_result` blocks
- Original Gemini data preserved in `_original` field

This ensures the frontend **only needs to support one format** (Claude's).

## Key Insights from Fixtures

**Session Format**: Unlike Claude/Codex (streaming JSONL), Gemini stores sessions as complete JSON objects:

```json
{
  "sessionId": "uuid",
  "projectHash": "sha256",
  "startTime": "ISO timestamp",
  "lastUpdated": "ISO timestamp",
  "messages": [
    {
      "id": "uuid",
      "timestamp": "ISO",
      "type": "user" | "gemini",
      "content": "text",
      "toolCalls": [{
        "id": "tool-id",
        "name": "read_file",
        "args": {...},
        "result": [{...}],
        "status": "success" | "error" | "cancelled"
      }],
      "thoughts": [{
        "subject": "...",
        "description": "...",
        "timestamp": "ISO"
      }],
      "tokens": {...},
      "model": "gemini-2.5-pro"
    }
  ]
}
```

**Critical Differences from Claude/Codex**:
1. Tool results **embedded** in toolCalls (not separate events)
2. Thoughts as **separate array** (not inline thinking blocks)
3. Session storage: Complete JSON object (not JSONL stream)

## Architecture

### File Structure

```
src/gemini/
├── types.ts          # Gemini-specific types (internal use only)
├── parse.ts          # Gemini → Claude transformation
├── loadSession.ts    # Session loading from JSON files
├── execute.ts        # CLI execution and streaming
├── detectCli.ts      # CLI detection
├── index.ts          # Module exports
├── parse.test.ts     # Parser tests with 10 fixtures
├── loadSession.test.ts  # Session loading tests
└── detectCli.test.ts    # CLI detection tests
```

### Integration Points

**Main Package**:
- `src/index.ts` - Add Gemini routing to `loadMessages()` and `execute()`
- `src/utils/getCapabilities.ts` - Add Gemini CLI detection and capabilities

**Fixtures** (already created):
- `tests/fixtures/gemini/individual/` - 10 tool-specific examples
- `tests/fixtures/gemini/full/` - 6 complete session files

## Implementation Details

### 1. Types (`src/gemini/types.ts`)

Define Gemini-specific types for internal use (NOT exported from main package):

```typescript
// Session file structure
export interface GeminiSession {
  sessionId: string;
  projectHash: string;
  startTime: string;
  lastUpdated: string;
  messages: GeminiMessage[];
}

export interface GeminiMessage {
  id: string;
  timestamp: string;
  type: 'user' | 'gemini';
  content: string;
  toolCalls?: GeminiToolCall[];
  thoughts?: GeminiThought[];
  tokens?: GeminiTokens;
  model?: string;
}

export interface GeminiToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: GeminiFunctionResponse[];
  status?: 'success' | 'error' | 'cancelled';
  timestamp?: string;
  displayName?: string;
  description?: string;
  resultDisplay?: string;
  renderOutputAsMarkdown?: boolean;
}

export interface GeminiFunctionResponse {
  functionResponse: {
    id: string;
    name: string;
    response: {
      output?: string;
      error?: string;
    };
  };
}

export interface GeminiThought {
  subject: string;
  description: string;
  timestamp: string;
}

export interface GeminiTokens {
  input: number;
  output: number;
  cached: number;
  thoughts: number;
  tool: number;
  total: number;
}
```

### 2. Parser (`src/gemini/parse.ts`)

**Reference Implementation**: Use `src/codex/parse.ts` as the template - follow the exact same structure and comment style.

**Transformation Logic**:

```typescript
export function parse(geminiMessage: GeminiMessage): UnifiedMessage {
  const content: UnifiedContent[] = [];

  // 1. Transform thoughts → thinking blocks
  if (geminiMessage.thoughts && geminiMessage.thoughts.length > 0) {
    for (const thought of geminiMessage.thoughts) {
      content.push({
        type: 'thinking',
        thinking: `${thought.subject}: ${thought.description}`,
      });
    }
  }

  // 2. Transform toolCalls → tool_use + tool_result blocks
  if (geminiMessage.toolCalls && geminiMessage.toolCalls.length > 0) {
    for (const toolCall of geminiMessage.toolCalls) {
      // Tool use
      const claudeToolName = mapGeminiToolToClaude(toolCall.name);
      const claudeInput = transformToolInput(toolCall.name, toolCall.args);

      content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: claudeToolName,
        input: claudeInput,
      });

      // Tool result (if present)
      if (toolCall.result && toolCall.result.length > 0) {
        const response = toolCall.result[0].functionResponse.response;
        const resultContent = response.output || response.error || '';
        const isError = toolCall.status === 'error' || !!response.error;

        content.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: resultContent,
          is_error: isError,
        });
      }
    }
  }

  // 3. Add text content (if not empty)
  if (geminiMessage.content && geminiMessage.content.trim()) {
    content.push({
      type: 'text',
      text: geminiMessage.content,
    });
  }

  // 4. Build unified message (Claude format)
  return {
    id: geminiMessage.id,
    role: geminiMessage.type === 'user' ? 'user' : 'assistant',
    content: content.length > 0 ? content : geminiMessage.content,
    timestamp: new Date(geminiMessage.timestamp).getTime(),
    tool: 'gemini',
    model: geminiMessage.model,
    usage: geminiMessage.tokens ? {
      input_tokens: geminiMessage.tokens.input,
      output_tokens: geminiMessage.tokens.output,
      total_tokens: geminiMessage.tokens.total,
    } : undefined,
    _original: geminiMessage,
  };
}
```

### 3. Tool Name Mapping

| Gemini Tool           | Claude Tool | Transformation Notes |
|-----------------------|-------------|----------------------|
| `read_file`           | `Read`      | `absolute_path` → `file_path` |
| `write_file`          | `Write`     | Direct mapping |
| `replace`             | `Edit`      | Remove `instruction` field |
| `list_directory`      | `Glob`      | Add `pattern: '*'` |
| `run_shell_command`   | `Bash`      | Direct mapping |
| `google_web_search`   | `WebSearch` | Gemini-specific, pass through |

**Tool Input Transformations**:

```typescript
function transformToolInput(
  geminiToolName: string,
  geminiArgs: Record<string, unknown>
): Record<string, unknown> {
  // Read file
  if (geminiToolName === 'read_file') {
    return {
      file_path: geminiArgs.absolute_path || geminiArgs.file_path,
    };
  }

  // Write file
  if (geminiToolName === 'write_file') {
    return {
      file_path: geminiArgs.file_path,
      content: geminiArgs.content,
    };
  }

  // Replace (edit)
  if (geminiToolName === 'replace') {
    return {
      file_path: geminiArgs.file_path,
      old_string: geminiArgs.old_string,
      new_string: geminiArgs.new_string,
      // Omit 'instruction' field
    };
  }

  // List directory
  if (geminiToolName === 'list_directory') {
    return {
      pattern: '*',
      path: geminiArgs.path,
    };
  }

  // Shell command
  if (geminiToolName === 'run_shell_command') {
    return {
      command: geminiArgs.command,
      description: geminiArgs.description,
    };
  }

  // Web search - pass through
  if (geminiToolName === 'google_web_search') {
    return geminiArgs;
  }

  // Default: pass through
  return geminiArgs;
}
```

### 4. Session Loading (`src/gemini/loadSession.ts`)

**Session Storage Location**: `~/.gemini/tmp/{project-hash}/chats/`

**Project Hash**: SHA-256 of absolute project path

```typescript
export async function loadSession(
  options: LoadGeminiSessionOptions
): Promise<UnifiedMessage[]> {
  const projectPath = options.projectPath || process.cwd();
  const projectHash = calculateProjectHash(projectPath);
  const sessionDir = getGeminiSessionDir(projectHash);

  // Find session file
  const sessionFile = options.sessionId
    ? findSessionById(sessionDir, options.sessionId)
    : findMostRecentSession(sessionDir);

  if (!sessionFile) {
    throw new Error(`No Gemini session found for project: ${projectPath}`);
  }

  // Read and parse session JSON
  const sessionData = JSON.parse(
    fs.readFileSync(sessionFile, 'utf-8')
  ) as GeminiSession;

  // Transform each Gemini message to Claude format
  return sessionData.messages.map((msg) => parse(msg));
}

function calculateProjectHash(projectPath: string): string {
  const absolutePath = path.resolve(projectPath);
  return crypto.createHash('sha256').update(absolutePath).digest('hex');
}

function getGeminiSessionDir(projectHash: string): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.gemini', 'tmp', projectHash);
}
```

### 5. CLI Detection (`src/gemini/detectCli.ts`)

**Environment Variable**: `GEMINI_CLI_PATH`

**Common Paths**:
- `/usr/local/bin/gemini`
- `~/.local/share/mise/installs/node/*/bin/gemini`
- `~/.npm-global/bin/gemini`

```typescript
export function detectCli(): string | null {
  // 1. Check env var
  if (process.env.GEMINI_CLI_PATH && existsSync(process.env.GEMINI_CLI_PATH)) {
    return process.env.GEMINI_CLI_PATH;
  }

  // 2. Try PATH
  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    const result = execSync(`${whichCmd} gemini`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const path = result.trim().split('\n')[0];
    if (existsSync(path)) return path;
  } catch {}

  // 3. Check common paths
  const commonPaths = [
    '/usr/local/bin/gemini',
    path.join(os.homedir(), '.local/share/mise/installs/node/*/bin/gemini'),
    path.join(os.homedir(), '.npm-global/bin/gemini'),
  ];

  for (const searchPath of commonPaths) {
    if (searchPath.includes('*')) continue; // Skip glob patterns
    if (existsSync(searchPath)) return searchPath;
  }

  return null;
}
```

### 6. CLI Execution (`src/gemini/execute.ts`)

**Command Structure**:

```bash
gemini --output-format stream-json --approval-mode auto_edit "prompt"
```

**Permission Mode Mapping**:
- `default` → `--approval-mode default`
- `acceptEdits` → `--approval-mode auto_edit`
- `bypassPermissions` → `--yolo`

**Note**: Streaming format differs from session file format (see `/.agent/docs/gemini.md` for details).

### 7. Capabilities

```typescript
gemini: {
  supportsSlashCommands: false,
  supportsModels: true,
  models: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
  ],
  supportsWebSearch: true,    // Unique to Gemini!
  supportsThinking: true       // Via thoughts array
}
```

## Testing Strategy

### Unit Tests with Fixtures

**`src/gemini/parse.test.ts`** - Test all 10 individual fixtures:

1. `tool-read_file.json` → Read tool transformation
2. `tool-write-file.json` → Write tool + thoughts transformation
3. `tool-replace.json` → Edit tool transformation
4. `tool-run_shell_command.json` → Bash tool transformation
5. `tool-google_web_search.json` → WebSearch tool (Gemini-specific)
6. `tool-list_directory.json` → Glob transformation
7. `tool-result-error.json` → Error handling
8. `tool-result-cancelled.json` → Cancelled operation handling
9. `tool-result-success.json` → Success handling
10. `gemini-with-thoughts.json` → Thinking blocks transformation

**Test Structure**:

```typescript
import { parse } from './parse';
import { describe, it, expect } from 'vitest';
import type { GeminiMessage } from './types';

// Import fixtures
import toolReadFile from '../../tests/fixtures/gemini/individual/tool-read_file.json';
import toolWriteFile from '../../tests/fixtures/gemini/individual/tool-write-file.json';
// ... import all 10 fixtures

describe('parse', () => {
  it('should transform read_file to Read tool', () => {
    const result = parse(toolReadFile as GeminiMessage);

    expect(result.role).toBe('assistant');
    expect(result.tool).toBe('gemini');
    expect(result._original).toEqual(toolReadFile);

    // Verify tool_use block
    const toolUse = result.content.find(c => c.type === 'tool_use');
    expect(toolUse).toBeDefined();
    if (toolUse && toolUse.type === 'tool_use') {
      expect(toolUse.name).toBe('Read');
      expect(toolUse.input.file_path).toContain('main.py');
    }

    // Verify tool_result block
    const toolResult = result.content.find(c => c.type === 'tool_result');
    expect(toolResult).toBeDefined();
    if (toolResult && toolResult.type === 'tool_result') {
      expect(toolResult.tool_use_id).toBe(toolUse.id);
      expect(toolResult.content).toContain('def main()');
    }
  });

  // ... tests for all other fixtures
});
```

**`src/gemini/loadSession.test.ts`** - Test full session loading:

```typescript
import fullSession from '../../tests/fixtures/gemini/full/session-2025-10-29T10-36-9c9a14e1.json';

describe('loadSession', () => {
  it('should parse full session with multiple messages', () => {
    const messages = fullSession.messages.map(parse);

    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');

    // Verify tool transformation
    const assistantMsg = messages[1];
    const toolUse = assistantMsg.content.find(c => c.type === 'tool_use');
    expect(toolUse).toBeDefined();
    if (toolUse && toolUse.type === 'tool_use') {
      expect(toolUse.name).toBe('Read'); // Transformed from read_file
    }
  });
});
```

### E2E Tests

**`tests/e2e/gemini/basic.test.ts`** (requires Gemini CLI installed):

```typescript
import { execute } from '../../../src/gemini/execute';
import { detectCli } from '../../../src/gemini/detectCli';

describe('Gemini E2E', () => {
  it('should detect Gemini CLI', () => {
    const cliPath = detectCli();
    expect(cliPath).toBeTruthy();
  });

  it('should execute basic command', async () => {
    const result = await execute({
      prompt: 'Say hello',
      permissionMode: 'acceptEdits',
      workingDir: process.cwd(),
    });

    expect(result.success).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
  });
});
```

## Files to Create/Modify

### New Files (10)

1. `src/gemini/types.ts` - Gemini-specific types
2. `src/gemini/parse.ts` - Gemini → Claude transformation
3. `src/gemini/loadSession.ts` - Session loading
4. `src/gemini/execute.ts` - CLI execution
5. `src/gemini/detectCli.ts` - CLI detection
6. `src/gemini/index.ts` - Module exports
7. `src/gemini/parse.test.ts` - Parser tests (10 fixtures)
8. `src/gemini/loadSession.test.ts` - Session tests
9. `src/gemini/detectCli.test.ts` - Detection tests
10. `tests/e2e/gemini/basic.test.ts` - E2E tests

### Modified Files (3)

1. `src/index.ts` - Add Gemini routing
2. `src/utils/getCapabilities.ts` - Add Gemini capabilities
3. `README.md` - Document Gemini support

### Existing Fixtures (16 files, already created)

- `tests/fixtures/gemini/individual/` - 10 individual tool examples
- `tests/fixtures/gemini/full/` - 6 complete session files

## Success Criteria

- [ ] All 10 individual fixtures parse correctly to Claude format
- [ ] All 6 full session fixtures load and transform correctly
- [ ] Tool names transformed: `read_file` → `Read`, `write_file` → `Write`, etc.
- [ ] Thoughts array → thinking blocks
- [ ] Embedded tool results → separate `tool_result` blocks
- [ ] Original Gemini data preserved in `_original`
- [ ] Token usage extracted and mapped to unified format
- [ ] Web search tool preserved (Gemini-specific feature)
- [ ] Error and cancelled states handled correctly
- [ ] Unit tests achieve >90% coverage using fixtures
- [ ] Frontend receives Claude-compatible format (no frontend changes needed)
- [ ] TypeScript compilation succeeds with no errors
- [ ] CLI detection works across platforms
- [ ] E2E tests pass with real Gemini CLI

## Implementation Notes

### 1. Follow Codex Pattern

Use `src/codex/parse.ts` as the reference implementation:
- Same file structure
- Same comment style
- Similar transformation logic
- Same helper function patterns

### 2. Two Parsing Paths

- **Session files**: Complete JSON object with messages array (this spec)
- **Streaming output**: JSONL format (different structure, see `/.agent/docs/gemini.md`)

### 3. Transformation Order

When building content array:
1. Thoughts → thinking blocks (first)
2. Tool calls → tool_use blocks
3. Embedded results → tool_result blocks
4. Text content → text blocks (last)

### 4. Original Data Preservation

Always store complete Gemini message in `_original` for debugging:

```typescript
_original: geminiMessage
```

### 5. Frontend Compatibility

Frontend code requires **ZERO changes** because:
- It already handles Claude format
- Gemini transforms to Claude format
- Original Gemini data available in `_original` for debugging

## Dependencies

- Existing packages: `crypto`, `fs`, `path`, `os`, `child_process`
- Dev dependencies: `vitest`, `@types/node`
- No new dependencies required

## Timeline

| Task | Estimated Time |
|------|----------------|
| Types definition | 1 hour |
| Parse implementation with tests | 4-5 hours |
| Session loading with tests | 2 hours |
| CLI detection with tests | 1 hour |
| Execute implementation | 2-3 hours |
| Integration (index, capabilities) | 1 hour |
| E2E tests | 1-2 hours |
| Documentation | 1 hour |
| **Total** | **11-14 hours** |

## References

- Gemini CLI Documentation: `/.agent/docs/gemini.md`
- Codex Parser Reference: `src/codex/parse.ts`
- Unified Types: `src/types/unified.ts`
- Fixtures: `tests/fixtures/gemini/`
- Agent CLI SDK Guide: `packages/agent-cli-sdk/CLAUDE.md`

## Next Steps

1. Create `src/gemini/types.ts` with Gemini-specific interfaces
2. Implement `src/gemini/parse.ts` following Codex pattern
3. Write unit tests for all 10 individual fixtures
4. Implement `src/gemini/loadSession.ts`
5. Test with full session fixtures
6. Implement `src/gemini/detectCli.ts`
7. Implement `src/gemini/execute.ts`
8. Update main package integration points
9. Write E2E tests
10. Update documentation
