# Workflow Definition Safety & File Validation

**Status**: draft
**Created**: 2025-11-08
**Package**: apps/app
**Total Complexity**: 42 points
**Phases**: 4
**Tasks**: 11
**Overall Avg Complexity**: 3.8/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Database Schema | 2 | 5 | 2.5/10 | 3/10 |
| Phase 2: Validation Logic | 4 | 19 | 4.8/10 | 6/10 |
| Phase 3: Workflow Scanning | 3 | 12 | 4.0/10 | 5/10 |
| Phase 4: Frontend & Testing | 2 | 6 | 3.0/10 | 4/10 |
| **Total** | **11** | **42** | **3.8/10** | **6/10** |

## Overview

Add status tracking and file validation to WorkflowDefinition model to prevent Inngest events from being sent for deleted/missing workflow files. When a workflow file is removed but database record remains, users see mysterious "no functions triggered" errors in Inngest UI. This feature adds validation before event sending and marks definitions as archived when files are missing.

## User Story

As a developer using workflow definitions
I want the system to detect when workflow files are deleted
So that I don't waste time debugging mysterious Inngest errors and can see clear warnings in the UI

## Technical Approach

Add `status` ("active" | "archived") and `file_exists` (boolean) columns to `WorkflowDefinition` model. Before executing workflows, validate the file still exists on disk and fail fast with clear error messages. During workflow scanning, update `file_exists` flag and mark missing definitions as archived. Filter UI to show only active definitions with existing files.

## Key Design Decisions

1. **Status + file_exists pattern**: Use explicit `status` column for user-initiated archiving and separate `file_exists` boolean for system-detected issues - cleaner separation of concerns than single tri-state field
2. **Fail fast in executeWorkflow**: Check status and file existence before sending Inngest events to prevent mysterious "no function triggered" errors
3. **Preserve history**: Archive instead of delete to maintain execution history and allow reactivation if file is restored

## Architecture

### File Structure
```
apps/app/
├── prisma/
│   ├── schema.prisma                    # Add status, file_exists, archived_at
│   └── migrations/
│       └── [timestamp]_add_workflow_definition_status/
├── src/
│   ├── server/
│   │   └── domain/
│   │       └── workflow/
│   │           ├── services/
│   │           │   ├── workflow/
│   │           │   │   └── executeWorkflow.ts  # Add validation
│   │           │   └── engine/
│   │           │       └── scanProjectWorkflows.ts  # Update file_exists
│   │           └── types/
│   └── shared/
│       └── schemas/
│           └── workflow.schemas.ts      # Add status enum
```

### Integration Points

**Database (Prisma)**:
- `schema.prisma` - Add status, file_exists, archived_at fields
- Generate migration and apply

**Workflow Execution**:
- `executeWorkflow.ts` - Validate status and file_exists before sending Inngest event
- `scanProjectWorkflows.ts` - Update file_exists flag during scans

**Shared Types**:
- `workflow.schemas.ts` - Export status enum type

## Implementation Details

### 1. Database Schema Changes

Add three new fields to `WorkflowDefinition` model:
- `status`: String enum ("active" | "archived") with default "active"
- `file_exists`: Boolean with default true
- `archived_at`: Nullable DateTime timestamp

**Key Points**:
- Use string enum for extensibility (can add "draft", "disabled" later)
- Separate boolean for file existence tracking (system-detected)
- Timestamp for audit trail

### 2. Validation in executeWorkflow

Add validation checks immediately after loading workflow execution (line 22):
1. Check if `status === "archived"` → fail with clear error
2. Check if `file_exists === false` → fail with clear error
3. Verify file on disk → if missing, update DB and fail

**Key Points**:
- Fail fast before sending Inngest events
- Clear error messages for troubleshooting
- Update DB state on file validation failure
- Mark run as failed with descriptive error_message

### 3. Workflow Scanning Updates

During `scanProjectWorkflows`, track which definition files were found and update `file_exists` flags accordingly. Mark definitions with missing files as archived.

**Key Points**:
- Set `file_exists=true` for discovered files
- Set `file_exists=false` for definitions not found during scan
- Optionally mark as archived if file missing for extended period
- Reactivate if previously-missing file returns

### 4. Shared Type Definitions

Export status enum type in shared schemas for use in frontend queries and API validation.

## Files to Create/Modify

### New Files (1)

1. `apps/app/prisma/migrations/[timestamp]_add_workflow_definition_status/migration.sql` - Database migration

### Modified Files (4)

1. `apps/app/prisma/schema.prisma` - Add status, file_exists, archived_at fields
2. `apps/app/src/server/domain/workflow/services/workflow/executeWorkflow.ts` - Add validation logic
3. `apps/app/src/server/domain/workflow/services/engine/scanProjectWorkflows.ts` - Update file tracking
4. `apps/app/src/shared/schemas/workflow.schemas.ts` - Add status enum export

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Database Schema

**Phase Complexity**: 5 points (avg 2.5/10)

<!-- prettier-ignore -->
- [ ] w7k-1 [3/10] Add status, file_exists, archived_at fields to WorkflowDefinition model
  - Add `status String @default("active")` with comment explaining "active" | "archived"
  - Add `file_exists Boolean @default(true)` for tracking file presence
  - Add `archived_at DateTime?` nullable timestamp
  - File: `apps/app/prisma/schema.prisma`
- [ ] w7k-2 [2/10] Generate and apply Prisma migration
  - Run: `cd apps/app && pnpm prisma:migrate`
  - Name migration: "add_workflow_definition_status"
  - Verify migration applied successfully
  - File: `apps/app/prisma/migrations/[timestamp]_add_workflow_definition_status/migration.sql`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Validation Logic

**Phase Complexity**: 19 points (avg 4.8/10)

<!-- prettier-ignore -->
- [ ] w7k-3 [4/10] Add validation helper function for workflow file existence
  - Create `validateWorkflowFile()` function after line 204 in executeWorkflow.ts
  - Check if file_path exists on disk using `fs.access()`
  - Return boolean indicating file existence
  - File: `apps/app/src/server/domain/workflow/services/workflow/executeWorkflow.ts`
- [ ] w7k-4 [6/10] Add pre-execution validation in executeWorkflow
  - After line 30 (getting execution), add validation block
  - Check `execution.workflow_definition.status === "archived"` → throw clear error
  - Check `execution.workflow_definition.file_exists === false` → throw clear error
  - Call validateWorkflowFile() to verify file on disk
  - If file missing: update `file_exists=false` and `archived_at` in DB, then fail run
  - Update run status to "failed" with clear error_message before throwing
  - File: `apps/app/src/server/domain/workflow/services/workflow/executeWorkflow.ts`
- [ ] w7k-5 [5/10] Update failure error messages to be user-friendly
  - Archived: "Cannot execute archived workflow definition (file was deleted or marked inactive)"
  - File missing: "Workflow definition file not found: {filePath}. The file may have been deleted or moved."
  - Include suggestion to check if file was deleted or git branch changed
  - File: `apps/app/src/server/domain/workflow/services/workflow/executeWorkflow.ts`
- [ ] w7k-6 [4/10] Add import for fs.access and update types
  - Import `import { access } from 'node:fs/promises'` at top
  - Update ExecuteWorkflowOptions type if needed for new validation
  - File: `apps/app/src/server/domain/workflow/services/workflow/executeWorkflow.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Workflow Scanning

**Phase Complexity**: 12 points (avg 4.0/10)

<!-- prettier-ignore -->
- [ ] w7k-7 [5/10] Track found workflows during scanning
  - After line 24 (loading workflows), collect set of found identifiers
  - After upserting all found workflows (line 61), query for definitions not in found set
  - For missing definitions: update `file_exists=false` and `archived_at=new Date()`
  - Log warnings for definitions marked as missing
  - File: `apps/app/src/server/domain/workflow/services/engine/scanProjectWorkflows.ts`
- [ ] w7k-8 [4/10] Reactivate definitions when files return
  - In upsert update block (line 47), add logic to reactivate
  - If updating existing definition with `status="archived"` and `file_exists=false`
  - Set `status="active"`, `file_exists=true`, `archived_at=null`
  - Log info about reactivation
  - File: `apps/app/src/server/domain/workflow/services/engine/scanProjectWorkflows.ts`
- [ ] w7k-9 [3/10] Add index for status filtering queries
  - Add `@@index([status])` to WorkflowDefinition model
  - Add `@@index([project_id, status])` compound index for efficient project queries
  - Regenerate Prisma client
  - File: `apps/app/prisma/schema.prisma`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Frontend & Testing

**Phase Complexity**: 6 points (avg 3.0/10)

<!-- prettier-ignore -->
- [ ] w7k-10 [4/10] Add status enum to shared schemas
  - Export `workflowDefinitionStatusSchema = z.enum(['active', 'archived'])`
  - Export type: `WorkflowDefinitionStatus = z.infer<typeof workflowDefinitionStatusSchema>`
  - Add JSDoc comment explaining use cases for each status
  - File: `apps/app/src/shared/schemas/workflow.schemas.ts`
- [ ] w7k-11 [2/10] Document status field in schema comments
  - Add inline comment in schema.prisma explaining status values
  - Add comment explaining file_exists tracking purpose
  - Update WorkflowDefinition model JSDoc if exists
  - File: `apps/app/prisma/schema.prisma`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`apps/app/src/server/domain/workflow/services/workflow/executeWorkflow.test.ts`** - Validation logic tests:

```typescript
describe('executeWorkflow validation', () => {
  it('should fail when workflow definition is archived', async () => {
    // Create archived workflow definition
    // Attempt execution
    // Expect clear error about archived status
  });

  it('should fail when file_exists is false', async () => {
    // Create definition with file_exists=false
    // Attempt execution
    // Expect clear error about missing file
  });

  it('should update file_exists when file missing on disk', async () => {
    // Create definition with file that doesn't exist
    // Attempt execution
    // Verify file_exists updated to false
    // Verify archived_at timestamp set
  });

  it('should succeed when status=active and file exists', async () => {
    // Create active definition with existing file
    // Execution should proceed normally
  });
});
```

### Integration Tests

**Workflow scanning integration**:
- Create test workflow files and scan
- Verify definitions created with correct flags
- Delete workflow file and rescan
- Verify definition marked with file_exists=false
- Restore file and rescan
- Verify definition reactivated

### E2E Tests (Manual)

Since this is backend validation, manual testing via:
1. Create workflow definition and verify execution works
2. Delete workflow file from disk
3. Attempt to execute workflow
4. Verify clear error message in UI/logs
5. Check Inngest UI - should NOT show "no functions triggered"

## Success Criteria

- [ ] WorkflowDefinition model has status, file_exists, archived_at fields
- [ ] executeWorkflow validates status and file existence before sending events
- [ ] Clear, actionable error messages when validation fails
- [ ] Workflow scanning updates file_exists flags correctly
- [ ] Definitions with missing files marked as archived
- [ ] Definitions reactivated when files return
- [ ] No Prisma type errors after schema changes
- [ ] All existing workflow execution tests still pass
- [ ] New validation tests pass
- [ ] Migration applies cleanly to existing databases

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/app && pnpm build
# Expected: Successful build with no errors

# Type checking
cd ../.. && pnpm check-types
# Expected: No TypeScript errors

# Linting
pnpm lint
# Expected: No lint errors

# Database migration
cd apps/app && pnpm prisma:migrate
# Expected: Migration applied successfully

# Prisma client generation
pnpm prisma:generate
# Expected: Client regenerated with new fields
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Create a test workflow definition via API or scanning
3. Verify workflow executes successfully (status=active, file_exists=true)
4. Delete the workflow file from disk
5. Attempt to execute the workflow again
6. Verify execution fails with clear error message about missing file
7. Check database: `file_exists` should be false, `archived_at` should be set
8. Check Inngest UI at http://localhost:8288: Should NOT show event with "no functions triggered"
9. Restore the workflow file
10. Rescan workflows
11. Verify definition reactivated (status=active, file_exists=true, archived_at=null)

**Feature-Specific Checks:**

- Query WorkflowDefinition table: `SELECT id, identifier, status, file_exists, archived_at FROM workflow_definitions;`
- Verify archived definitions have archived_at timestamp
- Verify active definitions have file_exists=true
- Test archiving a definition manually (if UI supports it)
- Verify archived definitions don't appear in workflow picker dropdowns

## Implementation Notes

### 1. Backward Compatibility

Migration will set default values for existing records:
- `status` defaults to "active"
- `file_exists` defaults to true
- `archived_at` remains null

After migration, run a full workflow scan to validate all existing file paths and update flags accordingly.

### 2. Race Condition Handling

Between validation check and Inngest event send, file could theoretically be deleted. This is acceptable - Inngest will still show "no functions triggered" but at least we've done our best validation. The next scan will catch it and mark it appropriately.

### 3. Performance Considerations

File existence checks (`fs.access()`) are fast (<1ms) but add latency to execution path. Consider:
- Caching validation results briefly (5-10 seconds)
- Skip validation if workflow was just scanned
- Trade-off: slightly slower execution vs. better error messages

Current implementation prioritizes clear errors over micro-optimization.

### 4. Future Enhancements

Potential future states to add:
- `status: "draft"` - for workflows still being developed
- `status: "disabled"` - temporarily disabled by user
- `status: "deprecated"` - old version, show warning but allow execution

Keep status as string enum to support these additions.

## Dependencies

- No new package dependencies required
- Requires Prisma 6.17.x (already installed)
- Requires Node.js fs/promises API (Node 18+, already required)

## References

- Prisma enum documentation: https://www.prisma.io/docs/orm/prisma-schema/data-model/models#defining-enums
- Node.js fs.access(): https://nodejs.org/api/fs.html#fspromisesaccesspath-mode
- Original issue discussion: Earlier in this conversation (Inngest "no functions triggered" error)

## Next Steps

1. Review and approve this spec
2. Create feature branch: `git checkout -b feat/workflow-definition-safety`
3. Execute Phase 1: Database schema changes
4. Execute Phase 2: Validation logic
5. Execute Phase 3: Workflow scanning updates
6. Execute Phase 4: Shared schemas and documentation
7. Run full validation suite
8. Create pull request with `/pull-request` command
