# Loader Examples

This directory contains examples for using the agent CLI SDK loaders.

## Claude Session Loader

Load and display messages from a Claude Code session.

### Usage

```bash
tsx examples/loaders/load-claude-session.ts <sessionId> <projectPath>
```

### Parameters

- `sessionId` - The UUID of the Claude session (e.g., `6d4a75b7-81f3-4616-a998-d46202c1ec54`)
- `projectPath` - The absolute path to the project directory (e.g., `/Users/jnarowski/Dev/playground`)

### Example

```bash
# Load a specific Claude session
tsx examples/loaders/load-claude-session.ts cfa1e878-62b5-4e40-b281-bbf9b250d766 /Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2
```

### How it works

The loader:
1. Takes the `projectPath` and encodes it (replaces `/` with `-`)
2. Looks for the session file at: `~/.claude/projects/-{encoded-path}/{sessionId}.jsonl`
3. Parses all JSONL lines into unified message format
4. Sorts messages by timestamp
5. Returns array of `UnifiedMessage` objects

### Finding Session IDs

To find available session IDs for a project:

```bash
# List all sessions for a project
ls ~/.claude/projects/-Users-jnarowski-Dev-playground/

# Example output:
# 6d4a75b7-81f3-4616-a998-d46202c1ec54.jsonl
# a8f3c2e1-9b4d-4c8a-b5e6-7f8a9b0c1d2e.jsonl
```

The filename without `.jsonl` extension is the session ID.

### Output

The script displays:
- Number of messages loaded
- Summary (user messages, assistant messages, total)
- Preview of first 3 messages
- Full JSON output of all messages
