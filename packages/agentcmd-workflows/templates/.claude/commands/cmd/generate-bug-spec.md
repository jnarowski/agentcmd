---
description: Generate bug fix spec with reproduction steps and investigation workflow
argument-hint: [context?]
---

# Bug Fix Specification

Generate focused spec for bugs with reproduce → diagnose → fix → verify workflow. Creates spec at `.agent/specs/todo/[id]-[bug]/spec.md` with timestamp-based ID.

## Variables

- $context: $1 (optional) - Bug description (e.g., "Memory leak in workflow engine when runs cancelled" or "Sessions page crashes on export")

## Instructions

- **IMPORTANT**: Use reasoning model - THINK HARD about reproduction, root cause, AND fix approach
- **IMPORTANT**: This command ONLY generates spec - do NOT implement code or make changes beyond spec folder/file and index.json
- Normalize bug name to kebab-case for folder name
- Replace ALL `<placeholders>` with specific details
- **Formalize reproduction steps** - make them precise and repeatable
- **Root Cause is iterative** - start with hypothesis, update during investigation
- **Create detailed tasks** with specific file paths and commands
- **Assign complexity (1-10) to EVERY task**
- Order tasks by dependencies
- **DO NOT include hour estimates** - use complexity points only

## Complexity Scale

Assign based on **context window usage and cognitive load**:

- **1-2/10**: Trivial - Single file, <50 lines, minimal context
- **3-4/10**: Simple - Few files, straightforward logic
- **5-6/10**: Moderate - Multiple related files, moderate context
- **7-8/10**: Complex - Cross-cutting change, high context
- **9-10/10**: Very complex - Architectural change, deep knowledge required

**Key principle**: Higher complexity = more context agent needs to load/understand

## Workflow

1. **Generate Timestamp ID**:
   - Format: `YYMMDDHHmmss` (e.g., `251113142201`)
   - Ensures uniqueness, embeds creation time
   - Read `.agent/specs/index.json` (updated in step 6)

2. **Generate Bug Name**:
   - If `$context` provided: Generate concise kebab-case name (max 4 words)
   - If no context: Infer from conversation history
   - Examples: "Memory leak in workflows" → "workflow-memory-leak", "Export crash" → "export-crash-fix"

3. **Research Phase**:
   - Search codebase for relevant code paths
   - Attempt to reproduce bug if possible
   - Gather context on architecture
   - Look for similar bugs/fixes

4. **Clarification** (conditional):
   - **If $context provided**: Resolve ambiguities autonomously
   - **If no context**: Ask clarifying questions ONE AT A TIME:
     ```md
     **Question**: [Your question]
     **Suggestions**:
     1. [Option 1] (recommended - why)
     2. [Option 2]
     3. Other - user specifies
     ```

5. **Generate Spec**:
   - Follow Template below
   - Formalize reproduction steps
   - Provide initial root cause hypothesis
   - Assign complexity to each task
   - Calculate totals and average

6. **Write Spec**:
   - Create folder: `.agent/specs/todo/{timestampId}-{bugName}/`
   - Write: `spec.md` (never spec.json)
   - Example: `.agent/specs/todo/251113142201-workflow-memory-leak/spec.md`
   - Always starts in `todo/` with Status "draft"

7. **Update Index**:
   - Add entry to `.agent/specs/index.json`:
     ```json
     {
       "specs": {
         "251113142201": {
           "path": "todo/251113142201-workflow-memory-leak/spec.md",
           "status": "draft",
           "spec_type": "bug",
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
# [Bug Name]

**Status**: draft
**Type**: bug
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

[2-3 sentences describing what's broken and when it occurs]

## Reproduction Steps

1. [First step to trigger bug]
2. [Second step]
3. [Observe the bug]

**Environment:**
- [OS/Browser/Node version if relevant]
- [Configuration or state required]

## Expected vs Actual Behavior

**Expected:**
[What should happen]

**Actual:**
[What actually happens - include error messages, logs, screenshots reference]

## Root Cause

**Initial Hypothesis:**
[Agent's best guess during spec generation based on symptoms and code review]

**Investigation Notes:**
[Agent fills this in during debugging - breadcrumbs, dead ends, discoveries]

**Confirmed Root Cause:**
[Final answer once bug is understood - what code/logic is broken and why]

## Technical Approach

[Description of how to fix the bug - approach, changes needed, considerations]

**Key Points:**
- [Important detail 1]
- [Important detail 2]
- [Edge cases to handle]

## Files to Create/Modify

### New Files ([count])

1. `[filepath]` - [purpose]
[... list if any]

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
- Test fix works in normal case
- Test edge cases that triggered bug
- Test similar scenarios don't regress

### Regression Tests

**Critical:** Verify fix doesn't break:
- [Related feature 1]
- [Related feature 2]
- [Integration point]

## Success Criteria

- [ ] Bug no longer reproducible following steps above
- [ ] Expected behavior now occurs
- [ ] No regressions in related functionality
- [ ] Tests pass (including new regression test)
- [ ] No new warnings/errors

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
# Expected: all pass, including new regression test
```

**Manual - Verify Fix:**

1. Follow reproduction steps above
2. Expected: [bug no longer occurs]
3. Verify expected behavior: [specific checks]

**Manual - Check Regressions:**

1. Test: [related feature 1]
2. Test: [related feature 2]
3. Verify: [integration still works]

## Implementation Notes

### [Important Note Title]

[Critical consideration, caveat, or context about this bug]

## Dependencies

- [Dependency 1]
- No new dependencies (if true)

## References

- [Link to error logs]
- [Link to related issue/PR]
- [Link to relevant docs]
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

### Example 1: Memory leak

```bash
/generate-bug-spec "Memory leak in workflow engine when runs are cancelled"
```

Creates: `.agent/specs/todo/251113142201-workflow-memory-leak/spec.md`

### Example 2: Crash

```bash
/generate-bug-spec "Sessions page crashes when clicking export button"
```

Creates: `.agent/specs/todo/251113143522-export-crash-fix/spec.md`

### Example 3: From conversation

```bash
/generate-bug-spec
```

Infers bug from context, generates spec

## Common Pitfalls

- **Vague reproduction steps**: Be specific - "click button" → "click Export button in sessions table header"
- **Wrong directory**: Always `.agent/specs/todo/`, not `.agent/specs/`
- **Folder structure**: `{timestampId}-{bug}/spec.md` inside
- **Index not updated**: Must update index.json
- **ID format**: 12-char timestamp `YYMMDDHHmmss`
- **Generic placeholders**: Replace all `<placeholders>`
- **Missing complexity**: EVERY task needs `[X/10]`
- **Hour estimates**: Never include hours
- **Status**: Lowercase: `draft`, `ready`, `in-progress`, `review`, `completed`
- **spec_type**: Must be `"bug"` not `"issue"` or `"feature"`
- **Root cause guessing**: Initial hypothesis is OK, but mark it as such

## Report

**IMPORTANT**: Output this JSON as final message:

<json_output>
{
  "success": true,
  "spec_folder": ".agent/specs/todo/[id]-[bug]",
  "spec_file": ".agent/specs/todo/[id]-[bug]/spec.md",
  "spec_id": "[id]",
  "spec_type": "bug",
  "bug_name": "[bug-name]",
  "complexity": {
    "total": "[X]",
    "avg": "[X.X]"
  },
  "files_to_create": ["[filepath1]"],
  "files_to_modify": ["[filepath2]"],
  "next_command": "/cmd:implement-spec [id]"
}
</json_output>
