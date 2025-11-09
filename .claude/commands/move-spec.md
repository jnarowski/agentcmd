---
description: Move a spec folder between workflow folders (todo/doing/done)
argument-hint: [specIdOrNameOrPath, targetFolder]
---

# Move Spec

Move a spec folder between workflow folders (todo/doing/done), update index.json, and optionally update status field.

## Variables

- $specIdOrNameOrPath: $1 (required) - Either a spec ID (e.g., `1`, `2`), feature name (e.g., `workflow-safety`), or full path (e.g., `.agent/specs/todo/1-workflow-safety/`)
- $targetFolder: $2 (required) - Target workflow folder: "todo", "doing", or "done"

## Instructions

- Search for the spec folder in all locations (todo/, doing/, done/)
- Move the entire folder to the target folder
- Update index.json with new location
- Update the Status field in spec.md front matter based on target folder
- Support both old single-file specs and new folder-based specs
- Report the old and new paths

## Workflow

1. **Find the Spec Folder or File**

   - **Parse and resolve $specIdOrNameOrPath:**
     - If it's a numeric ID (e.g., `1`, `2`):
       - Check index.json for spec location and folder name
       - Use `{location}/{folder}/`
     - If it's a feature name (e.g., `workflow-safety`):
       - Search in order: todo/, doing/, done/
       - Pattern: `*-{feature-name}/`
     - If it's a full path:
       - Use the path as-is
   - If not found, report error and exit

2. **Validate Target Folder**

   - Ensure $targetFolder is one of: "todo", "doing", or "done"
   - If invalid, report error and exit

3. **Check for Conflicts**

   - Check if a folder/file with the same name already exists in target folder
   - If conflict exists, report error and exit

4. **Move the Folder**

   - Move entire folder from current location to `.agent/specs/${targetFolder}/[foldername]`
   - Preserve the original folder name

5. **Update Index**

   - Read index.json
   - Update the spec's `location` field to match target folder
   - Write updated index back to `.agent/specs/index.json`

6. **Update Status Field**

   - Read spec.md file content
   - Update Status field based on target folder:
     - Moving to "todo": Set to "draft"
     - Moving to "doing": Set to "in-progress"
     - Moving to "done": Set to "completed"

7. **Report Results**

   - Display old path
   - Display new path
   - Display status field update (if any)
   - Display index update (if applicable)

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

**Example 4: Move to doing**
```bash
/move-spec 1 doing
```
Moves spec to `doing/` and sets Status to "in-progress"

## Report

```text
✓ Moved spec folder

From: .agent/specs/todo/1-workflow-safety/
To:   .agent/specs/done/1-workflow-safety/

Status updated: draft → completed
Index updated: location "todo" → "done"
```

## Error Handling

**Spec not found:**
```text
✗ Error: Could not find spec matching "workflow-safety"

Searched in:
- .agent/specs/todo/
- .agent/specs/doing/
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

Valid options: "todo", "doing", "done"
```
