# CODEX CLI Documentation

> Comprehensive technical documentation for integrating Codex CLI into agent-cli-sdk

**Research Date**: October 28, 2025
**CLI Version**: 0.46.0 (latest: 0.50.0)
**Platform**: macOS (darwin)

## Table of Contents

1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Command Reference](#command-reference)
4. [Output Formats](#output-formats)
5. [Session Management](#session-management)
6. [File Operations](#file-operations)
7. [Permission Modes](#permission-modes)
8. [Event Types Reference](#event-types-reference)
9. [Comparison to Other CLIs](#comparison-to-other-clis)
10. [SDK Integration Guide](#sdk-integration-guide)
11. [Error Handling](#error-handling)
12. [Troubleshooting](#troubleshooting)
13. [Best Practices](#best-practices)

---

## Overview

OpenAI Codex CLI is a locally-run coding agent that operates directly in your terminal. Built primarily in Rust (97% of codebase) for speed and efficiency, it provides autonomous code editing, file operations, and shell command execution powered by OpenAI's reasoning models (GPT-5-Codex).

**Key Features:**

- **Autonomous Agent**: Can read, modify, and execute code with minimal supervision
- **Advanced Reasoning**: Uses GPT-5-Codex model optimized for real-world software engineering
- **Session Persistence**: Full conversation history stored as JSONL files
- **Flexible Permission Models**: Granular control over approvals and sandboxing
- **MCP Support**: Integrates with Model Context Protocol servers
- **Enterprise Ready**: Supports ChatGPT Team/Enterprise integration
- **TypeScript SDK**: Programmatic access to agent capabilities

**Installation Check:**

```bash
$ which codex
/opt/homebrew/bin/codex
```

---

## Installation & Setup

### Installation

**Option 1: npm (Global)**
```bash
npm install -g @openai/codex
```

**Option 2: Homebrew (macOS)**
```bash
brew install --cask codex
```

**Option 3: Binary Downloads**
- macOS (arm64/x86_64)
- Linux platforms
- Download from: https://github.com/openai/codex/releases

### Configuration

**Environment Variables:**
- `OPENAI_API_KEY` - Required if not using ChatGPT OAuth
- `CODEX_*` - Various config overrides

**Config File Location:**
```
~/.codex/config.toml
```

**Example Config:**
```toml
model = "gpt-5-codex"
model_reasoning_effort = "high"

[projects."/path/to/project"]
trust_level = "trusted"
```

### Authentication

**Option 1: ChatGPT OAuth (Recommended)**
```bash
codex login
# Opens browser for ChatGPT authentication
# Supports Plus, Pro, Team, Edu, Enterprise plans
```

**Option 2: API Key**
```bash
echo $OPENAI_API_KEY | codex login --with-api-key
```

**Check Status:**
```bash
$ codex login status
Logged in using ChatGPT
```

### Verification

```bash
$ codex --version
codex-cli 0.46.0

$ codex --help
Codex CLI

If no subcommand is specified, options will be forwarded to the interactive CLI.

Usage: codex [OPTIONS] [PROMPT]
       codex [OPTIONS] [PROMPT] <COMMAND>

Commands:
  exec        Run Codex non-interactively [aliases: e]
  login       Manage login
  logout      Remove stored authentication credentials
  mcp         [experimental] Run Codex as an MCP server and manage MCP servers
  mcp-server  [experimental] Run the Codex MCP server (stdio transport)
  app-server  [experimental] Run the app server
  completion  Generate shell completion scripts
  sandbox     Run commands within a Codex-provided sandbox [aliases: debug]
  apply       Apply the latest diff produced by Codex agent as a `git apply` to your local working
              tree [aliases: a]
  resume      Resume a previous interactive session (picker by default; use --last to continue the
              most recent)
  cloud       [EXPERIMENTAL] Browse tasks from Codex Cloud and apply changes locally
  help        Print this message or the help of the given subcommand(s)
```

---

## Command Reference

### Basic Usage

```bash
codex [OPTIONS] [PROMPT]              # Interactive mode
codex exec [OPTIONS] [PROMPT]         # Non-interactive mode
```

### Available Commands

#### Command: codex (Interactive)

**Syntax:**
```bash
codex [OPTIONS] [PROMPT]
```

**Key Flags:**
- `-m, --model <MODEL>` - Model to use (default: gpt-5-codex)
- `-s, --sandbox <MODE>` - Sandbox policy (read-only, workspace-write, danger-full-access)
- `-a, --ask-for-approval <POLICY>` - Approval policy (untrusted, on-failure, on-request, never)
- `--full-auto` - Auto-accept with workspace-write sandbox
- `--dangerously-bypass-approvals-and-sandbox` - Skip all confirmations (DANGEROUS)
- `-C, --cd <DIR>` - Set working directory
- `-i, --image <FILE>...` - Attach images to prompt
- `--search` - Enable web search tool
- `-c, --config <key=value>` - Override config values

**Example:**
```bash
$ codex "Create a function to calculate fibonacci"
# Opens interactive session with TUI
```

#### Command: exec (Non-Interactive)

**Syntax:**
```bash
codex exec [OPTIONS] [PROMPT]
```

**Additional Flags:**
- `--json` - Output events as JSONL
- `--output-schema <FILE>` - JSON Schema for final response
- `-o, --output-last-message <FILE>` - Write final message to file
- `--skip-git-repo-check` - Allow running outside Git repos
- `--include-plan-tool` - Include planning tool in conversation
- `--color <COLOR>` - Color settings (always, never, auto)

**Example:**
```bash
$ codex exec "What is 2+2?" --skip-git-repo-check --full-auto
OpenAI Codex v0.46.0 (research preview)
--------
workdir: /tmp/codex-test
model: gpt-5-codex
provider: openai
approval: on-failure
sandbox: workspace-write
reasoning effort: high
reasoning summaries: auto
session id: 019a2d8b-0b17-7682-89d8-ba6ebb18a2b8
--------
user
What is 2+2?

thinking
**Confirming no plan needed**
codex
4
tokens used
1,027
4
```

#### Command: resume

**Syntax:**
```bash
codex resume [SESSION_ID] [PROMPT]
codex resume --last [PROMPT]          # Resume most recent
```

**Example:**
```bash
$ codex resume --last "Continue working on this"
# Resumes last session with new prompt
```

#### Command: apply

**Syntax:**
```bash
codex apply <TASK_ID>
```

**Description:** Applies latest diff from Codex agent as `git apply` to local working tree.

**Example:**
```bash
$ codex apply 019a2d8b-0b17-7682-89d8-ba6ebb18a2b8
```

#### Command: mcp

**Syntax:**
```bash
codex mcp list                        # List MCP servers
codex mcp get <SERVER_NAME>           # Show server details
codex mcp add <CONFIG>                # Add MCP server
codex mcp remove <SERVER_NAME>        # Remove MCP server
```

**Example:**
```bash
$ codex mcp list
# Shows configured MCP servers
```

---

## Output Formats

### Available Formats

1. **Text (Default)** - Human-readable terminal output
2. **JSON (JSONL)** - Machine-parseable event stream

### Format: Text (Default)

**Command:**
```bash
$ codex exec "What is 2+2?" --skip-git-repo-check --full-auto
```

**Output:**
```
OpenAI Codex v0.46.0 (research preview)
--------
workdir: /tmp/codex-test
model: gpt-5-codex
provider: openai
approval: on-failure
sandbox: workspace-write
reasoning effort: high
reasoning summaries: auto
session id: 019a2d8b-0b17-7682-89d8-ba6ebb18a2b8
--------
user
What is 2+2?

thinking
**Confirming no plan needed**
codex
4
tokens used
1,027
4
```

**Parsing Notes:**
- Headers separated by `--------`
- Sections prefixed by role (`user`, `thinking`, `codex`, `tokens used`)
- Final answer on last line
- No structured format for programmatic parsing

### Format: JSON (JSONL)

**Command:**
```bash
$ codex exec "What is 2+2?" --skip-git-repo-check --full-auto --json
```

**Output:**
```jsonl
{"type":"thread.started","thread_id":"019a2d8b-1cee-78e1-aabc-f97964366cac"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"**Performing simple calculation**"}}
{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"2+2 is 4."}}
{"type":"turn.completed","usage":{"input_tokens":2940,"cached_input_tokens":2048,"output_tokens":13}}
```

**Schema:**

```typescript
// Event wrapper
interface CodexEvent {
  type: string;
  timestamp?: string;
  [key: string]: any;
}

// Thread lifecycle
interface ThreadStartedEvent {
  type: "thread.started";
  thread_id: string;
}

interface TurnStartedEvent {
  type: "turn.started";
}

interface TurnCompletedEvent {
  type: "turn.completed";
  usage: {
    input_tokens: number;
    cached_input_tokens: number;
    output_tokens: number;
  };
}

// Items
interface ItemCompletedEvent {
  type: "item.completed";
  item: {
    id: string;
    type: "reasoning" | "agent_message" | "command_execution" | "file_change";
    text?: string;
    command?: string;
    aggregated_output?: string;
    exit_code?: number;
    status?: string;
    changes?: Array<{
      path: string;
      kind: "add" | "edit" | "delete";
    }>;
  };
}

interface ItemStartedEvent {
  type: "item.started";
  item: {
    id: string;
    type: string;
    [key: string]: any;
  };
}
```

**Event Types:**
- `thread.started` - New conversation thread initialized
- `turn.started` - Agent begins processing turn
- `turn.completed` - Turn finished with token usage
- `item.started` - Item (command, file op, etc.) begins
- `item.completed` - Item finishes with results

**Parsing Strategy:**
1. Read line-by-line (JSONL format)
2. Parse each line as JSON
3. Handle events by `type` field
4. Extract `item` payloads for content
5. Watch for `turn.completed` to detect end of response

---

## Session Management

### Session ID Format

Sessions use UUIDv7 format with timestamp-based ordering:

**Format:** `019a2d8b-0b17-7682-89d8-ba6ebb18a2b8`
- Timestamp-ordered (sortable chronologically)
- 36 characters including hyphens
- Case-insensitive but stored lowercase

**Examples:**
- `019a27bc-6b2a-71c2-8cf3-54a82f6c6fb8`
- `019a2d8b-0b17-7682-89d8-ba6ebb18a2b8`
- `019a2c2d-0e09-7143-8ac0-657d440dbd45`

### Creating Sessions

**Interactive Mode (Automatic):**
```bash
$ codex "Initial prompt"
# Session created automatically, ID shown in output
```

**Non-Interactive Mode:**
```bash
$ codex exec "Initial prompt" --skip-git-repo-check --full-auto
OpenAI Codex v0.46.0 (research preview)
--------
session id: 019a2d8b-0b17-7682-89d8-ba6ebb18a2b8
--------
```

**Output:**
- Session ID printed in header
- Session file created in `~/.codex/sessions/YYYY/MM/DD/`

### Resuming Sessions

**By Session ID:**
```bash
$ codex resume 019a2d8b-0b17-7682-89d8-ba6ebb18a2b8 "Continue working"
```

**Most Recent:**
```bash
$ codex resume --last "Add error handling"
```

**Non-Interactive Resume:**
```bash
$ codex exec resume 019a2d8b-0b17-7682-89d8-ba6ebb18a2b8 "New prompt"
$ codex exec resume --last "New prompt"
```

### Session Storage

**Location:**
```
~/.codex/sessions/YYYY/MM/DD/rollout-YYYY-MM-DDTHH-MM-SS-{UUID}.jsonl
```

**Example Path:**
```
/Users/jnarowski/.codex/sessions/2025/10/27/rollout-2025-10-27T16-14-10-019a27bc-6b2a-71c2-8cf3-54a82f6c6fb8.jsonl
```

**File Structure:**
```bash
$ ls -la ~/.codex/sessions/2025/10/28/ | head -10
total 4264
drwxr-xr-x@ 101 jnarowski  staff    3232 Oct 28 19:18 .
drwxr-xr-x@   9 jnarowski  staff     288 Oct 28 12:55 ..
-rw-r--r--@   1 jnarowski  staff   10478 Oct 28 12:55 rollout-2025-10-28T12-55-41-019a2c2d-0e09-7143-8ac0-657d440dbd45.jsonl
-rw-r--r--@   1 jnarowski  staff   10438 Oct 28 13:01 rollout-2025-10-28T13-01-21-019a2c32-3da2-7200-a253-0408f61717c3.jsonl
```

**Session Schema:**

```json
{
  "timestamp": "2025-10-27T22:14:10.996Z",
  "type": "session_meta",
  "payload": {
    "id": "019a27bc-6b2a-71c2-8cf3-54a82f6c6fb8",
    "timestamp": "2025-10-27T22:14:10.986Z",
    "cwd": "/Users/jnarowski/Dev/project",
    "originator": "codex_exec",
    "cli_version": "0.46.0",
    "instructions": "<user_instructions>...</user_instructions>",
    "source": "exec",
    "git": {
      "commit_hash": "4b7218f5c940f0e2b01c6e60a9cda4c7d29d9002",
      "branch": "feat/simplified-agent-sdk",
      "repository_url": "git@github.com:user/repo.git"
    }
  }
}
```

**Session File Events:**

Each session file contains a sequence of JSONL events:

```jsonl
{"timestamp":"...","type":"session_meta","payload":{...}}
{"timestamp":"...","type":"response_item","payload":{"type":"message","role":"user",...}}
{"timestamp":"...","type":"response_item","payload":{"type":"message","role":"user",...}}
{"timestamp":"...","type":"event_msg","payload":{"type":"user_message",...}}
{"timestamp":"...","type":"turn_context","payload":{...}}
{"timestamp":"...","type":"event_msg","payload":{"type":"token_count",...}}
{"timestamp":"...","type":"event_msg","payload":{"type":"agent_reasoning",...}}
{"timestamp":"...","type":"response_item","payload":{"type":"reasoning",...}}
{"timestamp":"...","type":"response_item","payload":{"type":"function_call",...}}
{"timestamp":"...","type":"response_item","payload":{"type":"function_call_output",...}}
{"timestamp":"...","type":"event_msg","payload":{"type":"agent_message",...}}
{"timestamp":"...","type":"response_item","payload":{"type":"message","role":"assistant",...}}
```

### Session Persistence

**Test Results:**
- ✅ Created session, restarted terminal, resumed: **Success**
- ✅ Session data retained: **Yes**
- ✅ History preserved: **Yes** (full conversation stored)
- ✅ Working directory remembered: **Yes**
- ✅ Git context preserved: **Yes** (commit hash, branch)

### Additional Files

**History File:**
```
~/.codex/history.jsonl
```
- Stores command history and metadata
- ~2.3KB typical size
- Used for session picker

**Version Tracking:**
```
~/.codex/version.json
```
```json
{
  "latest_version": "0.50.0",
  "last_checked_at": "2025-10-29T00:43:25.142003Z"
}
```

**Auth Storage:**
```
~/.codex/auth.json
```
- OAuth tokens and credentials
- Encrypted storage

---

## File Operations

### Available Tools

Codex CLI provides comprehensive file operation capabilities:

1. **Read File** - Read file contents via shell commands
2. **Write File** - Create new files with content
3. **Edit File** - Modify existing files (via diff/patch)
4. **Delete File** - Remove files
5. **List Directory** - Execute ls/find commands
6. **Execute Commands** - Run arbitrary shell commands

### Testing File Operations

**Setup:**
```bash
$ mkdir -p /tmp/codex-test
$ echo "test content" > /tmp/codex-test/sample.txt
```

#### Test: Read File

**Prompt:**
```bash
$ cd /tmp/codex-test && codex exec "Read the file sample.txt and tell me what it contains" \
  --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox --json
```

**Output:**
```jsonl
{"type":"thread.started","thread_id":"019a2d8b-3b56-75c0-8ac6-68c926f0806f"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"**Setting shell command environment and working directory**"}}
{"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"bash -lc 'cat sample.txt'","aggregated_output":"","status":"in_progress"}}
{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"bash -lc 'cat sample.txt'","aggregated_output":"test content\n","exit_code":0,"status":"completed"}}
{"type":"item.completed","item":{"id":"item_2","type":"agent_message","text":"`sample.txt` contains:\n\ntest content"}}
{"type":"turn.completed","usage":{"input_tokens":6032,"cached_input_tokens":4992,"output_tokens":114}}
```

**Tool Call Format:**
```json
{
  "type": "item.completed",
  "item": {
    "id": "item_1",
    "type": "command_execution",
    "command": "bash -lc 'cat sample.txt'",
    "aggregated_output": "test content\n",
    "exit_code": 0,
    "status": "completed"
  }
}
```

**Observations:**
- Uses shell commands (`cat`) rather than native file reading
- Output captured in `aggregated_output` field
- Exit code provided for error detection

#### Test: Write File

**Prompt:**
```bash
$ cd /tmp/codex-test && codex exec "Create a file called new.txt with the content 'Hello World'" \
  --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox --json
```

**Output:**
```jsonl
{"type":"thread.started","thread_id":"019a2d8b-4b88-73a1-a88b-ff9f4e170938"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"**Adding new file with content**"}}
{"type":"item.completed","item":{"id":"item_1","type":"file_change","changes":[{"path":"/private/tmp/codex-test/new.txt","kind":"add"}],"status":"completed"}}
{"type":"item.completed","item":{"id":"item_2","type":"reasoning","text":"**Notifying file creation**"}}
{"type":"item.completed","item":{"id":"item_3","type":"agent_message","text":"Created `new.txt` with the requested content. Next, you might spot-check it with `cat new.txt` if needed."}}
{"type":"turn.completed","usage":{"input_tokens":6015,"cached_input_tokens":2944,"output_tokens":65}}
```

**Verification:**
```bash
$ cat /tmp/codex-test/new.txt
Hello World
```

**Tool Call Format:**
```json
{
  "type": "item.completed",
  "item": {
    "id": "item_1",
    "type": "file_change",
    "changes": [
      {
        "path": "/private/tmp/codex-test/new.txt",
        "kind": "add"
      }
    ],
    "status": "completed"
  }
}
```

**Observations:**
- Uses native `file_change` event type
- Provides absolute path to changed file
- Distinguishes between `add`, `edit`, `delete` operations

#### Test: Edit File

**Prompt:**
```bash
$ cd /tmp/codex-test && codex exec "Change 'Hello' to 'Goodbye' in new.txt" \
  --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox --json
```

**Expected Output:**
```jsonl
{"type":"item.completed","item":{"id":"item_X","type":"file_change","changes":[{"path":"/private/tmp/codex-test/new.txt","kind":"edit"}],"status":"completed"}}
```

**Verification:**
```bash
$ cat /tmp/codex-test/new.txt
Goodbye World
```

### File Path Handling

**Path Resolution:**
- Absolute paths: Used directly
- Relative paths: Resolved from `cwd` in session
- Workspace-relative: Resolved from project root
- Symlinks: Followed by default

**Sandbox Restrictions:**
- `read-only`: Can read files anywhere, no writes
- `workspace-write`: Can write within workspace only
- `danger-full-access`: Can write anywhere

---

## Permission Modes

### Approval Policies

Codex CLI provides four approval policies controlled via `-a, --ask-for-approval`:

1. **untrusted** (Default)
2. **on-failure**
3. **on-request**
4. **never**

### Sandbox Modes

Three sandbox policies controlled via `-s, --sandbox`:

1. **read-only**
2. **workspace-write**
3. **danger-full-access**

### Interactive Mode (Default: untrusted + workspace-write)

**Behavior:**
- Prompts for "untrusted" commands (anything not in safe list)
- Safe commands: `ls`, `cat`, `grep`, `find`, `sed`, `awk`, etc.
- Unsafe commands: `rm`, `mv`, `curl`, custom scripts
- User must approve each unsafe operation
- Cannot write outside workspace

**Example:**
```bash
$ codex "Delete all .tmp files"
# Would prompt: "Allow command: rm *.tmp? [y/n]"
```

### Approval Policy: on-failure

**Flags:**
- `--full-auto` (sets approval=on-failure + sandbox=workspace-write)
- `-a on-failure`

**Behavior:**
- Runs all commands without approval
- Only prompts if command fails
- On failure, asks to retry without sandbox
- Recommended for development workflows

**Example:**
```bash
$ codex --full-auto "Create a new React component"
# Runs without prompts unless errors occur
```

### Approval Policy: never

**Flags:**
- `-a never`

**Behavior:**
- Never asks for approval
- Failures returned directly to model
- Model must handle errors autonomously
- Requires sandbox to prevent damage

**Example:**
```bash
$ codex exec "Run tests" -a never -s workspace-write
# No prompts, model sees test failures and adapts
```

### Bypass All Safety (DANGEROUS)

**Flags:**
- `--dangerously-bypass-approvals-and-sandbox`

**Behavior:**
- ⚠️ Skips ALL confirmations
- ⚠️ No sandboxing
- ⚠️ Full filesystem access
- ⚠️ Can execute any command
- ⚠️ ONLY for externally-sandboxed environments (CI, Docker)

**Example:**
```bash
$ codex exec "Deploy to production" --dangerously-bypass-approvals-and-sandbox
# EXTREMELY DANGEROUS - avoid in normal use
```

### Permission Matrix

| Operation         | Interactive (Default) | --full-auto       | -a never          | --dangerously-bypass |
| ----------------- | --------------------- | ----------------- | ----------------- | -------------------- |
| Read File         | ✅ Allowed            | ✅ Allowed        | ✅ Allowed        | ✅ Allowed           |
| Write File (CWD)  | ✅ Allowed            | ✅ Allowed        | ✅ Allowed        | ✅ Allowed           |
| Write File (Ext)  | ❌ Blocked            | ❌ Blocked        | ❌ Blocked        | ⚠️ Allowed           |
| Safe Command      | ✅ Auto-run           | ✅ Auto-run       | ✅ Auto-run       | ✅ Auto-run          |
| Unsafe Command    | 🤔 Prompt             | ✅ Auto-run       | ✅ Auto-run       | ✅ Auto-run          |
| Command Failure   | 🤔 Prompt (retry)     | 🤔 Prompt (retry) | ❌ Return to model | ❌ Return to model   |

### Trust Levels

Projects can be marked as "trusted" in config:

```toml
[projects."/path/to/project"]
trust_level = "trusted"
```

**Effects:**
- Reduces friction for approval prompts
- Still respects sandbox boundaries
- Does not bypass --dangerously flag

### Git Repository Check

By default, Codex requires running inside a Git repository for safety.

**Override:**
```bash
$ codex exec "task" --skip-git-repo-check
```

**Reason:** Prevents accidental execution in system directories.

---

## Event Types Reference

### Session File Events

Events in `~/.codex/sessions/*/rollout-*.jsonl`:

#### Event Type: `session_meta`

**Description:** Metadata about the session, including ID, working directory, Git context, and user instructions.

**Structure:**
```json
{
  "timestamp": "2025-10-27T22:14:10.996Z",
  "type": "session_meta",
  "payload": {
    "id": "019a27bc-6b2a-71c2-8cf3-54a82f6c6fb8",
    "timestamp": "2025-10-27T22:14:10.986Z",
    "cwd": "/Users/jnarowski/Dev/project",
    "originator": "codex_exec",
    "cli_version": "0.46.0",
    "instructions": "<user_instructions>...</user_instructions>",
    "source": "exec",
    "git": {
      "commit_hash": "abc123...",
      "branch": "main",
      "repository_url": "git@github.com:user/repo.git"
    }
  }
}
```

**Fields:**
- `id` - Session UUID
- `cwd` - Working directory
- `originator` - Command that created session (codex_exec, codex_interactive)
- `cli_version` - CLI version
- `instructions` - User-provided instructions (AGENTS.md, etc.)
- `git` - Git repository context

**When Emitted:** First event in every session file.

#### Event Type: `response_item` (message)

**Description:** User or assistant message in the conversation.

**Structure:**
```json
{
  "timestamp": "2025-10-27T22:14:10.996Z",
  "type": "response_item",
  "payload": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "What is the current directory?"
      }
    ]
  }
}
```

**Fields:**
- `role` - "user" or "assistant"
- `content` - Array of content blocks
- `content[].type` - "input_text", "output_text", etc.

**When Emitted:** For each user message and assistant response.

#### Event Type: `response_item` (reasoning)

**Description:** Internal reasoning/thinking by the agent, optionally encrypted.

**Structure:**
```json
{
  "timestamp": "2025-10-27T22:14:14.646Z",
  "type": "response_item",
  "payload": {
    "type": "reasoning",
    "summary": [
      {
        "type": "summary_text",
        "text": "**Preparing to run current directory command**"
      }
    ],
    "content": null,
    "encrypted_content": "gAAAAABo_-62JBxooS9OjkzHxgjGz8s71..."
  }
}
```

**Fields:**
- `summary` - Human-readable reasoning summary
- `encrypted_content` - Full reasoning (encrypted by default)

**When Emitted:** Before taking actions, shows agent's thought process.

#### Event Type: `response_item` (function_call)

**Description:** Agent calls a function/tool (e.g., shell command).

**Structure:**
```json
{
  "timestamp": "2025-10-27T22:14:14.647Z",
  "type": "response_item",
  "payload": {
    "type": "function_call",
    "name": "shell",
    "arguments": "{\"command\":[\"bash\",\"-lc\",\"pwd\"],\"workdir\":\".\",\"timeout_ms\":120000}",
    "call_id": "call_hyldLZyQV35TZNQDqEcRpHVA"
  }
}
```

**Fields:**
- `name` - Function name (typically "shell")
- `arguments` - JSON-encoded arguments
- `call_id` - Unique call identifier

**When Emitted:** When agent executes a command or operation.

#### Event Type: `response_item` (function_call_output)

**Description:** Result of a function call.

**Structure:**
```json
{
  "timestamp": "2025-10-27T22:14:14.647Z",
  "type": "response_item",
  "payload": {
    "type": "function_call_output",
    "call_id": "call_hyldLZyQV35TZNQDqEcRpHVA",
    "output": "{\"output\":\"/Users/jnarowski/Dev/project\\n\",\"metadata\":{\"exit_code\":0,\"duration_seconds\":0.0}}"
  }
}
```

**Fields:**
- `call_id` - Matches function_call event
- `output` - JSON-encoded output with exit_code, duration

**When Emitted:** After function_call completes.

#### Event Type: `event_msg` (user_message)

**Description:** User message notification.

**Structure:**
```json
{
  "timestamp": "2025-10-27T22:14:10.996Z",
  "type": "event_msg",
  "payload": {
    "type": "user_message",
    "message": "What is the current directory?",
    "kind": "plain"
  }
}
```

**When Emitted:** When user sends a message.

#### Event Type: `event_msg` (agent_message)

**Description:** Agent's final response message.

**Structure:**
```json
{
  "timestamp": "2025-10-27T22:14:15.872Z",
  "type": "event_msg",
  "payload": {
    "type": "agent_message",
    "message": "Current directory is `/Users/jnarowski/Dev/project`."
  }
}
```

**When Emitted:** When agent responds to user.

#### Event Type: `event_msg` (agent_reasoning)

**Description:** Summary of agent reasoning.

**Structure:**
```json
{
  "timestamp": "2025-10-27T22:14:14.213Z",
  "type": "event_msg",
  "payload": {
    "type": "agent_reasoning",
    "text": "**Preparing to run current directory command**"
  }
}
```

**When Emitted:** During agent thinking phase.

#### Event Type: `event_msg` (token_count)

**Description:** Token usage and rate limit information.

**Structure:**
```json
{
  "timestamp": "2025-10-27T22:14:15.916Z",
  "type": "event_msg",
  "payload": {
    "type": "token_count",
    "info": {
      "total_token_usage": {
        "input_tokens": 7545,
        "cached_input_tokens": 7296,
        "output_tokens": 132,
        "reasoning_output_tokens": 64,
        "total_tokens": 7677
      },
      "last_token_usage": {
        "input_tokens": 3869,
        "cached_input_tokens": 3712,
        "output_tokens": 32,
        "reasoning_output_tokens": 0,
        "total_tokens": 3901
      },
      "model_context_window": 272000
    },
    "rate_limits": {
      "primary": {
        "used_percent": 3.0,
        "window_minutes": 299,
        "resets_in_seconds": 769
      },
      "secondary": {
        "used_percent": 1.0,
        "window_minutes": 10079,
        "resets_in_seconds": 587569
      }
    }
  }
}
```

**Fields:**
- `total_token_usage` - Cumulative for session
- `last_token_usage` - For most recent turn
- `model_context_window` - Max context size
- `rate_limits` - Rate limit status

**When Emitted:** After each API call.

#### Event Type: `turn_context`

**Description:** Context for current turn (settings, policies).

**Structure:**
```json
{
  "timestamp": "2025-10-27T22:14:10.996Z",
  "type": "turn_context",
  "payload": {
    "cwd": "/Users/jnarowski/Dev/project",
    "approval_policy": "never",
    "sandbox_policy": {
      "mode": "read-only"
    },
    "model": "gpt-5-codex",
    "effort": "high",
    "summary": "auto"
  }
}
```

**When Emitted:** At start of each turn.

### Exec JSON Output Events

Events from `codex exec --json`:

#### Event Type: `thread.started`

**Description:** New conversation thread initialized.

**Structure:**
```json
{
  "type": "thread.started",
  "thread_id": "019a2d8b-1cee-78e1-aabc-f97964366cac"
}
```

#### Event Type: `turn.started`

**Description:** Agent begins processing a turn.

**Structure:**
```json
{
  "type": "turn.started"
}
```

#### Event Type: `turn.completed`

**Description:** Turn finished with token usage.

**Structure:**
```json
{
  "type": "turn.completed",
  "usage": {
    "input_tokens": 2940,
    "cached_input_tokens": 2048,
    "output_tokens": 13
  }
}
```

#### Event Type: `item.started`

**Description:** Item (command, file op) begins execution.

**Structure:**
```json
{
  "type": "item.started",
  "item": {
    "id": "item_1",
    "type": "command_execution",
    "command": "bash -lc 'cat sample.txt'",
    "aggregated_output": "",
    "status": "in_progress"
  }
}
```

#### Event Type: `item.completed`

**Description:** Item execution completes.

**Structure (Command):**
```json
{
  "type": "item.completed",
  "item": {
    "id": "item_1",
    "type": "command_execution",
    "command": "bash -lc 'cat sample.txt'",
    "aggregated_output": "test content\n",
    "exit_code": 0,
    "status": "completed"
  }
}
```

**Structure (File Change):**
```json
{
  "type": "item.completed",
  "item": {
    "id": "item_1",
    "type": "file_change",
    "changes": [
      {
        "path": "/private/tmp/codex-test/new.txt",
        "kind": "add"
      }
    ],
    "status": "completed"
  }
}
```

**Structure (Agent Message):**
```json
{
  "type": "item.completed",
  "item": {
    "id": "item_2",
    "type": "agent_message",
    "text": "Created `new.txt` with the requested content."
  }
}
```

**Structure (Reasoning):**
```json
{
  "type": "item.completed",
  "item": {
    "id": "item_0",
    "type": "reasoning",
    "text": "**Adding new file with content**"
  }
}
```

**Item Types:**
- `reasoning` - Agent thinking
- `agent_message` - Final response
- `command_execution` - Shell command
- `file_change` - File add/edit/delete

---

## Comparison to Other CLIs

### vs Claude Code

| Feature                   | Codex CLI                                | Claude Code                             |
| ------------------------- | ---------------------------------------- | --------------------------------------- |
| **Session Format**        | JSONL files (event stream)               | JSONL files (event stream)              |
| **Session Location**      | `~/.codex/sessions/YYYY/MM/DD/`          | `~/.claude/history/`                    |
| **Session ID Format**     | UUIDv7 with timestamp                    | UUID                                    |
| **Output Formats**        | text, JSON (JSONL)                       | text, stream-json                       |
| **File Operations**       | Native file_change events + shell        | Read, Write, Edit tools                 |
| **Permission Modes**      | 4 policies, 3 sandboxes                  | default, acceptEdits, bypassPermissions |
| **Approval Granularity**  | untrusted, on-failure, on-request, never | Per-tool, per-operation                 |
| **Model Provider**        | OpenAI (GPT-5-Codex)                     | Anthropic (Claude 3.5 Sonnet)           |
| **Reasoning Visibility**  | Encrypted by default, summaries shown    | Full reasoning shown                    |
| **Interactive Mode**      | TUI with rich formatting                 | Terminal with prompts                   |
| **Non-Interactive Mode**  | `codex exec --json`                      | `claude --output-format stream-json`    |
| **Session Resumption**    | `codex resume [ID]`, `--last`            | `claude --session [ID]`                 |
| **MCP Support**           | ✅ Full MCP server support               | ✅ MCP client support                   |
| **Git Integration**       | Requires Git repo by default             | No requirement                          |
| **Config File**           | TOML (`~/.codex/config.toml`)            | JSON (`~/.claude/config.json`)          |
| **Web Search**            | ✅ `--search` flag                       | ❌ Not available                        |
| **Image Input**           | ✅ `-i, --image`                         | ✅ `--image`                            |
| **Custom Models**         | ✅ `-m` flag + OSS support               | ✅ API models only                      |
| **Enterprise Features**   | ✅ ChatGPT Team/Enterprise               | ✅ Claude for Enterprise                |
| **SDK Availability**      | ✅ TypeScript SDK                        | ❌ No official SDK                      |
| **License**               | Apache-2.0 (open source)                 | Proprietary                             |

**Key Differences:**

1. **Reasoning Model**: Codex uses GPT-5-Codex with extended reasoning, Claude uses Sonnet with chain-of-thought
2. **File Operations**: Codex emits structured `file_change` events, Claude uses tool_use events
3. **Permission Philosophy**: Codex focuses on sandboxing + approval policies, Claude on per-tool permissions
4. **Session Storage**: Codex organizes by date hierarchy, Claude flat structure
5. **MCP Role**: Codex can BE an MCP server, Claude is MCP client
6. **Git Requirement**: Codex enforces Git repo for safety, Claude doesn't

### vs Cursor CLI

| Feature                | Codex CLI                       | Cursor CLI (cursor-agent)          |
| ---------------------- | ------------------------------- | ---------------------------------- |
| **Session Format**     | JSONL files                     | SQLite database                    |
| **Session Location**   | `~/.codex/sessions/`            | `~/.cursor-tutor/`                 |
| **Output Formats**     | text, JSON                      | text, json (limited)               |
| **File Operations**    | Full read/write/edit            | Limited (mostly read)              |
| **Permission Modes**   | 4 policies, 3 sandboxes         | Interactive only                   |
| **Model Provider**     | OpenAI                          | Multiple (OpenAI, Claude, etc.)    |
| **Interactive Mode**   | ✅ Rich TUI                     | ✅ Basic interactive               |
| **Non-Interactive**    | ✅ `codex exec`                 | ✅ `cursor-agent`                  |
| **Session Resumption** | ✅ Full support                 | ⚠️ Limited                         |
| **MCP Support**        | ✅ Yes                          | ❌ No                              |
| **Config Format**      | TOML                            | JSON                               |
| **Web Search**         | ✅ Yes                          | ❌ No                              |
| **Maturity**           | Production-ready                | Beta/experimental                  |
| **Documentation**      | Comprehensive                   | Limited                            |
| **License**            | Apache-2.0                      | Proprietary                        |
| **IDE Integration**    | VS Code, Cursor, Windsurf       | Cursor IDE native                  |
| **SDK**                | ✅ TypeScript SDK               | ❌ No SDK                          |

**Key Differences:**

1. **Architecture**: Codex is standalone CLI, Cursor CLI tied to Cursor IDE ecosystem
2. **Storage**: Codex uses human-readable JSONL, Cursor uses SQLite (harder to inspect)
3. **Capabilities**: Codex more feature-complete for automation, Cursor more IDE-focused
4. **Maturity**: Codex production-grade, Cursor CLI still evolving
5. **Openness**: Codex fully open-source, Cursor partially open

---

## SDK Integration Guide

### Recommended Approach

Given Codex CLI's comprehensive JSONL output format and non-interactive mode, integration into agent-cli-sdk should follow these patterns:

**High-Level Strategy:**
1. Use `codex exec --json` for all programmatic interactions
2. Parse JSONL output line-by-line to stream events
3. Map Codex events to `UnifiedMessage` format
4. Store session files directly (no transformation needed)
5. Use session IDs for resumption

### Process Spawning

```typescript
import { spawn } from 'cross-spawn';

export interface CodexOptions {
  sessionId?: string;
  model?: string;
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
  approval?: 'untrusted' | 'on-failure' | 'on-request' | 'never';
  cwd?: string;
  skipGitCheck?: boolean;
  images?: string[];
  search?: boolean;
  config?: Record<string, any>;
}

export function spawnCodex(prompt: string, options: CodexOptions) {
  const args = ['exec'];

  // Session handling
  if (options.sessionId) {
    args.push('resume', options.sessionId);
  }

  // Add prompt
  args.push(prompt);

  // Options
  if (options.model) {
    args.push('-m', options.model);
  }

  if (options.sandbox) {
    args.push('-s', options.sandbox);
  }

  if (options.approval) {
    args.push('-a', options.approval);
  }

  if (options.cwd) {
    args.push('-C', options.cwd);
  }

  if (options.skipGitCheck) {
    args.push('--skip-git-repo-check');
  }

  if (options.images) {
    options.images.forEach((img) => {
      args.push('-i', img);
    });
  }

  if (options.search) {
    args.push('--search');
  }

  if (options.config) {
    Object.entries(options.config).forEach(([key, value]) => {
      args.push('-c', `${key}=${JSON.stringify(value)}`);
    });
  }

  // Always use JSON output for programmatic use
  args.push('--json');

  return spawn('codex', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: options.cwd,
  });
}
```

### Output Parsing

```typescript
import { createInterface } from 'readline';

export interface CodexEvent {
  type: string;
  [key: string]: any;
}

export interface CodexItem {
  id: string;
  type: 'reasoning' | 'agent_message' | 'command_execution' | 'file_change';
  text?: string;
  command?: string;
  aggregated_output?: string;
  exit_code?: number;
  status?: string;
  changes?: Array<{
    path: string;
    kind: 'add' | 'edit' | 'delete';
  }>;
}

export function parseCodexOutput(
  stream: NodeJS.ReadableStream,
  onEvent: (event: CodexEvent) => void,
): void {
  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  rl.on('line', (line) => {
    if (!line.trim()) return;

    try {
      const event = JSON.parse(line) as CodexEvent;
      onEvent(event);
    } catch (err) {
      console.error('Failed to parse Codex output line:', line, err);
    }
  });

  rl.on('close', () => {
    onEvent({ type: 'stream.closed' });
  });
}

export function extractMessages(events: CodexEvent[]): UnifiedMessage[] {
  const messages: UnifiedMessage[] = [];

  for (const event of events) {
    if (event.type === 'item.completed') {
      const item = event.item as CodexItem;

      if (item.type === 'agent_message') {
        messages.push({
          role: 'assistant',
          content: [{ type: 'text', text: item.text || '' }],
        });
      } else if (item.type === 'reasoning') {
        messages.push({
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: `[Reasoning] ${item.text || ''}`,
            },
          ],
        });
      } else if (item.type === 'command_execution') {
        messages.push({
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: item.id,
              name: 'execute_command',
              input: { command: item.command },
            },
          ],
        });

        if (item.status === 'completed') {
          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: item.id,
                content: item.aggregated_output || '',
              },
            ],
          });
        }
      } else if (item.type === 'file_change') {
        messages.push({
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: item.id,
              name: 'file_change',
              input: { changes: item.changes },
            },
          ],
        });
      }
    }
  }

  return messages;
}
```

### Session Management

```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface CodexSession {
  id: string;
  timestamp: string;
  cwd: string;
  originator: string;
  cli_version: string;
  git?: {
    commit_hash: string;
    branch: string;
    repository_url: string;
  };
  messages: UnifiedMessage[];
}

export function getCodexSessionPath(sessionId: string): string {
  // Extract date from UUIDv7 timestamp
  const timestampHex = sessionId.split('-')[0];
  const timestamp = parseInt(timestampHex, 16);
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // Find matching file
  const sessionDir = join(
    homedir(),
    '.codex',
    'sessions',
    String(year),
    month,
    day,
  );

  if (!existsSync(sessionDir)) {
    throw new Error(`Session directory not found: ${sessionDir}`);
  }

  const files = readdirSync(sessionDir);
  const matchingFile = files.find((f) => f.includes(sessionId));

  if (!matchingFile) {
    throw new Error(`Session file not found for ID: ${sessionId}`);
  }

  return join(sessionDir, matchingFile);
}

export function loadCodexSession(sessionId: string): CodexSession {
  const filePath = getCodexSessionPath(sessionId);
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  const events = lines.map((line) => JSON.parse(line) as CodexEvent);

  // Extract metadata from first event
  const metaEvent = events.find((e) => e.type === 'session_meta');
  if (!metaEvent) {
    throw new Error('Session metadata not found');
  }

  const meta = metaEvent.payload;

  // Convert events to messages
  const messages = extractMessages(events);

  return {
    id: meta.id,
    timestamp: meta.timestamp,
    cwd: meta.cwd,
    originator: meta.originator,
    cli_version: meta.cli_version,
    git: meta.git,
    messages,
  };
}

export function listCodexSessions(limit = 10): Array<{ id: string; path: string }> {
  const sessionsDir = join(homedir(), '.codex', 'sessions');

  // Find all .jsonl files
  const files = execSync(
    `find "${sessionsDir}" -name "rollout-*.jsonl" | sort -r | head -${limit}`,
  )
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);

  return files.map((path) => {
    const filename = basename(path);
    const match = filename.match(/rollout-.*-([0-9a-f-]{36})\.jsonl/);
    const id = match ? match[1] : '';
    return { id, path };
  });
}
```

### Tool Mapping

```typescript
// Map Codex items to UnifiedToolUse format
export function mapCodexItemToTool(item: CodexItem): UnifiedToolUse | null {
  if (item.type === 'command_execution') {
    return {
      type: 'tool_use',
      id: item.id,
      name: 'bash',
      input: {
        command: item.command?.replace(/^bash -lc '/, '').replace(/'$/, ''),
      },
    };
  }

  if (item.type === 'file_change' && item.changes) {
    // Determine primary operation
    const change = item.changes[0];
    let toolName = 'edit_file';

    if (change.kind === 'add') toolName = 'write_file';
    if (change.kind === 'delete') toolName = 'delete_file';

    return {
      type: 'tool_use',
      id: item.id,
      name: toolName,
      input: {
        path: change.path,
      },
    };
  }

  return null;
}

// Map UnifiedToolUse to Codex prompt instructions
export function mapToolToCodexPrompt(tool: UnifiedToolUse): string {
  switch (tool.name) {
    case 'read_file':
      return `Read the file: ${tool.input.path}`;
    case 'write_file':
      return `Create file ${tool.input.path} with content: ${tool.input.content}`;
    case 'edit_file':
      return `Edit file ${tool.input.path}: ${tool.input.instructions}`;
    case 'bash':
      return `Execute command: ${tool.input.command}`;
    default:
      return `Perform operation: ${tool.name} with input ${JSON.stringify(tool.input)}`;
  }
}
```

### Type Definitions

```typescript
export interface CodexOptions {
  sessionId?: string;
  model?: string;
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
  approval?: 'untrusted' | 'on-failure' | 'on-request' | 'never';
  cwd?: string;
  skipGitCheck?: boolean;
  images?: string[];
  search?: boolean;
  config?: Record<string, any>;
}

export interface CodexMessage {
  timestamp: string;
  type: string;
  payload: {
    type?: string;
    role?: string;
    content?: any[];
    [key: string]: any;
  };
}

export interface CodexThreadEvent {
  type: 'thread.started';
  thread_id: string;
}

export interface CodexTurnEvent {
  type: 'turn.started' | 'turn.completed';
  usage?: {
    input_tokens: number;
    cached_input_tokens: number;
    output_tokens: number;
  };
}

export interface CodexItemEvent {
  type: 'item.started' | 'item.completed';
  item: CodexItem;
}

export type CodexEvent =
  | CodexThreadEvent
  | CodexTurnEvent
  | CodexItemEvent
  | { type: string; [key: string]: any };
```

### Usage Example

```typescript
import { spawnCodex, parseCodexOutput, loadCodexSession } from './codex';

// Start new session
const proc = spawnCodex('Create a function to add two numbers', {
  cwd: '/path/to/project',
  sandbox: 'workspace-write',
  approval: 'on-failure',
  skipGitCheck: false,
});

const events: CodexEvent[] = [];

parseCodexOutput(proc.stdout, (event) => {
  console.log('Event:', event.type);
  events.push(event);

  if (event.type === 'item.completed' && event.item.type === 'agent_message') {
    console.log('Agent response:', event.item.text);
  }
});

proc.on('close', (code) => {
  console.log('Process exited with code:', code);

  // Extract session ID from events
  const threadEvent = events.find((e) => e.type === 'thread.started') as CodexThreadEvent;
  const sessionId = threadEvent?.thread_id;

  if (sessionId) {
    console.log('Session ID:', sessionId);

    // Load full session later
    const session = loadCodexSession(sessionId);
    console.log('Session messages:', session.messages.length);
  }
});

// Resume existing session
const proc2 = spawnCodex('Add error handling to the function', {
  sessionId: 'existing-session-id',
  cwd: '/path/to/project',
  approval: 'never',
});
```

---

## Error Handling

### Common Errors

#### Error: Not inside a trusted directory

**Trigger:**
```bash
$ cd /tmp/test && codex exec "task"
```

**Output:**
```
Not inside a trusted directory and --skip-git-repo-check was not specified.
Shell cwd was reset to /Users/jnarowski/Dev/sourceborn/...
```

**Cause:** Codex requires running inside a Git repository for safety, or in a trusted directory configured in `config.toml`.

**Solution:**
1. Run inside a Git repo
2. Add `--skip-git-repo-check` flag
3. Add directory to trusted projects in config:
```toml
[projects."/tmp/test"]
trust_level = "trusted"
```

#### Error: Authentication required

**Trigger:**
```bash
$ codex "task"
```

**Output:**
```
Error: Not authenticated. Please run `codex login` first.
```

**Cause:** No valid authentication token.

**Solution:**
```bash
$ codex login
# or
$ echo $OPENAI_API_KEY | codex login --with-api-key
```

#### Error: Rate limit exceeded

**Trigger:** Too many requests in short time

**Output:**
```json
{
  "type": "error",
  "error": {
    "type": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please retry after 60 seconds."
  }
}
```

**Cause:** Exceeded OpenAI API rate limits.

**Solution:**
- Wait for rate limit window to reset (check `rate_limits.resets_in_seconds`)
- Upgrade to higher tier plan
- Reduce request frequency

#### Error: Session not found

**Trigger:**
```bash
$ codex resume invalid-session-id
```

**Output:**
```
Error: Session file not found for ID: invalid-session-id
```

**Cause:** Session ID doesn't exist or file was deleted.

**Solution:**
- Check session ID is correct
- List recent sessions: `find ~/.codex/sessions -name "*.jsonl" | tail -10`
- Use `codex resume --last` to resume most recent

#### Error: Sandbox violation

**Trigger:** Attempting to write outside workspace with `workspace-write` sandbox

**Output:**
```
Error: Sandbox violation: Cannot write to /etc/hosts
```

**Cause:** Operation violates sandbox policy.

**Solution:**
- Use `--sandbox danger-full-access` (if safe)
- Or change working directory to target location
- Or use `--dangerously-bypass-approvals-and-sandbox` (extreme caution)

### Error Detection Patterns

```typescript
// Regex patterns to detect errors in output
const errorPatterns = [
  /Error:/i,
  /not inside a trusted directory/i,
  /authentication required/i,
  /rate limit exceeded/i,
  /session .* not found/i,
  /sandbox violation/i,
];

export function isCodexError(line: string): boolean {
  return errorPatterns.some((pattern) => pattern.test(line));
}

// For JSON output, check event types
export function isCodexErrorEvent(event: CodexEvent): boolean {
  return (
    event.type === 'error' ||
    event.type === 'turn.failed' ||
    (event.type === 'item.completed' && event.item?.status === 'failed')
  );
}
```

---

## Troubleshooting

### CLI Not Found

**Symptom:** `command not found: codex`

**Solution:**

1. **Check if installed:**
```bash
$ which codex
# Should return: /opt/homebrew/bin/codex or similar
```

2. **Install via npm:**
```bash
$ npm install -g @openai/codex
$ npm list -g @openai/codex  # Verify
```

3. **Install via Homebrew:**
```bash
$ brew install --cask codex
$ brew list codex  # Verify
```

4. **Check PATH:**
```bash
$ echo $PATH | tr ':' '\n' | grep -E 'homebrew|npm'
```

5. **Restart terminal** after installation

### Session Not Loading

**Symptom:** `Error: Session file not found`

**Solution:**

1. **Verify session exists:**
```bash
$ find ~/.codex/sessions -name "*YOUR-SESSION-ID*.jsonl"
```

2. **Check session directory permissions:**
```bash
$ ls -la ~/.codex/sessions/
```

3. **List recent sessions:**
```bash
$ find ~/.codex/sessions -name "rollout-*.jsonl" | sort -r | head -10
```

4. **Use `--last` flag:**
```bash
$ codex resume --last
```

5. **Check session file integrity:**
```bash
$ head -1 ~/.codex/sessions/path/to/session.jsonl | jq .
# Should parse as valid JSON
```

### File Operations Failing

**Symptom:** "Sandbox violation" or "Permission denied"

**Solution:**

1. **Check sandbox mode:**
```bash
# Current command
codex exec "task" -s read-only  # Can't write

# Fix
codex exec "task" -s workspace-write  # Can write in workspace
```

2. **Verify working directory:**
```bash
codex exec "task" -C /path/to/project
```

3. **Check file permissions:**
```bash
$ ls -la /path/to/file
```

4. **Trust the project:**
```toml
# ~/.codex/config.toml
[projects."/path/to/project"]
trust_level = "trusted"
```

5. **Use bypass flag (only if safe):**
```bash
codex exec "task" --dangerously-bypass-approvals-and-sandbox
```

### Output Parsing Errors

**Symptom:** JSON parsing fails, truncated output

**Solution:**

1. **Use `--json` flag:**
```bash
codex exec "task" --json  # Ensures JSONL output
```

2. **Handle partial lines:**
```typescript
let buffer = '';

stream.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';  // Keep incomplete line

  lines.forEach((line) => {
    if (line.trim()) {
      const event = JSON.parse(line);
      // Process event
    }
  });
});
```

3. **Check for error messages mixed in:**
```typescript
if (isCodexError(line)) {
  console.error('Codex error:', line);
  return;
}
```

4. **Increase timeout:**
```bash
timeout 300 codex exec "long task"  # 5 minute timeout
```

5. **Verify JSON structure:**
```bash
codex exec "task" --json 2>&1 | jq .type
# Should print event types
```

### Authentication Issues

**Symptom:** "Not authenticated" or token expired

**Solution:**

1. **Check login status:**
```bash
$ codex login status
# Should show: "Logged in using ChatGPT" or "Logged in with API key"
```

2. **Re-authenticate:**
```bash
$ codex logout
$ codex login
```

3. **Verify API key (if using):**
```bash
$ echo $OPENAI_API_KEY
# Should show valid API key
```

4. **Check auth file:**
```bash
$ ls -la ~/.codex/auth.json
# Should exist with proper permissions
```

5. **Try alternative auth method:**
```bash
# If OAuth failing, try API key
echo $OPENAI_API_KEY | codex login --with-api-key
```

### Performance Issues

**Symptom:** Slow responses, timeouts

**Solution:**

1. **Check rate limits:**
```bash
# Look for rate_limits in output
codex exec "task" --json | jq 'select(.type=="event_msg" and .payload.type=="token_count") | .payload.rate_limits'
```

2. **Use cache-friendly prompts:**
```bash
# Consistent system instructions get cached
codex exec "task" -c 'instructions="<consistent prompt>"'
```

3. **Reduce reasoning effort:**
```bash
codex exec "task" -c 'model_reasoning_effort="low"'
```

4. **Use smaller model:**
```bash
codex exec "task" -m "codex-mini"
```

5. **Check network:**
```bash
$ ping api.openai.com
$ curl -I https://api.openai.com
```

---

## Best Practices

### 1. Session Management

**DO:**
- ✅ Use descriptive prompts that create meaningful session filenames
- ✅ Resume sessions when continuing work: `codex resume --last`
- ✅ Clean up old sessions periodically: `find ~/.codex/sessions -mtime +30 -delete`
- ✅ Store important session IDs for later reference

**DON'T:**
- ❌ Create new session for every single command
- ❌ Manually edit session files (breaks integrity)
- ❌ Mix unrelated tasks in one session

**Example:**
```bash
# Good: Focused session
codex "Implement user authentication feature"
codex resume --last "Add password hashing"
codex resume --last "Write tests for auth"

# Bad: Generic session
codex "do stuff"
codex resume --last "do more random stuff"
```

### 2. Output Parsing

**DO:**
- ✅ Always use `--json` for programmatic access
- ✅ Parse line-by-line for streaming
- ✅ Handle partial lines in buffers
- ✅ Validate JSON before processing
- ✅ Watch for `turn.completed` to detect end

**DON'T:**
- ❌ Parse text output with regex (unreliable)
- ❌ Wait for full output before processing (loses streaming)
- ❌ Assume events arrive in specific order
- ❌ Ignore error events

**Example:**
```typescript
// Good: Streaming parser
parseCodexOutput(stream, (event) => {
  if (event.type === 'item.completed' && event.item.type === 'agent_message') {
    updateUI(event.item.text);
  }
});

// Bad: Collect all then parse
let allOutput = '';
stream.on('data', (chunk) => (allOutput += chunk));
stream.on('end', () => parse(allOutput));  // Loses streaming
```

### 3. File Operations

**DO:**
- ✅ Use `workspace-write` sandbox for development
- ✅ Trust projects in config.toml for convenience
- ✅ Specify working directory with `-C` flag
- ✅ Review file changes before production use

**DON'T:**
- ❌ Use `--dangerously-bypass` in production
- ❌ Run with `danger-full-access` by default
- ❌ Trust arbitrary directories
- ❌ Skip reviewing critical file changes

**Example:**
```bash
# Good: Safe development workflow
codex --full-auto "Add feature X"  # workspace-write + on-failure
codex -s workspace-write "Run tests"

# Bad: Overly permissive
codex --dangerously-bypass-approvals-and-sandbox "do stuff"
```

### 4. Error Handling

**DO:**
- ✅ Check for error events in output
- ✅ Handle rate limits gracefully (retry with backoff)
- ✅ Validate session IDs before resuming
- ✅ Log errors for debugging
- ✅ Provide user-friendly error messages

**DON'T:**
- ❌ Ignore stderr output
- ❌ Assume all operations succeed
- ❌ Retry infinitely on rate limits
- ❌ Swallow authentication errors

**Example:**
```typescript
// Good: Comprehensive error handling
try {
  const proc = spawnCodex(prompt, options);

  parseCodexOutput(proc.stdout, (event) => {
    if (isCodexErrorEvent(event)) {
      handleError(event);
      return;
    }
    processEvent(event);
  });

  proc.stderr.on('data', (data) => {
    console.error('Codex stderr:', data.toString());
  });

  proc.on('exit', (code) => {
    if (code !== 0) {
      throw new Error(`Codex exited with code ${code}`);
    }
  });
} catch (err) {
  showUserError('Failed to run Codex. Please check configuration.');
  log.error('Codex error:', err);
}

// Bad: Minimal error handling
const proc = spawnCodex(prompt, options);
parseCodexOutput(proc.stdout, processEvent);
```

### 5. Performance

**DO:**
- ✅ Cache authentication tokens
- ✅ Reuse sessions for related tasks
- ✅ Use appropriate model for task (codex-mini for simple tasks)
- ✅ Enable prompt caching with consistent instructions
- ✅ Monitor token usage and rate limits

**DON'T:**
- ❌ Create new auth session for each request
- ❌ Use GPT-5 for trivial tasks
- ❌ Send unnecessarily large prompts
- ❌ Ignore cached token counts

**Example:**
```bash
# Good: Efficient usage
codex -m codex-mini "Simple task"  # Fast, cheap
codex resume --last "Continue complex task"  # Reuse context

# Bad: Wasteful
codex -m gpt-5-codex "What is 2+2?"  # Overkill
codex "Task 1"
codex "Task 2"  # Should have resumed session
```

### 6. Security

**DO:**
- ✅ Use sandbox modes in production
- ✅ Review generated commands before execution
- ✅ Store API keys in environment variables
- ✅ Use ChatGPT OAuth over API keys when possible
- ✅ Enable ZDR (zero data retention) for sensitive projects

**DON'T:**
- ❌ Commit API keys to version control
- ❌ Bypass sandboxes without external protection (CI, Docker)
- ❌ Trust untrusted directories
- ❌ Run with elevated privileges

**Example:**
```bash
# Good: Secure practices
export OPENAI_API_KEY=$(pass show openai)  # From password manager
codex --full-auto "task"  # Sandboxed

# Bad: Insecure
codex --dangerously-bypass-approvals-and-sandbox "task"  # No protection
```

---

## Appendix

### Full Help Output

```
$ codex --help
Codex CLI

If no subcommand is specified, options will be forwarded to the interactive CLI.

Usage: codex [OPTIONS] [PROMPT]
       codex [OPTIONS] [PROMPT] <COMMAND>

Commands:
  exec        Run Codex non-interactively [aliases: e]
  login       Manage login
  logout      Remove stored authentication credentials
  mcp         [experimental] Run Codex as an MCP server and manage MCP servers
  mcp-server  [experimental] Run the Codex MCP server (stdio transport)
  app-server  [experimental] Run the app server
  completion  Generate shell completion scripts
  sandbox     Run commands within a Codex-provided sandbox [aliases: debug]
  apply       Apply the latest diff produced by Codex agent as a `git apply` to your local working
              tree [aliases: a]
  resume      Resume a previous interactive session (picker by default; use --last to continue the
              most recent)
  cloud       [EXPERIMENTAL] Browse tasks from Codex Cloud and apply changes locally
  help        Print this message or the help of the given subcommand(s)

Arguments:
  [PROMPT]
          Optional user prompt to start the session

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as JSON. If it fails to parse as JSON, the raw string is used as a literal.

          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

  -i, --image <FILE>...
          Optional image(s) to attach to the initial prompt

  -m, --model <MODEL>
          Model the agent should use

      --oss
          Convenience flag to select the local open source model provider. Equivalent to -c
          model_provider=oss; verifies a local Ollama server is running

  -p, --profile <CONFIG_PROFILE>
          Configuration profile from config.toml to specify default options

  -s, --sandbox <SANDBOX_MODE>
          Select the sandbox policy to use when executing model-generated shell commands

          [possible values: read-only, workspace-write, danger-full-access]

  -a, --ask-for-approval <APPROVAL_POLICY>
          Configure when the model requires human approval before executing a command

          Possible values:
          - untrusted:  Only run "trusted" commands (e.g. ls, cat, sed) without asking for user
            approval. Will escalate to the user if the model proposes a command that is not in the
            "trusted" set
          - on-failure: Run all commands without asking for user approval. Only asks for approval if
            a command fails to execute, in which case it will escalate to the user to ask for
            un-sandboxed execution
          - on-request: The model decides when to ask the user for approval
          - never:      Never ask for user approval Execution failures are immediately returned to
            the model

      --full-auto
          Convenience alias for low-friction sandboxed automatic execution (-a on-failure, --sandbox
          workspace-write)

      --dangerously-bypass-approvals-and-sandbox
          Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY
          DANGEROUS. Intended solely for running in environments that are externally sandboxed

  -C, --cd <DIR>
          Tell the agent to use the specified directory as its working root

      --search
          Enable web search (off by default). When enabled, the native Responses `web_search` tool
          is available to the model (no per‑call approval)

  -h, --help
          Print help (see a summary with '-h')

  -V, --version
          Print version
```

### Environment Details

```bash
$ uname -a
Darwin Jasons-MacBook-Pro.local 25.0.0 Darwin Kernel Version 25.0.0: Thu Aug 15 00:31:30 PDT 2024; root:xnu-11215.1.10~2/RELEASE_ARM64_T6020 arm64

$ codex --version
codex-cli 0.46.0

$ echo $SHELL
/bin/zsh
```

### Test Files

Location of test files created during research:

- `/tmp/codex-test/`
  - `sample.txt` - Initial test file with "test content"
  - `new.txt` - Created by Codex with "Hello World"

### Additional Resources

- **Official Documentation**: https://developers.openai.com/codex/cli/
- **GitHub Repository**: https://github.com/openai/codex
- **Releases**: https://github.com/openai/codex/releases
- **Help Center**: https://help.openai.com/en/articles/11096431-openai-codex-cli-getting-started
- **Changelog**: https://developers.openai.com/codex/changelog/
- **TypeScript SDK**: https://github.com/openai/codex/tree/main/codex-ts (in main repo)
- **Issue Tracker**: https://github.com/openai/codex/issues
- **Prompting Guide**: https://github.com/openai/codex/blob/main/codex-cli/examples/prompting_guide.md

---

## Summary

**Key Findings:**

1. **Architecture**: Codex CLI is a production-ready, Rust-based agent with comprehensive JSONL output
2. **Session Management**: UUIDv7-based sessions stored in dated hierarchy, full conversation history preserved
3. **Output Formats**: Both human-readable text and structured JSONL available
4. **File Operations**: Native `file_change` events with granular change tracking
5. **Permission Model**: Flexible 4×3 matrix of approval policies and sandbox modes
6. **Integration Readiness**: Excellent for SDK integration with TypeScript SDK available

**Integration Recommendations:**

1. **Use `codex exec --json`** for all programmatic interactions (cleanest API)
2. **Parse JSONL line-by-line** for streaming support
3. **Map `item.completed` events** to UnifiedMessage format
4. **Store session files directly** (no transformation needed)
5. **Leverage session resumption** for conversational workflows
6. **Default to `--full-auto`** for development (safe + convenient)
7. **Use workspace-write sandbox** as default (good balance)
8. **Consider TypeScript SDK** for reference implementation

**Next Steps:**

1. Implement `spawnCodex()` function in agent-cli-sdk
2. Create `parseCodexOutput()` streaming parser
3. Implement `loadCodexSession()` for session loading
4. Add Codex provider to agent-cli-sdk with UnifiedMessage mapping
5. Write integration tests using real Codex CLI
6. Document Codex-specific options and capabilities
7. Consider adopting TypeScript SDK as alternative to spawning CLI

---

*Generated by Claude Code on October 28, 2025*
