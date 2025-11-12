---
description: Move a spec folder between workflow folders (backlog/todo/done)
argument-hint: [specIdOrNameOrPath, targetFolder]
---

# Move Spec

Move a spec folder between workflow folders (backlog/todo/done), update index.json, and optionally update status field.

## Variables

- $specIdOrNameOrPath: $1 (required) - Either a spec ID (e.g., `1`, `2`), feature name (e.g., `workflow-safety`), or full path (e.g., `.agent/specs/todo/1-workflow-safety/`)
- $targetFolder: $2 (required) - Target workflow folder: "backlog", "todo", or "done"

## Instructions

- Search for the spec folder in all locations (backlog/, todo/, done/)
- Move the entire folder to the target folder
- Update index.json with new location
- Update the Status field in spec.md front matter based on target folder
- Support both old single-file specs and new folder-based specs
- Report the old and new paths

## Workflow

1. **Find the Spec Folder or File**

   - **Parse and resolve $specIdOrNameOrPath:**
     - If it's a full path (contains `/`):
       - Use the path as-is
     - Otherwise, look up in `.agent/specs/index.json`:
       - For timestamp ID: Match by `id` field
       - For feature name: Fuzzy match path (e.g., `message-queue` matches `todo/251024120101-message-queue-implementation/spec.md`)
       - Use path from index: `.agent/specs/{path}` (extract folder from file path: `dirname({path})`)
     - **If not found in index.json, fallback to directory search:**
       - Search in order: `.agent/specs/backlog/`, `.agent/specs/todo/`, `.agent/specs/done/`
       - For ID: Pattern `{id}-*/`
       - For feature name: Pattern `*{feature-name}*/` (fuzzy match)
   - If still not found, report error and exit

2. **Validate Target Folder**

   - Ensure $targetFolder is one of: "backlog", "todo", or "done"
   - If invalid, report error and exit

3. **Check for Conflicts**

   - Check if a folder/file with the same name already exists in target folder
   - If conflict exists, report error and exit

4. **Move the Folder**

   - Move entire folder from current location to `.agent/specs/${targetFolder}/[foldername]`
   - Preserve the original folder name

5. **Update Index**

   - Read index.json
   - Update the spec's `path` field to match new location (e.g., `todo/folder/spec.md` → `done/folder/spec.md`)
   - Preserve the filename, only update the folder portion of the path
   - Update the spec's `updated` field to current timestamp
   - Update the spec's `status` field based on target folder (see step 6)
   - Write updated index back to `.agent/specs/index.json`

6. **Update Status Field**

   - Read spec.md file content
   - Update Status field in spec.md based on target folder:
     - Moving to "backlog": Set to "draft"
     - Moving to "todo": Set to "draft"
     - Moving to "done": Set to "completed"
   - Also update status in index.json (step 5)

7. **Report Results**

   - Display old path
   - Display new path
   - Display status field update (if any)
   - Display index update (path and updated timestamp)

## Examples

**Example 1: Move by numeric spec ID**
```bash
/move-spec 1 done
```
Finds `1-*/` folder and moves it to `done/`, updates index

**Example 2: Move back to todo**
```bash
/move-spec 2 todo
```
Finds `2-*/` folder and moves it to `todo/`

**Example 3: Move by feature name**
```bash
/move-spec workflow-safety done
```
Finds `*-workflow-safety/` folder and moves it to `done/`

## Report

```text
✓ Moved spec folder

From: .agent/specs/todo/1-workflow-safety/
To:   .agent/specs/done/1-workflow-safety/

Status updated: draft → completed
Index updated:
  - path: "todo/1-workflow-safety" → "done/1-workflow-safety"
  - status: "draft" → "completed"
  - updated: "2025-11-11T20:30:00.000Z"
```

## Error Handling

**Spec not found:**
```text
✗ Error: Could not find spec matching "workflow-safety"

Searched in:
- .agent/specs/backlog/
- .agent/specs/todo/
- .agent/specs/done/

Please check the spec name/ID and try again.
```

**Target conflict:**
```text
✗ Error: Folder already exists at target location

Target: .agent/specs/done/1-workflow-safety/

Please resolve the conflict manually or use a different target folder.
```

**Invalid target folder:**
```text
✗ Error: Invalid target folder "invalid"

Valid options: "backlog", "todo", "done"
```
