# Agent CLI SDK Examples

This directory contains examples demonstrating how to use the `agent-cli-sdk` package with Claude Code, OpenAI Codex, and Gemini.

## Examples

### Loaders

- **[loaders/load-claude-session.ts](./loaders/load-claude-session.ts)** - Load and inspect messages from a saved Claude session

### Claude Code Examples

Located in `examples/claude/`:

- **[basic-execute.ts](./claude/basic-execute.ts)** - Simple example showing how to run a basic Claude command
- **[json-extraction.ts](./claude/json-extraction.ts)** - Extract structured JSON data from Claude's responses
- **[streaming-callbacks.ts](./claude/streaming-callbacks.ts)** - Process events and messages in real-time using callbacks
- **[session-continuation.ts](./claude/session-continuation.ts)** - Maintain context across multiple executions using session IDs
- **[error-handling.ts](./claude/error-handling.ts)** - Handle timeouts, errors, and session resumption after failures

### OpenAI Codex Examples

Located in `examples/codex/`:

- **[basic-execute.ts](./codex/basic-execute.ts)** - Simple example showing how to run a basic Codex command
- **[json-extraction.ts](./codex/json-extraction.ts)** - Extract structured JSON data from Codex's responses
- **[streaming-callbacks.ts](./codex/streaming-callbacks.ts)** - Process events and messages in real-time using callbacks
- **[session-continuation.ts](./codex/session-continuation.ts)** - Maintain context across multiple executions using thread IDs
- **[error-handling.ts](./codex/error-handling.ts)** - Handle timeouts, errors, and CLI detection failures
- **[permission-modes.ts](./codex/permission-modes.ts)** - Demonstrates different permission modes (default, plan, acceptEdits, bypassPermissions)
- **[load-session.ts](./codex/load-session.ts)** - Load and analyze a Codex session from disk

### Gemini Examples

Located in `examples/gemini/`:

- **[basic-execute.ts](./gemini/basic-execute.ts)** - Simple example showing how to run a basic Gemini command
- **[json-extraction.ts](./gemini/json-extraction.ts)** - Extract structured JSON data from Gemini's responses
- **[streaming-callbacks.ts](./gemini/streaming-callbacks.ts)** - Monitor stdout/stderr streams in real-time
- **[error-handling.ts](./gemini/error-handling.ts)** - Handle timeouts, quota errors, and CLI detection failures
- **[session-continuation.ts](./gemini/session-continuation.ts)** - ⚠️ Demonstrates Gemini's limitation: NO session continuation support

## Running Examples

All examples are executable TypeScript files. You can run them directly with `tsx`:

```bash
# Run Claude Code examples from the package root
tsx examples/claude/basic-execute.ts
tsx examples/claude/json-extraction.ts

# Run Codex examples
tsx examples/codex/basic-execute.ts
tsx examples/codex/permission-modes.ts

# Run Gemini examples
tsx examples/gemini/basic-execute.ts
tsx examples/gemini/session-continuation.ts

# Or make them executable and run directly
chmod +x examples/claude/basic-execute.ts
./examples/claude/basic-execute.ts
```

## Prerequisites

Make sure you have:

### For Claude Code Examples
1. Claude CLI installed and configured
2. The `agent-cli-sdk` package built (`pnpm build`)
3. `tsx` installed (or use `ts-node`)

### For Codex Examples
1. OpenAI Codex CLI installed and configured
2. Set `CODEX_CLI_PATH` environment variable (if not in PATH)
3. The `agent-cli-sdk` package built (`pnpm build`)
4. `tsx` installed (or use `ts-node`)

### For Gemini Examples
1. Gemini CLI installed and configured
2. Set `GEMINI_CLI_PATH` environment variable (if not in PATH)
3. The `agent-cli-sdk` package built (`pnpm build`)
4. `tsx` installed (or use `ts-node`)

```bash
# Install tsx globally if needed
npm install -g tsx

# Or use with pnpm
pnpm install -g tsx

# Set CLI paths (if needed)
export CODEX_CLI_PATH=/path/to/codex
export GEMINI_CLI_PATH=/path/to/gemini
```

## API Overview

The unified API works with Claude Code, OpenAI Codex, and Gemini using the same interface:

```typescript
import { execute } from '@repo/agent-cli-sdk';

// Use with Claude Code
const claudeResult = await execute({
  tool: 'claude',
  prompt: 'Your prompt here',
  json: true,        // Enable JSON extraction
  verbose: false,    // Hide spawn logging
  timeout: 60000,    // Timeout in milliseconds
  onEvent: ({ raw, event, message }) => {
    // Process events in real-time
  }
});

// Use with OpenAI Codex
const codexResult = await execute({
  tool: 'codex',
  prompt: 'Your prompt here',
  permissionMode: 'default', // Control file operations
  json: true,
  verbose: false,
  onEvent: ({ raw, event, message }) => {
    // Same callback interface for both tools
  }
});

// Use with Gemini
const geminiResult = await execute({
  tool: 'gemini',
  prompt: 'Your prompt here',
  json: true,
  verbose: false,
  onStdout: (chunk) => {
    // Monitor stdout in real-time
  },
  onStderr: (chunk) => {
    // Monitor stderr (including quota errors)
  }
});

// Result structure (same for all tools)
console.log(result.success);    // boolean - whether command succeeded
console.log(result.exitCode);   // number - process exit code
console.log(result.sessionId);  // string - session/thread ID
console.log(result.duration);   // number - execution time in ms
console.log(result.messages);   // UnifiedMessage[] - all messages
console.log(result.data);       // T | string - extracted data or text
console.log(result.error);      // string | undefined - error message if failed
```

## Key Features

### Result-Based Error Handling

The SDK doesn't throw exceptions for command failures or timeouts. Instead, check `result.success`:

```typescript
const result = await execute({ /* ... */ });

if (!result.success) {
  console.error('Command failed:', result.error);
  // Handle gracefully
}
```

### JSON Extraction

Use `json: true` to automatically parse JSON from responses:

```typescript
interface MyData { files: string[] }

const result = await execute<MyData>({
  prompt: 'List files as JSON',
  json: true
});

if (typeof result.data === 'object') {
  console.log(result.data.files); // Type-safe access
}
```

### Real-Time Events

Use `onEvent` callback to process events as they stream:

```typescript
await execute({
  prompt: 'Analyze code',
  onEvent: ({ raw, event, message }) => {
    if (message?.role === 'assistant') {
      // Handle assistant messages in real-time
    }
  }
});
```

### Session Continuation

Maintain context across multiple executions using session IDs:

**Claude Code (requires resume flag):**
```typescript
import { randomUUID } from 'crypto';

const sessionId = randomUUID();

const result1 = await execute({
  tool: 'claude',
  prompt: 'My name is Tony',
  sessionId,
});

const result2 = await execute({
  tool: 'claude',
  prompt: 'What is my name?',
  sessionId: result1.sessionId,
  resume: true, // Must set resume: true for Claude
});
```

**OpenAI Codex (automatic continuation):**
```typescript
const result1 = await execute({
  tool: 'codex',
  prompt: 'My name is Tony',
});

const result2 = await execute({
  tool: 'codex',
  prompt: 'What is my name?',
  sessionId: result1.sessionId, // Codex automatically continues
});
```

**⚠️ Gemini (NO session continuation support):**
```typescript
const result1 = await execute({
  tool: 'gemini',
  prompt: 'My name is Tony',
});

// ⚠️ This creates a NEW session - Gemini will NOT remember
const result2 = await execute({
  tool: 'gemini',
  prompt: 'What is my name?',
  sessionId: result1.sessionId, // Ignored by Gemini CLI
  resume: true, // Also ignored
});

// result2.sessionId !== result1.sessionId (each call gets new session)
```

### Permission Modes (Codex)

Codex supports different permission modes for controlling file operations:

```typescript
// Default: workspace-write sandbox
await execute({ tool: 'codex', permissionMode: 'default' });

// Plan mode: read-only analysis
await execute({ tool: 'codex', permissionMode: 'plan' });

// Accept edits: auto-accept file changes
await execute({ tool: 'codex', permissionMode: 'acceptEdits' });

// Bypass all permissions (DANGEROUS - use only in isolated environments)
await execute({ tool: 'codex', dangerouslySkipPermissions: true });
```

## Example Output

Each example includes console output showing:

- The command being executed
- Real-time progress (if callbacks are used)
- Final results with success status, exit codes, and durations
- Error handling demonstrations (graceful, no exceptions)

## Creating Your Own Examples

Feel free to copy any example as a starting point for your own use cases. See the [main README](../README.md) for full API documentation.
