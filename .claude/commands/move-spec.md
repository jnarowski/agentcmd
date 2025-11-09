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
       - Check index.json for spec with that ID
       - If not in index, search filesystem:
         1. `.agent/specs/todo/{id}-*/`
         2. `.agent/specs/doing/{id}-*/`
         3. `.agent/specs/done/{id}-*/`
       - Use the first matching folder
     - If it's a 3-char alphanumeric ID (e.g., `ef3`, `a7b`) - legacy:
       - Search filesystem:
         1. `.agent/specs/todo/{id}-*-spec.md` (old single file)
         2. `.agent/specs/doing/{id}-*-spec.md` (old single file)
         3. `.agent/specs/done/{id}-*-spec.md` (old single file)
         4. `.agent/specs/todo/{id}-*/` (folder)
         5. `.agent/specs/doing/{id}-*/` (folder)
         6. `.agent/specs/done/{id}-*/` (folder)
       - Use the first match
     - If it's a feature name (e.g., `workflow-safety`):
       - Search filesystem:
         1. `.agent/specs/todo/*-{feature-name}/`
         2. `.agent/specs/doing/*-{feature-name}/`
         3. `.agent/specs/done/*-{feature-name}/`
         4. `.agent/specs/todo/*-{feature-name}-spec.md` (legacy)
         5. `.agent/specs/doing/*-{feature-name}-spec.md` (legacy)
         6. `.agent/specs/done/*-{feature-name}-spec.md` (legacy)
       - Use the first match
     - If it's a full path:
       - Use the path as-is
   - If multiple matches found, list them and ask user to specify
   - If no matches found, report error and exit

2. **Validate Target Folder**

   - Ensure $targetFolder is one of: "todo", "doing", or "done"
   - If invalid, report error and exit

3. **Check for Conflicts**

   - Check if a folder/file with the same name already exists in target folder
   - If conflict exists, report error and exit

4. **Move the Folder or File**

   - If it's a folder:
     - Move entire folder from current location to `.agent/specs/${targetFolder}/[foldername]`
     - Preserve the original folder name
   - If it's a legacy single file:
     - Move file to `.agent/specs/${targetFolder}/[filename]`
     - Do NOT update index (legacy specs not tracked)

5. **Update Index (for numeric ID specs only)**

   - If spec has numeric ID and exists in index.json:
     - Read index.json
     - Update the spec's `location` field to match target folder
     - Write updated index back to `.agent/specs/index.json`
   - If spec not in index (legacy 3-char ID), skip this step

6. **Update Status Field**

   - Read the spec file content (spec.md or {id}-{name}-spec.md)
   - Update Status field based on target folder:
     - Moving to "todo": Set to "draft"
     - Moving to "doing": Set to "in-progress"
     - Moving to "done": Set to "completed"
   - Only update if Status field exists in the file

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

**Example 4: Move legacy spec (3-char ID)**
```bash
/move-spec ef3 done
```
Finds `ef3-*-spec.md` file and moves it to `done/` (no index update)

**Example 5: Move by full path**
```bash
/move-spec .agent/specs/todo/1-workflow-safety done
```
Moves the specified folder to `done/`

## Report

After successfully moving a folder-based spec:

```text
✓ Moved spec folder

From: .agent/specs/todo/1-workflow-safety/
To:   .agent/specs/done/1-workflow-safety/

Status updated: draft → completed
Index updated: location "todo" → "done"
```

After moving a legacy single-file spec:

```text
✓ Moved spec file

From: .agent/specs/todo/ef3-auth-improvements-spec.md
To:   .agent/specs/done/ef3-auth-improvements-spec.md

Status updated: ready → completed
Index: Not tracked (legacy spec)
```

## Error Handling

**Spec not found:**
```text
✗ Error: Could not find spec matching "workflow-safety"

Searched in:
- .agent/specs/todo/
- .agent/specs/done/

Please check the spec name/ID and try again.
```

**Multiple matches:**
```text
✗ Error: Multiple specs match "auth"

Found:
1. .agent/specs/todo/1-auth-improvements/
2. .agent/specs/done/ef3-auth-refactor-spec.md (legacy)

Please specify the full spec ID or feature name.
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
