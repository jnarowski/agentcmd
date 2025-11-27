---
description: Generate issue spec only (no implementation)
argument-hint: [context?]
---

# Issue Specification

Generate a focused spec for single issues, bugs, or small tasks. Creates structured spec at `.agent/specs/todo/[id]-[issue]/spec.md` with timestamp-based ID.

## Variables

- $param1: $1 (optional) - Issue context or description (infers from conversation if omitted)

## Instructions

- **IMPORTANT**: Use reasoning model - THINK HARD about issue scope, approach, AND complexity
- **IMPORTANT**: This command ONLY generates spec - do NOT implement code or make changes beyond spec folder/file and index.json
- Your ONLY file operations: create spec folder, write spec.md, update index.json - nothing else
- Normalize issue name to kebab-case for folder name
- Replace ALL `<placeholders>` with specific details
- **Create detailed tasks** with specific file paths and commands
- **Assign complexity (1-10) to EVERY task** using scale below
- Order tasks by dependencies
- Keep scope focused - if issue grows complex, consider `/cmd:generate-spec` instead
- **DO NOT include hour estimates** - use complexity points only

## Complexity Scale

Assign based on **context window usage and cognitive load**:

- **1-2/10**: Trivial - Single file, <50 lines, minimal context (config, doc, simple type)
- **3-4/10**: Simple - Few files, straightforward logic (single endpoint, basic component)
- **5-6/10**: Moderate - Multiple related files, moderate context (DB field + migration + API)
- **7-8/10**: Complex - Cross-cutting change, high context (full-stack feature, state refactor)
- **9-10/10**: Very complex - Architectural change, deep knowledge required (major refactor)

**Key principle**: Higher complexity = more context agent needs to load/understand

## Workflow

1. **Determine Context**:
   - If $param1 provided: Use as context
   - If $param1 empty: Infer from conversation history

2. **Generate Spec ID**:
   - Generate timestamp-based ID in format `YYMMDDHHmm` using current local time
   - Example: November 13, 2025 at 2:22pm local → `2511131422`
   - Read `.agent/specs/index.json` (will be updated in step 8)

3. **Generate Issue Name**:
   - Generate concise kebab-case name from context (max 4 words)
   - Examples: "Fix memory leak" → "memory-leak-fix", "Add export button" → "export-button"

4. **Research Phase**:
   - Search codebase for relevant patterns/files
   - Gather context on architecture and conventions
   - Identify files to modify

5. **Clarification** (conditional):
   - **If explicit context provided**: Resolve ambiguities autonomously
   - **If inferring from conversation**: Ask clarifying questions ONE AT A TIME:
     ```md
     **Question**: [Your question]
     **Suggestions**:
     1. [Option 1] (recommended - why)
     2. [Option 2]
     3. Other - user specifies
     ```

6. **Generate Spec**:
   - Follow Template below
   - Assign complexity to each task
   - Calculate totals and average
   - Be concise but complete

7. **Write Spec**:
   - Create folder `.agent/specs/todo/{timestampId}-{issueName}/`
   - Write `spec.md` (never spec.json)
   - Example: `.agent/specs/todo/2511131422-memory-leak-fix/spec.md`
   - Always starts in `todo/` with Status "draft"

8. **Update Index**:
   - Convert spec ID timestamp to UTC for storage:
     - Parse spec ID as local time (e.g., `2511131422` = Nov 13, 2025 at 2:22pm local)
     - Convert to UTC using system timezone offset
     - Format as ISO 8601 UTC string (YYYY-MM-DDTHH:mm:ssZ)
     - Example: 2:22pm MST (UTC-7) → `2025-11-13T21:22:00Z`
   - Add entry to `.agent/specs/index.json`:
     ```json
     {
       "specs": {
         "2511131422": {
           "folder": "2511131422-memory-leak-fix",
           "path": "todo/2511131422-memory-leak-fix/spec.md",
           "spec_type": "issue",
           "status": "draft",
           "created": "2025-11-13T21:22:00Z",
           "updated": "2025-11-13T21:22:00Z",
           "totalComplexity": 35,
           "phaseCount": 3,
           "taskCount": 7
         }
       }
     }
     ```
   - **IMPORTANT**: The `created` and `updated` timestamps must be true UTC, not local time with Z suffix
   - Complexity values match spec.md metadata from step 6

9. **Output Report** - Do NOT implement. Output JSON only.

## Template

**IMPORTANT: Use exact structure below:**

<!-- prettier-ignore-start -->
`````md
# [Issue Name]

**Status**: draft
**Type**: issue
**Created**: [YYYY-MM-DD]
**Package**: [package/app name]
**Total Complexity**: [X] points
**Tasks**: [N]
**Avg Complexity**: [X.X]/10

## Complexity Summary

| Metric          | Value    |
| --------------- | -------- |
| Total Tasks     | [N]      |
| Total Points    | [X]      |
| Avg Complexity  | [X.X]/10 |
| Max Task        | [X]/10   |

## Overview

[2-3 sentences describing the issue and why it needs fixing/implementing]

## User Story

As a [user type]
I want [action/goal]
So that [benefit/value]

## Technical Approach

[Description of how to solve this issue - approach, key changes, considerations]

**Key Points**:
- [Important detail 1]
- [Important detail 2]
- [Important detail 3]

## Files to Create/Modify

### New Files ([count])

1. `[filepath]` - [purpose]
[... list all new files if any]

### Modified Files ([count])

1. `[filepath]` - [what changes]
2. `[filepath]` - [what changes]
[... list all files to modify]

## Tasks

**IMPORTANT: Execute every task in order, top to bottom**

- [ ] [task-1] [X/10] [Specific task description]
  - [Implementation detail]
  - File: `[filepath]`
  - [Commands to run if any]
- [ ] [task-2] [X/10] [Next specific task]
  - [Implementation detail]
  - File: `[filepath]`
- [ ] [task-3] [X/10] [Another task]
  - [Details]

[Continue for all tasks needed]

## Testing Strategy

### Unit Tests

**`[test-file.test.ts]`**:
- [Test case 1]
- [Test case 2]

### Integration Tests (if applicable)

[Test approach]

## Success Criteria

- [ ] [Specific functional requirement]
- [ ] [Edge case handling]
- [ ] [Type safety/compilation]
- [ ] [Tests pass]
- [ ] [No regressions]

## Validation

**Automated:**

```bash
# Build
[build command]
# Expected: [output]

# Type check
[typecheck command]
# Expected: no errors

# Tests
[test command]
# Expected: all pass
```

**Manual:**

1. Start app: `[command]`
2. Navigate to: [location]
3. Verify: [behavior]
4. Test: [edge cases]

## Implementation Notes

### [Note Title]

[Important consideration or caveat]

## Dependencies

- [Dependency 1]
- No new dependencies (if true)

## References

- [Link to related issue/PR]
- [Link to docs]
`````
<!-- prettier-ignore-end -->

## Formatting Rules

1. **Dates**: ISO format (YYYY-MM-DD)
2. **Paths**: Backticks, absolute from root
3. **Code**: Triple backticks with language
4. **Sections**: `##` major, `###` subsections
5. **Lists**: `-` unordered, numbers ordered
6. **Emphasis**: `**bold**` for key terms
7. **Complexity**: `[X/10]` for tasks, `[X] points` for totals

## Examples

### Example 1: Infer from conversation

```bash
/cmd:generate-issue-spec
```

Analyzes conversation history, generates ID `251113142201`, creates: `.agent/specs/todo/251113142201-memory-leak-fix/spec.md`

### Example 2: Explicit context

```bash
/cmd:generate-issue-spec "Fix memory leak in workflow engine when runs are cancelled"
```

Uses explicit context, generates ID `251113142201`, creates: `.agent/specs/todo/251113142201-memory-leak-fix/spec.md`

### Example 3: Add spec to existing PRD folder

```bash
/cmd:generate-issue-spec 251113150000
```

Reuses folder with existing PRD, infers context from conversation + PRD, adds: `.agent/specs/todo/251113150000-export-button/spec.md`

### Example 4: Add spec with explicit context

```bash
/cmd:generate-issue-spec 251113150000 "Add export button to sessions page"
```

Reuses folder, uses explicit context, adds: `.agent/specs/todo/251113150000-export-button/spec.md`

## Common Pitfalls

- **Spec ID format**: Must be exactly 12 digits (`YYMMDDHHmmss`) to be recognized as folder reuse
- **Folder conflicts**: When reusing folder, verify spec.md doesn't already exist
- **Wrong directory**: Always `.agent/specs/todo/`, not `.agent/specs/`
- **Folder structure**: `{timestampId}-{issue}/spec.md` inside
- **Index not updated**: Must update index.json
- **Missing complexity in index**: Always add totalComplexity, phaseCount, taskCount to index.json entry
- **Generic placeholders**: Replace all `<placeholders>`
- **Missing complexity**: EVERY task needs `[X/10]`
- **Hour estimates**: Never include hours
- **Status**: Lowercase: `draft`, `ready`, `in-progress`, `review`, `completed`
- **spec_type**: Must be `"issue"` not `"feature"`
- **Scope creep**: Keep focused - use `/cmd:generate-spec` for features

## Report

**IMPORTANT**: Output ONLY raw JSON (see `.agent/docs/slash-command-json-output-format.md`).

<json_output>
{
  "success": true,
  "spec_folder": ".agent/specs/todo/[id]-[issue]",
  "spec_file": ".agent/specs/todo/[id]-[issue]/spec.md",
  "spec_id": "[id]",
  "spec_type": "issue",
  "issue_name": "[issue-name]",
  "complexity": {
    "total": "[X]",
    "avg": "[X.X]"
  },
  "files_to_create": ["[filepath1]"],
  "files_to_modify": ["[filepath2]"],
  "next_command": "/cmd:implement-spec [id]"
}
</json_output>
