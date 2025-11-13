# Test Suite Optimization

**Status**: draft
**Created**: 2025-11-13
**Package**: apps/app
**Total Complexity**: 58 points
**Phases**: 4
**Tasks**: 21
**Overall Avg Complexity**: 2.8/10

## Complexity Breakdown

| Phase                               | Tasks   | Total Points | Avg Complexity | Max Task |
| ----------------------------------- | ------- | ------------ | -------------- | -------- |
| Phase 1: Create Workflow Fixtures   | 3       | 8            | 2.7/10         | 4/10     |
| Phase 2: Migrate to Shared Fixtures | 4       | 14           | 3.5/10         | 5/10     |
| Phase 3: Remove Redundant Tests     | 10      | 24           | 2.4/10         | 3/10     |
| Phase 4: Enable Parallel Execution  | 4       | 12           | 3.0/10         | 4/10     |
| **Total**                           | **21**  | **58**       | **2.8/10**     | **5/10** |

## Overview

Optimize test suite by creating shared fixtures, removing redundant tests, and enabling parallel execution. Combined with in-memory DB (already completed), this will reduce test suite runtime by 60-80% while maintaining coverage and improving maintainability.

## User Story

As a developer
I want a fast-running test suite with minimal redundancy
So that I get quick feedback during development without sacrificing coverage

## Technical Approach

Four-phase optimization:
1. Create reusable workflow fixtures to eliminate 160+ inline DB creations
2. Migrate all tests to use shared fixtures
3. Remove ~1600 lines of redundant tests (duplicate auth checks, string conversion tests, edge cases)
4. Enable Vitest concurrent execution for independent test blocks

## Key Design Decisions

1. **In-memory DB already completed**: User migrated from `file:./test-temp.db` to `file::memory:?cache=shared` - provides 30-50% speed boost
2. **Fixture-first approach**: All test data creation goes through fixtures for consistency and maintainability
3. **Conservative test removal**: Only remove truly redundant tests (duplicate auth, ownership, string conversion utilities tested through integration)
4. **Selective parallelization**: Use `describe.concurrent` only for independent tests, keep sequential where state is shared

## Architecture

### File Structure

```
apps/app/src/server/
├── test-utils/
│   ├── fixtures/
│   │   ├── index.ts              # Barrel exports (update)
│   │   ├── user.ts               # ✅ Existing
│   │   ├── project.ts            # ✅ Existing
│   │   ├── session.ts            # ✅ Existing
│   │   ├── workflow-definition.ts # ✅ Existing
│   │   └── workflow.ts           # 🆕 NEW - workflow runs + context
│   └── ...
├── domain/
│   └── workflow/
│       └── services/
│           └── engine/
│               ├── steps/*.test.ts        # Modify (7 files)
│               ├── steps/utils/*.test.ts  # Modify (3 files)
│               └── *.test.ts              # Modify (4 files)
└── routes/
    ├── sessions.test.ts         # Remove ~300 lines
    ├── workflows.test.ts        # Remove ~400 lines
    ├── auth.test.ts             # Remove ~50 lines
    └── projects.test.ts         # Remove ~50 lines
```

### Integration Points

**Test Fixtures**:
- `fixtures/workflow.ts` - New fixture file for workflow runs and context
- `fixtures/index.ts` - Add barrel exports

**Workflow Domain Tests** (17 files):
- Replace 77 `prisma.workflowRun.create()` calls
- Replace 39 `prisma.user.create()` calls
- Replace 46 `prisma.project.create()` calls
- Remove 700 lines of string conversion tests

**Route Tests** (5 files):
- Remove 700 lines of redundant auth/ownership tests
- Add `describe.concurrent` for CRUD operations

**Session/Project Tests** (4 files):
- Remove 480 lines of edge cases and race condition tests
- Add `describe.concurrent` where safe

## Implementation Details

### 1. Workflow Fixtures

Create two new fixtures in `test-utils/fixtures/workflow.ts`:

**`createTestWorkflowRun(prisma, options)`**:
- Creates a workflow run with sensible defaults
- Accepts overrides for project_id, user_id, workflow_definition_id, status, etc.
- Returns created WorkflowRun

**`createTestWorkflowContext(prisma, options)`**:
- One-shot fixture that creates user, project, workflow definition, and run
- Returns `{ user, project, workflow, run }` object
- Reduces typical test setup from 40+ lines to 1-2 lines

**Key Points**:
- Follow existing fixture patterns (see user.ts, project.ts)
- Use PrismaClient parameter for consistency
- Provide sensible defaults, allow full override flexibility
- Export from barrel file (fixtures/index.ts)

### 2. Fixture Migration

Replace inline `prisma.*.create()` calls with fixture calls throughout workflow domain tests:

**Pattern replacement**:
```typescript
// BEFORE (40+ lines)
const user = await prisma.user.create({
  data: { email: "test@example.com", password_hash: "hash" }
});
const project = await prisma.project.create({
  data: { name: "Test", path: "/tmp/test" }
});
const workflow = await prisma.workflowDefinition.create({
  data: { project_id: project.id, name: "test", ... }
});
const run = await prisma.workflowRun.create({
  data: { project_id: project.id, user_id: user.id, ... }
});

// AFTER (1 line)
const { user, project, workflow, run } = await createTestWorkflowContext(prisma);
```

**Key Points**:
- Update all 17 workflow domain test files
- Use `createTestWorkflowRun()` when only run is needed
- Use `createTestWorkflowContext()` when full setup is needed
- Route tests already use fixtures - no changes needed there

### 3. Test Removal Strategy

Remove three categories of redundant tests:

**Category A: Duplicate Auth Tests** (700 lines across route tests):
- Currently: Every route endpoint has 401/403 test
- Problem: Auth plugin already tested, duplicated 8+ times
- Solution: Keep 1 example auth test per file, remove all others

**Category B: String Conversion Tests** (700 lines across workflow steps):
- Currently: Every step test file tests kebab-case/sentence-case conversion
- Problem: Testing `toId()` utility through integration layer
- Solution: Remove conversion tests from step files (utility already tested separately)

**Category C: Edge Cases & Race Conditions** (480 lines in session/project tests):
- Currently: Tests for Prisma constraints, timing edge cases, concurrent operations
- Problem: Low value tests of infrastructure vs business logic
- Solution: Remove race condition tests, Prisma constraint tests, redundant validation

**Key Points**:
- Focus on removing tests that don't test actual business logic
- Keep all tests that verify core functionality
- No loss of meaningful coverage

### 4. Parallel Execution

Enable Vitest's concurrent mode for independent test blocks:

**Pattern**:
```typescript
// Wrap independent tests
describe.concurrent('CRUD operations', () => {
  it('creates resource', async () => { ... });
  it('updates resource', async () => { ... });
  it('deletes resource', async () => { ... });
});

// Keep sequential when tests share state
describe('Stateful operations', () => {
  let sharedState;
  beforeEach(() => { sharedState = setup(); });
  it('test 1', () => { /* uses sharedState */ });
  it('test 2', () => { /* uses sharedState */ });
});
```

**Key Points**:
- Only use concurrent for truly independent tests
- Route tests: Good candidate (each test isolated via cleanTestDB)
- Step tests: Good candidate (heavy mocking, no shared state)
- Be cautious with in-memory DB tests that might collide

## Files to Create/Modify

### New Files (1)

1. `apps/app/src/server/test-utils/fixtures/workflow.ts` - Workflow run and context fixtures

### Modified Files (26)

1. `apps/app/src/server/test-utils/fixtures/index.ts` - Add workflow fixture exports
2. `apps/app/src/server/routes/sessions.test.ts` - Remove ~300 lines of redundant tests
3. `apps/app/src/server/routes/workflows.test.ts` - Remove ~400 lines of redundant tests
4. `apps/app/src/server/routes/auth.test.ts` - Remove ~50 lines of duplicate auth tests
5. `apps/app/src/server/routes/projects.test.ts` - Remove ~50 lines of duplicate auth tests
6. `apps/app/src/server/routes/workflow-definitions.test.ts` - Add concurrent execution
7. `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.test.ts` - Migrate fixtures + remove string tests
8. `apps/app/src/server/domain/workflow/services/engine/steps/createCliStep.test.ts` - Migrate fixtures + remove string tests
9. `apps/app/src/server/domain/workflow/services/engine/steps/createGitStep.test.ts` - Migrate fixtures + remove string tests
10. `apps/app/src/server/domain/workflow/services/engine/steps/createArtifactStep.test.ts` - Migrate fixtures + remove string tests
11. `apps/app/src/server/domain/workflow/services/engine/steps/createAnnotationStep.test.ts` - Migrate fixtures + remove string tests
12. `apps/app/src/server/domain/workflow/services/engine/steps/createPhaseStep.test.ts` - Migrate fixtures + remove string tests
13. `apps/app/src/server/domain/workflow/services/engine/steps/createRunStep.test.ts` - Migrate fixtures + remove string tests
14. `apps/app/src/server/domain/workflow/services/engine/steps/utils/executeStep.test.ts` - Migrate fixtures
15. `apps/app/src/server/domain/workflow/services/engine/steps/utils/findOrCreateStep.test.ts` - Migrate fixtures
16. `apps/app/src/server/domain/workflow/services/engine/steps/utils/updateStepStatus.test.ts` - Migrate fixtures
17. `apps/app/src/server/domain/workflow/services/engine/createWorkflowRuntime.test.ts` - Migrate fixtures
18. `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.test.ts` - Migrate fixtures
19. `apps/app/src/server/domain/workflow/services/engine/scanGlobalWorkflows.test.ts` - Migrate fixtures
20. `apps/app/src/server/domain/workflow/services/workflow/executeWorkflow.test.ts` - Migrate fixtures
21. `apps/app/src/server/domain/session/services/syncProjectSessions.test.ts` - Remove ~250 lines edge cases
22. `apps/app/src/server/domain/session/services/getSessionById.test.ts` - Remove ~80 lines redundant tests
23. `apps/app/src/server/domain/project/services/createProject.test.ts` - Remove ~150 lines edge cases
24. `apps/app/src/server/domain/session/services/validateSessionOwnership.test.ts` - Remove redundant validations
25. `apps/app/vitest.global-setup.ts` - Already updated (in-memory DB)
26. `apps/app/src/server/domain/session/services/parseJSONLFile.ts` - Add concurrent where applicable

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Create Workflow Fixtures

**Phase Complexity**: 8 points (avg 2.7/10)

- [ ] 1.1 [3/10] Create workflow fixture file
  - Create `apps/app/src/server/test-utils/fixtures/workflow.ts`
  - Import PrismaClient, WorkflowStatus types
  - Set up file structure with JSDoc comments

- [ ] 1.2 [4/10] Implement createTestWorkflowRun fixture
  - Accept prisma client and overrides parameter
  - Provide defaults for all required fields (project_id, user_id, workflow_definition_id, name, args, status)
  - Return created WorkflowRun from DB
  - Follow pattern from createTestSession and createTestProject

- [ ] 1.3 [1/10] Implement createTestWorkflowContext fixture
  - Call createTestUser, createTestProject, createTestWorkflowDefinition, createTestWorkflowRun in sequence
  - Return object with `{ user, project, workflow, run }`
  - Add JSDoc explaining this is convenience fixture for full setup

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Migrate to Shared Fixtures

**Phase Complexity**: 14 points (avg 3.5/10)

- [ ] 2.1 [2/10] Update fixture barrel export
  - Edit `apps/app/src/server/test-utils/fixtures/index.ts`
  - Add exports for createTestWorkflowRun and createTestWorkflowContext
  - File: `apps/app/src/server/test-utils/fixtures/index.ts`

- [ ] 2.2 [5/10] Migrate workflow step tests (7 files)
  - Replace inline user/project/workflow/run creation with fixture calls
  - Use createTestWorkflowContext where full setup needed
  - Use createTestWorkflowRun where only run needed
  - Files: All 7 files in `apps/app/src/server/domain/workflow/services/engine/steps/*.test.ts`

- [ ] 2.3 [4/10] Migrate workflow engine tests (7 files)
  - Replace inline DB creation with fixtures
  - Files: `steps/utils/*.test.ts` (3 files), `engine/*.test.ts` (4 files)

- [ ] 2.4 [3/10] Migrate route workflow tests
  - Replace 5 inline user.create calls in workflows.test.ts with createTestUser
  - File: `apps/app/src/server/routes/workflows.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Remove Redundant Tests

**Phase Complexity**: 24 points (avg 2.4/10)

- [ ] 3.1 [3/10] Remove duplicate auth tests from sessions.test.ts
  - Remove lines 45-54, 188-197, 298-305, 377-384, 524-533, 634-641, 762-769, 833-840 (8 duplicate 401 tests)
  - Keep one example 401 test at the top of the file
  - File: `apps/app/src/server/routes/sessions.test.ts`

- [ ] 3.2 [3/10] Remove duplicate ownership tests from sessions.test.ts
  - Remove lines 349-373, 603-630, 732-757, 805-829 (4 duplicate ownership validation tests)
  - Remove lines 884-956 (entire "Concurrent Operations" describe block)
  - File: `apps/app/src/server/routes/sessions.test.ts`

- [ ] 3.3 [3/10] Remove duplicate auth tests from workflows.test.ts
  - Remove lines 50-65, 148-155, 393-400, 503-510, 650-657, 797-804 (6 duplicate 401 tests)
  - Keep one example 401 test
  - File: `apps/app/src/server/routes/workflows.test.ts`

- [ ] 3.4 [3/10] Remove duplicate ownership tests from workflows.test.ts
  - Remove lines 330-389, 455-499, 590-634, 737-781, 886-930 (5 duplicate 403 tests)
  - Remove lines 945-1071 (entire "State Transition Tests" block)
  - File: `apps/app/src/server/routes/workflows.test.ts`

- [ ] 3.5 [2/10] Remove duplicate auth tests from other route files
  - Remove duplicate 401/403 tests from auth.test.ts and projects.test.ts
  - Keep 1 example per file
  - Files: `apps/app/src/server/routes/auth.test.ts`, `apps/app/src/server/routes/projects.test.ts`

- [ ] 3.6 [2/10] Remove string conversion tests from workflow step files (7 files)
  - Remove tests that verify kebab-case/sentence-case conversion of idOrName parameter
  - These test the toId() utility function through integration layer
  - Typically ~70-100 lines per file
  - Files: All 7 `createXStep.test.ts` files

- [ ] 3.7 [2/10] Remove edge case tests from syncProjectSessions.test.ts
  - Remove lines 129-162 (duplicate session test)
  - Remove lines 203-228 (timestamp diff edge case)
  - Remove lines 290-314 (race condition test)
  - Remove lines 417-448 (Prisma unique constraint test)
  - Remove lines 450-471 (concurrent sync test)
  - File: `apps/app/src/server/domain/session/services/syncProjectSessions.test.ts`

- [ ] 3.8 [2/10] Remove permission_mode flag tests from syncProjectSessions.test.ts
  - Remove lines 503-524, 526-547, 549-569 (3 simple flag mapping tests)
  - File: `apps/app/src/server/domain/session/services/syncProjectSessions.test.ts`

- [ ] 3.9 [2/10] Remove redundant tests from getSessionById.test.ts
  - Remove lines 65-90 (wrong project ID test)
  - Remove lines 92-114 (wrong user ID test)
  - Remove lines 116-148 (redundant field validation)
  - File: `apps/app/src/server/domain/session/services/getSessionById.test.ts`

- [ ] 3.10 [2/10] Remove edge case tests from createProject.test.ts
  - Remove lines 84-139 (concurrent creation test)
  - Remove lines 141-174 (timestamp validation test)
  - Remove lines 281-309 (empty name test)
  - Remove lines 311-339 (empty path test)
  - File: `apps/app/src/server/domain/project/services/createProject.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Enable Parallel Execution

**Phase Complexity**: 12 points (avg 3.0/10)

- [ ] 4.1 [3/10] Add concurrent execution to route tests
  - Wrap CRUD operation tests in `describe.concurrent()` blocks
  - Keep auth tests sequential (single example per file)
  - Files: sessions.test.ts, workflows.test.ts, projects.test.ts, workflow-definitions.test.ts, auth.test.ts

- [ ] 4.2 [3/10] Add concurrent execution to workflow step tests
  - Wrap independent test cases in `describe.concurrent()` blocks
  - Heavy mocking makes these safe for parallelization
  - Files: All 7 `createXStep.test.ts` files

- [ ] 4.3 [3/10] Add concurrent execution to workflow engine tests
  - Wrap independent tests in concurrent blocks
  - Files: createWorkflowRuntime.test.ts, initializeWorkflowEngine.test.ts, scanGlobalWorkflows.test.ts, executeWorkflow.test.ts

- [ ] 4.4 [3/10] Add concurrent execution to session/project service tests
  - Be conservative - only parallelize truly independent tests
  - Skip if tests share state or have side effects
  - Files: syncProjectSessions.test.ts, getSessionById.test.ts, createProject.test.ts, validateSessionOwnership.test.ts

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

No new test files needed - this is optimization of existing tests.

### Verification

After each phase, run test suite to verify:
- All tests still pass
- No regression in coverage
- Execution time improves

### Performance Benchmarks

Baseline (before optimization):
- Current test execution time: ~XX seconds (measure before starting)

Expected after each phase:
- Phase 1 complete: ~5% faster (reduced DB calls)
- Phase 2 complete: ~10% faster (all fixtures migrated)
- Phase 3 complete: ~30% faster (20% fewer tests + less execution)
- Phase 4 complete: ~60-80% faster (parallel execution + in-memory DB)

## Success Criteria

- [ ] All existing tests still pass after optimization
- [ ] Test suite runs 60-80% faster than baseline
- [ ] Zero loss of meaningful test coverage
- [ ] All inline DB creation replaced with fixtures (160+ replacements)
- [ ] ~1600 lines of redundant tests removed
- [ ] Concurrent execution enabled for independent tests
- [ ] No new test failures or flakiness introduced
- [ ] Test code is more maintainable (fixtures centralized)

## Validation

Execute these commands to verify the optimization works correctly:

**Automated Verification:**

```bash
# Run full test suite (measure time)
pnpm test
# Expected: All tests pass, runtime 60-80% faster than baseline

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Run tests with coverage
pnpm test --coverage
# Expected: Coverage percentage unchanged or improved
```

**Manual Verification:**

1. Measure baseline: Run `pnpm test` before starting, note execution time
2. After Phase 1: Run tests, verify ~5% improvement
3. After Phase 2: Run tests, verify ~10% improvement
4. After Phase 3: Run tests, verify ~30% improvement
5. After Phase 4: Run tests, verify ~60-80% improvement
6. Check logs: No flaky tests or race conditions
7. Verify fixtures: All workflow tests use createTestWorkflowContext or createTestWorkflowRun

**Feature-Specific Checks:**

- Grep for remaining inline creations: `grep -r "prisma.workflowRun.create" --include="*.test.ts"` should find 0 in workflow tests
- Count test files: Verify line counts reduced by ~1600 total
- Check for concurrent blocks: Verify `describe.concurrent` added to appropriate files
- In-memory DB: Verify `vitest.global-setup.ts` uses `file::memory:?cache=shared`

## Implementation Notes

### 1. Preserve Test Semantics

When removing tests, ensure we're not removing the only test for a specific behavior. If a test is the sole coverage for a code path, keep it even if it seems redundant.

### 2. Be Conservative with Concurrent

Not all tests can safely run in parallel. Skip concurrent execution if:
- Tests modify shared database state in ways that could collide
- Tests have timing dependencies
- Tests share module-level variables
- Unsure if tests are truly independent

### 3. Fixture Design Philosophy

Fixtures should:
- Provide sensible defaults for all required fields
- Accept full override capability via optional parameter
- Return the created entity (not void)
- Follow naming convention: `createTest{Entity}(prisma, overrides?)`

### 4. Line Number Accuracy

Line numbers for removals are approximate (based on current file state). If files have changed since analysis, use the description to find the correct test blocks rather than relying solely on line numbers.

## Dependencies

- Vitest (already installed)
- Prisma client (already installed)
- No new dependencies required

## References

- Vitest concurrent mode: https://vitest.dev/api/#test-concurrent
- SQLite in-memory mode: https://www.sqlite.org/inmemorydb.html
- Existing fixture patterns: `apps/app/src/server/test-utils/fixtures/`

## Next Steps

1. Measure baseline test execution time (run `time pnpm test`)
2. Begin Phase 1: Create workflow fixtures
3. Verify fixtures work with a sample test
4. Proceed through phases sequentially
5. Measure final test execution time and document improvement
