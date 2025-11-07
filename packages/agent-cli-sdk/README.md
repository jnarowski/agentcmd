# @repo/agent-cli-sdk

TypeScript SDK for orchestrating AI-powered CLI tools (Claude Code, OpenAI Codex) in development workflows.

## Features

- **Unified API** - Single interface for multiple AI CLI tools
- **Type-safe** - Full TypeScript support with strict typing
- **Session Management** - Load and parse AI CLI session histories
- **Execute Commands** - Run AI CLI tools programmatically with callbacks
- **JSON Extraction** - Automatically extract and parse JSON from AI responses
- **Cross-platform** - Works on macOS, Linux, and Windows

## Installation

```bash
# Using pnpm (recommended for monorepos)
pnpm add @repo/agent-cli-sdk

# Using npm
npm install @repo/agent-cli-sdk

# Using yarn
yarn add @repo/agent-cli-sdk
```

## Requirements

- Node.js >= 22.0.0
- AI CLI tool:
  - Claude Code CLI (for Claude functionality)
  - Codex CLI (for Codex functionality)
- Optional: Zod (for enhanced type validation)

## Quick Start

### Execute a Command

The SDK provides a unified interface that works with both Claude and Codex:

```typescript
import { execute } from '@repo/agent-cli-sdk';

// Using Claude
const claudeResult = await execute({
  tool: 'claude',
  prompt: 'List all TypeScript files in the src directory',
  workingDir: '/path/to/project',
  verbose: true,
  onEvent: ({ message }) => {
    if (message) console.log('Message:', message);
  }
});

// Using Codex
const codexResult = await execute({
  tool: 'codex',
  prompt: 'List all TypeScript files in the src directory',
  workingDir: '/path/to/project',
  verbose: true,
  onEvent: ({ message }) => {
    if (message) console.log('Message:', message);
  }
});

console.log('Final output:', claudeResult.data);
```

### Load Session Messages

Load message history from either Claude or Codex sessions:

```typescript
import { loadMessages } from '@repo/agent-cli-sdk';

// Load Claude session
const claudeMessages = await loadMessages({
  tool: 'claude',
  sessionId: 'your-session-id',
  projectPath: '/path/to/project'
});

// Load Codex session
const codexMessages = await loadMessages({
  tool: 'codex',
  sessionId: '01997e76-d124-7592-9cac-2ec05abbca08'
  // Note: Codex sessions are globally indexed, projectPath is optional
});

console.log(`Loaded ${claudeMessages.length} messages`);
claudeMessages.forEach(msg => {
  console.log(`[${msg.role}]:`, msg.content);
});
```

### Extract JSON from AI Responses

Both Claude and Codex support automatic JSON extraction:

```typescript
import { execute } from '@repo/agent-cli-sdk';

interface PackageInfo {
  name: string;
  version: string;
  dependencies: string[];
}

const result = await execute<PackageInfo>({
  tool: 'codex', // or 'claude'
  prompt: 'Analyze package.json and return JSON with name, version, and dependencies',
  json: true
});

if (typeof result.data === 'object' && result.data !== null) {
  console.log('Package name:', result.data.name);
  console.log('Version:', result.data.version);
}
```

## API Reference

### `execute(options)`

Execute an AI CLI command programmatically.

**Parameters:**

```typescript
interface ExecuteOptions {
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  prompt: string;
  workingDir?: string;
  timeout?: number;
  verbose?: boolean;
  extractJSON?: boolean;
  onMessage?: (message: UnifiedMessage) => void;
  onEvent?: (event: unknown) => void;
}
```

**Returns:** `Promise<ExecuteResult<T>>`

```typescript
interface ExecuteResult<T = unknown> {
  success: boolean;
  exitCode: number;
  sessionId: string;
  duration: number;
  messages: UnifiedMessage[];
  data: T; // Text output or parsed JSON
  error?: string;
}
```

**Example:**

```typescript
const result = await execute({
  tool: 'claude',
  prompt: 'Create a new React component called Button',
  workingDir: './src/components',
  verbose: true,
  onMessage: (msg) => {
    if (msg.role === 'assistant') {
      console.log('AI:', msg.content);
    }
  }
});
```

### `loadMessages(options)`

Load messages from an AI CLI session.

**Parameters:**

```typescript
interface LoadMessagesOptions {
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  sessionId: string;
  projectPath?: string;
}
```

**Returns:** `Promise<UnifiedMessage[]>`

**Example:**

```typescript
const messages = await loadMessages({
  tool: 'claude',
  sessionId: 'abc123',
  projectPath: process.cwd()
});

// Filter for tool uses
const toolUses = messages.filter(msg =>
  msg.content.some(block => block.type === 'tool_use')
);
```

### `detectClaudeCli()` / `detectCodexCli()`

Detect the path to AI CLI executables.

**Returns:** `string | null`

**Example:**

```typescript
import { detectClaudeCli, detectCodexCli } from '@repo/agent-cli-sdk';

const claudePath = detectClaudeCli();
if (claudePath) {
  console.log('Claude CLI found at:', claudePath);
} else {
  console.error('Claude CLI not found');
}

const codexPath = detectCodexCli();
if (codexPath) {
  console.log('Codex CLI found at:', codexPath);
} else {
  console.error('Codex CLI not found');
}
```

**Environment Variables:**
- `CLAUDE_CLI_PATH` - Custom path to Claude CLI
- `CODEX_CLI_PATH` - Custom path to Codex CLI

### `extractJSON(text, schema?)`

Extract and parse JSON from text output.

**Parameters:**

```typescript
function extractJSON<T = unknown>(
  text: string,
  schema?: ZodSchema<T>
): T | null
```

**Returns:** Parsed JSON object or `null` if no valid JSON found

**Example:**

```typescript
import { extractJSON } from '@repo/agent-cli-sdk';
import { z } from 'zod';

const text = 'Here is the data: {"name": "John", "age": 30}';

// Without schema
const data = extractJSON(text);

// With Zod schema validation
const userSchema = z.object({
  name: z.string(),
  age: z.number()
});

const validatedData = extractJSON(text, userSchema);
```

## Types

### `UnifiedMessage`

Standardized message format across different AI tools. Both Claude and Codex outputs are normalized to this format:

```typescript
interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: UnifiedContent[];
  timestamp: number;
  tool: 'claude' | 'codex';
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheReadTokens?: number;
  };
  _original?: unknown; // Original provider event for debugging
}

type UnifiedContent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  | { type: 'slash_command'; name: string; args?: string[] };
```

### Provider Compatibility

The SDK automatically transforms provider-specific formats into the unified format:

| Feature | Codex | Claude | SDK Output |
|---------|-------|--------|------------|
| Tool calls | `function_call` | `tool_use` | `tool_use` |
| Tool results | `function_call_output` | `tool_result` | `tool_result` |
| Tool names | `shell` | `Bash` | `Bash` |
| Reasoning | separate `reasoning` event | inline `thinking` block | `thinking` |
| Content | `input_text` / `output_text` | `text` | `text` |

**Key Point:** Frontend components can consume both Claude and Codex messages identically without any modification.

## Architecture

The SDK uses a functional approach with reusable utilities and a unified type system that works across all AI CLI tools.

### Core Principles

- **Functional design** - Pure utility functions, no wrappers or base classes
- **Unified types** - Single `UnifiedMessage` format across all tools
- **Tool-specific implementation** - Each tool has its own execute/parse logic
- **Shared utilities** - Common patterns extracted into reusable functions

### Key Utilities

**Line Buffering** (`utils/lineBuffer.ts`)
- Handles incomplete lines in streaming JSONL output
- Ensures complete lines before parsing
- Used by Claude and Codex execute functions

**CLI Detection** (`utils/cliDetection.ts`)
- Generic pattern for finding installed CLIs
- Checks environment variables, PATH, and common install locations
- Used by all tool-specific detectCli functions

**Arg Building** (`utils/argBuilding.ts`)
- Converts options to CLI flags
- Permission mode → CLI flags
- Working directory → CLI flags

**Type System** (`types/`)
- `UnifiedMessage` - Standardized message format
- `PermissionMode` - Shared permission types
- `BaseExecuteOptions` - Common execute options pattern

### Tool-Specific Implementations

Each tool (Claude, Codex, Gemini) maintains its own:
- `execute.ts` - CLI execution and output parsing
- `loadSession.ts` - Session history loading
- `parse.ts` - Tool-specific format → UnifiedMessage conversion
- `detectCli.ts` - CLI installation detection
- `types.ts` - Tool-specific type definitions

The main `index.ts` routes to tool-specific implementations based on the `tool` parameter.

## Advanced Usage

### Permission Modes

Control how the CLI handles permission requests. Both Claude and Codex support permission modes with similar semantics:

```typescript
import { execute } from '@repo/agent-cli-sdk';

// Claude permission modes
const claudeResult = await execute({
  tool: 'claude',
  prompt: 'Refactor this code',
  permissionMode: 'acceptEdits', // Auto-approve edit operations
});

// Codex permission modes
const codexResult = await execute({
  tool: 'codex',
  prompt: 'Refactor this code',
  permissionMode: 'acceptEdits', // Same interface, different flags internally
});
```

**Available permission modes:**
- `'default'` - Standard mode with permission prompts
- `'plan'` - Read-only analysis mode (no file modifications)
- `'acceptEdits'` - Auto-approve file edit operations
- `'bypassPermissions'` - Dangerous mode for isolated environments (skip all checks)

**Internal Mapping (handled automatically):**

| Mode | Claude Flags | Codex Flags |
|------|-------------|-------------|
| `default` | Standard interactive | `-a untrusted -s workspace-write` |
| `plan` | Read-only mode | `-a on-request -s read-only` |
| `acceptEdits` | Auto-accept edits | `-a on-failure -s workspace-write` |
| `bypassPermissions` | Bypass all | `-a never -s danger-full-access` |

### Session Management

Resume or continue existing sessions:

```typescript
// Resume a Claude session
const claudeResult = await execute({
  tool: 'claude',
  prompt: 'Continue the refactoring',
  sessionId: 'previous-session-id',
  resume: true
});

// Resume a Codex session
const codexResult = await execute({
  tool: 'codex',
  prompt: 'Continue the refactoring',
  sessionId: '01997e76-d124-7592-9cac-2ec05abbca08'
  // Codex: session ID is in session_meta event
});
```

### Event Streaming

Monitor events in real-time with typed callbacks:

```typescript
const result = await execute({
  tool: 'codex', // or 'claude'
  prompt: 'Build the project',
  onEvent: ({ raw, event, message }) => {
    console.log('Raw JSONL:', raw);
    console.log('Parsed event:', event);
    if (message) {
      console.log('Unified message:', message);
    }
  },
  onStdout: ({ raw, events, messages }) => {
    console.log(`Received ${messages.length} messages so far`);
  },
  onStderr: (chunk) => {
    console.error('Error output:', chunk);
  }
});
```

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Type check
pnpm check-types

# Lint
pnpm lint

# Format code
pnpm format

# Run all checks
pnpm check
```

## Project Structure

```
agent-cli-sdk/
├── src/
│   ├── claude/          # Claude-specific implementation
│   │   ├── detectCli.ts
│   │   ├── execute.ts
│   │   ├── loadSession.ts
│   │   ├── parse.ts
│   │   └── types.ts
│   ├── codex/           # Codex-specific implementation
│   │   ├── detectCli.ts
│   │   ├── execute.ts
│   │   ├── loadSession.ts
│   │   ├── parse.ts
│   │   └── types.ts
│   ├── utils/           # Shared utilities
│   │   ├── extractJson.ts
│   │   └── spawn.ts
│   ├── types/           # Unified type definitions
│   │   └── unified.ts
│   └── index.ts         # Main entry point with routing
├── examples/            # Usage examples
│   ├── claude/          # Claude examples
│   └── codex/           # Codex examples (planned)
├── tests/
│   ├── fixtures/        # Test fixtures
│   │   ├── claude/      # Claude JSONL examples
│   │   └── codex/       # Codex JSONL examples
│   └── e2e/             # E2E tests
│       └── claude/      # Claude E2E tests
├── docs/                # Documentation
│   ├── CLAUDE_CLI.md    # Claude CLI research
│   └── CODEX_CLI.md     # Codex CLI research
└── dist/                # Build output (generated)
```

## Examples

See the [examples directory](./examples) for comprehensive usage examples:

**Claude Examples:**
- [Basic Execution](./examples/claude/basic-execute.ts)
- [JSON Extraction](./examples/claude/json-extraction.ts)
- [Session Continuation](./examples/claude/session-continuation.ts)
- [Error Handling](./examples/claude/error-handling.ts)
- [Streaming Callbacks](./examples/claude/streaming-callbacks.ts)

**Codex Examples:**
- [Basic Execution](./examples/codex/basic-execute.ts)
- [JSON Extraction](./examples/codex/json-extraction.ts)
- [Session Loading](./examples/codex/load-session.ts)

## Provider Support Status

| Provider | Execute | Load Session | CLI Detection | Tests | Status |
|----------|---------|--------------|---------------|-------|--------|
| Claude   | ✅      | ✅           | ✅            | ✅    | Production |
| Codex    | ✅      | ✅           | ✅            | ✅    | Production |
| Gemini   | 🟡      | 🟡           | ✅            | 🟡    | Experimental (70%) |
| Cursor   | ❌      | ❌           | ❌            | ❌    | Planned |

## Current Limitations

- **Node.js 22+**: Requires Node.js version 22.0.0 or higher
- **Platform Detection**: Automatic CLI detection works best on macOS and Linux
- **Session Storage**: Different providers use different session storage formats
  - Claude: `~/.claude/projects/{encoded-path}/{sessionId}.jsonl`
  - Codex: `~/.codex/sessions/YYYY/MM/DD/rollout-{timestamp}-{uuid}.jsonl`

## Roadmap

- ✅ Support for Claude Code
- ✅ Support for OpenAI Codex
- 📋 Support for Google Gemini
- 📋 Support for Cursor AI
- 📋 Enhanced error handling and recovery
- 📋 CLI installation helpers

## Troubleshooting

### CLI Not Found

**Claude CLI Not Found:**
1. Install Claude Code: https://docs.anthropic.com/claude/docs/claude-code
2. Set the `CLAUDE_CLI_PATH` environment variable
3. Verify installation: `which claude`

```bash
export CLAUDE_CLI_PATH=/path/to/claude
```

**Codex CLI Not Found:**
1. Install Codex CLI (OpenAI)
2. Set the `CODEX_CLI_PATH` environment variable
3. Verify installation: `which codex`

```bash
export CODEX_CLI_PATH=/path/to/codex
```

### Permission Errors

If you encounter permission issues:

1. Check that the working directory exists and is writable
2. Verify the CLI has necessary permissions
3. Try using appropriate permission mode:
   - `permissionMode: 'acceptEdits'` for automated file edits
   - `permissionMode: 'bypassPermissions'` for isolated/containerized environments (use with caution)

### Session Not Found

**Claude sessions:**
- Stored at: `~/.claude/projects/{encoded-path}/{sessionId}.jsonl`
- Requires matching project path
- Session ID is part of filename

**Codex sessions:**
- Stored at: `~/.codex/sessions/YYYY/MM/DD/rollout-{timestamp}-{uuid}.jsonl`
- Globally indexed (no project path needed)
- Session ID is UUID from `session_meta` event

### Type Errors

If you encounter TypeScript errors with JSON extraction:

```typescript
// ❌ Wrong
const result = await execute({ json: true });
console.log(result.data.name); // Type error

// ✅ Correct
const result = await execute<{ name: string }>({ json: true });
if (typeof result.data === 'object' && result.data !== null) {
  console.log(result.data.name); // Type-safe
}
```

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass and code is properly formatted before submitting PRs.

```bash
pnpm check  # Run all checks
```
