# Logging v3 Enhancements

**Status**: draft
**Created**: 2025-11-16
**Package**: apps/app
**Total Complexity**: 22 points
**Phases**: 3
**Tasks**: 7
**Overall Avg Complexity**: 3.1/10

## Complexity Breakdown

| Phase                      | Tasks   | Total Points | Avg Complexity | Max Task   |
| -------------------------- | ------- | ------------ | -------------- | ---------- |
| Phase 1: Agent Trace Fix   | 2       | 8            | 4.0/10         | 5/10       |
| Phase 2: Log Formatting    | 3       | 9            | 3.0/10         | 4/10       |
| Phase 3: Polish & Testing  | 2       | 5            | 2.5/10         | 3/10       |
| **Total**                  | **7**   | **22**       | **3.1/10**     | **5/10**   |

## Overview

Polish and enhance the workflow logging system (v3) by fixing agent step trace integration, improving log formatting and readability, and adding comprehensive error handling.

## User Story

As a workflow developer
I want clear, well-formatted logs with proper trace integration
So that I can debug workflow executions efficiently

## Technical Approach

Refine the existing logging system by:
1. Ensuring agent steps properly emit trace entries to the trace array
2. Improving log formatting for better readability (multi-line output, JSON syntax highlighting)
3. Adding defensive error handling for malformed data
4. Polishing UI details (spacing, collapsible sections, empty states)

## Key Design Decisions

1. **Agent Trace Integration**: Agent steps should populate `trace[]` array in their result for consistency
2. **Syntax Highlighting**: Use existing SyntaxHighlighter component for JSON args/output
3. **Defensive Parsing**: Handle missing/malformed event_data gracefully
4. **Lifecycle Clarity**: Don't show redundant "Started" and "Completed" content text when status badge is present

## Architecture

### File Structure

```
apps/app/src/client/pages/projects/workflows/components/detail-panel/
├── LogsTab.tsx               # MODIFIED - Formatting improvements
└── types.ts                  # VERIFIED - Already has conversion functions

apps/app/src/server/domain/workflow/services/engine/steps/
├── createAgentStep.ts        # MODIFIED - Fix trace array population
└── createStepLog.ts          # VERIFIED - Already implemented
```

### Integration Points

**Backend - Trace Integration**:
- `createAgentStep.ts` - Populate trace array in AgentStepResult

**Frontend - Display Improvements**:
- `LogsTab.tsx` - Enhanced formatting, error handling, empty states

## Implementation Details

### 1. Agent Trace Integration

Agent steps currently return a trace array in AgentStepResult but may not be properly populating it. Ensure the trace array contains a trace entry for the agent execution.

**Key Points**:
- AgentStepResult already has `trace` field defined
- Should contain at least one entry with command (prompt) and output/error
- Exit code should reflect success/failure
- Currently implemented but verify it's working correctly

### 2. Log Formatting Improvements

Enhance readability of log entries with better formatting, especially for multi-line output and JSON data.

**Key Points**:
- Use SyntaxHighlighter for JSON args/output (already in place)
- Improve spacing between log entries
- Handle long output gracefully with word wrapping
- Show clear visual separation between logs from different steps
- Don't show "Started"/"Completed" text when status badge conveys the same info

### 3. Error Handling & Edge Cases

Add defensive handling for malformed or missing data in events and steps.

**Key Points**:
- Safely parse event_data (may be null or invalid JSON)
- Handle missing timestamps gracefully
- Provide fallback for missing step names
- Show meaningful error messages for invalid data

## Files to Create/Modify

### New Files (0)

None - all components already exist

### Modified Files (2)

1. `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx` - Formatting and error handling improvements
2. `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts` - Verify/fix trace array population

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Agent Trace Integration

**Phase Complexity**: 8 points (avg 4.0/10)

- [ ] 1.1 [5/10] Verify agent trace array is properly populated
  - Review createAgentStep.ts trace implementation (lines 153-157)
  - Ensure trace array contains command and output
  - Verify exit code reflects execution result
  - Test with successful and failed agent executions
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`

- [ ] 1.2 [3/10] Add tests for agent trace population
  - Write test verifying trace array structure
  - Test successful execution trace
  - Test failed execution trace with error message
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Log Formatting Improvements

**Phase Complexity**: 9 points (avg 3.0/10)

- [ ] 2.1 [4/10] Improve log entry formatting and readability
  - Remove redundant "Started"/"Completed" text (status badge is sufficient)
  - Keep only error messages visible (not "Failed:" prefix)
  - Improve spacing and visual hierarchy
  - Ensure word wrapping works correctly for long output
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx`

- [ ] 2.2 [3/10] Add defensive parsing for event_data
  - Safely extract level/message from event_data
  - Handle null/undefined event_data gracefully
  - Provide fallback values for missing fields
  - Log warnings for malformed data
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/types.ts`

- [ ] 2.3 [2/10] Improve empty state handling
  - Better message when no logs available
  - Handle steps with no traces or events
  - Show loading state if appropriate
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: Polish & Testing

**Phase Complexity**: 5 points (avg 2.5/10)

- [ ] 3.1 [3/10] Manual testing of all log scenarios
  - Test workflow with multiple steps
  - Test successful vs failed steps
  - Test steps with args/output
  - Test mixed trace and step_log entries
  - Verify chronological ordering
  - Commands: `pnpm dev` and run example workflows

- [ ] 3.2 [2/10] Update tests for new formatting
  - Update snapshot tests if needed
  - Verify types.test.ts covers edge cases
  - Ensure no console errors in browser
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/types.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

**`types.test.ts`** - Already has comprehensive coverage:
- Trace to log entry conversion
- Event to log entry conversion
- Merge logs chronologically
- Edge case handling

**`createStepLog.test.ts`** - Already has comprehensive coverage:
- Log creation at different levels
- JSON serialization
- Error handling

### Integration Tests

Manual workflow execution test:
- Create workflow with agent step that emits logs
- Verify trace array is populated
- Verify logs appear in correct order
- Verify formatting is clean and readable
- Test error scenarios (failed steps, missing data)

### E2E Tests (if applicable)

Not required - manual testing sufficient for UI polish.

## Success Criteria

- [ ] Agent steps populate trace array with execution details
- [ ] Trace entries include command, output/error, and exit code
- [ ] Log formatting is clean without redundant text
- [ ] Error messages are clear and properly displayed
- [ ] JSON args/output use syntax highlighting
- [ ] Empty states show helpful messages
- [ ] Event_data parsing handles null/invalid data gracefully
- [ ] Chronological ordering works across all log types
- [ ] No console errors or warnings in browser
- [ ] All existing tests pass
- [ ] Manual testing confirms improved readability

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
pnpm --filter app test
# Expected: all tests pass
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: Workflow execution detail page
3. Click: Logs tab
4. Verify: Clean formatting without redundant text
5. Verify: Step lifecycle badges are visible
6. Verify: Args/output are collapsible with syntax highlighting
7. Verify: Error messages display correctly
8. Check console: No errors or warnings

**Feature-Specific Checks:**

- Run workflow with agent step
- Verify trace entry appears in logs
- Verify "Started"/"Completed" text is hidden (status badge shown)
- Verify error messages show without "Failed:" prefix
- Verify long JSON output is properly formatted
- Verify empty workflow run shows helpful message
- Test workflow with multiple phases and steps

## Implementation Notes

### 1. Current Status

The logging system v2 is largely implemented:
- createStepLog factory exists and works
- LogsTab displays step lifecycle, status badges, collapsible sections
- Chronological merging of traces and events is working

### 2. Focus Areas for v3

Main improvements needed:
- Verify agent trace array population is correct
- Polish log formatting (remove redundancy)
- Strengthen error handling for edge cases
- Improve visual clarity and spacing

### 3. Agent Trace Structure

AgentStepResult trace should have this structure:

```typescript
trace: [{
  command: config.prompt,
  output: result.data || result.error,
  exitCode: result.exitCode,
}]
```

### 4. UI Formatting Rules

- Show status badge (running/completed/failed) instead of text
- Only show error message content (not "Failed:" label)
- Hide "Started"/"Completed" text (redundant with badge)
- Use consistent spacing and indentation
- Collapsible sections should be clearly marked

## Dependencies

- No new dependencies required
- Uses existing SyntaxHighlighter component
- Uses existing type conversion functions

## References

- Previous spec: `.agent/specs/todo/251116055018-workflow-step-logging-v2/spec.md`
- Related spec: `.agent/specs/todo/251115143849-workflow-logging/spec.md` (completed)
- LogsTab component: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx`
- Agent step: `apps/app/src/server/domain/workflow/services/engine/steps/createAgentStep.ts`

## Next Steps

1. Verify agent trace array implementation is correct
2. Polish log formatting to remove redundancy
3. Add defensive error handling
4. Test with various workflow scenarios
5. Document logging best practices for workflow developers
