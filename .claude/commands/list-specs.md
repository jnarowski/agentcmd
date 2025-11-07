---
description: List all spec files organized by folder and/or filtered by status
argument-hint: [folder, status]
---

# List Specs

List all spec files in the `.agent/specs/` directory, organized by workflow folder and optionally filtered by status field.

## Variables

- $folder: $1 (optional) - Filter by folder: "todo", "done", "all", or "root" (defaults to "all")
- $status: $2 (optional) - Filter by status field: "draft", "ready", "in-progress", "review", "completed", or "any" (defaults to "any")

## Instructions

- Scan `.agent/specs/` directory recursively for all `*-spec.md` files
- Parse each spec file to extract metadata (Status field)
- Filter by folder if specified
- Filter by status if specified
- Display results organized by folder with spec number, feature name, and status

## Workflow

1. **Find All Spec Files**

   - Search for `*-spec.md` in:
     - `.agent/specs/todo/`
     - `.agent/specs/done/`
     - `.agent/specs/` (root, legacy specs)
   - For each file found, extract:
     - Full path
     - Spec number (from filename)
     - Feature name (from filename)
     - Status field (from file content, if present)

2. **Apply Filters**

   - **Folder filter**:
     - If $folder is "todo": Only show specs in `todo/`
     - If $folder is "done": Only show specs in `done/`
     - If $folder is "root": Only show specs in root (legacy)
     - If $folder is "all" or not provided: Show all specs
   - **Status filter**:
     - If $status is specified and not "any": Only show specs matching that status
     - If $status is "any" or not provided: Show all specs regardless of status
     - If a spec has no Status field, treat it as status "unknown"

3. **Display Results**

   - Group specs by folder (todo, done, root)
   - Within each folder, sort by spec number (ascending)
   - For each spec, display:
     - Spec number
     - Feature name
     - Status (or "unknown" if not present)
     - Full path (for reference)
   - Show count for each folder
   - Show total count

## Display Format

```text
Spec Files

📋 TODO (3 specs)
────────────────────────────────────────────────────────────
  15  gemini-integration                  [draft]
      .agent/specs/todo/15-gemini-integration-spec.md

  16  scroll-to-bottom-button             [in-progress]
      .agent/specs/todo/16-scroll-to-bottom-button-spec.md

  17  agent-cli-sdk-1.0-refactor          [ready]
      .agent/specs/todo/17-agent-cli-sdk-1.0-refactor-spec.md

✅ DONE (14 specs)
────────────────────────────────────────────────────────────
  1   diff-refactor                       [completed]
      .agent/specs/done/1-diff-refactor-spec.md

  2   cli-install                         [completed]
      .agent/specs/done/2-cli-install-spec.md

  ...

  14  codex-parser-both-formats           [completed]
      .agent/specs/done/14-codex-parser-both-formats-spec.md

────────────────────────────────────────────────────────────
Total: 17 specs
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
  15  gemini-integration                  [draft]
  16  scroll-to-bottom-button             [in-progress]
  17  agent-cli-sdk-1.0-refactor          [ready]
```

**Filter by status:**
```bash
/list-specs all in-progress
```

```text
Spec Files (status: in-progress)

📋 TODO (1 spec)
────────────────────────────────────────────────────────────
  16  scroll-to-bottom-button             [in-progress]
      .agent/specs/todo/16-scroll-to-bottom-button-spec.md

Total: 1 spec
```

**Filter by both:**
```bash
/list-specs done completed
```

```text
Spec Files (done, status: completed)

✅ DONE (14 specs)
────────────────────────────────────────────────────────────
  1   diff-refactor                       [completed]
  2   cli-install                         [completed]
  ...
  14  codex-parser-both-formats           [completed]

Total: 14 specs
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

- Use glob patterns to find all spec files: `.agent/specs/**/*-spec.md`
- Parse Status field from spec files using regex or simple text search
- Handle missing Status fields gracefully (show as "unknown")
- Feature names should be extracted from filename and formatted nicely (replace hyphens with spaces for display)
