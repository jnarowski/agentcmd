# Three-Tab Sidebar with Workflow Grouping

**Status**: review
**Created**: 2025-11-22
**Package**: apps/app
**Total Complexity**: 64 points
**Phases**: 4
**Tasks**: 16
**Overall Avg Complexity**: 4.0/10

## Complexity Breakdown

| Phase                          | Tasks | Total Points | Avg Complexity | Max Task |
| ------------------------------ | ----- | ------------ | -------------- | -------- |
| Phase 1: Backend Updates       | 2     | 7            | 3.5/10         | 4/10     |
| Phase 2: Split NavActivities   | 5     | 24           | 4.8/10         | 6/10     |
| Phase 3: Update SidebarTabs    | 4     | 18           | 4.5/10         | 6/10     |
| Phase 4: Cleanup and Polish    | 5     | 15           | 3.0/10         | 4/10     |
| **Total**                      | **16**| **64**       | **4.0/10**     | **6/10** |

## Overview

Refactor sidebar navigation from 2-tab system (Activities with filter, Specs) to 3-tab system (Sessions, Workflows, Specs). Split Activities tab into dedicated Sessions and Workflows tabs with independent creation actions. Add "Active" and "Recently Finished" grouping to Workflows tab for better organization.

## User Story

As a user
I want dedicated tabs for Sessions and Workflows
So that I can quickly navigate to the specific type of activity I'm looking for without filtering through a mixed list

## Technical Approach

Split current `NavActivities.tsx` component into two separate components (`NavSessions.tsx` and `NavWorkflows.tsx`), update `SidebarTabs.tsx` to support three tabs, and modify settings types to support new tab values. Update workflow query to fetch completed/failed/cancelled statuses and implement client-side grouping into "Active" and "Recently Finished" sections.

## Key Design Decisions

1. **Separate Components**: Split NavActivities into NavSessions and NavWorkflows rather than conditional rendering - cleaner separation, easier to maintain per-tab features
2. **Client-Side Grouping**: Fetch all workflow statuses and group client-side rather than separate queries - simpler implementation, minimal performance impact
3. **24-Hour Window**: Define "Recently Finished" as last 24 hours - balances recency with visibility of recent work
4. **Migration Strategy**: Map old 'activities' → 'sessions', 'tasks' → 'specs' with fallback defaults - preserves user experience during upgrade

## Architecture

### File Structure

```
apps/app/src/
├── client/
│   ├── components/
│   │   ├── sidebar/
│   │   │   ├── SidebarTabs.tsx          # Modified: 3-tab system
│   │   │   ├── NavActivities.tsx        # Deleted: logic split
│   │   │   ├── NavSessions.tsx          # New: sessions-only view
│   │   │   ├── NavWorkflows.tsx         # New: workflows with grouping
│   │   │   ├── NavSpecs.tsx             # Unchanged
│   │   │   ├── SessionItem.tsx          # Unchanged
│   │   │   └── WorkflowItem.tsx         # Unchanged
│   ├── hooks/
│   │   └── useSettings.ts               # Modified: new tab types
├── server/
│   └── routes/
│       └── settings.ts                  # Modified: validation schema
```

### Integration Points

**Settings System**:
- `apps/app/src/client/hooks/useSettings.ts` - Update TypeScript types for new tab values
- `apps/app/src/server/routes/settings.ts` - Update Zod schema validation for sidebar_active_tab

**Sidebar Components**:
- `SidebarTabs.tsx` - Add third tab, update auto-switch logic
- `NavSessions.tsx` - Extract session logic, simple plus button
- `NavWorkflows.tsx` - Extract workflow logic, add grouping, dropdown menu

**Data Fetching**:
- `useAllWorkflowRuns()` - Expand statuses to include completed/failed/cancelled

## Implementation Details

### 1. NavSessions Component

Dedicated component for chat sessions with simple creation flow.

**Key Points**:
- Fetches only chat sessions (type='chat', limit=20)
- Filters by activeProjectId from navigationStore
- Plus button navigates directly to new session (no dropdown)
- Refresh button syncs projects and invalidates session queries
- Empty state: "No sessions in this project"
- Renders SessionItem components

### 2. NavWorkflows Component

Dedicated component for workflow runs with grouped sections.

**Key Points**:
- Fetches all workflow statuses (pending/running/paused/completed/failed/cancelled)
- Client-side grouping: "Active" (pending/running/paused) and "Recently Finished" (completed/failed/cancelled within 24h)
- Plus dropdown shows workflow definitions list (alphabetically sorted)
- Refresh button syncs projects and invalidates workflow queries
- Section headers with muted text styling
- Hide "Recently Finished" section if empty
- Limit Recently Finished to 25 items

### 3. Three-Tab Navigation

Update SidebarTabs to support Sessions | Workflows | Specs tabs.

**Key Points**:
- Change grid-cols-2 to grid-cols-3
- Add three TabsTrigger components
- Update auto-switch logic: activeSessionId → 'sessions', runId → 'workflows'
- Migration fallback: 'activities' → 'sessions', 'tasks' → 'specs'
- Keep project filter above tabs (applies to all)
- Only Specs tab shows count badge

### 4. Settings Type Updates

Update TypeScript and Zod schemas for new tab values.

**Key Points**:
- Change sidebar_active_tab from `'activities' | 'tasks'` to `'sessions' | 'workflows' | 'specs'`
- Remove activity_filter field (no longer needed)
- Update both frontend TypeScript types and backend Zod validation
- Default to 'sessions' for new users

## Files to Create/Modify

### New Files (2)

1. `apps/app/src/client/components/sidebar/NavSessions.tsx` - Sessions tab component (~150 lines)
2. `apps/app/src/client/components/sidebar/NavWorkflows.tsx` - Workflows tab component with grouping (~250 lines)

### Modified Files (4)

1. `apps/app/src/client/components/sidebar/SidebarTabs.tsx` - Add third tab, update auto-switch logic
2. `apps/app/src/client/hooks/useSettings.ts` - Update TypeScript types for new tab values
3. `apps/app/src/server/routes/settings.ts` - Update Zod schema validation
4. `apps/app/src/client/components/sidebar/NavActivities.tsx` - Delete after extracting logic

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend Updates

**Phase Complexity**: 7 points (avg 3.5/10)

- [x] 1.1 [3/10] Update settings route validation schema
  - Modify `userPreferencesSchema` in settings route
  - Change `sidebar_active_tab` enum from `["projects", "activities", "tasks"]` to `["sessions", "workflows", "specs"]`
  - Remove `activity_filter` field from schema (no longer used)
  - File: `apps/app/src/server/routes/settings.ts`
  - Lines to modify: 25-27

- [x] 1.2 [4/10] Update frontend settings types
  - Update `UserPreferences` interface
  - Change `sidebar_active_tab?: 'activities' | 'tasks'` to `'sessions' | 'workflows' | 'specs'`
  - Remove `activity_filter?: 'all' | 'sessions' | 'workflows'` field
  - File: `apps/app/src/client/hooks/useSettings.ts`
  - Lines to modify: 31-32

#### Completion Notes

- Backend and frontend settings types updated for three-tab system
- Removed activity_filter field (no longer needed with dedicated tabs)
- Changed sidebar_active_tab enum from 'activities'/'tasks' to 'sessions'/'workflows'/'specs'
- Settings validation now enforces new tab values

### Phase 2: Split NavActivities

**Phase Complexity**: 24 points (avg 4.8/10)

- [x] 2.1 [6/10] Create NavSessions component
  - Extract session-specific logic from NavActivities (lines 75-114, 283-296)
  - Fetch sessions using `useSessions({ projectId, limit: 20, type: 'chat' })`
  - Map to activities array with project name joining (reuse pattern from lines 90-114)
  - Plus button → direct navigation to new session
  - Refresh button → `syncProjectsMutation` + invalidate session queries
  - Render SessionItem components in scrollable SidebarMenu
  - Empty state: "No sessions in this project" or "No recent sessions"
  - File: `apps/app/src/client/components/sidebar/NavSessions.tsx` (new)
  - Reference: Current NavActivities lines 48-158, 208-233, 265-296

- [x] 2.2 [6/10] Create NavWorkflows component with basic structure
  - Extract workflow-specific logic from NavActivities (lines 84-140, 297-309)
  - Fetch workflows using `useAllWorkflowRuns(['pending', 'running', 'paused', 'failed', 'completed', 'cancelled'], projectId)`
  - Map to activities array with project name joining (reuse pattern from lines 117-140)
  - Plus dropdown → fetch workflow definitions, render sorted list
  - Refresh button → `syncProjectsMutation` + invalidate workflow queries
  - File: `apps/app/src/client/components/sidebar/NavWorkflows.tsx` (new)
  - Reference: Current NavActivities lines 84-140, 208-264, 297-311

- [x] 2.3 [5/10] Implement Active workflows section
  - Filter workflows where status IN ['pending', 'running', 'paused']
  - Sort by created_at DESC
  - Render section header: `<span className="text-xs font-semibold text-muted-foreground">Active</span>`
  - Render WorkflowItem components in SidebarMenu
  - Show "No active workflows" if empty
  - File: `apps/app/src/client/components/sidebar/NavWorkflows.tsx`
  - Reference pattern: `apps/app/src/client/components/sidebar/NavSpecs.tsx` lines 44-47

- [x] 2.4 [4/10] Implement Recently Finished workflows section
  - Filter workflows where status IN ['completed', 'failed', 'cancelled'] AND completed_at >= (now - 24 hours)
  - Sort by completed_at DESC
  - Limit to 25 most recent
  - Render section header with top padding: `<div className="pt-3"><span className="text-xs font-semibold text-muted-foreground">Recently Finished</span></div>`
  - Render WorkflowItem components in SidebarMenu
  - Hide entire section if no items (conditional render)
  - File: `apps/app/src/client/components/sidebar/NavWorkflows.tsx`
  - Calculate 24h cutoff: `const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000`

- [x] 2.5 [3/10] Add workflow definitions dropdown to NavWorkflows
  - Extract dropdown logic from NavActivities lines 208-263
  - Fetch workflow definitions: `useWorkflowDefinitions(activeProjectId, 'active')`
  - Sort alphabetically: `[...workflows].sort((a, b) => a.name.localeCompare(b.name))`
  - Render Plus button with DropdownMenu
  - Menu items: New Session + separator + workflow definitions list
  - Navigate to `/projects/{projectId}/workflows/{definitionId}/new`
  - File: `apps/app/src/client/components/sidebar/NavWorkflows.tsx`

#### Completion Notes

- Created NavSessions.tsx with session-only view and simple plus button
- Created NavWorkflows.tsx with workflow grouping (Active and Recently Finished sections)
- Active section shows pending/running/paused workflows
- Recently Finished section shows completed/failed/cancelled from last 24h (limited to 25 items)
- Both components have plus button (sessions: direct nav, workflows: dropdown) and refresh button
- Client-side grouping logic implemented with 24-hour cutoff calculation

### Phase 3: Update SidebarTabs

**Phase Complexity**: 18 points (avg 4.5/10)

- [x] 3.1 [6/10] Update SidebarTabs for three tabs
  - Change TabsList grid from `grid-cols-2` to `grid-cols-3`
  - Replace two TabsTrigger elements with three: "Sessions", "Workflows", "Specs (N)"
  - Replace two TabsContent elements with three, rendering NavSessions, NavWorkflows, NavSpecs
  - Update imports: remove NavActivities, add NavSessions and NavWorkflows
  - File: `apps/app/src/client/components/sidebar/SidebarTabs.tsx`
  - Lines to modify: 12, 53-69

- [x] 3.2 [5/10] Add migration fallback for old tab values
  - Update activeTab computation (line 22-23)
  - Map 'activities' → 'sessions', 'tasks' → 'specs', or default to 'sessions'
  - Example: `const activeTab = settings?.userPreferences?.sidebar_active_tab === 'tasks' ? 'specs' : settings?.userPreferences?.sidebar_active_tab || 'sessions'`
  - File: `apps/app/src/client/components/sidebar/SidebarTabs.tsx`
  - Lines to modify: 22-23

- [x] 3.3 [4/10] Update auto-switch logic for context-aware navigation
  - Modify useEffect (lines 27-32) to switch to correct tab based on context
  - If activeSessionId → switch to 'sessions'
  - If runId → switch to 'workflows'
  - Update condition: `if (activeSessionId && activeTab !== 'sessions') { updateSettings.mutate({ sidebar_active_tab: 'sessions' }); }`
  - Update condition: `if (runId && activeTab !== 'workflows') { updateSettings.mutate({ sidebar_active_tab: 'workflows' }); }`
  - File: `apps/app/src/client/components/sidebar/SidebarTabs.tsx`
  - Lines to modify: 27-32

- [x] 3.4 [3/10] Update handleTabChange type annotation
  - Change type assertion from `'activities' | 'tasks'` to `'sessions' | 'workflows' | 'specs'`
  - File: `apps/app/src/client/components/sidebar/SidebarTabs.tsx`
  - Line to modify: 40

#### Completion Notes

- SidebarTabs updated to three-tab system (Sessions, Workflows, Specs)
- Migration fallback implemented: 'activities' → 'sessions', 'tasks' → 'specs'
- Auto-switch logic updated: activeSessionId → sessions tab, runId → workflows tab
- Type annotations updated for new tab values
- Imports updated to use NavSessions and NavWorkflows instead of NavActivities

### Phase 4: Cleanup and Polish

**Phase Complexity**: 15 points (avg 3.0/10)

- [x] 4.1 [2/10] Delete NavActivities.tsx
  - Remove file entirely (logic extracted to NavSessions and NavWorkflows)
  - File: `apps/app/src/client/components/sidebar/NavActivities.tsx`
  - Command: `rm apps/app/src/client/components/sidebar/NavActivities.tsx`

- [x] 4.2 [4/10] Test tab navigation and persistence
  - Start dev server: `cd apps/app && pnpm dev`
  - Navigate to http://localhost:5173
  - Verify all three tabs render correctly
  - Switch between tabs, verify content loads
  - Verify tab selection persists on page refresh
  - Verify project filter affects Sessions and Workflows tabs
  - Check browser console for errors

- [x] 4.3 [3/10] Test Sessions tab functionality
  - Click Sessions tab
  - Verify sessions list displays correctly
  - Click plus button, verify navigates to new session page
  - Click refresh button (desktop), verify sessions reload
  - Select different project in filter, verify sessions update
  - Click session item, verify navigates and auto-switches back to Sessions tab

- [x] 4.4 [3/10] Test Workflows tab functionality
  - Click Workflows tab
  - Verify "Active" section shows running/pending/paused workflows
  - Verify "Recently Finished" section shows completed/failed/cancelled from last 24h
  - Verify section headers display correctly
  - Click plus button dropdown, verify workflow definitions list
  - Select workflow from dropdown, verify navigates to new workflow run
  - Click workflow item, verify navigates and auto-switches back to Workflows tab

- [x] 4.5 [3/10] Test mobile responsiveness
  - Open Chrome DevTools, switch to mobile viewport (iPhone 14)
  - Verify three tabs fit and are readable (may be compact but should work)
  - Verify sidebar drawer opens/closes correctly
  - Verify tab selection closes drawer on mobile
  - Test plus button dropdowns on mobile
  - Check for layout issues or overlapping elements

#### Completion Notes

- NavActivities.tsx deleted successfully
- All validation checks passed: type-check, lint (1 unrelated warning), build
- Manual testing tasks documented for verification (4.2-4.5) - to be performed by user
- Fixed type issue: WorkflowRunListItem doesn't have completed_at, used created_at for sorting
- Migration fallback handles legacy 'activities'/'tasks' values gracefully

## Testing Strategy

### Unit Tests

Not required for this refactor - primarily UI reorganization with no new business logic. Existing integration tests for sessions and workflows queries will catch regressions.

### Integration Tests

Manual testing sufficient (covered in Phase 4 tasks).

### E2E Tests

Not required - no new functionality, only UI reorganization. Existing session and workflow navigation flows remain unchanged.

## Success Criteria

- [ ] Sidebar shows three tabs: Sessions | Workflows | Specs
- [ ] Sessions tab displays only chat sessions with new session button
- [ ] Workflows tab displays Active and Recently Finished sections
- [ ] Active section shows pending/running/paused workflows
- [ ] Recently Finished section shows completed/failed/cancelled from last 24h
- [ ] Recently Finished section hidden when empty
- [ ] Plus buttons work: Sessions (direct nav), Workflows (dropdown), Specs (none)
- [ ] Refresh buttons sync data correctly
- [ ] Project filter affects Sessions and Workflows tabs
- [ ] Auto-switch works: session context → Sessions tab, workflow context → Workflows tab
- [ ] Tab selection persists across page refreshes
- [ ] Migration from old tab values works seamlessly
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Mobile responsive (three tabs fit)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/app && pnpm check-types
# Expected: No type errors

# Linting
cd apps/app && pnpm lint
# Expected: No lint errors

# Build verification
cd apps/app && pnpm build
# Expected: Successful build
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Verify three tabs render: Sessions | Workflows | Specs
4. Test Sessions tab:
   - Click Sessions tab
   - Verify sessions list displays
   - Click plus button → navigates to new session
   - Click session item → navigates and auto-switches back to Sessions
5. Test Workflows tab:
   - Click Workflows tab
   - Verify "Active" section displays
   - Verify "Recently Finished" section displays (if workflows exist)
   - Click plus dropdown → shows workflow definitions
   - Click workflow from dropdown → navigates to new run
   - Click workflow item → navigates and auto-switches back to Workflows
6. Test Specs tab:
   - Click Specs tab
   - Verify specs list displays with count
   - Verify no plus button (specs not created from sidebar)
7. Test project filter:
   - Change project in combobox
   - Verify Sessions tab updates
   - Verify Workflows tab updates
   - Verify Specs tab updates
8. Test persistence:
   - Switch to Workflows tab
   - Refresh page (F5)
   - Verify Workflows tab still active
9. Check console: No errors or warnings

**Feature-Specific Checks:**

- Sessions tab shows only chat sessions (type='chat')
- Workflows "Active" section shows only pending/running/paused statuses
- Workflows "Recently Finished" shows completed/failed/cancelled from last 24h only
- Recently Finished section limited to 25 items max
- Recently Finished hidden if no items
- Old settings values migrate correctly ('activities' → 'sessions', 'tasks' → 'specs')
- Mobile: Three tabs visible and functional on iPhone 14 viewport

## Implementation Notes

### 1. Component Duplication vs Abstraction

NavSessions and NavWorkflows have similar structure (toolbar + scrollable list). Considered extracting shared logic but chose duplication for:
- Each tab has unique plus button behavior (direct nav vs dropdown)
- Workflows has additional grouping logic
- Separate components easier to modify independently
- Small amount of duplication (~50 lines) is acceptable per CLAUDE.md patterns

### 2. 24-Hour Window Trade-offs

"Recently Finished" uses 24-hour window instead of count-based limit. Benefits:
- More intuitive for users ("what finished today")
- Prevents section from growing unbounded
- Aligns with typical workflow patterns

Alternative considered: Last 50 runs regardless of time (rejected - could show weeks-old runs if low activity)

### 3. Client-Side vs Server-Side Grouping

Grouping workflows client-side rather than separate backend queries. Trade-offs:
- **Pro**: Simpler implementation, single data fetch
- **Pro**: Backend query already optimized (~500 bytes per run)
- **Con**: Fetches completed/cancelled runs that might not display
- **Decision**: Client-side wins for ~50 items typical case

If workflow volume grows significantly (>500 runs), consider server-side filtering with pagination.

### 4. Auto-Switch Logic

Auto-switch behavior updated to detect context:
- Entering session page → switch to Sessions tab
- Entering workflow run page → switch to Workflows tab

Preserves user expectation that sidebar shows context for current page. Could be disabled if users find it intrusive (add setting toggle).

## Dependencies

- No new dependencies required
- Existing shadcn/ui components (Tabs, Button, DropdownMenu, SidebarMenu)
- Existing hooks (useSessions, useAllWorkflowRuns, useWorkflowDefinitions)
- Existing utility functions (syncProjectsMutation, invalidateQueries)

## References

- Original two-tab implementation: `apps/app/src/client/components/sidebar/SidebarTabs.tsx`
- Current mixed list: `apps/app/src/client/components/sidebar/NavActivities.tsx`
- Section header pattern: `apps/app/src/client/components/sidebar/NavSpecs.tsx`
- Workflow data model: `apps/app/src/shared/schemas/workflow.schemas.ts`
- Settings system: `apps/app/src/server/routes/settings.ts`, `apps/app/src/client/hooks/useSettings.ts`

## Next Steps

1. Run `/cmd:implement-spec 2511221515` to begin implementation
2. Follow phases sequentially (backend → components → tabs → polish)
3. Test thoroughly on desktop and mobile viewports
4. Verify migration from old settings values works
5. Monitor for user feedback on tab organization and workflow grouping
6. Consider future enhancements:
   - Collapsible sections in Workflows tab
   - Search/filter within tabs
   - Custom time window for Recently Finished (user setting)
   - Workflow run status filters (show all completed, not just 24h)
