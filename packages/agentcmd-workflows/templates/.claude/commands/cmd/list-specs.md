---
description: List all spec folders/files organized by folder and/or filtered by status
argument-hint: [folder, status, --search keyword, --sort field]
---

# List Specs

List all specs in the `.agent/specs/` directory, organized by workflow folder and optionally filtered by status field. Uses index.json for fast lookups of timestamp ID specs.

## Variables

- $folder: $1 (optional) - Filter by folder: "backlog", "todo", "done", or "all" (defaults to "all")
- $status: $2 (optional) - Filter by status field: "draft", "ready", "in-progress", "review", "completed", or "any" (defaults to "any")
- --search: (optional) - Search keyword to fuzzy match in spec names/paths
- --sort: (optional) - Sort field: "created", "updated", or "id" (defaults to "created")

## Instructions

- Read index.json for fast lookup of timestamp ID specs
- Parse spec files to extract metadata (Status field) only when status filtering is needed
- Filter by folder if specified
- Filter by status if specified
- Search by keyword if specified (fuzzy match in spec names)
- Sort results by specified field
- Group specs in same folder for multi-spec folders
- Display results organized by folder with spec ID, feature name, created/updated dates, and status

## Workflow

1. **Load Specs from Index**

   - Read `.agent/specs/index.json`
   - For each spec in index, extract:
     - Spec ID (key in specs object)
     - Path (contains both location and folder name)
     - Status (cached from spec.md)
     - Created datetime
     - Updated datetime
     - Location: Derive from path by splitting on '/' (e.g., "todo/1-log-streaming" → location="todo", folder="1-log-streaming")

2. **Apply Filters**

   - **Folder filter**:
     - If $folder is "backlog": Only show specs where location (from path) is "backlog"
     - If $folder is "todo": Only show specs where location is "todo"
     - If $folder is "done": Only show specs where location is "done"
     - If $folder is "all" or not provided: Show all specs

   - **Status filter**:
     - If $status is specified and not "any":
       - Use cached status from index.json
       - Only include specs matching that status
     - If $status is "any" or not provided: Show all specs
     - If a spec has no status field in index, treat it as status "unknown"

   - **Search filter**:
     - If --search is specified:
       - Extract feature name from path (e.g., "todo/251112-workflow-item/spec.md" → "workflow-item")
       - Fuzzy match: Check if search keyword appears anywhere in feature name (case-insensitive)
       - Only include specs where feature name contains the search keyword

3. **Sort Results**

   - Sort specs by specified field (defaults to "created"):
     - "created": Sort by created timestamp (oldest first)
     - "updated": Sort by updated timestamp (newest first)
     - "id": Sort by spec ID (chronological order)

4. **Group Multi-Spec Folders**

   - Extract folder path (without filename) from each spec path
   - Group specs that share the same folder path
   - Display folder header when multiple specs share a folder

5. **Display Results**

   - Group specs by location (backlog, todo, done)
   - Within each group, apply sort order from step 3
   - For each spec, display:
     - Spec ID
     - Feature name (from folder/file name)
     - Created date (from index)
     - Updated date (from index) if different from created
     - Status (from index)
   - For multi-spec folders (multiple specs in same folder):
     - Display folder header once
     - Indent individual spec entries
   - Show count for each location
   - Show total count

## Display Format

**Single-spec folders:**
```text
Spec Files

💡 BACKLOG (1 spec)
────────────────────────────────────────────────────────────
  251110140500  future-feature            [draft]
                Created: 2025-11-10
                .agent/specs/backlog/251110140500-future-feature/spec.md

📋 TODO (2 specs)
────────────────────────────────────────────────────────────
  251108120000  workflow-safety           [in-progress]
                Created: 2025-11-08  Updated: 2025-11-10
                .agent/specs/todo/251108120000-workflow-safety/spec.md

  251108130500  gemini-integration        [draft]
                Created: 2025-11-08
                .agent/specs/todo/251108130500-gemini-integration/spec.md

✅ DONE (11 specs)
────────────────────────────────────────────────────────────
  250115093000  diff-refactor             [completed]
                Created: 2025-01-15  Updated: 2025-01-18
                .agent/specs/done/250115093000-diff-refactor/spec.md

  250120141500  cli-install               [completed]
                Created: 2025-01-20
                .agent/specs/done/250120141500-cli-install/spec.md

  ...

────────────────────────────────────────────────────────────
Total: 14 specs
```

**Multi-spec folders:**
```text
📋 TODO (3 specs)
────────────────────────────────────────────────────────────
  📁 auth-system/ (2 specs)
    251112070711  backend                 [completed]
                  Created: 2025-11-12  Updated: 2025-11-12
                  .agent/specs/todo/251112070000-auth-system/backend.md

    251112070712  frontend                [in-progress]
                  Created: 2025-11-12  Updated: 2025-11-12
                  .agent/specs/todo/251112070000-auth-system/frontend.md

  251108130500  gemini-integration        [draft]
                Created: 2025-11-08
                .agent/specs/todo/251108130500-gemini-integration/spec.md
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

**Search by keyword:**
```bash
/list-specs all any --search workflow
```

```text
Spec Files (search: "workflow")

📋 TODO (2 specs)
────────────────────────────────────────────────────────────
  251108120000  workflow-safety           [in-progress]
                Created: 2025-11-08  Updated: 2025-11-10
                .agent/specs/todo/251108120000-workflow-safety/spec.md

  251112070556  workflow-integration      [review]
                Created: 2025-11-12  Updated: 2025-11-12
                .agent/specs/todo/251112070556-workflow-integration/spec.md

Total: 2 specs
```

**Sort by updated:**
```bash
/list-specs todo --sort updated
```

```text
Spec Files (todo, sorted by updated)

📋 TODO (3 specs)
────────────────────────────────────────────────────────────
  251112070712  auth-frontend             [in-progress]
                Created: 2025-11-12  Updated: 2025-11-12
                .agent/specs/todo/251112070712-auth-frontend/spec.md

  251108120000  workflow-safety           [in-progress]
                Created: 2025-11-08  Updated: 2025-11-10
                .agent/specs/todo/251108120000-workflow-safety/spec.md

  251108130500  gemini-integration        [draft]
                Created: 2025-11-08
                .agent/specs/todo/251108130500-gemini-integration/spec.md

Total: 3 specs
```

**Combined filters:**
```bash
/list-specs todo in-progress --search auth --sort updated
```

```text
Spec Files (todo, status: in-progress, search: "auth", sorted by updated)

📋 TODO (1 spec)
────────────────────────────────────────────────────────────
  251112070712  auth-frontend             [in-progress]
                Created: 2025-11-12  Updated: 2025-11-12
                .agent/specs/todo/251112070712-auth-frontend/spec.md

Total: 1 spec
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

- **Performance**: Read index.json for O(1) lookup - status is cached, no file reads needed
- **Feature names**: Extract from folder/file name in path
  - From path: `todo/251024120101-workflow-safety/spec.md` → location="todo", folder="251024120101-workflow-safety", name="workflow-safety"
  - For multi-spec: `todo/251112-auth/backend.md` → folder="251112-auth", name="backend"
- **Sorting**:
  - "created": Sort by created timestamp (oldest first)
  - "updated": Sort by updated timestamp (newest first for recently active specs)
  - "id": Sort by spec ID (chronological by creation)
- **Search**: Case-insensitive fuzzy matching on feature name extracted from path
- **Multi-spec grouping**: Group by folder path (dirname of spec path), show folder header when >1 spec in folder
- **Status caching**: Status is cached in index.json, synced from spec.md by other commands
- **Backward compatibility**: Positional args still work: `/list-specs todo completed`
