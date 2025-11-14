# GEMINI CLI Documentation

> Comprehensive technical documentation for integrating Gemini CLI into agent-cli-sdk

**Research Date**: October 29, 2025
**CLI Version**: 0.11.0
**Platform**: macOS ARM64 (Darwin 25.0.0)

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

Gemini CLI is Google's official command-line interface for the Gemini AI model (gemini-2.5-pro, gemini-2.5-flash). It provides interactive and non-interactive modes for AI-assisted coding, supports file operations, web search, and directory listing with a sophisticated approval system.

**Key Features:**

- Multiple approval modes: default (interactive), auto_edit, yolo
- Support for text, JSON, and stream-json output formats
- File operations: read_file, write_file, replace (edit)
- Web search integration (google_web_search)
- Directory listing (list_directory)
- MCP (Model Context Protocol) server support
- Extension system for custom functionality
- Session persistence with detailed logging

**Installation Check:**

```bash
$ which gemini
/Users/jnarowski/.local/share/mise/installs/node/22.20.0/bin/gemini
```

---

## Installation & Setup

### Installation

Gemini CLI is distributed as an npm package. Installation via npm or mise:

```bash
# Via npm (global)
npm install -g @google/generative-ai-cli

# Via mise (recommended for version management)
mise use -g node@22
npm install -g @google/generative-ai-cli
```

### Configuration

**Location**: `~/.gemini/`

**Directory Structure:**
```
~/.gemini/
├── google_accounts.json      # Google account configuration
├── oauth_creds.json           # OAuth credentials (private)
├── settings.json              # CLI settings
└── tmp/                       # Session storage
    ├── <project-hash>/        # Per-project sessions
    │   ├── chats/             # Session files
    │   └── logs.json          # Activity logs
    └── bin/                   # Cached binaries
```

**Settings File (`~/.gemini/settings.json`):**
```json
{
  "security": {
    "auth": {
      "selectedType": "oauth-personal"
    }
  }
}
```

**Required Environment Variables:**
- None (uses OAuth authentication via Google account)

### Verification

```bash
$ gemini --version
0.11.0

$ gemini --help
Usage: gemini [options] [command]

Gemini CLI - Launch an interactive CLI, use -p/--prompt for non-interactive mode

Commands:
  gemini [query..]             Launch Gemini CLI  [default]
  gemini mcp                   Manage MCP servers
  gemini extensions <command>  Manage Gemini CLI extensions.

Positionals:
  query  Positional prompt. Defaults to one-shot; use -i/--prompt-interactive for interactive.

Options:
  -d, --debug                     Run in debug mode?  [boolean] [default: false]
  -m, --model                     Model  [string]
  -p, --prompt                    Prompt. Appended to input on stdin (if any).  [deprecated]
  -i, --prompt-interactive        Execute the provided prompt and continue in interactive mode  [string]
  -s, --sandbox                   Run in sandbox?  [boolean]
  -y, --yolo                      Automatically accept all actions  [boolean] [default: false]
      --approval-mode             Set the approval mode: default, auto_edit, yolo  [string]
      --experimental-acp          Starts the agent in ACP mode  [boolean]
      --allowed-mcp-server-names  Allowed MCP server names  [array]
      --allowed-tools             Tools that are allowed to run without confirmation  [array]
  -e, --extensions                Extensions to use  [array]
  -l, --list-extensions           List all available extensions  [boolean]
      --include-directories       Additional directories to include  [array]
      --screen-reader             Enable screen reader mode  [boolean]
  -o, --output-format             Output format: text, json, stream-json  [string]
  -v, --version                   Show version number  [boolean]
  -h, --help                      Show help  [boolean]
```

---

## Command Reference

### Basic Usage

```bash
gemini [options] "<prompt>"
# OR
echo "prompt" | gemini [options]
```

### Available Commands

#### Command: Default (Interactive)

**Syntax:**
```bash
gemini [query]
```

**Description**: Launches interactive mode. If query is provided, executes it first then enters interactive mode with `-i/--prompt-interactive`.

**Example:**
```bash
$ gemini "What is 2+2?"
# Executes query in one-shot mode, exits after response
```

#### Command: mcp

**Syntax:**
```bash
gemini mcp <subcommand>
```

**Subcommands:**
- `add <name> <commandOrUrl> [args...]` - Add an MCP server
- `remove <name>` - Remove an MCP server
- `list` - List all configured MCP servers

**Example:**
```bash
$ gemini mcp list
# Lists all MCP servers
```

#### Command: extensions

**Syntax:**
```bash
gemini extensions <subcommand>
```

**Subcommands:**
- `install <source>` - Install extension from git URL or local path
- `uninstall <name>` - Uninstall extension
- `list` - List installed extensions
- `update [name]` - Update extension(s)
- `enable <name>` - Enable extension
- `disable <name>` - Disable extension
- `link <path>` - Link local extension for development
- `new <path> [template]` - Create new extension from template

**Example:**
```bash
$ gemini --list-extensions
Installed extensions:
# (Currently no extensions installed)
```

---

## Output Formats

### Available Formats

1. **text** (default) - Human-readable output
2. **json** - Complete response as JSON object
3. **stream-json** - Line-delimited JSON (JSONL) streaming events

### Format: Text (Default)

**Command:**
```bash
$ echo "What is 2+2?" | gemini --output-format text
```

**Output:**
```
Loaded cached credentials.
4
```

**Parsing Notes:**
- First line is typically a status message ("Loaded cached credentials.")
- Response content follows on subsequent lines
- No structured format - text extraction required

### Format: JSON

**Command:**
```bash
$ echo "What is the capital of France?" | gemini --output-format json
```

**Output:**
```json
{
  "response": "The capital of France is Paris.",
  "stats": {
    "models": {
      "gemini-2.5-pro": {
        "api": {
          "totalRequests": 2,
          "totalErrors": 0,
          "totalLatencyMs": 4675
        },
        "tokens": {
          "prompt": 15526,
          "candidates": 20,
          "total": 15659,
          "cached": 0,
          "thoughts": 113,
          "tool": 0
        }
      },
      "gemini-2.5-flash": {
        "api": {
          "totalRequests": 1,
          "totalErrors": 0,
          "totalLatencyMs": 1729
        },
        "tokens": {
          "prompt": 3814,
          "candidates": 7,
          "total": 3909,
          "cached": 0,
          "thoughts": 45,
          "tool": 43
        }
      }
    },
    "tools": {
      "totalCalls": 1,
      "totalSuccess": 1,
      "totalFail": 0,
      "totalDurationMs": 1731,
      "totalDecisions": {
        "accept": 0,
        "reject": 0,
        "modify": 0,
        "auto_accept": 1
      },
      "byName": {
        "google_web_search": {
          "count": 1,
          "success": 1,
          "fail": 0,
          "durationMs": 1731,
          "decisions": {
            "accept": 0,
            "reject": 0,
            "modify": 0,
            "auto_accept": 1
          }
        }
      }
    },
    "files": {
      "totalLinesAdded": 0,
      "totalLinesRemoved": 0
    }
  }
}
```

**Schema:**
```typescript
interface JSONOutput {
  response: string;
  stats: {
    models: {
      [modelName: string]: {
        api: {
          totalRequests: number;
          totalErrors: number;
          totalLatencyMs: number;
        };
        tokens: {
          prompt: number;
          candidates: number;
          total: number;
          cached: number;
          thoughts: number;
          tool: number;
        };
      };
    };
    tools: {
      totalCalls: number;
      totalSuccess: number;
      totalFail: number;
      totalDurationMs: number;
      totalDecisions: {
        accept: number;
        reject: number;
        modify: number;
        auto_accept: number;
      };
      byName: {
        [toolName: string]: {
          count: number;
          success: number;
          fail: number;
          durationMs: number;
          decisions: {
            accept: number;
            reject: number;
            modify: number;
            auto_accept: number;
          };
        };
      };
    };
    files: {
      totalLinesAdded: number;
      totalLinesRemoved: number;
    };
  };
}
```

### Format: JSONL / Stream JSON

**Command:**
```bash
$ echo "Say hello" | gemini --output-format stream-json
```

**Output:**
```jsonl
{"type":"init","timestamp":"2025-10-29T10:36:07.534Z","session_id":"2aa2472d-f175-41f6-a5a9-fd4f42cc345a","model":"gemini-2.5-pro"}
{"type":"message","timestamp":"2025-10-29T10:36:07.534Z","role":"user","content":"Say hello\n\n\n"}
{"type":"message","timestamp":"2025-10-29T10:36:09.772Z","role":"assistant","content":"Hello! I'm ready to help. What can I do for you?","delta":true}
{"type":"result","timestamp":"2025-10-29T10:36:09.773Z","status":"success","stats":{"total_tokens":7386,"input_tokens":7352,"output_tokens":16,"duration_ms":2239,"tool_calls":0}}
```

**Event Types:**
- `init` - Session initialization with session_id and model
- `message` - User or assistant message (delta for streaming)
- `tool_use` - Tool invocation
- `tool_result` - Tool execution result
- `result` - Final result with statistics

**Parsing Strategy:**
- Read line-by-line from stdout
- Parse each line as JSON
- Handle streaming by accumulating `delta:true` messages
- Session ends on `result` event with `status:"success"`

---

## Session Management

### Session ID Format

**Format**: UUID v4 (e.g., `2aa2472d-f175-41f6-a5a9-fd4f42cc345a`)

**Constraints**:
- Generated automatically per invocation
- Each CLI invocation creates a new session ID
- Cannot specify custom session ID via CLI flags

**Examples:**
- `2aa2472d-f175-41f6-a5a9-fd4f42cc345a`
- `9c9a14e1-2b8f-443b-8cec-61516ff39741`
- `f96c76b0-f4ed-448c-833c-16856e3585c7`

### Creating Sessions

Sessions are created automatically on first invocation within a project directory.

**Command:**
```bash
$ cd /path/to/project
$ gemini "initial prompt"
```

**Session Identifier**: Project hash (SHA-256 of absolute path)

### Resuming Sessions

⚠️ **Note**: Gemini CLI does **not support session resumption** via CLI flags. Each invocation creates a new session. However, session history is persisted for the project.

### Session Storage

**Location:**
```
~/.gemini/tmp/<project-hash>/
```

**Project Hash Calculation**: SHA-256 hash of absolute project path

**Example**:
- Project path: `/Users/jnarowski/Dev/playground/src/test-project/`
- Project hash: `1b37d21d2d347dc4deb92958752b51d6f657340fc961f32748333b8ed807a684`
- Session directory: `~/.gemini/tmp/1b37d21d2d347dc4deb92958752b51d6f657340fc961f32748333b8ed807a684/`

**File Structure:**
```
~/.gemini/tmp/<project-hash>/
├── chats/
│   └── session-2025-10-27T19-55-981c87cb.json  # Session transcript
└── logs.json  # Activity log (user messages only)
```

**Session Schema:**

`logs.json` (Activity log):
```json
[
  {
    "sessionId": "981c87cb-90ef-4c7f-948d-23173ff43e4e",
    "messageId": 0,
    "type": "user",
    "message": "Can you make me an ai agent in python",
    "timestamp": "2025-10-27T19:56:00.473Z"
  }
]
```

`chats/session-*.json` (Full session):
```json
{
  "sessionId": "981c87cb-90ef-4c7f-948d-23173ff43e4e",
  "projectHash": "1b37d21d2d347dc4deb92958752b51d6f657340fc961f32748333b8ed807a684",
  "startTime": "2025-10-27T19:56:01.701Z",
  "lastUpdated": "2025-10-27T20:24:29.688Z",
  "messages": [
    {
      "id": "18c1924b-2c10-4af0-a93d-97835c384747",
      "timestamp": "2025-10-27T19:56:01.701Z",
      "type": "user",
      "content": "Can you make me an ai agent in python"
    },
    {
      "id": "f7f9dcf5-759f-479d-864c-4969680ccb17",
      "timestamp": "2025-10-27T19:56:04.625Z",
      "type": "gemini",
      "content": "",
      "toolCalls": [
        {
          "id": "list_directory-1761594964607-802afbb1c1c44",
          "name": "list_directory",
          "args": {
            "path": "/Users/jnarowski/Dev/playground/src/test-project/"
          },
          "result": [{
            "functionResponse": {
              "id": "list_directory-1761594964607-802afbb1c1c44",
              "name": "list_directory",
              "response": {
                "output": "Directory is empty."
              }
            }
          }],
          "status": "success",
          "timestamp": "2025-10-27T19:56:04.625Z",
          "resultDisplay": "Directory is empty.",
          "displayName": "ReadFolder",
          "description": "Lists files and subdirectories...",
          "renderOutputAsMarkdown": true
        }
      ],
      "thoughts": [
        {
          "subject": "Considering Project Structure",
          "description": "I've started by listing the files...",
          "timestamp": "2025-10-27T19:56:04.598Z"
        }
      ]
    }
  ]
}
```

### Session Persistence

**Test Results:**
- ✅ Session data persisted across terminal sessions
- ✅ Session files retained permanently (manual cleanup required)
- ✅ History preserved in `logs.json`
- ❌ Cannot resume session via CLI (new session ID per invocation)
- ✅ Project context maintained via project hash

### Session Commands

⚠️ No built-in commands for session management (list, delete, resume). Session files must be managed manually in `~/.gemini/tmp/`.

---

## File Operations

### Available Tools

Gemini CLI provides these file operation tools:

1. **read_file** - Read file contents
2. **write_file** - Create or overwrite file
3. **replace** - Edit file with string replacement
4. **list_directory** - List directory contents
5. **glob** - Pattern-based file matching
6. **web_fetch** - Fetch web content (not a file tool, but available)
7. **google_web_search** - Web search (not a file tool, but available)

### Testing File Operations

**Setup:**
```bash
$ mkdir -p /tmp/gemini-test
$ echo "test content from gemini research" > /tmp/gemini-test/sample.txt
```

#### Test: Read File

**Prompt:**
```bash
$ cd /tmp/gemini-test && echo "Read the file /tmp/gemini-test/sample.txt" | gemini --output-format stream-json --yolo
```

**Output:**
```jsonl
{"type":"init","timestamp":"2025-10-29T10:36:24.686Z","session_id":"9c9a14e1-2b8f-443b-8cec-61516ff39741","model":"gemini-2.5-pro"}
{"type":"message","timestamp":"2025-10-29T10:36:24.687Z","role":"user","content":"Read the file..."}
{"type":"tool_use","timestamp":"2025-10-29T10:36:30.727Z","tool_name":"read_file","tool_id":"read_file-1761734190726-4dfc76eb0c846","parameters":{"absolute_path":"/private/tmp/gemini-test/sample.txt"}}
{"type":"tool_result","timestamp":"2025-10-29T10:36:30.748Z","tool_id":"read_file-1761734190726-4dfc76eb0c846","status":"success","output":""}
{"type":"message","timestamp":"2025-10-29T10:36:32.113Z","role":"assistant","content":"The file /private/tmp/gemini-test/sample.txt contains the following:\ntest content from gemini research\n","delta":true}
{"type":"result","timestamp":"2025-10-29T10:36:32.340Z","status":"success","stats":{"total_tokens":11431,"input_tokens":11068,"output_tokens":44,"duration_ms":7654,"tool_calls":1}}
```

**Tool Call Format:**
```json
{
  "type": "tool_use",
  "tool_name": "read_file",
  "tool_id": "read_file-1761734190726-4dfc76eb0c846",
  "parameters": {
    "absolute_path": "/private/tmp/gemini-test/sample.txt"
  }
}
```

#### Test: Write File

**Prompt:**
```bash
$ cd /tmp/gemini-test && echo "Create a new file at /tmp/gemini-test/created.txt with 'Hello from Gemini CLI'" | gemini --output-format stream-json --yolo
```

**Output:**
```jsonl
{"type":"init","timestamp":"2025-10-29T10:36:42.865Z","session_id":"f96c76b0-f4ed-448c-833c-16856e3585c7","model":"gemini-2.5-pro"}
{"type":"tool_use","timestamp":"2025-10-29T10:36:46.262Z","tool_name":"write_file","tool_id":"write_file-1761734206262-8f3d4cee1f321","parameters":{"file_path":"/tmp/gemini-test/created.txt","content":"Hello from Gemini CLI"}}
{"type":"tool_result","timestamp":"2025-10-29T10:36:46.304Z","tool_id":"write_file-1761734206262-8f3d4cee1f321","status":"success"}
{"type":"message","timestamp":"2025-10-29T10:36:48.198Z","role":"assistant","content":"Done.\n","delta":true}
{"type":"result","timestamp":"2025-10-29T10:36:48.240Z","status":"success","stats":{"total_tokens":11054,"input_tokens":10902,"output_tokens":24,"duration_ms":5375,"tool_calls":1}}
```

**Tool Call Format:**
```json
{
  "type": "tool_use",
  "tool_name": "write_file",
  "tool_id": "write_file-1761734206262-8f3d4cee1f321",
  "parameters": {
    "file_path": "/tmp/gemini-test/created.txt",
    "content": "Hello from Gemini CLI"
  }
}
```

**Verification:**
```bash
$ cat /tmp/gemini-test/created.txt
Hello from Gemini CLI
```

✅ **Success** - File created with correct content.

#### Test: Edit File

**Prompt:**
```bash
$ cd /tmp/gemini-test && echo "Change 'Hello' to 'Goodbye' in /tmp/gemini-test/created.txt" | gemini --output-format stream-json --yolo
```

**Output:**
```jsonl
{"type":"init","timestamp":"2025-10-29T10:37:00.097Z","session_id":"453aa339-7d2b-4709-a41a-b0b73beaff85","model":"gemini-2.5-pro"}
{"type":"tool_use","timestamp":"2025-10-29T10:37:05.259Z","tool_name":"read_file","tool_id":"read_file-1761734225259-ef6c719c767c","parameters":{"absolute_path":"/private/tmp/gemini-test/created.txt"}}
{"type":"tool_result","timestamp":"2025-10-29T10:37:05.272Z","tool_id":"read_file-1761734225259-ef6c719c767c","status":"success","output":""}
{"type":"tool_use","timestamp":"2025-10-29T10:37:08.885Z","tool_name":"replace","tool_id":"replace-1761734228885-7a63ed9561c45","parameters":{"file_path":"/private/tmp/gemini-test/created.txt","instruction":"Change \"Hello\" to \"Goodbye\"","new_string":"Goodbye from Gemini CLI","old_string":"Hello from Gemini CLI"}}
{"type":"tool_result","timestamp":"2025-10-29T10:37:08.914Z","tool_id":"replace-1761734228885-7a63ed9561c45","status":"success"}
{"type":"tool_use","timestamp":"2025-10-29T10:37:11.198Z","tool_name":"read_file","tool_id":"read_file-1761734231198-1c505312bf0b","parameters":{"absolute_path":"/private/tmp/gemini-test/created.txt"}}
{"type":"tool_result","timestamp":"2025-10-29T10:37:11.200Z","tool_id":"read_file-1761734231198-1c505312bf0b","status":"success","output":""}
{"type":"message","timestamp":"2025-10-29T10:37:13.195Z","role":"assistant","content":"Done.","delta":true}
{"type":"result","timestamp":"2025-10-29T10:37:13.196Z","status":"success","stats":{"total_tokens":22257,"input_tokens":21694,"output_tokens":77,"duration_ms":13099,"tool_calls":3}}
```

**Tool Call Format:**
```json
{
  "type": "tool_use",
  "tool_name": "replace",
  "tool_id": "replace-1761734228885-7a63ed9561c45",
  "parameters": {
    "file_path": "/private/tmp/gemini-test/created.txt",
    "instruction": "Change \"Hello\" to \"Goodbye\"",
    "new_string": "Goodbye from Gemini CLI",
    "old_string": "Hello from Gemini CLI"
  }
}
```

**Verification:**
```bash
$ cat /tmp/gemini-test/created.txt
Goodbye from Gemini CLI
```

✅ **Success** - File edited correctly.

**Note**: Gemini performs read → replace → read to verify the edit.

### File Path Handling

**Path Resolution**:
- Absolute paths: Used directly (e.g., `/tmp/gemini-test/file.txt`)
- macOS symlinks: Resolved to `/private/tmp/...` internally
- Relative paths: Resolved relative to current working directory
- Workspace-relative: Not explicitly supported

---

## Permission Modes

Gemini CLI has three approval modes:

1. **default** (interactive) - Prompts for approval
2. **auto_edit** - Auto-approves edit tools, prompts for others
3. **yolo** - Auto-approves all tools

### Interactive Mode (Default)

**Behavior**:
- Prompts user for approval before executing tools
- Interactive terminal required
- Non-interactive contexts (pipes, scripts) will hang

**Example:**
```bash
$ echo "Create file test.txt" | gemini
# Hangs waiting for user input (terminal not interactive)
```

**Tool Registry Limitation**:
In default mode without approval, some tools (like `write_file`) may not be registered.

**Error Output**:
```json
{
  "type": "tool_result",
  "tool_id": "write_file-...",
  "status": "error",
  "output": "Tool \"write_file\" not found in registry.",
  "error": {
    "type": "tool_not_registered",
    "message": "Tool \"write_file\" not found in registry. Did you mean one of: \"read_file\", \"web_fetch\", \"glob\"?"
  }
}
```

### Auto-Accept Edit Mode

**Flags:**
- `--approval-mode auto_edit`

**Behavior**:
- Automatically approves edit tools (`write_file`, `replace`)
- Still prompts for other tools (web_fetch, etc.)
- Suitable for file-focused workflows

**Example:**
```bash
$ echo "Create file /tmp/gemini-test/auto-edit-test.txt with 'test content'" | gemini --output-format stream-json --approval-mode auto_edit
```

**Output:**
```jsonl
{"type":"tool_use","tool_name":"write_file",...}
{"type":"tool_result","status":"success"}
```

✅ **Success** - File created without prompting.

### YOLO Mode (Bypass All Permissions)

**Flags:**
- `--yolo` (shorthand)
- `--approval-mode yolo` (explicit)

**Behavior**:
- Automatically approves ALL tools
- No user prompts
- Suitable for non-interactive automation
- ⚠️ **Use with caution** - full file system access

**Example:**
```bash
$ echo "Read /tmp/gemini-test/sample.txt" | gemini --output-format stream-json --yolo
```

**Output:**
```jsonl
{"type":"tool_use","tool_name":"read_file",...}
{"type":"tool_result","status":"success"}
```

✅ **Success** - Tool executed without approval.

**⚠️ Safety Warning:**
YOLO mode grants full file system access. Only use in trusted, sandboxed environments or with explicit user consent.

### Permission Matrix

| Operation           | Interactive       | Auto-Edit         | YOLO              |
| ------------------- | ----------------- | ----------------- | ----------------- |
| Read File           | Prompt            | Prompt            | Auto-approve      |
| Write File          | Not registered*   | Auto-approve      | Auto-approve      |
| Edit File (replace) | Not registered*   | Auto-approve      | Auto-approve      |
| List Directory      | Prompt            | Prompt            | Auto-approve      |
| Web Search          | Prompt            | Prompt            | Auto-approve      |
| Web Fetch           | Prompt            | Prompt            | Auto-approve      |

\* In default mode, tools may not be registered unless approval is granted interactively.

---

## Event Types Reference

Gemini CLI with `--output-format stream-json` emits these event types:

### Event Type: `init`

**Description:** Session initialization event, emitted at start.

**Structure:**
```json
{
  "type": "init",
  "timestamp": "2025-10-29T10:36:07.534Z",
  "session_id": "2aa2472d-f175-41f6-a5a9-fd4f42cc345a",
  "model": "gemini-2.5-pro"
}
```

**Fields:**
- `type` - Always `"init"`
- `timestamp` - ISO 8601 timestamp
- `session_id` - UUID v4 session identifier
- `model` - Model name (e.g., `"gemini-2.5-pro"`, `"gemini-2.5-flash"`)

**When Emitted:** First event in every stream-json output.

---

### Event Type: `message`

**Description:** User or assistant message content.

**Structure (User):**
```json
{
  "type": "message",
  "timestamp": "2025-10-29T10:36:07.534Z",
  "role": "user",
  "content": "Say hello\n\n\n"
}
```

**Structure (Assistant):**
```json
{
  "type": "message",
  "timestamp": "2025-10-29T10:36:09.772Z",
  "role": "assistant",
  "content": "Hello! I'm ready to help.",
  "delta": true
}
```

**Fields:**
- `type` - Always `"message"`
- `timestamp` - ISO 8601 timestamp
- `role` - `"user"` or `"assistant"`
- `content` - Message text
- `delta` (optional) - `true` for streaming chunks (assistant only)

**When Emitted:**
- User messages: Once at message submission
- Assistant messages: Multiple times (streaming) with `delta:true`, final message without `delta`

---

### Event Type: `tool_use`

**Description:** AI invokes a tool.

**Structure:**
```json
{
  "type": "tool_use",
  "timestamp": "2025-10-29T10:36:30.727Z",
  "tool_name": "read_file",
  "tool_id": "read_file-1761734190726-4dfc76eb0c846",
  "parameters": {
    "absolute_path": "/private/tmp/gemini-test/sample.txt"
  }
}
```

**Fields:**
- `type` - Always `"tool_use"`
- `timestamp` - ISO 8601 timestamp
- `tool_name` - Tool identifier (e.g., `"read_file"`, `"write_file"`, `"replace"`)
- `tool_id` - Unique tool invocation ID (format: `<tool_name>-<timestamp>-<random>`)
- `parameters` - Tool-specific parameters (object)

**When Emitted:** Before tool execution.

---

### Event Type: `tool_result`

**Description:** Tool execution result.

**Structure (Success):**
```json
{
  "type": "tool_result",
  "timestamp": "2025-10-29T10:36:30.748Z",
  "tool_id": "read_file-1761734190726-4dfc76eb0c846",
  "status": "success",
  "output": ""
}
```

**Structure (Error):**
```json
{
  "type": "tool_result",
  "timestamp": "2025-10-29T10:39:47.894Z",
  "tool_id": "write_file-1761734387890-c8c35a4b54873",
  "status": "error",
  "output": "Tool \"write_file\" not found in registry.",
  "error": {
    "type": "tool_not_registered",
    "message": "Tool \"write_file\" not found in registry..."
  }
}
```

**Fields:**
- `type` - Always `"tool_result"`
- `timestamp` - ISO 8601 timestamp
- `tool_id` - Matches `tool_use.tool_id`
- `status` - `"success"` or `"error"`
- `output` - Tool output (string, often empty for success)
- `error` (on error) - Error details
  - `type` - Error type (e.g., `"tool_not_registered"`)
  - `message` - Human-readable error message

**When Emitted:** Immediately after tool execution.

---

### Event Type: `result`

**Description:** Final session result with statistics.

**Structure:**
```json
{
  "type": "result",
  "timestamp": "2025-10-29T10:36:09.773Z",
  "status": "success",
  "stats": {
    "total_tokens": 7386,
    "input_tokens": 7352,
    "output_tokens": 16,
    "duration_ms": 2239,
    "tool_calls": 0
  }
}
```

**Fields:**
- `type` - Always `"result"`
- `timestamp` - ISO 8601 timestamp
- `status` - `"success"` or `"error"`
- `stats` - Session statistics
  - `total_tokens` - Total tokens used
  - `input_tokens` - Input (prompt) tokens
  - `output_tokens` - Output (completion) tokens
  - `duration_ms` - Total duration in milliseconds
  - `tool_calls` - Number of tool invocations

**When Emitted:** Last event in stream-json output (signals completion).

---

## Comparison to Other CLIs

### vs Claude Code

| Feature                | Gemini CLI                           | Claude Code                                    |
| ---------------------- | ------------------------------------ | ---------------------------------------------- |
| **Session Format**     | JSON (per-project, auto-session-id)  | JSONL files (~/.claude/history/)               |
| **Output Formats**     | text, json, stream-json              | text, stream-json                              |
| **File Operations**    | read_file, write_file, replace       | Read, Write, Edit (string replacement)         |
| **Permission Modes**   | default, auto_edit, yolo             | default, acceptEdits, bypassPermissions        |
| **Session Storage**    | ~/.gemini/tmp/<project-hash>/        | ~/.claude/history/<session-id>.jsonl           |
| **Session Resumption** | ❌ Not supported                      | ✅ Supported via `--session <id>`               |
| **Model**              | gemini-2.5-pro, gemini-2.5-flash     | claude-3.5-sonnet, claude-opus                 |
| **Tool Naming**        | snake_case (read_file, write_file)   | PascalCase (Read, Write, Edit)                 |
| **Web Search**         | ✅ google_web_search                  | ❌ Not available                                |
| **Thoughts/CoT**       | ✅ Built-in (logged in session)       | ❌ Not available                                |
| **MCP Support**        | ✅ Built-in MCP server management     | ✅ Via configuration                            |
| **Extensions**         | ✅ Plugin system                      | ❌ Not available                                |
| **Sandbox Mode**       | ✅ via --sandbox                      | ❌ Not available                                |

**Key Differences:**

1. **Session Management**: Gemini uses project-based sessions (hash of working directory), Claude uses explicit session IDs
2. **Session Resumption**: Claude supports resuming via `--session`, Gemini does not
3. **Tool Registry**: Gemini has mode-dependent tool availability (some tools unavailable in default mode)
4. **Web Search**: Gemini includes built-in web search, Claude does not
5. **Thoughts/Chain-of-Thought**: Gemini logs "thoughts" (reasoning steps) in session files
6. **Extension System**: Gemini has a plugin architecture for custom functionality

### vs Cursor CLI

| Feature                | Gemini CLI                           | Cursor CLI                     |
| ---------------------- | ------------------------------------ | ------------------------------ |
| **Session Format**     | JSON (per-project, auto-session-id)  | SQLite database                |
| **Output Formats**     | text, json, stream-json              | text, json                     |
| **File Operations**    | read_file, write_file, replace       | Limited (read-only)            |
| **Permission Modes**   | default, auto_edit, yolo             | Interactive only               |
| **Session Storage**    | ~/.gemini/tmp/<project-hash>/        | ~/.cursor-tutor/main.db        |
| **Session Resumption** | ❌ Not supported                      | ✅ via database                 |
| **Model**              | gemini-2.5-pro, gemini-2.5-flash     | gpt-4-turbo, claude (via API)  |
| **Web Search**         | ✅ google_web_search                  | ❌ Not available                |
| **MCP Support**        | ✅ Built-in                           | ❌ Not available                |

**Key Differences:**

1. **Storage**: Cursor uses SQLite, Gemini uses JSON files
2. **File Operations**: Gemini has full read/write/edit, Cursor is more limited
3. **Permission Modes**: Gemini has sophisticated approval system, Cursor is interactive-only
4. **Web Search**: Gemini includes web search, Cursor does not

---

## SDK Integration Guide

### Recommended Approach

**High-level Strategy**:

1. **Process Spawning**: Use `cross-spawn` for cross-platform compatibility
2. **Output Parsing**: Use `stream-json` format, parse line-by-line
3. **Session Management**: Track project hash, manage `~/.gemini/tmp/` for history
4. **Permission Mode Mapping**: Map SDK permission modes to Gemini approval modes
5. **Tool Mapping**: Convert UnifiedToolUse to Gemini tool parameters

**Architecture**:

```typescript
import { spawn } from 'cross-spawn';
import { GeminiAdapter } from './adapters/gemini';

// Spawn Gemini process
const gemini = new GeminiAdapter({
  projectPath: '/path/to/project',
  permissionMode: 'auto_edit', // or 'yolo'
  model: 'gemini-2.5-pro',
});

// Send message
await gemini.sendMessage('Create a file test.txt with "hello"');

// Get streaming response
for await (const event of gemini.streamEvents()) {
  if (event.type === 'message' && event.role === 'assistant') {
    console.log(event.content);
  }
}
```

### Process Spawning

```typescript
import { spawn, type ChildProcess } from 'cross-spawn';

export interface GeminiOptions {
  projectPath: string;
  model?: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  permissionMode?: 'default' | 'auto_edit' | 'yolo';
  outputFormat?: 'text' | 'json' | 'stream-json';
  extensions?: string[];
  allowedTools?: string[];
  sandbox?: boolean;
  debug?: boolean;
}

export function spawnGemini(prompt: string, options: GeminiOptions): ChildProcess {
  const args: string[] = [];

  // Output format
  args.push('--output-format', options.outputFormat || 'stream-json');

  // Model
  if (options.model) {
    args.push('--model', options.model);
  }

  // Permission mode
  if (options.permissionMode === 'yolo') {
    args.push('--yolo');
  } else if (options.permissionMode === 'auto_edit') {
    args.push('--approval-mode', 'auto_edit');
  }

  // Allowed tools (for granular control)
  if (options.allowedTools && options.allowedTools.length > 0) {
    options.allowedTools.forEach(tool => {
      args.push('--allowed-tools', tool);
    });
  }

  // Sandbox mode
  if (options.sandbox) {
    args.push('--sandbox');
  }

  // Debug mode
  if (options.debug) {
    args.push('--debug');
  }

  // Positional prompt
  args.push(prompt);

  return spawn('gemini', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: options.projectPath,
  });
}
```

### Output Parsing

```typescript
import { Readable } from 'stream';
import * as readline from 'readline';

export interface GeminiEvent {
  type: 'init' | 'message' | 'tool_use' | 'tool_result' | 'result';
  timestamp: string;
  [key: string]: unknown;
}

export async function* parseGeminiStream(
  stream: Readable
): AsyncGenerator<GeminiEvent> {
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Skip empty lines and "Loaded cached credentials."
    if (!line.trim() || line.startsWith('Loaded cached')) {
      continue;
    }

    try {
      const event = JSON.parse(line) as GeminiEvent;
      yield event;
    } catch (err) {
      console.error('[parseGeminiStream] Invalid JSON:', line);
    }
  }
}

export function parseGeminiOutput(output: string): UnifiedMessage[] {
  const lines = output.split('\n');
  const messages: UnifiedMessage[] = [];

  let currentMessage: Partial<UnifiedMessage> | null = null;

  for (const line of lines) {
    if (!line.trim() || line.startsWith('Loaded cached')) continue;

    try {
      const event = JSON.parse(line) as GeminiEvent;

      switch (event.type) {
        case 'init':
          // Session initialized
          break;

        case 'message':
          if (event.role === 'user') {
            messages.push({
              id: generateId(),
              role: 'user',
              content: [{ type: 'text', text: event.content as string }],
              timestamp: Date.now(),
            });
          } else if (event.role === 'assistant') {
            if (!currentMessage) {
              currentMessage = {
                id: generateId(),
                role: 'assistant',
                content: [],
                timestamp: Date.now(),
              };
            }

            // Accumulate streaming content
            if (event.delta) {
              const textContent = currentMessage.content?.find(c => c.type === 'text');
              if (textContent) {
                (textContent as { text: string }).text += event.content;
              } else {
                currentMessage.content = [
                  { type: 'text', text: event.content as string }
                ];
              }
            } else {
              // Final message (no delta)
              if (currentMessage) {
                messages.push(currentMessage as UnifiedMessage);
                currentMessage = null;
              }
            }
          }
          break;

        case 'tool_use':
          // Track tool invocation
          if (!currentMessage) {
            currentMessage = {
              id: generateId(),
              role: 'assistant',
              content: [],
              timestamp: Date.now(),
            };
          }

          const toolUse: UnifiedToolUse = {
            type: 'tool_use',
            id: event.tool_id as string,
            name: event.tool_name as string,
            input: event.parameters as Record<string, unknown>,
          };

          currentMessage.content?.push(toolUse);
          break;

        case 'tool_result':
          // Tool result will be associated with the tool_use by tool_id
          // (handled in session file parsing, not stream parsing)
          break;

        case 'result':
          // Session complete
          if (currentMessage) {
            messages.push(currentMessage as UnifiedMessage);
            currentMessage = null;
          }
          break;
      }
    } catch (err) {
      console.error('[parseGeminiOutput] Parse error:', err);
    }
  }

  return messages;
}
```

### Session Management

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface GeminiSession {
  sessionId: string;
  projectHash: string;
  startTime: string;
  lastUpdated: string;
  messages: GeminiSessionMessage[];
}

export interface GeminiSessionMessage {
  id: string;
  timestamp: string;
  type: 'user' | 'gemini';
  content: string;
  toolCalls?: GeminiToolCall[];
  thoughts?: GeminiThought[];
}

export interface GeminiToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result: unknown[];
  status: 'success' | 'error';
  timestamp: string;
}

export interface GeminiThought {
  subject: string;
  description: string;
  timestamp: string;
}

/**
 * Calculate project hash (SHA-256 of absolute path)
 */
export function getProjectHash(projectPath: string): string {
  const absolutePath = path.resolve(projectPath);
  return crypto.createHash('sha256').update(absolutePath).digest('hex');
}

/**
 * Get Gemini session directory for project
 */
export function getGeminiSessionDir(projectPath: string): string {
  const projectHash = getProjectHash(projectPath);
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(homeDir, '.gemini', 'tmp', projectHash);
}

/**
 * Load latest session for project
 */
export function loadGeminiSession(projectPath: string): GeminiSession | null {
  const sessionDir = getGeminiSessionDir(projectPath);
  const chatsDir = path.join(sessionDir, 'chats');

  if (!fs.existsSync(chatsDir)) {
    return null;
  }

  // Find most recent session file
  const files = fs.readdirSync(chatsDir)
    .filter(f => f.startsWith('session-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return null;
  }

  const sessionFile = path.join(chatsDir, files[0]);
  const sessionData = fs.readFileSync(sessionFile, 'utf-8');
  return JSON.parse(sessionData) as GeminiSession;
}

/**
 * Get activity logs for project
 */
export function getGeminiLogs(projectPath: string): Array<{
  sessionId: string;
  messageId: number;
  type: string;
  message: string;
  timestamp: string;
}> {
  const sessionDir = getGeminiSessionDir(projectPath);
  const logsFile = path.join(sessionDir, 'logs.json');

  if (!fs.existsSync(logsFile)) {
    return [];
  }

  const logsData = fs.readFileSync(logsFile, 'utf-8');
  return JSON.parse(logsData);
}
```

### Tool Mapping

```typescript
import type { UnifiedToolUse } from '../types';

/**
 * Map UnifiedToolUse to Gemini tool invocation
 */
export function mapToGeminiTool(tool: UnifiedToolUse): {
  name: string;
  parameters: Record<string, unknown>;
} {
  switch (tool.name) {
    case 'Read':
      return {
        name: 'read_file',
        parameters: {
          absolute_path: (tool.input as { file_path: string }).file_path,
        },
      };

    case 'Write':
      return {
        name: 'write_file',
        parameters: {
          file_path: (tool.input as { file_path: string }).file_path,
          content: (tool.input as { content: string }).content,
        },
      };

    case 'Edit':
      return {
        name: 'replace',
        parameters: {
          file_path: (tool.input as { file_path: string }).file_path,
          old_string: (tool.input as { old_string: string }).old_string,
          new_string: (tool.input as { new_string: string }).new_string,
          instruction: `Replace "${(tool.input as { old_string: string }).old_string}" with "${(tool.input as { new_string: string }).new_string}"`,
        },
      };

    default:
      throw new Error(`Unknown tool: ${tool.name}`);
  }
}

/**
 * Map Gemini tool to UnifiedToolUse
 */
export function mapFromGeminiTool(geminiTool: {
  name: string;
  args: Record<string, unknown>;
  id: string;
}): UnifiedToolUse {
  switch (geminiTool.name) {
    case 'read_file':
      return {
        type: 'tool_use',
        id: geminiTool.id,
        name: 'Read',
        input: {
          file_path: geminiTool.args.absolute_path as string,
        },
      };

    case 'write_file':
      return {
        type: 'tool_use',
        id: geminiTool.id,
        name: 'Write',
        input: {
          file_path: geminiTool.args.file_path as string,
          content: geminiTool.args.content as string,
        },
      };

    case 'replace':
      return {
        type: 'tool_use',
        id: geminiTool.id,
        name: 'Edit',
        input: {
          file_path: geminiTool.args.file_path as string,
          old_string: geminiTool.args.old_string as string,
          new_string: geminiTool.args.new_string as string,
        },
      };

    case 'list_directory':
      return {
        type: 'tool_use',
        id: geminiTool.id,
        name: 'Bash', // Map to Bash tool for consistency
        input: {
          command: `ls -la ${geminiTool.args.path as string}`,
        },
      };

    default:
      // Unknown tool - pass through
      return {
        type: 'tool_use',
        id: geminiTool.id,
        name: geminiTool.name,
        input: geminiTool.args,
      };
  }
}
```

### Type Definitions

```typescript
export interface GeminiOptions {
  projectPath: string;
  model?: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  permissionMode?: 'default' | 'auto_edit' | 'yolo';
  outputFormat?: 'text' | 'json' | 'stream-json';
  extensions?: string[];
  allowedTools?: string[];
  sandbox?: boolean;
  debug?: boolean;
}

export interface GeminiEvent {
  type: 'init' | 'message' | 'tool_use' | 'tool_result' | 'result';
  timestamp: string;
  [key: string]: unknown;
}

export interface GeminiInitEvent extends GeminiEvent {
  type: 'init';
  session_id: string;
  model: string;
}

export interface GeminiMessageEvent extends GeminiEvent {
  type: 'message';
  role: 'user' | 'assistant';
  content: string;
  delta?: boolean;
}

export interface GeminiToolUseEvent extends GeminiEvent {
  type: 'tool_use';
  tool_name: string;
  tool_id: string;
  parameters: Record<string, unknown>;
}

export interface GeminiToolResultEvent extends GeminiEvent {
  type: 'tool_result';
  tool_id: string;
  status: 'success' | 'error';
  output: string;
  error?: {
    type: string;
    message: string;
  };
}

export interface GeminiResultEvent extends GeminiEvent {
  type: 'result';
  status: 'success' | 'error';
  stats: {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    duration_ms: number;
    tool_calls: number;
  };
}
```

---

## Error Handling

### Common Errors

#### Error: Tool Not Registered

**Trigger:**
```bash
$ echo "Create file test.txt" | gemini --output-format stream-json
```

**Output:**
```json
{
  "type": "tool_result",
  "tool_id": "write_file-...",
  "status": "error",
  "output": "Tool \"write_file\" not found in registry. Did you mean one of: \"read_file\", \"web_fetch\", \"glob\"?",
  "error": {
    "type": "tool_not_registered",
    "message": "Tool \"write_file\" not found in registry..."
  }
}
```

**Cause:** In default (interactive) mode without approval, edit tools (`write_file`, `replace`) are not registered.

**Solution:** Use `--approval-mode auto_edit` or `--yolo` to enable edit tools.

```bash
$ echo "Create file test.txt" | gemini --output-format stream-json --approval-mode auto_edit
```

---

#### Error: Timeout in Interactive Mode

**Trigger:**
```bash
$ echo "Read file test.txt" | timeout 5 gemini
```

**Symptom:** Process hangs waiting for user input, then times out.

**Cause:** Default mode requires interactive terminal for approval prompts. Piped input is not interactive.

**Solution:** Use non-interactive mode (`--yolo` or `--approval-mode auto_edit`).

```bash
$ echo "Read file test.txt" | gemini --yolo
```

---

#### Error: File Not Found

**Trigger:**
```bash
$ echo "Read /nonexistent/file.txt" | gemini --yolo --output-format stream-json
```

**Output:**
```json
{
  "type": "tool_result",
  "tool_id": "read_file-...",
  "status": "error",
  "output": "ENOENT: no such file or directory, open '/nonexistent/file.txt'",
  "error": {
    "type": "file_not_found",
    "message": "ENOENT: no such file or directory..."
  }
}
```

**Cause:** File does not exist at specified path.

**Solution:** Verify file path exists before reading.

---

### Error Detection Patterns

```typescript
// Regex patterns to detect errors in output
const errorPatterns = [
  /Tool ".*" not found in registry/,
  /ENOENT: no such file or directory/,
  /Permission denied/,
  /Invalid argument/,
];

export function isErrorOutput(line: string): boolean {
  return errorPatterns.some(pattern => pattern.test(line));
}

export function parseError(event: GeminiToolResultEvent): {
  type: string;
  message: string;
} {
  if (event.status === 'error' && event.error) {
    return {
      type: event.error.type,
      message: event.error.message,
    };
  }

  return {
    type: 'unknown',
    message: event.output || 'Unknown error',
  };
}
```

---

## Troubleshooting

### CLI Not Found

**Symptom:** `command not found: gemini`

**Solution:**

1. Verify installation:
   ```bash
   npm list -g @google/generative-ai-cli
   ```

2. Check PATH:
   ```bash
   echo $PATH | grep -o "[^:]*node[^:]*"
   ```

3. Reinstall:
   ```bash
   npm install -g @google/generative-ai-cli
   ```

4. Use full path:
   ```bash
   /path/to/node_modules/.bin/gemini --help
   ```

---

### Session Not Loading

**Symptom:** Expected session history not available.

**Solution:**

1. Check session directory exists:
   ```bash
   ls -la ~/.gemini/tmp/<project-hash>/
   ```

2. Verify project path hasn't changed:
   ```bash
   # Project hash is based on absolute path
   # Moving project creates new hash
   ```

3. Check session file:
   ```bash
   cat ~/.gemini/tmp/<project-hash>/chats/session-*.json | jq .
   ```

---

### File Operations Failing

**Symptom:** `write_file` or `replace` tools not found.

**Solution:**

Use `--approval-mode auto_edit` or `--yolo`:
```bash
gemini --approval-mode auto_edit "Create file test.txt"
```

---

### Output Parsing Errors

**Symptom:** JSON parse errors when reading stream-json output.

**Solution:**

1. Skip non-JSON lines:
   ```typescript
   if (!line.trim() || line.startsWith('Loaded cached')) {
     continue;
   }
   ```

2. Handle malformed JSON gracefully:
   ```typescript
   try {
     const event = JSON.parse(line);
   } catch (err) {
     console.error('Parse error:', line);
   }
   ```

3. Check for stderr output:
   ```typescript
   process.stderr.on('data', (data) => {
     console.error('Gemini stderr:', data.toString());
   });
   ```

---

## Best Practices

### 1. Session Management

- **Use Project Context**: Always run Gemini from project root to maintain consistent project hash
- **Cleanup Old Sessions**: Manually delete old sessions from `~/.gemini/tmp/` to save disk space
- **Log Activity**: Parse `logs.json` for session history and user message tracking
- **Session Files**: Don't rely on session resumption (not supported) - treat each invocation as stateless

### 2. Output Parsing

- **Use stream-json**: Always use `--output-format stream-json` for programmatic parsing
- **Skip Non-JSON**: Filter out "Loaded cached credentials." and other non-JSON output
- **Handle Streaming**: Accumulate `delta:true` messages until final message
- **Track Tool IDs**: Use `tool_id` to correlate `tool_use` and `tool_result` events
- **Detect Completion**: Wait for `result` event before considering session complete

### 3. File Operations

- **Use Absolute Paths**: Prefer absolute paths to avoid ambiguity
- **Enable Edit Tools**: Use `--approval-mode auto_edit` or `--yolo` for file operations
- **Verify Operations**: Check `tool_result` status before assuming success
- **Handle macOS Paths**: Be aware of `/private/tmp/` symlink resolution on macOS

### 4. Error Handling

- **Check Tool Result Status**: Always check `tool_result.status` before proceeding
- **Parse Error Objects**: Extract `error.type` and `error.message` for debugging
- **Retry on Transient Errors**: Implement retry logic for network/API errors
- **Log Failures**: Log failed tool invocations for post-mortem analysis

### 5. Performance

- **Choose Appropriate Model**: Use `gemini-2.5-flash` for faster responses, `gemini-2.5-pro` for better quality
- **Limit Tool Calls**: Minimize tool invocations to reduce latency
- **Use --allowed-tools**: Restrict available tools to reduce model decision time
- **Cache Credentials**: OAuth credentials are cached in `~/.gemini/oauth_creds.json`

---

## Appendix

### Full Help Output

```
$ gemini --help
Usage: gemini [options] [command]

Gemini CLI - Launch an interactive CLI, use -p/--prompt for non-interactive mode

Commands:
  gemini [query..]             Launch Gemini CLI  [default]
  gemini mcp                   Manage MCP servers
  gemini extensions <command>  Manage Gemini CLI extensions.

Positionals:
  query  Positional prompt. Defaults to one-shot; use -i/--prompt-interactive for interactive.

Options:
  -d, --debug                     Run in debug mode?  [boolean] [default: false]
  -m, --model                     Model  [string]
  -p, --prompt                    Prompt. Appended to input on stdin (if any).  [deprecated: Use the positional prompt instead. This flag will be removed in a future version.] [string]
  -i, --prompt-interactive        Execute the provided prompt and continue in interactive mode  [string]
  -s, --sandbox                   Run in sandbox?  [boolean]
  -y, --yolo                      Automatically accept all actions (aka YOLO mode, see https://www.youtube.com/watch?v=xvFZjo5PgG0 for more details)?  [boolean] [default: false]
      --approval-mode             Set the approval mode: default (prompt for approval), auto_edit (auto-approve edit tools), yolo (auto-approve all tools)  [string] [choices: "default", "auto_edit", "yolo"]
      --experimental-acp          Starts the agent in ACP mode  [boolean]
      --allowed-mcp-server-names  Allowed MCP server names  [array]
      --allowed-tools             Tools that are allowed to run without confirmation  [array]
  -e, --extensions                A list of extensions to use. If not provided, all extensions are used.  [array]
  -l, --list-extensions           List all available extensions and exit.  [boolean]
      --include-directories       Additional directories to include in the workspace (comma-separated or multiple --include-directories)  [array]
      --screen-reader             Enable screen reader mode for accessibility.  [boolean]
  -o, --output-format             The format of the CLI output.  [string] [choices: "text", "json", "stream-json"]
  -v, --version                   Show version number  [boolean]
  -h, --help                      Show help  [boolean]
```

### Environment Details

```bash
$ uname -a
Darwin Komodo.local 25.0.0 Darwin Kernel Version 25.0.0: Wed Sep 17 21:41:26 PDT 2025; root:xnu-12377.1.9~141/RELEASE_ARM64_T6041 arm64

$ gemini --version
0.11.0

$ echo $SHELL
/bin/zsh
```

### Test Files

Location of test files created during research:

- `/tmp/gemini-test/`
  - `sample.txt` - Test file for read operations
  - `created.txt` - Test file for write operations (final content: "Goodbye from Gemini CLI")
  - `auto-edit-test.txt` - Test file for auto_edit mode

### Additional Resources

- **Official Documentation**: https://ai.google.dev/gemini-api/docs/cli
- **GitHub Repository**: https://github.com/google/generative-ai-cli (likely)
- **npm Package**: https://www.npmjs.com/package/@google/generative-ai-cli
- **Issue Tracker**: https://github.com/google/generative-ai-cli/issues (if public)
- **Community Forum**: Google AI Developer Forum

---

**Report Generated**: October 29, 2025
**Tested on**: macOS ARM64 (Darwin 25.0.0)
**CLI Version**: 0.11.0
**Research Status**: ✅ Complete
