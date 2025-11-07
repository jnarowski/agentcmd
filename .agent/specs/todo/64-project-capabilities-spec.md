# Project Capabilities Detection

**Status**: draft
**Created**: 2025-01-07
**Package**: apps/web
**Total Complexity**: 76 points
**Phases**: 3
**Tasks**: 13
**Overall Avg Complexity**: 5.8/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Backend Services & Types | 5 | 26 | 5.2/10 | 7/10 |
| Phase 2: Backend Routes & Error Handling | 3 | 19 | 6.3/10 | 8/10 |
| Phase 3: Frontend Updates | 5 | 31 | 6.2/10 | 8/10 |
| **Total** | **13** | **76** | **5.8/10** | **8/10** |

## Overview

Add runtime capability detection to project endpoint that checks git repository status and workflow SDK installation. This replaces separate API calls with a unified `capabilities` object, improving performance and enabling graceful degradation of git/SDK features in the UI.

## User Story

As a developer using the web app
I want the UI to automatically detect which features my project supports (git, workflow SDK)
So that I see only relevant controls and get helpful warnings when features are unavailable

## Technical Approach

Enhance `GET /api/projects/:id` to include a `capabilities` object with git and workflow SDK detection. All checks use try/catch to prevent loading failures. Git detection uses fast filesystem check (`.git` directory exists), while SDK check reuses existing `checkWorkflowSdk` service. Frontend consumers update to use new nested structure instead of separate API calls.

## Key Design Decisions

1. **`capabilities` object (not `settings`)**: Represents what the project CAN do (runtime detection) vs user preferences (future feature)
2. **snake_case throughout**: Matches existing DB field convention (`is_hidden`, `created_at`) for API consistency
3. **No backward compatibility**: Clean break - remove `current_branch` and `/workflow-sdk/check` endpoint entirely
4. **Fail-safe defaults**: All capability checks wrapped in try/catch - errors logged but never break project loading
5. **Path trimming**: Fix existing bug where paths with trailing spaces cause git failures

## Architecture

### File Structure
```
apps/web/src/
├── server/
│   ├── domain/
│   │   ├── git/services/
│   │   │   ├── isGitRepository.ts        # NEW - fast git detection
│   │   │   └── getCurrentBranch.ts       # EXISTING - reused
│   │   └── project/services/
│   │       ├── getProjectById.ts         # MODIFY - add capabilities
│   │       ├── getAllProjects.ts         # MODIFY - add capabilities
│   │       ├── createProject.ts          # MODIFY - trim path
│   │       ├── updateProject.ts          # MODIFY - trim path
│   │       └── checkWorkflowSdk.ts       # EXISTING - reused
│   ├── routes/
│   │   ├── projects.ts                   # MODIFY - remove SDK endpoint, update schema
│   │   └── git.ts                        # MODIFY - better error handling
│   └── config/
│       └── Configuration.ts              # EXISTING - for env check
├── shared/types/
│   └── project.types.ts                  # MODIFY - add capabilities type
└── client/
    ├── components/
    │   └── ProjectHeader.tsx             # MODIFY - use git capabilities
    ├── layouts/
    │   └── ProjectDetailLayout.tsx       # MODIFY - pass capabilities
    └── pages/projects/
        ├── hooks/
        │   └── useProjects.ts            # MODIFY - remove SDK check hook
        └── components/
            ├── WorkflowSdkInstallDialog.tsx        # MODIFY - accept props
            └── ProjectOnboardingSuggestions.tsx    # MODIFY - accept props
```

### Integration Points

**Project Domain**:
- `getProjectById.ts` - adds capability detection
- `getAllProjects.ts` - adds capability detection
- `createProject.ts` - adds path trimming
- `updateProject.ts` - adds path trimming

**Git Domain**:
- `isGitRepository.ts` - NEW service for detection
- `getCurrentBranch.ts` - called if git initialized

**Routes**:
- `projects.ts` - removes SDK endpoint, updates schema
- `git.ts` - improves error messages (400 not 500)

**Frontend**:
- `ProjectHeader.tsx` - conditionally disables git UI
- `useProjects.ts` - removes separate SDK check
- Onboarding components - accept capabilities as props

## Implementation Details

### 1. Git Repository Detection Service

Fast synchronous check using filesystem to determine if directory is a git repository.

**Key Points**:
- Uses `fs.existsSync(path.join(projectPath, '.git'))` - no git commands
- Returns object with `initialized`, `error`, and `branch` fields
- Calls `getCurrentBranch()` only if `.git` exists
- Wrapped in try/catch - defaults to `{ initialized: false, error: message, branch: null }`

### 2. Project Capabilities Type

New type structure added to shared types for consistent frontend/backend usage.

**Key Points**:
- Nested `capabilities.git` and `capabilities.workflow_sdk` objects
- All fields use `snake_case` to match DB conventions
- Replaces `current_branch` field (breaking change)
- Type exported from `project.types.ts` for reuse

### 3. Enhanced Project Services

Both `getProjectById` and `getAllProjects` enhanced with capability detection.

**Key Points**:
- Call `isGitRepository()` and `checkWorkflowSdk()` in parallel
- Each check wrapped in independent try/catch
- Errors logged but don't prevent project loading
- Build `capabilities` object from results
- Remove `current_branch` field construction

### 4. Frontend Hook Simplification

Remove `useWorkflowSdkCheck()` hook entirely since data now in main project response.

**Key Points**:
- Delete entire hook function (lines 405-453 in `useProjects.ts`)
- Keep `useInstallWorkflowSdk()` mutation for install action
- Update consumers to read from `project.capabilities.workflow_sdk`
- No separate query needed - reduces API calls

### 5. ProjectHeader Git UI

Conditionally disable git-related UI elements when git not initialized.

**Key Points**:
- Accept `gitCapabilities` prop instead of `currentBranch`
- Disable branch selector button if `!gitCapabilities.initialized`
- Show warning tooltip if `gitCapabilities.error` exists
- Disable Git nav item with visual indication (opacity, cursor-not-allowed)
- Use `gitCapabilities.branch` for display

## Files to Create/Modify

### New Files (1)

1. `apps/web/src/server/domain/git/services/isGitRepository.ts` - Git repository detection service

### Modified Files (12)

1. `apps/web/src/shared/types/project.types.ts` - Add `capabilities` type, remove `current_branch`
2. `apps/web/src/server/domain/project/services/getProjectById.ts` - Add capability detection
3. `apps/web/src/server/domain/project/services/getAllProjects.ts` - Add capability detection
4. `apps/web/src/server/domain/project/services/createProject.ts` - Trim project path
5. `apps/web/src/server/domain/project/services/updateProject.ts` - Trim project path
6. `apps/web/src/server/routes/projects.ts` - Remove SDK endpoint, update response schema
7. `apps/web/src/server/routes/git.ts` - Improve error handling (400 not 500)
8. `apps/web/src/client/pages/projects/hooks/useProjects.ts` - Remove `useWorkflowSdkCheck()` hook
9. `apps/web/src/client/pages/projects/components/WorkflowSdkInstallDialog.tsx` - Accept `sdkStatus` prop
10. `apps/web/src/client/pages/projects/components/ProjectOnboardingSuggestions.tsx` - Accept `project` prop
11. `apps/web/src/client/components/ProjectHeader.tsx` - Use git capabilities, disable UI conditionally
12. `apps/web/src/client/layouts/ProjectDetailLayout.tsx` - Pass capabilities to children

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend Services & Types

**Phase Complexity**: 26 points (avg 5.2/10)

<!-- prettier-ignore -->
- [ ] 64.1 [4/10] Create `isGitRepository` service for fast git detection
  - Check if `.git` directory exists using `fs.existsSync`
  - Call `getCurrentBranch()` if git initialized
  - Return `{ initialized: boolean, error: string | null, branch: string | null }`
  - Wrap in try/catch with safe defaults
  - File: `apps/web/src/server/domain/git/services/isGitRepository.ts`
- [ ] 64.2 [5/10] Update project types with `capabilities` object
  - Add `capabilities.git` with `initialized`, `error`, `branch` fields
  - Add `capabilities.workflow_sdk` with `has_package_json`, `installed`, `version` fields
  - Remove `current_branch` field (breaking change)
  - All fields use `snake_case`
  - File: `apps/web/src/shared/types/project.types.ts`
- [ ] 64.3 [7/10] Enhance `getProjectById` with capability detection
  - Import `isGitRepository` and `checkWorkflowSdk` services
  - Call both in parallel
  - Wrap each in try/catch with error logging
  - Build `capabilities` object from results
  - Remove `current_branch` construction
  - File: `apps/web/src/server/domain/project/services/getProjectById.ts`
- [ ] 64.4 [6/10] Enhance `getAllProjects` with capability detection
  - Same logic as `getProjectById` but for array of projects
  - Map over projects and add capabilities to each
  - Handle errors gracefully per project
  - File: `apps/web/src/server/domain/project/services/getAllProjects.ts`
- [ ] 64.5 [4/10] Add path trimming to create/update project services
  - Call `.trim()` on `path` field before saving
  - Prevents trailing/leading whitespace bugs
  - Files: `apps/web/src/server/domain/project/services/createProject.ts`, `apps/web/src/server/domain/project/services/updateProject.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Backend Routes & Error Handling

**Phase Complexity**: 19 points (avg 6.3/10)

<!-- prettier-ignore -->
- [ ] 64.6 [6/10] Update project routes response schema
  - Update Zod schema to include `capabilities` object
  - Remove `current_branch` from schema
  - Ensure schema matches new type structure
  - File: `apps/web/src/server/routes/projects.ts`
- [ ] 64.7 [5/10] Remove `/workflow-sdk/check` endpoint
  - Delete `GET /api/projects/:id/workflow-sdk/check` route handler
  - Data now included in main project response
  - File: `apps/web/src/server/routes/projects.ts`
- [ ] 64.8 [8/10] Improve git routes error handling
  - Change git errors from 500 to 400 (ValidationError)
  - Add specific error messages for "Not a git repository", "Path doesn't exist", "Permission denied"
  - Test with invalid paths to verify error responses
  - File: `apps/web/src/server/routes/git.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Frontend Updates

**Phase Complexity**: 31 points (avg 6.2/10)

<!-- prettier-ignore -->
- [ ] 64.9 [5/10] Remove `useWorkflowSdkCheck` hook from useProjects
  - Delete entire `useWorkflowSdkCheck()` function (lines 405-453)
  - Keep `useInstallWorkflowSdk()` mutation
  - Remove unused imports
  - File: `apps/web/src/client/pages/projects/hooks/useProjects.ts`
- [ ] 64.10 [6/10] Update WorkflowSdkInstallDialog to accept props
  - Remove `useWorkflowSdkCheck(projectId)` call
  - Add prop: `sdkStatus: Project['capabilities']['workflow_sdk']`
  - Use `sdkStatus.installed`, `sdkStatus.has_package_json`, `sdkStatus.version`
  - File: `apps/web/src/client/pages/projects/components/WorkflowSdkInstallDialog.tsx`
- [ ] 64.11 [6/10] Update ProjectOnboardingSuggestions to accept props
  - Remove `useWorkflowSdkCheck(projectId)` call
  - Add prop: `project: Project`
  - Use `project.capabilities.workflow_sdk.installed`
  - Pass `project.capabilities.workflow_sdk` to dialog
  - File: `apps/web/src/client/pages/projects/components/ProjectOnboardingSuggestions.tsx`
- [ ] 64.12 [8/10] Update ProjectHeader with git capabilities
  - Change props to accept `gitCapabilities: Project['capabilities']['git']`
  - Use `gitCapabilities.branch` instead of `currentBranch`
  - Disable branch selector button if `!gitCapabilities.initialized`
  - Show warning tooltip if `gitCapabilities.error` exists
  - Disable Git nav item with visual feedback (opacity: 0.5, cursor-not-allowed)
  - Test UI with non-git project
  - File: `apps/web/src/client/components/ProjectHeader.tsx`
- [ ] 64.13 [6/10] Update ProjectDetailLayout to pass capabilities
  - Pass `project.capabilities.git` to ProjectHeader
  - Pass `project.capabilities.workflow_sdk` to onboarding components
  - Remove `current_branch` references
  - Verify data flows correctly
  - File: `apps/web/src/client/layouts/ProjectDetailLayout.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

No new unit tests required - existing tests will need updates:

**`getProjectById.test.ts`** - Update to verify `capabilities` object returned

**`getAllProjects.test.ts`** - Update to verify `capabilities` in all projects

### Integration Tests

**Manual Integration Testing**:
1. Test with git repository - verify `capabilities.git.initialized: true`
2. Test with non-git directory - verify `capabilities.git.initialized: false`
3. Test with SDK installed - verify `capabilities.workflow_sdk.installed: true`
4. Test with no SDK - verify `capabilities.workflow_sdk.installed: false`
5. Test path with trailing space - verify trimming works

### E2E Tests

**Frontend E2E scenarios**:
1. Load project with git - branch selector enabled
2. Load project without git - branch selector disabled, warning shown
3. Load project with SDK - no onboarding banner
4. Load project without SDK - onboarding banner shown
5. Git operations fail gracefully when not a git repo (400 error)

## Success Criteria

- [ ] `GET /api/projects/:id` returns `capabilities` object with git and workflow_sdk
- [ ] Git detection uses fast filesystem check (no git commands)
- [ ] SDK detection reuses existing `checkWorkflowSdk` service
- [ ] All capability checks wrapped in try/catch - errors never break loading
- [ ] Project paths are trimmed on create/update
- [ ] Git routes return 400 (not 500) for "Not a git repository" errors
- [ ] `/workflow-sdk/check` endpoint removed
- [ ] `useWorkflowSdkCheck` hook removed from frontend
- [ ] ProjectHeader disables git UI when `!capabilities.git.initialized`
- [ ] Onboarding components use capabilities from main project response
- [ ] No TypeScript errors
- [ ] No console errors when loading projects

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web && pnpm check-types
# Expected: No type errors

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors

# Build verification
cd apps/web && pnpm build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{project-id}`
3. Open browser DevTools → Network tab
4. Verify: Only ONE request to `/api/projects/{id}` (no separate SDK check)
5. Check response includes:
   ```json
   {
     "data": {
       "capabilities": {
         "git": { "initialized": true/false, "error": null/string, "branch": string/null },
         "workflow_sdk": { "has_package_json": boolean, "installed": boolean, "version": string/null }
       }
     }
   }
   ```
6. Test with non-git project (create test directory without `.git`):
   - Branch selector should be disabled
   - Warning icon/tooltip should appear
   - Git nav item should be grayed out
7. Test git operations on non-git project:
   - POST `/api/git/branches` should return 400 (not 500)
   - Error message should be clear: "Not a git repository"
8. Check console: No errors or warnings

**Feature-Specific Checks:**

- Verify path trimming: Create project with trailing space, verify no git errors
- Verify error resilience: Delete `.git` directory, reload page, verify project still loads
- Verify SDK check works: Install/uninstall SDK, verify detection updates
- Verify branch display: Switch branches, verify `capabilities.git.branch` updates

## Implementation Notes

### 1. Breaking Changes

This is a breaking change that removes:
- `project.current_branch` field (use `project.capabilities.git.branch`)
- `GET /api/projects/:id/workflow-sdk/check` endpoint (data in main response)
- `useWorkflowSdkCheck()` hook (use project data directly)

Frontend and backend must be deployed together.

### 2. Error Handling Pattern

All capability checks follow this pattern:
```typescript
try {
  const result = await checkCapability();
  return result;
} catch (error) {
  logger.error({ err: error, context }, 'Capability check failed');
  return safeDefault; // Never throw
}
```

This ensures one failing check doesn't break project loading.

### 3. Performance Considerations

Git check is very fast (< 1ms) since it only checks for `.git` directory existence. SDK check is slightly slower (reads package.json) but still negligible. Total overhead per project: ~5-10ms.

## Dependencies

- No new dependencies required
- Uses existing `fs` (Node.js built-in)
- Reuses `checkWorkflowSdk` service
- Reuses `getCurrentBranch` service

## References

- Error handling improvements: apps/web/src/server/index.ts (lines 292-336)
- Current git status route: apps/web/src/server/routes/git.ts
- Current SDK check service: apps/web/src/server/domain/project/services/checkWorkflowSdk.ts
- Project types: apps/web/src/shared/types/project.types.ts

## Next Steps

1. Start with Phase 1 (backend services & types)
2. Test backend changes with Postman/curl before moving to frontend
3. Complete Phase 2 (routes & error handling)
4. Test error scenarios (non-git, permission errors)
5. Complete Phase 3 (frontend updates)
6. Test UI with various project configurations
7. Verify no regressions in existing functionality
