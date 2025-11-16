# Chronological Unified Logs Display

**Status**: draft
**Created**: 2025-11-15
**Package**: apps/app
**Total Complexity**: 28 points
**Phases**: 3
**Tasks**: 8
**Overall Avg Complexity**: 3.5/10

## Complexity Breakdown

| Phase                       | Tasks   | Total Points | Avg Complexity | Max Task   |
| --------------------------- | ------- | ------------ | -------------- | ---------- |
| Phase 1: Backend Foundation | 2       | 8            | 4.0/10         | 5/10       |
| Phase 2: Frontend Refactor  | 4       | 15           | 3.8/10         | 5/10       |
| Phase 3: Testing & Polish   | 2       | 5            | 2.5/10         | 3/10       |
| **Total**                   | **8**   | **28**       | **3.5/10**     | **5/10**   |

## Overview

Simplify workflow logs display by showing all logs (traces + events) in a single chronological timeline with step name badges, replacing the collapsible step-based organization. Enables `step.log()` to be called outside `step.run()` context for global workflow logging.

## User Story

As a workflow developer
I want to see all logs in chronological order across all steps
So that I can trace execution flow and debug issues without expanding/collapsing step sections

## Technical Approach

Transform logs UI from step-grouped collapsible sections to flat chronological timeline. Backend removes restriction on `step.log()` requiring execution context, allowing logs to be created at any time. Frontend merges all traces and events into single sorted array with optional step name badges.

## Key Design Decisions

1. **Flat timeline over hierarchical steps**: Better for debugging cross-step issues and understanding execution flow
2. **Step name as badge vs. grouping**: Provides context without breaking chronological flow
3. **Remove `currentStepId` requirement**: Allows workflow-level logging (announcements, phase transitions)

## Architecture

### File Structure

```
apps/app/src/
├── client/pages/projects/workflows/components/detail-panel/
│   ├── LogsTab.tsx              # Modified: Flat chronological display
│   └── types.ts                 # Existing: Helper functions used
└── server/domain/workflow/services/engine/
    └── createWorkflowRuntime.ts # Modified: Remove step.log() restrictions
```

### Integration Points

**Frontend (LogsTab.tsx)**:
- Remove `useState` for expandedSteps tracking
- Remove `toggleStep` function and collapsible UI
- Flatten logs: merge all step traces + all step_log events
- Add step name badge to each log entry

**Backend (createWorkflowRuntime.ts)**:
- Remove `currentStepId` validation in `createLogMethod()`
- Change `inngest_step_id` from required to optional (`?? undefined`)

## Implementation Details

### 1. Backend: Remove step.log() Execution Context Requirement

Make `step.log()` callable anywhere in workflow (inside or outside `step.run()`). Previously threw error if `currentStepId` was null.

**Key Points**:
- Remove validation check: `if (!currentStepId) throw new Error(...)`
- Change `inngest_step_id: currentStepId` → `inngest_step_id: currentStepId ?? undefined`
- Logs without step context will have `inngest_step_id: undefined` (valid for phase-level logs)
- Maintains backward compatibility: logs inside `step.run()` still get step ID

### 2. Frontend: Flatten Logs Display

Replace step-grouped collapsible UI with single chronological timeline showing all logs.

**Key Points**:
- Remove `expandedSteps` state and `toggleStep` function
- Create single `allLogs` array: merge traces from all steps + all step_log events
- Add optional `stepName` field to each log entry for display
- Sort by timestamp before rendering
- Display step name as small badge when available
- Remove Terminal icon, ChevronDown/Right icons (no longer needed)

### 3. Log Entry Step Context

Enrich log entries with step name for display without breaking flat structure.

**Key Points**:
- Extend `UnifiedLogEntry` type with optional `stepName?: string`
- For traces: lookup step by index and add `stepName: step.name`
- For events: lookup step by `inngest_step_id` and add `stepName: step?.name`
- Handle gracefully when step not found (global logs)

## Files to Create/Modify

### New Files (0)

None - this is a refactor of existing code.

### Modified Files (2)

1. `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx` - Remove collapsible steps UI, implement flat chronological display
2. `apps/app/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts` - Remove step.log() context requirement

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend Foundation

**Phase Complexity**: 8 points (avg 4.0/10)

- [ ] backend-log-validation [5/10] Remove step.log() execution context validation
  - Remove `if (!currentStepId) throw new Error(...)` check in `createLogMethod()`
  - Change `inngest_step_id: currentStepId` to `inngest_step_id: currentStepId ?? undefined`
  - File: `apps/app/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts:333-338`
  - Test: Call `step.log()` outside `step.run()` should not throw error

- [ ] backend-verify [3/10] Verify createWorkflowEvent handles undefined inngest_step_id
  - Check that `createWorkflowEvent()` signature allows `inngest_step_id?: string`
  - Verify database schema allows NULL for inngest_step_id column
  - File: `apps/app/src/server/domain/workflow/services/events/createWorkflowEvent.ts`
  - Command: `pnpm --filter app check-types`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Frontend Refactor

**Phase Complexity**: 15 points (avg 3.8/10)

- [ ] frontend-imports [2/10] Update imports to remove unused components
  - Remove: `import { useState } from "react"`
  - Remove: `import { ChevronDown, ChevronRight, Terminal } from "lucide-react"`
  - Remove: `import { mergeLogsChronologically } from "./types"` (if not used elsewhere)
  - Keep: `eventToLogEntry`, `traceToLogEntry`, `UnifiedLogEntry`, `TraceEntry`
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx:1-7`

- [ ] frontend-flatten-logic [5/10] Replace step-grouped logic with flat chronological merge
  - Remove `expandedSteps` state and `toggleStep` function
  - Create `allLogs` array with type: `Array<UnifiedLogEntry & { stepName?: string }>`
  - Add traces from all steps: iterate `steps.forEach()`, extract traces, call `traceToLogEntry()`, add `stepName: step.name`
  - Add events: filter `event_type === "step_log"`, call `eventToLogEntry()`, lookup step by `inngest_step_id`, add `stepName`
  - Sort: `allLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())`
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx:14-44`

- [ ] frontend-render-flat [4/10] Replace collapsible UI with flat timeline
  - Remove outer `div.space-y-2` with step mapping
  - Remove step header button with toggle functionality
  - Wrap logs in single container: `div.bg-muted/20.p-4.space-y-2.border.rounded`
  - Map `allLogs` directly: `{allLogs.map((log, index) => <LogEntry key={index} log={log} stepName={log.stepName} />)}`
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx:54-60`

- [ ] frontend-step-badge [4/10] Add step name badge to LogEntry component
  - Add `stepName?: string` to `LogEntryProps` interface
  - Add conditional badge after timestamp in header div
  - Badge: `{stepName && <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{stepName}</span>}`
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx:63-89`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Testing & Polish

**Phase Complexity**: 5 points (avg 2.5/10)

- [ ] verify-types [2/10] Verify type safety and compilation
  - Command: `pnpm --filter app check-types`
  - Expected: No type errors in LogsTab.tsx or createWorkflowRuntime.ts
  - Verify: `UnifiedLogEntry & { stepName?: string }` type intersection works

- [ ] manual-test [3/10] Test log display with real workflow
  - Start app: `pnpm dev`
  - Trigger workflow with multiple steps that use `step.log()`
  - Verify: All logs appear in chronological order
  - Verify: Step names appear as badges where applicable
  - Verify: Logs without step context (global logs) display correctly
  - Verify: No console errors or warnings

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

No new unit tests required - this is a UI/UX refactor. Existing tests should continue to pass.

### Integration Tests

**Manual Testing:**
1. Create workflow with multiple steps using `step.log()` inside `step.run()`
2. Add `step.log()` calls outside `step.run()` (phase-level logging)
3. Verify all logs appear chronologically with correct step badges
4. Verify no errors when step context is missing

### E2E Tests

Consider adding E2E test to verify logs display:
- **`e2e/workflows/logs-display.test.ts`**: Verify chronological ordering and step badges

## Success Criteria

- [ ] `step.log()` can be called outside `step.run()` without throwing error
- [ ] Logs without step context have `inngest_step_id: undefined` in database
- [ ] All traces and events merged into single chronological timeline
- [ ] Step name badges display for logs with step context
- [ ] Logs without step context display without badge (no errors)
- [ ] No TypeScript compilation errors
- [ ] Manual testing confirms improved UX for debugging workflows

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: Successful build with no errors

# Type checking
pnpm --filter app check-types
# Expected: 0 type errors

# Linting
pnpm --filter app lint
# Expected: No lint errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: Project → Workflows → Select any workflow run
3. Click "Logs" tab
4. Verify: All logs displayed in flat chronological list (no collapsible sections)
5. Verify: Step name badges appear next to logs
6. Verify: Timestamps are in chronological order
7. Test edge case: Trigger workflow with `step.log()` outside `step.run()` context
8. Verify: Global logs display without step badge, no errors

**Feature-Specific Checks:**

- Logs from different steps are interleaved chronologically
- Step name badges provide context without breaking flow
- No "step.log() can only be called inside step.run()" errors
- Console has no warnings or errors

## Implementation Notes

### 1. Why Remove Collapsible Steps?

Chronological view is better for debugging because:
- Shows exact execution order across all steps
- Easier to spot timing issues and race conditions
- Reduces cognitive load (no need to remember which step to expand)
- Step badges provide context without breaking flow

### 2. Optional Step Context

Logs can now exist without step context:
- Workflow-level announcements (start/end)
- Phase transition logs
- Global error handlers
- Cleanup operations

### 3. Backward Compatibility

All existing workflows continue to work:
- Logs inside `step.run()` still get step ID
- Database schema already supports NULL inngest_step_id
- Frontend handles missing step names gracefully

## Dependencies

No new dependencies required.

## References

- Related spec: `.agent/specs/todo/251115143849-workflow-logging/spec.md`
- Log types: `apps/app/src/client/pages/projects/workflows/components/detail-panel/types.ts`
- Step API: `packages/agentcmd-workflows/src/types/workflow.types.ts`

## Next Steps

1. Implement backend changes (remove validation)
2. Refactor frontend to flat display
3. Test with real workflows
4. Consider adding filter/search UI for large log volumes (future enhancement)
