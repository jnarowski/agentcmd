# WebSocket Event Naming Revamp

**Status**: draft
**Created**: 2025-11-10
**Package**: apps/app
**Total Complexity**: 48 points
**Phases**: 4
**Tasks**: 14
**Overall Avg Complexity**: 3.4/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Type Definitions | 1 | 5 | 5.0/10 | 5/10 |
| Phase 2: Backend Emission | 5 | 17 | 3.4/10 | 5/10 |
| Phase 3: Frontend Handlers | 4 | 16 | 4.0/10 | 5/10 |
| Phase 4: Cleanup & Verification | 4 | 10 | 2.5/10 | 4/10 |
| **Total** | **14** | **48** | **3.4/10** | **5/10** |

## Overview

Migrate all WebSocket event naming from mixed conventions (flat strings, colon notation) to unified dot notation, aligning with CLAUDE.md standards and JavaScript/WebSocket ecosystem best practices. This includes 25 events across 4 subsystems (session, shell, global, workflow) and removes redundant workflow event broadcasts.

## User Story

As a developer maintaining the WebSocket infrastructure
I want consistent dot notation for all event types
So that the system follows JS best practices, aligns with documentation, and eliminates console warnings from duplicate broadcasts

## Technical Approach

Central update to type definitions in `shared/types/websocket.types.ts` with all event constants migrated to dot notation. Since all code uses these constants (no hardcoded strings), TypeScript will enforce updates across backend handlers and frontend hooks. Channels remain colon-based (`session:123`) per Phoenix Channels pattern. Remove redundant workflow broadcasts that cause console warnings.

## Key Design Decisions

1. **Dot notation for events, colons for channels**: Channels use Phoenix pattern (`session:123`), events use JS standard (`session.stream_output`) - different concerns, different conventions
2. **Centralized constants only**: All references use shared constants from `websocket.types.ts`, ensuring type safety and preventing hardcoded strings
3. **No backward compatibility**: Clean break migration - internal-only WebSocket system, no external consumers, TypeScript catches all references

## Architecture

### File Structure
```
apps/app/src/
├── shared/
│   ├── types/
│   │   └── websocket.types.ts          # Central type definitions (ALL constants)
│   └── schemas/
│       └── workflow.schemas.ts         # Database event types
├── server/
│   ├── websocket/
│   │   └── handlers/
│   │       ├── session.handler.ts      # Session event emission
│   │       ├── shell.handler.ts        # Shell event emission
│   │       └── global.handler.ts       # Global event emission
│   └── domain/
│       ├── session/services/           # Session domain services
│       └── workflow/services/
│           ├── events/
│           │   └── createWorkflowEvent.ts
│           └── engine/steps/
│               ├── createPhaseStep.ts  # Remove redundant broadcasts
│               └── createAnnotationStep.ts
└── client/
    └── pages/projects/
        ├── sessions/hooks/
        │   └── useSessionWebSocket.ts  # Session event handlers
        ├── shell/hooks/
        │   └── useShellWebSocket.ts    # Shell event handlers
        └── workflows/hooks/
            └── useWorkflowWebSocket.ts # Workflow event handlers + dynamic key
```

### Integration Points

**Shared Types**:
- `shared/types/websocket.types.ts` - All event type constants
- `shared/schemas/workflow.schemas.ts` - Database WorkflowEvent type literals

**Backend Emission**:
- `server/websocket/handlers/*.handler.ts` - Direct event emission
- `server/domain/session/services/*` - Session event broadcasting
- `server/domain/workflow/services/events/*` - Workflow event broadcasting

**Frontend Consumption**:
- `client/pages/projects/*/hooks/use*WebSocket.ts` - Event handlers (switch statements)

## Implementation Details

### 1. Event Type Constants Migration

Update all 25 event type constants across 4 subsystems to use dot notation:

**Session Events (8)**: Add `session.` prefix to flat strings
**Shell Events (6)**: Add `shell.` prefix to flat strings
**Global Events (6)**: Add `global.` prefix to flat strings
**Workflow Events (5)**: Replace colons with dots (`workflow:run:updated` → `workflow.run.updated`)

**Key Points**:
- All constants defined in single source of truth: `websocket.types.ts`
- TypeScript discriminated unions ensure exhaustive checking
- Update comment blocks to reference dot notation, not "Socket.io convention"

### 2. Database Schema Event Types

Update Zod string literals for WorkflowEvent `event_type` field to match new dot notation:

**Key Points**:
- Schema validation must match event constants
- Database stores event_type as string (no migration needed)
- New events will use dot notation going forward

### 3. Redundant Broadcast Removal

Remove duplicate workflow event broadcasts from phase and annotation steps. These emit custom events (`workflow:phase:*`, `workflow:annotation:*`) that frontend doesn't handle, causing console warnings. The underlying `createWorkflowEvent()` already broadcasts `workflow.run.event.created` (with dots after migration).

**Key Points**:
- Eliminates "Unknown workflow event type" console warnings
- Preserves real-time event updates via `workflow.run.event.created`
- No UI functionality lost - frontend loads events from database

### 4. Dynamic Event Key Construction

Update template literal in `useWorkflowWebSocket.ts` that constructs event keys for log chunk streaming to use dots instead of colons.

**Key Points**:
- Currently: `workflow:run:${runId}:step:${stepId}:log_chunk`
- After: `workflow.run.${runId}.step.${stepId}.log_chunk`
- Only dynamic construction in codebase

## Files to Create/Modify

### New Files (0)

None - pure refactor of existing code

### Modified Files (13)

1. `apps/app/src/shared/types/websocket.types.ts` - Migrate all 25 event type constants
2. `apps/app/src/shared/schemas/workflow.schemas.ts` - Update Zod literals for event_type
3. `apps/app/src/server/websocket/handlers/session.handler.ts` - Auto-update via constants
4. `apps/app/src/server/websocket/handlers/shell.handler.ts` - Auto-update via constants
5. `apps/app/src/server/websocket/handlers/global.handler.ts` - Auto-update via constants
6. `apps/app/src/server/domain/session/services/updateSession.ts` - Auto-update via constants
7. `apps/app/src/server/domain/session/services/handleExecutionFailure.ts` - Auto-update via constants
8. `apps/app/src/server/domain/session/services/cancelSession.ts` - Auto-update via constants
9. `apps/app/src/server/domain/workflow/services/engine/steps/createPhaseStep.ts` - Remove redundant broadcasts
10. `apps/app/src/server/domain/workflow/services/engine/steps/createAnnotationStep.ts` - Remove redundant broadcast
11. `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Auto-update via constants
12. `apps/app/src/client/pages/projects/shell/hooks/useShellWebSocket.ts` - Auto-update via constants
13. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts` - Update dynamic event key + auto-update constants

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Type Definitions

**Phase Complexity**: 5 points (avg 5.0/10)

<!-- prettier-ignore -->
- [ ] ws-types-1 [5/10] Update all event type constants to dot notation in shared types
  - Update SessionEventTypes (8 events): add `session.` prefix
  - Update ShellEventTypes (6 events): add `shell.` prefix
  - Update GlobalEventTypes (6 events): add `global.` prefix
  - Update WorkflowWebSocketEventTypes (5 events): replace `:` with `.`
  - Update comment blocks to remove "Socket.io convention" references
  - File: `apps/app/src/shared/types/websocket.types.ts`
  - Total: 25 string literal updates + 1 comment update

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Backend Emission

**Phase Complexity**: 17 points (avg 3.4/10)

<!-- prettier-ignore -->
- [ ] ws-backend-1 [2/10] Update database schema event type literals to dot notation
  - Update Zod string literals in workflowEventTypeSchema
  - Change `workflow:step:*` → `workflow.step.*`
  - Change `workflow:phase:*` → `workflow.phase.*`
  - Change `workflow:annotation:created` → `workflow.annotation.created`
  - File: `apps/app/src/shared/schemas/workflow.schemas.ts`
  - Expected: ~6 string literal changes

- [ ] ws-backend-2 [5/10] Remove redundant phase event broadcasts from createPhaseStep
  - Delete `broadcastWorkflowEvent()` call at ~line 82 (phase:started)
  - Delete `broadcastWorkflowEvent()` call at ~line 110 (phase:completed)
  - Delete `broadcastWorkflowEvent()` call at ~line 146 (phase:failed)
  - Keep `findOrCreateWorkflowEvent()` calls (they emit workflow.run.event.created)
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createPhaseStep.ts`
  - Expected: Remove 3 broadcast calls (~21 lines total)

- [ ] ws-backend-3 [3/10] Remove redundant annotation event broadcast from createAnnotationStep
  - Delete `broadcastWorkflowEvent()` call at ~line 51 (annotation:created)
  - Keep `createWorkflowEvent()` call (it emits workflow.run.event.created)
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAnnotationStep.ts`
  - Expected: Remove 1 broadcast call (~7 lines)

- [ ] ws-backend-4 [4/10] Verify backend handlers auto-update via constants
  - Check session.handler.ts uses SessionEventTypes constants
  - Check shell.handler.ts uses ShellEventTypes constants
  - Check global.handler.ts uses GlobalEventTypes constants
  - Check domain services use constants (updateSession, handleExecutionFailure, cancelSession)
  - Files: `apps/app/src/server/websocket/handlers/*.handler.ts` + domain services
  - Expected: No changes needed, verify imports only

- [ ] ws-backend-5 [3/10] Run TypeScript check to catch any missed backend references
  - Run: `cd apps/app && pnpm check-types`
  - Expected: No type errors (all references use constants)
  - If errors found: Fix hardcoded strings (unlikely, but check)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Frontend Handlers

**Phase Complexity**: 16 points (avg 4.0/10)

<!-- prettier-ignore -->
- [ ] ws-frontend-1 [5/10] Update dynamic event key construction in useWorkflowWebSocket
  - Find template literal at line 199
  - Change: `workflow:run:${data.run_id}:step:${data.step_id}:log_chunk`
  - To: `workflow.run.${data.run_id}.step.${data.step_id}.log_chunk`
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
  - Expected: 1 line change (template literal)

- [ ] ws-frontend-2 [4/10] Verify useSessionWebSocket auto-updates via constants
  - Check switch statement uses SessionEventTypes constants
  - Verify all cases reference constants, not hardcoded strings
  - File: `apps/app/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
  - Expected: No changes needed, verify imports only

- [ ] ws-frontend-3 [3/10] Verify useShellWebSocket auto-updates via constants
  - Check switch statement uses ShellEventTypes constants
  - Verify all cases reference constants, not hardcoded strings
  - File: `apps/app/src/client/pages/projects/shell/hooks/useShellWebSocket.ts`
  - Expected: No changes needed, verify imports only

- [ ] ws-frontend-4 [4/10] Verify useWorkflowWebSocket auto-updates via constants
  - Check switch statement uses WorkflowWebSocketEventTypes constants
  - Verify all cases reference constants, not hardcoded strings
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
  - Expected: No changes needed (besides dynamic key already updated)

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 4: Cleanup & Verification

**Phase Complexity**: 10 points (avg 2.5/10)

<!-- prettier-ignore -->
- [ ] ws-cleanup-1 [3/10] Update CLAUDE.md documentation
  - Update WebSocket Patterns section to clarify dot notation for events
  - Add examples showing dot notation: `workflow.run.updated`
  - Clarify channels use colons, events use dots
  - Files: `CLAUDE.md`, `apps/app/CLAUDE.md`
  - Expected: Update examples and add clarification paragraph

- [ ] ws-cleanup-2 [4/10] Run full type check and build
  - Run: `cd apps/app && pnpm check-types`
  - Expected: No type errors
  - Run: `cd apps/app && pnpm build`
  - Expected: Successful build
  - If errors: Fix any missed references

- [ ] ws-cleanup-3 [2/10] Test WebSocket connections in browser
  - Start dev server: `cd apps/app && pnpm dev`
  - Open browser console, navigate to projects
  - Start workflow run, check for console warnings
  - Expected: No "Unknown workflow event type" warnings
  - Verify session/shell/workflow events work

- [ ] ws-cleanup-4 [1/10] Verify real-time updates work correctly
  - Test workflow run shows real-time phase updates
  - Test annotations appear in timeline immediately
  - Test session stream_output appears in real-time
  - Expected: All real-time features functional

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

No new unit tests required - this is a string literal refactor with no logic changes. Existing tests will automatically use new constants.

### Integration Tests

**WebSocket event emission/handling:**
- Verify session events emit with dot notation
- Verify workflow events emit with dot notation
- Verify frontend handlers receive and process events correctly

### E2E Tests

**Browser console verification:**
- Run workflow and verify no "Unknown workflow event type" warnings
- Verify real-time updates still work (annotations, phase updates, logs)

## Success Criteria

- [ ] All 25 event types use dot notation (no colons in event names)
- [ ] Channels still use colon notation (`session:123`, `project:abc`)
- [ ] No "Unknown workflow event type" console warnings
- [ ] TypeScript compilation succeeds with no errors
- [ ] Build succeeds for both client and server
- [ ] Real-time session/workflow events work in browser
- [ ] Annotations appear in workflow timeline immediately
- [ ] Phase updates show in real-time during workflow execution
- [ ] CLAUDE.md examples updated to show dot notation
- [ ] No hardcoded event strings anywhere (all use constants)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking (from project root)
cd apps/app && pnpm check-types
# Expected: No type errors

# Build verification
cd apps/app && pnpm build
# Expected: ✓ Built successfully

# Linting
cd apps/app && pnpm lint
# Expected: No lint errors

# Full check from root
cd ../.. && pnpm check
# Expected: All packages pass type check and lint
```

**Manual Verification:**

1. Start application: `cd apps/app && pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Open browser DevTools console
4. Create/run a workflow
5. Verify: No "Unknown workflow event type" warnings
6. Verify: Real-time phase updates appear
7. Verify: Annotations show immediately in timeline
8. Test session: Start agent session, verify stream_output appears real-time
9. Check console: No WebSocket-related errors or warnings

**Feature-Specific Checks:**

- Inspect WebSocket messages in Network tab: verify event types use dots
- Check channel subscriptions: verify channels use colons (`project:abc123`)
- Test workflow phase transitions: should see phase_started/completed events without warnings
- Test annotation creation: should appear in timeline immediately
- Verify log streaming: real-time logs should flow without errors

## Implementation Notes

### 1. Constants Are Single Source of Truth

All code references shared constants from `websocket.types.ts`. No hardcoded event strings exist in codebase. TypeScript will enforce updates everywhere constants are used.

### 2. Channels vs Events - Different Conventions

- **Channels**: Use colons for namespacing (`session:123`) - Phoenix Channels pattern
- **Events**: Use dots for hierarchy (`session.stream_output`) - JS/WebSocket standard
- This is intentional and follows industry best practices for each concern

### 3. Database Migration Not Required

WorkflowEvent `event_type` column stores strings. Existing events keep old names, new events use dot notation. No data migration needed - both formats can coexist in historical data.

### 4. Breaking Change Scope

Internal-only breaking change. No external API consumers. All WebSocket connections are between our frontend and backend. TypeScript catches all references.

## Dependencies

- No new dependencies required
- Existing: TypeScript 5.9, Fastify WebSocket, React WebSocket hooks

## References

- CLAUDE.md - WebSocket Patterns section (lines 405-415)
- `.agent/docs/websockets.md` - WebSocket infrastructure documentation
- Phoenix Channels documentation - Channel naming conventions
- Socket.io documentation - Event naming best practices

## Next Steps

1. Begin with Phase 1: Update type definitions in `websocket.types.ts`
2. Run type check to identify all references (should auto-update)
3. Remove redundant broadcasts in Phase 2
4. Update dynamic event key in Phase 3
5. Test in browser and verify no console warnings
6. Update documentation to match implementation
