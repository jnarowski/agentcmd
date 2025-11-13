# Test Suite Optimization

**Status**: draft
**Created**: 2025-11-13
**Package**: apps/app
**Total Complexity**: 46 points
**Phases**: 3
**Tasks**: 17
**Overall Avg Complexity**: 2.7/10

## Complexity Breakdown

| Phase                               | Tasks   | Total Points | Avg Complexity | Max Task |
| ----------------------------------- | ------- | ------------ | -------------- | -------- |
| Phase 1: Create Workflow Fixtures   | 3       | 8            | 2.7/10         | 4/10     |
| Phase 2: Migrate to Shared Fixtures | 4       | 14           | 3.5/10         | 5/10     |
| Phase 3: Remove Redundant Tests     | 10      | 24           | 2.4/10         | 3/10     |
| **Total**                           | **17**  | **46**       | **2.7/10**     | **5/10** |

## Overview

Optimize test suite by creating shared workflow fixtures and removing redundant tests. This reduces maintenance burden, improves test readability, and eliminates ~1600 lines of duplicative test code while maintaining meaningful coverage.

## User Story

As a developer
I want a maintainable test suite with minimal redundancy
So that tests are easier to read, update, and reason about without sacrificing coverage

## Technical Approach

Three-phase optimization:
1. Create reusable workflow fixtures to eliminate 160+ inline DB creations
2. Migrate all tests to use shared fixtures
3. Remove ~1600 lines of redundant tests (duplicate auth checks, string conversion tests, edge cases)

## Key Design Decisions

1. **Fixture-first approach**: All test data creation goes through fixtures for consistency and maintainability
2. **Conservative test removal**: Only remove truly redundant tests (duplicate auth, ownership, string conversion utilities tested through integration)
3. **Focus on maintainability**: Reduce cognitive load by consolidating setup patterns and removing duplicate validation

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

## Testing Strategy

### Unit Tests

No new test files needed - this is optimization of existing tests.

### Verification

After each phase, run test suite to verify:
- All tests still pass
- No regression in coverage
- Test code is more maintainable and readable

## Success Criteria

- [ ] All existing tests still pass after optimization
- [ ] Zero loss of meaningful test coverage
- [ ] All inline DB creation replaced with fixtures (160+ replacements)
- [ ] ~1600 lines of redundant tests removed
- [ ] No new test failures introduced
- [ ] Test code is more maintainable (fixtures centralized, less duplication)

## Validation

Execute these commands to verify the optimization works correctly:

**Automated Verification:**

```bash
# Run full test suite
pnpm test
# Expected: All tests pass

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

1. After Phase 1: Run tests, verify all pass with new fixtures
2. After Phase 2: Run tests, verify all pass after migration
3. After Phase 3: Run tests, verify all pass after removals
4. Verify fixtures: All workflow tests use createTestWorkflowContext or createTestWorkflowRun
5. Verify cleanup: Test files are more readable and maintainable

**Feature-Specific Checks:**

- Grep for remaining inline creations: `grep -r "prisma.workflowRun.create" --include="*.test.ts"` should find 0 in workflow domain tests
- Count lines removed: Verify ~1600 lines removed across test files
- Fixture usage: All workflow tests use shared fixtures from test-utils/fixtures/

## Implementation Notes

### 1. Preserve Test Semantics

When removing tests, ensure we're not removing the only test for a specific behavior. If a test is the sole coverage for a code path, keep it even if it seems redundant.

### 2. Fixture Design Philosophy

Fixtures should:
- Provide sensible defaults for all required fields
- Accept full override capability via optional parameter
- Return the created entity (not void)
- Follow naming convention: `createTest{Entity}(prisma, overrides?)`

### 3. Line Number Accuracy

Line numbers for removals are approximate (based on current file state). If files have changed since analysis, use the description to find the correct test blocks rather than relying solely on line numbers.

## Dependencies

- Vitest (already installed)
- Prisma client (already installed)
- No new dependencies required

## References

- Existing fixture patterns: `apps/app/src/server/test-utils/fixtures/`
- Prisma testing best practices: https://www.prisma.io/docs/orm/prisma-client/testing

## Next Steps

1. Begin Phase 1: Create workflow fixtures
2. Verify fixtures work with a sample test
3. Proceed through phases sequentially
4. Verify all tests pass and coverage is maintained
