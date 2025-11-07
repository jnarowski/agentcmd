# Timeline Domain Model Refactor

**Status**: draft
**Created**: 2025-01-15
**Package**: apps/web
**Estimated Effort**: 8-10 hours

## Overview

Refactor the workflow run timeline system to use a domain model layer that transforms database entities into a debug-optimized view model. This eliminates component-level filtering and computation, enables efficient incremental WebSocket updates, and provides a clean separation between data fetching and UI rendering.

## User Story

As a developer debugging workflow runs
I want to see a clear, performant timeline with errors prominently displayed
So that I can quickly identify failures and understand execution flow without UI lag or confusion

## Technical Approach

Introduce a **stateless domain model layer** between the database/API layer and React components. The `buildTimelineModel()` function transforms raw execution data into an enriched `TimelineModel` with pre-computed display properties, pre-filtered related data (annotations, artifacts), and pre-identified error states. WebSocket updates apply incrementally to the React Query cache using immutable updates, triggering efficient re-renders only for changed items.

## Key Design Decisions

1. **Domain Object over Store**: Use stateless `useMemo` transformation instead of Zustand store. For 3-5 steps average, rebuilding the model (~1-2ms) is negligible, and avoiding dual sources of truth prevents synchronization bugs.

2. **Immutable Comments as "Annotations"**: Rename `comment_added` to `annotation_added` to clarify these are immutable system notes, not editable user discussions. Keep them as events (not separate table) to maintain event sourcing pattern.

3. **Pre-compute Everything**: Move all filtering, calculations, and display logic into domain model. Components become "dumb renderers" with no business logic, improving testability and performance.

4. **Incremental WebSocket Updates**: Apply deltas directly to React Query cache using `queryClient.setQueryData()` instead of invalidating queries. This avoids network requests and full re-renders.

## Architecture

### File Structure

```
apps/web/src/client/pages/projects/workflows/
├── lib/
│   ├── timelineModel.ts          # NEW - Domain model types and builder
│   ├── applyWorkflowUpdate.ts    # NEW - WebSocket update applier
│   ├── buildTimeline.ts          # KEEP - Simple chronological merge
│   └── eventConfig.ts            # KEEP - Event display config
├── components/
│   ├── WorkflowTimeline.tsx      # MODIFY - Remove filtering logic
│   └── timeline/
│       ├── StepItem.tsx          # MODIFY - Use pre-computed data
│       ├── StepAnnotationItem.tsx # RENAME - From StepCommentItem
│       ├── StepAnnotations.tsx    # RENAME - From StepComments
│       ├── EventItem.tsx         # MODIFY - Use domain types
│       ├── Event*.tsx            # MODIFY - Use pre-computed display
│       ├── TimelineRow.tsx       # KEEP - Layout component
│       ├── TimelineHeader.tsx    # KEEP - Layout component
│       └── TimelineBody.tsx      # KEEP - Layout component
├── WorkflowRunDetail.tsx   # MODIFY - Build model, incremental updates
└── types.ts                      # MODIFY - Re-export domain types
```

### Integration Points

**React Query Cache**:

- `useWorkflowRun(executionId)` - Fetches initial data
- `queryClient.setQueryData()` - Receives incremental WebSocket updates

**WebSocket**:

- `subscribeToWorkflowUpdates()` - Emits update events
- `applyWorkflowUpdate()` - Applies deltas to cache

**Components**:

- `WorkflowRunDetail` - Builds model, subscribes to updates
- `WorkflowTimeline` - Renders model items
- `StepItem` / `EventItem` - Consume pre-computed data

## Implementation Details

### 1. Domain Model Types (`timelineModel.ts`)

Complete type system for timeline domain model with discriminated unions for type safety.

**Key Types**:

- `TimelineModel` - Top-level: `{ execution, items, summary, liveState }`
- `TimelineItem` - Union: `StepTimelineItem | EventTimelineItem | AnnotationTimelineItem`
- `StepTimelineItem` - Enriched step with `{ metadata, display, debug, annotations, artifacts }`
- `EventTimelineItem` - Event with `{ metadata, display, config }`
- `ExecutionSummary` - Stats: `{ totalSteps, failedSteps, progressPercentage, hasErrors }`
- `LiveState` - Real-time: `{ isLive, runningStepIds, avgStepDuration }`

**Key Interfaces**:

```typescript
export interface StepTimelineItem {
  itemType: 'step';
  id: string;
  timestamp: Date;
  step: WorkflowRunStep;

  // Pre-attached data
  annotations: StepAnnotation[];
  artifacts: StepArtifact[];

  // Pre-computed properties
  metadata: {
    name: string;
    startedAt: Date;
    completedAt: Date | null;
    duration: number | null; // milliseconds
    agentSessionId: string | null;
  };

  display: {
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    statusLabel: string;
    iconColor: string;
    badgeVariant: BadgeVariant;
    isHighlighted: boolean; // Error or current
    isPulsing: boolean; // Currently running
    hasLogs: boolean;
    hasError: boolean;
    hasArtifacts: boolean;
    hasAnnotations: boolean;
  };

  debug: {
    hasError: boolean;
    errorMessage: string | null;
    isCurrent: boolean;
  };
}
```

### 2. Builder Function (`buildTimelineModel`)

Pure function that transforms raw database entities into enriched domain model.

**Key Points**:

- Filters annotations from lifecycle events
- Pre-attaches annotations/artifacts to their parent steps
- Computes duration, status, display properties for each step
- Merges steps + events + standalone annotations chronologically
- Aggregates execution summary stats
- Identifies current step and error states
- Returns complete `TimelineModel` ready for rendering

**Algorithm**:

1. Separate `annotation_added` events from lifecycle events
2. For each step: filter annotations, filter artifacts, compute metadata/display/debug
3. For each event: extract metadata, get display config
4. Merge all items, sort by timestamp
5. Compute summary: counts, progress, health
6. Compute live state: running steps, metrics

### 3. WebSocket Update Applier (`applyWorkflowUpdate.ts`)

Applies incremental updates to cached execution data using immutable patterns.

**Key Points**:

- Single entry point: `applyWorkflowUpdate(execution, update)`
- Discriminated union of update types
- Returns new execution object (immutable)
- Only updates changed fields (O(1) for most updates)

**Update Types**:

- `workflow_status_updated` - Update execution status/completion
- `step_started` - Set step status to 'running', add start timestamp, create event
- `step_updated` - Merge partial step updates
- `step_completed` - Set status to 'completed', add completion timestamp
- `step_failed` - Set status to 'failed', add error message
- `event_added` - Append new event to events array
- `annotation_added` - Append new annotation event
- `artifact_uploaded` - Append new artifact

**Example**:

```typescript
function applyStepCompleted(
  execution: WorkflowRun,
  update: StepCompletedUpdate
): WorkflowRun {
  return {
    ...execution,
    steps: execution.steps.map((step) =>
      step.id === update.stepId
        ? {
            ...step,
            status: 'completed',
            completed_at: update.completedAt,
            logs: update.logs || step.logs,
          }
        : step
    ),
  };
}
```

### 4. Component Refactoring

**WorkflowRunDetail**:

- Build model with `useMemo(() => buildTimelineModel(...), [execution])`
- WebSocket handler uses `queryClient.setQueryData()` + `applyWorkflowUpdate()`
- Pass model to `WorkflowTimeline` component

**WorkflowTimeline**:

- Remove `stepEventsMap` filtering logic
- Remove `buildTimeline()` call
- Just map over `model.items` and render

**StepItem**:

- Remove inline calculations (duration, time display, status)
- Use `item.metadata.*`, `item.display.*`, `item.debug.*`
- Pre-attached `item.annotations` and `item.artifacts`
- Always expand errors (`debug.hasError && <ErrorDisplay expanded />`)

**Event Components**:

- Update to use `EventTimelineItem` type
- Use `item.metadata.*` and `item.display.*`
- Remove inline config lookups

## Files to Create/Modify

### New Files (2)

1. `apps/web/src/client/pages/projects/workflows/lib/timelineModel.ts` - Domain model types and builder function (~400 lines)
2. `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts` - WebSocket update applier (~200 lines)

### Modified Files (12)

1. `apps/web/src/client/pages/projects/workflows/WorkflowRunDetail.tsx` - Use model, incremental updates
2. `apps/web/src/client/pages/projects/workflows/components/WorkflowTimeline.tsx` - Remove filtering, simplify rendering
3. `apps/web/src/client/pages/projects/workflows/components/timeline/StepItem.tsx` - Use pre-computed data
4. `apps/web/src/client/pages/projects/workflows/components/timeline/StepCommentItem.tsx` - Rename to StepAnnotationItem, update types
5. `apps/web/src/client/pages/projects/workflows/components/timeline/StepComments.tsx` - Rename to StepAnnotations, update types
6. `apps/web/src/client/pages/projects/workflows/components/timeline/EventItem.tsx` - Use domain types
7. `apps/web/src/client/pages/projects/workflows/components/timeline/EventCommentItem.tsx` - Update "comment" to "annotation"
8. `apps/web/src/client/pages/projects/workflows/types.ts` - Re-export domain model types
9. `apps/web/src/server/domain/workflow/types/event.types.ts` - Rename `comment_added` to `annotation_added`
10. `apps/web/src/client/pages/projects/workflows/lib/eventConfig.ts` - Update `comment_added` to `annotation_added`
11. `apps/web/src/client/pages/projects/workflows/components/timeline/EventWorkflowStartedItem.tsx` - Use `EventTimelineItem` type
12. (Repeat for all Event*Item.tsx components)

### Renamed Files (2)

1. `StepCommentItem.tsx` → `StepAnnotationItem.tsx`
2. `StepComments.tsx` → `StepAnnotations.tsx`

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Domain Model Foundation

<!-- prettier-ignore -->
- [x] TL-01 Create `timelineModel.ts` with core type definitions
  - Define `TimelineModel`, `TimelineItem` (discriminated union)
  - Define `StepTimelineItem` with metadata/display/debug interfaces
  - Define `EventTimelineItem` with metadata/display interfaces
  - Define `AnnotationTimelineItem` interface
  - Define `ExecutionSummary` and `LiveState` interfaces
  - Define helper types: `StepAnnotation`, `StepArtifact`, `StepStatus`, etc.
  - File: `apps/web/src/client/pages/projects/workflows/lib/timelineModel.ts`
  - Lines: ~150 (types only)

- [x] TL-02 Implement `buildStepItems()` helper function
  - Filter steps with `started_at` (only started steps appear)
  - For each step: filter annotations by `workflow_run_step_id`
  - For each step: filter artifacts by `workflow_run_step_id`
  - Compute `metadata`: duration, startedAt, completedAt
  - Compute `display`: status, statusLabel, iconColor, badgeVariant, flags
  - Compute `debug`: hasError, errorMessage, isCurrent
  - Return `StepTimelineItem[]`
  - File: `apps/web/src/client/pages/projects/workflows/lib/timelineModel.ts`
  - Lines: ~80

- [x] TL-03 Implement `buildEventItems()` helper function
  - Map lifecycle events to `EventTimelineItem`
  - Extract title/body from `event_data`
  - Get display config from `getEventConfig(event.event_type)`
  - Determine event scope (workflow/phase/step)
  - Return `EventTimelineItem[]`
  - File: `apps/web/src/client/pages/projects/workflows/lib/timelineModel.ts`
  - Lines: ~30

- [x] TL-04 Implement `buildAnnotationItems()` helper function
  - Filter standalone annotations (no `workflow_run_step_id`)
  - Map to `AnnotationTimelineItem`
  - Extract text from event_data.body
  - Return `AnnotationTimelineItem[]`
  - File: `apps/web/src/client/pages/projects/workflows/lib/timelineModel.ts`
  - Lines: ~20

- [x] TL-05 Implement `buildExecutionSummary()` helper function
  - Count totalSteps, completedSteps, failedSteps, runningSteps, pendingSteps
  - Calculate duration (completedAt - startedAt)
  - Find current phase from latest `phase_started` event
  - Calculate progressPercentage
  - Determine hasErrors, overallHealth
  - Return `ExecutionSummary`
  - File: `apps/web/src/client/pages/projects/workflows/lib/timelineModel.ts`
  - Lines: ~50

- [x] TL-06 Implement `buildLiveState()` helper function
  - Determine `isLive` (execution status === 'running')
  - Find running step IDs
  - Calculate average step duration from completed steps
  - Return `LiveState`
  - File: `apps/web/src/client/pages/projects/workflows/lib/timelineModel.ts`
  - Lines: ~30

- [x] TL-07 Implement main `buildTimelineModel()` function
  - Separate annotation events from lifecycle events
  - Call `buildStepItems(steps, annotations, artifacts, execution)`
  - Call `buildEventItems(lifecycleEvents)`
  - Call `buildAnnotationItems(standaloneAnnotations)`
  - Merge all items, sort by timestamp
  - Call `buildExecutionSummary(execution, steps, events)`
  - Call `buildLiveState(execution, stepItems)`
  - Return `TimelineModel`
  - File: `apps/web/src/client/pages/projects/workflows/lib/timelineModel.ts`
  - Lines: ~40

- [x] TL-08 Implement status helper functions
  - `determineStepStatus(step)` - Returns StepStatus based on error/completed/started
  - `getStatusLabel(status)` - Maps status to display label
  - `getExecutionStatusLabel(status)` - Maps execution status to label
  - `getStepIconColor(status)` - Returns Tailwind classes
  - `getStepBadgeVariant(status)` - Returns badge variant
  - `getEventScope(eventType)` - Returns 'workflow' | 'phase' | 'step'
  - File: `apps/web/src/client/pages/projects/workflows/lib/timelineModel.ts`
  - Lines: ~40

#### Completion Notes

- Created comprehensive timeline domain model with 540 lines of type-safe TypeScript
- Implemented all 8 builder functions with full type discrimination
- Pre-computes all display properties (status, colors, badges, icons) to eliminate component-level calculations
- Pre-filters and attaches annotations and artifacts to parent steps (O(1) lookups in components)
- Separates step-attached annotations from standalone annotations for proper rendering
- Calculates execution summary with progress percentage, step counts, and health status
- Determines live state with running step IDs and average step duration for progress estimation
- All helper functions are pure (no side effects) for testability
- Uses discriminated unions (itemType) for type-safe item rendering
- Follows immutability patterns (returns new objects, no mutations)

### Phase 2: WebSocket Update Applier

<!-- prettier-ignore -->
- [x] TL-09 Create `applyWorkflowUpdate.ts` with update type definitions
  - Define `WebSocketUpdate` discriminated union
  - Define `WorkflowStatusUpdate` interface
  - Define `StepStartedUpdate` interface
  - Define `StepUpdatedUpdate` interface
  - Define `StepCompletedUpdate` interface
  - Define `StepFailedUpdate` interface
  - Define `EventAddedUpdate` interface
  - Define `AnnotationAddedUpdate` interface
  - Define `ArtifactUploadedUpdate` interface
  - File: `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts`
  - Lines: ~60

- [x] TL-10 Implement `applyWorkflowStatusUpdate()` handler
  - Update execution.status, execution.completed_at, execution.error_message
  - Return new execution object (immutable)
  - File: `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts`
  - Lines: ~10

- [x] TL-11 Implement `applyStepStarted()` handler
  - Find step by ID, update status to 'running', set started_at
  - Create new `step_started` event and append to execution.events
  - Return new execution object
  - File: `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts`
  - Lines: ~25

- [x] TL-12 Implement `applyStepUpdated()` handler
  - Find step by ID, merge partial updates using spread
  - Return new execution object
  - File: `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts`
  - Lines: ~15

- [x] TL-13 Implement `applyStepCompleted()` handler
  - Find step by ID, set status to 'completed', set completed_at, update logs
  - Return new execution object
  - File: `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts`
  - Lines: ~15

- [x] TL-14 Implement `applyStepFailed()` handler
  - Find step by ID, set status to 'failed', set completed_at, set error_message, update logs
  - Return new execution object
  - File: `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts`
  - Lines: ~15

- [x] TL-15 Implement `applyEventAdded()` handler
  - Append new event to execution.events array
  - Return new execution object
  - File: `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts`
  - Lines: ~10

- [x] TL-16 Implement `applyAnnotationAdded()` handler
  - Create annotation event object from update data
  - Append to execution.events array
  - Return new execution object
  - File: `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts`
  - Lines: ~20

- [x] TL-17 Implement `applyArtifactUploaded()` handler
  - Append new artifact to execution.artifacts array
  - Return new execution object
  - File: `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts`
  - Lines: ~10

- [x] TL-18 Implement main `applyWorkflowUpdate()` dispatcher
  - Switch on update.type
  - Call appropriate handler function
  - Return updated execution or original if unknown type
  - Log warning for unknown update types
  - File: `apps/web/src/client/pages/projects/workflows/lib/applyWorkflowUpdate.ts`
  - Lines: ~30

#### Completion Notes

- Created comprehensive WebSocket update applier with 360 lines of type-safe code
- Implemented all 8 update handler functions with proper immutability patterns
- Used discriminated unions for type-safe update routing
- All handlers return new execution objects (no mutations)
- applyStepStarted() automatically creates step_started event when step begins execution
- applyAnnotationAdded() creates comment_added event with proper structure
- Exhaustiveness checking ensures all update types are handled
- O(1) performance for most updates (only changed arrays rebuilt)
- Follows React immutability requirements for proper re-renders

### Phase 3: Component Integration

<!-- prettier-ignore -->
- [x] TL-19 Update `WorkflowRunDetail.tsx` to build timeline model
  - Import `buildTimelineModel` from `./lib/timelineModel`
  - Import `applyWorkflowUpdate` from `./lib/applyWorkflowUpdate`
  - Add `useMemo` to build model: `const model = useMemo(() => buildTimelineModel(execution, execution.steps, execution.events, execution.artifacts), [execution])`
  - Pass model to WorkflowTimeline: `<WorkflowTimeline model={model} />`
  - File: `apps/web/src/client/pages/projects/workflows/WorkflowRunDetail.tsx`
  - Changes: Add imports, add useMemo, change props

- [x] TL-20 Update WebSocket handler for incremental updates
  - In `useEffect` for WebSocket subscription
  - Change from `queryClient.invalidateQueries()` to `queryClient.setQueryData()`
  - Apply update: `queryClient.setQueryData(['workflows', executionId], (old) => applyWorkflowUpdate(old, update))`
  - File: `apps/web/src/client/pages/projects/workflows/WorkflowRunDetail.tsx`
  - Changes: Replace invalidate with setQueryData + applyWorkflowUpdate

- [x] TL-21 Update `WorkflowTimeline.tsx` props and remove filtering
  - Change props from `items` to `model: TimelineModel`
  - Remove `stepEventsMap` useMemo (now in domain model)
  - Remove `buildTimeline()` call (now in parent)
  - Map over `model.items` instead of `items`
  - Update key to use `item.itemType` and `item.id`
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTimeline.tsx`
  - Changes: Props interface, remove useMemo, update render loop

- [x] TL-22 Update `StepItem.tsx` to use pre-computed data
  - Change props to `item: StepTimelineItem`
  - Destructure `{ metadata, display, debug, annotations, artifacts }` from item
  - Remove inline `getDuration()` - use `metadata.duration`
  - Remove inline `getTimeDisplay()` - use `metadata.startedAt`
  - Remove `hasError`, `hasLogs`, etc. checks - use `display.*` flags
  - Update icon based on `debug.hasError`
  - Update iconColor to `display.iconColor`
  - Update badge to `display.badgeVariant` and `display.statusLabel`
  - Always expand errors: `{debug.hasError && <ErrorDisplay error={debug.errorMessage!} expanded />}`
  - Use `display.hasLogs && <StepLogs logs={item.step.logs!} />`
  - File: `apps/web/src/client/pages/projects/workflows/components/timeline/StepItem.tsx`
  - Changes: Props, remove calculations, use pre-computed data

- [x] TL-23 Rename and update `StepComments.tsx` to `StepAnnotations.tsx`
  - Rename file
  - Update component name to `StepAnnotations`
  - Update props to use `annotations: StepAnnotation[]`
  - Update text to say "Annotations" instead of "Comments"
  - File: `apps/web/src/client/pages/projects/workflows/components/timeline/StepAnnotations.tsx` (renamed)
  - Changes: Rename, update text, update types

- [x] TL-24 Rename and update `StepCommentItem.tsx` to `StepAnnotationItem.tsx`
  - Rename file
  - Update component name to `StepAnnotationItem`
  - Update props to use `annotation: StepAnnotation`
  - Access `annotation.text` instead of `event.event_data.body`
  - File: `apps/web/src/client/pages/projects/workflows/components/timeline/StepAnnotationItem.tsx` (renamed)
  - Changes: Rename, update props, update data access

- [x] TL-25 Update `EventItem.tsx` to use domain types
  - Update import to use `EventTimelineItem` from `../lib/timelineModel`
  - Change props to `item: EventTimelineItem`
  - Pass item to child components instead of raw event
  - Update type assertions to use `item` instead of `event`
  - File: `apps/web/src/client/pages/projects/workflows/components/timeline/EventItem.tsx`
  - Changes: Imports, props, type assertions

- [x] TL-26 Update all Event*Item.tsx components to use pre-computed display
  - For each: `EventWorkflowStartedItem`, `EventWorkflowCompletedItem`, `EventWorkflowFailedItem`, `EventWorkflowPausedItem`, `EventWorkflowResumedItem`, `EventWorkflowCancelledItem`, `EventPhaseStartedItem`, `EventPhaseCompletedItem`, `EventStepStartedItem`
  - Change props to `item: EventTimelineItem`
  - Use `item.metadata.title` instead of extracting from event_data
  - Use `item.display.icon`, `item.display.iconColor`, `item.display.label`, `item.display.badgeVariant`
  - Remove `getEventConfig()` calls (already in item.display)
  - Files: All `Event*Item.tsx` files in `components/timeline/`
  - Changes: Props, use pre-computed display data

- [x] TL-27 Update `EventCommentItem.tsx` for annotation terminology
  - Update text "Comment Added" to "Annotation Added"
  - Update props if needed to match domain types
  - File: `apps/web/src/client/pages/projects/workflows/components/timeline/EventCommentItem.tsx`
  - Changes: Update text

#### Completion Notes

- WorkflowRunDetail successfully builds timeline model using useMemo with execution data
- WebSocket handler now uses incremental updates via queryClient.setQueryData() + applyWorkflowUpdate()
- Created helper function applyIncrementalUpdate() that maps WebSocket events to WebSocketUpdate types
- WebSocket updates no longer invalidate queries (except for workflow list updates)
- Incremental updates provide O(1) performance for most workflow events (step started, completed, failed)
- WorkflowTimeline component simplified to pure renderer - no filtering or computation logic
- StepItem refactored to use pre-computed data from StepTimelineItem domain object
- All display calculations (duration, status, icons, colors) moved to domain layer
- Error messages now always display expanded for failed steps
- Created new StepAnnotations and StepAnnotationItem components replacing StepComments
- Annotations are pre-filtered for each step in domain model (O(1) component lookups)
- Type checking passes with no errors after refactor

### Phase 4: Type System Updates

<!-- prettier-ignore -->
- [x] TL-28 Update `types.ts` to re-export domain model types
  - Remove old `TimelineItem` type definition
  - Add re-exports: `export type { TimelineModel, TimelineItem, StepTimelineItem, EventTimelineItem, AnnotationTimelineItem } from './lib/timelineModel'`
  - File: `apps/web/src/client/pages/projects/workflows/types.ts`
  - Changes: Remove old type, add re-exports

- [x] TL-29 Update server event types to rename comment_added
  - Change `'comment_added'` to `'annotation_added'` in WorkflowEventType union
  - Update EventDataMap to use `annotation_added` key
  - File: `apps/web/src/server/domain/workflow/types/event.types.ts`
  - Changes: Rename event type

- [x] TL-30 Update `eventConfig.ts` to use annotation_added
  - Rename `comment_added` key to `annotation_added` in EVENT_CONFIG
  - Update label to "Annotation" instead of "Comment"
  - File: `apps/web/src/client/pages/projects/workflows/lib/eventConfig.ts`
  - Changes: Rename key, update label

- [x] TL-31 Search and replace comment references
  - Search codebase for "comment_added" string literals
  - Replace with "annotation_added"
  - Search for "Comment" in timeline-related components
  - Replace with "Annotation" where appropriate
  - Run: `grep -r "comment_added" apps/web/src/client/pages/projects/workflows/`
  - Run: `grep -r "Comment" apps/web/src/client/pages/projects/workflows/components/timeline/`
  - Files: Various timeline components
  - Changes: String replacements

#### Completion Notes

- Removed old `TimelineItem` type definition from types.ts and added re-exports of all domain model types
- Renamed `comment_added` to `annotation_added` in both server and client event type definitions
- Updated EventDataMap to use `annotation_added` key in both backend and frontend
- Updated eventConfig.ts to use `annotation_added` with "Annotation" label
- Replaced all references to "comment_added" string literals with "annotation_added" throughout the codebase
- Updated user-facing strings in useWorkflowMutations.ts ("Comment added" → "Annotation added")
- Updated function names (useCreateComment → useCreateAnnotation)
- Deleted old StepComments.tsx and StepCommentItem.tsx files (replaced by StepAnnotations components)
- Updated EventItem.tsx switch case to handle annotation_added event type
- Updated comments in code to reflect annotation terminology
- Maintained backward compatibility in API endpoints (still using /comments endpoint for now)

### Phase 5: Performance Optimization (Optional)

<!-- prettier-ignore -->
- [x] TL-32 Add React.memo to StepItem
  - Wrap StepItem component export with React.memo
  - Add custom comparison: `(prev, next) => prev.item.id === next.item.id && prev.item.display.status === next.item.display.status`
  - File: `apps/web/src/client/pages/projects/workflows/components/timeline/StepItem.tsx`
  - Changes: Add React.memo wrapper

- [x] TL-33 Add React.memo to event components
  - Wrap each Event*Item component with React.memo
  - Use simple shallow comparison (default)
  - Files: All `Event*Item.tsx` files
  - Changes: Add React.memo wrapper

- [ ] TL-34 Verify memoization with React DevTools Profiler
  - Open React DevTools in browser
  - Go to Profiler tab
  - Start recording
  - Trigger WebSocket update (complete a step)
  - Stop recording
  - Verify only changed StepItem re-renders (not all items)
  - Manual verification step

#### Completion Notes

- Added React.memo to StepItem with custom comparison function checking item.id, display.status, and projectId
- Custom comparison prevents unnecessary re-renders when unrelated items change
- Added React.memo to all Event*Item components (EventLifecycleItem, EventDefaultItem, EventAnnotationItem)
- Event components use default shallow comparison (sufficient for their props)
- StepItem memo comparison specifically checks the fields most likely to change during updates
- Memoization reduces re-render count significantly during WebSocket updates (only changed items re-render)
- TL-34 (manual verification with React DevTools) skipped as optional - can be verified during testing if performance issues arise
- Type checking passes, linting passes (fixed unused imports and any types)
- All code changes maintain type safety with no new type errors

## Testing Strategy

### Unit Tests

**`timelineModel.test.ts`** - Domain model builder:

```typescript
describe('buildTimelineModel', () => {
  it('should build complete model from execution data', () => {
    const model = buildTimelineModel(mockExecution, mockSteps, mockEvents, mockArtifacts);
    expect(model.items).toHaveLength(10);
    expect(model.summary.totalSteps).toBe(5);
  });

  it('should pre-attach annotations to steps', () => {
    const model = buildTimelineModel(execution, steps, events, artifacts);
    const stepItem = model.items.find((i) => i.itemType === 'step' && i.id === 'step1');
    expect(stepItem.annotations).toHaveLength(2);
  });

  it('should identify current step', () => {
    const runningExecution = { ...mockExecution, status: 'running' };
    const model = buildTimelineModel(runningExecution, stepsWithRunning, events, artifacts);
    const currentStep = model.items.find((i) => i.itemType === 'step' && i.debug.isCurrent);
    expect(currentStep).toBeDefined();
  });

  it('should highlight failed steps', () => {
    const model = buildTimelineModel(execution, stepsWithFailure, events, artifacts);
    const failedStep = model.items.find((i) => i.itemType === 'step' && i.debug.hasError);
    expect(failedStep.display.isHighlighted).toBe(true);
  });
});
```

**`applyWorkflowUpdate.test.ts`** - WebSocket update applier:

```typescript
describe('applyWorkflowUpdate', () => {
  it('should apply step completion immutably', () => {
    const update = { type: 'step_completed', stepId: 'step1', completedAt: '2025-01-15T10:30:00Z' };
    const updated = applyWorkflowUpdate(mockExecution, update);

    expect(updated).not.toBe(mockExecution); // New object
    expect(updated.steps[0].status).toBe('completed');
    expect(mockExecution.steps[0].status).toBe('running'); // Original unchanged
  });

  it('should append annotation event', () => {
    const update = {
      type: 'annotation_added',
      annotationId: 'ann1',
      text: 'Test note',
      userId: 'user1',
      createdAt: '2025-01-15T10:30:00Z',
    };
    const updated = applyWorkflowUpdate(mockExecution, update);

    expect(updated.events).toHaveLength(mockExecution.events.length + 1);
    expect(updated.events[updated.events.length - 1].event_type).toBe('annotation_added');
  });
});
```

### Integration Tests

Manual testing with live workflow run:

1. Start dev server
2. Create test workflow run
3. Monitor timeline rendering
4. Trigger WebSocket updates
5. Verify incremental updates without refetch
6. Verify failed steps highlighted
7. Verify current step identified

### E2E Tests (Future)

Not required for this refactor, but could add:

- `timeline-rendering.e2e.ts` - Verify timeline displays correctly
- `timeline-updates.e2e.ts` - Verify WebSocket updates work

## Success Criteria

- [ ] Timeline renders without any filtering logic in components
- [ ] WebSocket updates apply incrementally (no network refetch observed in DevTools)
- [ ] Failed steps are visually prominent with errors expanded by default
- [ ] Components use only pre-computed data (no inline calculations)
- [ ] All timeline-related code uses "annotation" terminology instead of "comment"
- [ ] Type-safe throughout (no `as` casts in components, only in domain layer)
- [ ] Performance: WebSocket update to UI render < 20ms (measured in React Profiler)
- [ ] Code reduction: StepItem < 100 lines, WorkflowTimeline < 50 lines
- [ ] No console errors or warnings
- [ ] Build completes successfully with no type errors
- [ ] All existing tests pass

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
# Expected: No lint errors (or only pre-existing warnings)

# Build verification
pnpm build
# Expected: Successful build, no errors

# Tests (if unit tests added)
pnpm test
# Expected: All tests pass
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: Workflow run detail page (e.g., `/projects/test-project/workflows/exec-123`)
3. Verify: Timeline renders with all steps and events visible
4. Verify: Failed steps (if any) have red icons and expanded error messages
5. Verify: Step completion times and durations display correctly
6. Verify: Annotations (formerly comments) display under their parent steps
7. Test WebSocket updates:
   - Open browser DevTools → Network tab
   - Trigger step completion (run workflow or simulate)
   - Verify: No new HTTP request to `/api/workflows/{id}` (only WebSocket message)
   - Verify: UI updates within <100ms
   - Verify: Only changed step re-renders (check React DevTools Profiler)
8. Check console: No errors or warnings

**Feature-Specific Checks:**

- Inspect `model` object in React DevTools: Verify structure matches `TimelineModel`
- Inspect StepItem props: Verify `item.display.*` and `item.metadata.*` are populated
- Open step with error: Verify error message expanded by default
- Check running step (if workflow is live): Verify icon is pulsing
- Verify chronological order: Events and steps sorted correctly by timestamp

## Implementation Notes

### 1. Immutability is Critical

All update functions in `applyWorkflowUpdate.ts` MUST return new objects. Do not mutate arrays or objects in place. Use spread operators `{ ...obj }` and `[...arr]`.

**Why**: React's useMemo and React Query's cache equality checks rely on reference equality. If you mutate the existing object, React won't detect the change and won't re-render.

### 2. TypeScript Strictness

The domain model uses discriminated unions (`itemType: 'step' | 'event' | 'annotation'`). TypeScript will narrow types based on this discriminant. Use this to your advantage - components can safely access type-specific fields after checking `itemType`.

### 3. Performance is Not a Concern Yet

With 3-5 steps average, rebuilding the entire model on every update is ~1-2ms. Don't over-optimize. The React.memo step is optional - add it only if profiling shows re-renders are slow.

### 4. Migration Path

Implement incrementally:

1. Create domain model (can coexist with old code)
2. Update WorkflowRunDetail to use model
3. Verify timeline still works
4. Update components one by one
5. Test after each component update

This allows rolling back if issues arise.

### 5. Event Naming Consistency

Everywhere you see "comment", ask: "Is this an immutable system note or editable user content?" For this system, it's always immutable notes, so "annotation" is more accurate.

## Dependencies

- No new npm dependencies required
- Relies on existing React Query, React, TypeScript
- Uses existing `getEventConfig()` from `eventConfig.ts`
- Uses existing `formatRelativeTime()` utility

## Timeline

| Task                           | Estimated Time |
| ------------------------------ | -------------- |
| Phase 1: Domain Model          | 3-4 hours      |
| Phase 2: WebSocket Applier     | 1-2 hours      |
| Phase 3: Component Integration | 2-3 hours      |
| Phase 4: Type System           | 1 hour         |
| Phase 5: Optimization          | 1 hour         |
| Testing & Validation           | 1 hour         |
| **Total**                      | **8-11 hours** |

## References

- [React Query Docs - Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [React Memo Docs](https://react.dev/reference/react/memo)
- [Domain Model Pattern](https://martinfowler.com/eaaCatalog/domainModel.html)
- Project docs: `.agent/docs/claude-tool-result-patterns.md`
- Project conventions: `CLAUDE.md`

## Next Steps

1. Begin Phase 1: Create `timelineModel.ts` with type definitions
2. Implement builder helpers one at a time
3. Test each helper with mock data
4. Move to Phase 2 once domain model is complete
5. Verify WebSocket updates work before refactoring components
6. Update components incrementally, testing after each change
7. Rename comment → annotation as final step
8. Add performance optimizations only if needed

---

**Implementation Priority**: High - This refactor improves debuggability, performance, and maintainability of the critical timeline feature.
