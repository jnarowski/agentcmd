---
description: List all spec folders/files organized by folder and/or filtered by status
argument-hint: [folder, status]
---

# List Specs

List all specs in the `.agent/specs/` directory, organized by workflow folder and optionally filtered by status field. Uses index.json for fast lookups of timestamp ID specs.

## Variables

- $folder: $1 (optional) - Filter by folder: "backlog", "todo", "done", or "all" (defaults to "all")
- $status: $2 (optional) - Filter by status field: "draft", "ready", "in-progress", "review", "completed", or "any" (defaults to "any")

## Instructions

- Read index.json for fast lookup of timestamp ID specs
- Parse spec files to extract metadata (Status field) only when status filtering is needed
- Filter by folder if specified
- Filter by status if specified
- Display results organized by folder with spec ID, feature name, created date, and status

## Workflow

1. **Load Specs from Index**

   - Read `.agent/specs/index.json`
   - For each spec in index, extract:
     - Spec ID (timestamp format YYMMDDHHmmss)
     - Folder name
     - Created datetime
     - Location (backlog/todo/done)

2. **Apply Filters**

   - **Folder filter**:
     - If $folder is "backlog": Only show specs in `backlog/`
     - If $folder is "todo": Only show specs in `todo/`
     - If $folder is "done": Only show specs in `done/`
     - If $folder is "all" or not provided: Show all specs

   - **Status filter**:
     - If $status is specified and not "any":
       - Read spec file content (spec.md or {id}-{name}-spec.md)
       - Parse Status field
       - Only include specs matching that status
     - If $status is "any" or not provided: Show all specs without parsing file content
     - If a spec has no Status field, treat it as status "unknown"

3. **Display Results**

   - Group specs by location (backlog, todo, done)
   - Within each group, sort by timestamp ID (chronologically)
   - For each spec, display:
     - Spec ID
     - Feature name (from folder name)
     - Created date (from index)
     - Status (if status filter used)
   - Show count for each location
   - Show total count

## Display Format

```text
Spec Files

💡 BACKLOG (1 spec)
────────────────────────────────────────────────────────────
  251110140500  future-feature                   2025-11-10
                .agent/specs/backlog/251110140500-future-feature/

📋 TODO (2 specs)
────────────────────────────────────────────────────────────
  251108120000  workflow-safety                  2025-11-08
                .agent/specs/todo/251108120000-workflow-safety/

  251108130500  gemini-integration               2025-11-08
                .agent/specs/todo/251108130500-gemini-integration/

✅ DONE (11 specs)
────────────────────────────────────────────────────────────
  250115093000  diff-refactor                    2025-01-15
                .agent/specs/done/250115093000-diff-refactor/

  250120141500  cli-install                      2025-01-20
                .agent/specs/done/250120141500-cli-install/

  ...

────────────────────────────────────────────────────────────
Total: 14 specs
```

## Filtered Display Examples

**Filter by folder:**
```bash
/list-specs todo
```

```text
Spec Files (todo only)

📋 TODO (3 specs)
────────────────────────────────────────────────────────────
  251108120000  workflow-safety              2025-11-08
  251108130000  auth-improvements            2025-11-08
  251108140500  gemini-integration           2025-11-08
```

**Filter by status:**
```bash
/list-specs all in-progress
```

```text
Spec Files (status: in-progress)

📋 TODO (1 spec)
────────────────────────────────────────────────────────────
  251108120000  workflow-safety              [in-progress]  2025-11-08
                .agent/specs/todo/251108120000-workflow-safety/

Total: 1 spec
```

**Filter by both:**
```bash
/list-specs done completed
```

```text
Spec Files (done, status: completed)

✅ DONE (11 specs)
────────────────────────────────────────────────────────────
  250115093000  diff-refactor                [completed]  2025-01-15
  250120141500  cli-install                  [completed]  2025-01-20
  ...

Total: 11 specs
```

## Status Legend

Display at the bottom of output:

```text
Status Values:
  draft       - Initial draft, not ready for implementation
  ready       - Reviewed and ready to implement
  in-progress - Currently being implemented
  review      - Implementation complete, awaiting review
  completed   - Fully implemented and reviewed
  unknown     - No status field found in spec
```

## Empty Results

If no specs match the filters:

```text
No specs found matching filters:
- Folder: todo
- Status: completed

Try adjusting your filters or run /list-specs without arguments to see all specs.
```

## Error Handling

If `.agent/specs/` directory doesn't exist:

```text
✗ Error: .agent/specs/ directory not found

Please create the directory or check your working directory.
```

## Implementation Notes

- **Performance**: Read index.json for O(1) lookup
- **Feature names**: Extract from folder name
  - From folder: `251024120101-workflow-safety/` → "workflow-safety"
- **Sorting**: Timestamp IDs sort chronologically
- **Status parsing**: Only read file content when status filter is active (optimization)
