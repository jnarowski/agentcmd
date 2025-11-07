# Claude Session JSONL Format Reference

## Overview

Claude Code stores session history as JSONL (JSON Lines) files where each line represents a single message or event in the conversation. These files are stored in `~/.claude/projects/<project-directory>/` with filenames matching the session ID.

## File Location

Sessions are stored at:
```
~/.claude/projects/<project-directory>/<session-id>.jsonl
```

Where `<project-directory>` is the project path with slashes replaced by dashes:
- Project: `/Users/jnarowski/Dev/myproject`
- Directory: `-Users-jnarowski-Dev-myproject`

## JSON Structure

Each line in the JSONL file is a complete JSON object representing a message.

### Message Structure

```json
{
  "parentUuid": "uuid-of-parent-message",
  "isSidechain": false,
  "userType": "external",
  "cwd": "/path/to/working/directory",
  "sessionId": "session-uuid",
  "version": "2.0.26",
  "gitBranch": "main",
  "type": "user|assistant",
  "message": {
    "role": "user|assistant",
    "content": [...]
  },
  "uuid": "message-uuid",
  "timestamp": "2025-10-31T12:00:00.000Z"
}
```

### Important Fields

#### Metadata Fields (DO NOT SEARCH)

These fields contain metadata and should be **excluded** from content searches to avoid false positives:

- `sessionId` - The session UUID
- `gitBranch` - Current git branch name
- `cwd` - Working directory path
- `version` - Claude Code version
- `parentUuid` - Parent message UUID
- `isSidechain` - Whether message is in a sidechain
- `userType` - Type of user (usually "external")
- `uuid` - Message UUID
- `timestamp` - ISO timestamp
- `type` - Message type (user/assistant)

**Why exclude these?** These fields can contain keywords that match search terms but don't represent actual conversation content. For example, a git branch named `feature/log-rotation` would match "log rotation" searches but isn't conversation content.

#### Content Fields (SHOULD SEARCH)

Only search within the `message.content` field, which contains the actual conversation:

- `message.content` - Array of content blocks (or string for older formats)

## Content Block Types

The `message.content` field is typically an array of content blocks. Each block has a `type` field indicating its purpose:

### 1. Text Blocks

User or assistant text messages.

```json
{
  "type": "text",
  "text": "Let's implement Pino log rotation for the server logs."
}
```

**Search:** The `text` field contains the actual conversation text.

### 2. Tool Use Blocks

When Claude uses a tool (Read, Write, Edit, Bash, etc.).

```json
{
  "type": "tool_use",
  "id": "toolu_123",
  "name": "Edit",
  "input": {
    "file_path": "/path/to/file.ts",
    "old_string": "...",
    "new_string": "..."
  }
}
```

**Search:**
- `name` - Tool name (Read, Write, Edit, Bash, etc.)
- `input` - Tool parameters (especially `file_path` for file operations)

### 3. Tool Result Blocks

Results returned by tools.

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_123",
  "content": "File updated successfully"
}
```

**Search:** The `content` field contains tool output.

### 4. Image Blocks

Base64-encoded images (usually screenshots).

```json
{
  "type": "image",
  "source": {
    "type": "base64",
    "data": "iVBORw0KG..."
  }
}
```

**Search:** Generally skip these (large binary data).

## Search Strategy

### High-Value Signals

1. **Tool uses** - Tool name matches indicate direct interaction
   - Weight: 2x (e.g., searching "Edit" finds Edit tool uses)

2. **File paths** - File path matches show work on specific files
   - Weight: 1.5x (e.g., searching "config.ts" finds edits to that file)

3. **Text content** - Message text matches show discussion
   - Weight: 1x (standard relevance)

4. **Tool results** - Output matches show related work
   - Weight: 0.5x (indirect relevance)

### Example Search Logic

Searching for "pino log rotation":

1. Split into terms: ["pino", "log", "rotation"]
2. For each message in JSONL:
   - **Skip metadata fields** (sessionId, gitBranch, etc.)
   - **Search message.content** only:
     - Text blocks: Check if any term appears in `text`
     - Tool use blocks: Check if any term appears in `name` or `input`
     - Tool result blocks: Check if any term appears in `content`
3. Score each match:
   - Tool name match: +2 points
   - Tool input match: +1 point
   - Text match: +1 point per term
   - Tool result match: +0.5 points
4. Sort by score (descending) and date (descending)

## Common Pitfalls

### False Positives

**Problem:** Searching for "rotation" matches `gitBranch: "feat/log-rotation"` metadata.

**Solution:** Only search within `message.content`, never root-level fields.

### Missing Context

**Problem:** Search finds matches but doesn't show why.

**Solution:** Extract snippets from matching blocks to show context.

### Over-Matching

**Problem:** Single keyword matches hundreds of sessions.

**Solution:** Use multi-term searches and rank by total score.

## Example Usage

```python
# Good: Search only message content
if 'message' in msg and 'content' in msg['message']:
    content = msg['message']['content']
    if isinstance(content, list):
        for block in content:
            if block.get('type') == 'text':
                text = block.get('text', '').lower()
                if 'pino' in text:
                    # Found match!

# Bad: Search everything (false positives)
if 'pino' in json.dumps(msg):
    # This would match metadata fields!
```
