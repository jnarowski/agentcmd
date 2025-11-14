---
description: Implements a feature based on provided context or spec file
argument-hint: [specIdOrNameOrPath, format]
---

# Implement

Follow the `Workflow` steps in the exact order to implement the spec then `Report` the completed work.

## Variables

- $specIdOrNameOrPath: $1 (required) - Either a timestamp ID (e.g., `251024120101`), feature name (e.g., `workflow-safety`), or full path
- $format: $2 (optional) - Output format: "text" or "json" (defaults to "text" if not provided)

## Instructions

**Parse and resolve $specIdOrNameOrPath:**

- If it's a full path (contains `/`): use as-is
- Otherwise, look up in `.agent/specs/index.json`:
  - For timestamp ID: Match by `id` field
  - For feature name: Fuzzy match path (e.g., `message-queue` matches `todo/251024120101-message-queue-implementation/spec.md`)
  - Use path from index: `.agent/specs/{path}`
- **If not found in index.json, fallback to directory search:**
  - Search in order: todo/, backlog
  - For ID: Pattern `{id}-*/spec.md`
  - For feature name: Pattern `*{feature-name}*/spec.md` (fuzzy match)
- If still not found: stop and report error

## Task Tracking Requirements

**CRITICAL: You MUST track your progress in the spec file as you work. This is NOT optional.**

### What to Update

1. **Individual Tasks** - Check off IMMEDIATELY after completing each task:
   - Change `- [ ] 1.1 Task description` to `- [x] 1.1 Task description`
   - Do this AFTER finishing each task, NOT in batches
   - Never move to the next task without checking off the current one

2. **Completion Notes** - Fill in after finishing each task group/phase:
   - Each task group has a `#### Completion Notes` section
   - Write 2-4 bullet points with:
     - What was implemented
     - Any deviations from the plan
     - Important context for reviewers
     - Known issues or follow-ups

### Example of Good Progress Tracking

**Before starting task 1.1:**

```markdown
### 1: Project Initialization

- [ ] 1.1 Initialize Bun project
- [ ] 1.2 Configure package.json
```

**After completing task 1.1:**

```markdown
### 1: Project Initialization

- [x] 1.1 Initialize Bun project
- [ ] 1.2 Configure package.json
```

**After completing all tasks in group 1:**

```markdown
### 1: Project Initialization

- [x] 1.1 Initialize Bun project
- [x] 1.2 Configure package.json

#### Completion Notes

- Project initialized with Bun and TypeScript
- Used stricter tsconfig settings than spec suggested for better type safety
- All dependencies installed successfully
```

## Workflow

1. Parse and resolve the spec file path according to the instructions above
2. **Update spec Status:**
   - If spec is in `todo/` folder with Status "draft", update Status to "in-progress"
   - This indicates work has started without moving the file
3. **Update index.json:**
   - Update the spec's `status` field to "in-progress"
   - Update the spec's `updated` field to current timestamp
   - Write updated index back to `.agent/specs/index.json`
4. Read $spec_path file, think hard about the plan
5. Implement the plan, one phase at a time:
   - Work through tasks in order, top to bottom
   - **IMMEDIATELY check off each task** in $spec_path after completing it
   - Run validation after each logical step
6. After completing each task group/phase:
   - **Fill in the "Completion Notes" section** with implementation context
   - Include any deviations, decisions, or important notes for reviewers
7. Continue until all tasks are checked off and all completion notes are filled
8. **Update spec Status to "review":**
   - Update Status field in spec.md to "review"
   - Update index.json:
     - Set `status` field to "review"
     - Update `updated` field to current timestamp
   - Write updated index back to `.agent/specs/index.json`
   - This indicates implementation is complete and ready for review

## Success/Failure Criteria

**Success (`success: true`)**:

- All tasks completed (`tasks.completed === tasks.total`)
- All critical validation checks passed (build, type-check)
- No critical errors during implementation
- Spec file updated to `status: "review"`
- `implementation_status: "completed"`

**Failure (`success: false`)**:

- Any task not completed (`tasks.completed < tasks.total`)
- Critical validation failed (build or type-check errors)
- Process interrupted or error thrown
- Spec file remains in `status: "in-progress"`
- `implementation_status: "partial"` or `"failed"`

**Partial Completion**: When some tasks complete but others fail, set `success: false` with `implementation_status: "partial"` and populate `error` field.

## Report

### JSON

**IMPORTANT**: If $format is "json", return ONLY the JSON from the output tags below:

<json_output>
{
"success": true,
"spec_id": "251113152201",
"spec_file": ".agent/specs/todo/251113152201-feature-name/spec.md",
"feature_name": "feature-name",
"implementation_status": "completed",
"tasks": {
"total": 15,
"completed": 15,
"failed": 0,
"skipped": 0
},
"complexity": {
"total_points": 42,
"avg_per_task": 2.8
},
"files": {
"created": 3,
"modified": 8,
"deleted": 0,
"paths": {
"created": ["apps/app/src/client/pages/NewFeature.tsx", "apps/app/src/server/routes/feature.ts"],
"modified": ["apps/app/src/server/routes/api.ts", "apps/app/src/client/App.tsx"]
}
},
"changes": {
"total_lines_changed": 450,
"lines_added": 320,
"lines_removed": 130
},
"validation": {
"passed": true,
"checks": {
"build": true,
"type_check": true,
"lint": true,
"tests": true
},
"failures": []
},
"git": {
"diff_stat": "11 files changed, 450 insertions(+), 130 deletions(-)",
"commits": 1
},
"error": null
}
</json_output>

**JSON Field Descriptions:**

- `success`: Boolean - true if all tasks completed successfully, false if any tasks failed or were skipped
- `spec_id`: String - Timestamp-based spec ID (e.g., "251113152201")
- `spec_file`: String - Full path to the spec file that was implemented
- `feature_name`: String - Normalized feature name (lowercase, hyphenated)
- `implementation_status`: Enum - "completed" | "partial" | "failed"
  - "completed": All tasks done, all validations passed
  - "partial": Some tasks done, some failed/skipped
  - "failed": Critical error or no tasks completed
- `tasks`: Object - Task completion metrics
  - `total`: Number - Total number of tasks in the spec
  - `completed`: Number - Number of tasks successfully completed
  - `failed`: Number - Number of tasks that failed
  - `skipped`: Number - Number of tasks intentionally skipped
- `complexity`: Object - Complexity metrics from spec
  - `total_points`: Number - Sum of all task complexity points
  - `avg_per_task`: Number - Average complexity per task
- `files`: Object - File change statistics
  - `created`: Number - Count of new files created
  - `modified`: Number - Count of existing files modified
  - `deleted`: Number - Count of files deleted
  - `paths`: Object - Arrays of file paths
    - `created`: Array<string> - List of created file paths
    - `modified`: Array<string> - List of modified file paths
- `changes`: Object - Line change statistics
  - `total_lines_changed`: Number - Total lines added + removed
  - `lines_added`: Number - Number of lines added
  - `lines_removed`: Number - Number of lines removed
- `validation`: Object - Validation results
  - `passed`: Boolean - True if all critical checks passed
  - `checks`: Object - Individual check results
    - `build`: Boolean - Build succeeded
    - `type_check`: Boolean - Type checking passed
    - `lint`: Boolean - Linting passed
    - `tests`: Boolean - Tests passed
  - `failures`: Array<string> - Error messages from failed checks (empty if all passed)
- `git`: Object - Git statistics
  - `diff_stat`: String - Output from git diff --stat
  - `commits`: Number - Number of commits created
- `error`: Object | null - Error details if implementation failed
  - `message`: String - Error message
  - `phase`: String - Which phase failed
  - `task`: String - Which task failed (if applicable)

### Text

Otherwise, provide this human-readable information to the user:

- Summarize the work you've just done in a concise bullet point list
- Report the files and total lines changed with `git diff --stat`
- Note that spec status has been updated to "review" and is ready for validation
