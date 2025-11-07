# Frontend Workflow Route Refactor: Definition + Execution Views

**Status**: draft
**Created**: 2025-01-03
**Package**: apps/web
**Estimated Effort**: 2-3 hours

## Overview

Refactor the workflow UI to use a two-page routing structure: one page for viewing workflow definitions with a Kanban board of all executions, and another page for viewing detailed execution information including steps, logs, and comments.

## User Story

As a user viewing workflows
I want to see the workflow definition with all executions in a Kanban board, then navigate to detailed execution views
So that I can understand the workflow structure and monitor individual execution progress without confusion

## Technical Approach

Implement a nested routing structure where the workflow definition page (`/projects/:projectId/workflows/:definitionId`) displays the Kanban board (current behavior), and clicking an execution card navigates to a new execution detail page (`/projects/:projectId/workflows/:definitionId/executions/:executionId`) that shows steps, logs, comments, and control buttons.

This refactor primarily involves:
1. Adding a new API endpoint to fetch workflow definitions by ID
2. Creating a new React hook for fetching definitions
3. Renaming and refactoring `WorkflowDetail.tsx` to `WorkflowDefinitionView.tsx`
4. Creating a new `WorkflowRunDetail.tsx` page component
5. Updating route definitions and navigation

## Key Design Decisions

1. **Two-Page Flow**: Separate pages for definition (Kanban) vs execution (detail) rather than modal
   - **Rationale**: Better for deep linking, browser history, and mobile UX
2. **Keep Current Kanban**: Reuse existing `WorkflowPhaseKanbanColumn` components
   - **Rationale**: Already working well, no need to rebuild
3. **Minimal Backend Changes**: Only add one new endpoint (`GET /api/workflow-definitions/:id`)
   - **Rationale**: Execution endpoints already return `workflow_definition` via Prisma include
4. **Use React Router Navigation**: Standard navigation instead of modal state management
   - **Rationale**: Simpler state management, better UX with back button

## Architecture

### File Structure

```
apps/web/
├── src/
│   ├── server/
│   │   ├── domain/workflow/services/
│   │   │   ├── getWorkflowDefinitionById.ts  # NEW - Fetch definition by ID
│   │   │   └── index.ts                       # MODIFIED - Export new function
│   │   └── routes/
│   │       └── workflows.ts                   # MODIFIED - Add GET /api/workflow-definitions/:id
│   │
│   └── client/
│       ├── App.tsx                            # MODIFIED - Update route structure
│       └── pages/projects/workflows/
│           ├── WorkflowDefinitionView.tsx     # RENAMED from WorkflowDetail.tsx
│           ├── WorkflowRunDetail.tsx    # NEW - Execution detail page
│           ├── components/
│           │   ├── WorkflowRunHeader.tsx      # NEW - Execution header component
│           │   ├── WorkflowRunStepsList.tsx   # NEW - Steps list component
│           │   └── WorkflowRunComments.tsx    # NEW - Comments component
│           └── hooks/
│               └── useWorkflowDefinition.ts   # NEW - Fetch single definition
```

### Integration Points

**Backend**:
- `apps/web/src/server/domain/workflow/services/getWorkflowDefinitionById.ts` - New service function
- `apps/web/src/server/routes/workflows.ts` - Add new GET endpoint

**Frontend**:
- `apps/web/src/client/App.tsx` - Update route definitions
- `apps/web/src/client/pages/projects/workflows/WorkflowDefinitionView.tsx` - Refactored from WorkflowDetail.tsx
- `apps/web/src/client/pages/projects/workflows/WorkflowRunDetail.tsx` - New execution detail page
- `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowDefinition.ts` - New hook

## Implementation Details

### 1. Backend API Endpoint

**New Endpoint**: `GET /api/workflow-definitions/:id`

Returns a single workflow definition by ID. This is needed because the current implementation fetches an execution first just to get the `workflow_definition_id`, which is inefficient.

**Response Format**:
```typescript
{
  data: {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    type: 'code' | 'yaml';
    path: string;
    phases: Array<{ name: string; description?: string }>;
    args_schema: object | null;
    is_template: boolean;
    created_at: string;
    updated_at: string;
  }
}
```

### 2. Frontend Route Structure

**Current**:
```tsx
<Route path="workflows/:executionId" element={<WorkflowDetail />} />
```

**New**:
```tsx
<Route path="workflows/:definitionId" element={<WorkflowDefinitionView />} />
<Route path="workflows/:definitionId/executions/:executionId" element={<WorkflowRunDetail />} />
```

### 3. WorkflowDefinitionView Component

**Key Changes**:
- Change route param from `executionId` to `definitionId`
- Use `useWorkflowDefinition(definitionId)` instead of `useWorkflowRun(executionId)`
- Update `handleExecutionClick` to navigate to: `/projects/${projectId}/workflows/${definitionId}/executions/${executionId}`
- Remove unused execution-specific logic (progress, duration calculations for single execution)

**Data Flow**:
```typescript
const { definitionId } = useParams();
const { data: definition } = useWorkflowDefinition(definitionId);
const { data: executions } = useWorkflowRuns(projectId, { definitionId });
```

### 4. WorkflowRunDetail Component

**New Page Component** that displays:

**Header Section**:
- Execution name
- Status badge (running, paused, completed, failed, cancelled)
- Timestamps (started_at, completed_at, paused_at)
- Progress indicator (current phase, current step index)
- Control buttons (pause/resume/cancel)

**Steps Section**:
- List of `WorkflowRunStep` records
- For each step:
  - Step name and phase
  - Status badge
  - Started/completed timestamps
  - Link to agent session (if `agent_session_id` exists)
  - Log directory path (clickable to view logs)
  - Error message (if failed)

**Comments Section**:
- List of `WorkflowComment` records
- User/system/agent comments
- Timestamps
- Attached to execution or specific step

**Breadcrumb Navigation**:
- "← Back to {workflow.name}" button that navigates to definition view

## Files to Create/Modify

### New Files (6)

1. `apps/web/src/server/domain/workflow/services/getWorkflowDefinitionById.ts` - Service function to fetch workflow definition
2. `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowDefinition.ts` - React Query hook
3. `apps/web/src/client/pages/projects/workflows/WorkflowRunDetail.tsx` - Execution detail page
4. `apps/web/src/client/pages/projects/workflows/components/WorkflowRunHeader.tsx` - Execution header component
5. `apps/web/src/client/pages/projects/workflows/components/WorkflowRunStepsList.tsx` - Steps list component
6. `apps/web/src/client/pages/projects/workflows/components/WorkflowRunComments.tsx` - Comments section component

### Modified Files (5)

1. `apps/web/src/server/domain/workflow/services/index.ts` - Export new service function
2. `apps/web/src/server/routes/workflows.ts` - Add GET /api/workflow-definitions/:id endpoint
3. `apps/web/src/client/App.tsx` - Update route definitions
4. `apps/web/src/client/pages/projects/workflows/WorkflowDetail.tsx` - Rename to WorkflowDefinitionView.tsx and refactor
5. `apps/web/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx` - Update navigation to use definition ID

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Backend API Endpoint

<!-- prettier-ignore -->
- [x] backend-1 Create domain service function `getWorkflowDefinitionById`
  - Create new file: `apps/web/src/server/domain/workflow/services/getWorkflowDefinitionById.ts`
  - Function signature: `export async function getWorkflowDefinitionById(id: string): Promise<WorkflowDefinition | null>`
  - Use Prisma to fetch: `prisma.workflowDefinition.findUnique({ where: { id } })`
  - Return null if not found (let route handler throw NotFoundError)
- [x] backend-2 Export new service function from barrel
  - File: `apps/web/src/server/domain/workflow/services/index.ts`
  - Add: `export { getWorkflowDefinitionById } from './getWorkflowDefinitionById'`
- [x] backend-3 Add GET /api/workflow-definitions/:id endpoint
  - File: `apps/web/src/server/routes/workflows.ts`
  - Import: `getWorkflowDefinitionById` from domain services
  - Create Zod schema: `const definitionIdSchema = z.object({ id: z.cuid() })`
  - Add route handler with JWT auth (`preHandler: fastify.authenticate`)
  - Fetch definition, throw NotFoundError if not found
  - Return: `reply.send({ data: definition })`
- [x] backend-4 Test endpoint with curl
  - Get a valid workflow definition ID from database
  - Run: `curl -H "Authorization: Bearer $TOKEN" http://localhost:3456/api/workflow-definitions/{id} | jq .`
  - Expected: Returns workflow definition with phases, name, description

#### Completion Notes

- Created `getWorkflowDefinitionById` service function that fetches workflow definitions by ID
- Added JSON parsing for phases and args_schema fields (SQLite stores JSON as strings)
- Exported function from barrel export in domain/workflow/services/index.ts
- Added GET /api/workflow-definitions/:id endpoint with JWT authentication
- Endpoint returns 404 if definition not found, 200 with definition data otherwise

### Task Group 2: Frontend Hook for Definition

<!-- prettier-ignore -->
- [x] frontend-1 Create useWorkflowDefinition hook
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowDefinition.ts`
  - Use TanStack Query with queryKey: `['workflow-definition', definitionId]`
  - Fetch from: `/api/workflow-definitions/${definitionId}`
  - Return type: `WorkflowDefinition` (import from shared types)
  - Set staleTime: `5 * 60 * 1000` (5 minutes - definitions rarely change)
  - Enable only when definitionId is truthy
- [x] frontend-2 Export hook from barrel
  - File: `apps/web/src/client/pages/projects/workflows/hooks/index.ts`
  - Add: `export { useWorkflowDefinition } from './useWorkflowDefinition'`

#### Completion Notes

- Created useWorkflowDefinition hook following existing hook pattern
- Uses TanStack Query with 5-minute stale time since definitions rarely change
- Imports WorkflowDefinition type from ../types
- No barrel export file exists (hooks are imported directly), so skipped frontend-2

### Task Group 3: Update Route Definitions

<!-- prettier-ignore -->
- [x] routing-1 Update App.tsx route configuration
  - File: `apps/web/src/client/App.tsx`
  - Change `workflows/:executionId` to `workflows/:definitionId`
  - Add new route: `workflows/:definitionId/executions/:executionId`
  - Import new component: `WorkflowRunDetail` (will create next)
  - Keep existing `WorkflowLayout` wrapper
- [x] routing-2 Update ProjectWorkflowsView navigation
  - File: `apps/web/src/client/pages/projects/workflows/ProjectWorkflowsView.tsx`
  - Find click handler for workflow cards
  - Update navigation to: `/projects/${projectId}/workflows/${workflow.id}`
  - Note: `workflow.id` is the definition ID in this context

#### Completion Notes

- Updated App.tsx route imports to use WorkflowDefinitionView and WorkflowRunDetail
- Changed route path from `workflows/:executionId` to `workflows/:definitionId`
- Added new nested route for execution detail: `workflows/:definitionId/executions/:executionId`
- Updated handleExecutionClick in ProjectWorkflowsView to navigate to definition view using workflow_definition_id

### Task Group 4: Refactor WorkflowDetail to WorkflowDefinitionView

<!-- prettier-ignore -->
- [x] definition-view-1 Rename file
  - From: `apps/web/src/client/pages/projects/workflows/WorkflowDetail.tsx`
  - To: `apps/web/src/client/pages/projects/workflows/WorkflowDefinitionView.tsx`
  - Update component export name: `export function WorkflowDefinitionView()`
- [x] definition-view-2 Update route params
  - Change `const { executionId }` to `const { definitionId }`
  - Update type: `useParams<{ projectId: string; definitionId: string }>()`
- [x] definition-view-3 Replace data fetching logic
  - Remove: `const { data: execution } = useWorkflowRun(executionId)`
  - Remove: `const workflowDefinitionId = execution?.workflow_definition_id`
  - Add: `const { data: definition, isLoading: definitionLoading } = useWorkflowDefinition(definitionId)`
  - Update executions query: `useWorkflowRuns(projectId!, { definitionId })`
  - Remove execution-specific progress/duration calculations
- [x] definition-view-4 Update header display
  - Replace `execution.workflow_definition?.name` with `definition?.name`
  - Update phase count: Use `definition?.phases.length`
  - Keep execution count display (already correct)
- [x] definition-view-5 Update Kanban phases logic
  - Replace `const phases = execution.workflow_definition?.phases || []` with `const phases = definition?.phases || []`
- [x] definition-view-6 Update handleExecutionClick navigation
  - Change from: `navigate(\`/projects/${projectId}/workflows/${clickedExecution.id}\`)`
  - To: `navigate(\`/projects/${projectId}/workflows/${definitionId}/executions/${clickedExecution.id}\`)`
- [x] definition-view-7 Update loading state
  - Check both `definitionLoading` and `executionsLoading`
  - Show spinner if either is loading or data is not yet available

#### Completion Notes

- Created new WorkflowDefinitionView.tsx component (kept old file for reference)
- Updated route params to use definitionId instead of executionId
- Replaced useWorkflowRun with useWorkflowDefinition hook
- Removed execution-specific imports (progress/duration calculations, mutation hooks)
- Updated header to display definition name and phase count
- Updated handleExecutionClick to navigate to new nested route with execution ID
- Combined loading states for both definition and executions

### Task Group 5: Create Execution Detail Components

<!-- prettier-ignore -->
- [x] components-1 Create WorkflowRunHeader component
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowRunHeader.tsx`
  - Props: `{ execution: WorkflowRun; onPause: () => void; onResume: () => void; onCancel: () => void }`
  - Display: Execution name, status badge, timestamps (started_at, completed_at)
  - Show progress: `Phase: {current_phase} | Step: {current_step_index}`
  - Conditional buttons based on status:
    - Show "Pause" if status === 'running'
    - Show "Resume" if status === 'paused'
    - Show "Cancel" if status === 'running' || status === 'paused'
  - Use existing `WorkflowStatusBadge` component
  - Use Lucide icons: `Pause`, `Play`, `X` for buttons
- [x] components-2 Create WorkflowRunStepsList component
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowRunStepsList.tsx`
  - Props: `{ steps: WorkflowRunStep[]; projectId: string }`
  - Display each step with:
    - Step name and phase badge
    - Status badge (pending, running, completed, failed, skipped)
    - Timestamps (started_at, completed_at)
    - Duration (if both timestamps exist)
    - Link to agent session (if agent_session_id exists): `/projects/${projectId}/session/${agent_session_id}`
    - Log directory path (display as copyable text)
    - Error message (if status === 'failed' and error_message exists)
  - Use collapsible/accordion UI for step details
  - Sort steps by `created_at` or step order
- [x] components-3 Create WorkflowRunComments component
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowRunComments.tsx`
  - Props: `{ comments: WorkflowComment[]; executionId: string }`
  - Display each comment with:
    - Comment text
    - Comment type badge (user, system, agent)
    - Created timestamp
    - Created by (user ID or system)
    - Attached step (if workflow_run_step_id exists)
  - Sort comments by `created_at` descending (newest first)
  - Use card/list UI pattern similar to chat messages
  - Add placeholder for "No comments yet" if empty

#### Completion Notes

- Created WorkflowRunHeader with status badge, timestamps, and conditional control buttons
- Created WorkflowRunStepsList with step cards showing all relevant info (status, timestamps, duration, session link, logs, errors)
- Created WorkflowRunComments with comment cards sorted by date (newest first)
- All components follow existing design patterns and use WorkflowStatusBadge for consistency
- Added copy-to-clipboard functionality for log paths
- Used Lucide icons for visual elements

### Task Group 6: Create WorkflowRunDetail Page

<!-- prettier-ignore -->
- [x] execution-detail-1 Create WorkflowRunDetail page component
  - File: `apps/web/src/client/pages/projects/workflows/WorkflowRunDetail.tsx`
  - Extract route params: `const { projectId, definitionId, executionId } = useParams()`
  - Fetch data using hooks:
    - `const { data: execution } = useWorkflowRun(executionId)`
    - `const { data: definition } = useWorkflowDefinition(definitionId)`
  - Subscribe to WebSocket updates: `useWorkflowWebSocket(projectId!)`
  - Import mutation hooks: `usePauseWorkflow`, `useResumeWorkflow`, `useCancelWorkflow`
- [x] execution-detail-2 Add breadcrumb navigation
  - Create back button with `ArrowLeft` icon
  - Navigate to: `/projects/${projectId}/workflows/${definitionId}`
  - Display: "← Back to {definition?.name || 'Workflow'}"
- [x] execution-detail-3 Render WorkflowRunHeader
  - Pass execution data and mutation callbacks
  - Handle loading state (show spinner while execution is loading)
- [x] execution-detail-4 Render WorkflowRunStepsList
  - Pass: `execution.steps` (Prisma includes steps automatically)
  - Pass: `projectId` for session links
  - Add heading: "Execution Steps"
  - Show message if no steps: "No steps have been executed yet."
- [x] execution-detail-5 Render WorkflowRunComments
  - Pass: `execution.comments` (Prisma includes comments automatically)
  - Pass: `executionId`
  - Add heading: "Comments"
  - Show message if no comments: "No comments yet."
- [x] execution-detail-6 Add loading and error states
  - Show full-page spinner while loading
  - Show error message if execution not found
  - Show error message if user doesn't have access (403)

#### Completion Notes

- Created WorkflowRunDetail page with breadcrumb navigation
- Integrated all three child components (Header, Steps, Comments)
- Added proper loading and error states
- Wired up mutation hooks for pause/resume/cancel actions
- Subscribed to WebSocket for real-time updates
- Used two-column layout for better readability
- Added fallback message for "not found" state with navigation back to definition

### Task Group 7: Update Prisma Includes

<!-- prettier-ignore -->
- [x] prisma-1 Verify execution query includes steps and comments
  - File: `apps/web/src/server/domain/workflow/services/getWorkflowRunById.ts`
  - Ensure Prisma query includes:
    ```typescript
    include: {
      workflow_definition: true,
      steps: {
        orderBy: { created_at: 'asc' }
      },
      comments: {
        orderBy: { created_at: 'desc' }
      }
    }
    ```
  - If not already included, add them

#### Completion Notes

- Verified that getWorkflowRunById already includes all required relations
- Steps are included with agent sessions, artifacts, and step comments
- Execution comments are included with creator info and artifacts
- Both steps and comments are properly ordered by created_at
- No changes needed - existing implementation is correct

## Testing Strategy

### Unit Tests

Not required for this refactor (UI components are integration-tested manually).

### Integration Tests

**Manual Testing Required**:

1. **Definition View (Kanban Board)**:
   - Navigate from workflow list to definition view
   - Verify Kanban board displays correctly with executions grouped by phase
   - Click execution card → should navigate to execution detail page
   - Verify WebSocket updates work (execution moves between phases)

2. **Execution Detail Page**:
   - Navigate to execution detail from Kanban
   - Verify header shows correct execution name, status, timestamps
   - Verify steps list displays all steps with correct status
   - Click session link → should navigate to agent session page
   - Test control buttons:
     - Pause running execution → status changes to "paused"
     - Resume paused execution → status changes to "running"
     - Cancel execution → status changes to "cancelled"
   - Verify comments section displays correctly
   - Click breadcrumb → should navigate back to definition view

3. **Route Navigation**:
   - Test deep linking: Open URL directly with execution ID
   - Test browser back button: Should navigate correctly
   - Test breadcrumb navigation: Should return to Kanban

### E2E Tests (Future)

Create Playwright tests for:
- Navigation flow: List → Definition → Execution → Back
- Execution control buttons (pause/resume/cancel)
- WebSocket real-time updates

## Success Criteria

- [ ] Can navigate from workflow list to definition view using definition ID
- [ ] Definition view displays Kanban board with all executions grouped by phase
- [ ] Clicking execution card navigates to execution detail page
- [ ] Execution detail page shows header with name, status, timestamps, progress
- [ ] Execution detail page shows all steps with status, logs, session links
- [ ] Execution detail page shows all comments (user, system, agent)
- [ ] Control buttons work correctly (pause/resume/cancel)
- [ ] Breadcrumb navigation works (back to definition view)
- [ ] WebSocket updates work on both pages (real-time status changes)
- [ ] Deep linking works (can open execution detail directly via URL)
- [ ] No TypeScript errors
- [ ] No console errors or warnings

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Build verification (ensures all imports resolve)
pnpm build
# Expected: Successful build, no errors
```

**Manual Verification:**

1. **Start application**:
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **Navigate to workflows**:
   - Open: `http://localhost:5173/projects/{projectId}/workflows`
   - Click a workflow card
   - Verify URL changes to: `/projects/{projectId}/workflows/{definitionId}`

3. **Verify Kanban board**:
   - See executions grouped by phase
   - Each execution shows name, status, timestamps
   - Execution count displayed in header

4. **Navigate to execution detail**:
   - Click an execution card
   - Verify URL changes to: `/projects/{projectId}/workflows/{definitionId}/executions/{executionId}`

5. **Verify execution detail page**:
   - See execution header with name, status, timestamps
   - See steps list with all steps
   - See comments section (may be empty)
   - Test pause button (if execution is running)
   - Test resume button (if execution is paused)
   - Test cancel button

6. **Verify breadcrumb navigation**:
   - Click "← Back to {workflow name}" button
   - Should return to Kanban view
   - URL should be: `/projects/{projectId}/workflows/{definitionId}`

7. **Test WebSocket updates**:
   - Start a workflow run
   - Watch execution move through phases on Kanban
   - Navigate to execution detail
   - Watch steps update in real-time

8. **Check console**:
   - Open browser DevTools > Console
   - Expected: No errors or warnings

**Feature-Specific Checks:**

- Execution detail page shows correct phase badges
- Step logs directory paths are displayed
- Session links navigate to correct session page
- Control buttons are disabled when execution is completed/failed/cancelled
- Comments show correct author and timestamp

## Implementation Notes

### 1. Reuse Existing Components

**Already Available**:
- `WorkflowStatusBadge` - Status badge component
- `WorkflowPhaseKanbanColumn` - Kanban column component
- `WorkflowRunPhaseCard` - Execution card in Kanban
- `BaseDialog` - Modal wrapper (not used in this refactor, but available)

**Can Be Reused**:
- Badge components from shadcn/ui (`components/ui/badge.tsx`)
- Card components (`components/ui/card.tsx`)
- Button components (`components/ui/button.tsx`)
- Lucide icons (`ArrowLeft`, `Pause`, `Play`, `X`)

### 2. Prisma Includes

The `getWorkflowRunById` service function should already include:
- `workflow_definition` (for breadcrumb display)
- `steps` (for steps list)
- `comments` (for comments section)

If not, add these includes to the Prisma query.

### 3. WebSocket Subscription

Both pages should subscribe to workflow WebSocket events:
- Definition view: Updates execution status in Kanban
- Execution detail: Updates execution status, step status, new comments

Use existing `useWorkflowWebSocket(projectId)` hook on both pages.

### 4. Error Handling

Handle 404 and 403 errors gracefully:
- 404: "Workflow not found" message with link back to list
- 403: "Access denied" message with link back to list

### 5. Loading States

Show loading spinners for:
- Fetching definition
- Fetching execution
- Fetching executions list
- Mutation in progress (pause/resume/cancel)

## Dependencies

No new dependencies required - using existing packages:
- React Router (navigation)
- TanStack Query (data fetching)
- Zod (validation)
- Fastify (backend)
- Prisma (database)
- Lucide React (icons)
- shadcn/ui (UI components)

## Timeline

| Task                                   | Estimated Time |
| -------------------------------------- | -------------- |
| Backend API endpoint                   | 30 minutes     |
| Frontend hook                          | 15 minutes     |
| Route updates                          | 15 minutes     |
| Refactor WorkflowDetail → Definition  | 30 minutes     |
| Create execution detail components     | 45 minutes     |
| Create execution detail page           | 30 minutes     |
| Testing and bug fixes                  | 30 minutes     |
| **Total**                              | **3 hours**    |

## References

- Current implementation: `apps/web/src/client/pages/projects/workflows/WorkflowDetail.tsx`
- Prisma schema: `apps/web/prisma/schema.prisma` (lines 11-100)
- Backend routes: `apps/web/src/server/routes/workflows.ts`
- WebSocket hook: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- Domain services: `apps/web/src/server/domain/workflow/services/`

## Next Steps

1. Implement backend API endpoint for `GET /api/workflow-definitions/:id`
2. Create `useWorkflowDefinition` hook
3. Update route definitions in `App.tsx`
4. Refactor `WorkflowDetail.tsx` to `WorkflowDefinitionView.tsx`
5. Create execution detail components (header, steps, comments)
6. Create `WorkflowRunDetail.tsx` page
7. Test navigation flow end-to-end
8. Verify WebSocket updates work on both pages
9. Fix any TypeScript or runtime errors
10. Commit changes with descriptive message
