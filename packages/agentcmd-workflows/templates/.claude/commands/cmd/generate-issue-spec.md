---
description: Generate spec for single issue/bug with tasks and complexity estimates
argument-hint: [context-or-spec-id?, context?]
---

# Issue Specification

Generate a focused spec for single issues, bugs, or small tasks. Creates structured spec at `.agent/specs/todo/[id]-[issue]/spec.md` with timestamp-based ID.

## Variables

- $param1: $1 (optional) - Either 12-digit spec ID to reuse existing folder, or context string for new issue
- $param2: $2 (optional) - Additional context (only used if $1 is spec ID)

## Instructions

- **IMPORTANT**: Use reasoning model - THINK HARD about issue scope, approach, AND complexity
- **IMPORTANT**: This command ONLY generates spec - do NOT implement code or make changes beyond spec folder/file and index.json
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
   - If no explicit context: Use conversation history
   - If spec ID provided: Read existing folder (PRD if present) + conversation history
   - Otherwise: Use provided context string

   **Detection:**
   - If $param1 matches /^\d{12}$/: It's a spec ID → reuse folder, context from $param2 or conversation
   - Otherwise: $param1 is context (or empty) → create new folder

2. **Generate or Reuse Spec ID**:
   - If reusing folder: Extract spec ID from $param1
   - If new folder: Generate timestamp-based ID in format `YYMMDDHHmmss`
   - Example: November 13, 2025 at 2:22:01pm → `251113142201`
   - Read `.agent/specs/index.json` (will be updated in step 7)

3. **Generate Issue Name**:
   - Generate concise kebab-case name from context (max 4 words)
   - Examples: "Fix memory leak" → "memory-leak-fix", "Add export button" → "export-button"
   - If reusing folder: Extract name from existing folder path

4. **Research Phase**:
   - If reusing folder: Read existing `prd.md` if present
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
   - If new folder: Create folder `.agent/specs/todo/{timestampId}-{issueName}/`
   - If reusing: Verify folder exists, check for conflicts (don't overwrite existing spec.md)
   - Write: `spec.md` (never spec.json)
   - Example: `.agent/specs/todo/251113142201-memory-leak-fix/spec.md`
   - Always starts in `todo/` with Status "draft"

8. **Update Index**:
   - Add entry to `.agent/specs/index.json`:
     ```json
     {
       "specs": {
         "251113142201": {
           "path": "todo/251113142201-memory-leak-fix/spec.md",
           "status": "draft",
           "spec_type": "issue",
           "created": "2025-11-13T14:22:01.000Z",
           "updated": "2025-11-13T14:22:01.000Z"
         }
       }
     }
     ```

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
- **Generic placeholders**: Replace all `<placeholders>`
- **Missing complexity**: EVERY task needs `[X/10]`
- **Hour estimates**: Never include hours
- **Status**: Lowercase: `draft`, `ready`, `in-progress`, `review`, `completed`
- **spec_type**: Must be `"issue"` not `"feature"`
- **Scope creep**: Keep focused - use `/cmd:generate-spec` for features

## Report

**IMPORTANT**: Output this JSON as final message:

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
