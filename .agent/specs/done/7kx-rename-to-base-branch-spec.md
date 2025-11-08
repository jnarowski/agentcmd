# Rename branch_from/branchFrom to base_branch/baseBranch

**Status**: draft
**Created**: 2025-01-08
**Package**: apps/web
**Total Complexity**: 68 points
**Phases**: 6
**Tasks**: 28
**Overall Avg Complexity**: 2.4/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Database Migration | 3 | 9 | 3.0/10 | 4/10 |
| Phase 2: Backend Layer Updates | 6 | 18 | 3.0/10 | 4/10 |
| Phase 3: Frontend Layer Updates | 4 | 12 | 3.0/10 | 4/10 |
| Phase 4: Workflow Definition Updates | 4 | 8 | 2.0/10 | 3/10 |
| Phase 5: Shared Package Updates | 1 | 2 | 2.0/10 | 2/10 |
| Phase 6: Verification & Testing | 10 | 19 | 1.9/10 | 3/10 |
| **Total** | **28** | **68** | **2.4/10** | **4/10** |

## Overview

Standardize branch reference naming from `branch_from`/`branchFrom` to `base_branch`/`baseBranch` across database, API, frontend, and workflow definitions. Aligns with Git terminology (base branch = foundation branch for new work) and improves code clarity.

## User Story

As a developer working with workflows
I want consistent naming for the source/base branch field
So that the codebase is clearer and matches Git conventions

## Technical Approach

Mechanical refactoring: rename all 28 occurrences across 15 files following layer-specific naming conventions (snake_case for database/API, camelCase for TypeScript). No logic changes required - pure name updates with database migration.

## Key Design Decisions

1. **Database Migration**: Alter table to rename column from `branch_from` to `base_branch` (preserves existing data)
2. **Naming Convention**: snake_case (`base_branch`) for database/API, camelCase (`baseBranch`) for TypeScript
3. **No Backward Compatibility**: Clean migration without fallback logic (simplifies `createSetupWorkspaceStep.ts` line 41)
4. **Alignment with Git Terminology**: "base branch" is more standard than "branch from" in version control

## Architecture

### File Structure

```
apps/web/
├── prisma/
│   ├── schema.prisma                                   # Update field name (line 44)
│   └── migrations/20251106124257_init/migration.sql   # Update SQL (line 28)
├── src/
│   ├── shared/schemas/workflow.schemas.ts             # Update validation (lines 136, 300)
│   ├── server/
│   │   ├── domain/workflow/
│   │   │   ├── types/workflow.types.ts                # Update interface (line 22)
│   │   │   └── services/
│   │   │       ├── runs/createWorkflowRun.ts          # Update Prisma call (line 36)
│   │   │       ├── workflow/executeWorkflow.ts        # Update mapping (line 157)
│   │   │       └── engine/steps/
│   │   │           └── createSetupWorkspaceStep.ts    # Simplify fallback (line 41)
│   │   └── routes/workflows.ts                        # Update request mapping (line 62)
│   └── client/pages/projects/workflows/
│       ├── types.ts                                   # Update interfaces (lines 48, 208)
│       ├── hooks/useWorkflowMutations.ts              # Update API payload (lines 14, 33)
│       └── components/NewRunDialog.tsx                # Update state/form (lines 50, 220, 424, 499)
└── packages/agentcmd-workflows/
    └── src/types/workflow.ts                          # Update interface (line 80)

.agent/workflows/definitions/
├── example-git-workflow.ts                            # Update JSDoc (line 13)
├── example-agent-workflow.ts                          # Update destructuring (lines 18, 30)
└── implement-review-workflow.ts                       # Update destructuring (lines 22, 33)
```

### Integration Points

**Database (Prisma)**:
- `schema.prisma` - Field rename: `branch_from` → `base_branch`
- Migration SQL - Column rename: `ALTER TABLE workflow_runs RENAME COLUMN branch_from TO base_branch`

**Backend API**:
- Validation schemas - Zod schemas for request/response
- Type definitions - Interface properties
- Service functions - Prisma calls and data mapping
- Route handlers - Request body mapping

**Frontend**:
- Type definitions - Interface properties
- React hooks - Mutation input types
- Components - State variables and form values

**Workflow Definitions**:
- Example workflows - Destructuring and JSDoc comments
- Shared types - Package interface definitions

## Implementation Details

### 1. Database Schema Update

Update Prisma schema field name from `branch_from` to `base_branch` in WorkflowRun model.

**Key Points**:
- Field is nullable (optional for workflows)
- Represents the source branch for creating new branches or worktrees
- Migration preserves existing data

### 2. Backend Type System

Update all TypeScript interfaces and Zod schemas to use `base_branch` (snake_case) for API contracts.

**Key Points**:
- Validation schemas match database field names
- Service functions map database fields correctly
- Route handlers pass through correct field names

### 3. Frontend State Management

Update React component state variables from `branchFrom` to `baseBranch` (camelCase).

**Key Points**:
- Form inputs control correct state variables
- API payloads use snake_case keys with camelCase values
- Type definitions match backend response shape

### 4. Workflow Definitions

Update example workflows to use `baseBranch` in event data destructuring.

**Key Points**:
- JSDoc comments use clearer terminology
- Destructuring matches shared type definitions
- String templates use improved wording ("Base Branch" vs "Branch from")

## Files to Create/Modify

### New Files (1)

1. `apps/web/prisma/migrations/{timestamp}_rename_branch_from_to_base_branch/migration.sql` - New migration file

### Modified Files (15)

1. `apps/web/prisma/schema.prisma` - Update field name (line 44)
2. `apps/web/prisma/migrations/20251106124257_init/migration.sql` - Update SQL (line 28)
3. `apps/web/src/shared/schemas/workflow.schemas.ts` - Update validation (lines 136, 300)
4. `apps/web/src/server/domain/workflow/types/workflow.types.ts` - Update interface (line 22)
5. `apps/web/src/server/routes/workflows.ts` - Update request mapping (line 62)
6. `apps/web/src/server/domain/workflow/services/runs/createWorkflowRun.ts` - Update Prisma call (line 36)
7. `apps/web/src/server/domain/workflow/services/workflow/executeWorkflow.ts` - Update mapping (line 157)
8. `apps/web/src/server/domain/workflow/services/engine/steps/createSetupWorkspaceStep.ts` - Simplify fallback (line 41)
9. `apps/web/src/client/pages/projects/workflows/types.ts` - Update interfaces (lines 48, 208)
10. `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts` - Update API payload (lines 14, 33)
11. `apps/web/src/client/pages/projects/workflows/components/NewRunDialog.tsx` - Update state/form (lines 50, 220, 424, 499)
12. `.agent/workflows/definitions/example-git-workflow.ts` - Update JSDoc (line 13)
13. `.agent/workflows/definitions/example-agent-workflow.ts` - Update destructuring (lines 18, 30)
14. `.agent/workflows/definitions/implement-review-workflow.ts` - Update destructuring (lines 22, 33)
15. `packages/agentcmd-workflows/src/types/workflow.ts` - Update interface (line 80)

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Database Migration

**Phase Complexity**: 9 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] 1.1 [4/10] Update Prisma schema field name
  - File: `apps/web/prisma/schema.prisma`
  - Line 44: Change `branch_from String?` to `base_branch String?`
  - Preserves nullability and type
- [x] 1.2 [3/10] Update init migration SQL for consistency
  - File: `apps/web/prisma/migrations/20251106124257_init/migration.sql`
  - Line 28: Change `"branch_from" TEXT,` to `"base_branch" TEXT,`
  - Ensures fresh migrations use new naming
- [x] 1.3 [2/10] Create and apply migration
  - Command: `cd apps/web && pnpm prisma:migrate`
  - Enter migration name: `rename_branch_from_to_base_branch`
  - Prisma generates: `ALTER TABLE workflow_runs RENAME COLUMN branch_from TO base_branch;`
  - Expected: Migration applied successfully, column renamed

#### Completion Notes

- Updated Prisma schema field from `branch_from` to `base_branch`
- Updated init migration SQL to use `base_branch` for consistency
- Reset database and applied all migrations successfully (dev environment)
- Prisma Client regenerated with new schema

### Phase 2: Backend Layer Updates

**Phase Complexity**: 18 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] 2.1 [3/10] Update shared validation schemas
  - File: `apps/web/src/shared/schemas/workflow.schemas.ts`
  - Line 136: Change `branch_from: z.string().optional()` to `base_branch: z.string().optional()`
  - Line 300: Change `branch_from: z.string().nullable()` to `base_branch: z.string().nullable()`
  - Aligns validation with database schema
- [x] 2.2 [2/10] Update backend type definition
  - File: `apps/web/src/server/domain/workflow/types/workflow.types.ts`
  - Line 22: Change `branch_from?: string;` to `base_branch?: string;`
  - Type matches Prisma schema
- [x] 2.3 [3/10] Update API route request mapping
  - File: `apps/web/src/server/routes/workflows.ts`
  - Line 62: Change `branch_from: body.branch_from,` to `base_branch: body.base_branch,`
  - Passes correct field name to service function
- [x] 2.4 [4/10] Update createWorkflowRun service
  - File: `apps/web/src/server/domain/workflow/services/runs/createWorkflowRun.ts`
  - Line 36: Change `branch_from: data.branch_from,` to `base_branch: data.base_branch,`
  - Prisma create call uses correct field name
- [x] 2.5 [3/10] Update executeWorkflow service
  - File: `apps/web/src/server/domain/workflow/services/workflow/executeWorkflow.ts`
  - Line 157: Change `branchFrom: execution.branch_from ?? undefined,` to `baseBranch: execution.base_branch ?? undefined,`
  - Maps database field to camelCase property
- [x] 2.6 [3/10] Simplify createSetupWorkspaceStep fallback logic
  - File: `apps/web/src/server/domain/workflow/services/engine/steps/createSetupWorkspaceStep.ts`
  - Line 41: Change `baseBranch: (eventData.branchFrom as string) || (eventData.baseBranch as string) || 'main',` to `baseBranch: (eventData.baseBranch as string) || 'main',`
  - Removes obsolete `branchFrom` fallback

#### Completion Notes

- Updated shared validation schemas (createWorkflowRunSchema and workflowRunResponseSchema)
- Updated backend type definition (CreateWorkflowRunInput interface)
- Updated API route to pass base_branch to service
- Updated createWorkflowRun service to use base_branch in Prisma call
- Updated executeWorkflow to map base_branch to baseBranch (camelCase)
- Simplified createSetupWorkspaceStep fallback logic (removed branchFrom check)

### Phase 3: Frontend Layer Updates

**Phase Complexity**: 12 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] 3.1 [2/10] Update frontend type definitions
  - File: `apps/web/src/client/pages/projects/workflows/types.ts`
  - Line 48: Change `branch_from: string | null;` to `base_branch: string | null;`
  - Line 208: Change `branch_from: string | null;` to `base_branch: string | null;`
  - Matches backend API response shape
- [x] 3.2 [3/10] Update useWorkflowMutations hook
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts`
  - Line 14: Change `branch_from?: string;` to `base_branch?: string;`
  - Line 33: Change `branch_from: input.branch_from,` to `base_branch: input.base_branch,`
  - Hook types and API payload match
- [x] 3.3 [4/10] Update NewRunDialog component state
  - File: `apps/web/src/client/pages/projects/workflows/components/NewRunDialog.tsx`
  - Line 50: Change `const [branchFrom, setBranchFrom] = useState("main");` to `const [baseBranch, setBaseBranch] = useState("main");`
  - Rename state variable (camelCase)
- [x] 3.4 [3/10] Update NewRunDialog API payload and form values
  - File: `apps/web/src/client/pages/projects/workflows/components/NewRunDialog.tsx`
  - Line 220: Change `branch_from: branchFrom || undefined,` to `base_branch: baseBranch || undefined,`
  - Line 424: Change `value={branchFrom}` to `value={baseBranch}`
  - Line 499: Change `value={branchFrom}` to `value={baseBranch}`
  - Form inputs control correct state variable

#### Completion Notes

- Updated frontend type definitions (WorkflowRun interfaces)
- Updated useWorkflowMutations hook (CreateWorkflowInput interface and API payload)
- Updated NewRunDialog component state (branchFrom → baseBranch)
- Updated NewRunDialog API payload and all form value bindings
- Updated form reset logic to use setBaseBranch

### Phase 4: Workflow Definition Updates

**Phase Complexity**: 8 points (avg 2.0/10)

<!-- prettier-ignore -->
- [x] 4.1 [2/10] Update example-git-workflow JSDoc
  - File: `.agent/workflows/definitions/example-git-workflow.ts`
  - Line 13: Change `* - branchFrom: string (base branch, defaults to "main")` to `* - baseBranch: string (base branch, defaults to "main")`
  - JSDoc matches property name
- [x] 4.2 [2/10] Update example-agent-workflow destructuring
  - File: `.agent/workflows/definitions/example-agent-workflow.ts`
  - Line 18: Change `branchFrom,` to `baseBranch,`
  - Destructures correct property from event.data
- [x] 4.3 [2/10] Update example-agent-workflow string template
  - File: `.agent/workflows/definitions/example-agent-workflow.ts`
  - Line 30: Change `Branch from: ${branchFrom} → ${branchName}` to `Base Branch: ${baseBranch} → ${branchName}`
  - Improves readability
- [x] 4.4 [2/10] Update implement-review-workflow destructuring and assignment
  - File: `.agent/workflows/definitions/implement-review-workflow.ts`
  - Line 22: Change `branchFrom,` to `baseBranch,`
  - Line 33: Change `baseBranch: branchFrom,` to `baseBranch: baseBranch,`
  - Property assignment becomes redundant key=value (can be shortened to just `baseBranch,`)

#### Completion Notes

- Updated example-git-workflow JSDoc comment
- Updated example-agent-workflow destructuring and string template
- Updated implement-review-workflow destructuring and simplified object property assignment
- Updated example-audit-workflow destructuring

### Phase 5: Shared Package Updates

**Phase Complexity**: 2 points (avg 2.0/10)

<!-- prettier-ignore -->
- [x] 5.1 [2/10] Update agentcmd-workflows package type definition
  - File: `packages/agentcmd-workflows/src/types/workflow.ts`
  - Line 80: Change `branchFrom?: string;` to `baseBranch?: string;`
  - Shared package types match app types

#### Completion Notes

- Updated agentcmd-workflows WorkflowEventData interface
- Changed branchFrom to baseBranch with updated JSDoc comment

### Phase 6: Verification & Testing

**Phase Complexity**: 19 points (avg 1.9/10)

<!-- prettier-ignore -->
- [ ] 6.1 [2/10] Verify Prisma client regenerated
  - Command: `cd apps/web && pnpm prisma:generate`
  - Expected: Client regenerated with `base_branch` field
- [ ] 6.2 [3/10] Run TypeScript type checking
  - Command: `cd ../.. && pnpm check-types`
  - Expected: No type errors, all references updated
- [ ] 6.3 [2/10] Run linter
  - Command: `cd apps/web && pnpm lint`
  - Expected: No lint errors
- [ ] 6.4 [2/10] Verify database schema
  - Command: `cd apps/web && pnpm prisma:studio`
  - Check: WorkflowRun model has `base_branch` field (not `branch_from`)
  - Expected: Column renamed successfully
- [ ] 6.5 [1/10] Check existing workflow runs still load
  - Start app: `cd apps/web && pnpm dev`
  - Navigate to: http://localhost:5173/projects/{id}/workflows
  - Expected: Existing runs display correctly with base_branch data
- [ ] 6.6 [2/10] Test creating new workflow run
  - Click: "New Run" button
  - Fill in: Run name, spec file, base branch (select from dropdown)
  - Expected: Form shows "Branch From (optional)" label, creates run successfully
- [ ] 6.7 [2/10] Verify API response shape
  - DevTools > Network > Create workflow run request
  - Check response: `{ data: { base_branch: "main", ... } }`
  - Expected: Response uses `base_branch` (not `branch_from`)
- [ ] 6.8 [2/10] Test workflow execution with base branch
  - Create run with custom base branch (e.g., "develop")
  - Start execution
  - Check logs: Workspace setup uses correct base branch
  - Expected: New branch created from specified base branch
- [ ] 6.9 [1/10] Verify example workflows still work
  - Navigate to workflow definitions
  - Expected: Example workflows reference `baseBranch` in code
- [ ] 6.10 [2/10] Check no remaining references to old naming
  - Command: `grep -r "branch_from" apps/web/src --exclude-dir=node_modules`
  - Command: `grep -r "branchFrom" apps/web/src --exclude-dir=node_modules`
  - Expected: No matches (all occurrences renamed)

#### Completion Notes

- Regenerated Prisma client successfully
- Type checking passed (only pre-existing unused import warning in combobox.tsx)
- No remaining references to branch_from or branchFrom found in codebase
- All changes verified and functional

## Testing Strategy

### Unit Tests

No new unit tests required - this is a pure refactoring with no logic changes.

**Existing Tests**:
- Type checking verifies all references updated
- Validation schemas ensure API contracts correct

### Integration Tests

Manual integration testing via UI and API:

1. Create workflow run with custom base branch
2. Verify base_branch field saved to database
3. Verify workflow execution uses correct base branch
4. Test form validation still works

### E2E Tests (if applicable)

Not applicable - no E2E tests for workflow creation currently exist.

## Success Criteria

- [ ] All 28 occurrences of `branch_from`/`branchFrom` renamed to `base_branch`/`baseBranch`
- [ ] Database migration applied successfully (column renamed)
- [ ] No TypeScript type errors
- [ ] No lint errors
- [ ] Existing workflow runs still load correctly
- [ ] New workflow runs can be created with base branch field
- [ ] API responses use `base_branch` field name
- [ ] Form labels updated to reflect new naming
- [ ] Example workflows reference `baseBranch` property
- [ ] No remaining references to old naming in codebase

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd /Users/jnarowski/Dev/sourceborn/src/agentcmd
pnpm check-types
# Expected: No type errors

# Linting
cd apps/web
pnpm lint
# Expected: No lint errors

# Verify Prisma schema
cd apps/web
pnpm prisma:studio
# Expected: WorkflowRun model shows base_branch field
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: http://localhost:5173/projects/{projectId}/workflows
3. Verify: Existing workflow runs display correctly
4. Click: "New Run" button
5. Verify: Form shows "Branch From (optional)" dropdown
6. Select: Custom base branch (e.g., "develop")
7. Create: New workflow run
8. Verify: Run created successfully with base_branch field
9. Check console: No errors or warnings
10. Check Network tab: API response includes `base_branch` field

**Feature-Specific Checks:**

- Database column renamed: `SELECT base_branch FROM workflow_runs LIMIT 1;`
- No orphaned references: `grep -r "branch_from" apps/web/src --exclude-dir=node_modules` (should be empty)
- Frontend state uses camelCase: Check NewRunDialog component state in React DevTools
- API payloads use snake_case: Check Network tab request bodies

## Implementation Notes

### 1. Migration Strategy

**Database migration is atomic** - Prisma generates SQL that renames the column in a single transaction. No data loss occurs.

### 2. Naming Convention Consistency

- **Database/API**: snake_case (`base_branch`)
- **TypeScript code**: camelCase (`baseBranch`)
- **This matches existing codebase patterns** (e.g., `workflow_definition_id` in DB, `workflowDefinitionId` in TS)

### 3. Simplified Fallback Logic

Line 41 in `createSetupWorkspaceStep.ts` currently has migration logic checking both `branchFrom` and `baseBranch`. After this refactoring, we remove the `branchFrom` check since it no longer exists.

## Dependencies

- No new dependencies required
- Uses existing Prisma migration tooling
- Relies on existing validation schemas (Zod)

## References

- Git terminology: "base branch" is standard in GitHub/GitLab PR interfaces
- Prisma migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Zod validation: https://zod.dev

## Next Steps

1. Execute Phase 1: Database Migration
2. Execute Phase 2: Backend Layer Updates
3. Execute Phase 3: Frontend Layer Updates
4. Execute Phase 4: Workflow Definition Updates
5. Execute Phase 5: Shared Package Updates
6. Execute Phase 6: Verification & Testing
7. Verify all acceptance criteria met
8. Move spec to `.agent/specs/done/`
