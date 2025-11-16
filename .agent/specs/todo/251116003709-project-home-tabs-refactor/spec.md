# Project Home Page Activities & Tasks Tabs

**Status**: draft
**Created**: 2025-11-16
**Package**: apps/app
**Total Complexity**: 32 points
**Phases**: 3
**Tasks**: 9
**Overall Avg Complexity**: 3.6/10

## Complexity Breakdown

| Phase                      | Tasks | Total Points | Avg Complexity | Max Task |
| -------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Settings Schema   | 2     | 7            | 3.5/10         | 4/10     |
| Phase 2: Frontend Refactor | 5     | 18           | 3.6/10         | 5/10     |
| Phase 3: Cleanup           | 2     | 7            | 3.5/10         | 4/10     |
| **Total**                  | **9** | **32**       | **3.6/10**     | **5/10** |

## Overview

Refactor ProjectHomePage to use tabbed layout with Activities (sessions + workflows combined) and Tasks (specs + planning sessions) tabs. Replace old SessionCard/WorkflowCard components with sidebar-style items, add persisted tab state via settings.

## User Story

As a user
I want to see activities (sessions + workflows) and tasks (specs + planning) in separate tabs on project home
So that I can quickly access relevant work and maintain context between sessions

## Technical Approach

Split ProjectHomePage content into two tabs using existing Tabs component. Activities tab combines sessions and workflows in chronological order with filter toggle (all/sessions/workflows). Tasks tab shows specs from spec index and planning sessions. Persist active tab in user settings (project_home_active_tab). Reuse existing sidebar components (SessionItem, WorkflowItem) for consistent UI.

## Key Design Decisions

1. **Tabs over sections**: Use Tabs component instead of separate card sections - cleaner UI, better focus, follows Gmail/Slack patterns
2. **Persisted tab state**: Store active tab in user.settings JSON field - maintains context across sessions without migration
3. **Reuse sidebar components**: Use SessionItem/WorkflowItem instead of new Card components - consistency with sidebar, less code duplication
4. **Local filter state**: Activity filter (all/sessions/workflows) is local to component, not persisted - lightweight UX without backend changes
5. **Combined activities view**: Merge sessions + workflows chronologically - single unified timeline matches mental model

## Architecture

### File Structure

```
apps/app/
├── src/
│   ├── client/
│   │   ├── hooks/
│   │   │   └── useSettings.ts                               # Add project_home_active_tab type
│   │   └── pages/projects/components/
│   │       ├── ProjectHomePage.tsx                          # Replace session list with tabs
│   │       ├── ProjectHomeContent.tsx                       # NEW: Tab container with persisted state
│   │       ├── ProjectHomeActivities.tsx                    # NEW: Activities tab (sessions + workflows)
│   │       ├── ProjectHomeTasks.tsx                         # NEW: Tasks tab (specs + planning)
│   │       ├── ProjectHomeSessions.tsx                      # OLD: To be removed (not used)
│   │       ├── SessionCard.tsx                              # DELETED (git)
│   │       └── WorkflowCard.tsx                             # DELETED (git)
│   └── server/
│       └── routes/
│           └── settings.ts                                  # Add project_home_active_tab to schema
```

### Integration Points

**Frontend**:
- `ProjectHomePage.tsx` - Replace ProjectHomeSessions with ProjectHomeContent
- `ProjectHomeContent.tsx` - Tabs wrapper, persists active tab via useSettings
- `ProjectHomeActivities.tsx` - Fetch sessions + workflows, merge chronologically
- `ProjectHomeTasks.tsx` - Fetch specs + planning sessions, display grouped

**Backend**:
- `settings.ts` - Add `project_home_active_tab` to userPreferencesSchema

**Hooks**:
- `useSettings.ts` - Add type for project_home_active_tab preference
- `useSessions.ts` - Already exists, fetch sessions by project
- `useAllWorkflowRuns.ts` - Already exists, fetch workflow runs
- `useTasks.ts` - Already exists, fetch specs + planning sessions

## Implementation Details

### 1. ProjectHomeContent Component

Wrapper component managing tab state with persistence:

```typescript
interface ProjectHomeContentProps {
  projectId: string;
}

type HomeTab = "activities" | "tasks";

export function ProjectHomeContent({ projectId }: ProjectHomeContentProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const activeTab: HomeTab =
    (settings?.userPreferences?.project_home_active_tab as HomeTab) || "activities";

  const handleTabChange = (value: string) => {
    updateSettings.mutate({
      project_home_active_tab: value as HomeTab,
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="activities">Activities</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
      </TabsList>
      <TabsContent value="activities">
        <ProjectHomeActivities projectId={projectId} />
      </TabsContent>
      <TabsContent value="tasks">
        <ProjectHomeTasks projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
```

**Key Points**:
- Default to "activities" if no preference saved
- Update persisted preference on tab change
- Pass projectId to child tab components

### 2. ProjectHomeActivities Component

Combined sessions + workflows timeline with filter:

```typescript
interface Activity {
  id: string;
  type: "session" | "workflow";
  name: string;
  projectId: string;
  projectName: string;
  status: string | WorkflowStatus;
  createdAt: Date;
  agent?: AgentType;
  session?: SessionResponse;
  workflowDefinitionId?: string;
}

type ActivityFilter = "all" | "sessions" | "workflows";

export function ProjectHomeActivities({ projectId }: { projectId: string }) {
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const { data: sessions } = useSessions({ projectId, limit: 20 });
  const { data: workflowRuns } = useAllWorkflowRuns(["pending", "running", "failed"], projectId);

  // Map to unified Activity type
  const activities: Activity[] = [
    ...sessions.map(s => ({ type: "session", ...s })),
    ...workflowRuns.map(w => ({ type: "workflow", ...w }))
  ]
    .filter(a => filter === "all" || a.type === filter)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50);

  return (
    <div>
      <ToggleGroup value={filter} onValueChange={setFilter}>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="sessions">Sessions</ToggleGroupItem>
        <ToggleGroupItem value="workflows">Workflows</ToggleGroupItem>
      </ToggleGroup>

      <div className="space-y-1">
        {activities.map(activity =>
          activity.type === "session" ? (
            <SessionItem key={activity.id} {...activity} />
          ) : (
            <WorkflowItem key={activity.id} {...activity} />
          )
        )}
      </div>
    </div>
  );
}
```

**Key Points**:
- Unified Activity interface for combined timeline
- Filter is local state (not persisted)
- Limit to 50 total items for performance
- Reuse SessionItem/WorkflowItem from sidebar

### 3. ProjectHomeTasks Component

Specs + planning sessions grouped display:

```typescript
export function ProjectHomeTasks({ projectId }: { projectId: string }) {
  const { data } = useTasks(projectId);
  const rescanMutation = useRescanTasks();

  return (
    <div className="space-y-6">
      {/* Specs Section */}
      {data.tasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Specs</h3>
            <Button variant="ghost" size="sm" onClick={() => rescanMutation.mutate()}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {data.tasks.map(task => (
              <div key={task.id} onClick={() => handleOpenWorkflow(task)}>
                <FileText className="size-4" />
                <div>{task.name}</div>
                <Badge>{task.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planning Sessions Section */}
      {data.planningSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Planning Sessions</h3>
          <div className="space-y-1">
            {data.planningSessions.map(session => (
              <SessionItem key={session.id} {...session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Key Points**:
- Two distinct sections (Specs, Planning Sessions)
- Specs are clickable, navigate to workflow creation
- Planning sessions use existing SessionItem component
- Rescan button for spec index refresh

### 4. Settings Schema Updates

Add project_home_active_tab to backend schema:

**Frontend** (`useSettings.ts`):
```typescript
interface UserPreferences {
  // ... existing fields
  project_home_active_tab?: 'activities' | 'tasks';
}
```

**Backend** (`settings.ts`):
```typescript
const userPreferencesSchema = z.object({
  // ... existing fields
  project_home_active_tab: z.enum(["activities", "tasks"]).optional(),
});
```

## Files to Create/Modify

### New Files (3)

1. `apps/app/src/client/pages/projects/components/ProjectHomeContent.tsx` - Tab wrapper with persisted state
2. `apps/app/src/client/pages/projects/components/ProjectHomeActivities.tsx` - Activities tab (sessions + workflows)
3. `apps/app/src/client/pages/projects/components/ProjectHomeTasks.tsx` - Tasks tab (specs + planning)

### Modified Files (3)

1. `apps/app/src/client/pages/ProjectHomePage.tsx` - Replace ProjectHomeSessions with ProjectHomeContent
2. `apps/app/src/client/hooks/useSettings.ts` - Add project_home_active_tab type
3. `apps/app/src/server/routes/settings.ts` - Add project_home_active_tab to schema

### Deleted Files (2)

1. `apps/app/src/client/pages/projects/components/SessionCard.tsx` - Replaced by SessionItem (already deleted)
2. `apps/app/src/client/pages/projects/components/WorkflowCard.tsx` - Replaced by WorkflowItem (already deleted)

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Settings Schema

**Phase Complexity**: 7 points (avg 3.5/10)

- [x] 1.1 [3/10] Add project_home_active_tab to frontend settings types
  - File: `apps/app/src/client/hooks/useSettings.ts`
  - Add to UserPreferences interface: `project_home_active_tab?: 'activities' | 'tasks';`
  - Verify: Type checking passes

- [x] 1.2 [4/10] Add project_home_active_tab to backend settings schema
  - File: `apps/app/src/server/routes/settings.ts`
  - Add to userPreferencesSchema: `project_home_active_tab: z.enum(["activities", "tasks"]).optional()`
  - Verify: Backend compiles without errors

#### Completion Notes

(Already completed - changes detected in git diff)

### Phase 2: Frontend Refactor

**Phase Complexity**: 18 points (avg 3.6/10)

- [x] 2.1 [4/10] Create ProjectHomeContent tab wrapper component
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeContent.tsx` (new)
  - Import Tabs components from `@/client/components/ui/tabs`
  - Import useSettings, useUpdateSettings hooks
  - Implement tab state management with persistence
  - Default to "activities" tab if no preference

- [x] 2.2 [5/10] Create ProjectHomeActivities component
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeActivities.tsx` (new)
  - Define Activity interface for unified timeline
  - Fetch sessions via useSessions hook (limit: 20)
  - Fetch workflows via useAllWorkflowRuns (statuses: pending, running, failed)
  - Implement filter toggle (all/sessions/workflows) using ToggleGroup
  - Merge and sort activities chronologically, limit to 50
  - Render SessionItem and WorkflowItem components

- [x] 2.3 [4/10] Create ProjectHomeTasks component
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeTasks.tsx` (new)
  - Fetch tasks via useTasks hook
  - Implement Specs section with clickable items
  - Implement Planning Sessions section using SessionItem
  - Add rescan button with useRescanTasks mutation
  - Handle navigation to workflow creation with spec file

- [x] 2.4 [3/10] Update ProjectHomePage to use new tab layout
  - File: `apps/app/src/client/pages/ProjectHomePage.tsx`
  - Remove ProjectHomeSessions import and usage
  - Import ProjectHomeContent component
  - Replace sessions Card with ProjectHomeContent
  - Pass projectId prop to ProjectHomeContent
  - Update card title/structure if needed

- [x] 2.5 [2/10] Verify tab switching and state persistence
  - Test: Start dev server, navigate to project home page
  - Verify: Default tab is "activities"
  - Test: Switch to "tasks" tab, refresh page
  - Verify: Tab remains on "tasks" after refresh
  - Test: Switch between tabs multiple times
  - Verify: Smooth transitions, no loading flickers

#### Completion Notes

(Already completed - new components created and integrated)

### Phase 3: Cleanup

**Phase Complexity**: 7 points (avg 3.5/10)

- [ ] 3.1 [3/10] Remove ProjectHomeSessions component (unused)
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeSessions.tsx`
  - Verify: Component not imported anywhere (use Grep)
  - Delete file using git: `git rm apps/app/src/client/pages/projects/components/ProjectHomeSessions.tsx`
  - Verify: No import errors after deletion

- [ ] 3.2 [4/10] Verify SessionCard and WorkflowCard already deleted
  - Check git status for deleted files
  - Verify: SessionCard.tsx deleted (already shows in git status)
  - Verify: WorkflowCard.tsx deleted (already shows in git status)
  - Search codebase for any remaining imports using Grep
  - If found: Remove imports and update components

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`apps/app/src/client/pages/projects/components/__tests__/ProjectHomeContent.test.tsx`** - Test tab state:

```typescript
describe("ProjectHomeContent", () => {
  it("defaults to activities tab", () => {
    render(<ProjectHomeContent projectId="123" />);
    expect(screen.getByRole("tab", { name: "Activities", selected: true })).toBeInTheDocument();
  });

  it("persists tab selection to settings", async () => {
    const updateSettings = vi.fn();
    render(<ProjectHomeContent projectId="123" />);

    fireEvent.click(screen.getByRole("tab", { name: "Tasks" }));

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        project_home_active_tab: "tasks"
      });
    });
  });
});
```

**`apps/app/src/client/pages/projects/components/__tests__/ProjectHomeActivities.test.tsx`** - Test activity merging:

```typescript
describe("ProjectHomeActivities", () => {
  it("merges sessions and workflows chronologically", () => {
    const sessions = [mockSession1, mockSession2];
    const workflows = [mockWorkflow1];

    render(<ProjectHomeActivities projectId="123" />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    // Verify chronological order
  });

  it("filters activities by type", async () => {
    render(<ProjectHomeActivities projectId="123" />);

    fireEvent.click(screen.getByText("Sessions"));

    await waitFor(() => {
      expect(screen.queryByText("Workflow Name")).not.toBeInTheDocument();
    });
  });
});
```

### Integration Tests

Test full flow:

1. Load ProjectHomePage
2. Verify Activities tab shows sessions + workflows
3. Click Tasks tab
4. Verify Tasks tab shows specs + planning sessions
5. Refresh page
6. Verify Tasks tab still active (persisted)
7. Switch to Activities tab
8. Verify filter toggle works (all/sessions/workflows)

### E2E Tests

Manual verification:

1. Navigate to project home page
2. Verify default Activities tab selected
3. Verify sessions and workflows appear in timeline
4. Click filter toggle (all → sessions → workflows)
5. Verify filtering works correctly
6. Click Tasks tab
7. Verify specs section displays with rescan button
8. Verify planning sessions section displays
9. Click spec item, verify navigation to workflow creation
10. Refresh page, verify tab state persisted

## Success Criteria

- [x] ProjectHomeContent component renders tabs correctly
- [x] Activities tab combines sessions + workflows chronologically
- [x] Tasks tab shows specs + planning sessions grouped
- [x] Tab state persists across page refreshes
- [x] Filter toggle works (all/sessions/workflows) in Activities
- [x] Specs clickable, navigate to workflow creation with spec file
- [x] Rescan button refreshes spec index
- [x] SessionItem and WorkflowItem components reused from sidebar
- [ ] ProjectHomeSessions component removed (unused)
- [ ] SessionCard and WorkflowCard confirmed deleted
- [x] No TypeScript errors
- [ ] Build succeeds: `pnpm build`
- [ ] Type check passes: `pnpm check-types`

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking (from root)
pnpm check-types
# Expected: No type errors

# Linting
pnpm --filter app lint
# Expected: No lint errors

# Build verification
pnpm build
# Expected: All packages build successfully

# Unit tests (when written)
pnpm --filter app test
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}`
3. Verify default tab is "activities"
4. Verify activities list shows sessions + workflows mixed
5. Click filter toggle: "All" → "Sessions" → "Workflows"
6. Verify filtering works correctly
7. Click "Tasks" tab
8. Verify specs section appears with items
9. Verify planning sessions section appears
10. Click refresh icon on Specs section
11. Verify spec list updates
12. Click a spec item
13. Verify navigation to workflow creation page with spec file in URL
14. Navigate back to project home
15. Verify "Tasks" tab still active (persisted)
16. Refresh page
17. Verify tab state maintained after refresh
18. Check console: No errors or warnings

**Feature-Specific Checks:**

- Verify activities sorted newest first (by created_at)
- Verify limit of 50 activities enforced
- Verify workflow runs only include: pending, running, failed statuses
- Verify session limit of 20 enforced
- Verify specs navigate with correct specFile query param
- Verify planning sessions use session type correctly
- Verify settings API stores project_home_active_tab preference

## Implementation Notes

### 1. Activity Timeline Merging

Both sessions and workflows have created_at timestamps. Simple chronological sort works without timestamp estimation (unlike trace logs). Limit to 50 total items prevents performance issues with large projects.

### 2. Workflow Status Filtering

Only show active/problematic workflows (pending, running, failed). Completed workflows clutter timeline - users typically care about current work. Matches sidebar behavior.

### 3. Component Reuse Strategy

SessionItem and WorkflowItem already exist in sidebar with correct styling, click handlers, and real-time updates. Reusing avoids duplication and maintains UI consistency. No Card wrapper needed - items work well in flat list.

### 4. Filter State Decision

Activity filter is local state (not persisted) because:
- Lightweight preference (not critical to restore)
- Reduces backend calls for settings updates
- Users typically want "all" view when revisiting
- Easy to change if user feedback suggests otherwise

### 5. Tabs vs Sections

Tabs provide better focus than scrolling sections. User sees either activities OR tasks, not both simultaneously. Matches common patterns (Gmail, Slack, GitHub). Persisted state maintains context across sessions.

## Dependencies

- No new dependencies required
- Uses existing UI components (Tabs, ToggleGroup, Badge)
- Uses existing hooks (useSettings, useSessions, useTasks, useAllWorkflowRuns)
- Uses existing sidebar components (SessionItem, WorkflowItem)

## References

- `.agent/specs/todo/251115143849-workflow-logging/spec.md` - Related logging v2 work
- `apps/app/src/client/components/sidebar/SessionItem.tsx` - Reused component
- `apps/app/src/client/components/sidebar/WorkflowItem.tsx` - Reused component
- `apps/app/src/client/hooks/useTasks.ts` - Tasks fetching hook
- `apps/app/src/client/hooks/useSettings.ts` - Settings management
- `apps/app/src/server/routes/settings.ts` - Backend settings schema

## Next Steps

1. Complete Phase 3: Remove ProjectHomeSessions component
2. Verify SessionCard/WorkflowCard fully removed from codebase
3. Write unit tests for new components
4. Test on production-like data (many sessions/workflows)
5. (Future) Add pagination if 50 item limit proves insufficient
6. (Future) Add search/filter for tasks tab
7. (Future) Add sort options (by date, status, name)
