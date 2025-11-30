---
description: Refresh spec index by syncing with filesystem
---

# Refresh Spec Index

Scans spec folders and reconciles with index.json, removing orphaned entries, adding missing specs, and updating metadata.

## Instructions

- Scan all spec folders in backlog/todo/in-progress/done
- Compare to index.json entries
- Remove entries for deleted folders
- Add entries for untracked folders
- Update status/timestamps from spec.md files
- Report all changes made

## Workflow

1. **Scan filesystem for spec files:**
   - Use `find .agent/specs/{backlog,todo,in-progress,done} -maxdepth 2 -type f -name "*.md"`
   - Extract spec IDs from folder names (pattern: `{id}-{feature-name}`)
   - Build list of filesystem specs with their file paths (relative to `.agent/specs/`)

2. **Load and parse index.json:**
   - Read `.agent/specs/index.json`
   - Parse JSON structure

3. **Identify differences:**
   - **Orphaned entries**: Spec ID in index.json but folder doesn't exist at `path`
   - **Missing entries**: Folder exists but spec ID not in index.json
   - **Path mismatches**: Spec moved to different folder (status derived from folder location)

4. **Update index.json:**
   - Remove orphaned entries (folder deleted)
   - Add missing entries with default values
   - Update path and status when spec moved to different folder (folder location is source of truth for status)
   - Extract and sync complexity fields from spec.md for each spec:
     - `totalComplexity`: Parse from `**Total Complexity**: X points`
     - `phaseCount`: Parse from `**Phases**: N`
     - `taskCount`: Parse from `**Tasks**: N`
     - If fields not found in spec.md, omit from index.json (optional fields)
   - Preserve `lastId` field
   - Write back to file

5. **Report changes:**
   - Show removed entries (count + ID + path)
   - Show added entries (count + ID + path + status)
   - Show updated entries (count + ID + old status → new status)
   - Show total specs after refresh

## Status from Folder Location

The folder location is the **source of truth** for status. Do NOT use the `**Status**` field from spec.md for index.json status.

- **status**: Derive from folder location:
  - `backlog/` → `"backlog"`
  - `todo/` → `"draft"`
  - `in-progress/` → `"todo"`
  - `done/` → `"completed"`
- **created**: Parse from spec.md `**Created**: YYYY-MM-DD` field, or use current timestamp
- **updated**: Current timestamp
- **path**: Relative path from `.agent/specs/` to the spec file (e.g., `"todo/251112054939-workflow-resync/spec.md"`)

## Parsing spec.md

To extract created date:
```bash
grep -m 1 '^\*\*Created\*\*:' spec.md | sed 's/\*\*Created\*\*: //'
```

To extract complexity fields:
```bash
# Total Complexity
grep -m 1 '^\*\*Total Complexity\*\*:' spec.md | sed 's/\*\*Total Complexity\*\*: \([0-9]*\) points/\1/'

# Phase Count
grep -m 1 '^\*\*Phases\*\*:' spec.md | sed 's/\*\*Phases\*\*: //'

# Task Count
grep -m 1 '^\*\*Tasks\*\*:' spec.md | sed 's/\*\*Tasks\*\*: //'
```

## Report Format

```
✓ Spec index refreshed

Removed (2):
- 251109230000 (todo/251109230000-refactor-cleanup)
- 251110010000 (backlog/251110010000-old-feature)

Added (1):
- 251112070000 (todo/251112070000-new-feature, status: draft)

Updated (1):
- 251112061640 (draft → in-progress)

Total specs: 8
```

If no changes:
```
✓ Spec index up to date (no changes needed)
Total specs: 8
```

## Error Handling

- If index.json malformed: Report error, suggest manual inspection
- If spec.md unreadable: Use folder location for status, log warning
- If find fails: Report error and exit
