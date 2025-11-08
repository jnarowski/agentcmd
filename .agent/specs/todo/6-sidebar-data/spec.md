# Sidebar Real Data Integration

**Status**: draft
**Created**: 2025-11-08
**Package**: apps/app
**Total Complexity**: 47 points
**Phases**: 4
**Tasks**: 11
**Overall Avg Complexity**: 4.3/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Projects Tab Integration | 4 | 18 | 4.5/10 | 6/10 |
| Phase 2: Activities Tab Integration | 4 | 22 | 5.5/10 | 7/10 |
| Phase 3: WebSocket Real-Time Updates | 2 | 5 | 2.5/10 | 3/10 |
| Phase 4: Cleanup & Testing | 1 | 2 | 2.0/10 | 2/10 |
| **Total** | **11** | **47** | **4.3/10** | **7/10** |

## Overview

Replace mock data in Projects and Activities sidebar tabs with real API data, add project management dropdown menus, and implement real-time WebSocket updates for live activity status changes.

## User Story

As a user
I want the sidebar to show my actual projects and recent activities
So that I can quickly navigate to real sessions and workflows without seeing mock data

## Technical Approach

Use existing hooks (`useProjectsWithSessions()`, `useWorkflowRuns()`) to fetch real data, merge sessions and workflows into unified activities list, add dropdown menus for project management (star/hide/edit), and subscribe to WebSocket events for real-time status updates.

## Key Design Decisions

1. **Keep useProjectsWithSessions()**: Both tabs benefit from having project data - Projects tab needs projects, Activities tab needs project names for display
2. **Merge sessions + workflows client-side**: Simpler than creating backend aggregation endpoint, leverages React Query caching
3. **Sort by created_at desc**: Show newest activities first (not updated_at to avoid random metadata changes bumping old items)
4. **Remove collapsible projects**: Projects are now simple clickable rows with dropdown menus for actions
5. **WebSocket optional for MVP**: Query refetch is fast enough, real-time updates can be deferred if needed

## Architecture

### File Structure

```
apps/app/src/client/components/sidebar/
├── nav-projects.tsx           # MODIFIED: Real project data + dropdown menus
├── nav-activities.tsx         # MODIFIED: Merged sessions + workflows
├── mock-data.ts               # DELETED: No longer needed
└── types.ts                   # DELETED: Using shared types

apps/app/src/client/pages/projects/
└── hooks/
    └── useProjects.ts         # EXISTING: useProjectsWithSessions, useToggleProjectStarred, etc.

apps/app/src/client/pages/projects/workflows/
└── hooks/
    └── useWorkflowRuns.ts     # EXISTING: useWorkflowRuns hook
```

### Integration Points

**Frontend - Sidebar Components**:
- `apps/app/src/client/components/sidebar/nav-projects.tsx` - Connect real project data, add dropdown menus
- `apps/app/src/client/components/sidebar/nav-activities.tsx` - Merge sessions + workflows, show project names

**Frontend - Hooks** (existing):
- `apps/app/src/client/pages/projects/hooks/useProjects.ts` - useProjectsWithSessions, useToggleProjectStarred, useToggleProjectHidden
- `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowRuns.ts` - useWorkflowRuns

## Implementation Details

### 1. Projects Tab Real Data

Replace mock project data with `useProjectsWithSessions()` hook and add dropdown menu for project actions.

**Key Points**:
- Use existing `useProjectsWithSessions()` hook (returns ProjectWithSessions[])
- Filter based on view setting (all/favorites/hidden) using `is_starred` and `is_hidden` fields
- Remove Collapsible behavior (no more chevron, no nested sessions)
- Add DropdownMenu with Star/Hide/Edit actions per project
- Click project row → navigate to `/projects/:projectId`
- Use existing mutations: `useToggleProjectStarred()`, `useToggleProjectHidden()`
- Add ProjectDialog for editing project name/path

### 2. Activities Tab Real Data

Merge sessions from all projects + workflow runs into unified activities list with project names.

**Key Points**:
- Extract sessions from `useProjectsWithSessions()` hook
- Fetch workflows from `useWorkflowRuns()` hook
- Filter out sessions with `workflowRunId` (avoid duplicates)
- Create unified Activity type with projectName field
- Sort by `created_at` descending (newest first)
- Show project name below activity name in UI
- Limit to 10 most recent activities
- Navigate to session detail or workflow detail on click

### 3. WebSocket Real-Time Updates (Optional)

Subscribe to WebSocket events for session and workflow status changes to auto-refresh activity list.

**Key Points**:
- Subscribe to global WebSocket channel
- Invalidate `['projects', 'with-sessions']` query on session events
- Invalidate workflow query on workflow run events
- React Query handles automatic refetch and UI update
- Can defer to Phase 3 if needed for MVP

## Files to Create/Modify

### New Files (0)

None - only modifying existing files

### Modified Files (2)

1. `apps/app/src/client/components/sidebar/nav-projects.tsx` - Connect real data, add dropdown menus, remove collapsible
2. `apps/app/src/client/components/sidebar/nav-activities.tsx` - Merge sessions + workflows, show project names

### Deleted Files (2)

1. `apps/app/src/client/components/sidebar/mock-data.ts` - No longer needed
2. `apps/app/src/client/components/sidebar/types.ts` - Using shared types instead

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Projects Tab Integration

**Phase Complexity**: 18 points (avg 4.5/10)

<!-- prettier-ignore -->
- [ ] 1.1 [4/10] Replace mock data with useProjectsWithSessions hook
  - Import useProjectsWithSessions, useToggleProjectStarred, useToggleProjectHidden from `@/client/pages/projects/hooks/useProjects`
  - Replace mockProjects with `const { data: projectsData } = useProjectsWithSessions()`
  - Update filter logic to use `is_starred` and `is_hidden` fields from real data
  - File: `apps/app/src/client/components/sidebar/nav-projects.tsx`
- [ ] 1.2 [6/10] Remove Collapsible behavior and add dropdown menu
  - Remove Collapsible, CollapsibleTrigger, CollapsibleContent components
  - Remove ChevronRight icon and openProjects state
  - Add DropdownMenu with MoreHorizontal trigger button
  - Add menu items: Star/Unstar (with filled icon state), Hide/Unhide, Edit
  - Wire up toggleStarred and toggleHidden mutations to menu items
  - File: `apps/app/src/client/components/sidebar/nav-projects.tsx`
- [ ] 1.3 [4/10] Add project click navigation
  - Add navigate handler: `const navigate = useNavigate()`
  - Update SidebarMenuButton onClick to navigate to `/projects/${project.id}`
  - Maintain isActive state using useParams or activeProjectId prop
  - File: `apps/app/src/client/components/sidebar/nav-projects.tsx`
- [ ] 1.4 [4/10] Add ProjectDialog for editing
  - Import ProjectDialog from `@/client/pages/projects/components/ProjectDialog`
  - Add useState for editDialogOpen and projectToEdit
  - Wire Edit menu item to open dialog with selected project
  - Render ProjectDialog conditionally when open
  - File: `apps/app/src/client/components/sidebar/nav-projects.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Activities Tab Integration

**Phase Complexity**: 22 points (avg 5.5/10)

<!-- prettier-ignore -->
- [ ] 2.1 [5/10] Create unified Activity type and extract sessions
  - Define Activity type: `{ id, type, name, projectId, projectName, status, createdAt }`
  - Import useProjectsWithSessions hook
  - Use useMemo to extract and map sessions from projectsData
  - Filter out sessions where `workflowRunId` exists (avoid duplicates)
  - Map to Activity type with projectName from parent project
  - File: `apps/app/src/client/components/sidebar/nav-activities.tsx`
- [ ] 2.2 [7/10] Fetch and merge workflow runs
  - Import useWorkflowRuns from `@/client/pages/projects/workflows/hooks/useWorkflowRuns`
  - Check if hook accepts projectId param or returns all runs (verify implementation)
  - Use useMemo to map workflow runs to Activity type
  - Lookup projectName from projectsData by matching project_id
  - Handle case where project not found (fallback to "Unknown")
  - File: `apps/app/src/client/components/sidebar/nav-activities.tsx`
- [ ] 2.3 [6/10] Implement merge, filter, and sort logic
  - Create useMemo to merge sessions + workflows arrays
  - Apply filter based on activity_filter setting (all/sessions/workflows)
  - Sort by `createdAt.getTime()` descending (newest first)
  - Limit to 10 items with slice(0, 10)
  - File: `apps/app/src/client/components/sidebar/nav-activities.tsx`
- [ ] 2.4 [4/10] Update UI to show project name and navigation
  - Update SidebarMenuButton to show two-line layout (activity name + project name)
  - Add projectName as text-xs text-muted-foreground below activity name
  - Consider using AgentIcon for sessions (see SessionListItem.tsx reference)
  - Use formatDistanceToNow from date-fns for time display (optional enhancement)
  - Update handleActivityClick to navigate based on type (session vs workflow)
  - Session: `/projects/${projectId}/sessions/${id}`, Workflow: `/projects/${projectId}/workflows/${id}`
  - File: `apps/app/src/client/components/sidebar/nav-activities.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: WebSocket Real-Time Updates

**Phase Complexity**: 5 points (avg 2.5/10)

<!-- prettier-ignore -->
- [ ] 3.1 [3/10] Add WebSocket subscription for activities (optional for MVP)
  - Import useQueryClient and useEffect
  - Subscribe to global WebSocket channel or project-specific channels
  - Invalidate `['projects', 'with-sessions']` query on session.* events
  - Invalidate workflow query on workflow.run.* events (verify query key)
  - Add cleanup function to unsubscribe on unmount
  - File: `apps/app/src/client/components/sidebar/nav-activities.tsx`
- [ ] 3.2 [2/10] Test real-time updates (if Phase 3.1 implemented)
  - Create new session in one browser tab, verify appears in sidebar in another tab
  - Start workflow run, verify status updates appear in real-time
  - Check console for WebSocket connection messages
  - Verify no duplicate refetches or infinite loops

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Cleanup & Testing

**Phase Complexity**: 2 points (avg 2.0/10)

<!-- prettier-ignore -->
- [ ] 4.1 [2/10] Remove mock data files and verify build
  - Delete `apps/app/src/client/components/sidebar/mock-data.ts`
  - Delete `apps/app/src/client/components/sidebar/types.ts` (if unused elsewhere)
  - Run `pnpm check-types` to verify no import errors
  - Run `pnpm build` to verify production build succeeds
  - Manually test all sidebar functionality (projects, activities, filters, navigation)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

Not required for this feature - primarily UI integration work using existing tested hooks.

### Integration Tests

**Manual integration testing**:
- Verify Projects tab shows real projects from database
- Test star/unstar project, verify icon state changes
- Test hide project, verify removed from "All" view, appears in "Hidden" view
- Test edit project, verify name/path update in dialog
- Click project, verify navigates to project home page
- Verify Activities tab shows mix of sessions and workflows
- Verify each activity shows correct project name below it
- Test filter toggle (All/Sessions/Workflows), verify correct items shown
- Click activity, verify navigates to correct detail page (session or workflow)

### E2E Tests

Not required - manual testing sufficient for MVP.

## Success Criteria

- [ ] Projects tab displays real projects from database (not mock data)
- [ ] Projects can be starred/unstarred via dropdown menu
- [ ] Projects can be hidden/unhidden via dropdown menu
- [ ] Edit project opens ProjectDialog with current name/path
- [ ] Clicking project navigates to `/projects/:projectId`
- [ ] Activities tab shows unified list of sessions + workflows
- [ ] Each activity displays project name below activity name
- [ ] Activities sorted by created_at descending (newest first)
- [ ] Filter persistence works (All/Sessions/Workflows)
- [ ] Clicking activity navigates to correct detail page
- [ ] Sessions with workflowRunId are excluded from activities list
- [ ] No TypeScript errors
- [ ] Production build succeeds
- [ ] Manual testing confirms all functionality works

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter apps/app check-types
# Expected: No type errors

# Build verification
pnpm --filter apps/app build
# Expected: Build completes without errors

# Linting
pnpm --filter apps/app lint
# Expected: No lint errors or only auto-fixable warnings
```

**Manual Verification:**

1. Start application: `pnpm --filter apps/app dev`
2. Navigate to: `http://localhost:5173/projects`
3. **Test Projects Tab:**
   - Verify: Real projects displayed (not mock "agentcmd", "My Website", "API Server")
   - Click project dropdown (⋮) → Star project → verify star icon fills
   - Click dropdown → Hide project → switch to "Hidden" view → verify appears
   - Click dropdown → Edit → verify ProjectDialog opens with correct data
   - Click project row → verify navigates to `/projects/:projectId`
4. **Test Activities Tab:**
   - Verify: Shows mix of real sessions and workflow runs
   - Verify: Each activity shows project name below activity name (small gray text)
   - Verify: Activities sorted newest first
   - Toggle filter: All → Sessions → Workflows → verify correct items shown
   - Click activity → verify navigates to session or workflow detail page
   - Create new session → verify appears at top of activities list
5. **Test Filters:**
   - Toggle Projects view (All/Favorites/Hidden) → refresh page → verify persists
   - Toggle Activities filter (All/Sessions/Workflows) → refresh page → verify persists
6. Check console: No errors or warnings
7. Check Network tab: Verify queries for projects and workflows are successful

**Feature-Specific Checks:**

- Verify sessions attached to workflow runs (workflowRunId not null) do NOT appear in Activities list
- Verify project count in "Projects (X)" tab badge matches filtered project count
- Verify activity count in "Activities (X)" tab badge matches filtered activity count (max 10)
- Create workflow run, verify appears in Activities tab within a few seconds
- Star/unstar project multiple times, verify no duplicate requests or race conditions

## Implementation Notes

### 1. Workflow Runs Hook

Need to verify `useWorkflowRuns()` hook signature:
- Check if it accepts optional projectId param: `useWorkflowRuns(projectId?)`
- OR if it returns all runs globally: `useWorkflowRuns()`
- Import from: `@/client/pages/projects/workflows/hooks/useWorkflowRuns`

If hook only supports per-project fetching, may need to:
- Loop through all projects and aggregate runs
- OR create new `useAllWorkflowRuns()` hook
- Check implementation during Phase 2.2

### 2. ProjectDialog Import

Verify ProjectDialog component signature:
- Should accept: `open`, `onOpenChange`, `project` props
- Located at: `@/client/pages/projects/components/ProjectDialog`
- Used in existing ProjectHome page for reference

### 3. WebSocket Event Names

Need to verify exact WebSocket event type strings:
- Session events: `session.created`, `session.updated`, or different?
- Workflow events: `workflow.run.created`, `workflow.run.updated`, or different?
- Check `apps/app/src/shared/types/websocket.types.ts` for event type definitions

### 4. Query Key Coordination

Verify exact query keys for invalidation:
- Projects with sessions: `['projects', 'with-sessions']` or `projectKeys.withSessions()`?
- Workflow runs: `['workflows']`, `['workflow-runs']`, or different?
- Check hook implementations for queryKey definitions

## Dependencies

No new dependencies required - using existing:
- @tanstack/react-query (already installed)
- lucide-react (already installed)
- react-router-dom (already installed)
- shadcn/ui components (already installed)

## References

- Existing hook: `apps/app/src/client/pages/projects/hooks/useProjects.ts`
- Existing hook: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowRuns.ts`
- ProjectDialog: `apps/app/src/client/pages/projects/components/ProjectDialog.tsx`
- WebSocket types: `apps/app/src/shared/types/websocket.types.ts`
- Project types: `apps/app/src/shared/types/project.types.ts`
- Workflow types: `apps/app/src/client/pages/projects/workflows/types.ts`

## Next Steps

1. Implement Phase 1 (Projects Tab) - replace mock data, add dropdowns
2. Implement Phase 2 (Activities Tab) - merge sessions + workflows
3. (Optional) Implement Phase 3 (WebSocket) - real-time updates
4. Delete mock files and verify build
5. Manual testing of all sidebar functionality
6. Mark spec as completed
