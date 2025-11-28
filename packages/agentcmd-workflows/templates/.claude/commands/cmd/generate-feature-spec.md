---
description: Generate spec document only (no implementation)
argument-hint: [context?]
---

# Feature Specification

Generate a comprehensive spec document for new features with phases, complexity estimates, and test plans. Generates a well-structured implementation spec and saves it to `.agent/specs/todo/[id]-[feature]/spec.md` with timestamp-based ID.

## Variables

- $param1: $1 (optional) - Feature context or description (infers from conversation if omitted)

## Instructions

- **IMPORTANT**: Use your reasoning model - THINK HARD about feature requirements, design, implementation approach, AND complexity
- **IMPORTANT**: This command ONLY generates the spec - do NOT implement any code or make file changes beyond creating the spec folder/file and updating index.json
- Your ONLY file operations: create spec folder, write spec.md, update index.json - nothing else
- Normalize feature name to kebab-case for the folder name
- Replace ALL `<placeholders>` with specific details relevant to that section
- **Create detailed step-by-step tasks** grouped logically (e.g., by phase, component, or feature area)
- **Assign complexity score (1-10) to EVERY task** based on context needs (see Complexity Scale below)
- Order tasks by dependencies (foundation → core → integration)
- Include specific file paths, not generic names
- Make all commands copy-pasteable with expected outputs
- Include comprehensive verification covering build, tests, linting, and manual checks
- Add E2E test tasks if feature has UI
- Keep acceptance criteria measurable
- **DO NOT include hour-based estimates anywhere** - use complexity points only

### Task ID Format

Use phase.task notation for all tasks:
- Format: `1.1`, `1.2`, `2.1`, `2.2`, etc.
- Phase number matches the Phase heading number
- Task numbers increment sequentially within each phase
- Example: Phase 1 tasks → `1.1`, `1.2`, `1.3`; Phase 2 tasks → `2.1`, `2.2`

### Folder Structure

Specs are organized by lifecycle stage:
- **`todo/`** - New specs ready to implement (Status: `draft` or `in-progress`)
- **`backlog/`** - Lower priority specs not yet started
- **`done/`** - Completed and reviewed specs (Status: `completed`)

Specs start in `todo/` with Status `draft`. Use `/cmd:move-spec` to move between folders.

## Complexity Scale (Context-Focused)

Assign complexity based on **context window usage and cognitive load**, not time:

- **1-2/10**: Trivial - Single file, <50 lines changed, minimal context (config, doc, simple type)
- **3-4/10**: Simple - Few files, straightforward logic, low context (single endpoint, basic component)
- **5-6/10**: Moderate - Multiple related files, moderate context (DB field + migration + API update)
- **7-8/10**: Complex - Cross-cutting change, high context, multiple domains (full-stack feature, state refactor)
- **9-10/10**: Very complex - Architectural change, deep codebase knowledge required (major refactor, complex integration)

**Key principle**: Higher complexity = more context the agent needs to load and understand

## Workflow

1. **Determine Context**:
   - If $param1 provided: Use as context
   - If $param1 empty: Infer from conversation history

2. **Generate Spec ID**:
   - Generate timestamp-based ID in format `YYMMDDHHmm` using current local time
   - Example: November 13, 2025 at 3:22pm local → `2511131522`
   - Read `.agent/specs/index.json` (will be updated in step 8)

3. **Generate Feature Name**:
   - Generate concise kebab-case name from context (max 4 words)
   - Examples: "Add OAuth support" → "oauth-support", "Dashboard redesign" → "dashboard-redesign"

4. **Research Phase**:
   - Research codebase for existing patterns relevant to the feature
   - Gather context about architecture, file structure, and conventions

5. **Clarification** (conditional):
   - **If explicit context provided**: Resolve ambiguities autonomously using recommended best practices
   - **If inferring from conversation**: Ask clarifying questions ONE AT A TIME if implementation approach is unclear:
     - Don't use the Question tool
     - Use this template:

       ```md
       **Question**: [Your question]
       **Suggestions**:

       1. [Option 1] (recommended - why)
       2. [Option 2]
       3. Other - user specifies
       ```

6. **Generate Spec with Complexity**:
   - Once you have sufficient context, generate the spec following the Template below
   - Analyze each task and assign complexity score (1-10)
   - Calculate phase totals and averages
   - Be concise but comprehensive
   - Skip sections only if truly not applicable

7. **Write Spec Folder and File**:
   - Create folder `.agent/specs/todo/{timestampId}-{featureName}/`
   - Write `spec.md` in folder (never `spec.json`)
   - Example: `.agent/specs/todo/2511131522-oauth-support/spec.md`
   - **Note**: Specs always start in `todo/` folder with Status "draft"

8. **Update Index**:
   - Convert spec ID timestamp to UTC for storage:
     - Parse spec ID as local time (e.g., `2511131522` = Nov 13, 2025 at 3:22pm local)
     - Convert to UTC using system timezone offset
     - Format as ISO 8601 UTC string (YYYY-MM-DDTHH:mm:ssZ)
     - Example: 3:22pm MST (UTC-7) → `2025-11-13T22:22:00Z`
   - Add entry to index.json using timestamp ID as key:

     ```json
     {
       "specs": {
         "2511131522": {
           "folder": "2511131522-oauth-support",
           "path": "todo/2511131522-oauth-support/spec.md",
           "spec_type": "feature",
           "status": "draft",
           "created": "2025-11-13T22:22:00Z",
           "updated": "2025-11-13T22:22:00Z",
           "totalComplexity": 89,
           "phaseCount": 4,
           "taskCount": 10
         }
       }
     }
     ```

   - **IMPORTANT**: The `created` and `updated` timestamps must be true UTC, not local time with Z suffix
   - Complexity values match spec.md metadata from step 6
   - Write updated index back to `.agent/specs/index.json`

9. **Output Report** - Do NOT implement. Output JSON only.

## Template

**IMPORTANT: Use the exact template structure below:**

<!-- prettier-ignore-start -->
`````md
# [Feature Name]

**Status**: draft
**Created**: [YYYY-MM-DD]
**Package**: [package name or app name]
**Total Complexity**: [X] points
**Phases**: [N]
**Tasks**: [N]
**Overall Avg Complexity**: [X.X]/10

## Complexity Breakdown

| Phase           | Tasks   | Total Points | Avg Complexity | Max Task   |
| --------------- | ------- | ------------ | -------------- | ---------- |
| Phase 1: [Name] | [N]     | [X]          | [X.X]/10       | [X]/10     |
| Phase 2: [Name] | [N]     | [X]          | [X.X]/10       | [X]/10     |
| **Total**       | **[N]** | **[X]**      | **[X.X]/10**   | **[X]/10** |

## Overview

[2-3 sentences describing what this feature does and why it's valuable]

## User Story

As a [user type]
I want to [action/goal]
So that [benefit/value]

## Technical Approach

[Brief description of implementation strategy and key design decisions]

## Key Design Decisions

1. **[Decision 1]**: [Rationale]
2. **[Decision 2]**: [Rationale]
3. **[Decision 3]**: [Rationale]

## Architecture

### File Structure
```

[Show relevant file/directory structure]

````

### Integration Points

**[Subsystem 1]**:
- `[file.ts]` - [what changes]
- `[file2.ts]` - [what changes]

**[Subsystem 2]**:
- `[file.ts]` - [what changes]

## Implementation Details

### 1. [Component/Module Name]

[Detailed description of what needs to be built]

**Key Points**:
- [Important detail 1]
- [Important detail 2]
- [Important detail 3]

### 2. [Next Component/Module]

[Description]

**Key Points**:
- [Details]

[Continue for all major components]

## Files to Create/Modify

### New Files ([count])

1. `[filepath]` - [purpose]
2. `[filepath]` - [purpose]
[... list all new files]

### Modified Files ([count])

1. `[filepath]` - [what changes]
2. `[filepath]` - [what changes]
[... list all modified files]

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: [Phase Name]

**Phase Complexity**: [X] points (avg [X.X]/10)

- [ ] 1.1 [X/10] [Specific task description]
  - [Implementation detail or note]
  - File: `[specific filepath]`
  - [Any commands to run]
- [ ] 1.2 [X/10] [Next specific task]
  - [Implementation detail or note]
  - File: `[specific filepath]`
  - [Any commands to run]

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: [Next Phase Name]

**Phase Complexity**: [X] points (avg [X.X]/10)

- [ ] 2.1 [X/10] [Specific task description]
  - [Implementation detail or note]
  - File: `[specific filepath]`
  - [Any commands to run]

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

[Continue with all phases needed, grouped logically]

## Testing Strategy

### Unit Tests

**`[test-file.test.ts]`** - [what it tests]:

[Example test structure or key test cases]

### Integration Tests

[Description of integration test approach]

### E2E Tests (if applicable)

**`[e2e-test.test.ts]`** - [what it tests]:

[Test scenarios]

## Success Criteria

- [ ] [Specific functional requirement]
- [ ] [Another requirement]
- [ ] [Edge case handling]
- [ ] [Performance requirement]
- [ ] [Type safety/compilation]
- [ ] [Test coverage threshold]
- [ ] [Documentation updated]

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
[build command]
# Expected: [successful build output]

# Type checking
[type check command]
# Expected: [no type errors]

# Linting
[lint command]
# Expected: [no lint errors]

# Unit tests
[unit test command]
# Expected: [all tests pass]

# Integration tests (if applicable)
[integration test command]
# Expected: [all tests pass]

# E2E tests (if applicable)
[e2e test command]
# Expected: [all tests pass]
```

**Manual Verification:**

1. Start application: `[start command]`
2. Navigate to: `[URL or path]`
3. Verify: [specific feature behavior to check]
4. Test edge cases: [specific scenarios to test]
5. Check console: No errors or warnings

**Feature-Specific Checks:**

- [Specific verification step for this feature]
- [Another feature-specific check]
- [Edge case or integration point to manually verify]

## Implementation Notes

### 1. [Important Note Title]

[Details about a critical consideration]

### 2. [Another Note]

[More details]

## Dependencies

- [Package or system dependency 1]
- [Package or system dependency 2]
- No new dependencies required (if true)

## References

- [Link to related docs]
- [Link to similar implementation]
- [Link to design docs]

## Next Steps

1. [First concrete step]
2. [Second step]
3. [Third step]
   [... ordered list of actionable next steps]

`````
<!-- prettier-ignore-end -->

## Formatting Rules

1. **Dates**: Use ISO format (YYYY-MM-DD)
2. **File paths**: Use backticks and absolute paths from project root
3. **Code blocks**: Use triple backticks with language identifier
4. **Sections**: Use `##` for major sections, `###` for subsections
5. **Lists**: Use `-` for unordered, numbers for ordered
6. **Emphasis**: Use `**bold**` for key terms, `_italics_` sparingly
7. **Complexity**: Always show as `[X/10]` for individual tasks, `[X] points` for totals

## Examples

### Example 1: Infer from conversation

```bash
/cmd:generate-feature-spec
```

Analyzes conversation history, generates ID `2511131522`, creates: `.agent/specs/todo/2511131522-oauth-support/spec.md`

### Example 2: Explicit context

```bash
/cmd:generate-feature-spec "Add OAuth support with Google and GitHub providers"
```

Uses explicit context, generates ID `2511131522`, creates: `.agent/specs/todo/2511131522-oauth-support/spec.md`

## Common Pitfalls

- **Wrong directory**: Always create folder in `.agent/specs/todo/`, not `.agent/specs/` or `.agents/specs/`
- **Folder structure**: Must create folder `{timestampId}-{feature}/` with `spec.md` inside (e.g., `2511131522-oauth-support/`)
- **Index not updated**: Always update index.json after creating spec
- **Missing complexity in index**: Always add totalComplexity, phaseCount, taskCount to index.json entry
- **Generic placeholders**: Replace all `<placeholders>` with actual content
- **Missing complexity scores**: EVERY task must have a `[X/10]` complexity score
- **Including hours**: Do NOT include hour estimates - use complexity points only
- **Status field**: Use lowercase status values: `draft`, `in-progress`, `review`, `completed`
- **Complexity calculations**: Ensure phase totals and averages are accurate
- **Kebab-case**: Always convert feature name to kebab-case for folder name
- **Task ID format**: Use phase.task notation (1.1, 1.2, 2.1) not arbitrary IDs

## Report

**IMPORTANT**: After completing all steps (1-8), output ONLY raw JSON (see `.agent/docs/slash-command-json-output-format.md`).

<json_output>
{
"success": true,
"spec_folder": ".agent/specs/todo/[id]-[feature]",
"spec_file": ".agent/specs/todo/[id]-[feature]/spec.md",
"spec_id": "[id]",
"spec_type": "feature",
"feature_name": "[feature-name]",
"complexity": {
"total": "[X]",
"avg": "[X.X]"
},
"files_to_create": ["[filepath1]", "[filepath2]"],
"files_to_modify": ["[filepath3]", "[filepath4]"],
"next_command": "/cmd:implement-spec [id]"
}
</json_output>

**JSON Field Descriptions:**

- `success`: Always true if spec generation completed
- `spec_folder`: Path to the created spec folder
- `spec_file`: Full path to the spec file (always spec.md)
- `spec_id`: The timestamp-based spec ID in YYMMDDHHmm format (e.g., "2511131522")
- `spec_type`: Always "feature"
- `feature_name`: Normalized feature name (kebab-case)
- `complexity`: Total and average complexity scores
- `files_to_create`: Array of new files to be created
- `files_to_modify`: Array of existing files to be modified
- `next_command`: Suggested next command to run

**Output Examples:**

❌ BAD:
Perfect! Spec generated. Here's the summary:
{ "success": true, ... }
Ready to implement!

✅ GOOD:
{ "success": true, ... }
