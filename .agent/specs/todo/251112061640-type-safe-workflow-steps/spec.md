# Type-Safe Workflow Step Args/Output

**Status**: in-progress
**Created**: 2025-11-12
**Package**: apps/app, agentcmd-workflows
**Total Complexity**: 71 points
**Phases**: 4
**Tasks**: 18
**Overall Avg Complexity**: 3.9/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: SDK Types Update | 3 | 14 | 4.7/10 | 6/10 |
| Phase 2: Shared Types & Schema | 4 | 17 | 4.3/10 | 6/10 |
| Phase 3: Backend Implementation | 7 | 28 | 4.0/10 | 5/10 |
| Phase 4: Frontend Updates | 4 | 12 | 3.0/10 | 4/10 |
| **Total** | **18** | **71** | **3.9/10** | **6/10** |

## Overview

Add type-safe discriminated unions for workflow step args and output based on `step_type`, with standardized output format `{ data, success, error, trace }` across all step types. Replace frontend duplicate `WorkflowRunStep` type with single shared type. Add universal trace logging for all steps.

## User Story

As a developer working with workflow steps
I want type-safe access to step args and output based on step_type
So that I can write correct code with TypeScript exhaustive checking and avoid runtime errors

## Technical Approach

1. Update SDK types to standardize all results with `{ data, success, error, trace }` wrapper
2. Create shared discriminated union type combining DB fields with type-specific args/output
3. Update Prisma schema: rename `input` → `args`, remove `log_directory_path`
4. Update all backend step implementations to return new format with trace
5. Remove frontend duplicate type, update components to use shared type

## Key Design Decisions

1. **Standardized data wrapper**: All outputs use `{ data, success, error, trace }` for consistency over ergonomics
2. **Discriminated union**: Type-safe args/output per step_type enables exhaustive checking
3. **Intersection type**: Combines base DB fields with discriminated union to avoid field repetition
4. **Direct imports**: Components import from shared types directly (no re-exports)
5. **Universal trace**: All steps log execution with `TraceEntry[]` for debugging

## Architecture

### File Structure
```
packages/agentcmd-workflows/src/types/
  steps.ts                       # SDK types (add TraceEntry, update all results)

apps/app/src/
  shared/types/
    workflow-step.types.ts       # NEW: Shared discriminated union type

  server/domain/workflow/
    services/engine/steps/
      createGitStep.ts           # Update to return new format
      createCliStep.ts           # Update to return new format
      createAiStep.ts            # Update to return new format
      createAgentStep.ts         # Update to return new format
      createArtifactStep.ts      # Update to return new format
      createAnnotationStep.ts    # Update to return new format
      utils/
        executeStep.ts           # Rename input → args
    services/steps/
      updateWorkflowStep.ts      # Rename input → args

  client/pages/projects/workflows/
    types.ts                     # Remove duplicate WorkflowRunStep (lines 77-95)
    components/timeline/
      StepRow.tsx                # Update import
      StepGitRow.tsx             # Update import, display trace
      StepDefaultRow.tsx         # Update import, display trace

prisma/
  schema.prisma                  # Rename input → args, remove log_directory_path
```

### Integration Points

**SDK Package (agentcmd-workflows)**:
- `src/types/steps.ts` - Add TraceEntry, update all result interfaces

**Backend (apps/app)**:
- `src/shared/types/workflow-step.types.ts` - New shared discriminated union
- `src/server/domain/workflow/services/engine/steps/*` - Update all step implementations
- `prisma/schema.prisma` - Schema changes

**Frontend (apps/app)**:
- `src/client/pages/projects/workflows/types.ts` - Remove duplicate type
- `src/client/pages/projects/workflows/components/timeline/*` - Update imports, display trace

## Implementation Details

### 1. SDK TraceEntry Interface

Add `TraceEntry` interface to track command execution across all step types:

**Key Points**:
- `command`: Command executed (e.g., `"git commit"`, `"agent claude"`)
- `output`: Optional command output
- `exitCode`: Optional exit code for CLI/shell commands
- `duration`: Optional execution duration in milliseconds

### 2. Standardized Result Interfaces

Update all step result interfaces to use `{ data, success, error, trace }` structure:

**Key Points**:
- Git/CLI: Wrap current flat results in `data` object
- AI/Agent: Keep `data` wrapper, add `success`, `error`, `trace`
- Remove redundant fields (`operation` from GitStepResult, `commands` replaced by trace)
- All results have uniform structure for consistency

### 3. Shared Discriminated Union

Create `WorkflowRunStep` type combining base DB fields with type-specific fields:

**Key Points**:
- Intersection of `WorkflowRunStepBase` & `WorkflowRunStepTyped`
- Type helpers: `StepArgs<T>`, `StepOutput<T>`
- Type guards: `isGitStep()`, `isAgentStep()`, etc.
- Single source of truth for frontend and backend

### 4. Backend Step Implementations

Update all step creators to return new standardized format:

**Key Points**:
- Convert existing `commands` arrays to `trace` format
- Wrap results in `{ data, success, error, trace }`
- Add duration tracking where applicable
- Ensure all paths return consistent structure

### 5. Frontend Component Updates

Remove duplicate type and update timeline components:

**Key Points**:
- Delete lines 77-95 from `types.ts` (duplicate `WorkflowRunStep`)
- Update component imports to use `@/shared/types/workflow-step.types`
- Add trace display in timeline components
- Use type narrowing for step-specific rendering

## Files to Create/Modify

### New Files (1)

1. `apps/app/src/shared/types/workflow-step.types.ts` - Shared discriminated union type

### Modified Files (19)

1. `packages/agentcmd-workflows/src/types/steps.ts` - Add TraceEntry, update all results
2. `apps/app/prisma/schema.prisma` - Rename input → args, remove log_directory_path
3. `apps/app/src/server/domain/workflow/services/engine/steps/createGitStep.ts` - Return new format
4. `apps/app/src/server/domain/workflow/services/engine/steps/createCliStep.ts` - Return new format
5. `apps/app/src/server/domain/workflow/services/engine/steps/createAiStep.ts` - Return new format
6. `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts` - Return new format
7. `apps/app/src/server/domain/workflow/services/engine/steps/createArtifactStep.ts` - Return new format
8. `apps/app/src/server/domain/workflow/services/engine/steps/createAnnotationStep.ts` - Return new format
9. `apps/app/src/server/domain/workflow/services/engine/steps/utils/executeStep.ts` - Rename input → args
10. `apps/app/src/server/domain/workflow/services/steps/updateWorkflowStep.ts` - Rename input → args
11. `apps/app/src/client/pages/projects/workflows/types.ts` - Remove duplicate WorkflowRunStep
12. `apps/app/src/client/pages/projects/workflows/components/timeline/StepRow.tsx` - Update import
13. `apps/app/src/client/pages/projects/workflows/components/timeline/StepGitRow.tsx` - Update import, add trace display
14. `apps/app/src/client/pages/projects/workflows/components/timeline/StepDefaultRow.tsx` - Update import, add trace display
15. `apps/app/src/server/domain/git/services/commitChanges.ts` - Remove commands return (trace handled in step)
16. `apps/app/src/server/domain/git/services/createAndSwitchBranch.ts` - Remove commands return
17. `apps/app/src/server/domain/git/services/createPullRequest.ts` - Remove commands return
18. `apps/app/src/server/routes/git.ts` - Update to handle simplified git service returns
19. `packages/agentcmd-workflows/package.json` - Rebuild package

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: SDK Types Update

**Phase Complexity**: 14 points (avg 4.7/10)

<!-- prettier-ignore -->
- [x] sdk-1 [4/10] Add TraceEntry interface to SDK
  - Add interface with command, output?, exitCode?, duration? fields
  - File: `packages/agentcmd-workflows/src/types/steps.ts`
  - Export from main index

- [x] sdk-2 [6/10] Update all SDK result interfaces to standardized format
  - Update GitStepResult: wrap in data object, add success/error/trace, remove operation field
  - Update CliStepResult: wrap in data object, add success/error/trace
  - Update AiStepResult: add success/error/trace (already has data)
  - Update AgentStepResult: wrap in data object, add success/error/trace
  - Update ArtifactStepResult: wrap in data object, add success/error/trace
  - Update AnnotationStepResult: add data/success/trace fields
  - File: `packages/agentcmd-workflows/src/types/steps.ts`

- [x] sdk-3 [4/10] Build SDK package
  - Run: `pnpm --filter agentcmd-workflows build`
  - Expected: Clean build with no errors

#### Completion Notes

- Added TraceEntry interface with command, output, exitCode, duration fields
- Updated all 6 result interfaces (Git, CLI, AI, Agent, Artifact, Annotation) to use `{ data, success, error, trace }` structure
- GitStepResult: removed operation field (redundant), wrapped remaining fields in data
- AgentStepResult: wrapped fields in data, renamed extracted field from data → extracted
- Added AnnotationStepResult interface with data: undefined
- Exported TraceEntry and AnnotationStepResult from main index
- SDK builds cleanly with no errors

### Phase 2: Shared Types & Schema

**Phase Complexity**: 17 points (avg 4.3/10)

<!-- prettier-ignore -->
- [x] shared-1 [6/10] Create shared discriminated union type
  - Create WorkflowRunStepBase interface with all DB fields
  - Create WorkflowRunStepTyped discriminated union (8 step types)
  - Export intersection type: WorkflowRunStep = Base & Typed
  - Add type helpers: StepArgs<T>, StepOutput<T>
  - Add type guards: isGitStep, isCliStep, isAiStep, isAgentStep, etc.
  - File: `apps/app/src/shared/types/workflow-step.types.ts` (NEW)

- [x] shared-2 [3/10] Update Prisma schema field names
  - Rename `input` field to `args` in WorkflowRunStep model
  - Update field comment to reflect JSON type
  - File: `apps/app/prisma/schema.prisma`

- [x] shared-3 [2/10] Remove unused log_directory_path field
  - Delete `log_directory_path` field from WorkflowRunStep model
  - File: `apps/app/prisma/schema.prisma`

- [x] shared-4 [6/10] Run prisma reset to apply schema changes
  - Run: `cd apps/app && pnpm prisma:reset`
  - Confirm migration when prompted
  - Expected: Database reset, migrations flattened, schema applied

#### Completion Notes

- Created shared discriminated union type in `workflow-step.types.ts`
- Includes 8 step types: git, cli, ai, agent, artifact, annotation, conditional, loop
- Added type helpers StepArgs<T> and StepOutput<T> for extracting typed args/output
- Added 8 type guard functions (isGitStep, isCliStep, etc.)
- Renamed Prisma field `input` → `args` with JSON type comment
- Removed unused `log_directory_path` field from schema
- Successfully ran prisma:reset - DB reset, migrations flattened, schema applied
- Prisma client regenerated with new schema

### Phase 3: Backend Implementation

**Phase Complexity**: 28 points (avg 4.0/10)

<!-- prettier-ignore -->
- [x] backend-1 [5/10] Update createGitStep to return new format
  - Wrap result in `{ data: { commitSha, branch, ... }, success, trace }`
  - Convert commands array to trace format
  - Remove operation field from output
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createGitStep.ts`

- [x] backend-2 [4/10] Update createCliStep to return new format
  - Wrap result in `{ data: { command, exitCode, stdout, stderr }, success, error, trace }`
  - Add trace with command execution details
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createCliStep.ts`

- [x] backend-3 [4/10] Update createAiStep to return new format
  - Ensure result has `{ data, success, error, trace }` structure
  - Add trace with AI provider/model info
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAiStep.ts`

- [x] backend-4 [5/10] Update createAgentStep to return new format
  - Wrap result in `{ data: { sessionId, output, exitCode, ... }, success, error, trace }`
  - Add trace with agent execution details
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`

- [x] backend-5 [3/10] Update createArtifactStep to return new format
  - Wrap result in `{ data: { count, artifactIds, totalSize }, success, error, trace }`
  - Add trace with artifact upload info
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createArtifactStep.ts`

- [x] backend-6 [3/10] Update createAnnotationStep to return new format
  - Return `{ data: undefined, success, trace }` structure
  - Add trace with annotation message
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAnnotationStep.ts`

- [x] backend-7 [4/10] Update executeStep and updateWorkflowStep
  - Rename all `input` parameters to `args`
  - Update sanitizeJson calls to use `args` instead of `input`
  - Update Prisma update calls to use `args` field
  - Files: `apps/app/src/server/domain/workflow/services/engine/steps/utils/executeStep.ts`, `apps/app/src/server/domain/workflow/services/steps/updateWorkflowStep.ts`

#### Completion Notes

- Updated all 6 step creators (Git, CLI, AI, Agent, Artifact, Annotation) to return new standardized format
- Git: wrapped all operations in `{ data, success, trace }`, removed operation field, converted commands to trace
- CLI: wrapped result with trace including command execution details and duration
- AI: added trace with provider/model info and duration tracking for both text and object generation
- Agent: wrapped AgentExecuteResult in new format with proper field mapping
- Artifact: wrapped result with trace showing artifact upload details
- Annotation: returns `{ data: undefined, success, trace }` format
- Updated executeStep.ts: renamed input → args throughout
- Updated updateWorkflowStep.ts: renamed input → args in interface and implementation
- Updated updateStepStatus.ts: renamed input → args in parameters and WebSocket changes
- Fixed getStepLogs.ts: removed log_directory_path references (logs now in step.output.trace)
- Fixed test-and-fix.ts template: updated to use testResult.data.exitCode/stdout/stderr
- All type checks pass successfully

### Phase 4: Frontend Updates

**Phase Complexity**: 12 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] frontend-1 [2/10] Remove duplicate WorkflowRunStep from frontend types
  - Delete lines 77-95 (WorkflowRunStep interface and StepType)
  - Keep other types in file unchanged
  - File: `apps/app/src/client/pages/projects/workflows/types.ts`

- [x] frontend-2 [4/10] Update timeline components to use shared types
  - Update StepRow.tsx: import from `@/shared/types/workflow-step.types`
  - Update StepGitRow.tsx: import from shared, cast to typed step
  - Update StepDefaultRow.tsx: import from shared
  - Files: `apps/app/src/client/pages/projects/workflows/components/timeline/*.tsx`

- [x] frontend-3 [4/10] Add trace display to timeline components
  - StepGitRow: display output.trace commands if available
  - StepDefaultRow: display step.output.trace with command + duration
  - Format trace as monospace text with durations
  - Files: `apps/app/src/client/pages/projects/workflows/components/timeline/StepGitRow.tsx`, `StepDefaultRow.tsx`

- [x] frontend-4 [2/10] Update any other files importing WorkflowRunStep
  - Search for imports from `@/client/pages/projects/workflows/types`
  - Update to import from `@/shared/types/workflow-step.types` where needed
  - Run: `grep -r "from '@/client/pages/projects/workflows/types'" --include="*.tsx" --include="*.ts" apps/app/src/client`

#### Completion Notes

- Removed duplicate WorkflowRunStep type (lines 77-95) and StepType from frontend types.ts
- Added import and re-export of WorkflowRunStep from shared types in frontend types.ts
- Updated all 3 timeline components (StepRow, StepGitRow, StepDefaultRow) to import directly from shared types
- Added trace display to both StepGitRow and StepDefaultRow with command + duration rendering in monospace
- Updated WorkflowRunStepBase to include all DB fields: inngest_step_id, name, phase, agent_session_id
- Fixed LogsTab to use step.output.trace instead of removed step.logs field
- Fixed StepRow to remove invalid "command" and "system" step types
- Fixed workflowStateUpdates.ts to remove logs field and cast discriminated union updates
- All type checking passes successfully

## Testing Strategy

### Unit Tests

**Existing tests should pass**:
- `createGitStep.test.ts` - Update expectations for new output format
- `createAgentStep.test.ts` - Update expectations for new output format
- Update any tests checking step result structure

### Integration Tests

No new integration tests required - existing workflow execution tests will verify:
- Steps execute and store args/output correctly
- Output format is consistent across step types
- Trace data is captured

### Type Safety Verification

Run TypeScript compiler to verify:
- Discriminated union narrowing works correctly
- Type guards function properly
- Frontend components have correct types

## Success Criteria

- [ ] All SDK result types have `{ data, success, error, trace }` structure
- [ ] TraceEntry interface exported from SDK
- [ ] Shared WorkflowRunStep type with discriminated union created
- [ ] Prisma schema updated: `input` → `args`, `log_directory_path` removed
- [ ] All 6 backend step implementations return new format with trace
- [ ] executeStep and updateWorkflowStep use `args` instead of `input`
- [ ] Frontend duplicate WorkflowRunStep removed (lines 77-95)
- [ ] Timeline components import from shared types
- [ ] Timeline components display trace information
- [ ] Type checking passes with no errors
- [ ] Existing tests updated and passing

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build SDK
cd packages/agentcmd-workflows
pnpm build
# Expected: Clean build with no type errors

# Type checking
cd ../.. && pnpm check-types
# Expected: No type errors across monorepo

# Database migration
cd apps/app && pnpm prisma:generate
# Expected: Prisma client regenerated successfully

# Run tests
pnpm test
# Expected: All tests pass (update test expectations if needed)
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: Workflow run detail page
3. Verify: Timeline displays steps with trace information
4. Check console: No TypeScript errors when hovering over step types
5. Test: Create new workflow run and verify steps execute with new format

**Feature-Specific Checks:**

- In VSCode, hover over `step.output` where `step.step_type === 'git'` - should show `GitStepResult` type
- Check database: `workflow_run_steps` table has `args` column (not `input`)
- Check database: `workflow_run_steps` table does not have `log_directory_path` column
- Inspect step output in DB: should have `{ data, success, error, trace }` structure
- Timeline shows trace commands for completed steps

## Implementation Notes

### 1. Intersection Type Pattern

The `WorkflowRunStep` type uses intersection of base fields and discriminated union:

```typescript
type WorkflowRunStep = WorkflowRunStepBase & WorkflowRunStepTyped;
```

This pattern allows TypeScript to narrow the type based on `step_type` while including all base DB fields. It's more DRY than repeating base fields in each branch.

### 2. Frontend Type Casting

Components should cast to specific step types when needed:

```typescript
if (step.step_type === 'git') {
  const output = step.output as StepOutput<'git'>;
  // Now output.data.commitSha is typed
}
```

### 3. Trace Format Consistency

All trace entries should follow format:
- `command`: Descriptive command name
- `output`: Optional output text (for CLI commands)
- `exitCode`: For CLI/agent steps
- `duration`: In milliseconds

### 4. Backward Compatibility

Existing workflow runs in database will have `input` field. After migration:
- Old runs: `args` will be `null` (acceptable for historical data)
- New runs: `args` will be populated
- No data migration script needed

## Dependencies

- No new package dependencies required
- Requires Prisma migration (handled by `prisma:reset`)
- SDK rebuild required before app compilation

## References

- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [Prisma JSON Fields](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#json)
- Conversation: Discussion on hybrid vs standardized output format

## Next Steps

1. Update SDK types (`packages/agentcmd-workflows/src/types/steps.ts`)
2. Build SDK package
3. Create shared discriminated union type
4. Update Prisma schema and run reset
5. Update all backend step implementations
6. Update frontend components
7. Run type check and verify manually
8. Commit changes with message: "feat: add type-safe workflow step args/output with discriminated unions"

## Review Findings

**Review Date:** 2025-11-12
**Reviewed By:** Claude Code
**Review Iteration:** 1 of 3
**Branch:** feat/step-json-v2
**Commits Reviewed:** 1

### Summary

⚠️ **Implementation is 75% complete.** Phases 1-3 (SDK, backend) implemented correctly with proper type-safe discriminated unions and standardized output format. Phase 4 (frontend updates) not started - frontend still using duplicate `WorkflowRunStep` type and components not updated to display trace information. No HIGH priority issues, but MEDIUM priority issues exist that should be addressed.

### Phase 1: SDK Types Update

**Status:** ✅ Complete - All SDK types updated to standardized format with trace support

### Phase 2: Shared Types & Schema

**Status:** ✅ Complete - Shared discriminated union created, Prisma schema updated successfully

### Phase 3: Backend Implementation

**Status:** ✅ Complete - All 6 step implementations return new format with trace logging

### Phase 4: Frontend Updates

**Status:** ❌ Not implemented - Frontend components not updated

#### MEDIUM Priority

- [ ] **Duplicate WorkflowRunStep type still exists in frontend**
  - **File:** `apps/app/src/client/pages/projects/workflows/types.ts:77-95`
  - **Spec Reference:** "Phase 4, frontend-1: Delete lines 77-95 (WorkflowRunStep interface and StepType)"
  - **Expected:** Duplicate type removed, components import from `@/shared/types/workflow-step.types`
  - **Actual:** Duplicate type still exists at lines 77-95, all 3 timeline components import from this file
  - **Fix:** Delete lines 77-95 from `types.ts`, update 3 component imports (StepRow.tsx:3, StepGitRow.tsx:9, StepDefaultRow.tsx - need to check line)

- [ ] **Timeline components not displaying trace information**
  - **File:** `apps/app/src/client/pages/projects/workflows/components/timeline/StepGitRow.tsx` and `StepDefaultRow.tsx`
  - **Spec Reference:** "Phase 4, frontend-3: Add trace display to timeline components"
  - **Expected:** Components display `step.output.trace` with command execution details and durations
  - **Actual:** No trace display implementation found in components
  - **Fix:** Add trace rendering in both components - display commands with optional durations in monospace format

- [ ] **Frontend components not using type-safe discriminated union**
  - **File:** `apps/app/src/client/pages/projects/workflows/components/timeline/StepGitRow.tsx:9`, `StepRow.tsx:3`, `StepDefaultRow.tsx`
  - **Spec Reference:** "Phase 4, frontend-2: Update timeline components to use shared types"
  - **Expected:** Import `WorkflowRunStep` from `@/shared/types/workflow-step.types`
  - **Actual:** Importing from `@/client/pages/projects/workflows/types`
  - **Fix:** Update 3 import statements to use shared type

### Positive Findings

- ✅ Excellent SDK implementation - all 6 result interfaces properly wrap data in standardized `{ data, success, error, trace }` format
- ✅ TraceEntry interface well-designed with command, output, exitCode, duration fields
- ✅ Shared discriminated union type properly structured with base + typed intersection pattern
- ✅ All 8 type guards implemented (isGitStep, isCliStep, etc.)
- ✅ Backend step implementations consistently return new format with trace logging
- ✅ Prisma schema correctly updated: `input` → `args`, removed `log_directory_path`
- ✅ Type safety maintained throughout backend - no type errors
- ✅ Good separation of concerns - SDK types imported by shared types, which define app-specific extensions

### Review Completion Checklist

- [x] All spec requirements reviewed
- [x] Code quality checked
- [ ] All findings addressed and tested
