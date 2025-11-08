# Unified Sidebar Redesign

**Status**: draft
**Created**: 2025-11-08
**Package**: apps/app
**Total Complexity**: 84 points
**Phases**: 4
**Tasks**: 21
**Overall Avg Complexity**: 4.0/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Mock Data & Component Structure | 4 | 14 | 3.5/10 | 5/10 |
| Phase 2: Core Sidebar Sections | 6 | 35 | 5.8/10 | 7/10 |
| Phase 3: Layout Integration | 4 | 18 | 4.5/10 | 6/10 |
| Phase 4: Settings Persistence | 7 | 17 | 2.4/10 | 4/10 |
| **Total** | **21** | **84** | **4.0/10** | **7/10** |

## Overview

Consolidate two sidebars (AppSidebarMain + AppInnerSidebar) into one unified sidebar following shadcn/ui patterns. Move user nav to footer, add Tasks section (pending specs), unified Activities section (sessions + workflows), and improved Projects section. Use mock data first, integrate real data after UX approval.

## User Story

As a user
I want a single, unified sidebar with quick access to tasks, activities, and projects
So that I can efficiently navigate my work and see pending tasks at a glance

## Technical Approach

Replace two-sidebar layout with single sidebar using shadcn/ui SidebarProvider pattern. Build with mock data first for UX validation, then connect real data via API endpoints and WebSocket subscriptions. Store view preferences (activity filter, projects view) in user settings JSON field.

## Key Design Decisions

1. **Mock data first**: Build entire UI with mock data before connecting endpoints - allows UX iteration without backend changes
2. **User settings for filters**: Store `activity_filter` and `projects_view` in existing `User.settings` JSON field
3. **WebSocket file listeners**: Add file watchers per active project for spec file changes
4. **Hide workflow-attached sessions**: Filter sessions where `workflowRunId` exists to avoid duplicates in Activities

## Architecture

### File Structure

```
apps/app/src/client/components/sidebar/
├── AppSidebar.tsx              # Main unified sidebar
├── SidebarHeader.tsx           # Logo + "agentcmd" name
├── NewButton.tsx               # Dropdown: New Workflow | New Session
├── nav-tasks.tsx               # Tasks section (kebab-case, shadcn pattern)
├── nav-activities.tsx          # Activities section with filter
├── nav-projects.tsx            # Projects section (reuse existing logic)
├── nav-user.tsx                # User nav (moved to footer)
├── types.ts                    # Mock types
└── mock-data.ts                # Sample data

apps/app/src/shared/schemas/
├── user.schemas.ts             # Extended UserPreferences type
```

### Integration Points

**Frontend**:
- `apps/app/src/client/components/AppSidebar.tsx` - Replace with new unified sidebar
- `apps/app/src/client/components/NavUser.tsx` - Move to sidebar/nav-user.tsx
- `apps/app/src/client/hooks/useSettings.ts` - Extend UserPreferences interface
- `apps/app/src/client/layouts/ProtectedLayout.tsx` - Update sidebar width
- `apps/app/src/client/layouts/WorkflowLayout.tsx` - Maintain collapsible behavior

**Backend (Phase 5 - Post-UX approval)**:
- `apps/app/src/server/routes/settings.routes.ts` - Support new settings fields
- `apps/app/src/server/routes/specs.routes.ts` - New endpoint for parsing index.json

## Implementation Details

### 1. Sidebar Header

Simple header with logo icon and "agentcmd" text. No complex navigation like current AppSidebarMain.

**Key Points**:
- Use Command icon from lucide-react
- Text: "agentcmd"
- Clean, minimal design

### 2. New Button

Dropdown button for creating new workflows or sessions.

**Key Points**:
- Single button with dropdown
- Options: "New Workflow" → navigate to workflows page, "New Session" → trigger NewSessionButton
- Position: Below header, above sections

### 3. Tasks Section

Shows pending tasks from `.agent/specs/todo/` for active project only.

**Key Points**:
- Collapsible section (SidebarGroup + Collapsible)
- List spec files from mock data
- "View" button → opens NewRunDialog with spec pre-populated
- Empty state: "No pending tasks"
- Mock data structure: `{ id, title, specPath, projectId, status: 'pending' }`

### 4. Activities Section

Unified list of sessions and workflows with filter toggle.

**Key Points**:
- Filter toggle: All | Sessions | Workflows (stored in user settings)
- Merge sessions + workflows, sort by most recent
- Hide sessions where `workflowRunId` exists
- Click → navigate to detail page
- Real-time status badges (mocked initially)
- Empty state: "No recent activity"
- Mock data structure: `{ id, type: 'session'|'workflow', name, status, updatedAt, projectId, workflowRunId? }`

### 5. Projects Section

Reuse existing AppInnerSidebar logic with view toggle.

**Key Points**:
- Toggle: All | Favorites | Hidden (stored in user settings)
- Default to Favorites if any exist, else All
- Keep collapsible project behavior
- Keep session nesting under active project
- Empty state: "No projects"

### 6. User Navigation Footer

Move NavUser to SidebarFooter position.

**Key Points**:
- Use existing NavUser component
- Position at bottom via SidebarFooter
- Same dropdown functionality (Settings, Version, Logout)

## Files to Create/Modify

### New Files (8)

1. `apps/app/src/client/components/sidebar/AppSidebar.tsx` - New unified sidebar container
2. `apps/app/src/client/components/sidebar/SidebarHeader.tsx` - Logo + name header
3. `apps/app/src/client/components/sidebar/NewButton.tsx` - New workflow/session dropdown
4. `apps/app/src/client/components/sidebar/nav-tasks.tsx` - Tasks section
5. `apps/app/src/client/components/sidebar/nav-activities.tsx` - Activities section with filter
6. `apps/app/src/client/components/sidebar/nav-projects.tsx` - Projects section wrapper
7. `apps/app/src/client/components/sidebar/types.ts` - Mock type definitions
8. `apps/app/src/client/components/sidebar/mock-data.ts` - Sample mock data

### Modified Files (5)

1. `apps/app/src/client/components/AppSidebar.tsx` - Replace with import from sidebar/AppSidebar
2. `apps/app/src/client/components/NavUser.tsx` - Move to sidebar/nav-user.tsx
3. `apps/app/src/client/hooks/useSettings.ts` - Extend UserPreferences interface
4. `apps/app/src/client/layouts/ProtectedLayout.tsx` - Update sidebar width if needed
5. `apps/app/src/client/layouts/WorkflowLayout.tsx` - Ensure collapsible behavior works

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Mock Data & Component Structure

**Phase Complexity**: 14 points (avg 3.5/10)

<!-- prettier-ignore -->
- [ ] 1.1 [3/10] Create sidebar folder structure
  - Create `apps/app/src/client/components/sidebar/` directory
  - File: `apps/app/src/client/components/sidebar/`
  - `mkdir -p apps/app/src/client/components/sidebar`
- [ ] 1.2 [5/10] Define mock types and data
  - Create types.ts with TaskItem, ActivityItem interfaces
  - Create mock-data.ts with sample tasks, activities, projects
  - Include all fields needed for UI (id, name, status, timestamps, etc.)
  - File: `apps/app/src/client/components/sidebar/types.ts`
  - File: `apps/app/src/client/components/sidebar/mock-data.ts`
- [ ] 1.3 [3/10] Create SidebarHeader component
  - Logo (Command icon) + "agentcmd" text
  - Use SidebarHeader from shadcn/ui
  - File: `apps/app/src/client/components/sidebar/SidebarHeader.tsx`
- [ ] 1.4 [3/10] Move NavUser to sidebar folder
  - Copy existing NavUser.tsx to sidebar/nav-user.tsx (kebab-case)
  - No functionality changes, just relocation
  - File: `apps/app/src/client/components/sidebar/nav-user.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Core Sidebar Sections

**Phase Complexity**: 35 points (avg 5.8/10)

<!-- prettier-ignore -->
- [ ] 2.1 [5/10] Create NewButton dropdown component
  - Dropdown with "New Workflow" and "New Session" options
  - Use DropdownMenu from shadcn/ui
  - New Workflow → navigate to `/projects/:projectId/workflows`
  - New Session → trigger NewSessionButton component
  - File: `apps/app/src/client/components/sidebar/NewButton.tsx`
- [ ] 2.2 [7/10] Create nav-tasks.tsx with mock data
  - Collapsible SidebarGroup
  - List pending tasks from mock data
  - "View" button per task
  - Empty state component
  - Filter by active projectId
  - File: `apps/app/src/client/components/sidebar/nav-tasks.tsx`
- [ ] 2.3 [7/10] Create nav-activities.tsx with filter toggle
  - Filter toggle UI (All | Sessions | Workflows)
  - Unified list component with status badges
  - Sort by updatedAt descending
  - Filter out sessions with workflowRunId
  - Click handlers for navigation
  - Empty state component
  - File: `apps/app/src/client/components/sidebar/nav-activities.tsx`
- [ ] 2.4 [6/10] Create nav-projects.tsx wrapper
  - Extract project list logic from AppInnerSidebar
  - Add view toggle (All | Favorites | Hidden)
  - Reuse existing Collapsible project behavior
  - Keep session nesting under active project
  - Add empty state
  - File: `apps/app/src/client/components/sidebar/nav-projects.tsx`
- [ ] 2.5 [5/10] Wire filter state to mock useState
  - Add useState for activityFilter in nav-activities
  - Add useState for projectsView in nav-projects
  - Apply filters to mock data
  - File: Both nav-activities.tsx and nav-projects.tsx
- [ ] 2.6 [5/10] Create unified AppSidebar container
  - Use SidebarProvider pattern from shadcn/ui
  - Compose: SidebarHeader, NewButton, SidebarContent (tasks, activities, projects), SidebarFooter (nav-user)
  - Accept collapsible prop for WorkflowLayout
  - File: `apps/app/src/client/components/sidebar/AppSidebar.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Layout Integration

**Phase Complexity**: 18 points (avg 4.5/10)

<!-- prettier-ignore -->
- [ ] 3.1 [6/10] Update main AppSidebar.tsx wrapper
  - Replace two-sidebar composition with new unified sidebar
  - Import from sidebar/AppSidebar
  - Remove AppSidebarMain and AppInnerSidebar imports
  - Pass through collapsible prop
  - File: `apps/app/src/client/components/AppSidebar.tsx`
- [ ] 3.2 [4/10] Update ProtectedLayout
  - Verify sidebar width (350px already correct)
  - Test sidebar displays correctly
  - File: `apps/app/src/client/layouts/ProtectedLayout.tsx`
- [ ] 3.3 [4/10] Update WorkflowLayout
  - Verify collapsible="offcanvas" prop works
  - Verify defaultOpen={false} behavior
  - Test sidebar hidden by default
  - File: `apps/app/src/client/layouts/WorkflowLayout.tsx`
- [ ] 3.4 [4/10] Test mobile behavior
  - Verify sidebar hidden on mobile
  - Test Sheet overlay if needed
  - Check useSidebar().isMobile usage
  - File: Multiple layout files

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Settings Persistence

**Phase Complexity**: 17 points (avg 2.4/10)

<!-- prettier-ignore -->
- [ ] 4.1 [3/10] Extend UserPreferences interface
  - Add activity_filter?: 'all' | 'sessions' | 'workflows'
  - Add projects_view?: 'all' | 'favorites' | 'hidden'
  - File: `apps/app/src/client/hooks/useSettings.ts`
- [ ] 4.2 [4/10] Connect nav-activities filter to settings
  - Import useSettings and useUpdateSettings hooks
  - Replace useState with settings value
  - Update settings on filter change
  - File: `apps/app/src/client/components/sidebar/nav-activities.tsx`
- [ ] 4.3 [4/10] Connect nav-projects view to settings
  - Import useSettings and useUpdateSettings hooks
  - Replace useState with settings value
  - Update settings on view change
  - File: `apps/app/src/client/components/sidebar/nav-projects.tsx`
- [ ] 4.4 [2/10] Update settings route schema validation
  - Add new fields to PATCH /api/settings schema
  - File: `apps/app/src/server/routes/settings.routes.ts`
- [ ] 4.5 [2/10] Update Prisma User.settings type hints
  - Document new settings fields in comments
  - File: `apps/app/prisma/schema.prisma`
- [ ] 4.6 [1/10] Test settings persistence
  - Change filters, refresh page, verify persistence
  - Check localStorage or DB depending on implementation
- [ ] 4.7 [1/10] Clean up old sidebar files
  - Remove or deprecate AppSidebarMain.tsx
  - Remove or deprecate AppInnerSidebar.tsx
  - Update imports across codebase
  - Files: `apps/app/src/client/components/AppSidebarMain.tsx`, `apps/app/src/client/components/AppInnerSidebar.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`nav-activities.test.tsx`** - Test activity filtering logic:

```typescript
describe('NavActivities', () => {
  it('filters sessions only', () => {
    // Test filter='sessions' shows only session items
  });

  it('filters workflows only', () => {
    // Test filter='workflows' shows only workflow items
  });

  it('hides workflow-attached sessions', () => {
    // Test sessions with workflowRunId are filtered out
  });

  it('sorts by most recent', () => {
    // Test items sorted by updatedAt descending
  });
});
```

**`nav-projects.test.tsx`** - Test project view toggle:

```typescript
describe('NavProjects', () => {
  it('shows favorites when view=favorites', () => {
    // Test only starred projects displayed
  });

  it('defaults to favorites if any exist', () => {
    // Test default view behavior
  });
});
```

### Integration Tests

- Test sidebar renders all sections with mock data
- Test NewButton dropdown navigates correctly
- Test Tasks section opens NewRunDialog
- Test Activities navigation to session/workflow pages
- Test Projects collapsible behavior
- Test filter persistence in settings

### E2E Tests

**`sidebar-navigation.spec.ts`** - Test complete sidebar flows:

```typescript
test('can navigate using new unified sidebar', async ({ page }) => {
  // Login
  // Click task → verify NewRunDialog opens
  // Click activity → verify navigation
  // Toggle filters → verify URL or state updates
  // Verify settings persist after refresh
});
```

## Success Criteria

- [ ] Single unified sidebar replaces two-sidebar layout
- [ ] User nav displayed at bottom in SidebarFooter
- [ ] Tasks section shows mock pending specs for active project
- [ ] Activities section shows unified sessions + workflows with filter
- [ ] Activities filter persists in user settings
- [ ] Projects section has view toggle (all/favorites/hidden)
- [ ] Projects view persists in user settings
- [ ] Sidebar hidden on mobile
- [ ] Sidebar hidden by default in workflows layout
- [ ] All navigation works (tasks, activities, projects)
- [ ] Empty states display correctly
- [ ] Type safety maintained (no TypeScript errors)
- [ ] Build succeeds without warnings
- [ ] Manual testing confirms UX feels intuitive

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm --filter apps/app build
# Expected: Build completes without errors

# Type checking
pnpm --filter apps/app check-types
# Expected: No type errors

# Linting
pnpm --filter apps/app lint
# Expected: No lint errors or only auto-fixable warnings

# Unit tests (if created)
pnpm --filter apps/app test
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `pnpm --filter apps/app dev`
2. Navigate to: `http://localhost:5173/projects`
3. Verify: Single sidebar visible with all sections (Header, New Button, Tasks, Activities, Projects, User Nav at bottom)
4. Test Tasks section:
   - Verify mock tasks display
   - Click "View" → verify behavior (mock for now)
   - Verify empty state if no tasks
5. Test Activities section:
   - Toggle filter (All/Sessions/Workflows)
   - Verify filter persists after page refresh
   - Click activity item → verify navigation (mock for now)
   - Verify empty state if no activities
6. Test Projects section:
   - Toggle view (All/Favorites/Hidden)
   - Verify view persists after page refresh
   - Expand/collapse projects
   - Verify sessions nest under active project
7. Test User Nav:
   - Verify positioned at bottom
   - Click → verify dropdown works
   - Test Settings, Logout
8. Test layouts:
   - Navigate to `/projects/:id` → sidebar visible
   - Navigate to `/projects/:id/workflows/:runId` → sidebar hidden by default
   - Toggle sidebar in workflows → verify slides in
9. Test mobile (resize browser):
   - Verify sidebar hidden on mobile
   - Verify Sheet overlay if triggered
10. Check console: No errors or warnings

**Feature-Specific Checks:**

- Verify settings API accepts new fields (activity_filter, projects_view)
- Verify User.settings JSON stores new fields
- Verify filter state restores from settings on mount
- Verify old AppSidebarMain and AppInnerSidebar no longer in use

## Implementation Notes

### 1. Mock Data First

Build entire UI with mock data before connecting real endpoints. This allows UX iteration without backend coupling. Once approved, connect real data in Phase 5.

### 2. Kebab-Case for nav-* Components

Following shadcn/ui convention, use kebab-case for nav-tasks, nav-activities, nav-projects, nav-user (matches components/ui/ pattern).

### 3. Collapsible Prop Passthrough

Ensure new AppSidebar accepts collapsible prop to support WorkflowLayout's offcanvas mode.

### 4. Filter Persistence

Store filters in User.settings JSON field. Backend already supports PATCH /api/settings with arbitrary JSON. Just add validation for new fields.

## Dependencies

- No new npm dependencies required
- Existing dependencies: shadcn/ui components, lucide-react icons, TanStack Query, Zustand

## References

- shadcn/ui Sidebar blocks: https://ui.shadcn.com/blocks/sidebar
- Current AppSidebarMain: `apps/app/src/client/components/AppSidebarMain.tsx`
- Current AppInnerSidebar: `apps/app/src/client/components/AppInnerSidebar.tsx`
- NavUser component: `apps/app/src/client/components/NavUser.tsx`
- Settings hook: `apps/app/src/client/hooks/useSettings.ts`

## Next Steps

1. Create sidebar folder and mock data (Phase 1)
2. Build core sidebar sections with mock data (Phase 2)
3. Integrate into layouts and test (Phase 3)
4. Connect settings persistence (Phase 4)
5. Get UX approval on mock data design
6. Phase 5 (post-approval): Connect real data via API endpoints and WebSocket
7. Phase 6 (post-approval): Add file watchers for spec changes
8. Phase 7 (post-approval): Wire up NewRunDialog integration for Tasks section
