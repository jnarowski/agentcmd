# Agent Session ID Timing Fix

**Status**: draft
**Created**: 2025-11-13
**Package**: apps/app
**Total Complexity**: 22 points
**Phases**: 3
**Tasks**: 6
**Overall Avg Complexity**: 3.7/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Backend - Move Session ID to onEvent | 3 | 14 | 4.7/10 | 6/10 |
| Phase 2: Frontend - Handle Empty State | 2 | 6 | 3.0/10 | 4/10 |
| Phase 3: Testing & Validation | 1 | 2 | 2.0/10 | 2/10 |
| **Total** | **6** | **22** | **3.7/10** | **6/10** |

## Overview

Fix race condition where `agent_session_id` is set before agent writes messages to JSONL, causing "View Session" to show empty sessions. Move session ID assignment to first `onEvent` callback to ensure messages exist when users view sessions.

## User Story

As a user running workflows with AI agent steps
I want the "View Session" button to show session content immediately
So that I can monitor agent progress without seeing confusing empty sessions

## Technical Approach

**Current flow:**
1. Create session record → Set `agent_session_id` → Broadcast update → Execute agent → Write JSONL
2. User clicks "View Session" before JSONL has content → Empty session UI

**New flow:**
1. Create session record → Execute agent → First message → Set `agent_session_id` in `onEvent` → Broadcast update
2. User clicks "View Session" after JSONL has content → See messages immediately

**Key changes:**
- Remove early `agent_session_id` assignment (lines 74-80 in createAgentStep.ts)
- Add session ID update in first `onEvent` callback (use flag to track "already set")
- Keep post-execution update for CLI session ID mapping (lines 121-126)

## Key Design Decisions

1. **Only via onEvent**: Trust that every agent execution fires at least one event (user requested, no fallback)
2. **One-time update**: Use local flag to ensure `agent_session_id` is set exactly once on first message
3. **Preserve CLI session mapping**: Keep post-execution update for `cli_session_id` (separate concern)

## Architecture

### File Structure
```
apps/app/src/server/domain/
├── workflow/services/engine/steps/
│   └── createAgentStep.ts              # Remove early assignment, add onEvent logic
└── session/services/
    └── executeAgent.ts                 # (no changes, just context)
```

### Integration Points

**Backend - Workflow Engine**:
- `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts` - Move session ID assignment to onEvent

**Frontend - Session Viewer**:
- `apps/app/src/client/pages/projects/workflows/components/timeline/StepDefaultRow.tsx` - Add loading state for empty sessions (optional enhancement)
- `apps/app/src/client/components/AgentSessionViewer.tsx` - Handle empty message arrays gracefully (optional enhancement)

## Implementation Details

### 1. Backend - createAgentStep.ts

Remove lines 74-80 (early session ID assignment) and add tracking flag + update logic inside `onEvent` callback.

**Key Points**:
- Use closure variable `sessionIdSet = false` to track first event
- Check flag in `onEvent`, update step if false, set flag to true
- Keep lines 121-126 for CLI session ID mapping (separate concern)
- Ensure WebSocket broadcast happens via `updateWorkflowStep` call

### 2. Frontend - Empty State Handling (Optional)

Improve UX when session has no messages yet (edge cases: very fast execution, user clicks before first event).

**Key Points**:
- AgentSessionViewer: Show "Loading session..." if messages array is empty
- StepDefaultRow: No changes needed (button shows after first message now)

## Files to Create/Modify

### New Files (0)

None

### Modified Files (1-3)

1. `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts` - Move session ID assignment to onEvent
2. `apps/app/src/client/components/AgentSessionViewer.tsx` - (Optional) Add empty state message
3. `apps/app/src/client/pages/projects/workflows/components/timeline/StepDefaultRow.tsx` - (Optional) Add loading indicator

## Step by Step Tasks

### Phase 1: Backend - Move Session ID to onEvent

**Phase Complexity**: 14 points (avg 4.7/10)

<!-- prettier-ignore -->
- [ ] task-1 [4/10] Remove early agent_session_id assignment
  - Delete lines 74-80 in createAgentStep.ts (updateWorkflowStep call before executeAgent)
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`
  - Lines: 74-80
- [ ] task-2 [6/10] Add session ID assignment in onEvent callback
  - Add closure variable `let sessionIdSet = false` before executeAgent call
  - Inside onEvent (lines 97-108), add conditional check: if (!sessionIdSet) { await updateWorkflowStep({ stepId: step.id, agentSessionId: session.id, logger }); sessionIdSet = true; }
  - Ensure this happens before broadcasting session message
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`
  - Lines: 89-112
- [ ] task-3 [4/10] Verify CLI session ID mapping still works
  - Confirm lines 121-126 remain unchanged (updateWorkflowStep with CLI session ID after execution)
  - This updates agent_session_id a second time with CLI session ID (e.g., Claude's session ID)
  - Test that both updates work correctly (first with db session ID, second with CLI session ID)
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`
  - Lines: 121-126

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Frontend - Handle Empty State

**Phase Complexity**: 6 points (avg 3.0/10)

<!-- prettier-ignore -->
- [ ] task-4 [4/10] Add empty state to AgentSessionViewer
  - In AgentSessionViewer component, check if messages array is empty
  - If empty, show: <div className="text-muted-foreground text-sm">Loading session messages...</div>
  - Otherwise render messages normally
  - File: `apps/app/src/client/components/AgentSessionViewer.tsx`
- [ ] task-5 [2/10] (Optional) Add loading indicator to StepDefaultRow
  - If step.status === 'running' and !step.agent_session_id, show "Session starting..." instead of "View Session"
  - File: `apps/app/src/client/pages/projects/workflows/components/timeline/StepDefaultRow.tsx`
  - Lines: 94-110

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Testing & Validation

**Phase Complexity**: 2 points (avg 2.0/10)

<!-- prettier-ignore -->
- [ ] task-6 [2/10] Manual testing of timing fix
  - Start workflow with agent step: `pnpm dev` from apps/app/
  - Open workflow run details while agent is executing
  - Verify "View Session" button appears only after first message
  - Click "View Session" immediately when it appears
  - Verify session viewer shows messages (not empty state)
  - Verify CLI session ID is mapped correctly after execution completes

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**No new unit tests required** - behavioral change to existing flow.

### Integration Tests

Manual testing required to verify timing:
1. Slow agent execution (30s+ prompt)
2. Fast agent execution (<5s prompt)
3. Verify WebSocket events fire in correct order

### E2E Tests (Optional)

**Future enhancement** - Add E2E test that:
1. Starts workflow with agent step
2. Subscribes to WebSocket events
3. Verifies STEP_UPDATED with agent_session_id fires after first session message
4. Verifies session viewer loads messages successfully

## Success Criteria

- [ ] agent_session_id is null until first onEvent callback fires
- [ ] "View Session" button appears only after agent writes first message
- [ ] Clicking "View Session" immediately shows messages (no empty state)
- [ ] CLI session ID mapping still works correctly (lines 121-126 unchanged)
- [ ] WebSocket broadcasts still fire correctly via updateWorkflowStep
- [ ] No TypeScript errors
- [ ] Existing workflow execution tests pass

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/app && pnpm build
# Expected: ✓ built in Xms

# Type checking
pnpm check-types
# Expected: No TypeScript errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests (if applicable)
pnpm test
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: Workflows page, create workflow with agent step
3. Run workflow, open run details immediately
4. Verify: "View Session" button does NOT appear initially
5. Verify: Button appears ~1-2s after agent starts (after first message)
6. Click "View Session" immediately when it appears
7. Verify: Session viewer shows messages (not "Loading session messages...")
8. Check console: No errors or warnings
9. Verify: Step metadata shows correct CLI session ID after execution completes

**Feature-Specific Checks:**

- Test with slow agent prompt (30s+): Button appears after first thinking message
- Test with fast agent prompt (<5s): Button still appears correctly
- Test with failing agent: Verify session ID is set even if agent fails after first message
- Verify WebSocket events: agent_session_id broadcast happens after first session message broadcast

## Implementation Notes

### 1. Closure Variable Pattern

Use closure variable to track state within single execution:

```typescript
let sessionIdSet = false;

await executeAgent({
  onEvent: ({ message }) => {
    // Update session ID on first event only
    if (!sessionIdSet) {
      await updateWorkflowStep({ stepId: step.id, agentSessionId: session.id, logger });
      sessionIdSet = true;
    }

    // Broadcast session message
    broadcast(Channels.session(session.id), {
      type: SessionEventTypes.STREAM_OUTPUT,
      data: { message, sessionId: session.id },
    });
  }
});
```

### 2. Two Updates Pattern

The step's `agent_session_id` is updated twice:
1. **First update (onEvent)**: Database session ID (UUID) - enables "View Session" button
2. **Second update (post-execution)**: CLI session ID (e.g., Claude's session ID) - enables message loading with correct ID

This is intentional - both IDs are valid, second is more precise for agent-cli-sdk.

### 3. Frontend Fallback

Even with timing fix, add empty state handling in AgentSessionViewer as defensive programming:
- Very fast executions might complete before UI subscribes to WebSocket
- Network delays might cause race conditions
- Better UX than showing broken/empty UI

## Dependencies

- No new dependencies required
- Uses existing domain services: `updateWorkflowStep`, `executeAgent`
- Uses existing WebSocket infrastructure: `broadcast`, `Channels`

## References

- [Workflow Engine Docs](.agent/docs/workflow-engine.md)
- [WebSocket Patterns](.agent/docs/websockets.md)
- [Agent Session Viewer](apps/app/src/client/components/AgentSessionViewer.tsx)
- [Session Domain](apps/app/src/server/domain/session/)

## Next Steps

1. Remove early session ID assignment (lines 74-80)
2. Add onEvent tracking flag and conditional update
3. Test with slow and fast agent executions
4. Add frontend empty state handling (optional)
5. Verify WebSocket event ordering
6. Update documentation if needed
