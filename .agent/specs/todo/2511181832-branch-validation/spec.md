# Git Branch Validation for NewRunForm

**Status**: draft
**Created**: 2025-11-18
**Package**: apps/app
**Total Complexity**: 26 points
**Phases**: 3
**Tasks**: 8
**Overall Avg Complexity**: 3.3/10

## Complexity Breakdown

| Phase                    | Tasks | Total Points | Avg Complexity | Max Task |
| ------------------------ | ----- | ------------ | -------------- | -------- |
| Phase 1: Backend API     | 3     | 11           | 3.7/10         | 5/10     |
| Phase 2: Frontend Hook   | 2     | 7            | 3.5/10         | 4/10     |
| Phase 3: Form Integration| 3     | 8            | 2.7/10         | 4/10     |
| **Total**                | **8** | **26**       | **3.3/10**     | **5/10** |

## Overview

Add real-time git branch name validation to the NewRunForm component to prevent users from creating workflow runs with branch names that already exist. Validates both the new branch name and optional base branch before form submission.

## User Story

As a workflow user
I want to see immediate feedback when I type a branch name that already exists
So that I can choose a unique branch name before submitting the form and avoid workflow creation errors

## Technical Approach

Add a new validation endpoint at `POST /api/projects/:id/validate-branch` that accepts a branch name and optional base branch, then checks the git repository for existence. Create a debounced frontend hook that calls this endpoint as the user types, providing real-time validation feedback in the form.

## Key Design Decisions

1. **Project-scoped endpoint**: Use `/api/projects/:id/validate-branch` instead of `/api/git/validate-branch` because NewRunForm only has `projectId` (not path) and follows existing pattern of `/api/projects/:id/branches`
2. **Debounced validation**: 500ms debounce prevents excessive API calls while typing, balancing responsiveness with server load
3. **onChange trigger**: Validate automatically as user types (after debounce) rather than onBlur for better UX and immediate feedback

## Architecture

### File Structure

```
apps/app/src/
├── server/
│   ├── routes/
│   │   └── projects.ts                    # Add validation endpoint
│   └── domain/
│       └── git/services/
│           ├── validateBranch.ts          # New service
│           └── types/
│               └── ValidateBranchOptions.ts  # New type
└── client/
    └── pages/projects/workflows/
        ├── hooks/
        │   └── useBranchValidation.ts     # New hook
        └── components/
            └── NewRunForm.tsx              # Integrate validation
```

### Integration Points

**Backend Routes**:
- `apps/app/src/server/routes/projects.ts` - Add `POST /api/projects/:id/validate-branch` endpoint

**Git Services**:
- `apps/app/src/server/domain/git/services/validateBranch.ts` - New validation service
- `apps/app/src/server/domain/git/services/getBranches.ts` - Reuse for fetching branches

**Frontend**:
- `apps/app/src/client/pages/projects/workflows/hooks/useBranchValidation.ts` - New validation hook
- `apps/app/src/client/pages/projects/workflows/components/NewRunForm.tsx` - Integrate validation UI

## Implementation Details

### 1. Validation Service

Create a new git service that validates branch names against the repository's existing branches.

**Key Points**:
- Reuses `getBranches` service to fetch current branches
- Validates branch name format using regex `/^[a-zA-Z0-9_/.-]+$/`
- Checks if `branchName` exists in branch list
- Optionally validates `baseBranch` exists if provided
- Returns structured validation result with specific error messages

### 2. Projects API Endpoint

Add a new endpoint to the projects router that validates branch names for a specific project.

**Key Points**:
- Authenticated endpoint (requires JWT)
- Looks up project by ID and gets path
- Delegates validation to `validateBranch` service
- Returns Zod-validated response
- Handles not-found project errors

### 3. React Validation Hook

Create a custom React hook that debounces API calls and manages validation state.

**Key Points**:
- Uses `useEffect` to trigger on `branchName` or `baseBranch` change
- 500ms debounce to prevent excessive API calls
- Only validates when `branchName` is non-empty
- Returns loading state, validation results, and error messages
- Uses TanStack Query for caching and request deduplication

### 4. Form UI Integration

Update NewRunForm to display validation feedback inline with the branch name input.

**Key Points**:
- Shows spinner while validating
- Displays error message if branch exists
- Disables submit button while validating or if validation fails
- Keeps existing client-side validation as fallback
- Only validates when mode is 'branch' or 'worktree'

## Files to Create/Modify

### New Files (3)

1. `apps/app/src/server/domain/git/services/validateBranch.ts` - Validation service
2. `apps/app/src/server/domain/git/types/ValidateBranchOptions.ts` - Type definition
3. `apps/app/src/client/pages/projects/workflows/hooks/useBranchValidation.ts` - React hook

### Modified Files (2)

1. `apps/app/src/server/routes/projects.ts` - Add validation endpoint
2. `apps/app/src/client/pages/projects/workflows/components/NewRunForm.tsx` - Integrate validation

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend API

**Phase Complexity**: 11 points (avg 3.7/10)

- [ ] 1.1 [3/10] Create `ValidateBranchOptions` type
  - Define interface with `projectPath`, `branchName`, and optional `baseBranch`
  - File: `apps/app/src/server/domain/git/types/ValidateBranchOptions.ts`
  - Follow pattern from `GetBranchesOptions.ts`

- [ ] 1.2 [5/10] Create `validateBranch` service
  - Export `validateBranch({ projectPath, branchName, baseBranch? })` function
  - Call `getBranches({ projectPath })` to fetch current branches
  - Validate branch name format with regex `/^[a-zA-Z0-9_/.-]+$/`
  - Check if `branchName` exists in branch list
  - If `baseBranch` provided, check it exists
  - Return `{ valid: boolean, branchExists: boolean, baseBranchExists?: boolean, error?: string }`
  - File: `apps/app/src/server/domain/git/services/validateBranch.ts`
  - Add JSDoc comments

- [ ] 1.3 [3/10] Add validation endpoint to projects router
  - Add `POST /api/projects/:id/validate-branch` route
  - Request schema: `{ branchName: z.string(), baseBranch: z.string().optional() }`
  - Response schema: `{ valid: boolean, branchExists: boolean, baseBranchExists: z.boolean().optional(), error: z.string().optional() }`
  - Add `preHandler: fastify.authenticate`
  - Look up project by ID, handle 404 if not found
  - Call `validateBranch({ projectPath: project.path, branchName, baseBranch })`
  - File: `apps/app/src/server/routes/projects.ts` (after `/api/projects/:id/branches` endpoint)

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Frontend Hook

**Phase Complexity**: 7 points (avg 3.5/10)

- [ ] 2.1 [4/10] Create `useBranchValidation` hook
  - Export `useBranchValidation(projectId: string, branchName: string, baseBranch?: string)`
  - Use `useState` for validation state: `{ isValidating, branchExists, baseBranchExists, error }`
  - Use `useEffect` with dependencies `[projectId, branchName, baseBranch]`
  - Debounce API call by 500ms using `setTimeout`
  - Only validate when `branchName` is non-empty (length > 0)
  - Call `POST /api/projects/:id/validate-branch` via `api.post`
  - Update state with validation results
  - Clean up timeout on unmount
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useBranchValidation.ts`

- [ ] 2.2 [3/10] Add TypeScript types for validation response
  - Define `BranchValidationResult` interface
  - Match backend response schema
  - Export from hook file for reuse
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useBranchValidation.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Form Integration

**Phase Complexity**: 8 points (avg 2.7/10)

- [ ] 3.1 [4/10] Integrate validation hook into NewRunForm
  - Import `useBranchValidation` hook
  - Call hook: `const validation = useBranchValidation(projectId, branchName, baseBranch)`
  - Only call when `mode === 'branch' || mode === 'worktree'`
  - File: `apps/app/src/client/pages/projects/workflows/components/NewRunForm.tsx`

- [ ] 3.2 [2/10] Add validation UI feedback
  - Show spinner in branch name input when `validation.isValidating` is true
  - Display inline error below input when `validation.branchExists` is true
  - Error message: "Branch already exists. Please choose a different name."
  - Use existing error styling pattern (text-xs text-red-600)
  - File: `apps/app/src/client/pages/projects/workflows/components/NewRunForm.tsx` (lines 605-614 for branch mode, 683-692 for worktree mode)

- [ ] 3.3 [2/10] Update submit button validation
  - Disable submit when `validation.isValidating` is true
  - Prevent submit when `validation.branchExists` is true
  - Keep existing client-side validation (lines 280-286) as fallback
  - File: `apps/app/src/client/pages/projects/workflows/components/NewRunForm.tsx` (line 787 disabled condition)

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

**`apps/app/src/server/domain/git/services/validateBranch.test.ts`** - Validates branch validation logic:

```typescript
describe('validateBranch', () => {
  it('should return branchExists=true when branch exists', async () => {
    // Mock getBranches to return branches including 'feature-1'
    const result = await validateBranch({
      projectPath: '/test',
      branchName: 'feature-1'
    });
    expect(result.branchExists).toBe(true);
    expect(result.valid).toBe(false);
  });

  it('should return branchExists=false when branch does not exist', async () => {
    // Mock getBranches to return branches NOT including 'new-feature'
    const result = await validateBranch({
      projectPath: '/test',
      branchName: 'new-feature'
    });
    expect(result.branchExists).toBe(false);
    expect(result.valid).toBe(true);
  });

  it('should validate branch name format', async () => {
    const result = await validateBranch({
      projectPath: '/test',
      branchName: 'invalid branch!'
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid branch name');
  });

  it('should validate base branch exists when provided', async () => {
    const result = await validateBranch({
      projectPath: '/test',
      branchName: 'new-feature',
      baseBranch: 'nonexistent'
    });
    expect(result.baseBranchExists).toBe(false);
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests

**`apps/app/src/server/routes/projects.test.ts`** - Test validation endpoint:

```typescript
describe('POST /api/projects/:id/validate-branch', () => {
  it('should return branchExists=true for existing branch', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/validate-branch`,
      headers: injectAuth(user.id, user.email, app),
      payload: { branchName: 'main' }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.branchExists).toBe(true);
  });

  it('should return 404 for nonexistent project', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/nonexistent/validate-branch',
      headers: injectAuth(user.id, user.email, app),
      payload: { branchName: 'test' }
    });

    expect(response.statusCode).toBe(404);
  });
});
```

### Manual Tests

1. Start app and navigate to workflow form
2. Select "Create a Branch" mode
3. Type existing branch name (e.g., "main")
4. Verify error appears after 500ms
5. Change to unique name, verify error clears

## Success Criteria

- [ ] Validation endpoint returns correct results for existing/non-existing branches
- [ ] Validation endpoint validates branch name format
- [ ] Validation endpoint checks base branch existence when provided
- [ ] Frontend hook debounces API calls by 500ms
- [ ] Validation error displays inline when branch exists
- [ ] Submit button disabled while validating
- [ ] Submit button disabled when branch exists
- [ ] Existing client-side validation still works
- [ ] No validation when mode is 'stay'
- [ ] TypeScript compiles without errors
- [ ] All tests pass

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests
pnpm test apps/app/src/server/domain/git/services/validateBranch.test.ts
# Expected: All tests pass

# Integration tests
pnpm test apps/app/src/server/routes/projects.test.ts
# Expected: All validation endpoint tests pass

# Build verification
pnpm build
# Expected: Successful build
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: Project → Workflows → New Run
3. Select workflow definition
4. Select "Create a Branch" mode
5. Type existing branch name (e.g., "main")
6. Verify: Error message appears after ~500ms: "Branch already exists..."
7. Verify: Submit button is disabled
8. Type unique branch name
9. Verify: Error clears, submit button enabled
10. Check browser console: No errors or warnings

**Feature-Specific Checks:**

- Debounce works: No API calls until 500ms after typing stops
- Validation skipped when mode is "Stay in Current Branch"
- Base branch validation: Error if base branch doesn't exist
- Format validation: Invalid characters show format error
- Loading state: Spinner visible while validating
- Multiple rapid changes: Only validates final value after debounce

## Implementation Notes

### 1. Debounce Pattern

Use `useEffect` cleanup to cancel pending timeout:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    validate();
  }, 500);

  return () => clearTimeout(timer);
}, [branchName, baseBranch]);
```

### 2. Conditional Validation

Only validate when necessary to avoid unnecessary API calls:

```typescript
// Skip if empty or mode is 'stay'
if (!branchName || mode === 'stay') return;
```

### 3. Error Message Consistency

Use same error message format as existing validation (line 283-286):

```typescript
{validation.branchExists && (
  <p className="text-xs text-red-600 dark:text-red-400">
    Branch already exists. Please choose a different name.
  </p>
)}
```

## Dependencies

- No new dependencies required
- Reuses existing `simple-git` for git operations
- Uses existing `api` client utility for HTTP requests
- Follows existing Zod schema validation patterns

## References

- Existing validation pattern: `apps/app/src/server/domain/session/services/validateSessionOwnership.ts`
- Existing git service: `apps/app/src/server/domain/git/services/getBranches.ts`
- Existing projects endpoint: `apps/app/src/server/routes/projects.ts` (lines 177-214)
- Frontend hooks pattern: `apps/app/src/client/pages/projects/workflows/hooks/`

## Next Steps

1. Create `ValidateBranchOptions` type definition
2. Implement `validateBranch` service with unit tests
3. Add validation endpoint to projects router
4. Create `useBranchValidation` React hook
5. Integrate validation into NewRunForm component
6. Test manually with existing and new branch names
7. Verify debounce behavior and loading states
