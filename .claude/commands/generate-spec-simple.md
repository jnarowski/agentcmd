---
description: Generate implementation spec and write to spec file with random ID
argument-hint: [id-or-feature-name, format]
---

# Generate Simple Implementation Spec

Generate a well-structured implementation spec and save it to `.agent/specs/[id]-[feature]-spec.md` (or `.json`) with random 3-character ID.

## Variables

- $idOrFeatureName: $1 (required) - Either a spec ID (e.g., `ef3`) OR a feature name (e.g., `auth-improvements`)
- $format: $2 (optional) - Output format: `markdown` (default) or `json`

## Instructions

- **IMPORTANT**: Use your reasoning model - THINK HARD about feature requirements, design, and implementation approach
- Auto-detect whether $1 is an ID or feature name
- If ID: Use provided ID (e.g., `ef3`)
- If feature name: Generate random 3-character lowercase alphanumeric ID
- Normalize feature name (lowercase, hyphenated) for the filename
- Replace ALL `<placeholders>` with specific details relevant to that section
- **Create detailed step-by-step tasks** grouped logically (e.g., by phase, component, or feature area)
- Order tasks by dependencies (foundation → core → integration)
- Include specific file paths, not generic names
- Make all commands copy-pasteable with expected outputs
- Include comprehensive verification covering build, tests, linting, and manual checks
- Add E2E test tasks if feature has UI
- Keep acceptance criteria measurable
- If $format is not provided, default to "markdown"

## Workflow

1. **Parse Arguments**:
   - If $idOrFeatureName is a 3-character alphanumeric ID (e.g., `ef3`, `a7b`):
     - Use that exact ID
     - Infer feature name from conversation context or ask user
   - If $idOrFeatureName is a feature name (e.g., `auth-improvements`):
     - Generate random 3-character lowercase alphanumeric ID
     - Characters: `abcdefghijklmnopqrstuvwxyz0123456789`
     - Check if `.agent/specs/*/{id}-*-spec.md` exists
     - If collision, retry (max 10 attempts)
     - If 10 collisions, error with message to try again
     - Use provided feature name

2. **Research Phase**:
   - Read `.agent/specs/${featureName}-prd.md` if it exists (skip if not found)
   - Research codebase for existing patterns relevant to the feature
   - Gather context about architecture, file structure, and conventions

3. **Clarification** (if needed):
   - If unclear about implementation approach, ask questions ONE AT A TIME
   - Don't use the Question tool
   - Use this template:

     ```md
     **Question**: [Your question]
     **Suggestions**:

     1. [Option 1] (recommended - why)
     2. [Option 2]
     3. Other - user specifies
     ```

4. **Generate Spec**:
   - Once you have sufficient context, generate the spec following the Template below
   - Be concise but comprehensive
   - Skip sections only if truly not applicable

5. **Write File**:
   - If $format is "json": Write to `.agent/specs/todo/[id]-${featureName}-spec.json`
   - Otherwise: Write to `.agent/specs/todo/[id]-${featureName}-spec.md`
   - Example (markdown): `.agent/specs/todo/ef3-auth-improvements-spec.md`
   - Example (json): `.agent/specs/todo/ef3-auth-improvements-spec.json`

## Template

### Markdown Template

```md
# [Feature Name]

**Status**: draft
**Created**: [YYYY-MM-DD]
**Package**: [package name or app name]
**Estimated Effort**: [X-Y hours]

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

### Task Group 1: [Task Group Name]

<!-- prettier-ignore -->
- [ ] [task-id] [Specific task description]
  - [Implementation detail or note]
  - File: `[specific filepath]`
  - [Any commands to run]
- [ ] [task-id] [Next specific task]
  - [Implementation detail or note]
  - File: `[specific filepath]`
  - [Any commands to run]

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 2: [Next Task Group Name]

<!-- prettier-ignore -->
- [ ] [task-id] [Specific task description]
  - [Implementation detail or note]
  - File: `[specific filepath]`
  - [Any commands to run]

#### Completion Notes

(This will be filled in by the agent implementing this task group)

[Continue with all task groups needed, grouped logically by phase or component]

## Testing Strategy

### Unit Tests

**`[test-file.test.ts]`** - [what it tests]:

```typescript
[Example test structure or key test cases]
````

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

## Timeline

| Task           | Estimated Time |
| -------------- | -------------- |
| [Task group 1] | X hours        |
| [Task group 2] | X hours        |
| [Task group 3] | X hours        |
| **Total**      | **X-Y hours**  |

## References

- [Link to related docs]
- [Link to similar implementation]
- [Link to design docs]

## Next Steps

1. [First concrete step]
2. [Second step]
3. [Third step]
   [... ordered list of actionable next steps]

```

### JSON Template

When $format is "json", generate a JSON file with this structure (output raw JSON without markdown code fences):

```json
{
  "featureName": "[feature-name]",
  "specNumber": "[number]",
  "status": "draft",
  "created": "[YYYY-MM-DD]",
  "package": "[package name or app name]",
  "estimatedEffort": "[X-Y hours]",
  "overview": "[2-3 sentences describing what this feature does and why it's valuable]",
  "userStory": {
    "asA": "[user type]",
    "iWantTo": "[action/goal]",
    "soThat": "[benefit/value]"
  },
  "technicalApproach": "[Brief description of implementation strategy]",
  "keyDesignDecisions": [
    { "decision": "[Decision 1]", "rationale": "[Rationale]" }
  ],
  "architecture": {
    "fileStructure": "[relevant file/directory structure]",
    "integrationPoints": [
      {
        "subsystem": "[Subsystem 1]",
        "changes": [
          { "file": "[file.ts]", "description": "[what changes]" }
        ]
      }
    ]
  },
  "implementationDetails": [
    {
      "name": "[Component/Module Name]",
      "description": "[Detailed description]",
      "keyPoints": ["[Important detail 1]", "[Important detail 2]"]
    }
  ],
  "files": {
    "new": [{ "path": "[filepath]", "purpose": "[purpose]" }],
    "modified": [{ "path": "[filepath]", "changes": "[what changes]" }]
  },
  "stepByStepTasks": [
    {
      "groupName": "[Task Group Name]",
      "tasks": [
        {
          "id": "[task-id]",
          "description": "[Specific task description]",
          "details": "[Implementation detail or note]",
          "file": "[specific filepath]",
          "commands": "[Any commands to run]",
          "completed": false
        }
      ],
      "completionNotes": ""
    }
  ],
  "testingStrategy": {
    "unitTests": [{ "file": "[test-file.test.ts]", "description": "[what it tests]" }],
    "integrationTests": "[Description]",
    "e2eTests": [{ "file": "[e2e-test.test.ts]", "description": "[what it tests]" }]
  },
  "successCriteria": ["[requirement 1]", "[requirement 2]"],
  "validation": {
    "automated": [{ "command": "[build command]", "expected": "[output]" }],
    "manual": [{ "step": "Start application: `[command]`" }],
    "featureSpecific": ["[Specific verification step]"]
  },
  "implementationNotes": [{ "title": "[Note Title]", "details": "[Details]" }],
  "dependencies": ["[dependency 1]"],
  "timeline": [{ "task": "[Task group 1]", "estimatedTime": "X hours" }],
  "references": ["[Link to docs]"],
  "nextSteps": ["[First step]", "[Second step]"]
}
```

## Formatting Rules

1. **Dates**: Use ISO format (YYYY-MM-DD)
2. **File paths**: Use backticks and absolute paths from project root
3. **Code blocks**: Use triple backticks with language identifier
4. **Sections**: Use `##` for major sections, `###` for subsections
5. **Lists**: Use `-` for unordered, numbers for ordered
6. **Emphasis**: Use `**bold**` for key terms, `_italics_` sparingly

## Examples

**Example 1: Using spec ID**
```
/generate-spec-simple ef3
```
Uses ID ef3, asks user for feature name or infers from context

**Example 2: Using feature name (random ID)**
```bash
/generate-spec-simple auth-improvements
```

Generates random ID (e.g., `a7b`), creates: `.agent/specs/todo/a7b-auth-improvements-spec.md`

**Example 3: Using feature name with hyphens**

```bash
/generate-spec-simple websocket-reconnect-improvements
```

Generates random ID (e.g., `x9z`), creates: `.agent/specs/todo/x9z-websocket-reconnect-improvements-spec.md`

**Example 4: Using JSON format**

```bash
/generate-spec-simple auth-improvements json
```

Creates: `.agent/specs/todo/{random-id}-auth-improvements-spec.json`

**Example 5: Using spec ID with JSON format**

```bash
/generate-spec-simple ef3 json
```

Uses ID ef3, creates JSON spec file

## Common Pitfalls

- **Wrong directory**: Always write to `.agent/specs/todo/`, not `.agent/specs/` or `.agents/specs/`
- **ID collisions**: Retry generation if collision detected (handled automatically, max 10 retries)
- **Generic placeholders**: Replace all `<placeholders>` with actual content
- **Status field**: Use lowercase status values: `draft`, `ready`, `in-progress`, `review`, `completed`

## Report

### JSON Format

**IMPORTANT**: If $format is "json", return raw JSON output (no ```json code fences, no markdown):

```json
{
  "success": true,
  "spec_path": ".agent/specs/todo/[id]-[feature]-spec.json",
  "spec_id": "[id]",
  "feature_name": "[feature-name]",
  "format": "json",
  "files_to_create": ["[filepath1]", "[filepath2]"],
  "files_to_modify": ["[filepath3]", "[filepath4]"],
  "next_command": "/implement-spec [id]"
}
```

**JSON Field Descriptions:**

- `success`: Always true if spec generation completed
- `spec_path`: Path to the generated spec file
- `spec_id`: The spec ID used (3-character alphanumeric)
- `feature_name`: Normalized feature name (lowercase, hyphenated)
- `format`: Output format used ("json" or "markdown")
- `files_to_create`: Array of new files to be created
- `files_to_modify`: Array of existing files to be modified
- `next_command`: Suggested next command to run

### Text Format

Otherwise, provide this human-readable information:

1. Report the full path to the created file
2. Display the spec ID used
3. Suggest next steps

**Format:**

```text
✓ Created spec file: .agent/specs/todo/[id]-[feature]-spec.md

Next: /implement-spec [id]
```
