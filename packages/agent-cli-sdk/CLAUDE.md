# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Building and Development

```bash
pnpm build              # Build with bunchee (outputs to dist/)
pnpm dev                # Watch mode for development
```

### Testing

```bash
pnpm test               # Run unit tests (Vitest)
pnpm test:watch         # Run tests in watch mode
pnpm test:e2e           # Run E2E tests (180s timeout, sequential)
```

**Important**: To run a single test file:

```bash
pnpm vitest run src/path/to/file.test.ts           # Single unit test
pnpm vitest run tests/e2e/claude/basic.test.ts     # Single E2E test
```

### Quality Checks

```bash
pnpm check           # Runs lint, check-types and test
pnpm format          # Format with Prettier
```

## Architecture Overview

This is a TypeScript SDK for orchestrating AI-powered CLI tools (Claude Code and OpenAI Codex, with planned support for Gemini/Cursor). The SDK provides a unified API for executing AI CLI commands programmatically and loading/parsing session histories.

### Core Components

**Main Entry Point** (`src/index.ts`)

- Exports unified `loadMessages()` and `execute()` functions
- Routes to tool-specific implementations (Claude, Codex)
- Uses exhaustive type checking pattern for tool selection

**Claude Implementation** (`src/claude/`)

- `execute.ts`: Spawns Claude CLI process, monitors JSONL output streams, handles callbacks
- `loadSession.ts`: Reads session files from `~/.claude/projects/{encoded-path}/{sessionId}.jsonl`
- `parse.ts`: Converts Claude JSONL events to UnifiedMessage format
- `detectCli.ts`: Detects Claude CLI installation path
- `types.ts`: Claude-specific types and events

**Codex Implementation** (`src/codex/`)

- `execute.ts`: Spawns Codex CLI process, monitors JSONL output streams, handles callbacks
- `loadSession.ts`: Reads session files from `~/.codex/sessions/YYYY/MM/DD/rollout-{timestamp}-{uuid}.jsonl`
- `parse.ts`: Converts Codex JSONL events to UnifiedMessage format (transforms `function_call` to `tool_use`, etc.)
- `detectCli.ts`: Detects Codex CLI installation path
- `types.ts`: Codex-specific types and events

**Unified Types** (`src/types/unified.ts`)

- `UnifiedMessage`: Standardized message format across AI tools
- `UnifiedContent`: Union of content blocks (text, thinking, tool_use, tool_result, slash_command)
- Tool-specific input types (BashToolInput, ReadToolInput, WriteToolInput, etc.)
- Type guard functions for each tool type

**Utilities** (`src/utils/`)

- `spawn.ts`: Process spawning abstraction with callbacks and timeout handling
- `extractJson.ts`: Extract and validate JSON from text (supports Zod schemas)

### Integration with Web App

The web app (`apps/web`) consumes the unified types defined in this SDK to render tool interactions in the chat UI. The web app implements a **standardized tool result matching pattern** that automatically connects `tool_result` blocks to their parent `tool_use` blocks.

**Key integration points:**
- All `tool_use` blocks are rendered using specialized tool block components
- Tool results are matched via `tool_use_id` during message enrichment (O(1) Map-based lookup)
- Components receive `{input, result}` props - no manual `tool_use_id` matching required
- Images are auto-parsed from strings to `UnifiedImageBlock` objects
- Other content (JSON, plain text) stays as strings and is parsed by individual tool renderers

**For complete details on how the web app uses these types, see:**
`.agent/docs/claude-tool-result-patterns.md`

This document explains:
- How `tool_use_id` matching works under the hood
- Complete data flow from JSONL → enrichment → rendering
- Step-by-step guide for implementing new tools in the web app
- Testing patterns and troubleshooting tips
- Real-world examples from the codebase (Read, AskUserQuestion, Bash)

**When adding a new tool to this SDK:**
1. Define the tool input type in `src/types/unified.ts`
2. The web app will automatically handle the result matching
3. Create a tool block component in the web app following the documented pattern
4. No changes needed to the enrichment process

### Data Flow

1. **Execute Flow**:
   - User calls `execute()` → routes to `executeClaudeCommand()` or `executeCodexCommand()`
   - Spawns respective CLI with args built from options
   - Streams JSONL output line-by-line via `spawnProcess()`
   - Each line parsed by tool-specific `parse()` into UnifiedMessage
   - Callbacks invoked with events/messages in real-time
   - Returns ExecuteResult with messages, session ID, extracted data

2. **Load Session Flow**:
   - User calls `loadMessages()` → routes to `loadClaudeSession()` or `loadCodexSession()`
   - Reads from tool-specific session paths:
     - Claude: `~/.claude/projects/{encoded-path}/{sessionId}.jsonl`
     - Codex: `~/.codex/sessions/YYYY/MM/DD/rollout-{timestamp}-{uuid}.jsonl`
   - Parses each line with tool-specific `parse()`, filters nulls, sorts by timestamp
   - Returns UnifiedMessage array

### Key Patterns

**JSONL Streaming Parser**: The execute function uses line buffering to handle streaming JSONL output from CLI tools without blocking.

**Unified Message Format**: All AI CLI outputs are normalized to UnifiedMessage with typed content blocks, enabling tool-agnostic processing. Codex-specific formats are automatically transformed:
- `function_call` → `tool_use`
- `function_call_output` → `tool_result`
- `input_text`/`output_text` → `text`
- Tool names normalized (e.g., `shell` → `Bash`)

**Permission Modes**: Both CLI tools support safety modes with unified semantics:

- `default`: Standard mode with permission prompts
- `plan`: Read-only analysis mode
- `acceptEdits`: Auto-accepts file edits
- `bypassPermissions`: Dangerous mode for isolated environments

Internal flags differ per tool but are abstracted by the SDK.

**Session Storage**:
- **Claude**: Encodes project paths by replacing `/` with `-` (e.g., `/Users/john/project` → `-Users-john-project`)
- **Codex**: Uses date-based directory structure with UUID-based session IDs from `session_meta` events

## Testing Strategy

**Unit Tests**: Co-located with source files (e.g., `parse.test.ts` next to `parse.ts`)

- Test parsing logic, CLI detection, JSON extraction, spawn utilities
- Fast, no external dependencies

**E2E Tests** (`tests/e2e/`):

- **Claude** (`tests/e2e/claude/`):
  - `basic.test.ts`: Basic command execution
  - `json.test.ts`: JSON extraction
  - `resume.test.ts`: Session resumption

- **Codex** (`tests/e2e/codex/`):
  - `basic.test.ts`: Basic command execution
  - `json.test.ts`: JSON extraction
  - `load-session.test.ts`: Session loading

- All E2E tests run sequentially (singleFork: true) to avoid conflicts
- Long timeout (180s) for real CLI interactions

**Fixtures** (`tests/fixtures/`):

- **Claude** (`tests/fixtures/claude/`):
  - Individual tool JSONL examples (bash, read, write, edit, etc.)
  - Full session examples for integration testing
  - Generated via `extract-claude-fixtures` script

- **Codex** (`tests/fixtures/codex/`):
  - Sample JSONL files demonstrating Codex event format
  - Contains `function_call`, `reasoning`, `session_meta` events
  - Used to test Codex-to-unified transformations

## TypeScript Configuration

**Strict Mode**: Full strict type checking enabled with additional strictness:

- `noUncheckedIndexedAccess: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`

**Module System**: ESM-only (`type: "module"`)

- `moduleResolution: "bundler"`
- `target: "ES2022"`

**Build**: Bunchee handles bundling with declaration files, source maps, and declaration maps

## Code Style

**ESLint**: TypeScript recommended + requiring type checking

- Unused vars with `_` prefix ignored
- `any` type is warning, not error
- Type-safety rules relaxed for dynamic JSON handling

**Naming Conventions**:

- Unused variables: prefix with `_` (e.g., `const _exhaustive: never`)
- Private functions: not exported from module
- Type guards: `isBashTool()`, `isReadTool()`, etc.

## Unit Test Location

**Critical**: Unit tests MUST be co-located with source files in the same directory, not in a separate `tests/` folder. Example:

- `src/claude/parse.ts` → `src/claude/parse.test.ts`
- `src/utils/spawn.ts` → `src/utils/spawn.test.ts`

## Important Conventions

1. **File naming**: Use camelCase (e.g., `loadSession.ts`, `detectCli.ts`, `extractJson.ts`)
2. **Single export per file**: Each file has one primary export matching its filename (e.g., `parse.ts` exports `parse()`)
3. **File structure**: Public exports first, then private helpers separated by comment dividers:

   ```typescript
   // ============================================================================
   // Public API
   // ============================================================================
   export function publicFunction() {}

   // ============================================================================
   // Private Helpers
   // ============================================================================
   function privateHelper() {}
   ```

4. **Unit tests are co-located with source files** (e.g., `parse.ts` → `parse.test.ts`)
5. **Use exhaustive type checking with `never`** for tool selection switches
6. **E2E tests run sequentially** (`singleFork: true`) to avoid session conflicts
7. **Type guards over type assertions** when working with UnifiedContent blocks
