# Workflow Resume After Server Restart

**Status**: draft
**Created**: 2025-11-27
**Package**: apps/app
**Total Complexity**: 42 points
**Phases**: 3
**Tasks**: 9
**Overall Avg Complexity**: 4.7/10

## Complexity Breakdown

| Phase                      | Tasks | Total Points | Avg Complexity | Max Task |
| -------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Backend Resume    | 4     | 23           | 5.8/10         | 7/10     |
| Phase 2: API Integration   | 2     | 9            | 4.5/10         | 5/10     |
| Phase 3: Frontend UI       | 3     | 10           | 3.3/10         | 4/10     |
| **Total**                  | **9** | **42**       | **4.7/10**     | **7/10** |

## Overview

Enable manual resume of workflow runs after server restarts. When dev server restarts, Inngest loses execution context but database shows workflow as "running". Users can click Resume button to re-trigger workflow via Inngest, which uses memoization to skip completed steps and continue from last incomplete step.

## User Story

As a developer
I want to resume workflows after server restarts
So that I don't lose completed work and can continue where I left off

## Technical Approach

Replace stubbed `resumeWorkflow` service with full implementation that:
1. Resets stuck steps (running → pending)
2. Re-triggers Inngest event with same runId
3. Inngest memoization automatically skips completed steps
4. Failed steps are re-executed (no cached output)

Add API endpoint and frontend Resume button for manual triggering.

## Key Design Decisions

1. **Manual resume only**: No automatic detection on startup - keeps solution simple and gives user control
2. **Trust Inngest memoization**: No custom skip logic - Inngest's SQLite memoization at `./prisma/workflows.db` handles step skipping via `${phase}-${userStepId}` keys
3. **Retry failed steps**: Resume will re-execute failed steps (user likely fixed issue and wants to retry)

## Architecture

### File Structure

```
apps/app/src/
├── server/
│   ├── domain/workflow/
│   │   ├── services/workflow/
│   │   │   ├── resumeWorkflow.ts           # Replace stub
│   │   │   └── executeWorkflow.ts          # Reference for event payload
│   │   └── types/
│   │       └── ResumeWorkflowOptions.ts    # Add missing params
│   └── routes/
│       └── workflows.ts                    # Add resume endpoint
└── client/
    └── pages/projects/workflows/
        ├── WorkflowRunDetailPage.tsx       # Add Resume button
        └── hooks/
            └── useWorkflowMutations.ts     # Add resume mutation
```

### Integration Points

**Backend**:
- `resumeWorkflow.ts` - Core resume logic
- `workflows.ts` - POST `/api/workflows/:id/resume` endpoint
- `ResumeWorkflowOptions.ts` - Type definitions

**Frontend**:
- `WorkflowRunDetailPage.tsx` - Resume button UI
- `useWorkflowMutations.ts` - Resume mutation hook

## Implementation Details

### 1. Resume Service Logic

Replace stub in `resumeWorkflow.ts` with:
1. Fetch run with definition, project, steps (include only "running" steps)
2. Validate status is resumable: running, paused, or failed
3. Reset stuck steps to pending (UPDATE WorkflowRunStep SET status='pending' WHERE status='running')
4. Update run status to pending
5. Build event payload (same structure as executeWorkflow)
6. Send to Inngest with same runId
7. Broadcast WebSocket event: `workflow.resumed`

**Key Points**:
- Event payload must match `executeWorkflow` exactly (runId, name, projectId, projectPath, userId, specFile, specContent, specType, planningSessionId, mode, baseBranch, branchName, args, workingDir)
- Use `buildWorkflowIdentifiers` to get eventName
- Inngest memoization uses step IDs (`${phase}-${userStepId}`) to determine what to skip
- Completed steps return cached output, failed/pending steps re-execute

### 2. API Endpoint

Add POST endpoint to `workflows.ts`:
- Route: `/api/workflows/:id/resume`
- Auth: require JWT via `preHandler: fastify.authenticate`
- Params: `{ id: z.cuid() }`
- Body: none
- Returns: Updated WorkflowRun with status="pending"

Wire to `resumeWorkflow` service with:
- `workflowClient: fastify.workflowClient`
- `eventBus: fastify.eventBus` (for WebSocket broadcast)
- `userId: request.user.id`
- `logger: fastify.log`

### 3. Frontend Resume Button

Add to `WorkflowRunDetailPage.tsx`:
- Show Resume button if status in ['running', 'paused', 'failed']
- Place in actions dropdown alongside Cancel, Delete
- Disable button during mutation (isPending)
- Show "Resuming..." text while pending
- Toast success/error messages

Create `useResumeWorkflow` hook in `useWorkflowMutations.ts`:
- POST to `/api/workflows/${runId}/resume`
- Invalidate `workflow-run` query on success
- Show toast notifications

## Files to Create/Modify

### New Files (0)

No new files required

### Modified Files (4)

1. `apps/app/src/server/domain/workflow/services/workflow/resumeWorkflow.ts` - Replace stub with full resume logic
2. `apps/app/src/server/domain/workflow/types/ResumeWorkflowOptions.ts` - Add workflowClient and eventBus params
3. `apps/app/src/server/routes/workflows.ts` - Add POST /api/workflows/:id/resume endpoint
4. `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx` - Add Resume button
5. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts` - Add useResumeWorkflow hook

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend Resume Service

**Phase Complexity**: 23 points (avg 5.8/10)

- [ ] 1.1 [7/10] Implement full resumeWorkflow service logic
  - Replace stub in `apps/app/src/server/domain/workflow/services/workflow/resumeWorkflow.ts`
  - Fetch run with includes: `{ workflow_definition: true, project: true, steps: { where: { status: 'running' } } }`
  - Validate status is resumable (running/paused/failed) - throw BadRequestError if not
  - Reset stuck steps: `prisma.workflowRunStep.updateMany({ where: { workflow_run_id: runId, status: 'running' }, data: { status: 'pending', started_at: null } })`
  - Update run status to pending via `updateWorkflowRun`
  - Build event payload matching `executeWorkflow` structure (see line 286-308 in executeWorkflow.ts)
  - Get eventName via `buildWorkflowIdentifiers(run.workflow_definition.identifier, run.project_id)`
  - Send to Inngest: `workflowClient.send({ name: eventName, data: eventData })`
  - Broadcast WebSocket: `eventBus.emit('workflow.resumed', { workflowRunId: run.id, projectId: run.project_id })`
  - Remove stub warning log

- [ ] 1.2 [5/10] Update ResumeWorkflowOptions type definition
  - File: `apps/app/src/server/domain/workflow/types/ResumeWorkflowOptions.ts`
  - Add `workflowClient: Inngest` parameter
  - Add `eventBus: EventBus` parameter
  - Keep existing: `runId: string`, `userId: string`, `logger?: FastifyBaseLogger`
  - Import types: `import type { Inngest } from 'inngest'` and `import type { EventBus } from '@/server/events/EventBus'`

- [ ] 1.3 [6/10] Add event payload helper function
  - In `apps/app/src/server/domain/workflow/services/workflow/resumeWorkflow.ts`
  - Create private function `buildResumeEventData` (copy logic from executeWorkflow.ts line 286-308)
  - Takes WorkflowRun with includes (workflow_definition, project, planning_session)
  - Returns event payload with: runId, name, projectId, projectPath, userId, specFile, specContent, specType, planningSessionId, mode, baseBranch, branchName, args, workingDir
  - Handle worktree path calculation: `run.worktree_name ? ${run.project.path}/../${run.worktree_name} : run.project.path`

- [ ] 1.4 [5/10] Add error handling and logging
  - Wrap Inngest send in try/catch
  - Log info: "Resuming workflow" with runId, status
  - Log info: "Successfully sent workflow resume event to Inngest" with runId, eventName
  - Log error: "Failed to send workflow resume event" on Inngest send failure
  - Throw error if Inngest send fails (don't mark run as failed - let user retry)

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: API Integration

**Phase Complexity**: 9 points (avg 4.5/10)

- [ ] 2.1 [5/10] Add resume API endpoint
  - File: `apps/app/src/server/routes/workflows.ts`
  - Add after pause/cancel endpoints (around line 200)
  - Route: `POST /api/workflows/:id/resume`
  - Params schema: use existing `runIdSchema` (line 28-30)
  - Pre-handler: `fastify.authenticate`
  - Extract userId from `request.user.id`
  - Call `resumeWorkflow({ runId: id, workflowClient: fastify.workflowClient, eventBus: fastify.eventBus, userId, logger: fastify.log })`
  - Return updated WorkflowRun
  - Handle errors: catch and return appropriate status codes (400 for BadRequestError, 500 for others)

- [ ] 2.2 [4/10] Export resumeWorkflow from services index
  - File: `apps/app/src/server/domain/workflow/services/index.ts`
  - Verify `resumeWorkflow` is exported (should already be exported from stub)
  - If not exported, add: `export { resumeWorkflow } from './workflow/resumeWorkflow'`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Frontend UI

**Phase Complexity**: 10 points (avg 3.3/10)

- [ ] 3.1 [4/10] Add useResumeWorkflow hook
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowMutations.ts`
  - Add after `useCancelWorkflow` hook
  - Use useMutation with `api.post<WorkflowRun>(/workflows/${runId}/resume)`
  - onSuccess: invalidate `['workflow-run', runId]` query, show success toast "Workflow resumed"
  - onError: show error toast with error message
  - Return mutation object

- [ ] 3.2 [4/10] Add Resume button to workflow run detail page
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx`
  - Import `useResumeWorkflow` hook (line 12)
  - Add `resumeMutation = useResumeWorkflow()` (line 66)
  - Add Resume menu item in actions dropdown (after Cancel, before Delete separator around line 180)
  - Show if `run.status` in ['running', 'paused', 'failed']
  - Icon: `PlayCircle` from lucide-react
  - Text: "Resume" (or "Resuming..." when isPending)
  - Disabled: `resumeMutation.isPending`
  - onClick: `resumeMutation.mutate(runId!)`

- [ ] 3.3 [2/10] Add toast notifications
  - Import `useToast` if not already imported
  - Success toast: "Workflow resumed" (handled in hook)
  - Error toast: Shows error.message (handled in hook)
  - No code changes needed if useWorkflowMutations already uses toast

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

**`resumeWorkflow.test.ts`** - Test resume service:
- Validates resumable status (running/paused/failed)
- Rejects non-resumable status (completed/cancelled/pending)
- Resets stuck steps to pending
- Updates run status to pending
- Sends correct Inngest event payload
- Broadcasts WebSocket event

### Integration Tests

**POST `/api/workflows/:id/resume`**:
- 200 OK: Resume running workflow → returns updated run with status="pending"
- 200 OK: Resume failed workflow → retries failed steps
- 400 Bad Request: Resume completed workflow → error
- 401 Unauthorized: No JWT token
- 404 Not Found: Invalid run ID

### Manual Testing

1. Start workflow with multiple steps
2. Wait for 1-2 steps to complete
3. Kill server (Ctrl+C)
4. Restart server: `pnpm dev`
5. Navigate to workflow run detail page
6. Verify Resume button visible in actions dropdown
7. Click Resume
8. Verify workflow continues execution
9. Check Inngest dev server logs - completed steps show cached output
10. Verify workflow completes successfully

## Success Criteria

- [ ] Resume button appears for workflows with status running/paused/failed
- [ ] Resume button disabled during API call
- [ ] Clicking Resume re-triggers workflow via Inngest
- [ ] Completed steps are skipped (Inngest memoization)
- [ ] Failed steps are re-executed
- [ ] Workflow continues to completion
- [ ] WebSocket event broadcasts run update
- [ ] Toast notifications show success/error
- [ ] No type errors in TypeScript
- [ ] No console errors in browser

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/app
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Build verification
pnpm build
# Expected: Successful build

# Unit tests (if added)
pnpm test resumeWorkflow
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: `http://localhost:4101/projects/{projectId}/workflows`
3. Create and start a workflow run
4. Wait for 1-2 steps to complete (check timeline)
5. Kill server: Ctrl+C in terminal
6. Restart server: `pnpm dev`
7. Navigate to workflow run detail page
8. Verify: Resume button visible in actions dropdown
9. Click Resume button
10. Check console: No errors or warnings
11. Verify in Inngest: `http://localhost:8288/stream/{inngest_run_id}`
    - Completed steps show "memoized" status
    - Workflow continues from last incomplete step
12. Verify workflow completes successfully

**Feature-Specific Checks:**

- Resume running workflow → continues from last incomplete step
- Resume failed workflow → retries failed steps
- Resume paused workflow → continues execution
- Resume completed workflow → returns error (not resumable)
- Multiple resume clicks → button disables, no duplicate requests
- WebSocket update → run status updates in real-time without page refresh

## Implementation Notes

### 1. Inngest Memoization Key

Memoization uses step ID format: `${phase}-${userStepId}`
- Stored in WorkflowRunStep.inngest_step_id
- Inngest checks SQLite store at `./prisma/workflows.db`
- If found → return cached output
- If not found → execute step

### 2. Event Payload Compatibility

Resume event payload MUST match executeWorkflow exactly:
- Same structure and field names
- Include all optional fields (specFile, specContent, etc.)
- Calculate workingDir correctly (worktree vs project path)
- This ensures Inngest function receives expected data

### 3. WebSocket Event Type

Use existing event type from `WorkflowWebSocketEventTypes`:
- Type: `RUN_UPDATED`
- Payload: `{ run_id, project_id, changes: { status: 'running' } }`
- This triggers real-time UI update without polling

## Dependencies

- No new dependencies required
- Uses existing: Inngest, Prisma, Fastify, React Query, Zustand

## References

- Inngest memoization docs: https://www.inngest.com/docs/features/step-memoization
- `executeWorkflow.ts` - Reference for event payload structure
- `createWorkflowRuntime.ts` - Inngest wrapper implementation
- Conversation plan file: `.claude/plans/magical-petting-curry.md`

## Next Steps

1. Implement backend `resumeWorkflow` service (Phase 1)
2. Add API endpoint (Phase 2)
3. Add frontend Resume button (Phase 3)
4. Manual test with server restart scenario
5. Verify Inngest memoization skips completed steps
6. Test failed step retry behavior
