# Cursor CLI Documentation

## Overview

The Cursor CLI (`cursor-agent`) is an AI-powered command-line tool that provides an interactive agent capable of executing file operations, running shell commands, and engaging in multi-turn conversations with full session persistence.

**Version**: `2025.10.22-f894c20`
**Installation**: Auto-installed via Cursor IDE, typically at `~/.local/bin/cursor-agent`
**Default Model**: Claude 4.5 Sonnet

### Key Features

- **JSONL Streaming**: Full support for machine-readable streaming output
- **Session Persistence**: SQLite-based conversation history with resume capabilities
- **Rich Tool Ecosystem**: File operations, shell commands, search, and more
- **Permission Modes**: Configurable safety controls and sandbox execution
- **MCP Integration**: Model Context Protocol server support for extensibility

---

## Getting Started

### Check Installation

```bash
# Verify installation
which cursor-agent
# Output: /Users/username/.local/bin/cursor-agent

# Check version
cursor-agent --version
# Output: 2025.10.22-f894c20

# Check authentication
cursor-agent status
# Output: ✓ Logged in as user@example.com
```

### Authentication

```bash
# Login to Cursor
cursor-agent login

# Logout
cursor-agent logout

# Check status
cursor-agent whoami
```

### Basic Usage

```bash
# Simple prompt (interactive mode)
cursor-agent "what is 2+2?"

# Non-interactive mode (for scripts)
cursor-agent --print "what is 2+2?"

# With specific model
cursor-agent --model sonnet-4-thinking "solve this problem"

# Background mode (composer picker)
cursor-agent --background
```

---

## Complete Command Reference

```
Usage: cursor-agent [options] [command] [prompt...]

Arguments:
  prompt                       Initial prompt for the agent

Options:
  -v, --version                Output the version number
  --api-key <key>              API key for authentication (or use CURSOR_API_KEY env var)
  -p, --print                  Print responses to console (non-interactive, has access to all tools)
  -b, --background             Start in background mode (open composer picker)
  --resume [chatId]            Resume a chat session
  --model <model>              Model to use (gpt-5, sonnet-4, sonnet-4-thinking)
  -f, --force                  Force allow commands unless explicitly denied
  --approve-mcps               Automatically approve all MCP servers (headless mode only)
  --browser                    Enable browser automation support
  -h, --help                   Display help

Output Options (--print mode only):
  --output-format <format>     Output format: text | json | stream-json (default: text)
  --stream-partial-output      Stream partial output as individual text deltas
                               (requires --print and stream-json format)

Commands:
  install-shell-integration    Install shell integration to ~/.zshrc
  uninstall-shell-integration  Remove shell integration from ~/.zshrc
  login                        Authenticate with Cursor
  logout                       Sign out and clear authentication
  mcp                          Manage MCP servers
  status | whoami              View authentication status
  update | upgrade             Update Cursor Agent to latest version
  create-chat                  Create a new empty chat and return its ID
  agent [prompt...]            Start the Cursor Agent (default command)
  ls                           List chat sessions
  resume                       Resume the latest chat session
  sandbox                      Sandbox configuration and execution commands
  help [command]               Display help for command
```

---

## Output Formats

### Text Format (Default)

Simple text output, suitable for human reading but not for parsing.

```bash
cursor-agent --print "what is 2+2?"
```

**Output**:

```
2 + 2 = 4
```

**Use Case**: Quick queries, simple scripts where you only need the text result.

---

### JSON Format

Structured JSON response with metadata, returned after completion.

```bash
cursor-agent --print --output-format json "what is 3+3?"
```

**Output**:

```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "duration_ms": 5109,
  "duration_api_ms": 5109,
  "result": "6",
  "session_id": "bc273bb1-4af1-4d48-ab81-86767352da1d",
  "request_id": "56ee40f5-bd57-43f6-b277-157c2a24df40"
}
```

**Fields**:

- `type`: Always `"result"`
- `subtype`: `"success"` or `"error"`
- `is_error`: Boolean error flag
- `duration_ms`: Total execution time in milliseconds
- `duration_api_ms`: API call time in milliseconds
- `result`: The final response text
- `session_id`: Unique session identifier (UUID)
- `request_id`: Unique request identifier (UUID)

**Use Case**: Single-shot scripts where you need metadata and the final result.

---

### Stream-JSON Format (JSONL) ⭐ RECOMMENDED FOR SDK INTEGRATION

Newline-delimited JSON (JSONL) stream of events, suitable for real-time parsing and SDK integration.

```bash
cursor-agent --print --output-format stream-json "what is 5+5?"
```

**Output** (newline-delimited):

```jsonl
{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/path/to/project","session_id":"0c79b9f5-d4a6-433b-ab10-2212d47390af","model":"Claude 4.5 Sonnet","permissionMode":"default"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"what is 5+5?"}]},"session_id":"0c79b9f5-d4a6-433b-ab10-2212d47390af"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"10"}]},"session_id":"0c79b9f5-d4a6-433b-ab10-2212d47390af"}
{"type":"result","subtype":"success","duration_ms":4350,"duration_api_ms":4350,"is_error":false,"result":"10","session_id":"0c79b9f5-d4a6-433b-ab10-2212d47390af","request_id":"f3a09ba3-7d28-4516-9cb5-5645fd55f06b"}
```

**Event Types**:

- `type: "system"` - System initialization events
- `type: "user"` - User message events
- `type: "assistant"` - Assistant response events
- `type: "tool_call"` - Tool execution events (started/completed)
- `type: "result"` - Final result summary

**Use Case**: Real-time streaming applications, SDK integration, full conversation tracking.

---

### Stream Partial Output (Token-Level Streaming)

For real-time UI updates with individual token deltas.

```bash
cursor-agent --print --output-format stream-json --stream-partial-output "write a haiku"
```

**Output** (showing progressive text deltas):

```jsonl
{"type":"system","subtype":"init",...}
{"type":"user","message":{...}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Code"}]},"session_id":"...","timestamp_ms":1761698920748}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":" flows like"}]},"session_id":"...","timestamp_ms":1761698920850}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":" water\nThrough"}]},"session_id":"...","timestamp_ms":1761698920952}
...
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"<COMPLETE_TEXT>"}]},"session_id":"..."}
{"type":"result","subtype":"success",...}
```

**Key Observations**:

- Partial deltas include `timestamp_ms` field
- Final complete message has no timestamp
- Each delta is a complete message object (not a text fragment)

**Use Case**: Live typing effect in UIs, real-time streaming displays.

---

## Session Management

### Session Storage Structure

Sessions are stored in SQLite databases organized by project and chat ID.

**Location**: `~/.cursor/chats/{projectId}/{chatId}/store.db`

**Directory Structure**:

```
~/.cursor/chats/
├── 252f0c0d0bc44b5218e5ba5189b6e15e/  # Project ID (hash of cwd)
│   ├── ef886e42-25b4-4a52-92bf-881d6fc4232e/  # Chat ID (UUID)
│   │   ├── store.db
│   │   ├── store.db-shm
│   │   └── store.db-wal
│   └── 9723fb4a-6fba-4d96-ad41-e5bd4f468fec/
│       └── store.db
└── ca5afc7ffac8223694b6d5b22b279392/  # Another project
    └── ...
```

**Project ID**: Hash-based identifier derived from working directory path
**Chat ID**: UUID v4 format

---

### SQLite Database Schema

```sql
CREATE TABLE blobs (id TEXT PRIMARY KEY, data BLOB);
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
```

**Tables**:

- `blobs`: Stores message/event data as binary blobs
- `meta`: Stores session metadata (JSON hex-encoded)

**Example Metadata** (from `meta` table, key='0'):

```json
{
  "agentId": "ef886e42-25b4-4a52-92bf-881d6fc4232e",
  "latestRootBlobId": "85fd2147b558d584b2c0c16ba5a00da939de8abcc6854f5d29788c7ed81d634d",
  "name": "New Agent",
  "mode": "auto-run",
  "createdAt": 1761698454965
}
```

---

### Session Commands

#### Create New Session

```bash
cursor-agent create-chat
```

**Output**: Returns UUID of new session

```
0bae1f09-3bb0-49b8-9b9d-96a70ede533f
```

**Use Case**: Pre-create a session before sending messages, useful for scripting.

---

#### Resume Specific Session

```bash
cursor-agent --print --output-format stream-json --resume SESSION_ID "continue conversation"
```

**Example**:

```bash
cursor-agent --print --output-format stream-json --resume 0bae1f09-3bb0-49b8-9b9d-96a70ede533f "what was my last question?"
```

**Response**: Agent has full access to conversation history

```
Your last question was "what is 7+7?"
```

---

#### Resume Latest Session

```bash
cursor-agent resume
```

**Use Case**: Quick resume of most recent conversation (interactive mode).

---

#### List Sessions

```bash
cursor-agent ls
```

**Output**: Lists available chat sessions (format TBD - not tested in research).

---

### Session Persistence Testing

✅ **Confirmed**: Sessions maintain full conversation history across resume operations.

**Test Sequence**:

1. Created session: `0bae1f09-3bb0-49b8-9b9d-96a70ede533f`
2. Asked: "what is 7+7?" → Response: "14"
3. Exited and resumed same session
4. Asked: "what was my last question?" → Response: "Your last question was 'what is 7+7?'"

**Conclusion**: Session memory is fully functional and persists conversation context.

---

## File Operations & Tools

Cursor provides a rich set of tools for file and system operations. Each tool emits `tool_call` events with `started` and `completed` subtypes.

### Read Tool

Read file contents with metadata about file size and line counts.

**Agent Invocation**: Ask to read a file

```bash
cursor-agent --print --output-format stream-json "read the file test.txt"
```

**Tool Call Events**:

**Started Event**:

```json
{
  "type": "tool_call",
  "subtype": "started",
  "call_id": "toolu_01L2hETbkWkCLYAEXzBPTuCy",
  "tool_call": {
    "readToolCall": {
      "args": {
        "path": "/private/tmp/cursor-test/test.txt"
      }
    }
  },
  "model_call_id": "b3d847ee-ee15-43f8-811f-dfd85956d20d",
  "session_id": "70c4be5a-63e8-427f-893d-fa2f7c578f49",
  "timestamp_ms": 1761699007048
}
```

**Completed Event**:

```json
{
  "type": "tool_call",
  "subtype": "completed",
  "call_id": "toolu_01L2hETbkWkCLYAEXzBPTuCy",
  "tool_call": {
    "readToolCall": {
      "args": {
        "path": "/private/tmp/cursor-test/test.txt"
      },
      "result": {
        "success": {
          "content": "Hello from test file\n",
          "isEmpty": false,
          "exceededLimit": false,
          "totalLines": 2,
          "fileSize": 21,
          "path": "/private/tmp/cursor-test/test.txt",
          "readRange": {
            "startLine": 1,
            "endLine": 2
          }
        }
      }
    }
  },
  "model_call_id": "b3d847ee-ee15-43f8-811f-dfd85956d20d",
  "session_id": "70c4be5a-63e8-427f-893d-fa2f7c578f49",
  "timestamp_ms": 1761699007114
}
```

**Result Fields**:

- `content`: File contents as string
- `isEmpty`: Boolean flag for empty files
- `exceededLimit`: Whether file exceeded read limit
- `totalLines`: Number of lines in file
- `fileSize`: Size in bytes
- `readRange`: Line range that was read

---

### Edit Tool (Write/Modify Files)

Unified tool for both creating and editing files. Returns diff information.

**Agent Invocation**: Create or modify a file

```bash
cursor-agent --print --output-format stream-json --force "create a file called output.txt with text 'Hello World'"
```

**Completed Event** (excerpt):

```json
{
  "type": "tool_call",
  "subtype": "completed",
  "call_id": "toolu_01RPsoaVjQ1cJj8AbL6BdXKN",
  "tool_call": {
    "editToolCall": {
      "args": {
        "path": "/private/tmp/cursor-test/output.txt"
      },
      "result": {
        "success": {
          "path": "/private/tmp/cursor-test/output.txt",
          "resultForModel": "Wrote contents to /private/tmp/cursor-test/output.txt",
          "linesAdded": 1,
          "linesRemoved": 1,
          "diffString": "- \n+ Hello World from Cursor",
          "afterFullFileContent": "Hello World from Cursor"
        }
      }
    }
  },
  "timestamp_ms": 1761699020705
}
```

**Result Fields**:

- `path`: Path to modified file
- `resultForModel`: Human-readable summary
- `linesAdded`: Number of lines added
- `linesRemoved`: Number of lines removed
- `diffString`: Unified diff format showing changes
- `afterFullFileContent`: Complete file content after edit

**File Modification Tracking**: ✅ YES - Use `diffString` to track changes

---

### Shell Tool

Execute arbitrary bash commands with full output capture.

**Agent Invocation**: Run a shell command

```bash
cursor-agent --print --output-format stream-json --force "run ls -la"
```

**Completed Event** (excerpt):

```json
{
  "type": "tool_call",
  "subtype": "completed",
  "call_id": "toolu_01SzwGingsmdJsUPHGrZLh3V",
  "tool_call": {
    "shellToolCall": {
      "args": {
        "command": "ls -la",
        "workingDirectory": "",
        "timeout": 0,
        "toolCallId": "toolu_01SzwGingsmdJsUPHGrZLh3V",
        "simpleCommands": ["ls"],
        "hasInputRedirect": false,
        "hasOutputRedirect": false,
        "parsingResult": {
          "parsingFailed": false,
          "executableCommands": [
            {
              "name": "ls",
              "args": [{ "type": "word", "value": "-la" }],
              "fullText": "ls -la"
            }
          ],
          "hasRedirects": false,
          "hasCommandSubstitution": false
        }
      },
      "result": {
        "success": {
          "command": "ls -la",
          "workingDirectory": "",
          "exitCode": 0,
          "signal": "",
          "stdout": "total 16\ndrwxr-xr-x@   4 user  staff   128 Oct 28 18:50 .\n...",
          "stderr": "",
          "executionTime": 748
        }
      }
    }
  },
  "timestamp_ms": 1761699055795
}
```

**Result Fields**:

- `command`: Command that was executed
- `workingDirectory`: Working directory (if specified)
- `exitCode`: Command exit code (0 = success)
- `signal`: Termination signal (if any)
- `stdout`: Standard output
- `stderr`: Standard error
- `executionTime`: Execution time in milliseconds
- `parsingResult`: Rich command parsing metadata

---

### List Files Tool

List directory contents with tree structure.

**Agent Invocation**: List files

```bash
cursor-agent --print --output-format stream-json "list all files"
```

**Completed Event** (excerpt):

```json
{
  "type": "tool_call",
  "subtype": "completed",
  "call_id": "toolu_01FMxb49Xzo6xwXfzPeQWUEh",
  "tool_call": {
    "lsToolCall": {
      "args": {
        "path": "/private/tmp/cursor-test",
        "ignore": [],
        "toolCallId": "toolu_01FMxb49Xzo6xwXfzPeQWUEh"
      },
      "result": {
        "success": {
          "directoryTreeRoot": {
            "absPath": "/private/tmp/cursor-test",
            "childrenDirs": [],
            "childrenFiles": [{ "name": "danger.txt" }, { "name": "output.txt" }, { "name": "test.txt" }],
            "childrenWereProcessed": true,
            "fullSubtreeExtensionCounts": {},
            "numFiles": 0
          }
        }
      }
    }
  }
}
```

**Result Structure**: Returns directory tree with `childrenDirs` and `childrenFiles` arrays.

---

### Grep/Search Tool

Search file contents with pattern matching.

**Agent Invocation**: Search files

```bash
cursor-agent --print --output-format stream-json "search for files containing 'test'"
```

**Completed Event** (excerpt):

```json
{
  "type": "tool_call",
  "subtype": "completed",
  "call_id": "toolu_01Ua5Zuo2KZ3EzdRwfXdHzc7",
  "tool_call": {
    "grepToolCall": {
      "args": {
        "pattern": "test",
        "outputMode": "files_with_matches",
        "caseInsensitive": false,
        "multiline": false,
        "toolCallId": "toolu_01Ua5Zuo2KZ3EzdRwfXdHzc7"
      },
      "result": {
        "success": {
          "pattern": "test",
          "path": "",
          "outputMode": "files_with_matches",
          "workspaceResults": {
            "/private/tmp/cursor-test": {
              "files": {
                "files": ["./danger.txt", "./test.txt"],
                "totalFiles": 2,
                "clientTruncated": false,
                "ripgrepTruncated": false
              }
            }
          }
        }
      }
    }
  }
}
```

**Output Modes**:

- `files_with_matches` - Just file paths
- `content` - Full matching lines
- `count` - Match counts

**Args**:

- `pattern`: Search pattern (regex)
- `outputMode`: Output format
- `caseInsensitive`: Case-insensitive flag
- `multiline`: Multiline mode flag

---

### Complete Tool Inventory

| Tool Name  | Purpose                 | Cursor Name     | Claude Equivalent |
| ---------- | ----------------------- | --------------- | ----------------- |
| **Read**   | Read file contents      | `readToolCall`  | `Read`            |
| **Edit**   | Write/edit files        | `editToolCall`  | `Write` / `Edit`  |
| **Shell**  | Execute bash commands   | `shellToolCall` | `Bash`            |
| **List**   | List directory contents | `lsToolCall`    | N/A (uses `Bash`) |
| **Search** | Search file contents    | `grepToolCall`  | `Grep`            |

**Note**: Cursor uses a unified `editToolCall` for both creating and modifying files, whereas Claude has separate `Write` and `Edit` tools.

---

## Permission Modes

### Default Mode

Standard permission mode with normal prompts (interactive) or tool access (headless).

```bash
cursor-agent --print "create a file"
```

**Permission Mode in Output**:

```json
{ "type": "system", "subtype": "init", "permissionMode": "default" }
```

**Behavior**:

- Interactive: Prompts user for dangerous operations
- Headless (`--print`): Has access to all tools including write and bash by default

---

### Force Mode

Auto-allow all commands unless explicitly denied.

```bash
cursor-agent --print --force "run dangerous command"
```

**Flag**: `-f` or `--force`

**Description**: "Force allow commands unless explicitly denied"

**Permission Mode in Output**:

```json
{ "type": "system", "subtype": "init", "permissionMode": "force" }
```

**Use Case**: Equivalent to `bypassPermissions` mode in Claude Code - useful for automation and CI/CD.

---

### Sandbox Commands

Configure sandbox execution environment.

```bash
cursor-agent sandbox --help
```

**Available Commands**:

- `enable` - Enable sandbox mode
- `disable` - Disable sandbox (use allowlist mode)
- `reset` - Reset to defaults
- `run <cmd>` - Run command in sandbox

**Use Case**: Additional safety layer for testing or untrusted code execution.

---

### Permission Comparison to Claude Code

| Claude Mode         | Cursor Equivalent  | Behavior                             |
| ------------------- | ------------------ | ------------------------------------ |
| `default`           | Default (no flags) | Standard prompts in interactive mode |
| `acceptEdits`       | Not found          | N/A - may not exist in Cursor        |
| `bypassPermissions` | `--force`          | Auto-allow unless explicitly denied  |
| N/A                 | `sandbox` commands | Additional sandboxing layer          |

---

## Configuration Files

### CLI Configuration

**Location**: `~/.cursor/cli-config.json`

```json
{
  "permissions": {
    "allow": ["Shell(ls)", "Shell(cd)", "Shell(npm install)", "Shell(npm run)"],
    "deny": []
  },
  "version": 1,
  "editor": {
    "vimMode": false
  },
  "model": {
    "modelId": "claude-4.5-sonnet",
    "displayModelId": "sonnet-4.5",
    "displayName": "Claude 4.5 Sonnet",
    "displayNameShort": "Sonnet 4.5",
    "aliases": ["sonnet-4.5"]
  },
  "hasChangedDefaultModel": true,
  "privacyCache": {
    "ghostMode": true,
    "privacyMode": 2,
    "updatedAt": 1761698455755
  },
  "network": {
    "useHttp1ForAgent": false
  }
}
```

**Key Fields**:

- `permissions.allow`: Pre-approved shell commands (bypass prompts)
- `permissions.deny`: Explicitly denied commands
- `model`: Default model configuration
- `editor.vimMode`: Enable vim keybindings
- `privacyMode`: Privacy settings
- `network.useHttp1ForAgent`: HTTP version selection

---

### MCP Configuration

**Location**: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "Linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/sse"]
    },
    "Nuxt": {
      "url": "https://mcp.nuxt.com/sse"
    },
    "Shadcn-ui": {
      "command": "npx",
      "args": ["@jpisnice/shadcn-ui-mcp-server"]
    }
  }
}
```

**MCP (Model Context Protocol)**: Extension mechanism for adding custom tools and integrations.

**Server Configuration**:

- `command` + `args`: Execute local MCP server
- `url`: Connect to remote MCP server via SSE

**Use Case**: Extend Cursor with custom tools (Linear integration, Nuxt docs, UI components, etc.)

---

## JSONL Event Type Reference

### System Event

Emitted at initialization with session metadata.

```typescript
interface CursorSystemEvent {
  type: 'system';
  subtype: 'init';
  apiKeySource: string; // "login" or "env"
  cwd: string; // Current working directory
  session_id: string; // UUID of session
  model: string; // "Claude 4.5 Sonnet", etc.
  permissionMode: string; // "default" or "force"
}
```

**Example**:

```json
{
  "type": "system",
  "subtype": "init",
  "apiKeySource": "login",
  "cwd": "/path/to/project",
  "session_id": "0c79b9f5-d4a6-433b-ab10-2212d47390af",
  "model": "Claude 4.5 Sonnet",
  "permissionMode": "default"
}
```

---

### User Event

User message sent to the agent.

```typescript
interface CursorUserEvent {
  type: 'user';
  message: {
    role: 'user';
    content: Array<{
      type: 'text';
      text: string;
    }>;
  };
  session_id: string;
}
```

**Example**:

```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [{ "type": "text", "text": "what is 5+5?" }]
  },
  "session_id": "0c79b9f5-d4a6-433b-ab10-2212d47390af"
}
```

---

### Assistant Event

Assistant response (text or tool use).

```typescript
interface CursorAssistantEvent {
  type: 'assistant';
  message: {
    role: 'assistant';
    content: Array<{
      type: 'text';
      text: string;
    }>;
  };
  session_id: string;
  timestamp_ms?: number; // Only present in partial deltas
}
```

**Complete Response Example**:

```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [{ "type": "text", "text": "10" }]
  },
  "session_id": "0c79b9f5-d4a6-433b-ab10-2212d47390af"
}
```

**Partial Delta Example** (with `--stream-partial-output`):

```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [{ "type": "text", "text": "The answer" }]
  },
  "session_id": "...",
  "timestamp_ms": 1761698920748
}
```

**Key Difference**: Partial deltas include `timestamp_ms`, final message does not.

---

### Tool Call Event

Tool execution with started/completed lifecycle.

```typescript
interface CursorToolCallEvent {
  type: 'tool_call';
  subtype: 'started' | 'completed';
  call_id: string; // Tool call identifier
  tool_call: {
    readToolCall?: ReadToolCall;
    editToolCall?: EditToolCall;
    shellToolCall?: ShellToolCall;
    lsToolCall?: LsToolCall;
    grepToolCall?: GrepToolCall;
  };
  model_call_id: string; // Model request identifier
  session_id: string;
  timestamp_ms: number;
}

interface ReadToolCall {
  args: {
    path: string;
  };
  result?: {
    success?: {
      content: string;
      isEmpty: boolean;
      exceededLimit: boolean;
      totalLines: number;
      fileSize: number;
      path: string;
      readRange: {
        startLine: number;
        endLine: number;
      };
    };
    error?: {
      errorMessage: string;
    };
  };
}

interface EditToolCall {
  args: {
    path: string;
  };
  result?: {
    success?: {
      path: string;
      resultForModel: string;
      linesAdded: number;
      linesRemoved: number;
      diffString: string;
      afterFullFileContent: string;
    };
    error?: {
      errorMessage: string;
    };
  };
}

interface ShellToolCall {
  args: {
    command: string;
    workingDirectory: string;
    timeout: number;
    toolCallId: string;
    simpleCommands: string[];
    hasInputRedirect: boolean;
    hasOutputRedirect: boolean;
    parsingResult: any; // Rich parsing metadata
  };
  result?: {
    success?: {
      command: string;
      workingDirectory: string;
      exitCode: number;
      signal: string;
      stdout: string;
      stderr: string;
      executionTime: number;
    };
    error?: {
      errorMessage: string;
    };
  };
}

interface LsToolCall {
  args: {
    path: string;
    ignore: string[];
    toolCallId: string;
  };
  result?: {
    success?: {
      directoryTreeRoot: {
        absPath: string;
        childrenDirs: any[];
        childrenFiles: Array<{ name: string }>;
        childrenWereProcessed: boolean;
        fullSubtreeExtensionCounts: Record<string, number>;
        numFiles: number;
      };
    };
    error?: {
      errorMessage: string;
    };
  };
}

interface GrepToolCall {
  args: {
    pattern: string;
    outputMode: 'files_with_matches' | 'content' | 'count';
    caseInsensitive: boolean;
    multiline: boolean;
    toolCallId: string;
  };
  result?: {
    success?: {
      pattern: string;
      path: string;
      outputMode: string;
      workspaceResults: Record<string, any>;
    };
    error?: {
      errorMessage: string;
    };
  };
}
```

**Tool Call Lifecycle**:

1. `started` event with `args` only
2. `completed` event with `args` and `result`

**Error Handling**: If tool fails, `result.error` is populated instead of `result.success`.

---

### Result Event

Final summary of request execution.

```typescript
interface CursorResultEvent {
  type: 'result';
  subtype: 'success' | 'error';
  duration_ms: number;
  duration_api_ms: number;
  is_error: boolean;
  result: string; // Final text result
  session_id: string;
  request_id: string; // Unique request identifier
}
```

**Success Example**:

```json
{
  "type": "result",
  "subtype": "success",
  "duration_ms": 4350,
  "duration_api_ms": 4350,
  "is_error": false,
  "result": "10",
  "session_id": "0c79b9f5-d4a6-433b-ab10-2212d47390af",
  "request_id": "f3a09ba3-7d28-4516-9cb5-5645fd55f06b"
}
```

**Error Example**:

```json
{
  "type": "result",
  "subtype": "error",
  "duration_ms": 1234,
  "duration_api_ms": 1234,
  "is_error": true,
  "result": "Error: API key invalid",
  "session_id": "...",
  "request_id": "..."
}
```

---

## Comparison to Claude Code

### Similarities

✅ **JSONL Streaming**: Both support `--output-format stream-json` for structured event streams
✅ **Session Persistence**: Both maintain full conversation history
✅ **File Operations**: Both have read, write/edit, and bash execution tools
✅ **Tool Call Events**: Both emit structured tool invocation and result events
✅ **Permission Modes**: Both support configurable safety controls
✅ **Non-Interactive Mode**: Both support `--print` for scripting

---

### Key Differences

| Feature               | Claude Code                                            | Cursor CLI                                           |
| --------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| **Session Storage**   | JSONL files                                            | SQLite databases                                     |
| **Session Path**      | `~/.claude/projects/{encoded}/{sessionId}.jsonl`       | `~/.cursor/chats/{projectId}/{chatId}/store.db`      |
| **Tool Structure**    | Flat: `{type: "tool_use", name: "Read", input: {...}}` | Nested: `{tool_call: {readToolCall: {args: {...}}}}` |
| **Write/Edit Tools**  | Separate `Write` and `Edit` tools                      | Unified `editToolCall`                               |
| **List Files**        | Uses `Bash` tool with `ls` command                     | Dedicated `lsToolCall` tool                          |
| **Partial Streaming** | Not available                                          | `--stream-partial-output` flag                       |
| **Session ID Format** | Numeric timestamp strings                              | UUID v4 format                                       |
| **Project ID**        | Base64-like encoding of path                           | Hash-based from cwd                                  |
| **Config Location**   | `~/.claude/`                                           | `~/.cursor/`                                         |
| **MCP Support**       | Not documented                                         | Full MCP integration via config                      |
| **Sandbox Mode**      | Not available                                          | `sandbox` commands                                   |

---

### Tool Name Mapping (for SDK Normalization)

When integrating Cursor into an SDK that already supports Claude, normalize tool names:

| Cursor Tool     | Claude Equivalent | Normalization Strategy             |
| --------------- | ----------------- | ---------------------------------- |
| `readToolCall`  | `Read`            | Map directly                       |
| `editToolCall`  | `Write` or `Edit` | Determine by file existence        |
| `shellToolCall` | `Bash`            | Map directly                       |
| `lsToolCall`    | N/A               | New tool type or convert to `Bash` |
| `grepToolCall`  | `Grep`            | Map directly                       |

**Example Normalization**:

```typescript
function normalizeToolName(cursorTool: any): string {
  if (cursorTool.readToolCall) return 'Read';
  if (cursorTool.editToolCall) return 'Edit'; // or 'Write'
  if (cursorTool.shellToolCall) return 'Bash';
  if (cursorTool.lsToolCall) return 'Ls';
  if (cursorTool.grepToolCall) return 'Grep';
  return 'Unknown';
}
```

---

## SDK Integration Guide

### Integration Approach

For integrating Cursor CLI into the `agent-cli-sdk` package (similar to Claude Code integration), follow this phased approach:

---

### Phase 1: Basic Execution (Week 1)

**Goal**: Get basic command execution and JSONL parsing working.

**Tasks**:

1. CLI detection (`src/cursor/detectCli.ts`)
2. Type definitions (`src/cursor/types.ts`)
3. JSONL parser (`src/cursor/parse.ts`)
4. Execute implementation (`src/cursor/execute.ts`)
5. Integration into unified API (`src/index.ts`)
6. Unit tests for parser
7. E2E test for basic execution

**Example Execute Signature**:

```typescript
export async function executeCursor(
  prompt: string,
  options: {
    cwd?: string;
    sessionId?: string;
    permissionMode?: 'default' | 'force';
    onMessage?: (message: UnifiedMessage) => void;
    onToolUse?: (toolUse: UnifiedToolUse) => void;
    onComplete?: () => void;
  }
): Promise<CursorExecuteResult>;
```

**Command Construction**:

```typescript
const args = ['--print', '--output-format', 'stream-json'];

if (options.permissionMode === 'force') {
  args.push('--force');
}

if (options.sessionId) {
  args.push('--resume', options.sessionId);
}

args.push(prompt);

const child = spawn('cursor-agent', args, { cwd: options.cwd });
```

---

### Phase 2: Session Loading (Week 2)

**Goal**: Load existing sessions from SQLite databases.

**Challenge**: Sessions stored in binary SQLite format, not JSONL.

**Options**:

1. ✅ **Use `better-sqlite3`**: Read `store.db` directly, decode blobs
2. ❓ **CLI Export Command**: Check if Cursor has session export capability
3. ⚠️ **Skip for now**: Focus on execute-only initially

**Recommended First Step**: Check for export command

```bash
cursor-agent help export
cursor-agent help sessions
cursor-agent --help | grep export
```

**If Export Exists**:

```typescript
export async function loadCursorSession(sessionId: string, options: { cwd?: string }): Promise<UnifiedMessage[]>;
```

**If Export Doesn't Exist**: Add `better-sqlite3` dependency and implement SQLite reader.

---

### Phase 3: Advanced Features (Week 3)

**Goal**: Support advanced Cursor-specific features.

**Tasks**:

1. Partial output streaming (`--stream-partial-output`)
2. MCP tool support (if needed)
3. Sandbox mode configuration
4. Permission allowlist management
5. Model selection (`--model`)
6. Performance optimization

**Example Partial Streaming**:

```typescript
export async function executeCursorStreaming(
  prompt: string,
  options: {
    onToken?: (token: string, timestamp: number) => void;
    ...
  }
): Promise<CursorExecuteResult> {
  // Add --stream-partial-output flag
  // Parse timestamp_ms field to identify deltas
  // Emit incremental tokens via onToken callback
}
```

---

### Phase 4: Integration Testing (Week 4)

**Goal**: Ensure Cursor works seamlessly in web app and SDK.

**Tasks**:

1. Test against web app UI
2. Compare Cursor vs Claude behavior
3. Document differences in `CLAUDE.md`
4. Update web app UI to support Cursor
5. Add Cursor to agent selection dropdown
6. Test session resume in UI
7. Verify tool tracking and display

---

### Parser Implementation Pseudocode

```typescript
// src/cursor/parse.ts

export function parseCursorEvent(line: string): UnifiedMessage | null {
  const event: CursorEvent = JSON.parse(line);

  switch (event.type) {
    case 'system':
      // Extract session metadata, optionally return as message
      return {
        id: generateId(),
        role: 'system',
        content: [
          {
            type: 'text',
            text: `Session: ${event.session_id}, Model: ${event.model}`,
          },
        ],
        timestamp: Date.now(),
        tool: 'cursor',
        _original: event,
      };

    case 'user':
      return {
        id: generateId(),
        role: 'user',
        content: event.message.content,
        timestamp: Date.now(),
        tool: 'cursor',
        _original: event,
      };

    case 'assistant':
      return {
        id: generateId(),
        role: 'assistant',
        content: event.message.content,
        timestamp: event.timestamp_ms || Date.now(),
        tool: 'cursor',
        _original: event,
      };

    case 'tool_call':
      if (event.subtype === 'started') {
        // Normalize tool name and extract args
        const toolName = normalizeToolName(event.tool_call);
        const toolArgs = extractToolArgs(event.tool_call);

        return {
          id: event.call_id,
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: event.call_id,
              name: toolName,
              input: toolArgs,
            },
          ],
          timestamp: event.timestamp_ms,
          tool: 'cursor',
          _original: event,
        };
      } else {
        // Tool result
        const toolResult = extractToolResult(event.tool_call);
        const isError = hasError(event.tool_call);

        return {
          id: generateId(),
          role: 'system', // or 'assistant'
          content: [
            {
              type: 'tool_result',
              tool_use_id: event.call_id,
              content: toolResult,
              is_error: isError,
            },
          ],
          timestamp: event.timestamp_ms,
          tool: 'cursor',
          _original: event,
        };
      }

    case 'result':
      // Final summary - optionally return as message
      return null;

    default:
      return null;
  }
}

function normalizeToolName(toolCall: any): string {
  if (toolCall.readToolCall) return 'Read';
  if (toolCall.editToolCall) return 'Edit'; // or 'Write' based on context
  if (toolCall.shellToolCall) return 'Bash';
  if (toolCall.lsToolCall) return 'Ls';
  if (toolCall.grepToolCall) return 'Grep';
  return 'Unknown';
}

function extractToolArgs(toolCall: any): any {
  // Extract from nested structure
  if (toolCall.readToolCall) return toolCall.readToolCall.args;
  if (toolCall.editToolCall) return toolCall.editToolCall.args;
  if (toolCall.shellToolCall) return toolCall.shellToolCall.args;
  if (toolCall.lsToolCall) return toolCall.lsToolCall.args;
  if (toolCall.grepToolCall) return toolCall.grepToolCall.args;
  return {};
}

function extractToolResult(toolCall: any): string {
  // Navigate to result.success or result.error
  const tool = Object.values(toolCall)[0] as any;
  if (tool.result?.success) {
    return JSON.stringify(tool.result.success);
  }
  if (tool.result?.error) {
    return tool.result.error.errorMessage;
  }
  return '';
}

function hasError(toolCall: any): boolean {
  const tool = Object.values(toolCall)[0] as any;
  return !!tool.result?.error;
}
```

---

## Error Handling

### Tool Errors

When a tool fails, the `result` object contains an `error` field instead of `success`.

**Example**: Reading non-existent file

```json
{
  "type": "tool_call",
  "subtype": "completed",
  "call_id": "toolu_01FX2hJSTSd5sKTHfo6MLTFZ",
  "tool_call": {
    "readToolCall": {
      "args": {
        "path": "/path/to/nonexistent.txt"
      },
      "result": {
        "error": {
          "errorMessage": "File not found"
        }
      }
    }
  },
  "session_id": "..."
}
```

**Error Structure**:

- `result.error` instead of `result.success`
- Contains `errorMessage` field
- Tool call event still completes (doesn't throw)

**Agent Recovery**: Cursor gracefully handles errors and reports them to the user in natural language.

---

### Request Errors

If the entire request fails, a `result` event with `is_error: true` is emitted.

**Example**: API authentication failure

```json
{
  "type": "result",
  "subtype": "error",
  "duration_ms": 1234,
  "duration_api_ms": 0,
  "is_error": true,
  "result": "Error: Authentication failed. Please run 'cursor-agent login'",
  "session_id": "...",
  "request_id": "..."
}
```

**Common Errors**:

- Authentication failure (no API key or expired token)
- Invalid session ID (session not found)
- Network errors (API unreachable)
- Model errors (invalid model name)

---

## Troubleshooting

### Authentication Issues

**Problem**: `Error: Not authenticated`

**Solution**:

```bash
cursor-agent login
cursor-agent status  # Verify login
```

**Alternative**: Set API key via environment variable

```bash
export CURSOR_API_KEY="your-api-key"
cursor-agent --api-key "$CURSOR_API_KEY" "test prompt"
```

---

### Session Not Found

**Problem**: `Error: Session not found`

**Causes**:

1. Session ID doesn't exist
2. Session belongs to different project (different cwd)
3. Session database corrupted

**Solution**:

```bash
# List available sessions
cursor-agent ls

# Create new session
cursor-agent create-chat

# Use returned session ID
cursor-agent --resume SESSION_ID "continue conversation"
```

---

### Command Not Found

**Problem**: `cursor-agent: command not found`

**Solution**:

```bash
# Check installation
which cursor-agent

# Add to PATH if needed
export PATH="$HOME/.local/bin:$PATH"

# Verify installation
cursor-agent --version
```

---

### Permission Denied

**Problem**: Tool execution blocked by permissions

**Causes**:

1. Interactive mode requiring manual approval
2. Command in deny list (`~/.cursor/cli-config.json`)

**Solution**:

```bash
# Use force mode (bypass permissions)
cursor-agent --print --force "dangerous command"

# Or add to allow list in ~/.cursor/cli-config.json
{
  "permissions": {
    "allow": ["Shell(rm)", "Shell(git push)"],
    "deny": []
  }
}
```

---

### SQLite Database Locked

**Problem**: `Error: database is locked`

**Cause**: Multiple processes trying to access same session simultaneously

**Solution**:

```bash
# Wait for other process to finish
# Or create new session
cursor-agent create-chat
```

---

### Output Format Issues

**Problem**: Malformed JSON or missing events

**Causes**:

1. Using `--output-format json` instead of `stream-json`
2. Not using `--print` flag
3. Capturing stderr instead of stdout

**Solution**:

```bash
# Correct usage for JSONL streaming
cursor-agent --print --output-format stream-json "prompt"

# Capture stdout only
cursor-agent --print --output-format stream-json "prompt" 2>/dev/null
```

---

## Best Practices

### For Scripts and Automation

1. **Always use `--print`**: Required for non-interactive mode
2. **Use `stream-json` format**: Most reliable for parsing
3. **Use `--force` for automation**: Bypass permission prompts
4. **Capture session IDs**: For resuming multi-turn conversations
5. **Handle errors gracefully**: Check `is_error` field in result events
6. **Set working directory**: Use `cwd` to ensure correct project context

**Example Automation Script**:

```bash
#!/bin/bash

SESSION_ID=$(cursor-agent create-chat)

cursor-agent --print --force --output-format stream-json --resume "$SESSION_ID" \
  "analyze this codebase" | while IFS= read -r line; do
  echo "$line" | jq -r 'select(.type == "assistant") | .message.content[0].text'
done
```

---

### For SDK Integration

1. **Normalize tool names**: Map Cursor tools to unified types
2. **Handle nested structure**: Extract args from `tool_call.{toolName}ToolCall.args`
3. **Track session IDs**: Extract from `system` init event
4. **Preserve original events**: Store in `_original` field for debugging
5. **Handle partial streaming**: Use `timestamp_ms` to identify deltas
6. **Test error paths**: Verify error handling for failed tools

---

### For Interactive Use

1. **Use simple commands**: No flags needed for basic usage
2. **Resume sessions**: `cursor-agent resume` for quick continuation
3. **Enable vim mode**: Set in `~/.cursor/cli-config.json` if preferred
4. **Configure permissions**: Pre-approve common commands in config
5. **Use MCP servers**: Extend with custom tools via `~/.cursor/mcp.json`

---

## Summary

### Key Takeaways

✅ **Production-Ready**: Cursor CLI is stable and well-designed
✅ **SDK Integration**: Full JSONL streaming makes integration straightforward
✅ **Session Persistence**: Robust SQLite storage with full history
✅ **Rich Tooling**: Comprehensive file and shell operation support
✅ **Configurable Safety**: Multiple permission modes and sandbox support

### Integration Effort Estimate

- **Phase 1** (Basic Execution): 1 week
- **Phase 2** (Session Loading): 1 week
- **Phase 3** (Advanced Features): 1 week
- **Phase 4** (Testing & Integration): 1 week

**Total**: ~2-4 weeks for full integration into agent-cli-sdk

### Main Challenges

1. **SQLite Session Storage**: More complex than JSONL files (requires `better-sqlite3` or export mechanism)
2. **Tool Normalization**: Nested structure requires transformation layer
3. **Limited Documentation**: No official public docs (yet)
4. **Different Conventions**: Tool names, event structure differ from Claude

### Recommended Next Steps

1. Implement Phase 1 (basic execution) first
2. Test thoroughly against existing Claude integration
3. Decide on session loading approach (SQLite vs export)
4. Update web app UI to support Cursor as agent option
5. Document differences in project CLAUDE.md

---

## Appendix: Quick Reference

### Common Commands

```bash
# Create session
cursor-agent create-chat

# Execute with streaming
cursor-agent --print --output-format stream-json "prompt"

# Resume session
cursor-agent --resume SESSION_ID "continue"

# Force mode (bypass permissions)
cursor-agent --print --force "dangerous command"

# Partial streaming (token by token)
cursor-agent --print --output-format stream-json --stream-partial-output "prompt"

# Check authentication
cursor-agent status

# Update CLI
cursor-agent update
```

### File Locations

| Item           | Path                                            |
| -------------- | ----------------------------------------------- |
| **CLI Binary** | `~/.local/bin/cursor-agent`                     |
| **Sessions**   | `~/.cursor/chats/{projectId}/{chatId}/store.db` |
| **CLI Config** | `~/.cursor/cli-config.json`                     |
| **MCP Config** | `~/.cursor/mcp.json`                            |

### Event Types

| Type        | Subtype           | Purpose                   |
| ----------- | ----------------- | ------------------------- |
| `system`    | `init`            | Session initialization    |
| `user`      | -                 | User messages             |
| `assistant` | -                 | Assistant responses       |
| `tool_call` | `started`         | Tool invocation started   |
| `tool_call` | `completed`       | Tool invocation completed |
| `result`    | `success`/`error` | Final result summary      |

### Tool Mapping

| Cursor          | Claude         | Purpose          |
| --------------- | -------------- | ---------------- |
| `readToolCall`  | `Read`         | Read files       |
| `editToolCall`  | `Write`/`Edit` | Modify files     |
| `shellToolCall` | `Bash`         | Execute commands |
| `lsToolCall`    | N/A            | List files       |
| `grepToolCall`  | `Grep`         | Search files     |

---

**Last Updated**: 2025-10-28
**Cursor Agent Version**: 2025.10.22-f894c20
**Research Conducted By**: Claude (Sonnet 4.5) via Plan Agent
