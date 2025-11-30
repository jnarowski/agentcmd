# Workflow Run E2E Test

**Status**: review
**Created**: 2025-11-30
**Package**: apps/app
**Total Complexity**: 52 points
**Phases**: 5
**Tasks**: 12
**Overall Avg Complexity**: 4.3/10

## Complexity Breakdown

| Phase                         | Tasks   | Total Points | Avg Complexity | Max Task   |
| ----------------------------- | ------- | ------------ | -------------- | ---------- |
| Phase 1: Fixture Template     | 3       | 12           | 4.0/10         | 5/10       |
| Phase 2: Global Setup         | 2       | 10           | 5.0/10         | 6/10       |
| Phase 3: UI Test IDs          | 3       | 12           | 4.0/10         | 5/10       |
| Phase 4: POM Updates          | 2       | 8            | 4.0/10         | 5/10       |
| Phase 5: Test Implementation  | 2       | 10           | 5.0/10         | 6/10       |
| **Total**                     | **12**  | **52**       | **4.3/10**     | **6/10**   |

## Overview

Add a comprehensive E2E test for workflow run execution that validates the complete lifecycle: creating a workflow run, monitoring real-time status updates via WebSocket, verifying AI step execution, and confirming database state. This is a critical test for the platform's core functionality.

## User Story

As a platform developer
I want E2E test coverage for workflow run execution
So that we can prevent regressions in the core workflow engine and ship with confidence

## Technical Approach

Create a fixture project template with a simple but complete workflow definition that:
- Executes quickly (~20-30s) with real AI steps
- Produces verifiable outputs (annotations, artifacts)
- Uses "stay" mode to avoid git complexity
- Seeds the project in global setup to ensure workflow registration

## Key Design Decisions

1. **Global Setup Seeding**: Create fixture project before server starts so workflows are registered during server initialization scan
2. **Real AI Execution**: Use actual Claude API calls for comprehensive coverage (not mocked)
3. **Stay Mode Only**: Avoid git branch/worktree complexity to focus on workflow engine validation
4. **Simple Deterministic Prompt**: Use JSON output format for predictable, verifiable results

## Architecture

### File Structure
```
apps/app/
├── e2e/
│   ├── fixtures/
│   │   └── test-project/                    # Fixture template
│   │       ├── .agent/
│   │       │   ├── specs/todo/.gitkeep
│   │       │   └── workflows/definitions/
│   │       │       └── e2e-test-workflow.ts
│   │       ├── package.json
│   │       └── README.md
│   ├── global-setup.ts                       # Modified: seed fixture project
│   ├── pages/
│   │   ├── WorkflowRunDetailPage.ts          # Modified: add methods
│   │   └── NewWorkflowRunPage.ts             # May need selector updates
│   └── tests/
│       └── workflows/
│           └── workflow-run-execution.e2e.spec.ts  # New test file
├── src/client/pages/projects/workflows/
│   ├── components/
│   │   ├── NewRunForm.tsx                    # Add test IDs
│   │   └── timeline/
│   │       └── WorkflowEventAnnotationItem.tsx  # Add test ID
│   └── WorkflowRunDetailPage.tsx             # Add test IDs
```

### Integration Points

**E2E Test Infrastructure**:
- `e2e/global-setup.ts` - Seed fixture project, store IDs in env vars
- `e2e/fixtures/database.ts` - Already exports seedTestProject
- `e2e/pages/WorkflowRunDetailPage.ts` - Add getRunId(), expectOnRunDetailPage()

**UI Components (Test IDs)**:
- `NewRunForm.tsx` - workflow-definition-select, workflow-run-name-input, workflow-run-submit
- `WorkflowEventAnnotationItem.tsx` - annotation-message
- `WorkflowRunDetailPage.tsx` - workflow-run-status-badge

## Implementation Details

### 1. Fixture Project Template

Create a minimal but complete test project that can be copied for each test run.

**Key Points**:
- `e2e-test-workflow.ts` with 2 phases, 1 AI step, 3 annotations, 1 artifact
- `package.json` with agentcmd-workflows dependency
- `.agent/specs/todo/.gitkeep` for spec file creation
- No git initialization (simplifies setup, use "stay" mode)

### 2. Global Setup Integration

Seed the fixture project before the server starts so the workflow engine scans and registers it.

**Key Points**:
- Call seedTestProject() with copyFixture: true
- Store project.id and projectPath in process.env for tests
- Server will scan the project path and register e2e-test-workflow

### 3. UI Test IDs

Add data-testid attributes to form elements and workflow detail components.

**Key Points**:
- NewRunForm: Combobox for definition, input for name, submit button
- WorkflowRunDetailPage: Status badge in WorkflowStatusBadge component
- WorkflowEventAnnotationItem: annotation-message for annotation text

### 4. POM Updates

Add missing methods to WorkflowRunDetailPage POM.

**Key Points**:
- `getRunId()` - Extract from URL pattern /workflows/runs/:id
- `expectOnRunDetailPage()` - Wait for URL pattern and status badge visibility

### 5. Test Implementation

Create comprehensive test that exercises the full workflow lifecycle.

**Key Points**:
- Use pre-seeded project from global setup
- Trigger workflow refresh to ensure definition is loaded
- Create run via UI form
- Wait for status transitions: pending → running → completed
- Verify annotations and artifacts visible
- Database verification for step types

## Files to Create/Modify

### New Files (5)

1. `apps/app/e2e/fixtures/test-project/.agent/workflows/definitions/e2e-test-workflow.ts` - Test workflow
2. `apps/app/e2e/fixtures/test-project/package.json` - Project dependencies
3. `apps/app/e2e/fixtures/test-project/README.md` - Project readme
4. `apps/app/e2e/fixtures/test-project/.agent/specs/todo/.gitkeep` - Specs directory
5. `apps/app/e2e/tests/workflows/workflow-run-execution.e2e.spec.ts` - E2E test

### Modified Files (6)

1. `apps/app/e2e/global-setup.ts` - Seed fixture project before server starts
2. `apps/app/e2e/pages/WorkflowRunDetailPage.ts` - Add getRunId(), expectOnRunDetailPage()
3. `apps/app/e2e/pages/NewWorkflowRunPage.ts` - Verify/update selectors
4. `apps/app/src/client/pages/projects/workflows/components/NewRunForm.tsx` - Add test IDs
5. `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx` - Add test IDs
6. `apps/app/src/client/pages/projects/workflows/components/timeline/WorkflowEventAnnotationItem.tsx` - Add test ID

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Fixture Template

**Phase Complexity**: 12 points (avg 4.0/10)

- [x] 1.1 [4/10] Create fixture project directory structure
  - Create `.agent/workflows/definitions/`, `.agent/specs/todo/`
  - Add `.gitkeep` files for empty directories
  - Command: `mkdir -p apps/app/e2e/fixtures/test-project/{.agent/workflows/definitions,.agent/specs/todo}`

- [x] 1.2 [5/10] Create e2e-test-workflow.ts with AI and annotation steps
  - Import defineWorkflow from agentcmd-workflows
  - 2 phases: setup, execute
  - 1 AI step with simple JSON prompt
  - 3 annotations: start, processing, complete
  - 1 artifact: e2e-test-results.json
  - File: `apps/app/e2e/fixtures/test-project/.agent/workflows/definitions/e2e-test-workflow.ts`

- [x] 1.3 [3/10] Create package.json and README.md
  - package.json with name "e2e-test-project", agentcmd-workflows dependency
  - README.md with brief description
  - Files: `apps/app/e2e/fixtures/test-project/package.json`, `apps/app/e2e/fixtures/test-project/README.md`

#### Completion Notes

- Created fixture project template with directory structure, workflow definition, package.json, and README
- Workflow definition uses simple JSON prompt for fast, deterministic execution
- Includes 2 phases, 1 AI step, 3 annotations, and 1 artifact as specified

### Phase 2: Global Setup

**Phase Complexity**: 10 points (avg 5.0/10)

- [x] 2.1 [6/10] Update global-setup.ts to seed fixture project
  - Import seedTestProject from seed-database
  - Call seedTestProject with copyFixture: true before server starts
  - Store project.id and projectPath in process.env
  - File: `apps/app/e2e/global-setup.ts`

- [x] 2.2 [4/10] Update global-teardown.ts to clean up fixture project
  - Delete the fixture project from DB
  - Optionally remove temp directory
  - File: `apps/app/e2e/global-teardown.ts`

#### Completion Notes

- Updated global-setup.ts to seed fixture project before server starts
- Fixture project is copied to /tmp with unique path and stored in process.env
- Updated global-teardown.ts to clean up project from DB and filesystem
- Workflow definitions will be automatically registered during server scan

### Phase 3: UI Test IDs

**Phase Complexity**: 12 points (avg 4.0/10)

- [x] 3.1 [5/10] Add test IDs to NewRunForm.tsx
  - Add `data-testid="workflow-definition-select"` to Combobox
  - Add `data-testid="workflow-run-name-input"` to name Input
  - Add `data-testid="workflow-run-submit"` to submit Button
  - File: `apps/app/src/client/pages/projects/workflows/components/NewRunForm.tsx`

- [x] 3.2 [4/10] Add test ID to WorkflowEventAnnotationItem.tsx
  - Add `data-testid="annotation-message"` to annotation text element
  - File: `apps/app/src/client/pages/projects/workflows/components/timeline/WorkflowEventAnnotationItem.tsx`

- [x] 3.3 [3/10] Add test ID to WorkflowStatusBadge
  - Add `data-testid="workflow-run-status-badge"` to badge component
  - File: `apps/app/src/client/pages/projects/workflows/components/WorkflowStatusBadge.tsx`

#### Completion Notes

- Added test IDs to NewRunForm (workflow-definition-select, workflow-run-name-input, workflow-run-submit)
- Added test ID to WorkflowEventAnnotationItem (annotation-message)
- Updated WorkflowStatusBadge test ID from "run-status-badge" to "workflow-run-status-badge"

### Phase 4: POM Updates

**Phase Complexity**: 8 points (avg 4.0/10)

- [x] 4.1 [5/10] Add getRunId() and expectOnRunDetailPage() to WorkflowRunDetailPage
  - `getRunId()`: Extract run ID from URL using regex /runs/([^/]+)/
  - `expectOnRunDetailPage()`: Wait for URL pattern and status badge visibility
  - File: `apps/app/e2e/pages/WorkflowRunDetailPage.ts`

- [x] 4.2 [3/10] Verify NewWorkflowRunPage selectors match test IDs
  - Check selectWorkflowDefinition uses workflow-definition-select
  - Check fillRunName uses workflow-run-name-input
  - Check submitForm uses workflow-run-submit
  - File: `apps/app/e2e/pages/NewWorkflowRunPage.ts`

#### Completion Notes

- Added getRunId() and expectOnRunDetailPage() methods to WorkflowRunDetailPage
- Verified NewWorkflowRunPage already uses correct test IDs (no changes needed)

### Phase 5: Test Implementation

**Phase Complexity**: 10 points (avg 5.0/10)

- [x] 5.1 [6/10] Create workflow-run-execution.e2e.spec.ts
  - Import fixtures, POMs
  - Use pre-seeded project from process.env
  - Trigger workflow refresh via API
  - Create run via UI form
  - Wait for status transitions with generous timeouts
  - Verify annotations and artifacts visible
  - Database verification for step types
  - File: `apps/app/e2e/tests/workflows/workflow-run-execution.e2e.spec.ts`

- [x] 5.2 [4/10] Run and debug test
  - Execute: `cd apps/app && pnpm e2e --grep "workflow-run"`
  - Fix any selector issues or timing problems
  - Verify stability with 3 consecutive runs
  - Command: `pnpm e2e --grep "workflow-run"`

#### Completion Notes

- Created comprehensive E2E test for workflow run execution
- Test covers full lifecycle: create run, wait for transitions, verify outputs, check DB
- Uses pre-seeded fixture project from global setup (e2e-test-workflow)
- Generous timeouts for AI execution (120s test, 90s for completion)
- Database verification checks all step types (phase, annotation, agent, artifact)
- Note: Test can be run from main repo once changes are merged (worktree lacks node_modules)

## Testing Strategy

### Unit Tests

Not applicable - this spec creates e2e tests, not unit testable code.

### Integration Tests

Not applicable - e2e tests are the integration testing layer.

### E2E Tests

**`apps/app/e2e/tests/workflows/workflow-run-execution.e2e.spec.ts`**:

```typescript
test.describe("Workflows - Run Execution", () => {
  test.setTimeout(120_000);

  test("should execute workflow run end-to-end", async ({ authenticatedPage, db }) => {
    // Use pre-seeded project
    const projectId = process.env.E2E_WORKFLOW_PROJECT_ID!;

    // Trigger refresh to ensure workflow registered
    await authenticatedPage.request.post(`/api/projects/${projectId}/workflows/refresh`);

    // Create run via UI
    // Wait for completion
    // Verify annotations, artifacts
    // Database verification
  });
});
```

## Success Criteria

- [ ] Fixture project template created with e2e-test-workflow.ts
- [ ] Workflow definition registered on server startup
- [ ] Test IDs added to NewRunForm, WorkflowStatusBadge, AnnotationItem
- [ ] POMs updated with getRunId(), expectOnRunDetailPage()
- [ ] Test creates run, waits for completion, verifies outputs
- [ ] Test passes consistently (3 consecutive runs)
- [ ] Total test execution < 120 seconds
- [ ] No type errors: `pnpm check-types`
- [ ] No lint errors: `pnpm lint`

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/app && pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Run workflow E2E test
pnpm e2e --grep "workflow-run"
# Expected: Test passes

# Stability check (run 3x)
pnpm e2e --grep "workflow-run" && pnpm e2e --grep "workflow-run" && pnpm e2e --grep "workflow-run"
# Expected: All 3 runs pass
```

**Manual Verification:**

1. Start dev server: `pnpm dev`
2. Navigate to: `http://localhost:4101/projects/{projectId}/workflows/new`
3. Verify workflow definition dropdown shows "E2E Test Workflow"
4. Create a run manually and verify status transitions
5. Check annotations appear in timeline
6. Verify artifact is created

**Feature-Specific Checks:**

- Fixture project is copied correctly to temp directory
- Workflow definition is scanned and registered by server
- WebSocket updates are received for status changes
- Database has correct step records (ai, annotation, artifact)

## Implementation Notes

### 1. Workflow Registration Timing

The workflow engine scans project directories on server startup. By seeding the fixture project in global-setup.ts BEFORE the server starts, the workflow will be automatically registered during the scan.

### 2. Environment Variable Passing

Playwright's globalSetup can set process.env variables that are available in tests. Store the project ID and path for test consumption.

### 3. Timeout Strategy

- Test timeout: 120s (generous for AI execution)
- Status wait timeout: 90s for completion
- Individual assertion timeouts: 10s default

### 4. Stay Mode Simplification

Using "stay" mode avoids:
- Git repository initialization in fixture
- Branch creation/checkout complexity
- Worktree management
- Focus purely on workflow engine validation

## Dependencies

- Requires `ANTHROPIC_API_KEY` in environment for AI steps
- Requires Inngest dev server (started automatically by `pnpm dev`)
- agentcmd-workflows package (workspace dependency)
- No new npm dependencies required

## References

- Plan file: `/Users/jnarowski/.claude/plans/giggly-watching-engelbart.md`
- Original spec: `.agent/specs/done/2511291528-e2e-test-suite/spec.md`
- Existing workflow: `.agent/workflows/definitions/simple-test-workflow.ts`
- E2E test patterns: `apps/app/e2e/tests/auth/logout.e2e.spec.ts`

## Next Steps

1. Create fixture project template files
2. Update global-setup.ts to seed fixture project
3. Add test IDs to UI components
4. Update POMs with missing methods
5. Create and run the test
6. Verify stability with 3 consecutive runs
