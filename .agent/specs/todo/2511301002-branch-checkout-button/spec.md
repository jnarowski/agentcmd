# Branch Checkout Button in Workflow Run Details

**Status**: draft
**Type**: issue
**Created**: 2025-11-30
**Package**: apps/app
**Total Complexity**: 18 points
**Tasks**: 4
**Avg Complexity**: 4.5/10

## Complexity Summary

| Metric          | Value    |
| --------------- | -------- |
| Total Tasks     | 4        |
| Total Points    | 18       |
| Avg Complexity  | 4.5/10   |
| Max Task        | 6/10     |

## Overview

Add a button next to the branch name in the workflow run details tab that automatically commits any uncommitted changes and checks out the workflow run's branch. This improves developer workflow by allowing quick context switching to the branch associated with a specific workflow run.

## User Story

As a developer viewing a workflow run
I want to quickly checkout the associated branch
So that I can inspect the code or continue work without manually finding and switching to the branch

## Technical Approach

Leverage existing git infrastructure to add a simple checkout button in the DetailsTab component. The backend already supports auto-commit + branch switching via `POST /api/git/branch/switch` endpoint, which internally uses `createAndSwitchBranch` service that:

1. Checks for uncommitted changes
2. Auto-commits with message: "Auto-commit before switching to branch {name}"
3. Switches to existing branch or creates it if needed
4. Returns idempotently if already on target branch

Frontend will use existing `useSwitchBranch` mutation hook from git operations, fetch project path via `useProject` hook, and display button with loading/success states matching the existing copy button pattern.

**Key Points**:
- Reuse existing backend endpoint `/api/git/branch/switch` (no new API needed)
- Use existing `useSwitchBranch` mutation hook (no new hook needed)
- Fetch project path via existing `useProject` hook
- Match existing copy button UI pattern (ghost variant, icon-sm size)
- Auto-commit functionality already built into backend service

## Files to Create/Modify

### New Files (0)

None - all required infrastructure exists

### Modified Files (1)

1. `apps/app/src/client/pages/projects/workflows/components/detail-panel/DetailsTab.tsx` - Add checkout button next to branch copy button

## Tasks

**IMPORTANT: Execute every task in order, top to bottom**

- [ ] **task-1** [2/10] Import required dependencies
  - Add `GitBranch`, `Loader2` icons from lucide-react
  - Add `useProject` hook from `@/client/pages/projects/hooks/useProjects`
  - Add `useSwitchBranch` hook from `@/client/pages/projects/git/hooks/useGitOperations`
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/DetailsTab.tsx`

- [ ] **task-2** [4/10] Add state and hooks for checkout functionality
  - Fetch project data: `const { data: project } = useProject(run.project_id)`
  - Get switch mutation: `const switchBranch = useSwitchBranch()`
  - Add state: `const [checkingOut, setCheckingOut] = useState(false)`
  - Add state: `const [checkoutSuccess, setCheckoutSuccess] = useState(false)`
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/DetailsTab.tsx`

- [ ] **task-3** [6/10] Implement checkout handler
  - Create async handler function `handleCheckout`
  - Guard: Return early if no `project?.path` or `run.branch_name`
  - Set loading state: `setCheckingOut(true)`
  - Call mutation: `await switchBranch.mutateAsync({ path: project.path, name: run.branch_name })`
  - Show success: `setCheckoutSuccess(true)` then reset after 2s
  - Handle error in finally block: `setCheckingOut(false)`
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/DetailsTab.tsx`
  - Location: After existing `useCopy` hooks (around line 18)

- [ ] **task-4** [6/10] Add checkout button UI
  - Find branch display section (lines 132-152)
  - Add button after copy button in the `<dd>` flex container
  - Button props: `variant="ghost"`, `size="icon-sm"`, `className="shrink-0"`, `title="Checkout Branch"`
  - Disabled when: `checkingOut || !project?.path`
  - Icon logic: Show `Loader2` (spinning) when checking out, `Check` (green) when success, `GitBranch` otherwise
  - Call `handleCheckout` on click
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/DetailsTab.tsx`
  - Location: Lines 132-152 (branch display section)

## Testing Strategy

### Manual Testing

**Test file**: `apps/app/src/client/pages/projects/workflows/components/detail-panel/DetailsTab.tsx`

**Test cases**:
1. Button appears and is enabled when project path exists
2. Button shows loading spinner during checkout
3. Button shows success checkmark after checkout completes
4. Branch switches successfully with clean working directory
5. Auto-commit creates commit before switching when changes exist
6. Success toast appears: "Switched to branch: {name}"
7. Button disabled when no project path available
8. Already on target branch returns successfully (idempotent)

### Integration Testing

Test with workflow run that has associated branch:
1. Navigate to workflow run detail page
2. Verify branch name displayed in Details tab
3. Click checkout button
4. Verify loading state appears
5. Verify branch switches in git
6. Verify success state and toast
7. Verify git queries refresh (status, branches)

## Success Criteria

- [ ] Checkout button appears next to branch name in Details tab
- [ ] Button shows proper loading/success states
- [ ] Clicking button switches to workflow run branch
- [ ] Auto-commits changes before switching (if any exist)
- [ ] Success toast displays after checkout
- [ ] Button disabled when no project path available
- [ ] No regressions in existing Details tab functionality
- [ ] UI matches existing copy button pattern

## Validation

**Automated:**

```bash
# Type check
cd apps/app
pnpm check-types
# Expected: no errors

# Build
pnpm build
# Expected: successful build
```

**Manual:**

1. Start app: `cd apps/app && pnpm dev`
2. Navigate to: Project > Workflows > Select workflow run
3. Click "Details" tab
4. Verify: Checkout button appears next to branch name
5. Test: Click checkout button
6. Verify: Loading spinner appears
7. Verify: Branch switches successfully
8. Verify: Success toast displays
9. Test edge case: Make uncommitted changes, click checkout
10. Verify: Changes auto-committed before switch
11. Test edge case: Already on target branch, click checkout
12. Verify: Operation completes successfully (idempotent)

## Implementation Notes

### Existing Infrastructure

All backend functionality already exists:
- Endpoint: `POST /api/git/branch/switch` (apps/app/src/server/routes/git.ts:142-190)
- Service: `switchBranch` → calls `createAndSwitchBranch` (apps/app/src/server/domain/git/services/)
- Auto-commit: Built into `createAndSwitchBranch` (lines 43-48)
- Mutation hook: `useSwitchBranch` (apps/app/src/client/pages/projects/git/hooks/useGitOperations.ts:193-215)

### UI Pattern Consistency

Match existing copy button pattern:
- Same variant (`ghost`)
- Same size (`icon-sm`)
- Same positioning (inline after branch name)
- Same feedback pattern (loading → success → idle)
- Same CSS class (`shrink-0`)

### Error Handling

Errors handled by mutation hook:
- Toast displays error message automatically
- No additional error UI needed in component
- Button returns to idle state via finally block

## Dependencies

- No new dependencies (all infrastructure exists)

## References

- Backend endpoint: `apps/app/src/server/routes/git.ts:142-190`
- Backend service: `apps/app/src/server/domain/git/services/createAndSwitchBranch.ts`
- Frontend mutation: `apps/app/src/client/pages/projects/git/hooks/useGitOperations.ts:193-215`
- UI pattern reference: Copy button (DetailsTab.tsx:137-149)
