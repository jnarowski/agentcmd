# Workflow Logging V4 - Step Selection and Log Navigation

**Status**: draft
**Created**: 2025-11-16
**Package**: apps/app
**Total Complexity**: 32 points
**Phases**: 3
**Tasks**: 10
**Overall Avg Complexity**: 3.2/10

## Complexity Breakdown

| Phase                            | Tasks | Total Points | Avg Complexity | Max Task |
| -------------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Step Selection System  | 4     | 14           | 3.5/10         | 5/10     |
| Phase 2: Log Navigation          | 3     | 10           | 3.3/10         | 5/10     |
| Phase 3: UI Polish and Testing   | 3     | 8            | 2.7/10         | 4/10     |
| **Total**                        | **10**| **32**       | **3.2/10**     | **5/10** |

## Overview

Enhance workflow logging UI by implementing step selection that automatically navigates to logs tab and scrolls to the selected step's logs. Improves workflow debugging by creating a seamless connection between timeline steps and their corresponding log entries.

## User Story

As a workflow developer
I want to click on a step in the timeline and see its logs immediately
So that I can quickly debug issues without manually searching through logs

## Technical Approach

Implement a step selection system that:
1. Passes step selection callbacks through the component hierarchy (PhaseTimeline → PhaseCard → StepRow)
2. Stores selected step ID in panel state hook
3. Automatically switches to logs tab when step selected
4. Scrolls to selected step's first log entry using data attributes
5. Highlights selected step's logs with visual indicator

## Key Design Decisions

1. **Callback Propagation**: Pass `onSelectStep` through component hierarchy rather than global state to maintain component encapsulation
2. **Auto-tab Switching**: Clicking step automatically switches to logs tab for immediate feedback
3. **Data Attributes for Selection**: Use `data-step-id` attributes for scroll targeting (simple, reliable)
4. **Visual Highlighting**: Add background highlight to selected step's logs using conditional styling
5. **Unified Step Click Handler**: Both StepDefaultRow and StepGitRow call same handlers for consistency

## Architecture

### File Structure
```
apps/app/src/client/pages/projects/workflows/
├── WorkflowRunDetailPage.tsx                 # Root component - passes callbacks
├── hooks/
│   └── useWorkflowDetailPanel.ts             # Add selectedStepId state
├── components/
│   ├── detail-panel/
│   │   ├── WorkflowDetailPanel.tsx           # Pass selectedStepId to LogsTab
│   │   └── LogsTab.tsx                       # Scroll to + highlight selected step
│   └── timeline/
│       ├── PhaseTimeline.tsx                 # Pass onSelectStep to PhaseCard
│       ├── PhaseCard.tsx                     # Pass onSelectStep to StepRow
│       ├── StepRow.tsx                       # Pass onSelectStep to specific rows
│       ├── StepDefaultRow.tsx                # Call onSelectStep + onSetActiveTab
│       ├── StepGitRow.tsx                    # Call onSelectStep + onSetActiveTab
│       └── TimelineRow.tsx                   # Add onClick support
```

### Integration Points

**Timeline Components**:
- `PhaseTimeline.tsx` - Forward `onSelectStep` prop
- `PhaseCard.tsx` - Forward `onSelectStep` to StepRow
- `StepRow.tsx` - Forward to specialized components
- `StepDefaultRow.tsx` - Call both `onSelectStep` and `onSetActiveTab("logs")`
- `StepGitRow.tsx` - Call both `onSelectStep` and `onSetActiveTab("logs")`
- `TimelineRow.tsx` - Support `onClick` prop for clickable rows

**Detail Panel**:
- `WorkflowDetailPanel.tsx` - Pass `selectedStepId` to LogsTab
- `LogsTab.tsx` - Add scroll behavior with useEffect, highlight with conditional styling
- `useWorkflowDetailPanel.ts` - Add `selectedStepId` state + setter

## Implementation Details

### 1. Step Selection State Hook

Add `selectedStepId` to the detail panel state hook to track which step user clicked.

**Key Points**:
- Add to existing `useWorkflowDetailPanel` hook
- Include setter function `setSelectedStep`
- Clear selection in `clearSelection` function
- Return in hook interface alongside existing state

### 2. Callback Propagation Chain

Thread `onSelectStep` callback through component hierarchy from root to leaf components.

**Key Points**:
- Start at `WorkflowRunDetailPage` with `setSelectedStep` from hook
- Pass through `PhaseTimeline` → `PhaseCard` → `StepRow` → specific row components
- All props optional (use `?:` syntax) for backward compatibility
- No global state - pure prop drilling for simplicity

### 3. Step Click Handlers

Both step row variants call selection handlers when clicked.

**Key Points**:
- `StepDefaultRow` and `StepGitRow` both implement same click behavior
- Call `onSelectStep(step.id)` to store step ID
- Call `onSetActiveTab("logs")` to switch to logs tab
- Use existing `TimelineRow` onClick wrapper

### 4. Log Entry Highlighting

Visual indicator in LogsTab showing selected step's logs.

**Key Points**:
- Compare `log.stepId` with `selectedStepId` prop
- Add conditional class: `bg-blue-500/10 -mx-2 px-2 py-1 rounded`
- Apply to log entry wrapper div
- Only highlight when step IDs match

### 5. Auto-scroll to Selected Step

Scroll logs tab to first log entry of selected step when selection changes.

**Key Points**:
- Use `useEffect` with `selectedStepId` dependency
- Query for `[data-step-id="${selectedStepId}"]`
- Call `scrollIntoView({ behavior: 'smooth', block: 'start' })`
- Guard with null check on selectedStepId

## Files to Create/Modify

### New Files (0)

None - all changes to existing files

### Modified Files (10)

1. `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx` - Pass callbacks from hook
2. `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDetailPanel.ts` - Add selectedStepId state
3. `apps/app/src/client/pages/projects/workflows/components/detail-panel/WorkflowDetailPanel.tsx` - Pass selectedStepId prop
4. `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx` - Scroll + highlight logic
5. `apps/app/src/client/pages/projects/workflows/components/timeline/PhaseTimeline.tsx` - Forward onSelectStep
6. `apps/app/src/client/pages/projects/workflows/components/timeline/PhaseCard.tsx` - Forward onSelectStep
7. `apps/app/src/client/pages/projects/workflows/components/timeline/StepRow.tsx` - Forward onSelectStep
8. `apps/app/src/client/pages/projects/workflows/components/timeline/StepDefaultRow.tsx` - Call handlers
9. `apps/app/src/client/pages/projects/workflows/components/timeline/StepGitRow.tsx` - Call handlers
10. `apps/app/src/client/pages/projects/workflows/components/timeline/TimelineRow.tsx` - Support onClick

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Step Selection System

**Phase Complexity**: 14 points (avg 3.5/10)

- [ ] 1.1 [3/10] Add selectedStepId state to useWorkflowDetailPanel hook
  - Add `selectedStepId: string | null` state with useState
  - Add `setSelectedStep: (stepId: string | null) => void` setter
  - Update `clearSelection` to also clear `selectedStepId`
  - Export in hook return object
  - File: `apps/app/src/client/pages/projects/workflows/hooks/useWorkflowDetailPanel.ts`

- [ ] 1.2 [2/10] Pass step selection callbacks from WorkflowRunDetailPage
  - Extract `setSelectedStep` from `useWorkflowDetailPanel()`
  - Pass `onSelectStep={setSelectedStep}` to PhaseTimeline
  - Pass `selectedStepId` to WorkflowDetailPanel
  - File: `apps/app/src/client/pages/projects/workflows/WorkflowRunDetailPage.tsx`

- [ ] 1.3 [5/10] Thread onSelectStep through timeline component hierarchy
  - Add `onSelectStep?: (stepId: string) => void` prop to PhaseTimeline interface
  - Forward to PhaseCard components
  - Add prop to PhaseCard interface, forward to StepRow
  - Add prop to StepRow interface, forward to specific row components
  - File: `apps/app/src/client/pages/projects/workflows/components/timeline/PhaseTimeline.tsx`
  - File: `apps/app/src/client/pages/projects/workflows/components/timeline/PhaseCard.tsx`
  - File: `apps/app/src/client/pages/projects/workflows/components/timeline/StepRow.tsx`

- [ ] 1.4 [4/10] Add click handlers to step row components
  - Add onClick wrapper to TimelineRow with optional onClick prop
  - Call `onSelectStep?.(step.id)` in StepDefaultRow onClick
  - Call `onSetActiveTab?.("logs")` in StepDefaultRow onClick
  - Call `onSelectStep?.(step.id)` in StepGitRow onClick
  - Call `onSetActiveTab?.("logs")` in StepGitRow onClick
  - File: `apps/app/src/client/pages/projects/workflows/components/timeline/TimelineRow.tsx`
  - File: `apps/app/src/client/pages/projects/workflows/components/timeline/StepDefaultRow.tsx`
  - File: `apps/app/src/client/pages/projects/workflows/components/timeline/StepGitRow.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 2: Log Navigation

**Phase Complexity**: 10 points (avg 3.3/10)

- [ ] 2.1 [2/10] Pass selectedStepId to LogsTab component
  - Add `selectedStepId` prop to WorkflowDetailPanel interface
  - Pass through to LogsTab in TabsContent
  - Add to LogsTabProps interface
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/WorkflowDetailPanel.tsx`
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx`

- [ ] 2.2 [5/10] Implement auto-scroll to selected step's logs
  - Add useEffect with selectedStepId dependency
  - Query for `document.querySelector([data-step-id="${selectedStepId}"])`
  - Call scrollIntoView with smooth behavior
  - Guard with null check
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx`

- [ ] 2.3 [3/10] Add visual highlight to selected step logs
  - Compare `log.stepId === selectedStepId` in LogEntry component
  - Add conditional class for highlight: `bg-blue-500/10 -mx-2 px-2 py-1 rounded`
  - Apply to log entry wrapper div
  - File: `apps/app/src/client/pages/projects/workflows/components/detail-panel/LogsTab.tsx`

#### Completion Notes

(This will be filled in by the agent implementing this phase)

### Phase 3: UI Polish and Testing

**Phase Complexity**: 8 points (avg 2.7/10)

- [ ] 3.1 [3/10] Verify selection clearing behavior
  - Test that clearSelection clears selectedStepId
  - Verify selection clears when runId changes (useEffect in WorkflowRunDetailPage)
  - Check no errors when clicking steps without onSelectStep callback
  - Manual testing

- [ ] 3.2 [4/10] Test complete user flow
  - Click step in timeline → logs tab opens
  - Verify scroll to step's first log entry
  - Verify visual highlight on selected step
  - Test with git/cli steps (compact rows)
  - Test with agent/ai steps (full rows)
  - Test rapid clicking between steps
  - Manual testing in dev environment

- [ ] 3.3 [1/10] Verify TypeScript compilation
  - Run type check to ensure no prop type errors
  - Command: `pnpm --filter app check-types`
  - Expected: No type errors

#### Completion Notes

(This will be filled in by the agent implementing this phase)

## Testing Strategy

### Unit Tests

Not applicable - primarily UI integration work with no complex logic requiring unit tests.

### Integration Tests

Not applicable - would require E2E testing framework for DOM interaction testing.

### E2E Tests (if applicable)

Future work: Add Playwright test for step selection flow once E2E framework established.

## Success Criteria

- [ ] Clicking any step in timeline immediately switches to logs tab
- [ ] Logs tab scrolls to selected step's first log entry smoothly
- [ ] Selected step's logs are visually highlighted with blue background
- [ ] Works for all step types (agent, ai, git, cli)
- [ ] Selection clears when navigating to different workflow run
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] No React useEffect dependency warnings

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Linting
pnpm --filter app lint
# Expected: No lint errors

# Build verification
pnpm --filter app build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: Workflow run detail page (`/projects/:id/workflows/:defId/:runId`)
3. Verify: Click on any step in left timeline
4. Check: Logs tab automatically opens in right panel
5. Check: Logs scroll to show selected step's entries first
6. Check: Selected step's logs have blue highlight background
7. Test: Click different steps rapidly - should update smoothly
8. Test: Navigate to different run - selection should clear
9. Check console: No errors or warnings

**Feature-Specific Checks:**

- Test with running workflow to ensure live updates work
- Test with failed steps - should navigate to error logs
- Test with steps that have no logs - should not error
- Test on mobile (if responsive layout exists)
- Verify keyboard accessibility if needed

## Implementation Notes

### 1. Why Prop Drilling vs Global State

Prop drilling chosen over Zustand/context for step selection because:
- Selection is localized to single page component tree
- No cross-page state sharing needed
- Simpler to debug callback flow
- Less overhead for simple feature

### 2. Data Attributes for Scroll Targeting

Using data attributes (`data-step-id`) rather than refs because:
- Logs are dynamically rendered list items
- Don't need imperative DOM access beyond scroll
- querySelector is sufficient and simpler
- Refs array would add complexity for minimal benefit

### 3. Auto-tab Switching UX

Automatically switching to logs tab when step clicked provides better UX than:
- Requiring user to manually switch tabs (extra click)
- Showing selection indicator in current tab (unclear what happened)
- Opening modal (too disruptive)

## Dependencies

- No new dependencies required
- Uses existing React hooks (useState, useEffect)
- Uses existing lucide-react icons
- Uses existing UI components (tabs, buttons)

## References

- Related: `.agent/specs/todo/251116063046-logging-v3-enhancements/spec.md` - Previous logging improvements
- Related: `.agent/specs/todo/251115143849-workflow-logging/spec.md` - Initial logging implementation
- Pattern: `apps/app/src/client/CLAUDE.md` - React patterns and useEffect rules

## Next Steps

1. Implement Phase 1: Step Selection System
2. Implement Phase 2: Log Navigation
3. Implement Phase 3: UI Polish and Testing
4. Test complete flow with running workflow
5. Consider follow-up: Keyboard navigation between steps (arrow keys)
6. Consider follow-up: Deep linking to specific step via URL params
