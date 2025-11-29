# Spec Preview Page with Sidebar Layout

**Status**: draft
**Created**: 2025-11-29
**Package**: apps/app
**Total Complexity**: 78 points
**Phases**: 5
**Tasks**: 19
**Overall Avg Complexity**: 4.1/10

## Complexity Breakdown

| Phase                   | Tasks | Total Points | Avg Complexity | Max Task |
| ----------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Core Components| 4     | 20           | 5.0/10         | 7/10     |
| Phase 2: Page Layout    | 5     | 28           | 5.6/10         | 7/10     |
| Phase 3: Navigation     | 3     | 9            | 3.0/10         | 4/10     |
| Phase 4: Integration    | 4     | 13           | 3.3/10         | 4/10     |
| Phase 5: Cleanup        | 3     | 8            | 2.7/10         | 3/10     |
| **Total**               | **19**| **78**       | **4.1/10**     | **7/10** |

## Overview

Replace modal-based spec viewing with dedicated full-page preview at `/projects/:projectId/specs/:specId`. Features split-pane layout with main content area (2/3 width) for markdown preview/editing and right sidebar (1/3 width) for metadata and actions. All spec clicks navigate to this page instead of workflow creation form.

## User Story

As a developer reviewing specs
I want to see spec content alongside metadata (status, complexity, phases, tasks)
So that I can quickly understand the spec and take actions (create workflow, move, edit) without navigating away

## Technical Approach

1. Create dedicated route `/projects/:projectId/specs/:specId` with SpecPreviewPage component
2. Implement split-pane layout using grid (`md:grid-cols-3` with main as `md:col-span-2`)
3. Reuse existing components: PageHeader, MarkdownPreview, CodeEditor, SegmentedControl
4. Create SpecStatusBadge component for consistent status display
5. Create useSpecContent hook for content fetching with React Query
6. Update all navigation (sidebar, project home) to route to spec preview page
7. Remove SpecFileViewer modal (265 lines deprecated)

## Key Design Decisions

1. **Full Page vs Modal**: Full page provides more space for content + metadata sidebar, enables direct URLs (future sharing), and follows existing WorkflowRunDetailPage pattern
2. **Split-Pane Layout**: Main content (2/3) + sidebar (1/3) organizes information hierarchy better than inline metadata bar
3. **SegmentedControl Toggle**: Keep Edit/Preview toggle from modal for quick mode switching without committing changes
4. **Sidebar Hidden on Mobile**: Desktop-only sidebar with `hidden md:flex` keeps mobile focused on content
5. **Remove Modal Entirely**: Simplify codebase by having one way to view specs (consistency)
6. **Defer Delete Feature**: Delete button disabled for initial implementation (backend service deferred per user request)

## Architecture

### File Structure

```
apps/app/src/
├── client/
│   ├── pages/projects/specs/
│   │   ├── SpecPreviewPage.tsx              # New - Main page component
│   │   ├── components/
│   │   │   └── SpecStatusBadge.tsx          # New - Status badge component
│   │   └── hooks/
│   │       └── useSpecContent.ts            # New - Content fetching hook
│   ├── components/sidebar/
│   │   └── SpecItem.tsx                     # Modified - Navigation updates
│   ├── pages/projects/components/
│   │   └── ProjectHomeSpecs.tsx             # Modified - Navigation updates
│   ├── pages/projects/workflows/components/
│   │   └── SpecFileViewer.tsx               # REMOVED - Modal deprecated
│   └── App.tsx                              # Modified - Add route
```

### Integration Points

**Routing** (`apps/app/src/client/App.tsx`):
- Add route: `/projects/:id/specs/:specId`
- Import SpecPreviewPage component

**Sidebar Navigation** (`apps/app/src/client/components/sidebar/SpecItem.tsx`):
- Update handleClick to navigate to `/projects/:projectId/specs/:specId`
- Update dropdown "View Spec" and "Edit Spec" actions to navigate (not open modal)

**Project Home** (`apps/app/src/client/pages/projects/components/ProjectHomeSpecs.tsx`):
- Replace handleOpenWorkflow with handleSpecClick
- Navigate to spec preview page on card click

**Data Fetching**:
- Reuse existing `useSpecs` hook for spec metadata
- Reuse existing `useProject` hook for breadcrumbs
- New `useSpecContent` hook for content fetching (GET `/api/projects/:id/specs/content`)

## Implementation Details

### 1. SpecPreviewPage Component

Main page component with split-pane layout containing PageHeader, main content area, and metadata sidebar.

**Key Points**:
- Uses React Router params to get `projectId` and `specId`
- Query param `?mode=edit` sets initial view mode
- Fetches spec from cached specs list (useSpecs hook)
- Fetches content separately with useSpecContent hook
- State: viewMode (preview/edit), content (string), saving (boolean), deleteDialogOpen (boolean)
- Main content toggles between MarkdownPreview and CodeEditor based on viewMode
- Sidebar contains actions (Create Run, Move, Delete) and metadata sections
- Delete functionality shows "Coming soon" toast (backend deferred)

### 2. SpecStatusBadge Component

Reusable badge component for displaying spec status with consistent styling.

**Key Points**:
- Maps status values to label and Badge variant
- Supports size prop (sm/md) for different contexts
- Status values: draft, in-progress, review, completed, backlog
- Uses shadcn Badge component with semantic variants

### 3. useSpecContent Hook

React Query hook for fetching spec file content with caching and loading states.

**Key Points**:
- Wraps GET `/api/projects/:id/specs/content?specPath=...`
- Returns `{ data, isLoading, error }` from useQuery
- 30s stale time for caching
- Enabled only when projectId and specPath exist
- Revalidates on window focus (React Query default)

## Files to Create/Modify

### New Files (3)

1. `apps/app/src/client/pages/projects/specs/SpecPreviewPage.tsx` - Main preview page with split-pane layout, PageHeader, content area, and metadata sidebar (~350 lines)
2. `apps/app/src/client/pages/projects/specs/components/SpecStatusBadge.tsx` - Status badge component with semantic variants (~35 lines)
3. `apps/app/src/client/pages/projects/specs/hooks/useSpecContent.ts` - React Query hook for content fetching (~20 lines)

### Modified Files (3)

1. `apps/app/src/client/App.tsx` - Add route for spec preview page (+2 lines: import + route)
2. `apps/app/src/client/components/sidebar/SpecItem.tsx` - Update click handlers to navigate to spec page (~15 lines changed)
3. `apps/app/src/client/pages/projects/components/ProjectHomeSpecs.tsx` - Update card onClick to navigate to spec page (~12 lines changed)

### Removed Files (1)

1. `apps/app/src/client/pages/projects/workflows/components/SpecFileViewer.tsx` - Modal viewer no longer needed (265 lines removed)

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Core Components

**Phase Complexity**: 20 points (avg 5.0/10)

- [ ] 1.1 [4/10] Create useSpecContent hook
  - Create file `apps/app/src/client/pages/projects/specs/hooks/useSpecContent.ts`
  - Import useQuery from @tanstack/react-query and api from utils
  - Define fetchSpecContent async function (GET with specPath query param)
  - Export useSpecContent hook with queryKey, queryFn, enabled, staleTime
  - Return type: `{ data: string, isLoading: boolean, error: any }`

- [ ] 1.2 [3/10] Create SpecStatusBadge component
  - Create file `apps/app/src/client/pages/projects/specs/components/SpecStatusBadge.tsx`
  - Define SpecStatus type: "draft" | "in-progress" | "review" | "completed" | "backlog"
  - Create statusConfig mapping status to label and Badge variant
  - Component accepts status and optional size prop
  - Return Badge component with appropriate variant and className

- [ ] 1.3 [6/10] Create SpecPreviewPage component structure
  - Create file `apps/app/src/client/pages/projects/specs/SpecPreviewPage.tsx`
  - Import required components: PageHeader, MarkdownPreview, CodeEditor, SegmentedControl
  - Set up React Router hooks: useParams, useNavigate, useSearchParams
  - Set up state: viewMode, content, saving, deleteDialogOpen
  - Fetch spec from useSpecs hook, project from useProject hook
  - Load content with useSpecContent hook, initialize state on mount
  - Add redirect logic if spec not found

- [ ] 1.4 [7/10] Implement PageHeader with actions
  - Configure PageHeader with breadcrumbs (Project > Specs > Name)
  - Set title to spec.name
  - Add SpecStatusBadge in afterTitle
  - Add SegmentedControl for Edit/Preview toggle
  - Conditionally show Save button when viewMode is "edit"
  - Implement handleSave: POST to /api/projects/:id/specs/content
  - Handle saving state and success/error feedback with toast

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Page Layout and Sidebar

**Phase Complexity**: 28 points (avg 5.6/10)

- [ ] 2.1 [5/10] Implement split-pane layout structure
  - Add main container: `<div className="flex h-full flex-col">`
  - Add grid container: `<div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">`
  - Add main content section: `<div className="md:col-span-2 flex flex-col overflow-hidden border-r">`
  - Add sidebar section: `<div className="hidden md:flex flex-col overflow-hidden">`
  - Ensure each section has proper overflow handling (parent overflow-hidden, child overflow-y-auto)

- [ ] 2.2 [6/10] Implement main content area with view modes
  - Add section header (desktop only): "Specification" or "Edit Specification"
  - Conditionally render based on viewMode
  - Preview mode: Render MarkdownPreview component with content
  - Edit mode: Render CodeEditor with value, onChange, language="markdown", height="100%"
  - Wrap content in scrollable container: `<div className="flex-1 overflow-y-auto">`

- [ ] 2.3 [7/10] Implement sidebar actions section
  - Add fixed header with "Actions" label or no label (just buttons)
  - Add "Create Workflow Run" button (full width, primary)
  - Implement handleCreateWorkflowRun: navigate to workflow form with spec pre-populated
  - Add "Move to..." dropdown with Todo/Done/Backlog options
  - Implement handleMove: POST to /api/projects/:id/specs/:specId/move, invalidate cache, show toast
  - Add "Delete Spec" button (full width, destructive styling)
  - Set onClick to open delete confirmation dialog (disable button for now per requirement)

- [ ] 2.4 [5/10] Implement sidebar metadata sections
  - Add "Details" section with definition list (grid-cols-[100px_1fr])
  - Display: Status badge, Type (capitalize), Complexity (if exists)
  - Add "Phases" section (if spec.phases exists and length > 0)
  - Render phase cards with name and description
  - Add "Tasks" section (if spec.tasks exists and length > 0)
  - Display first 5 tasks with completion indicators, show "+X more" if > 5
  - Add "Timeline" section with Created and Updated dates (formatted)

- [ ] 2.5 [5/10] Add delete confirmation dialog
  - Import AlertDialog components from ui
  - Add AlertDialog with open state controlled by deleteDialogOpen
  - Set title: "Delete spec?"
  - Set description warning about permanent deletion
  - Add Cancel button (closes dialog)
  - Add Delete button (destructive styling)
  - For now: Show toast "Delete functionality coming soon" instead of actual deletion
  - When backend ready: Implement DELETE /api/projects/:id/specs/:specId, invalidate cache, navigate home

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Navigation Updates

**Phase Complexity**: 9 points (avg 3.0/10)

- [ ] 3.1 [3/10] Update sidebar navigation (SpecItem.tsx)
  - File: `apps/app/src/client/components/sidebar/SpecItem.tsx`
  - Update handleClick (line ~50): Change navigate call to `/projects/${spec.projectId}/specs/${spec.id}`
  - Update "View Spec" dropdown action (line ~156): Navigate to spec page
  - Update "Edit Spec" dropdown action (line ~163): Navigate to spec page with `?mode=edit` query param
  - Remove viewerOpen state and SpecFileViewer modal usage (lines ~41-42, ~194-202)

- [ ] 3.2 [4/10] Update project home navigation (ProjectHomeSpecs.tsx)
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeSpecs.tsx`
  - Replace handleOpenWorkflow function (lines ~47-55) with handleSpecClick
  - New function signature: `handleSpecClick(specId: string, projectId: string)`
  - Navigate to `/projects/${projectId}/specs/${specId}`
  - Update card onClick (line ~103): Call handleSpecClick(task.id, task.projectId)

- [ ] 3.3 [2/10] Add route to App.tsx
  - File: `apps/app/src/client/App.tsx`
  - Import SpecPreviewPage: `import SpecPreviewPage from "@/client/pages/projects/specs/SpecPreviewPage";`
  - Add route after line ~56 inside ProjectLoader routes
  - Route definition: `<Route path="specs/:specId" element={<SpecPreviewPage />} />`
  - Verify route is within `/projects/:id` parent route for proper nesting

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 4: Integration and Polish

**Phase Complexity**: 13 points (avg 3.3/10)

- [ ] 4.1 [4/10] Add loading and error states
  - In SpecPreviewPage, handle spec not found case (redirect with toast)
  - Add loading skeleton while fetching spec content
  - Display error message if content fetch fails
  - Add loading state to Save button when saving
  - Add success feedback when save completes (toast + exit edit mode)

- [ ] 4.2 [3/10] Handle URL mode parameter
  - Read `mode` query parameter on mount: `searchParams.get("mode")`
  - Set initialMode to "edit" if mode=edit, otherwise "preview"
  - Initialize viewMode state with initialMode
  - Ensures ?mode=edit from navigation opens in edit mode

- [ ] 4.3 [3/10] Implement cache invalidation
  - After moving spec: `queryClient.invalidateQueries({ queryKey: ["specs"] })`
  - After deleting spec (when implemented): Invalidate specs query
  - After saving content: `queryClient.invalidateQueries({ queryKey: ["spec-content"] })`
  - Ensures UI reflects latest data after mutations

- [ ] 4.4 [3/10] Add keyboard shortcuts and accessibility
  - Cmd/Ctrl+S to save in edit mode (handleKeyDown listener)
  - Escape to cancel edit mode (return to preview)
  - Ensure SegmentedControl is keyboard navigable (already handled by component)
  - Add proper ARIA labels to action buttons
  - Verify focus management when switching modes

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 5: Cleanup and Testing

**Phase Complexity**: 8 points (avg 2.7/10)

- [ ] 5.1 [3/10] Remove SpecFileViewer modal
  - Delete file: `apps/app/src/client/pages/projects/workflows/components/SpecFileViewer.tsx`
  - Remove all imports of SpecFileViewer from codebase
  - Verify no references remain (search codebase for "SpecFileViewer")
  - Remove unused modal-related state from SpecItem.tsx if any

- [ ] 5.2 [3/10] Manual testing - navigation flows
  - Test sidebar click: Spec → Preview page
  - Test project home click: Spec card → Preview page
  - Test right-click "View Spec": Opens preview page
  - Test right-click "Edit Spec": Opens preview page in edit mode
  - Test "Create Workflow Run": Navigates to workflow form with spec pre-filled
  - Test "Move to...": Moves spec, updates sidebar, shows toast
  - Verify breadcrumbs work: Navigate back to project

- [ ] 5.3 [2/10] Manual testing - edit and save flow
  - Open spec in preview mode
  - Toggle to edit mode (SegmentedControl)
  - Verify CodeEditor appears with content
  - Make changes to content
  - Click Save button
  - Verify saving state shows, success toast appears
  - Verify mode switches back to preview with updated content
  - Refresh page, verify changes persisted

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

Not required for initial implementation - primarily UI integration. Consider adding tests for:

- **useSpecContent hook** - Mock API response, verify query configuration
- **SpecStatusBadge component** - Verify correct variant for each status

### Integration Tests

Not required for initial implementation. Consider adding tests for:

- **Navigation flow** - Verify routing from sidebar/project home to spec page
- **Save functionality** - Mock API, verify POST request on save

### E2E Tests

**`apps/app/e2e/specs/spec-preview.spec.ts`** - Spec preview page flow:

```typescript
test("navigate to spec and view content", async ({ page }) => {
  // Navigate to project
  // Click spec in sidebar
  // Verify URL matches /projects/:id/specs/:specId
  // Verify spec content rendered
  // Verify metadata sidebar visible (desktop)
});

test("edit spec and save changes", async ({ page }) => {
  // Navigate to spec page
  // Click Edit in SegmentedControl
  // Modify content in CodeEditor
  // Click Save
  // Verify success toast
  // Verify preview mode shows updated content
});

test("create workflow from spec", async ({ page }) => {
  // Navigate to spec page
  // Click "Create Workflow Run" in sidebar
  // Verify navigation to workflow form
  // Verify spec pre-populated in form
});

test("move spec to different folder", async ({ page }) => {
  // Navigate to spec page
  // Click "Move to..." dropdown
  // Select "Done" folder
  // Verify success toast
  // Verify spec moved in sidebar
});
```

## Success Criteria

- [ ] All spec clicks (sidebar, project home, context menu) navigate to spec preview page
- [ ] Spec preview page displays markdown content with proper formatting
- [ ] Metadata sidebar shows status, type, complexity, phases, tasks, timeline (desktop)
- [ ] Edit/Preview toggle works - switches between MarkdownPreview and CodeEditor
- [ ] Save functionality persists changes and returns to preview mode
- [ ] "Create Workflow Run" button navigates to workflow form with spec pre-populated
- [ ] "Move to..." dropdown moves spec to different folder and updates UI
- [ ] Delete button shows "Coming soon" toast (functionality deferred)
- [ ] Page responsive: sidebar hidden on mobile, content full width
- [ ] SpecFileViewer modal removed, no references remain
- [ ] Type checking passes: `pnpm check-types`
- [ ] Build succeeds: `pnpm build`
- [ ] No console errors when navigating and interacting with page

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
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `pnpm dev` (from apps/app)
2. Navigate to: `http://localhost:4101/projects/:projectId`
3. **Test sidebar navigation**:
   - Click any spec in sidebar
   - Verify: URL changes to `/projects/:projectId/specs/:specId`
   - Verify: Spec content rendered in main area
   - Verify: Metadata sidebar visible on desktop (status, complexity, phases, tasks)
4. **Test project home navigation**:
   - Navigate to project home
   - Click "Specs" tab
   - Click any spec card
   - Verify: Navigate to spec preview page
5. **Test edit mode**:
   - Click "Edit" in SegmentedControl
   - Verify: CodeEditor appears with spec content
   - Make text changes
   - Click "Save" button
   - Verify: Success toast, mode switches to preview, changes visible
6. **Test actions**:
   - Click "Create Workflow Run" in sidebar
   - Verify: Navigate to workflow form, spec pre-filled
   - Go back to spec page
   - Click "Move to..." dropdown, select folder
   - Verify: Success toast, spec moved in sidebar
7. **Test responsiveness**:
   - Resize browser to mobile width (<768px)
   - Verify: Sidebar hidden, content full width
   - Verify: Edit/Preview toggle still visible in header
8. Check console: No errors or warnings

**Feature-Specific Checks:**

- Breadcrumbs display correctly and navigate properly
- Status badge shows correct variant (draft/in-progress/review/completed/backlog)
- Phase cards render with name and description if phases exist
- Task list shows first 5 tasks with completion status
- Delete button shows "Coming soon" toast when clicked
- Right-click "Edit Spec" opens page with `?mode=edit` in URL
- Keyboard shortcuts work: Cmd+S to save in edit mode

## Implementation Notes

### 1. Mobile Sidebar Handling

Sidebar is completely hidden on mobile (`hidden md:flex`). Metadata not accessible on mobile in initial implementation. Future enhancement could add mobile drawer/sheet accessible via button in header.

### 2. Delete Functionality Deferred

Delete button present in sidebar but shows "Coming soon" toast when clicked. Backend DELETE endpoint and deleteSpec service deferred per user request. When implementing:
- Create `apps/app/src/server/domain/spec/services/deleteSpec.ts`
- Add DELETE `/api/projects/:projectId/specs/:specId` route
- Delete spec folder and update index.json
- Invalidate specs cache

### 3. Content Fetching Strategy

Spec metadata fetched from useSpecs hook (cached list). Content fetched separately with useSpecContent hook. This allows fast initial render of page structure while content loads progressively. 30s stale time balances freshness and cache performance.

### 4. Modal Removal Impact

SpecFileViewer modal used only from SpecItem context menu. Removing it simplifies codebase (one way to view specs) and ensures consistent UX. All view/edit actions now navigate to dedicated page.

### 5. Route Nesting

Route must be nested under `/projects/:id` parent route to access ProjectLoader context. This provides access to project data via useProject hook for breadcrumbs and validation.

## Dependencies

- No new dependencies required
- Uses existing components: PageHeader, MarkdownPreview, CodeEditor, SegmentedControl, Badge, Button, DropdownMenu, AlertDialog
- Uses existing hooks: useParams, useNavigate, useQueryClient, useSpecs, useProject
- Uses existing API: GET/POST /api/projects/:id/specs/content

## References

- Similar pattern: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx` (split-pane layout)
- Existing modal: `apps/app/src/client/pages/projects/workflows/components/SpecFileViewer.tsx` (to be removed)
- Navigation: `apps/app/src/client/components/sidebar/SpecItem.tsx` and `apps/app/src/client/pages/projects/components/ProjectHomeSpecs.tsx`
- Plan document: `.claude/plans/cryptic-squishing-teapot.md`

## Next Steps

1. Implement Phase 1: Create hooks and components (useSpecContent, SpecStatusBadge, SpecPreviewPage structure)
2. Implement Phase 2: Build page layout (split-pane, content area, sidebar sections)
3. Implement Phase 3: Update navigation (sidebar, project home, add route)
4. Implement Phase 4: Add polish (loading states, error handling, cache invalidation)
5. Implement Phase 5: Remove modal, test all flows
6. Run validation commands and manual testing checklist
7. Create PR with spec reference
