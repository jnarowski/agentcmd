---
description: Generate implementation spec and write to spec folder with sequential ID
argument-hint: [context (optional), format (optional)]
---

# Generate Simple Implementation Spec

Generate a well-structured implementation spec and save it to `.agent/specs/todo/[id]-[feature]/spec.md` (or `spec.json`) with sequential numeric ID.

## Variables

- $context: $1 (optional) - Additional context for autonomous spec generation (e.g., "Add OAuth support with Google and GitHub providers")
- $format: $2 (optional) - Output format: `markdown` (default) or `json`

## Instructions

- **IMPORTANT**: Use your reasoning model - THINK HARD about feature requirements, design, and implementation approach
- Normalize feature name to kebab-case for the folder name
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

1. **Get Next ID from Index**:
   - Read `.agent/specs/index.json`
   - Get `lastId` from index
   - Calculate `newId = lastId + 1`
   - Append 2 random lowercase letters to create full ID (e.g., `4` → `4is`)
   - Full ID format: `{number}{2-lowercase-letters}` (e.g., `1ab`, `4is`, `10xz`)

2. **Generate Feature Name**:
   - If `$context` provided: Use AI to generate concise kebab-case name from context (max 4 words, e.g., "Add OAuth support" → "oauth-support")
   - If no context: Analyze recent conversation history to infer feature name
   - Ensure name is descriptive, lowercase, uses hyphens
   - Note: With random ID suffixes, folder conflicts are extremely unlikely (1 in 676 chance)

3. **Research Phase**:
   - Read `.agent/specs/todo/${featureName}/prd.md` if it exists (skip if not found)
   - Research codebase for existing patterns relevant to the feature
   - Gather context about architecture, file structure, and conventions

4. **Clarification** (conditional):
   - **If $context provided ($1 given)**: Resolve ambiguities autonomously using recommended best practices. Do not ask questions.
   - **If $context not provided**: Use session context and ask clarifying questions ONE AT A TIME if implementation approach is unclear:
     - Don't use the Question tool
     - Use this template:

       ```md
       **Question**: [Your question]
       **Suggestions**:

       1. [Option 1] (recommended - why)
       2. [Option 2]
       3. Other - user specifies
       ```

5. **Generate Spec**:
   - Once you have sufficient context, generate the spec following the Template below
   - Be concise but comprehensive
   - Skip sections only if truly not applicable

6. **Write Spec Folder and File**:
   - Create folder: `.agent/specs/todo/{fullId}-{featureName-kebab}/`
   - If $format is "json": Write to `spec.json` in folder
   - Otherwise: Write to `spec.md` in folder
   - Example (markdown): `.agent/specs/todo/4is-auth-improvements/spec.md`
   - Example (json): `.agent/specs/todo/4is-auth-improvements/spec.json`
   - **Note**: Specs always start in `todo/` folder with Status "draft"

7. **Update Index**:
   - Add entry to index.json using full ID (with suffix) as key:
     ```json
     {
       "lastId": 4,
       "specs": {
         "4is": {
           "folder": "4is-auth-improvements",
           "created": "{ISO 8601 datetime}",
           "location": "todo"
         }
       }
     }
     ```
   - Note: `lastId` stores the numeric part only (without suffix)
   - Write updated index back to `.agent/specs/index.json`

## Workflow Folder Progression

Specs follow this workflow:

1. **Created in `todo/`** (Status: "draft") - Use `/generate-spec-simple`
2. **Optional: Move to `backlog/`** - Use `/move-spec {id} backlog` for future ideas
3. **Status updated to "in-progress"** - When running `/implement-spec` (stays in `todo/`)
4. **Optional: Archive to `done/`** - Use `/move-spec {id} done` when complete

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

**Example 1: With context**
```bash
/generate-spec-simple "Add OAuth support with Google and GitHub providers"
```

Generates name `oauth-support`, ID `1ab`, creates: `.agent/specs/todo/1ab-oauth-support/spec.md`

**Example 2: With context and JSON format**

```bash
/generate-spec-simple "Add OAuth support" json
```

Generates name `oauth-support`, ID `1ab`, creates: `.agent/specs/todo/1ab-oauth-support/spec.json`

**Example 3: From conversation**

```bash
/generate-spec-simple
```

Analyzes conversation history, infers feature name, generates ID `2xz`, creates: `.agent/specs/todo/2xz-workflow-safety/spec.md`

**Example 4: Team conflict prevention**

Two developers on different branches both create spec #4:
- Dev A: Gets `4is-feature-auth` (random suffix: `is`)
- Dev B: Gets `4aw-feature-search` (random suffix: `aw`)
- Both merge cleanly with no conflicts (1 in 676 collision chance)

## Common Pitfalls

- **Wrong directory**: Always create folder in `.agent/specs/todo/`, not `.agent/specs/` or `.agents/specs/`
- **Folder structure**: Must create folder `{fullId}-{feature}/` with `spec.md` or `spec.json` inside (e.g., `4is-oauth-support/`)
- **Index not updated**: Always update index.json after creating spec
- **ID format**: Full ID includes 2-letter suffix (e.g., `4is`, not `4`)
- **Index lastId**: Store numeric part only in `lastId` field (e.g., `4`), but use full ID as key (e.g., `"4is"`)
- **Generic placeholders**: Replace all `<placeholders>` with actual content
- **Status field**: Use lowercase status values: `draft`, `ready`, `in-progress`, `review`, `completed`
- **Kebab-case**: Always convert feature name to kebab-case for folder name

## Report

### JSON Format

**IMPORTANT**: If $format is "json", return raw JSON output (no ```json code fences, no markdown):

```json
{
  "success": true,
  "spec_folder": ".agent/specs/todo/[fullId]-[feature]",
  "spec_file": ".agent/specs/todo/[fullId]-[feature]/spec.json",
  "spec_id": "[fullId]",
  "feature_name": "[feature-name]",
  "format": "json",
  "files_to_create": ["[filepath1]", "[filepath2]"],
  "files_to_modify": ["[filepath3]", "[filepath4]"],
  "next_command": "/implement-spec [fullId]"
}
```

**JSON Field Descriptions:**

- `success`: Always true if spec generation completed
- `spec_folder`: Path to the created spec folder
- `spec_file`: Full path to the spec file (spec.json or spec.md)
- `spec_id`: The full spec ID with 2-letter suffix (e.g., "4is")
- `feature_name`: Normalized feature name (kebab-case)
- `format`: Output format used ("json" or "markdown")
- `files_to_create`: Array of new files to be created
- `files_to_modify`: Array of existing files to be modified
- `next_command`: Suggested next command to run

### Text Format

Otherwise, provide this human-readable information:

1. Report the spec folder and file paths
2. Display the spec ID used
3. Suggest next steps

**Format:**

```text
✓ Created spec: .agent/specs/todo/[fullId]-[feature]/spec.md
  ID: [fullId]

Next: /implement-spec [fullId]
```
