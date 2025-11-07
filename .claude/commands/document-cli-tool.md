---
description: Research and document AI CLI tool capabilities through testing and experimentation
argument-hint: [cli-name]
---

# Document CLI Tool

Comprehensive research and documentation of an AI CLI tool's capabilities, output formats, session management, file operations, and permission modes. This command performs hands-on testing and generates detailed technical documentation for SDK integration.

## Variables

- $cli-name: $1 (required) - The name of the CLI tool to explore (e.g., "gemini", "codex", "cursor")

## Instructions

- Be thorough - actually run commands and capture real terminal output
- Document exact command syntax, flags, and output formats
- Test edge cases and failure modes
- Compare capabilities to Claude Code and Cursor CLI
- Focus on technical details needed for SDK integration
- Save all findings to `.agent/docs/${cli-name}.md` (lowercase cli name)

## Workflow

1. **Initial Discovery**
   - Check if CLI is installed (`which ${cli-name}` or platform equivalent)
   - If not installed, search for installation instructions online
   - Run help commands: `${cli-name} --help`, `${cli-name} -h`, `${cli-name} help`
   - Capture complete help output

2. **Command Reference Testing**
   - Test all available commands and subcommands
   - Document command syntax, required/optional flags
   - Capture example output for each command
   - Note any environment variables or configuration files

3. **Output Format Analysis**
   - Test different output formats (text, JSON, JSONL, stream-json, etc.)
   - Run same prompt with each format and capture exact output
   - Identify message boundaries and event types
   - Document parsing patterns and delimiters
   - Test: `${cli-name} "hello world" --output-format json`
   - Test: `${cli-name} "hello world" --output-format stream-json`
   - Test: `${cli-name} "hello world"` (default format)

4. **Session Management Deep Dive**
   - Create a test session: `${cli-name} "test prompt" --session test-session-1`
   - Identify session ID format and constraints
   - Find session storage location (files, database, config dirs)
   - Inspect session file structure and schema
   - Resume session with new prompt: `${cli-name} "follow-up" --session test-session-1`
   - Test session persistence across restarts
   - List all sessions (if command available)
   - Document session lifecycle and cleanup

5. **File Operations Testing**
   - Create test directory: `mkdir -p /tmp/${cli-name}-test`
   - Test file reading: Ask CLI to read a test file
   - Test file writing: Ask CLI to create a new file
   - Test file editing: Ask CLI to modify existing file
   - Capture exact tool call formats from output
   - Document available file operation tools
   - Track which files were actually modified
   - Test file path handling (absolute, relative, workspace-relative)

6. **Permission Modes Exploration**
   - Test interactive mode (default behavior)
   - Test auto-accept flags: `--yes`, `--auto-accept`, etc.
   - Test bypass permissions: `--no-confirm`, `--bypass`, etc.
   - Document safety controls and warnings
   - Identify non-interactive mode options
   - Test permission behavior with file operations

7. **Online Documentation Research**
   - Search for official documentation: "${cli-name} CLI documentation"
   - Search for GitHub repository: "${cli-name} CLI github"
   - Search for release notes and changelogs
   - Look for API/SDK documentation
   - Find known issues and troubleshooting guides

8. **Comparative Analysis**
   - Compare session management to Claude Code and Cursor CLI
   - Compare output formats and parsing requirements
   - Compare file operation tools and capabilities
   - Compare permission models
   - Identify unique features or limitations
   - Note compatibility considerations

9. **Generate Documentation**
   - Create `.agent/docs/${cli-name}-cli.md` (uppercase CLI name, e.g., `GEMINI_CLI.md`)
   - Use the Documentation Template below
   - Include all captured outputs, examples, and findings
   - Provide SDK integration recommendations

## Documentation Template

Generate the documentation file using this structure:

````markdown
# ${CLI-NAME} CLI Documentation

> Comprehensive technical documentation for integrating ${cli-name} CLI into agent-cli-sdk

**Research Date**: <current date>
**CLI Version**: <version if available>
**Platform**: <OS and architecture>

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

<Brief description of the CLI tool, its purpose, and primary use cases>

**Key Features:**

- <Feature 1>
- <Feature 2>
- <Feature 3>

**Installation Check:**

```bash
$ which ${cli-name}
<actual output>
```
````

---

## Installation & Setup

### Installation

<Step-by-step installation instructions>

```bash
# Installation command
<actual command>
```

### Configuration

<Environment variables, config files, API keys, etc.>

```bash
# Required environment variables
<list variables>

# Config file location
<path if applicable>
```

### Verification

```bash
$ ${cli-name} --version
<actual output>

$ ${cli-name} --help
<actual output>
```

---

## Command Reference

### Basic Usage

```bash
${cli-name} [options] "<prompt>"
```

### Available Commands

<Document each command with syntax, flags, and examples>

#### Command: <command-name>

**Syntax:**

```bash
${cli-name} <command> [flags]
```

**Flags:**

- `--flag1` - <description>
- `--flag2` - <description>

**Example:**

```bash
$ ${cli-name} <command> --flag1
<actual output>
```

---

## Output Formats

### Available Formats

<List all supported output formats>

### Format: Text (Default)

**Command:**

```bash
$ ${cli-name} "hello world"
```

**Output:**

```
<actual output - show complete raw output>
```

**Parsing Notes:**

- <How to identify message boundaries>
- <How to extract content>

### Format: JSON

**Command:**

```bash
$ ${cli-name} "hello world" --output-format json
```

**Output:**

```json
<actual JSON output>
```

**Schema:**

```typescript
interface OutputFormat {
  // Define structure based on actual output
}
```

### Format: JSONL / Stream JSON

**Command:**

```bash
$ ${cli-name} "hello world" --output-format stream-json
```

**Output:**

```jsonl
<actual JSONL output - show multiple lines>
```

**Event Types:**

- `<event-type-1>` - <description>
- `<event-type-2>` - <description>

**Parsing Strategy:**
<How to parse line-by-line, handle streaming, etc.>

---

## Session Management

### Session ID Format

<Describe format, constraints, allowed characters>

**Examples:**

- `<example-1>`
- `<example-2>`

### Creating Sessions

**Command:**

```bash
$ ${cli-name} "initial prompt" --session test-session-1
<actual output>
```

### Resuming Sessions

**Command:**

```bash
$ ${cli-name} "follow-up prompt" --session test-session-1
<actual output>
```

### Session Storage

**Location:**

```
<absolute path to session storage>
```

**File Structure:**

```
<show directory tree or file listing>
```

**Session Schema:**

```json
<show actual session file content>
```

### Session Persistence

<Results of persistence testing>

**Test Results:**

- Created session, restarted terminal, resumed: <success/failure>
- Session data retained: <yes/no>
- History preserved: <yes/no>

### Session Commands

<List commands for managing sessions if available>

```bash
# List sessions
${cli-name} sessions list

# Delete session
${cli-name} sessions delete <session-id>
```

---

## File Operations

### Available Tools

<List all file operation tools/capabilities>

1. **Read File** - <description>
2. **Write File** - <description>
3. **Edit File** - <description>
4. **List Directory** - <description>

### Testing File Operations

**Setup:**

```bash
$ mkdir -p /tmp/${cli-name}-test
$ echo "test content" > /tmp/${cli-name}-test/sample.txt
```

#### Test: Read File

**Prompt:**

```bash
$ ${cli-name} "Read the file /tmp/${cli-name}-test/sample.txt"
```

**Output:**

```
<actual output showing file read operation>
```

**Tool Call Format:**

```json
<extract tool use JSON if visible in output>
```

#### Test: Write File

**Prompt:**

```bash
$ ${cli-name} "Create a file at /tmp/${cli-name}-test/new.txt with content 'hello world'"
```

**Output:**

```
<actual output>
```

**Verification:**

```bash
$ cat /tmp/${cli-name}-test/new.txt
<actual file content>
```

#### Test: Edit File

**Prompt:**

```bash
$ ${cli-name} "Change 'hello' to 'goodbye' in /tmp/${cli-name}-test/new.txt"
```

**Output:**

```
<actual output>
```

**Verification:**

```bash
$ cat /tmp/${cli-name}-test/new.txt
<actual file content after edit>
```

### File Path Handling

<Document how paths are resolved: absolute, relative, workspace-relative>

---

## Permission Modes

### Interactive Mode (Default)

**Behavior:**
<Describe prompts, confirmations, user interaction>

**Example:**

```bash
$ ${cli-name} "create file test.txt"
<show interactive prompts>
```

### Auto-Accept Mode

**Flags:**
<List all flags that auto-accept operations>

**Example:**

```bash
$ ${cli-name} "create file test.txt" --yes
<show auto-accepted output>
```

### Bypass Permissions Mode

**Flags:**
<List flags for bypassing all permissions>

**Example:**

```bash
$ ${cli-name} "create file test.txt" --bypass-permissions
<show output>
```

**⚠️ Safety Warning:**
<Document risks and when to use>

### Permission Matrix

| Operation       | Interactive | Auto-Accept | Bypass     |
| --------------- | ----------- | ----------- | ---------- |
| Read File       | <behavior>  | <behavior>  | <behavior> |
| Write File      | <behavior>  | <behavior>  | <behavior> |
| Edit File       | <behavior>  | <behavior>  | <behavior> |
| Execute Command | <behavior>  | <behavior>  | <behavior> |

---

## Event Types Reference

<If using JSONL/streaming format, document all event types>

### Event Type: `<event-name>`

**Description:** <what this event represents>

**Structure:**

```json
<example event JSON>
```

**Fields:**

- `field1` - <description>
- `field2` - <description>

**When Emitted:** <trigger conditions>

<Repeat for all event types>

---

## Comparison to Other CLIs

### vs Claude Code

| Feature          | ${CLI-NAME} | Claude Code                             |
| ---------------- | ----------- | --------------------------------------- |
| Session Format   | <format>    | JSONL files                             |
| Output Formats   | <formats>   | text, stream-json                       |
| File Operations  | <tools>     | Read, Write, Edit                       |
| Permission Modes | <modes>     | default, acceptEdits, bypassPermissions |
| Session Storage  | <location>  | `~/.claude/history/`                    |

**Key Differences:**

- <difference 1>
- <difference 2>

### vs Cursor CLI

| Feature          | ${CLI-NAME} | Cursor CLI         |
| ---------------- | ----------- | ------------------ |
| Session Format   | <format>    | SQLite database    |
| Output Formats   | <formats>   | text, json         |
| File Operations  | <tools>     | Limited            |
| Permission Modes | <modes>     | Interactive only   |
| Session Storage  | <location>  | `~/.cursor-tutor/` |

**Key Differences:**

- <difference 1>
- <difference 2>

---

## SDK Integration Guide

### Recommended Approach

<High-level integration strategy>

### Process Spawning

```typescript
import { spawn } from 'cross-spawn';

export function spawn${CliName}(prompt: string, options: ${CliName}Options) {
  const args = [
    // Build args based on testing
  ];

  return spawn('${cli-name}', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}
```

### Output Parsing

```typescript
export function parse${CliName}Output(output: string): UnifiedMessage[] {
  // Parsing logic based on format testing
}
```

### Session Management

```typescript
export interface ${CliName}Session {
  id: string;
  // Fields based on schema discovery
}

export function load${CliName}Session(sessionId: string): ${CliName}Session {
  // Load from storage location
}
```

### Tool Mapping

```typescript
// Map ${cli-name} tools to UnifiedToolUse format
export function mapTo${CliName}Tool(tool: UnifiedToolUse): ${CliName}Tool {
  // Mapping logic
}
```

### Type Definitions

```typescript
export interface ${CliName}Options {
  sessionId?: string;
  outputFormat?: 'text' | 'json' | 'stream-json';
  autoAccept?: boolean;
  bypassPermissions?: boolean;
  // Other options based on testing
}

export interface ${CliName}Message {
  // Based on actual output format
}
```

---

## Error Handling

### Common Errors

#### Error: <error-name>

**Trigger:**

```bash
$ ${cli-name} <command-that-causes-error>
```

**Output:**

```
<actual error output>
```

**Cause:** <why this happens>

**Solution:** <how to fix>

<Repeat for all observed errors>

### Error Detection Patterns

```typescript
// Regex or patterns to detect errors in output
const errorPatterns = [/<pattern-1>/, /<pattern-2>/];
```

---

## Troubleshooting

### CLI Not Found

**Symptom:** `command not found: ${cli-name}`

**Solution:**

1. <step 1>
2. <step 2>

### Session Not Loading

**Symptom:** <description>

**Solution:**
<steps to resolve>

### File Operations Failing

**Symptom:** <description>

**Solution:**
<steps to resolve>

### Output Parsing Errors

**Symptom:** <description>

**Solution:**
<steps to resolve>

---

## Best Practices

1. **Session Management**
   - <practice 1>
   - <practice 2>

2. **Output Parsing**
   - <practice 1>
   - <practice 2>

3. **File Operations**
   - <practice 1>
   - <practice 2>

4. **Error Handling**
   - <practice 1>
   - <practice 2>

5. **Performance**
   - <practice 1>
   - <practice 2>

---

## Appendix

### Full Help Output

```
$ ${cli-name} --help
<complete help output>
```

### Environment Details

```bash
$ uname -a
<output>

$ ${cli-name} --version
<output>

$ echo $SHELL
<output>
```

### Test Files

Location of test files created during research:

- `/tmp/${cli-name}-test/`

### Additional Resources

- Official Documentation: <link>
- GitHub Repository: <link>
- Issue Tracker: <link>
- Community Forum: <link>

````

## Formatting Rules

- Use proper markdown headings (h2 for major sections, h3 for subsections)
- Include actual terminal output in code blocks with bash syntax highlighting
- Use tables for comparisons and matrices
- Include TypeScript code examples with proper syntax highlighting
- Add horizontal rules (`---`) between major sections
- Use blockquotes for important notes and warnings
- Include emojis sparingly (⚠️ for warnings, ✅ for success, ❌ for errors)

## Examples

**Basic usage:**
```bash
/explore-cli gemini
````

**For other AI CLIs:**

```bash
/explore-cli codex
/explore-cli aider
/explore-cli continue
```

## Common Pitfalls

- Don't skip the hands-on testing - documentation alone isn't enough
- Capture exact output, including whitespace and formatting
- Test edge cases (empty prompts, invalid sessions, permission denials)
- Compare against both Claude Code and Cursor CLI, not just one
- Document version-specific behaviors if CLI is version-sensitive

## Report

After completing research and generating the documentation:

**Summary:**

- CLI installation status: <installed/not installed>
- Commands tested: <count>
- Output formats supported: <list>
- Session management: <supported/not supported>
- File operations: <list of tools>
- Documentation generated: `.agent/docs/${CLI-NAME}_CLI.md`

**Key Findings:**

- <Notable finding 1>
- <Notable finding 2>
- <Notable finding 3>

**Integration Recommendations:**

- <Recommendation 1>
- <Recommendation 2>

**Next Steps:**

- <Suggested next step for SDK integration>
