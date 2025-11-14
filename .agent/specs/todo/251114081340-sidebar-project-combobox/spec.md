# Sidebar Project Combobox

**Status**: draft
**Created**: 2025-11-14
**Package**: apps/app
**Total Complexity**: 52 points
**Phases**: 3
**Tasks**: 12
**Overall Avg Complexity**: 4.3/10

## Complexity Breakdown

| Phase                    | Tasks | Total Points | Avg Complexity | Max Task |
| ------------------------ | ----- | ------------ | -------------- | -------- |
| Phase 1: Combobox UI     | 4     | 18           | 4.5/10         | 6/10     |
| Phase 2: Sidebar Cleanup | 5     | 21           | 4.2/10         | 6/10     |
| Phase 3: Settings Sync   | 3     | 13           | 4.3/10         | 5/10     |
| **Total**                | **12** | **52**      | **4.3/10**     | **6/10** |

## Overview

Replace sidebar's three-tab structure (Projects/Activities/Tasks) with a cleaner two-tab layout (Activities/Tasks) by adding a project selector combobox above the tabs. The combobox provides unified project switching and filtering while reducing UI complexity and removing the redundant filter button.

## User Story

As a user
I want to quickly switch between projects and see filtered activities/tasks
So that I can focus on a specific project's work without manual filtering steps

## Technical Approach

Leverage existing `Combobox` component to create a project selector that:
1. Syncs bidirectionally with URL navigation (`activeProjectId`)
2. Replaces both the Projects tab and filter button
3. Provides inline star/unstar actions
4. Auto-filters Activities and Tasks tabs based on selection

Key strategy: Reuse existing query patterns (`active_project_filter` → `activeProjectId`) but drive filtering from combobox selection instead of separate filter toggle.

## Key Design Decisions

1. **Combobox-driven filtering**: Selection directly updates `activeProjectId` → triggers navigation → filters automatically (no separate filter button)
2. **Mutually exclusive sections**: "Favorites" and "All" sections show non-overlapping projects (All = non-favorited only)
3. **Inline star action**: Star icon in each row for quick favoriting without leaving combobox
4. **Settings migration**: Remove deprecated `active_project_filter` and `projects_view` settings, rely on `activeProjectId` from navigation

## Architecture

### File Structure

```
apps/app/src/client/
├── components/sidebar/
│   ├── ProjectCombobox.tsx          # NEW - Main combobox component
│   ├── SidebarTabs.tsx               # MODIFY - Remove Projects tab, filter button
│   ├── NavProjects.tsx               # DELETE - Logic migrated to ProjectCombobox
│   ├── NavActivities.tsx             # MODIFY - Simplify filter logic
│   └── NavTasks.tsx                  # MODIFY - Simplify filter logic
├── stores/
│   └── navigationStore.ts            # READ ONLY - Already provides activeProjectId
└── hooks/
    └── useSettings.ts                # READ ONLY - Settings management
```

### Integration Points

**Navigation System**:
- `navigationStore.ts` - Read `activeProjectId`, call `setActiveProject()`
- Router navigation - Navigate to `/projects` or `/projects/:id` on selection

**Settings Management**:
- `useSettings()` - Read `sidebar_active_tab` (still needed for Activities/Tasks)
- `useUpdateSettings()` - Remove `active_project_filter`, `projects_view` from schema

**Data Queries**:
- `useProjects()` - Fetch projects with `is_starred`, `is_hidden`
- `useToggleProjectStarred()` - Optimistic star/unstar updates
- `useSessions()`, `useAllWorkflowRuns()`, `useTasks()` - Already support project filtering

## Implementation Details

### 1. ProjectCombobox Component

Type-safe combobox with custom rendering for project selection and inline star actions.

**Key Points**:
- Use existing `Combobox<Project>` from `components/ui/combobox.tsx`
- Trigger displays "Show all" or selected project name
- Sections: "Show all" item (top) → "Favorites" group (if any) → "All" group (non-favorited)
- Star icon on right side of each row (stops propagation on click)
- Footer: "+ New Project" button
- On selection: Navigate via `router.push()`, update `navigationStore`

**Structure**:
```tsx
<Combobox<Project>
  value={selectedProject}
  onChange={handleProjectSelect}
  options={comboboxOptions}
  renderTrigger={(selected) => selected?.name || "Show all"}
  renderOption={(project) => (
    <div className="flex items-center justify-between">
      <span>{project.name}</span>
      <IconButton onClick={(e) => { e.stopPropagation(); toggleStar(); }}>
        {project.is_starred ? <StarFilledIcon /> : <StarIcon />}
      </IconButton>
    </div>
  )}
/>
```

### 2. Sidebar Layout Changes

Remove Projects tab, reposition combobox above remaining tabs, eliminate filter button.

**Key Points**:
- Combobox placed in `SidebarTabs` before `<Tabs>` component
- Remove `TabsTrigger` for Projects
- Remove filter button logic (no longer needed)
- Keep Activities and Tasks tabs with their existing view filters (all/sessions/workflows for Activities)

### 3. Settings Migration

Clean up deprecated settings from user preferences schema.

**Key Points**:
- Remove `active_project_filter` (replaced by `activeProjectId` from navigation)
- Remove `projects_view` (replaced by combobox sections)
- Keep `sidebar_active_tab` but change type to `"activities" | "tasks"`
- Keep `activity_filter` ("all" | "sessions" | "workflows")

## Files to Create/Modify

### New Files (1)

1. `apps/app/src/client/components/sidebar/ProjectCombobox.tsx` - Project selector with inline star actions

### Modified Files (4)

1. `apps/app/src/client/components/sidebar/SidebarTabs.tsx` - Remove Projects tab and filter button, add ProjectCombobox
2. `apps/app/src/client/components/sidebar/NavActivities.tsx` - Simplify filter logic (remove `active_project_filter` checks)
3. `apps/app/src/client/components/sidebar/NavTasks.tsx` - Simplify filter logic
4. `apps/app/src/shared/types/settings.types.ts` - Update UserPreferences type

### Deleted Files (1)

1. `apps/app/src/client/components/sidebar/NavProjects.tsx` - Logic migrated to ProjectCombobox

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Combobox UI

**Phase Complexity**: 18 points (avg 4.5/10)

- [ ] 1.1 [4/10] Create ProjectCombobox component with basic structure
  - Implement combobox with "Show all" default option
  - Read projects from `useProjects()` query
  - File: `apps/app/src/client/components/sidebar/ProjectCombobox.tsx`
  - Render trigger text based on `activeProjectId` from `navigationStore`

- [ ] 1.2 [6/10] Add sectioned project list (Favorites/All)
  - Implement section logic: "Favorites" (starred projects), "All" (non-starred)
  - Use `CommandGroup` with labels for visual separation
  - File: `apps/app/src/client/components/sidebar/ProjectCombobox.tsx`
  - Conditionally render "Favorites" section only if starred projects exist

- [ ] 1.3 [5/10] Add inline star action with optimistic updates
  - Render star icon (right-aligned) in each project row
  - Use `useToggleProjectStarred()` mutation with optimistic update
  - File: `apps/app/src/client/components/sidebar/ProjectCombobox.tsx`
  - Stop event propagation on star click to prevent selection

- [ ] 1.4 [3/10] Add "+ New Project" footer button
  - Render footer item in combobox dropdown
  - Navigate to `/projects/new` or show create modal on click
  - File: `apps/app/src/client/components/sidebar/ProjectCombobox.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Sidebar Cleanup

**Phase Complexity**: 21 points (avg 4.2/10)

- [ ] 2.1 [6/10] Integrate ProjectCombobox into SidebarTabs
  - Import and render ProjectCombobox above `<Tabs>` component
  - File: `apps/app/src/client/components/sidebar/SidebarTabs.tsx`
  - Remove filter button component and related state

- [ ] 2.2 [5/10] Remove Projects tab from SidebarTabs
  - Delete Projects `TabsTrigger` and `TabsContent`
  - File: `apps/app/src/client/components/sidebar/SidebarTabs.tsx`
  - Update tab switching logic to handle only Activities/Tasks

- [ ] 2.3 [3/10] Delete NavProjects component
  - Remove file (logic now in ProjectCombobox)
  - File: `apps/app/src/client/components/sidebar/NavProjects.tsx`
  - Verify no remaining imports in other files

- [ ] 2.4 [4/10] Simplify NavActivities filter logic
  - Remove `active_project_filter` setting checks
  - File: `apps/app/src/client/components/sidebar/NavActivities.tsx`
  - Use only `activeProjectId` from navigationStore for filtering

- [ ] 2.5 [3/10] Simplify NavTasks filter logic
  - Remove `active_project_filter` setting checks
  - File: `apps/app/src/client/components/sidebar/NavTasks.tsx`
  - Use only `activeProjectId` from navigationStore for filtering

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Settings Sync

**Phase Complexity**: 13 points (avg 4.3/10)

- [ ] 3.1 [5/10] Update UserPreferences type and schema
  - Remove `active_project_filter` and `projects_view` fields
  - File: `apps/app/src/shared/types/settings.types.ts`
  - Update `sidebar_active_tab` type to `"activities" | "tasks"`

- [ ] 3.2 [4/10] Handle combobox selection and navigation
  - Implement `handleProjectSelect` to navigate and update `navigationStore`
  - File: `apps/app/src/client/components/sidebar/ProjectCombobox.tsx`
  - "Show all" → navigate to `/projects`, clear `activeProjectId`
  - Project selection → navigate to `/projects/:id`, set `activeProjectId`

- [ ] 3.3 [4/10] Add bidirectional sync between URL and combobox
  - Read `activeProjectId` from navigationStore
  - File: `apps/app/src/client/components/sidebar/ProjectCombobox.tsx`
  - Update combobox value when URL changes (useEffect with activeProjectId dependency)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`ProjectCombobox.test.tsx`** - Test component rendering and interactions:

```tsx
describe('ProjectCombobox', () => {
  it('renders "Show all" when no project selected', () => {});
  it('renders project name when project selected', () => {});
  it('sections projects into Favorites and All', () => {});
  it('hides Favorites section when no starred projects', () => {});
  it('toggles star on click without selecting project', () => {});
  it('navigates on project selection', () => {});
  it('syncs with activeProjectId changes', () => {});
});
```

### Integration Tests

Test full sidebar behavior with combobox-driven filtering:
- Select project → Activities/Tasks filter automatically
- Star project → Moves between sections immediately
- "Show all" → Clears filters, shows all activities/tasks
- Direct URL navigation → Combobox updates correctly

### E2E Tests

**`sidebar-navigation.e2e.test.ts`** - Test full user flows:

```typescript
test('project selection filters sidebar', async () => {
  // Open combobox, select project
  // Verify Activities tab shows only that project's sessions
  // Verify Tasks tab shows only that project's specs
});

test('star action reorganizes combobox', async () => {
  // Star non-favorited project
  // Verify it moves to Favorites section
  // Unstar and verify it moves back to All section
});
```

## Success Criteria

- [ ] Combobox displays "Show all" on `/projects` page
- [ ] Combobox displays selected project name on `/projects/:id` pages
- [ ] Star/unstar immediately reorganizes sections (optimistic update)
- [ ] "Favorites" section only appears when starred projects exist
- [ ] "All" section shows only non-favorited projects
- [ ] Activities tab auto-filters when project selected
- [ ] Tasks tab auto-filters when project selected
- [ ] No Projects tab visible in sidebar
- [ ] No filter button visible in sidebar
- [ ] Type checking passes (`pnpm check-types`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No console errors or warnings during navigation

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Build verification
pnpm --filter app build
# Expected: Successful build, no errors

# Linting
pnpm --filter app lint
# Expected: No lint errors

# Unit tests (after tests written)
pnpm --filter app test ProjectCombobox
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects`
3. Verify: Combobox shows "Show all", sidebar shows all activities/tasks
4. Open combobox and select a project
5. Verify: URL changes to `/projects/:id`, combobox shows project name, sidebar filters
6. Click star icon in combobox
7. Verify: Project moves to "Favorites" section immediately (no page reload)
8. Navigate directly to `/projects/:id2` via browser
9. Verify: Combobox updates to show project name

**Feature-Specific Checks:**

- Star/unstar actions work without closing combobox
- "Favorites" section hides when last favorite is unstarred
- Activities tab shows correct filtered sessions/workflows
- Tasks tab shows correct filtered specs
- "+ New Project" button navigates correctly
- Combobox search filters projects correctly

## Implementation Notes

### 1. Optimistic Updates Critical

Star/unstar must use optimistic updates to avoid jarring UX. The `useToggleProjectStarred()` mutation should:
- Immediately update `queryClient.setQueryData` for `useProjects()`
- Revert on error
- Keep combobox open during update

### 2. Event Propagation Handling

Star button click must call `e.stopPropagation()` to prevent:
- Combobox selection triggering
- Navigation firing
- Dropdown closing unexpectedly

### 3. Navigation vs Settings

Key distinction:
- **Navigation state** (`activeProjectId`): Ephemeral, drives filtering, synced with URL
- **Settings** (`sidebar_active_tab`, `activity_filter`): Persisted, survives page reload

Don't store `activeProjectId` in settings—it's derived from URL.

## Dependencies

- No new dependencies required
- Leverages existing `Combobox` component
- Uses existing query hooks and navigation store

## References

- Combobox component: `apps/app/src/client/components/ui/combobox.tsx`
- Navigation store: `apps/app/src/client/stores/navigationStore.ts`
- Settings hook: `apps/app/src/client/hooks/useSettings.ts`
- Existing Projects tab: `apps/app/src/client/components/sidebar/NavProjects.tsx`

## Next Steps

1. Implement `ProjectCombobox.tsx` with sectioned list and star actions
2. Integrate combobox into `SidebarTabs.tsx` and remove Projects tab
3. Clean up `NavActivities.tsx` and `NavTasks.tsx` filter logic
4. Remove deprecated settings from types
5. Test full navigation and filtering flows
6. Add unit tests for ProjectCombobox component
7. Verify no regressions in Activities/Tasks tab behavior
