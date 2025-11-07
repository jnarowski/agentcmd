---
description: Find Claude sessions by searching content and return resume command
argument-hint: [search-description, project-path (optional)]
---

# Find Claude Session

Search through Claude Code session files to find specific sessions based on their content (messages, tool uses, file paths). Returns the command to resume the found session.

## Variables

- $search-description: $1 (required) - Description of what you're looking for (e.g., "sessions working on authentication", "sessions that edited config.ts", "sessions using WebSocket")
- $project-path: $2 (optional) - Specific project path to search within. If not provided, searches all projects in `/Users/jnarowski/.claude/projects`

## Instructions

- Search through `.jsonl` session files in the Claude projects directory
- Match against message content, tool uses, file paths, and text blocks
- Use fuzzy/semantic matching - don't require exact keywords
- Parse JSONL format correctly (one JSON object per line)
- Extract relevant context snippets showing why each session matched
- If multiple matches found, show top 5 with context
- Return the full resume command: `claude --resume <session-id> --project <project-path>`

## Workflow

1. **Determine search scope**
   - If $project-path provided, search only: `$project-path/.claude/projects/_/sessions/_.jsonl`
   - Otherwise, search all: `/Users/jnarowski/.claude/projects/*/sessions/*.jsonl`

2. **Search session files**
   - Read each `.jsonl` file line by line
   - Parse JSON objects (each line is a message/event)
   - Search in:
     - `content` blocks (text, tool uses, file paths)
     - Tool names (`tool_use` blocks)
     - File paths mentioned in any context
     - `thinking` blocks if present
   - Score relevance based on keyword matches and context

3. **Rank and present matches**
   - Sort by relevance score (most matches, recency as tiebreaker)
   - For top 5 matches, extract:
     - Session ID (from filename or session metadata)
     - Project path
     - Timestamp/date of session
     - 2-3 relevant excerpts showing why it matched (truncate long messages)
   - Display results in a readable format

4. **Generate resume command**
   - For each match, provide the exact command:
     ```
     claude --resume <session-id> --project <project-path>
     ```

## Search Strategy

**High-value signals** (boost relevance):

- Tool uses matching search terms (e.g., searching "Edit tool" finds sessions with Edit tool uses)
- File paths matching search terms (e.g., "config.ts" finds sessions that touched that file)
- Recent activity (sessions from today/this week rank higher)
- Multiple matches in same session (repeated mentions = more relevant)

**Content to search**:

- `tool_use` blocks: tool name, input parameters
- `text` blocks: message content
- `tool_result` blocks: output content
- File paths in any field
- Thinking blocks (if present)

**Example searches**:

- "authentication" → finds sessions mentioning auth, login, JWT, etc.
- "WebSocket refactor" → finds sessions with WebSocket-related edits
- "prisma migration" → finds sessions using Prisma commands or editing schema

## Output Format

Display results like this:

```
Found 3 matching sessions for "$search-description":

1. Session: abc123def (2 days ago)
   Project: /Users/jnarowski/Dev/project-name
   Relevance: High

   Context:
   - Used Edit tool on src/auth/login.ts
   - Message: "Let's refactor the authentication flow..."
   - Modified: auth.ts, jwt.ts, middleware.ts

   Resume: claude --resume abc123def --project /Users/jnarowski/Dev/project-name

2. Session: xyz789ghi (1 week ago)
   Project: /Users/jnarowski/Dev/other-project
   Relevance: Medium

   Context:
   - Used Bash tool: "npm run test:auth"
   - Message: "Fixing authentication bug in login handler"

   Resume: claude --resume xyz789ghi --project /Users/jnarowski/Dev/other-project

---

Which session would you like to resume?
```

## Edge Cases

- **No matches found**: Report that no sessions matched the search and suggest broadening search terms
- **Session file corrupted**: Skip invalid JSONL files and log warning
- **Permission issues**: Report if unable to read session directories
- **Empty search**: Prompt user to provide a search description

## Report

After searching:

- Report number of sessions searched
- Display top 5 matches with context snippets
- Provide exact resume commands for each match
- If no matches, suggest alternative search terms or list recent sessions
