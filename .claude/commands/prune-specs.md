---
description: Archive old done specs to keep repository lean
argument-hint: [keep-count]
---

# Prune Specs

Archive old completed specs from the `done/` folder to `archived/` folder, keeping only the most recent N specs.

## Variables

- $keepCount: $1 (optional) - Number of recent done specs to keep (default: 20)

## Instructions

- Only prune specs from the `done/` folder with numeric IDs
- Keep the most recent N specs (sorted by ID descending)
- Move older specs to `archived/` folder
- Update index.json to remove archived specs
- Never prune specs from `todo/` folder
- Never prune legacy 3-char ID specs (leave them untouched)
- Always confirm before archiving

## Workflow

1. **Read Index and Identify Specs to Archive**

   - Read `.agent/specs/index.json`
   - Filter specs where `location = "done"` AND spec ID is numeric
   - Sort by ID descending (newest first)
   - Identify specs to keep: top N specs
   - Identify specs to archive: all remaining specs after top N

2. **Display Confirmation Prompt**

   - Show list of specs to be archived:
     ```text
     Specs to archive (keeping 20 most recent):

     ID   Feature Name                 Created
     ──────────────────────────────────────────────
     5    old-feature-one             2025-01-15
     12   another-old-feature         2025-02-20
     ...

     Total: X specs will be archived
     ```
   - Ask for confirmation: `Archive these specs? (y/n): `
   - If user responds 'n' or 'no': abort and exit
   - If user responds 'y' or 'yes': proceed

3. **Move Spec Folders to Archived**

   - For each spec to archive:
     - Move entire folder from `.agent/specs/done/{id}-{feature}/` to `.agent/specs/archived/{id}-{feature}/`
     - Ensure archived/ directory exists (create if missing)

4. **Update Index**

   - Read index.json
   - Remove all archived spec entries from `specs` object
   - Preserve `lastId` (do not change)
   - Write updated index back to `.agent/specs/index.json`

5. **Report Results**

   - Display summary:
     ```text
     ✓ Archived X specs to .agent/specs/archived/

     Kept in done/:
     - Spec 50: workflow-safety
     - Spec 49: auth-improvements
     ...

     Archived:
     - Spec 12: another-old-feature
     - Spec 5: old-feature-one
     ...

     Index updated: Removed X entries
     ```

## Examples

**Example 1: Default (keep 20)**
```bash
/prune-specs
```

Archives all but the 20 most recent done specs

**Example 2: Custom keep count**
```bash
/prune-specs 10
```

Archives all but the 10 most recent done specs

**Example 3: Keep all**
```bash
/prune-specs 1000
```

If you have fewer than 1000 done specs, nothing will be archived

## Report

After successful archival:

```text
✓ Archived 15 specs

Keeping in done/ (20 most recent):
  66  workflow-safety              2025-11-08
  65  session-debugging-tools      2025-11-07
  ...
  51  cli-install                  2025-08-15

Archived to archived/:
  50  old-feature-name             2025-08-10
  49  another-feature              2025-08-05
  ...
  1   diff-refactor                2025-01-15

Index updated: Removed 15 entries
```

If user cancels:

```text
Archive cancelled. No specs were moved.
```

If no specs to archive:

```text
Nothing to archive. You have X specs in done/, all within keep limit of Y.
```

## Error Handling

**Index not found:**
```text
✗ Error: .agent/specs/index.json not found

Run /generate-spec first to initialize the spec system.
```

**No numeric ID specs in done:**
```text
Nothing to archive. No numeric ID specs found in done/ folder.

Note: Legacy 3-char ID specs are never pruned automatically.
```

**Invalid keep count:**
```text
✗ Error: Keep count must be a positive number

Example: /prune-specs 20
```

## Safety Notes

- **Non-destructive**: Specs are moved to `archived/`, not deleted
- **Legacy preservation**: 3-char ID specs are never touched
- **Index integrity**: `lastId` is preserved to prevent ID conflicts
- **Reversible**: Archived specs can be manually moved back to `done/` and re-added to index if needed
- **Confirmation required**: User must explicitly confirm before archiving

## Implementation Notes

- Archiving is based on ID number, not created date (IDs are sequential)
- Lower ID numbers = older specs
- Higher ID numbers = newer specs
- Legacy specs (3-char IDs) remain in `done/` indefinitely
- The `archived/` folder is not tracked in index.json
