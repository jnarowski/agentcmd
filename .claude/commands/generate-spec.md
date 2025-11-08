---
description: Generate implementation spec with complexity estimates and write to spec folder with sequential ID
argument-hint: [feature-name, format]
---

# Generate Implementation Spec with Complexity

Generate a well-structured implementation spec with complexity estimates and save it to `.agent/specs/todo/[id]-[feature]/spec.md` (or `spec.json`) with sequential numeric ID.

## Variables

- $featureName: $1 (required) - Feature name (e.g., `auth-improvements`)
- $format: $2 (optional) - Output format: `markdown` (default) or `json`

## Instructions

- **IMPORTANT**: Use your reasoning model - THINK HARD about feature requirements, design, implementation approach, AND complexity
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
- If $format is not provided, default to "markdown"
- **DO NOT include hour-based estimates anywhere** - use complexity points only

## Complexity Scale (Context-Focused)

Assign complexity based on **context window usage and cognitive load**, not time:

- **1-2/10**: Trivial - Single file, <50 lines changed, minimal context (config, doc, simple type)
- **3-4/10**: Simple - Few files, straightforward logic, low context (single endpoint, basic component)
- **5-6/10**: Moderate - Multiple related files, moderate context (DB field + migration + API update)
- **7-8/10**: Complex - Cross-cutting change, high context, multiple domains (full-stack feature, state refactor)
- **9-10/10**: Very complex - Architectural change, deep codebase knowledge required (major refactor, complex integration)

**Key principle**: Higher complexity = more context the agent needs to load and understand

## Workflow

1. **Get Next ID from Index**:
   - Read `.agent/specs/index.json`
   - If missing or corrupt, auto-heal:
     - Scan `.agent/specs/**/*` for numeric IDs in folder names
     - Extract all numeric IDs from folders matching pattern `[0-9]+-*`
     - Set `lastId = max(numeric IDs) || 0`
     - Rebuild index with found specs
   - Calculate `newId = lastId + 1`

2. **Normalize Feature Name**:
   - Convert to kebab-case (lowercase, hyphens)
   - Example: "Auth Improvements" → "auth-improvements"

3. **Research Phase**:
   - Read `.agent/specs/todo/${featureName}/prd.md` if it exists (skip if not found)
   - Research codebase for existing patterns relevant to the feature
   - Gather context about architecture, file structure, and conventions

4. **Clarification** (if needed):
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

5. **Generate Spec with Complexity**:
   - Once you have sufficient context, generate the spec following the Template below
   - Analyze each task and assign complexity score (1-10)
   - Calculate phase totals and averages
   - Be concise but comprehensive
   - Skip sections only if truly not applicable

6. **Write Spec Folder and File**:
   - Create folder: `.agent/specs/todo/{newId}-{featureName-kebab}/`
   - If $format is "json": Write to `spec.json` in folder
   - Otherwise: Write to `spec.md` in folder
   - Example (markdown): `.agent/specs/todo/1-auth-improvements/spec.md`
   - Example (json): `.agent/specs/todo/1-auth-improvements/spec.json`

7. **Update Index**:
   - Add entry to index.json:
     ```json
     {
       "lastId": newId,
       "specs": {
         "{newId}": {
           "folder": "{newId}-{featureName-kebab}",
           "created": "{ISO 8601 datetime}",
           "location": "todo"
         }
       }
     }
     ```
   - Write updated index back to `.agent/specs/index.json`

## Template

### Markdown Template

```md
# [Feature Name]

**Status**: draft
**Created**: [YYYY-MM-DD]
**Package**: [package name or app name]
**Total Complexity**: [X] points
**Phases**: [N]
**Tasks**: [N]
**Overall Avg Complexity**: [X.X]/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: [Name] | [N] | [X] | [X.X]/10 | [X]/10 |
| Phase 2: [Name] | [N] | [X] | [X.X]/10 | [X]/10 |
| **Total** | **[N]** | **[X]** | **[X.X]/10** | **[X]/10** |

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

```

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

<!-- prettier-ignore -->
- [ ] [task-id] [X/10] [Specific task description]
  - [Implementation detail or note]
  - File: `[specific filepath]`
  - [Any commands to run]
- [ ] [task-id] [X/10] [Next specific task]
  - [Implementation detail or note]
  - File: `[specific filepath]`
  - [Any commands to run]

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: [Next Phase Name]

**Phase Complexity**: [X] points (avg [X.X]/10)

<!-- prettier-ignore -->
- [ ] [task-id] [X/10] [Specific task description]
  - [Implementation detail or note]
  - File: `[specific filepath]`
  - [Any commands to run]

#### Completion Notes

(This will be filled in by the agent implementing this phase)

[Continue with all phases needed, grouped logically]

## Testing Strategy

### Unit Tests

**`[test-file.test.ts]`** - [what it tests]:

```typescript
[Example test structure or key test cases]
```

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
  "complexity": {
    "total": "[X]",
    "phases": "[N]",
    "tasks": "[N]",
    "overallAvg": "[X.X]"
  },
  "complexityBreakdown": [
    {
      "phase": "Phase 1: [Name]",
      "tasks": "[N]",
      "totalPoints": "[X]",
      "avgComplexity": "[X.X]",
      "maxTask": "[X]"
    }
  ],
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
      "phaseName": "[Phase Name]",
      "phaseComplexity": {
        "total": "[X]",
        "avg": "[X.X]"
      },
      "tasks": [
        {
          "id": "[task-id]",
          "complexity": "[X]",
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
7. **Complexity**: Always show as `[X/10]` for individual tasks, `[X] points` for totals

## Examples

**Example 1: Basic usage**
```bash
/generate-spec auth-improvements
```

Gets next ID (e.g., 1), creates folder: `.agent/specs/todo/1-auth-improvements/spec.md`

**Example 2: Feature name with spaces**

```bash
/generate-spec "Workflow Safety"
```

Converts to kebab-case, creates: `.agent/specs/todo/2-workflow-safety/spec.md`

**Example 3: Using JSON format**

```bash
/generate-spec auth-improvements json
```

Creates: `.agent/specs/todo/1-auth-improvements/spec.json`

**Example 4: Complex feature name**

```bash
/generate-spec websocket-reconnect-improvements
```

Creates: `.agent/specs/todo/3-websocket-reconnect-improvements/spec.md`

## Common Pitfalls

- **Wrong directory**: Always create folder in `.agent/specs/todo/`, not `.agent/specs/` or `.agents/specs/`
- **Folder structure**: Must create folder `{id}-{feature}/` with `spec.md` or `spec.json` inside
- **Index not updated**: Always update index.json after creating spec
- **Generic placeholders**: Replace all `<placeholders>` with actual content
- **Missing complexity scores**: EVERY task must have a `[X/10]` complexity score
- **Including hours**: Do NOT include hour estimates - use complexity points only
- **Status field**: Use lowercase status values: `draft`, `ready`, `in-progress`, `review`, `completed`
- **Complexity calculations**: Ensure phase totals and averages are accurate
- **Kebab-case**: Always convert feature name to kebab-case for folder name

## Report

### JSON Format

**IMPORTANT**: If $format is "json", return raw JSON output (no ```json code fences, no markdown):

```json
{
  "success": true,
  "spec_folder": ".agent/specs/todo/[id]-[feature]",
  "spec_file": ".agent/specs/todo/[id]-[feature]/spec.json",
  "spec_id": [id],
  "feature_name": "[feature-name]",
  "format": "json",
  "complexity": {
    "total": "[X]",
    "avg": "[X.X]"
  },
  "files_to_create": ["[filepath1]", "[filepath2]"],
  "files_to_modify": ["[filepath3]", "[filepath4]"],
  "next_command": "/implement-spec [id]"
}
```

**JSON Field Descriptions:**

- `success`: Always true if spec generation completed
- `spec_folder`: Path to the created spec folder
- `spec_file`: Full path to the spec file (spec.json or spec.md)
- `spec_id`: The spec ID used (numeric)
- `feature_name`: Normalized feature name (kebab-case)
- `format`: Output format used ("json" or "markdown")
- `complexity`: Total and average complexity scores
- `files_to_create`: Array of new files to be created
- `files_to_modify`: Array of existing files to be modified
- `next_command`: Suggested next command to run

### Text Format

Otherwise, provide this human-readable information:

1. Report the spec folder and file paths
2. Display the spec ID used
3. Show complexity summary
4. Suggest next steps

**Format:**

```text
✓ Created spec: .agent/specs/todo/[id]-[feature]/spec.md
  ID: [id]

Complexity: [X] points (avg [X.X]/10) across [N] tasks in [N] phases

Next: /implement-spec [id]
```
