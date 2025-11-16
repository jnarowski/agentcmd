# Workflow Step Logging v2

**Status**: draft
**Created**: 2025-11-16
**Package**: apps/app
**Total Complexity**: 28 points
**Phases**: 3
**Tasks**: 8
**Overall Avg Complexity**: 3.5/10

## Complexity Breakdown

| Phase                 | Tasks | Total Points | Avg Complexity | Max Task |
| --------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Core Logging | 3     | 12           | 4.0/10         | 5/10     |
| Phase 2: Integration  | 3     | 10           | 3.3/10         | 4/10     |
| Phase 3: UI Updates   | 2     | 6            | 3.0/10         | 3/10     |
| **Total**             | **8** | **28**       | **3.5/10**     | **5/10** |

## Overview

Implement structured logging system for workflow steps that captures console-style logs (info/warn/error) from within workflow step execution and displays them chronologically in the UI alongside trace output.

## User Story

As a workflow developer
I want to emit structured logs from within my workflow steps
So that I can debug execution and see detailed step-by-step output in the UI

## Technical Approach

Create `createStepLog` factory that returns console-like logger with `log()`, `log.warn()`, and `log.error()` methods. These methods create `step_log` workflow events that are stored in the database and streamed to the UI via WebSocket. The LogsTab merges these with existing trace entries in chronological order.

## Key Design Decisions

1. **Factory Pattern**: `createStepLog` accepts runtime context and step ID getter to dynamically track current step
2. **Fire and Forget**: Log events are created async without blocking step execution
3. **Console-like API**: `log()`, `log.warn()`, `log.error()` mirrors familiar console API
4. **JSON Serialization**: Non-string arguments are serialized with `sanitizeJson` helper
5. **Unified Display**: LogsTab merges step_log events with trace entries chronologically

## Architecture

### File Structure

```
apps/app/src/server/domain/workflow/services/engine/steps/
├── createStepLog.ts          # NEW - Log factory
├── createStepLog.test.ts     # NEW - Comprehensive tests
├── createAgentStep.ts        # MODIFIED - Integrate logger
└── index.ts                  # MODIFIED - Export createStepLog

apps/app/src/server/domain/workflow/services/engine/
└── createWorkflowRuntime.ts  # MODIFIED - Pass log to runtime

apps/app/src/client/pages/projects/workflows/components/detail-panel/
└── LogsTab.tsx               # MODIFIED - Display step_log events
```

### Integration Points

**Backend - Logging System**:
- `createStepLog.ts` - Core log factory implementation
- `createAgentStep.ts` - Integration point for agent steps
- `createWorkflowRuntime.ts` - Runtime-level integration

**Frontend - Display**:
- `LogsTab.tsx` - Merge and display step_log events with traces

**Database**:
- `workflow_event` table - Store step_log events with level/message/args

## Implementation Details

### 1. Log Factory (createStepLog)

Factory function that creates a console-like logger bound to workflow runtime context. Returns callable function with `warn` and `error` methods attached.

**Key Points**:
- Accepts `RuntimeContext` and step ID getter function
- Returns overloaded function: `log()`, `log.warn()`, `log.error()`
- Step ID obtained dynamically at log time (supports changing step context)
- Serializes args to string (JSON for objects, plain for strings)
- Creates workflow event with `step_log` type
- Fire-and-forget async (catches errors internally)

### 2. Agent Step Integration

Pass logger instance to workflow runtime so steps can emit logs during execution.

**Key Points**:
- `createWorkflowRuntime` instantiates `createStepLog`
- Adds `log` property to `WorkflowStep` interface
- Steps can call `step.log()`, `step.log.warn()`, `step.log.error()`
- Step ID tracked via mutable reference updated during step execution

### 3. UI Display

LogsTab merges step_log events with trace entries and displays chronologically.

**Key Points**:
- Filter events where `event_type === 'step_log'`
- Extract `level`, `message` from `event_data`
- Match to step via `inngest_step_id`
- Display with color coding (info: default, warn: yellow, error: red)
- Show timestamp, step name badge, level badge

## Files to Create/Modify

### New Files (2)

1. `apps/app/src/server/domain/workflow/services/engine/steps/createStepLog.ts` - Log factory implementation
2. `apps/app/src/server/domain/workflow/services/engine/steps/createStepLog.test.ts` - Comprehensive unit tests

### Modified Files (4)

1. `apps/app/src/server/domain/workflow/services/engine/steps/index.ts` - Export createStepLog
2. `apps/app/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts` - Integrate log into runtime
3. `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts` - Use logger if needed
4. `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx` - Display step_log events

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Core Logging System

**Phase Complexity**: 12 points (avg 4.0/10)

- [ ] 1.1 [5/10] Implement `createStepLog` factory function
  - Create factory that accepts `RuntimeContext` and step ID getter
  - Return log function with `.warn()` and `.error()` methods
  - Implement `serializeLogArgs` helper for string/JSON serialization
  - Use `createWorkflowEvent` to persist logs (fire-and-forget)
  - Handle errors internally without throwing
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createStepLog.ts`

- [ ] 1.2 [4/10] Write comprehensive unit tests for createStepLog
  - Test info/warn/error log creation
  - Test JSON serialization of object arguments
  - Test null currentStepId handling
  - Test dynamic step ID changes
  - Test multi-argument concatenation
  - Test error handling (non-blocking)
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createStepLog.test.ts`

- [ ] 1.3 [3/10] Export createStepLog from steps index
  - Add export to steps barrel file
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/index.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Runtime Integration

**Phase Complexity**: 10 points (avg 3.3/10)

- [ ] 2.1 [4/10] Integrate createStepLog into workflow runtime
  - Import createStepLog in createWorkflowRuntime
  - Track current step ID with mutable reference
  - Instantiate log factory with context and step ID getter
  - Pass log instance to runtime API
  - Update step ID reference when steps execute
  - File: `apps/app/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts`

- [ ] 2.2 [3/10] Update WorkflowStep interface to include log
  - Add `log` property to step object returned by runtime
  - Ensure type signature matches createStepLog return type
  - File: `apps/app/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts`

- [ ] 2.3 [3/10] Verify agent steps can use logger
  - Ensure createAgentStep receives log context
  - Verify no breaking changes to existing step implementations
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Frontend Display

**Phase Complexity**: 6 points (avg 3.0/10)

- [ ] 3.1 [3/10] Update LogsTab to display step_log events
  - Filter events where `event_type === 'step_log'`
  - Extract level, message from event_data
  - Match events to steps via inngest_step_id
  - Merge with trace entries and sort chronologically
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx`

- [ ] 3.2 [3/10] Add color coding and formatting for log levels
  - Apply color classes based on level (info/warn/error)
  - Show level badge for warn/error (info is default)
  - Display step name badge when available
  - Format timestamp, content with proper spacing
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`createStepLog.test.ts`** - Comprehensive coverage:

```typescript
describe("createStepLog", () => {
  it("creates info level log event in database");
  it("creates warn level log event");
  it("creates error level log event");
  it("serializes object arguments to JSON");
  it("handles null currentStepId");
  it("uses current step ID from getter function");
  it("concatenates multiple arguments with space separator");
  it("does not block execution on event creation failure");
});
```

### Integration Tests

Manual workflow execution test:
- Create workflow with multiple steps
- Emit logs at different levels
- Verify logs appear in LogsTab
- Verify chronological ordering
- Verify step name association

### E2E Tests (if applicable)

Not required - workflow execution tests covered by integration testing.

## Success Criteria

- [ ] `createStepLog` factory creates callable logger with warn/error methods
- [ ] Logs are persisted as workflow events with correct level/message/args
- [ ] Logger does not block step execution on event creation failure
- [ ] Runtime integrates logger and tracks current step ID dynamically
- [ ] LogsTab displays step_log events merged with trace entries
- [ ] Logs are color-coded by level (info/warn/error)
- [ ] Step name badges appear when step context is available
- [ ] All tests pass (8 test cases in createStepLog.test.ts)
- [ ] No type errors or lint errors
- [ ] Existing workflow functionality remains intact

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: no type errors

# Linting
pnpm --filter app lint
# Expected: no lint errors

# Unit tests
pnpm --filter app test createStepLog
# Expected: 8 tests pass

# Full test suite
pnpm --filter app test
# Expected: all tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: Workflow execution detail page
3. Verify: LogsTab shows step_log events mixed with traces
4. Test log levels: Check color coding (info: default, warn: yellow, error: red)
5. Check console: No errors or warnings

**Feature-Specific Checks:**

- Create workflow with agent step that calls `step.log()`
- Execute workflow and verify log appears in UI
- Verify logs are associated with correct step name
- Verify chronological ordering across multiple steps
- Verify error logs don't block step execution

## Implementation Notes

### 1. Fire-and-Forget Pattern

Log creation uses async fire-and-forget to avoid blocking step execution. Errors are caught and logged but don't propagate.

### 2. Dynamic Step ID Tracking

Step ID is obtained via getter function, not captured at factory creation time. This allows the same logger to be reused across multiple steps with different IDs.

### 3. JSON Sanitization

Use existing `sanitizeJson` utility to handle circular references and non-serializable values before stringifying.

### 4. Event Schema

`step_log` events use this structure:

```typescript
{
  event_type: "step_log",
  event_data: {
    level: "info" | "warn" | "error",
    message: string,
    args: unknown[]
  },
  inngest_step_id: string | null,
  phase: string | null
}
```

## Dependencies

- No new dependencies required
- Uses existing `createWorkflowEvent` service
- Uses existing `sanitizeJson` utility
- Uses existing WebSocket broadcast infrastructure

## References

- Related spec: `.agent/specs/todo/251115143849-workflow-logging/spec.md` (completed)
- Workflow engine: `apps/app/src/server/domain/workflow/services/engine/`
- Event types: `apps/app/src/server/domain/workflow/types/event.types.ts`
- Database schema: `apps/app/prisma/schema.prisma` (workflow_event table)

## Next Steps

1. Implement `createStepLog` factory with tests
2. Integrate logger into workflow runtime
3. Update LogsTab to display step_log events
4. Test end-to-end with workflow execution
5. Document usage in workflow developer guide
