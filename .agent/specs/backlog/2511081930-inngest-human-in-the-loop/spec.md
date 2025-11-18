# Inngest Human-in-the-Loop

**Status**: draft
**Created**: 2025-11-08
**Package**: apps/app
**Total Complexity**: 42 points
**Phases**: 3
**Tasks**: 9
**Overall Avg Complexity**: 4.7/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Backend - Inngest Interrupt Loop | 2 | 16 | 8.0/10 | 8/10 |
| Phase 2: Backend - API Endpoints | 2 | 8 | 4.0/10 | 5/10 |
| Phase 3: Frontend - Interactive Mode | 5 | 18 | 3.6/10 | 5/10 |
| **Total** | **9** | **42** | **4.7/10** | **8/10** |

## Overview

Enable users to interrupt running agent sessions within workflows, provide additional instructions, and automatically resume execution with preserved context. This leverages Inngest's `waitForEvent` to pause workflow steps, kill agent processes, and resume sessions seamlessly.

## User Story

As a workflow user
I want to interrupt a running agent step and provide additional guidance
So that I can steer the agent's execution without canceling and restarting the entire workflow

## Technical Approach

Use Inngest's `step.waitForEvent()` within a `Promise.race()` pattern to listen for interrupt events while agent executes. When interrupted, kill the CLI process via existing `cancelSession`, wait for user's new message via another `waitForEvent`, then resume the session with `--resume {sessionId}`. Reuse all existing session infrastructure (AgentSessionViewer, ChatPromptInput, WebSocket events, sessionStore) by making AgentSessionViewer support an "interactive mode" for workflow steps.

## Key Design Decisions

1. **Reuse agent_sessions table**: Workflow steps already create agent sessions, so no new storage needed - just add interrupt capability to existing sessions
2. **Promise.race pattern**: Start both `executeAgent()` and `waitForEvent()` simultaneously; whichever resolves first wins - clean, idiomatic async pattern
3. **Interactive mode prop**: AgentSessionViewer gets `interactive` flag to enable ChatPromptInput for running workflow steps while maintaining read-only mode for completed steps
4. **Fixed permissions**: Workflow agent steps always use `bypassPermissions` mode - not user-configurable to maintain workflow determinism

## Architecture

### File Structure
```
apps/app/src/
├── server/
│   ├── domain/
│   │   └── workflow/
│   │       └── services/
│   │           └── engine/
│   │               └── steps/
│   │                   └── createAgentStep.ts          # Modified: Add interrupt loop
│   └── routes/
│       └── workflows/
│           └── runs.ts                                 # Modified: Add interrupt/message endpoints
├── client/
│   ├── api/
│   │   └── workflows.ts                                # Modified: Add API client methods
│   ├── components/
│   │   └── AgentSessionViewer.tsx                      # Modified: Add interactive mode
│   └── pages/
│       └── projects/
│           └── workflows/
│               ├── WorkflowRunDetail.tsx               # Modified: Pass interactive props
│               └── components/
│                   └── PhaseTimeline.tsx               # Modified: Show "Paused" state
```

### Integration Points

**Inngest Runtime**:
- `createAgentStep.ts` - Add `while` loop with `Promise.race()` for interrupt handling
- Uses `step.waitForEvent()` to listen for interrupt and message events

**Backend API**:
- `routes/workflows/runs.ts` - New endpoints: `POST /interrupt`, `POST /message`
- Send Inngest events via `inngest.send()`

**Frontend Components**:
- `AgentSessionViewer.tsx` - Add `interactive` prop to enable ChatPromptInput
- `WorkflowRunDetail.tsx` - Pass `interactive={step.status === 'running'}` to viewer
- Reuse all existing chat UI (no new components)

## Implementation Details

### 1. Inngest Interrupt Loop

Modify `createAgentStep` to wrap agent execution in a `while` loop that races between agent completion and interrupt events. When interrupted, kill the process and wait for a new message event before resuming.

**Key Points**:
- Use `Promise.race()` to handle concurrent agent execution and event listening
- `continueLoop` flag controls loop - only exits when agent completes without interruption
- `wasInterrupted` flag triggers session resume on subsequent iterations
- Both `waitForEvent` calls use 24h timeout (max step duration)
- No manual cleanup needed - Inngest GCs abandoned promises

### 2. Backend API Endpoints

Add two new REST endpoints to the workflows router for interrupt and message actions. These endpoints validate ownership, interact with sessions, send Inngest events, and broadcast WebSocket updates.

**Key Points**:
- Interrupt endpoint kills process via existing `cancelSession` function
- Message endpoint just sends Inngest event (no direct agent interaction)
- Both endpoints validate user owns the workflow run
- WebSocket broadcasts keep UI in sync

### 3. Interactive AgentSessionViewer

Extend `AgentSessionViewer` component to support interactive mode where ChatPromptInput is enabled for running workflow steps. Component accepts custom `onSubmit` and `onInterrupt` callbacks to override default session behavior.

**Key Points**:
- `interactive` prop enables ChatPromptInput (defaults to false for backward compatibility)
- Custom callbacks allow workflow-specific message routing
- Permission mode locked to `bypassPermissions` when in workflow context
- All existing session features (message display, streaming, WebSocket) work unchanged

## Files to Create/Modify

### New Files (0)

No new files - all changes are modifications to existing files.

### Modified Files (6)

1. `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts` - Add interrupt loop with Promise.race pattern
2. `apps/app/src/server/routes/workflows/runs.ts` - Add interrupt and message endpoints
3. `apps/app/src/client/api/workflows.ts` - Add API client methods for interrupt/message
4. `apps/app/src/client/components/AgentSessionViewer.tsx` - Add interactive mode support
5. `apps/app/src/client/pages/projects/workflows/WorkflowRunDetail.tsx` - Pass interactive props to AgentSessionViewer
6. `apps/app/src/client/pages/projects/workflows/components/PhaseTimeline.tsx` - Show "Paused" indicator for interrupted steps

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend - Inngest Interrupt Loop

**Phase Complexity**: 16 points (avg 8.0/10)

<!-- prettier-ignore -->
- [ ] 1.1 [8/10] Add interrupt loop to createAgentStep with Promise.race pattern
  - Wrap agent execution in while loop with continueLoop flag
  - Race between executeAgent promise and waitForEvent for interrupt
  - On interrupt: kill process, wait for message event, update config, continue loop
  - On completion: set continueLoop=false and return result
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`
  - Event names: `workflow.${runId}.step.${stepId}.interrupt`, `workflow.${runId}.step.${stepId}.message`
  - Complexity: High - requires understanding Inngest step API, Promise.race semantics, session resume flow, and careful state management
- [ ] 1.2 [8/10] Ensure executeAgent is called with correct resume and permissionMode config
  - Set resume: wasInterrupted flag (starts false, becomes true after first interrupt)
  - Set permissionMode: 'bypassPermissions' (hardcoded for workflows)
  - Pass sessionId: session.cli_session_id for resume continuity
  - Update config.prompt with new message from interrupt event data
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`
  - Complexity: High - requires understanding agent-cli-sdk execute API, session resume mechanics, and config management

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Backend - API Endpoints

**Phase Complexity**: 8 points (avg 4.0/10)

<!-- prettier-ignore -->
- [ ] 2.1 [5/10] Add POST /api/workflows/runs/:runId/steps/:stepId/interrupt endpoint
  - Validate user owns workflow run (reuse existing validation)
  - Get step from DB, verify status is 'running'
  - Call cancelSession({ sessionId: step.agent_session_id })
  - Send Inngest event: inngest.send({ name: `workflow.${runId}.step.${stepId}.interrupt`, data: {} })
  - Broadcast WebSocket event: broadcastWorkflowEvent(projectId, { type: 'step:interrupted', data: { runId, stepId } })
  - File: `apps/app/src/server/routes/workflows/runs.ts`
  - Complexity: Moderate - needs workflow route pattern, ownership validation, session cancellation, Inngest client usage
- [ ] 2.2 [3/10] Add POST /api/workflows/runs/:runId/steps/:stepId/message endpoint
  - Validate user owns workflow run
  - Parse message from request body (Zod schema: { message: string })
  - Send Inngest event: inngest.send({ name: `workflow.${runId}.step.${stepId}.message`, data: { message } })
  - Broadcast WebSocket event: broadcastWorkflowEvent(projectId, { type: 'step:message_sent', data: { runId, stepId } })
  - File: `apps/app/src/server/routes/workflows/runs.ts`
  - Complexity: Simple - standard REST endpoint with validation and event emission

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Frontend - Interactive Mode

**Phase Complexity**: 18 points (avg 3.6/10)

<!-- prettier-ignore -->
- [ ] 3.1 [5/10] Add interactive mode props to AgentSessionViewer
  - Add props: interactive?: boolean, onInterrupt?: () => void, onSubmit?: (message: PromptInputMessage) => void
  - Conditionally render ChatPromptInput only if interactive=true
  - Pass onInterrupt to ChatPromptInput as onKill callback
  - Pass onSubmit to ChatPromptInput as onSubmit callback
  - Override permissionMode to 'bypassPermissions' when onSubmit provided (workflow context)
  - File: `apps/app/src/client/components/AgentSessionViewer.tsx`
  - Complexity: Moderate - needs to understand component prop threading, conditional rendering, and callback overrides
- [ ] 3.2 [4/10] Add API client methods for interrupt and message
  - Add interruptWorkflowStep(runId, stepId): POST /api/workflows/runs/${runId}/steps/${stepId}/interrupt
  - Add sendWorkflowStepMessage(runId, stepId, message): POST /api/workflows/runs/${runId}/steps/${stepId}/message with JSON body
  - Both return fetch promises with error handling
  - File: `apps/app/src/client/api/workflows.ts`
  - Complexity: Simple - standard API client methods with fetch calls
- [ ] 3.3 [4/10] Update WorkflowRunDetail to pass interactive props to AgentSessionViewer
  - Find where AgentSessionViewer is rendered (SessionTab or similar)
  - Add interactive={step.status === 'running'} prop
  - Add onInterrupt={() => api.interruptWorkflowStep(runId, stepId)} prop
  - Add onSubmit={(msg) => api.sendWorkflowStepMessage(runId, stepId, msg.text)} prop
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetail.tsx`
  - Complexity: Simple - prop threading from parent component
- [ ] 3.4 [3/10] Show "Paused" state in PhaseTimeline for interrupted steps
  - Add visual indicator (badge/icon) when step is interrupted (status check TBD - may need new field)
  - Use same styling as session interrupted state (yellow/orange)
  - Show tooltip: "Agent paused - waiting for input"
  - File: `apps/app/src/client/pages/projects/workflows/components/PhaseTimeline.tsx`
  - Complexity: Simple - UI state display with conditional rendering
- [ ] 3.5 [2/10] Test full interrupt flow end-to-end
  - Start workflow with agent step
  - Click interrupt (verify process killed)
  - Send new message (verify agent resumes)
  - Verify output continues streaming
  - Test multiple interrupts in same step
  - Manual verification step
  - Complexity: Trivial - manual testing, no code changes

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`createAgentStep.test.ts`** - Test interrupt loop logic:

```typescript
describe('createAgentStep interrupt handling', () => {
  it('should complete agent without interruption', async () => {
    // Mock executeAgent resolves before interrupt event
    // Verify no waitForEvent listener remains
  });

  it('should handle interrupt and resume', async () => {
    // Mock interrupt event arrives during agent execution
    // Verify cancelSession called
    // Verify waitForEvent for message
    // Verify agent resumes with new prompt
  });

  it('should handle multiple interrupts', async () => {
    // Simulate 2 interrupts in same step
    // Verify loop continues correctly each time
  });
});
```

### Integration Tests

**Workflow Run API Tests** - Test interrupt/message endpoints:
- Verify ownership validation rejects unauthorized users
- Verify interrupt endpoint kills session and sends Inngest event
- Verify message endpoint sends Inngest event with correct data
- Verify WebSocket events broadcast correctly

### E2E Tests

**`workflow-interrupt.e2e.test.ts`** - Test full interrupt flow:

```typescript
test('user can interrupt and resume workflow agent step', async () => {
  // 1. Start workflow run with agent step
  // 2. Wait for agent to start streaming
  // 3. Click interrupt button
  // 4. Verify "Paused" indicator appears
  // 5. Type new message and send
  // 6. Verify agent resumes streaming
  // 7. Verify final output includes both executions
});
```

## Success Criteria

- [ ] Agent step execution can be interrupted mid-run without errors
- [ ] Interrupted step shows "Paused" state in UI
- [ ] User can send new message to interrupted step
- [ ] Agent resumes with full conversation context preserved
- [ ] Multiple interrupts in single step work correctly
- [ ] Workflow completes successfully after interruptions
- [ ] No memory leaks from abandoned Inngest promises
- [ ] ChatPromptInput locked to bypassPermissions in workflow context
- [ ] Existing session behavior unchanged (backward compatibility)
- [ ] Type safety maintained across all changes

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: Clean build with no errors

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm check
# Expected: No lint errors

# Unit tests
pnpm test
# Expected: All tests pass including new createAgentStep tests

# E2E tests (if implemented)
pnpm test:e2e
# Expected: workflow-interrupt.e2e.test passes
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: Workflows page, start a workflow with an agent step
3. Verify: Agent starts streaming output
4. Test interrupt:
   - Press ESC or click interrupt button
   - Verify: Process killed, "Paused" indicator shows, chat input enabled
5. Test resume:
   - Type new message: "Use TypeScript instead of JavaScript"
   - Press send
   - Verify: Agent resumes streaming, incorporates new instruction
6. Test multiple interrupts:
   - Interrupt again mid-execution
   - Send another message
   - Verify: Agent continues correctly
7. Check console: No errors or warnings

**Feature-Specific Checks:**

- Verify session JSONL file contains all messages (original + interrupt messages)
- Verify workflow run completes with status "completed" after interruptions
- Verify ChatPromptInput shows permission mode badge as "Bypass" (red)
- Verify "Paused" state disappears after resume
- Verify WebSocket events fire correctly (step:interrupted, step:message_sent)

## Implementation Notes

### 1. Inngest Promise.race Cleanup

Inngest automatically garbage collects abandoned promises when `Promise.race()` resolves. No manual cleanup needed - when agent completes first, the `waitForEvent` promise is abandoned and Inngest's runtime cleans it up.

### 2. Session Resume Mechanics

The `--resume {sessionId}` flag in agent-cli-sdk loads the JSONL conversation file and appends the new message. This preserves full context including tool uses, file edits, and previous responses.

### 3. Permission Mode Override

When `AgentSessionViewer` receives custom `onSubmit` callback (workflow context), it should override the permission mode selector to show `bypassPermissions` as locked/read-only to prevent user confusion.

### 4. Backward Compatibility

All changes to `AgentSessionViewer` must maintain existing behavior when `interactive` prop is false or undefined. Session detail pages should see no change in functionality.

## Dependencies

- No new dependencies required
- Leverages existing Inngest SDK
- Reuses agent-cli-sdk resume capability
- Reuses all existing session infrastructure

## References

- Inngest `step.waitForEvent()` docs: https://www.inngest.com/docs/functions/steps/wait-for-event
- Agent CLI SDK resume: `packages/agent-cli-sdk/src/execute.ts`
- Session WebSocket events: `apps/app/src/server/websocket/handlers/session.ts`
- ChatPromptInput component: `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`

## Next Steps

1. Implement Phase 1: Backend - Inngest Interrupt Loop
2. Implement Phase 2: Backend - API Endpoints
3. Implement Phase 3: Frontend - Interactive Mode
4. Run full validation suite
5. Test in staging with real workflows
6. Deploy to production
