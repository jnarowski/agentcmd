---
description: Delete a spec folder and remove it from index.json
argument-hint: [spec-id-or-name-or-path]
---

# Remove Spec

Permanently delete a spec folder and remove its entry from the specs index. This command does not ask for confirmation.

## Variables

- $spec-identifier: $1 (required) - The spec ID (e.g., "251112054939-workflow-resync"), name (e.g., "workflow-resync"), or relative/absolute path to the spec folder

## Instructions

- This command permanently deletes the spec folder - there is no confirmation step
- Remove the spec entry from `.agent/specs/index.json`
- If the spec is not found, report an error and list available specs
- Handle both full spec IDs and partial name matches

## Workflow

1. Parse the spec identifier and locate the spec folder:
   - If $spec-identifier is an absolute path, use it directly
   - If it starts with `.agent/specs/`, treat as relative path
   - Otherwise, search `.agent/specs/index.json` for matching ID or name
   - Check all workflow folders: `backlog/`, `todo/`, `in-progress/`, `done/`

2. Delete the spec folder and update index:
   - Remove the spec folder using `rm -rf`
   - Load `.agent/specs/index.json`
   - Remove the matching spec entry from the JSON
   - Write updated index back to file

3. Report the deletion:
   - Show the spec name and folder that was deleted
   - Confirm removal from index.json

## Error Handling

- If spec not found: List all available specs with their IDs and locations
- If index.json malformed: Report error and suggest manual inspection
- If deletion fails: Report filesystem error

## Examples

```bash
# Remove by full ID
/remove-spec 251112054939-workflow-resync

# Remove by name match
/remove-spec workflow-resync

# Remove by path
/remove-spec .agent/specs/todo/251112054939-workflow-resync
```

## Report

Return:
- Spec name and ID that was deleted
- Full path to the deleted folder
- Confirmation that index.json was updated
- If error: Clear error message and list of available specs
