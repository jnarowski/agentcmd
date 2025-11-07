---
name: session-finder
description: This skill should be used when the user wants to find, search, or resume previous Claude Code sessions based on conversation content, files edited, or tools used. Use this skill when the user asks to find sessions where they worked on specific topics, edited particular files, or used certain tools.
---

# Session Finder

## Overview

This skill enables searching through Claude Code session history to find previous conversations based on actual content, not just metadata. It provides accurate search results by parsing session JSONL files and ranking matches by relevance score.

## When to Use This Skill

Use this skill when the user requests:
- "Find sessions where I worked on [topic]"
- "Search for sessions that edited [filename]"
- "Show me sessions about [feature/bug/task]"
- "Find when I used [tool name]"
- "Resume the session where I worked on [something]"

## Quick Start

To search sessions, execute the `scripts/search_sessions.py` script:

```bash
python3 scripts/search_sessions.py "search terms" [optional-project-path]
```

**Examples:**
```bash
# Search current project for Pino log rotation work
python3 scripts/search_sessions.py "pino log rotation"

# Search specific project for authentication sessions
python3 scripts/search_sessions.py "authentication JWT" /Users/username/Dev/myproject

# Find sessions that edited config files
python3 scripts/search_sessions.py "config.ts"

# Find WebSocket-related work
python3 scripts/search_sessions.py "websocket refactor"
```

## How It Works

### Search Process

1. **Parse search terms** - Split the search description into keywords
2. **Locate session directory** - Find the Claude sessions directory for the project
3. **Scan JSONL files** - Parse each session file line-by-line
4. **Filter content** - Search only `message.content` fields (not metadata)
5. **Score matches** - Rank results by relevance:
   - Tool name matches: +2 points
   - Tool input matches: +1 point
   - Text content matches: +1 point per keyword
   - Tool result matches: +0.5 points
6. **Display results** - Show top 5 sessions with context and resume commands

### What Gets Searched

**Included (high-value signals):**
- Message text content (user and assistant messages)
- Tool names (Read, Write, Edit, Bash, etc.)
- Tool inputs (file paths, command arguments, etc.)
- Tool results (command output, file content, etc.)

**Excluded (to avoid false positives):**
- Session metadata (`sessionId`, `gitBranch`, `cwd`)
- Timestamps and UUIDs
- Version information

### Output Format

Results include:
- **Session ID** - Unique identifier for the session
- **Date** - When the session occurred
- **Relevance score** - High/Medium/Low based on match quality
- **Context snippets** - Excerpts showing why it matched
- **Files mentioned** - File paths that were edited or accessed
- **Tools used** - Which tools appeared in the session
- **Resume command** - Ready-to-use command to resume the session

## Usage Tips

### Effective Search Terms

**Good searches** (specific and meaningful):
- "pino log rotation" - Multiple related keywords
- "authentication JWT" - Feature + technology
- "config.ts websocket" - File + context
- "prisma migration" - Tool + action

**Poor searches** (too broad or generic):
- "error" - Too common, matches everything
- "file" - Generic term, low signal
- "a" - Single character, meaningless

### Multi-Keyword Strategy

Use multiple keywords to improve relevance:
- Single keyword: May match hundreds of sessions
- Multiple keywords: Narrows to relevant sessions
- Related terms: "log rotate daily" better than just "log"

### File Path Searches

Search for specific files:
- "server.ts" - Find work on that file
- "config" - Find all config file work
- "prisma schema" - Find schema-related sessions

### Tool-Based Searches

Search by tools used:
- "Edit config" - Sessions that edited config files
- "Bash npm" - Sessions running npm commands
- "Read schema" - Sessions reading schema files

## Technical Details

### Session File Location

Claude stores sessions at:
```
~/.claude/projects/<project-directory>/<session-id>.jsonl
```

Where `<project-directory>` is the project path with slashes replaced by dashes.

**Example:**
- Project: `/Users/jnarowski/Dev/myproject`
- Directory: `~/.claude/projects/-Users-jnarowski-Dev-myproject/`

### JSONL Structure

For detailed information about the JSONL format, content blocks, and search strategy, refer to `references/jsonl_format.md`.

Key points:
- Each line is a complete JSON object (one message)
- Only `message.content` fields contain conversation content
- Root-level fields are metadata (skip during search)
- Content blocks have types: `text`, `tool_use`, `tool_result`, `image`

### Script Behavior

The `search_sessions.py` script:
- Automatically determines the session directory from the project path
- Handles both absolute paths and current working directory
- Skips malformed JSON lines gracefully
- Sorts results by relevance score and recency
- Limits output to top 5 results for readability
- Provides resume commands with correct project paths

## Troubleshooting

### No Sessions Found

**Possible causes:**
1. No sessions exist for this project
2. Search terms too specific
3. Wrong project path specified
4. Sessions stored in different directory

**Solutions:**
- Try broader search terms
- Verify the project path is correct
- Check `~/.claude/projects/` for available session directories
- Omit project path to search current directory sessions

### False Positives

If results don't match expectations:
- Use more specific multi-keyword searches
- Include file names or tool names for precision
- Check the context snippets to understand why it matched
- Refine search terms based on the false matches

### Session Directory Not Found

The script converts file paths to Claude's directory format automatically. If it can't find the directory:
- Verify Claude Code has been run in that project before
- Check `~/.claude/projects/` to see available directories
- Ensure the project path is absolute (not relative)

## Resources

### scripts/search_sessions.py

Python script that performs the session search. Can be executed directly or referenced by Claude for understanding the implementation.

**Key features:**
- JSONL parsing with proper error handling
- Content-only search (skips metadata)
- Relevance scoring algorithm
- Project path conversion
- Human-readable output formatting

### references/jsonl_format.md

Comprehensive documentation of Claude's session JSONL structure, including:
- Complete JSON schema
- Content block types and formats
- Search strategy recommendations
- Common pitfalls and solutions
- Example code snippets

Load this reference when deeper understanding of the JSONL format is needed or when troubleshooting search issues.
