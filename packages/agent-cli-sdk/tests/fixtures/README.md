# Claude Code Test Fixtures

This directory contains test fixtures extracted from real Claude Code conversation sessions. These fixtures serve as examples of different tool usage patterns and conversation flows.

## Prompt

Write a tool to load all tests/fixtures/claude/full/\* into memory and then create individual fixtures like
@packages/agent-cli-sdk/tests/fixtures/claude/exit-plan-mode.jsonl and @packages/agent-cli-sdk/tests/fixtures/claude/tool-questions.jsonl for each unique type of use-case?
if there are different ways of using bash for instance, you could do tool-bash, tool-bash-array etc the goal here is to have simple samples for all types of behaviors found in claude code, tool usage etc

## Directory Structure

- **`full/`** - Complete conversation sessions in JSONL format
- **`individual/`** - Individual fixture files for specific use cases, extracted from full sessions

## Fixture Types

### Tool Usage Patterns

#### Basic Tools

- **tool-read.jsonl** - Standard file reading
- **tool-read-partial.jsonl** - Partial file reading with offset/limit
- **tool-write.jsonl** - Creating new files
- **tool-edit.jsonl** - Editing existing files
- **tool-glob.jsonl** - File pattern matching
- **tool-grep.jsonl** - Content search

#### Bash Command Variations

- **tool-bash.jsonl** - Simple bash commands
- **tool-bash-chained.jsonl** - Commands chained with `&&`
- **tool-bash-piped.jsonl** - Commands piped with `|`

#### Interactive Tools

- **tool-askuserquestion.jsonl** - Asking user questions with options
- **tool-todowrite.jsonl** - Task management and tracking
- **tool-exitplanmode.jsonl** - Exiting plan mode with implementation plan
- **tool-websearch.jsonl** - Web search queries

#### MCP Tools

- **tool-mcp**happy**change_title.jsonl** - Example of MCP server tool usage

### Message Types

- **assistant-text-only.jsonl** - Text-only responses without tool calls
- **user-slash-command.jsonl** - User invoking slash commands

## Source Files

Individual fixtures in `individual/` are automatically extracted from full session files in `full/`:

- `full/full-session.jsonl` - Complete conversation session
- `full/full-session-two.jsonl` - Additional conversation session
- `full/full-session-three.jsonl` - More conversation samples
- `full/full-session-four.jsonl` - Additional session samples
- `full/full-session-five.jsonl` - Extended session samples

## Regenerating Fixtures

To regenerate all individual fixtures from the full session files:

```bash
pnpm extract-claude-fixtures
```

This will:

1. Load all `full-session-*.jsonl` files from `full/`
2. Analyze messages and identify unique tool usage patterns
3. Extract representative examples for each pattern
4. Write individual fixtures to `individual/`

## Usage in Tests

These fixtures can be loaded in unit tests to validate:

- Message parsing logic
- Tool call extraction
- Response type identification
- Conversation flow handling
- Adapter implementations

Example:

```typescript
import { readFile } from 'fs/promises';

const fixture = await readFile('./tests/fixtures/claude/individual/tool-read.jsonl', 'utf-8');
const message = JSON.parse(fixture);
// Use message in tests...
```

## Adding New Patterns

To add new pattern recognition:

1. Edit `scripts/extract-claude-fixtures.ts`
2. Add pattern detection logic in `extractToolUsePatterns()`
3. Run `pnpm extract-claude-fixtures` to regenerate

## Message Format

Each fixture is a single-line JSON object with this structure:

```typescript
interface Message {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch: string;
  type: 'user' | 'assistant';
  message: {
    role: 'user' | 'assistant';
    content:
      | string
      | Array<{
          type: 'text' | 'tool_use' | 'tool_result';
          // ... type-specific fields
        }>;
  };
  uuid: string;
  timestamp: string;
}
```
