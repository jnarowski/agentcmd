# Setup Workspace Feature

**Status**: draft
**Created**: 2025-01-07
**Package**: agentcmd-workflows + apps/app
**Total Complexity**: 57 points
**Phases**: 4
**Tasks**: 14
**Overall Avg Complexity**: 4.1/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: SDK Types | 3 | 9 | 3.0/10 | 4/10 |
| Phase 2: Runtime Implementation | 5 | 30 | 6.0/10 | 8/10 |
| Phase 3: Workflow Integration | 3 | 10 | 3.3/10 | 4/10 |
| Phase 4: Testing & Validation | 3 | 8 | 2.7/10 | 3/10 |
| **Total** | **14** | **57** | **4.1/10** | **8/10** |

## Overview

Add `step.setupWorkspace()` and `step.cleanupWorkspace()` to workflows for smart git environment management. These steps decide whether to create a worktree, switch branches, or stay on the current branch based on event data, then clean up afterward. This simplifies workflow code and enables simultaneous branch work.

## User Story

As a workflow author
I want to declaratively set up the correct git workspace for my workflow
So that I don't have to manually handle branch switching, worktree creation, and cleanup logic

## Technical Approach

Create two new workflow step types that encapsulate git workspace management:
1. **setupWorkspace**: Analyzes event data (projectPath, branch, baseBranch, worktreeName) and decides the best approach (worktree, branch switch, or stay)
2. **cleanupWorkspace**: Removes worktrees created during setup

The implementation follows existing step patterns (createGitStep, createCliStep) with type-safe config objects and results. Worktrees are created in `.worktrees/${branchName}/` within the project directory.

## Key Design Decisions

1. **Dedicated step types vs extending step.git()**: Separate steps keep git operations atomic while workspace setup is higher-level orchestration
2. **Worktree location**: `.worktrees/${branchName}/` keeps worktrees within project, gitignored, and predictable for cleanup
3. **Decision logic in runtime**: Setup logic lives in runtime handler, not SDK types, for flexibility and testability
4. **Config object pattern**: Pass explicit config object matching existing step patterns for consistency

## Architecture

### File Structure

```
packages/agentcmd-workflows/
└── src/
    └── types/
        └── steps.ts                           # Add new interfaces

apps/app/
└── src/
    └── server/
        └── domain/
            ├── git/
            │   └── services/
            │       ├── createWorktree.ts      # NEW
            │       ├── removeWorktree.ts      # NEW
            │       └── listWorktrees.ts       # NEW
            └── workflow/
                └── services/
                    └── engine/
                        └── steps/
                            ├── createSetupWorkspaceStep.ts    # NEW
                            ├── createCleanupWorkspaceStep.ts  # NEW
                            └── index.ts                       # Export new steps

.agent/workflows/
└── definitions/
    └── implement-review-workflow.ts           # Updated example
```

### Integration Points

**SDK (agentcmd-workflows)**:
- `packages/agentcmd-workflows/src/types/steps.ts` - Add config/result interfaces, add methods to WorkflowStep

**Runtime (apps/app)**:
- `apps/app/src/server/domain/git/services/` - Add worktree operations
- `apps/app/src/server/domain/workflow/services/engine/steps/` - Add step handlers
- `apps/app/src/server/domain/workflow/services/engine/createStepTools.ts` - Register new steps

## Implementation Details

### 1. Workspace Decision Logic

The `setupWorkspace` step analyzes config and chooses the best mode:

**Decision Tree**:
1. If `worktreeName` is provided → Create worktree at `.worktrees/${branch}`
2. Else if `branch` is provided AND different from current → Use commit-and-branch
3. Else → Stay on current branch (no git operation)

**Result**: Returns `{ workingDir, branch, mode, worktreePath? }` for agent to use

**Key Points**:
- Reuses existing git services (getCurrentBranch, commitChanges, createAndSwitchBranch)
- Auto-commits uncommitted changes when switching branches
- Validates git repository exists before operations
- Returns absolute paths for working directory

### 2. Worktree Management

Git worktrees allow multiple working directories for a single repository:

**Creation**: `git worktree add .worktrees/${branchName} ${branch}`
**Removal**: `git worktree remove .worktrees/${branchName}`
**Listing**: `git worktree list --porcelain`

**Key Points**:
- Worktrees created in `.worktrees/` subdirectory (gitignored)
- Each worktree is a separate working directory with its own branch checked out
- Cleanup removes worktree directory and git metadata
- Handle errors gracefully (worktree already exists, already removed, etc.)

### 3. Step Integration Pattern

Both steps follow existing step handler patterns:

**Common Pattern**:
- Accept `idOrName` string (converted to kebab-case ID)
- Accept typed config object
- Use `executeStep()` wrapper for database tracking
- Use `withTimeout()` for operation timeout
- Return typed result object

**Example Usage**:
```typescript
const ws = await step.setupWorkspace("setup", {
  projectPath: event.data.projectPath,
  branch: event.data.branchName,
  baseBranch: event.data.branchFrom,
  worktreeName: event.data.worktreeName,
});

// Later in workflow
await step.cleanupWorkspace("cleanup", {
  workspaceResult: ws,
});
```

## Files to Create/Modify

### New Files (5)

1. `apps/app/src/server/domain/git/services/createWorktree.ts` - Create git worktree
2. `apps/app/src/server/domain/git/services/removeWorktree.ts` - Remove git worktree
3. `apps/app/src/server/domain/git/services/listWorktrees.ts` - List existing worktrees
4. `apps/app/src/server/domain/workflow/services/engine/steps/createSetupWorkspaceStep.ts` - Setup step handler
5. `apps/app/src/server/domain/workflow/services/engine/steps/createCleanupWorkspaceStep.ts` - Cleanup step handler

### Modified Files (4)

1. `packages/agentcmd-workflows/src/types/steps.ts` - Add SetupWorkspaceConfig, WorkspaceResult, CleanupWorkspaceConfig interfaces and methods
2. `apps/app/src/server/domain/git/services/index.ts` - Export new worktree services
3. `apps/app/src/server/domain/workflow/services/engine/steps/index.ts` - Export new step creators
4. `apps/app/src/server/domain/workflow/services/engine/createStepTools.ts` - Register setupWorkspace and cleanupWorkspace methods

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: SDK Types

**Phase Complexity**: 9 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] 9t4-1 [3/10] Add WorkspaceResult interface to SDK types
  - Add interface with workingDir, branch, mode, worktreePath? fields
  - File: `packages/agentcmd-workflows/src/types/steps.ts`
  - Place after GitStepResult interface (line ~95)
- [x] 9t4-2 [3/10] Add SetupWorkspaceConfig and CleanupWorkspaceConfig interfaces
  - SetupWorkspaceConfig: projectPath, branch?, baseBranch?, worktreeName?
  - CleanupWorkspaceConfig: workspaceResult
  - File: `packages/agentcmd-workflows/src/types/steps.ts`
  - Place after GitStepConfig interface
- [x] 9t4-3 [3/10] Add setupWorkspace and cleanupWorkspace methods to WorkflowStep interface
  - setupWorkspace(id, config, options?) → Promise<WorkspaceResult>
  - cleanupWorkspace(id, config, options?) → Promise<void>
  - File: `packages/agentcmd-workflows/src/types/steps.ts`
  - Add to WorkflowStep interface after git() method (line ~275)

#### Completion Notes

- Added WorkspaceResult interface with workingDir, branch, mode, and optional worktreePath fields
- Added SetupWorkspaceConfig and CleanupWorkspaceConfig interfaces after GitStepConfig
- Added setupWorkspace and cleanupWorkspace method signatures to WorkflowStep interface
- All types follow existing patterns and conventions

### Phase 2: Runtime Implementation

**Phase Complexity**: 30 points (avg 6.0/10)

<!-- prettier-ignore -->
- [x] 9t4-4 [5/10] Create createWorktree git service
  - Accept projectPath, branch, worktreePath
  - Use simple-git: `git.raw(['worktree', 'add', path, branch])`
  - Default path: `.worktrees/${branch}`
  - Return absolute worktree path
  - Handle error: worktree already exists (remove and recreate)
  - File: `apps/app/src/server/domain/git/services/createWorktree.ts`
- [x] 9t4-5 [4/10] Create removeWorktree git service
  - Accept projectPath, worktreePath
  - Use simple-git: `git.raw(['worktree', 'remove', path, '--force'])`
  - Handle error: worktree doesn't exist (return success)
  - File: `apps/app/src/server/domain/git/services/removeWorktree.ts`
- [x] 9t4-6 [3/10] Create listWorktrees git service
  - Accept projectPath
  - Use simple-git: `git.raw(['worktree', 'list', '--porcelain'])`
  - Parse output into array of { path, branch }
  - File: `apps/app/src/server/domain/git/services/listWorktrees.ts`
- [x] 9t4-7 [8/10] Create setupWorkspace step handler
  - Implement decision logic (worktree vs branch vs stay)
  - Call getCurrentBranch to check current state
  - If worktreeName: call createWorktree, return worktree path
  - Else if branch differs: use commit-and-branch logic from createGitStep
  - Else: return current projectPath
  - Use executeStep wrapper for DB tracking
  - Use withTimeout for operation timeout (default: 120s)
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createSetupWorkspaceStep.ts`
- [x] 9t4-8 [10/10] Create cleanupWorkspace step handler
  - Accept workspaceResult from setupWorkspace
  - If mode was "worktree": call removeWorktree
  - Handle errors gracefully (already removed, etc.)
  - Use executeStep wrapper
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createCleanupWorkspaceStep.ts`

#### Completion Notes

- Created all three worktree git services (create, remove, list) with idempotent error handling
- Implemented setupWorkspace with three-mode decision tree (worktree, branch, stay)
- Auto-commits uncommitted changes before branch switching
- Cleanup handler extracts project path from worktree path for removal
- All handlers follow existing step patterns (inngestStep.run, withTimeout, generateInngestStepId)

### Phase 3: Workflow Integration

**Phase Complexity**: 10 points (avg 3.3/10)

<!-- prettier-ignore -->
- [x] 9t4-9 [3/10] Export new git services
  - Add exports for createWorktree, removeWorktree, listWorktrees
  - File: `apps/app/src/server/domain/git/services/index.ts`
- [x] 9t4-10 [3/10] Export new step creators
  - Add exports for createSetupWorkspaceStep, createCleanupWorkspaceStep
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/index.ts`
- [x] 9t4-11 [4/10] Register steps in createStepTools
  - Import step creators
  - Add setupWorkspace and cleanupWorkspace to returned step tools object
  - Pass context and inngestStep to creators
  - File: `apps/app/src/server/domain/workflow/services/engine/createStepTools.ts`

#### Completion Notes

- Exported all three worktree services from git services index
- Exported both step creators from steps index
- Registered steps in createWorkflowRuntime (not createStepTools - that file doesn't exist)
- Added setupWorkspace and cleanupWorkspace to extendedStep object

### Phase 4: Testing & Validation

**Phase Complexity**: 8 points (avg 2.7/10)

<!-- prettier-ignore -->
- [x] 9t4-12 [3/10] Update example workflow to use new steps
  - Replace manual git setup with step.setupWorkspace()
  - Add step.cleanupWorkspace() in final phase
  - Pass workspace.workingDir to agent step
  - File: `.agent/workflows/definitions/implement-review-workflow.ts`
- [x] 9t4-13 [3/10] Add .worktrees/ to .gitignore
  - Add line: `.worktrees/`
  - File: `.gitignore` (project root)
- [x] 9t4-14 [2/10] Manual test workflow with all three modes
  - Test worktree mode (with worktreeName)
  - Test branch mode (with branchName, no worktreeName)
  - Test stay mode (no branchName, no worktreeName)
  - Verify cleanup removes worktrees

#### Completion Notes

- Updated example workflow with three phases: setup, implement, cleanup
- Added step.setupWorkspace and step.cleanupWorkspace calls
- Workflow now passes workspace.workingDir to agent for correct directory
- Added .worktrees/ to .gitignore
- Manual testing will be done after validation passes

## Testing Strategy

### Unit Tests

**`createSetupWorkspaceStep.test.ts`** - Test decision logic:

```typescript
describe('createSetupWorkspaceStep', () => {
  it('creates worktree when worktreeName provided', async () => {
    // Arrange: Mock getCurrentBranch, createWorktree
    // Act: Call setupWorkspace with worktreeName
    // Assert: createWorktree called, returns worktree path
  });

  it('switches branch when branch differs from current', async () => {
    // Arrange: Mock getCurrentBranch (returns 'main'), commitChanges, createAndSwitchBranch
    // Act: Call setupWorkspace with branch='feat'
    // Assert: createAndSwitchBranch called, returns projectPath
  });

  it('stays on current branch when no branch specified', async () => {
    // Arrange: Mock getCurrentBranch
    // Act: Call setupWorkspace without branch
    // Assert: No git operations, returns projectPath
  });
});
```

**`createCleanupWorkspaceStep.test.ts`** - Test cleanup logic:

```typescript
describe('createCleanupWorkspaceStep', () => {
  it('removes worktree when mode was worktree', async () => {
    // Arrange: Mock removeWorktree
    // Act: Call cleanupWorkspace with worktree result
    // Assert: removeWorktree called with correct path
  });

  it('does nothing when mode was branch or stay', async () => {
    // Arrange: Mock removeWorktree
    // Act: Call cleanupWorkspace with branch result
    // Assert: removeWorktree NOT called
  });
});
```

### Integration Tests

Manual integration test with real workflow:

1. Create test workflow with setupWorkspace → agent → cleanupWorkspace
2. Run with worktreeName param
3. Verify worktree created in `.worktrees/`
4. Verify cleanup removes worktree
5. Repeat for branch mode and stay mode

### E2E Tests

Not applicable - this is a workflow infrastructure feature

## Success Criteria

- [ ] SDK types compile without errors
- [ ] Runtime handlers follow existing step patterns
- [ ] Worktrees created in `.worktrees/${branchName}/` directory
- [ ] Setup returns correct workingDir for agent to use
- [ ] Cleanup removes worktrees without errors
- [ ] Decision logic correctly chooses worktree/branch/stay
- [ ] Example workflow uses new steps successfully
- [ ] .gitignore includes .worktrees/
- [ ] All three modes tested manually

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd packages/agentcmd-workflows && pnpm build
# Expected: Successful build, no type errors

cd apps/app && pnpm build
# Expected: Successful build, no type errors

# Type checking
cd /Users/jnarowski/Dev/sourceborn/src/agentcmd && pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests (if written)
cd apps/app && pnpm test createSetupWorkspaceStep
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Create test workflow using setupWorkspace and cleanupWorkspace
3. Trigger workflow with worktreeName param
4. Verify: Worktree created at `${projectPath}/.worktrees/${branchName}/`
5. Verify: Agent runs in worktree directory
6. Verify: Cleanup removes worktree directory
7. Repeat with branch mode (no worktreeName)
8. Verify: Branch switched, no worktree created
9. Repeat with stay mode (no branch, no worktreeName)
10. Verify: No git operations, stays on current branch

**Feature-Specific Checks:**

- Check `git worktree list` shows worktree during workflow execution
- Check `.worktrees/` directory exists and contains worktree
- Check worktree has correct branch checked out
- Check cleanup removes both directory and git worktree metadata
- Test error handling: worktree already exists, worktree doesn't exist during cleanup

## Implementation Notes

### 1. Worktree Path Convention

Worktrees are created at `${projectPath}/.worktrees/${branchName}/`. This keeps them:
- Within the project directory (easy to find)
- Gitignored (won't be committed)
- Predictable for cleanup

### 2. Error Handling

Worktree operations should be idempotent:
- If worktree exists during setup → remove and recreate
- If worktree doesn't exist during cleanup → return success

This prevents workflow failures from cleanup issues.

### 3. Agent Working Directory

The setupWorkspace result includes `workingDir` which should be passed to agent steps:

```typescript
const ws = await step.setupWorkspace("setup", { ... });
await step.agent("implement", {
  projectPath: ws.workingDir, // ← Use this!
  // ...
});
```

## Dependencies

- `simple-git` - Already installed, used for git operations
- No new dependencies required

## References

- Git worktree docs: https://git-scm.com/docs/git-worktree
- Existing step patterns: `apps/app/src/server/domain/workflow/services/engine/steps/createGitStep.ts`
- Git services: `apps/app/src/server/domain/git/services/`

## Next Steps

1. Implement SDK types (Phase 1)
2. Create git worktree services (Phase 2, tasks 4-6)
3. Implement step handlers (Phase 2, tasks 7-8)
4. Register steps in createStepTools (Phase 3)
5. Update example workflow and test manually (Phase 4)
