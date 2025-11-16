# Project Home Tabs Refactor

**Status**: draft
**Created**: 2025-11-15
**Package**: apps/app
**Total Complexity**: 28 points
**Phases**: 3
**Tasks**: 10
**Overall Avg Complexity**: 2.8/10

## Complexity Breakdown

| Phase                    | Tasks | Total Points | Avg Complexity | Max Task |
| ------------------------ | ----- | ------------ | -------------- | -------- |
| Phase 1: Component Split | 4     | 12           | 3.0/10         | 4/10     |
| Phase 2: Settings API    | 3     | 8            | 2.7/10         | 3/10     |
| Phase 3: Integration     | 3     | 8            | 2.7/10         | 3/10     |
| **Total**                | **10**| **28**       | **2.8/10**     | **4/10** |

## Overview

Refactor ProjectHomePage to use tabbed interface with Activities and Tasks tabs, replacing single Sessions view. Persist active tab selection in user settings for seamless UX across sessions.

## User Story

As a user
I want to see Activities and Tasks in separate tabs on the project home page
So that I can easily switch between viewing recent activity and pending tasks without losing my preference

## Technical Approach

Split ProjectHomePage into three components:
1. ProjectHomeContent - tab container with persisted state
2. ProjectHomeActivities - sessions + workflows combined view
3. ProjectHomeTasks - specs + planning sessions

Use existing settings infrastructure to persist tab selection.

## Key Design Decisions

1. **Component Composition**: Split into three focused components instead of one monolithic page
2. **Local vs Persisted State**: Activities filter (all/sessions/workflows) is local, tab selection is persisted
3. **Settings Key**: Add `project_home_active_tab` to existing userPreferences schema

## Architecture

### File Structure

```
apps/app/src/client/pages/
├── ProjectHomePage.tsx                              # Modified - uses ProjectHomeContent
└── projects/components/
    ├── ProjectHomeContent.tsx                       # New - tab container
    ├── ProjectHomeActivities.tsx                    # New - activities tab
    ├── ProjectHomeTasks.tsx                         # New - tasks tab
    ├── SessionCard.tsx                              # Deleted
    └── WorkflowCard.tsx                             # Deleted
```

### Integration Points

**Frontend Components**:
- `ProjectHomePage.tsx` - Remove sessions logic, add ProjectHomeContent
- `ProjectHomeContent.tsx` - Tab state management with settings
- `ProjectHomeActivities.tsx` - Combined sessions + workflows
- `ProjectHomeTasks.tsx` - Specs + planning sessions

**Settings System**:
- `apps/app/src/server/routes/settings.ts` - Add project_home_active_tab field
- `apps/app/src/client/hooks/useSettings.ts` - Type definition update

## Implementation Details

### 1. ProjectHomeContent Component

Tab container that manages Activities and Tasks tabs with persisted state.

**Key Points**:
- Uses shadcn Tabs component
- Reads active tab from settings.userPreferences.project_home_active_tab
- Updates settings on tab change via useUpdateSettings
- Defaults to "activities" if preference not set

### 2. ProjectHomeActivities Component

Combines sessions and workflow runs in unified table view with local filter.

**Key Points**:
- Fetches sessions via useSessions hook
- Fetches workflow runs via useAllWorkflowRuns hook
- Local filter state (all/sessions/workflows) using ToggleGroup
- Unified Activity interface for both types
- Sorted by created_at descending, limited to 50 items
- Clickable rows navigate to session/workflow detail pages

### 3. ProjectHomeTasks Component

Shows specs and planning sessions in separate sections.

**Key Points**:
- Fetches tasks via useTasks hook
- Fetches all sessions to hydrate planning session details
- Specs section with rescan button
- Planning sessions section with session metadata
- Clickable specs navigate to workflow creation
- Clickable planning sessions navigate to session detail

## Files to Create/Modify

### New Files (3)

1. `apps/app/src/client/pages/projects/components/ProjectHomeContent.tsx` - Tab container
2. `apps/app/src/client/pages/projects/components/ProjectHomeActivities.tsx` - Activities tab
3. `apps/app/src/client/pages/projects/components/ProjectHomeTasks.tsx` - Tasks tab

### Modified Files (3)

1. `apps/app/src/client/pages/ProjectHomePage.tsx` - Use ProjectHomeContent, remove sessions logic
2. `apps/app/src/server/routes/settings.ts` - Add project_home_active_tab to schema
3. `apps/app/src/client/hooks/useSettings.ts` - Add project_home_active_tab to UserPreferences type

### Deleted Files (2)

1. `apps/app/src/client/pages/projects/components/SessionCard.tsx` - No longer used
2. `apps/app/src/client/pages/projects/components/WorkflowCard.tsx` - No longer used

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Component Split

**Phase Complexity**: 12 points (avg 3.0/10)

- [ ] 1.1 [4/10] Create ProjectHomeActivities component
  - Unified Activity interface for sessions + workflows
  - useSessions and useAllWorkflowRuns hooks
  - Local filter state with ToggleGroup (all/sessions/workflows)
  - Table view with Type, Name, Status, Created columns
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeActivities.tsx`

- [ ] 1.2 [3/10] Create ProjectHomeTasks component
  - useTasks and useSessions hooks
  - Specs section with rescan button
  - Planning sessions section with hydrated session data
  - Table views for both sections
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeTasks.tsx`

- [ ] 1.3 [3/10] Create ProjectHomeContent component
  - Tabs component with Activities and Tasks
  - Read project_home_active_tab from useSettings
  - Update settings on tab change via useUpdateSettings
  - Pass projectId to child components
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeContent.tsx`

- [ ] 1.4 [2/10] Delete unused card components
  - Remove SessionCard.tsx
  - Remove WorkflowCard.tsx
  - Files: `apps/app/src/client/pages/projects/components/SessionCard.tsx`, `apps/app/src/client/pages/projects/components/WorkflowCard.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Settings API

**Phase Complexity**: 8 points (avg 2.7/10)

- [ ] 2.1 [3/10] Update settings schema
  - Add project_home_active_tab to userPreferencesSchema
  - Type: z.enum(["activities", "tasks"]).optional()
  - File: `apps/app/src/server/routes/settings.ts:27`

- [ ] 2.2 [3/10] Update UserPreferences type
  - Add project_home_active_tab?: 'activities' | 'tasks'
  - File: `apps/app/src/client/hooks/useSettings.ts:32`

- [ ] 2.3 [2/10] Verify settings endpoint works
  - Test PATCH /api/settings with project_home_active_tab
  - Verify persisted across page refreshes
  - Command: `curl -X PATCH http://localhost:3456/api/settings -H "Content-Type: application/json" -d '{"project_home_active_tab":"tasks"}'`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Integration

**Phase Complexity**: 8 points (avg 2.7/10)

- [ ] 3.1 [3/10] Update ProjectHomePage
  - Remove useSessions import and logic
  - Replace ProjectHomeSessions with ProjectHomeContent
  - Remove Sessions card header/title
  - Update card to "Activities & Tasks"
  - File: `apps/app/src/client/pages/ProjectHomePage.tsx:139-144`

- [ ] 3.2 [3/10] Update desktop header layout
  - Add Star icon indicator for is_starred
  - Add Hidden badge for is_hidden
  - Change Edit button to outline variant
  - Replace MoreVertical icon with ChevronDown
  - File: `apps/app/src/client/pages/ProjectHomePage.tsx:85-131`

- [ ] 3.3 [2/10] Clean up imports
  - Remove unused imports (MoreVertical, MessageSquare, ButtonGroupSeparator)
  - Add Badge import
  - Remove CardHeader, CardTitle imports
  - File: `apps/app/src/client/pages/ProjectHomePage.tsx:1-35`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`apps/app/src/client/pages/projects/components/ProjectHomeContent.test.tsx`** - Tab state management:

```typescript
describe('ProjectHomeContent', () => {
  it('renders Activities tab by default', () => {})
  it('persists tab selection to settings', () => {})
  it('restores tab from settings on mount', () => {})
})
```

**`apps/app/src/client/pages/projects/components/ProjectHomeActivities.test.tsx`** - Activity filtering:

```typescript
describe('ProjectHomeActivities', () => {
  it('shows all activities by default', () => {})
  it('filters to sessions only', () => {})
  it('filters to workflows only', () => {})
  it('combines and sorts by created_at desc', () => {})
})
```

**`apps/app/src/client/pages/projects/components/ProjectHomeTasks.test.tsx`** - Tasks display:

```typescript
describe('ProjectHomeTasks', () => {
  it('shows specs section', () => {})
  it('shows planning sessions section', () => {})
  it('handles rescan mutation', () => {})
})
```

### Integration Tests

Manual verification of tab persistence across page refreshes and navigation.

### E2E Tests

Not required - UI refactor without new user-facing functionality.

## Success Criteria

- [ ] ProjectHomePage shows Activities and Tasks tabs
- [ ] Activities tab shows combined sessions + workflows
- [ ] Tasks tab shows specs + planning sessions
- [ ] Tab selection persists across page refreshes
- [ ] Activities filter (all/sessions/workflows) is local state
- [ ] Clicking activity/task navigates to detail page
- [ ] Desktop header shows star/hidden indicators
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] All existing tests pass

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Linting
pnpm --filter app lint
# Expected: No lint errors

# Build verification
pnpm --filter app build
# Expected: Successful build

# Unit tests (if written)
pnpm --filter app test ProjectHomeContent
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}`
3. Verify: Activities tab is active by default
4. Test: Click Tasks tab, refresh page
5. Verify: Tasks tab is still active (persisted)
6. Test: Click Activities tab, filter to "Sessions"
7. Verify: Filter resets to "All" on refresh (local state)
8. Test: Click session row
9. Verify: Navigates to session detail page
10. Test: Click workflow row in Activities
11. Verify: Navigates to workflow run detail page
12. Test: Click spec in Tasks
13. Verify: Navigates to workflow creation with spec pre-loaded
14. Check console: No errors or warnings

**Feature-Specific Checks:**

- Activities tab shows unified sessions + workflows sorted by date
- Tasks tab shows specs and planning sessions separately
- Tab selection persists in database (check User.settings field)
- Activities filter does NOT persist (always defaults to "all")
- Desktop header shows star icon for favorites
- Desktop header shows "Hidden" badge for archived projects
- All clickable rows have hover state and cursor-pointer

## Implementation Notes

### 1. Activities vs Sessions Naming

Changed from "Sessions" to "Activities" to better represent the combined view of sessions and workflow runs.

### 2. Filter State Differences

- **project_home_active_tab**: Persisted in settings (global preference)
- **activity_filter**: Local component state (resets on mount)

This distinction reflects different user expectations: tab selection is a preference, but filter is a temporary view modification.

### 3. Component Composition Pattern

Follows established pattern of Page → Content → Sections for better separation of concerns and testability.

## Dependencies

No new dependencies required - uses existing:
- shadcn Tabs component
- TanStack Query hooks
- React Router navigation
- date-fns formatting

## References

- `.agent/docs/frontend-patterns.md` - React component patterns
- `apps/app/src/client/CLAUDE.md` - Frontend development guide
- `apps/app/src/server/routes/settings.ts` - Settings API implementation
- `apps/app/src/client/hooks/useSettings.ts` - Settings hook pattern

## Next Steps

1. Review spec for accuracy
2. Run `/cmd:implement-spec 251115173840` to implement
3. Test tab persistence manually
4. Verify activities filter is local
5. Create PR with changes
