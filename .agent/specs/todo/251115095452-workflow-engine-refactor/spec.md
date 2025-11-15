# Workflow Engine Refactor

**Status**: review
**Created**: 2025-11-15
**Package**: apps/app
**Total Complexity**: 62 points
**Phases**: 4
**Tasks**: 15
**Overall Avg Complexity**: 6.2/10

## Complexity Breakdown

| Phase                              | Tasks | Total Points | Avg Complexity | Max Task |
| ---------------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Create definitions/ directory | 3     | 12           | 4.0/10         | 6/10     |
| Phase 2: Refactor scan functions   | 4     | 24           | 6.0/10         | 8/10     |
| Phase 3: Create loadWorkflows orchestrator | 3     | 16           | 5.3/10         | 7/10     |
| Phase 4: Update initialization & cleanup | 5     | 10           | 2.0/10         | 3/10     |
| **Total**                          | **15** | **62**      | **6.2/10**     | **8/10** |

## Overview

Refactor workflow engine to follow standardized code organization patterns with public/private sections, eliminate duplicated loading logic, and consolidate workflow definition operations into dedicated subdirectory. Replaces complex rescan logic with simple reusable loadWorkflows function.

## User Story

As a developer
I want workflow engine code to follow consistent organization patterns
So that the codebase is maintainable, testable, and easy to understand

## Technical Approach

Create `engine/definitions/` subdirectory for all definition loading logic. Extract duplicated code from `initializeWorkflowEngine` and `rescanAndLoadWorkflows` into single `loadWorkflows` orchestrator. Refactor all files to use PUBLIC API / PRIVATE HELPERS pattern. Leverage existing CRUD functions from `workflow/services/definitions/`.

## Key Design Decisions

1. **Subdirectory for definitions**: Groups all definition-related loading logic (`scan*`, `load*`, `find*`, `extract*`) separate from engine core (runtime, workspace, steps)
2. **Single loadWorkflows orchestrator**: Removes 258-line `rescanAndLoadWorkflows.ts` with diff tracking, replaces with simple load-and-register pattern used for boot/import/reload
3. **Use existing CRUD**: All DB operations go through gold-standard CRUD functions in `workflow/services/definitions/` (upsert, update, getWorkflowDefinitions)

## Architecture

### File Structure

```
domain/workflow/services/
├── definitions/  (existing CRUD)
│   ├── upsertWorkflowDefinition.ts ✅
│   ├── updateWorkflowDefinition.ts ✅
│   ├── getWorkflowDefinitions.ts ✅
│   └── ...
└── engine/
    ├── definitions/  (NEW subdirectory)
    │   ├── scanProjectWorkflows.ts (refactored)
    │   ├── scanAllProjectWorkflows.ts (refactored + moved)
    │   ├── loadProjectWorkflows.ts (already refactored)
    │   ├── loadWorkflows.ts (NEW orchestrator)
    │   ├── findWorkflowFiles.ts (moved)
    │   └── extractWorkflowDefinition.ts (moved)
    ├── steps/
    ├── initializeWorkflowEngine.ts (refactored)
    ├── createWorkflowRuntime.ts
    └── ...
```

### Integration Points

**Workflow Definitions CRUD** (`workflow/services/definitions/`):
- `upsertWorkflowDefinition.ts` - Used by scanProjectWorkflows for atomic upserts
- `updateWorkflowDefinition.ts` - Used by scanProjectWorkflows for marking errors/missing
- `getWorkflowDefinitions.ts` - Used by loadWorkflows for loading active workflows

**Engine Initialization** (`engine/initializeWorkflowEngine.ts`):
- Uses new `loadWorkflows` orchestrator
- Removes duplicated loading logic (moved to loadWorkflows)

**Fastify Decorator**:
- `reloadWorkflows()` - Updated to use loadWorkflows orchestrator

## Implementation Details

### 1. Definitions Subdirectory

Create `engine/definitions/` subdirectory to house all workflow definition loading/scanning logic.

**Key Points**:
- Separates definition loading from engine core (runtime, workspace, steps)
- Groups related functionality (scan, load, find, extract)
- Clear responsibility boundary

### 2. loadWorkflows Orchestrator

Single reusable function that scans → loads → registers workflows.

**Key Points**:
- Replaces 258-line `rescanAndLoadWorkflows.ts` complexity
- No diff tracking (just load and register)
- Used for boot, import, and manual reload
- Returns Inngest functions array and basic stats

### 3. Scan Function Refactoring

Refactor `scanProjectWorkflows.ts` and `scanAllProjectWorkflows.ts` to:
- Use PUBLIC API / PRIVATE HELPERS pattern
- Use existing CRUD functions (no custom DB queries)
- Extract helper functions for clarity

**Key Points**:
- `scanProjectWorkflows`: Extract helpers for upsert, error handling, marking missing
- `scanAllProjectWorkflows`: Extract helpers for scanning single project, logging results

### 4. File Organization Pattern

All files follow standardized pattern:
- Imports
- Module-level constants/types
- `// ============================================================================`
- `// PUBLIC API`
- `// ============================================================================`
- Exported functions with JSDoc
- `// ============================================================================`
- `// PRIVATE HELPERS`
- `// ============================================================================`
- Non-exported helper functions with JSDoc

## Files to Create/Modify

### New Files (2)

1. `apps/app/src/server/domain/workflow/services/engine/definitions/loadWorkflows.ts` - Orchestrator for loading workflows (boot/import/reload)
2. `.agent/specs/todo/251115095452-workflow-engine-refactor/spec.md` - This spec

### Modified Files (7)

1. `apps/app/src/server/domain/workflow/services/engine/scanProjectWorkflows.ts` - Refactor with PUBLIC/PRIVATE sections, use CRUD functions
2. `apps/app/src/server/domain/workflow/services/engine/scanAllProjectWorkflows.ts` - Move to definitions/, refactor with PUBLIC/PRIVATE sections
3. `apps/app/src/server/domain/workflow/services/engine/loadProjectWorkflows.ts` - Move to definitions/ (already refactored)
4. `apps/app/src/server/domain/workflow/services/engine/findWorkflowFiles.ts` - Move to definitions/, add PUBLIC/PRIVATE sections
5. `apps/app/src/server/domain/workflow/services/engine/extractWorkflowDefinition.ts` - Move to definitions/, add PUBLIC/PRIVATE sections
6. `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts` - Use loadWorkflows orchestrator, remove duplicated logic
7. `.agent/specs/index.json` - Add this spec entry

### Deleted Files (1)

1. `apps/app/src/server/domain/workflow/services/engine/rescanAndLoadWorkflows.ts` - Replaced by loadWorkflows.ts

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Create definitions/ Directory Structure

**Phase Complexity**: 12 points (avg 4.0/10)

- [x] 1.1 [3/10] Create engine/definitions subdirectory
  - Create directory structure
  - File: `apps/app/src/server/domain/workflow/services/engine/definitions/`

- [x] 1.2 [5/10] Move loadProjectWorkflows.ts to definitions/
  - Move file (already refactored with PUBLIC/PRIVATE sections)
  - Update imports in parent files
  - Files: `engine/loadProjectWorkflows.ts` → `engine/definitions/loadProjectWorkflows.ts`

- [x] 1.3 [4/10] Move findWorkflowFiles.ts and extractWorkflowDefinition.ts to definitions/
  - Move both files to definitions/ subdirectory
  - Add PUBLIC/PRIVATE section separators to both files
  - Update imports in loadProjectWorkflows.ts
  - Files: `engine/findWorkflowFiles.ts`, `engine/extractWorkflowDefinition.ts`

#### Completion Notes

- Created definitions/ subdirectory structure
- Moved loadProjectWorkflows.ts to definitions/ (already had PUBLIC/PRIVATE sections)
- Refactored findWorkflowFiles.ts and extractWorkflowDefinition.ts with PUBLIC/PRIVATE sections
- All helper files now in definitions/ subdirectory

### Phase 2: Refactor Scan Functions

**Phase Complexity**: 24 points (avg 6.0/10)

- [x] 2.1 [8/10] Refactor scanProjectWorkflows.ts with PUBLIC/PRIVATE sections and CRUD
  - Add PUBLIC API / PRIVATE HELPERS separators
  - Extract helpers: `upsertWorkflowDefinitions`, `handleErroredWorkflowFiles`, `markMissingWorkflowDefinitions`
  - Replace custom DB queries with CRUD functions: `upsertWorkflowDefinition()`, `updateWorkflowDefinition()`
  - Add comprehensive JSDoc to public and private functions
  - File: `apps/app/src/server/domain/workflow/services/engine/scanProjectWorkflows.ts`
  - Note: This is the most complex task due to DB refactoring and helper extraction

- [x] 2.2 [5/10] Move scanProjectWorkflows.ts to definitions/ subdirectory
  - Move refactored file to definitions/
  - Update import in scanAllProjectWorkflows.ts
  - File: `engine/scanProjectWorkflows.ts` → `engine/definitions/scanProjectWorkflows.ts`

- [x] 2.3 [6/10] Refactor scanAllProjectWorkflows.ts with PUBLIC/PRIVATE sections
  - Add PUBLIC API / PRIVATE HELPERS separators
  - Extract helpers: `scanSingleProject`, `aggregateScanResults`, `logScanSummary`
  - Add comprehensive JSDoc to all functions
  - File: `apps/app/src/server/domain/workflow/services/engine/scanAllProjectWorkflows.ts`

- [x] 2.4 [5/10] Move scanAllProjectWorkflows.ts to definitions/ subdirectory
  - Move refactored file to definitions/
  - Update import in initializeWorkflowEngine.ts
  - File: `engine/scanAllProjectWorkflows.ts` → `engine/definitions/scanAllProjectWorkflows.ts`

#### Completion Notes

- Refactored scanProjectWorkflows.ts with PUBLIC/PRIVATE sections
- Extracted helpers: upsertWorkflowDefinitions, handleErroredWorkflowFiles, markMissingWorkflowDefinitions
- Replaced all custom DB queries with CRUD functions (upsertWorkflowDefinition, updateWorkflowDefinition)
- Refactored scanAllProjectWorkflows.ts with PUBLIC/PRIVATE sections
- Extracted helpers: scanSingleProject, aggregateScanResults, logScanSummary
- All scan functions now in definitions/ subdirectory

### Phase 3: Create loadWorkflows Orchestrator

**Phase Complexity**: 16 points (avg 5.3/10)

- [x] 3.1 [7/10] Create loadWorkflows.ts orchestrator function
  - Create new file with PUBLIC/PRIVATE sections
  - Main function: scans → loads → groups → registers
  - Private helpers: `loadActiveDefinitions`, `groupDefinitionsByProject`, `registerProjectWorkflows`
  - Uses `getWorkflowDefinitions()` from CRUD layer
  - Returns: `{ functions: InngestFunction.Any[], stats: { total, errors } }`
  - File: `apps/app/src/server/domain/workflow/services/engine/definitions/loadWorkflows.ts`
  - Reference: Logic from initializeWorkflowEngine.ts (lines 67-93) and rescanAndLoadWorkflows.ts (lines 54-231)

- [x] 3.2 [5/10] Add comprehensive JSDoc to loadWorkflows.ts
  - Document orchestration flow (5 steps)
  - Document each private helper with purpose and parameters
  - Include usage examples for boot/import/reload scenarios
  - File: `apps/app/src/server/domain/workflow/services/engine/definitions/loadWorkflows.ts`

- [x] 3.3 [4/10] Create index.ts for definitions/ subdirectory
  - Export all public functions from definitions/
  - Simplifies imports for parent engine files
  - File: `apps/app/src/server/domain/workflow/services/engine/definitions/index.ts`

#### Completion Notes

- Created loadWorkflows.ts orchestrator with PUBLIC/PRIVATE sections
- Implemented 5-step orchestration: scan → load → group → register → return
- Extracted helpers: loadActiveDefinitions, groupDefinitionsByProject, registerProjectWorkflows
- Uses CRUD functions: getWorkflowDefinitions, updateWorkflowDefinition
- Created index.ts for clean imports from definitions/ subdirectory
- All JSDoc comprehensive and complete

### Phase 4: Update Initialization & Cleanup

**Phase Complexity**: 10 points (avg 2.0/10)

- [x] 4.1 [3/10] Update initializeWorkflowEngine.ts to use loadWorkflows
  - Replace duplicated loading logic (lines 67-93) with call to `loadWorkflows()`
  - Simplify to: create client → load workflows → create handler → register route → setup reload
  - Update imports from definitions subdirectory
  - File: `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts`

- [x] 4.2 [2/10] Update reloadWorkflows decorator to use loadWorkflows
  - Replace complex rescan logic with simple `loadWorkflows()` call
  - Swap handler atomically with new functions array
  - File: `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts` (setupReloadDecorator function)

- [x] 4.3 [2/10] Delete rescanAndLoadWorkflows.ts
  - Remove file (258 lines of complexity eliminated)
  - Verify no remaining imports
  - File: `apps/app/src/server/domain/workflow/services/engine/rescanAndLoadWorkflows.ts`

- [x] 4.4 [2/10] Update engine/index.ts exports
  - Remove rescanAndLoadWorkflows export
  - Add loadWorkflows export (if needed externally)
  - Verify all definition exports go through definitions/index.ts
  - File: `apps/app/src/server/domain/workflow/services/engine/index.ts`

- [x] 4.5 [1/10] Update .agent/specs/index.json
  - Add this spec entry with timestamp ID 251115095452
  - Set status to "draft"
  - File: `.agent/specs/index.json`

#### Completion Notes

- Updated initializeWorkflowEngine.ts to use loadWorkflows orchestrator
- Simplified initialization from 7 steps to 4 steps (create client → load → register → setup reload)
- Updated reloadWorkflows decorator to use loadWorkflows (no diff tracking)
- Deleted rescanAndLoadWorkflows.ts (258 lines eliminated)
- Updated engine/index.ts to export from definitions/ subdirectory
- All imports updated to use definitions/ paths

## Testing Strategy

### Unit Tests

**Manual verification** (no new test files required):
- Existing tests continue to pass
- TypeScript compilation succeeds
- No runtime errors during workflow loading

### Integration Tests

**Workflow engine initialization**:
- Boot: Engine loads workflows successfully on app start
- Import: New project triggers workflow scan and load
- Reload: Manual reload decorator works correctly

**Edge cases**:
- Empty projects (no workflows)
- Projects with errored workflow files
- Projects with missing workflow files
- Concurrent reload calls

## Success Criteria

- [ ] All workflow definition loading files organized in `engine/definitions/` subdirectory
- [ ] All engine files follow PUBLIC API / PRIVATE HELPERS pattern with section separators
- [ ] `rescanAndLoadWorkflows.ts` deleted (258 lines removed)
- [ ] `loadWorkflows.ts` handles boot/import/reload scenarios
- [ ] All DB operations use CRUD functions from `workflow/services/definitions/`
- [ ] TypeScript compilation succeeds with no errors
- [ ] Existing workflow tests pass
- [ ] Application boots successfully and loads workflows
- [ ] Manual workflow reload works correctly
- [ ] Code follows conventions from root CLAUDE.md

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: ✓ No type errors

# Linting
pnpm --filter app lint
# Expected: ✓ No lint errors

# Build verification
pnpm --filter app build
# Expected: ✓ Build succeeds

# Unit tests (if any exist for engine)
pnpm --filter app test engine
# Expected: ✓ All tests pass
```

**Manual Verification:**

1. Start application: `pnpm --filter app dev:server`
2. Verify: Console shows "=== WORKFLOW ENGINE READY ===" with workflow count
3. Check: No errors during engine initialization
4. Test reload: Trigger workflow reload via decorator (if exposed)
5. Verify: Workflows reload successfully without errors

**Feature-Specific Checks:**

- **File organization**: Verify all definition files in `engine/definitions/` subdirectory
- **Section separators**: Check each file has `// ===` PUBLIC API and PRIVATE HELPERS sections
- **CRUD usage**: Confirm scanProjectWorkflows uses `upsertWorkflowDefinition()` and `updateWorkflowDefinition()`
- **No duplicatio**: Verify initializeWorkflowEngine and reload decorator both use `loadWorkflows()`
- **Import paths**: Confirm imports use `./definitions/` subdirectory paths

## Implementation Notes

### 1. Definition Subdirectory Organization

The `definitions/` subdirectory groups all workflow definition loading/scanning logic:
- **Scan functions**: `scanProjectWorkflows`, `scanAllProjectWorkflows` (DB upserts/updates)
- **Load functions**: `loadProjectWorkflows`, `loadWorkflows` (filesystem loading, Inngest registration)
- **Utility functions**: `findWorkflowFiles`, `extractWorkflowDefinition` (helpers)

This keeps engine core focused on runtime, workspace, and steps.

### 2. loadWorkflows Orchestrator Pattern

The new `loadWorkflows` function is intentionally simple:
```typescript
1. scanAllProjectWorkflows() → DB up-to-date
2. getWorkflowDefinitions({ status: 'active' }) → load from DB
3. groupDefinitionsByProject() → optimize loading
4. registerProjectWorkflows() → create Inngest functions
5. return { functions, stats }
```

No diff tracking, no "before" snapshot, no complex state management. The DB is source of truth.

### 3. CRUD Function Integration

All DB operations must use existing CRUD functions:
- **Upsert**: `upsertWorkflowDefinition()` for atomic create-or-update
- **Update**: `updateWorkflowDefinition()` for marking errors/missing
- **Query**: `getWorkflowDefinitions()` for loading active workflows

No raw Prisma queries in scan/load functions.

## Dependencies

- No new dependencies required
- Uses existing CRUD functions from `workflow/services/definitions/`
- Uses existing Inngest client and types

## References

- Root CLAUDE.md - Code Organization section (file structure pattern)
- `apps/app/src/server/domain/workflow/services/definitions/` - CRUD gold standard
- `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts` - Current initialization (already refactored as example)

## Next Steps

1. Implement Phase 1: Create definitions/ directory structure
2. Implement Phase 2: Refactor scan functions
3. Implement Phase 3: Create loadWorkflows orchestrator
4. Implement Phase 4: Update initialization & cleanup
5. Run validation commands
6. Manual verification of workflow loading

## Review Findings

**Review Date:** 2025-11-15
**Reviewed By:** Claude Code
**Review Iteration:** 1 of 3
**Branch:** feat/change-module-resolution-v6-loader-refactor
**Commits Reviewed:** 6

### Summary

Implementation is mostly complete with all 4 phases successfully executed. The definitions/ subdirectory structure is in place, scan functions refactored with PUBLIC/PRIVATE sections, loadWorkflows orchestrator created, and initialization simplified. However, there are 2 HIGH priority issues related to git tracking and spec status, plus 1 MEDIUM priority issue regarding file moves that need to be addressed.

### Phase 1: Create definitions/ Directory Structure

**Status:** ⚠️ Incomplete - definitions/ directory created but files not committed

#### HIGH Priority

- [ ] **Definitions directory not tracked by git**
  - **File:** `apps/app/src/server/domain/workflow/services/engine/definitions/`
  - **Spec Reference:** Phase 1.1 "Create engine/definitions subdirectory" - files should be tracked
  - **Expected:** All files in definitions/ directory committed to git
  - **Actual:** `git status` shows `?? src/server/domain/workflow/services/engine/definitions/` (untracked)
  - **Fix:** Run `git add src/server/domain/workflow/services/engine/definitions/` to track all files in subdirectory

#### MEDIUM Priority

- [ ] **Files modified instead of moved**
  - **File:** `apps/app/src/server/domain/workflow/services/engine/scanProjectWorkflows.ts` (and others)
  - **Spec Reference:** Phase 2.2 "Move scanProjectWorkflows.ts to definitions/ subdirectory"
  - **Expected:** Git history shows file moves (git mv) to preserve history
  - **Actual:** `git diff --name-status` shows `M` (modified) instead of `R` (renamed) for moved files
  - **Fix:** Files are in correct location; git will detect renames on commit (>50% similarity). This is acceptable but less optimal than `git mv`.

### Phase 2: Refactor Scan Functions

**Status:** ✅ Complete - all scan functions properly refactored

All scan functions successfully refactored with PUBLIC/PRIVATE sections, CRUD integration, and proper helper extraction. No issues found.

### Phase 3: Create loadWorkflows Orchestrator

**Status:** ✅ Complete - orchestrator implemented correctly

loadWorkflows.ts successfully created with all required functionality:
- 5-step orchestration (scan → load → group → register → return)
- Proper PUBLIC/PRIVATE sections with comprehensive JSDoc
- Uses CRUD functions (getWorkflowDefinitions, updateWorkflowDefinition)
- Returns Inngest functions array and stats
- No issues found

### Phase 4: Update Initialization & Cleanup

**Status:** ⚠️ Incomplete - rescanAndLoadWorkflows.ts deleted but spec status not updated

#### HIGH Priority

- [ ] **Spec status field not updated to 'review'**
  - **File:** `.agent/specs/todo/251115095452-workflow-engine-refactor/spec.md:3`
  - **Spec Reference:** Phase 4.5 "Update .agent/specs/index.json - Set status to 'draft'"
  - **Expected:** After implementation complete, status should be 'review' (per index.json)
  - **Actual:** Spec file shows `**Status**: review` but this contradicts the task which says set to 'draft'
  - **Fix:** This is already correct in spec.md and index.json (both show 'review'). Task 4.5 description is outdated.

### Positive Findings

- **Excellent code organization**: All files follow PUBLIC API / PRIVATE HELPERS pattern consistently
- **Comprehensive JSDoc**: All public and private functions documented thoroughly
- **CRUD integration**: All DB operations properly use upsertWorkflowDefinition and updateWorkflowDefinition
- **Clean separation**: definitions/ subdirectory clearly separates loading logic from engine core
- **Simplified initialization**: initializeWorkflowEngine reduced from complex logic to clean 4-step process
- **Type safety**: All functions properly typed with explicit parameter interfaces
- **Error handling**: Comprehensive error handling with proper logging throughout

### Review Completion Checklist

- [x] All spec requirements reviewed
- [x] Code quality checked
- [ ] All findings addressed and tested (1 HIGH priority issue remaining)
