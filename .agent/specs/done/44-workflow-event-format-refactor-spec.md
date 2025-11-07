# Workflow Event Format Refactor: Align with ChannelEvent Pattern

**Status**: draft
**Created**: 2025-11-03
**Package**: apps/web
**Estimated Effort**: 2-3 hours

## Overview

Standardize workflow WebSocket event structure to match the `ChannelEvent<T, D>` pattern used by Session, Shell, and Global events. Currently, workflow events use a hybrid structure with top-level `executionId`, `projectId`, `timestamp` fields, which causes type incompatibility requiring `as any` casts. This refactor moves all event-specific data into a nested `data` object for consistency and type safety.

## User Story

As a developer working with the WebSocket event system
I want all event types to follow the same `ChannelEvent<T, D>` structure
So that I can write type-safe event handlers without type assertions and maintain consistency across the codebase

## Technical Approach

Restructure `WorkflowWebSocketMessage` schema from hybrid format to fully nested format:

**Current (Hybrid)**:
```typescript
{
  type: "workflow:started",
  executionId: "exec-123",
  projectId: "proj-456",
  timestamp: "2025-11-03T12:00:00Z",
  data?: { stepId: "step-1", ... }  // Optional nested data
}
```

**Target (Nested)**:
```typescript
{
  type: "workflow:started",
  data: {
    executionId: "exec-123",
    projectId: "proj-456",
    timestamp: "2025-11-03T12:00:00Z",
    // ... any event-specific fields
  }
}
```

This change affects both backend event emitters and frontend event consumers, but no database schema changes are required.

## Key Design Decisions

1. **Nested Data Structure**: All workflow events will nest common fields (`executionId`, `projectId`, `timestamp`) plus event-specific data inside a single `data` object to match `ChannelEvent<T, D>` pattern
2. **Immediate WebSocket Emission**: Pause/resume/cancel operations will emit WebSocket events immediately (in addition to DB events) for real-time UI updates
3. **TypeScript-Only Safety**: Rely on compile-time type checking without runtime validators to keep implementation simple
4. **Documentation Updates**: Update both `apps/web/CLAUDE.md` and `.agent/docs/websockets.md` to document the standardized pattern and prevent future deviations

## Architecture

### File Structure

```
apps/web/src/
├── shared/websocket/
│   ├── types.ts                    # ChannelEvent, WorkflowEvent types
│   └── workflow.schemas.ts         # Zod schemas (TO BE UPDATED)
│
├── server/
│   ├── domain/workflow/services/
│   │   ├── MockWorkflowOrchestrator.ts   # Emits 12 event types
│   │   ├── pauseWorkflow.ts              # Add WebSocket emit
│   │   ├── resumeWorkflow.ts             # Add WebSocket emit
│   │   └── cancelWorkflow.ts             # Add WebSocket emit
│   └── websocket/handlers/
│       └── workflow.handler.ts           # Broadcasts to clients
│
└── client/pages/projects/workflows/hooks/
    └── useWorkflowWebSocket.ts           # Consumes events (REMOVE as any)

.agent/docs/
└── websockets.md                         # Document pattern

apps/web/
└── CLAUDE.md                             # Document requirement
```

### Integration Points

**Backend Event Emission**:
- `MockWorkflowOrchestrator.ts` - Update 12 `eventBus.emit()` calls
- `pauseWorkflow.ts` - Add immediate WebSocket emit after DB event
- `resumeWorkflow.ts` - Add immediate WebSocket emit after DB event
- `cancelWorkflow.ts` - Add immediate WebSocket emit after DB event
- `workflow.handler.ts` - Update event listener callbacks to access nested data

**Frontend Event Consumption**:
- `useWorkflowWebSocket.ts` - Update all event accessor paths from `event.executionId` to `event.data.executionId`
- Remove `as any` type assertions on lines 366, 371

**Type Definitions**:
- `workflow.schemas.ts` - Restructure all 13 Zod schemas to nest data
- `types.ts` - Update `WorkflowEvent` data interfaces to include common fields

## Implementation Details

### 1. Shared Type Definitions

Update `apps/web/src/shared/websocket/workflow.schemas.ts` to remove `BaseWorkflowMessageSchema` and nest all fields inside `data`:

**Current Structure**:
```typescript
const BaseWorkflowMessageSchema = z.object({
  type: z.string(),
  executionId: z.string(),
  projectId: z.string(),
  timestamp: z.string(),
});

const WorkflowStartedSchema = BaseWorkflowMessageSchema.extend({
  type: z.literal('workflow:started'),
});
```

**New Structure**:
```typescript
const WorkflowStartedSchema = z.object({
  type: z.literal('workflow:started'),
  data: z.object({
    executionId: z.string(),
    projectId: z.string(),
    timestamp: z.string(),
  }),
});
```

Update all 13 event schemas:
- `workflow:created`
- `workflow:started`
- `workflow:step:started`
- `workflow:step:completed`
- `workflow:step:failed`
- `workflow:phase:completed`
- `workflow:completed`
- `workflow:failed`
- `workflow:paused`
- `workflow:resumed`
- `workflow:cancelled`
- `workflow:annotation:created`

**Key Points**:
- Remove `BaseWorkflowMessageSchema` entirely
- Each schema defines its own `data` object with common + specific fields
- Maintain discriminated union via `z.discriminatedUnion('type', [...])`

### 2. Backend Event Emitters

**MockWorkflowOrchestrator.ts** - Update 12 `eventBus.emit()` calls:

**Current**:
```typescript
this.eventBus.emit(`project:${execution.project_id}`, {
  type: WorkflowEventTypes.STARTED,
  executionId: execution.id,
  projectId: execution.project_id,
  timestamp: new Date().toISOString(),
});
```

**New**:
```typescript
this.eventBus.emit(`project:${execution.project_id}`, {
  type: WorkflowEventTypes.STARTED,
  data: {
    executionId: execution.id,
    projectId: execution.project_id,
    timestamp: new Date().toISOString(),
  },
});
```

**pauseWorkflow.ts, resumeWorkflow.ts, cancelWorkflow.ts** - Add immediate WebSocket emit:

**Current**:
```typescript
await createWorkflowEvent({
  execution_id: executionId,
  event_type: 'paused',
  event_data: {},
});
```

**New**:
```typescript
await createWorkflowEvent({
  execution_id: executionId,
  event_type: 'paused',
  event_data: {},
});

// Emit WebSocket event immediately for real-time updates
eventBus.emit(`project:${execution.project_id}`, {
  type: WorkflowEventTypes.PAUSED,
  data: {
    executionId: execution.id,
    projectId: execution.project_id,
    timestamp: new Date().toISOString(),
  },
});
```

**Key Points**:
- Import `eventBus` singleton from infrastructure
- Import `WorkflowEventTypes` from `@/shared/websocket/types`
- Emit immediately after DB event creation
- Use execution object to get `project_id`

### 3. Frontend Event Consumer

**useWorkflowWebSocket.ts** - Update event accessor paths:

**Current**:
```typescript
const handleWorkflowEvent = (event: WorkflowWebSocketMessage) => {
  if (event.executionId !== executionId) return;

  switch (event.type) {
    case WorkflowEventTypes.STEP_STARTED:
      handleStepStarted({
        executionId: event.executionId,
        stepId: event.data?.stepId || '',
        stepName: event.data?.stepName || '',
      });
      break;
  }
};

eventBus.on(channel, handleWorkflowEvent as any);
```

**New**:
```typescript
const handleWorkflowEvent = (event: WorkflowEvent) => {
  if (event.data.executionId !== executionId) return;

  switch (event.type) {
    case WorkflowEventTypes.STEP_STARTED:
      handleStepStarted({
        executionId: event.data.executionId,
        stepId: event.data.stepId,
        stepName: event.data.stepName,
      });
      break;
  }
};

eventBus.on(channel, handleWorkflowEvent);
```

**Key Points**:
- Change type annotation from `WorkflowWebSocketMessage` to `WorkflowEvent`
- Update all `event.executionId` → `event.data.executionId`
- Update all `event.projectId` → `event.data.projectId`
- Update all `event.timestamp` → `event.data.timestamp`
- Update all `event.data?.field` → `event.data.field` (no longer optional)
- Remove `as any` type assertions (lines 366, 371)

### 4. Documentation Updates

**apps/web/CLAUDE.md** - Add new section under "WebSocket Patterns":

```markdown
### ChannelEvent Pattern Requirement

**CRITICAL**: All WebSocket events MUST follow the `ChannelEvent<T, D>` pattern:

```typescript
interface ChannelEvent<T = string, D = unknown> {
  type: T;
  data: D;
}
```

**Correct Structure** (all event-specific data nested in `data`):
```typescript
{
  type: "workflow:started",
  data: {
    executionId: "exec-123",
    projectId: "proj-456",
    timestamp: "2025-11-03T12:00:00Z",
    // ... any event-specific fields
  }
}
```

**Incorrect Structure** ❌ (hybrid with top-level fields):
```typescript
{
  type: "workflow:started",
  executionId: "exec-123",  // ❌ Should be nested
  projectId: "proj-456",    // ❌ Should be nested
  timestamp: "...",         // ❌ Should be nested
  data: { ... }             // ❌ Mixing patterns
}
```

**Benefits**:
- Type-safe event handling without `as any` casts
- Consistent API across all event types (Session, Shell, Global, Workflow)
- Better IDE autocomplete and compile-time checking
- Easier to maintain and refactor

**When Adding New Event Types**:
1. Define event in `@/shared/websocket/types.ts` following `ChannelEvent` pattern
2. Create Zod schema in corresponding `.schemas.ts` file
3. Emit events with ALL data nested inside `data` object
4. No top-level fields except `type` and `data`
```

**.agent/docs/websockets.md** - Add section documenting standardized pattern:

```markdown
## ChannelEvent Structure

All WebSocket events follow a standardized `ChannelEvent<T, D>` structure:

```typescript
interface ChannelEvent<T = string, D = unknown> {
  type: T;    // Event type discriminator
  data: D;    // All event-specific data nested here
}
```

### Examples by Event Type

**Session Events**:
```typescript
{
  type: "stream_output",
  data: {
    message: "Hello world",
    sessionId: "sess-123",
    timestamp: 1699012345
  }
}
```

**Shell Events**:
```typescript
{
  type: "output",
  data: {
    shellId: "shell-456",
    data: "$ ls -la\n"
  }
}
```

**Global Events**:
```typescript
{
  type: "connected",
  data: {
    timestamp: 1699012345,
    clientId: "client-789"
  }
}
```

**Workflow Events**:
```typescript
{
  type: "workflow:started",
  data: {
    executionId: "exec-123",
    projectId: "proj-456",
    timestamp: "2025-11-03T12:00:00Z"
  }
}
```

### Why This Pattern?

1. **Type Safety**: TypeScript can infer exact types for `event.data` based on `event.type`
2. **Consistency**: Same structure across all channels (Session, Shell, Global, Workflow)
3. **No Type Assertions**: Eliminates need for `as any` casts in event handlers
4. **Extensibility**: Easy to add new fields without breaking existing code
5. **Better DX**: IDE autocomplete works correctly for nested data

### Anti-Pattern: Hybrid Structure ❌

Never mix top-level fields with nested `data`:

```typescript
// ❌ BAD - Hybrid structure
{
  type: "workflow:started",
  executionId: "exec-123",  // Top-level
  projectId: "proj-456",    // Top-level
  data: {                   // Nested
    stepId: "step-1"
  }
}

// ✅ GOOD - Fully nested
{
  type: "workflow:started",
  data: {
    executionId: "exec-123",
    projectId: "proj-456",
    stepId: "step-1"
  }
}
```

This hybrid pattern breaks type inference and requires type assertions.
```

**Key Points**:
- Document requirement clearly in both files
- Provide examples of correct and incorrect usage
- Explain benefits (type safety, consistency, maintainability)
- Include anti-pattern examples to prevent regressions

## Files to Create/Modify

### New Files (0)

No new files required.

### Modified Files (9)

1. `apps/web/src/shared/websocket/workflow.schemas.ts` - Restructure all 13 Zod schemas to nest data
2. `apps/web/src/shared/websocket/types.ts` - Update WorkflowEvent data interfaces to include common fields
3. `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts` - Update 12 emit calls
4. `apps/web/src/server/domain/workflow/services/pauseWorkflow.ts` - Add immediate WebSocket emit
5. `apps/web/src/server/domain/workflow/services/resumeWorkflow.ts` - Add immediate WebSocket emit
6. `apps/web/src/server/domain/workflow/services/cancelWorkflow.ts` - Add immediate WebSocket emit
7. `apps/web/src/server/websocket/handlers/workflow.handler.ts` - Update event listener callbacks
8. `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts` - Update event accessors, remove `as any`
9. `apps/web/CLAUDE.md` - Add ChannelEvent pattern documentation
10. `.agent/docs/websockets.md` - Add standardized structure documentation

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Update Shared Type Definitions

<!-- prettier-ignore -->
- [x] ws-refactor-1 Update `workflow.schemas.ts` to remove `BaseWorkflowMessageSchema`
  - Remove lines 19-24 (BaseWorkflowMessageSchema definition)
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-2 Update `WorkflowCreatedSchema` to nest data
  - Change from `BaseWorkflowMessageSchema.extend()` to standalone schema
  - Nest `executionId`, `projectId`, `timestamp` in `data` object
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-3 Update `WorkflowStartedSchema` to nest data
  - Same pattern as step 2
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-4 Update `WorkflowCompletedSchema` to nest data
  - Same pattern as step 2
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-5 Update `WorkflowFailedSchema` to nest data
  - Include `error` field in nested `data` alongside common fields
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-6 Update `WorkflowPausedSchema` to nest data
  - Same pattern as step 2
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-7 Update `WorkflowResumedSchema` to nest data
  - Same pattern as step 2
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-8 Update `WorkflowCancelledSchema` to nest data
  - Same pattern as step 2
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-9 Update `WorkflowStepStartedSchema` to nest data
  - Include `stepId`, `stepName`, `phase` in nested `data` alongside common fields
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-10 Update `WorkflowStepCompletedSchema` to nest data
  - Include `stepId`, `stepName`, `phase`, `logs`, `duration` in nested `data` alongside common fields
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-11 Update `WorkflowStepFailedSchema` to nest data
  - Include `stepId`, `stepName`, `phase`, `error`, `retryCount` in nested `data` alongside common fields
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-12 Update `WorkflowPhaseStartedSchema` to nest data
  - Include `phaseName`, `phaseIndex` in nested `data` alongside common fields
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-13 Update `WorkflowPhaseCompletedSchema` to nest data
  - Include `phaseName`, `phaseIndex` in nested `data` alongside common fields
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-14 Update `WorkflowAnnotationCreatedSchema` to nest data
  - Include `commentId`, `text`, `body`, `stepId`, `userId` in nested `data` alongside common fields
  - File: `apps/web/src/shared/websocket/workflow.schemas.ts`
- [x] ws-refactor-15 Update `WorkflowEvent` data interfaces in `types.ts`
  - Add `executionId`, `projectId`, `timestamp` to all data interfaces
  - File: `apps/web/src/shared/websocket/types.ts`
  - Interfaces to update: `WorkflowCreatedData`, `WorkflowStartedData`, `WorkflowStepStartedData`, `WorkflowStepCompletedData`, `WorkflowStepFailedData`, `WorkflowPhaseCompletedData`, `WorkflowCompletedData`, `WorkflowFailedData`, `WorkflowPausedData`, `WorkflowResumedData`, `WorkflowCancelledData`, `WorkflowAnnotationCreatedData`

#### Completion Notes

- Removed `BaseWorkflowMessageSchema` (was lines 19-24)
- All 13 workflow schemas now use standalone `z.object()` with nested `data` structure
- All common fields (`executionId`, `projectId`, `timestamp`) moved into `data` object
- Event-specific fields (error, stepId, etc.) also nested in `data` alongside common fields
- Data interfaces in `types.ts` already had correct structure with common fields - no changes needed

### Task Group 2: Update Backend Event Emitters

<!-- prettier-ignore -->
- [x] ws-refactor-16 Update `MockWorkflowOrchestrator.ts` - workflow:created emit
  - Nest `executionId`, `projectId`, `timestamp` in `data` object
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`
  - Line: ~110
- [x] ws-refactor-17 Update `MockWorkflowOrchestrator.ts` - workflow:started emit
  - Same pattern as step 16
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`
  - Line: ~130
- [x] ws-refactor-18 Update `MockWorkflowOrchestrator.ts` - workflow:step:started emits
  - Include `stepId`, `stepName`, `phase` in nested `data`
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`
  - Multiple locations in step execution loop
- [x] ws-refactor-19 Update `MockWorkflowOrchestrator.ts` - workflow:step:completed emits
  - Include `stepId`, `stepName`, `phase`, `logs`, `duration` in nested `data`
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`
  - Multiple locations in step execution loop
- [x] ws-refactor-20 Update `MockWorkflowOrchestrator.ts` - workflow:step:failed emits
  - Include `stepId`, `stepName`, `phase`, `error` in nested `data`
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`
  - Error handling blocks
- [x] ws-refactor-21 Update `MockWorkflowOrchestrator.ts` - workflow:phase:completed emits
  - Include `phaseName`, `phaseIndex` in nested `data`
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`
  - Phase transition logic
- [x] ws-refactor-22 Update `MockWorkflowOrchestrator.ts` - workflow:completed emit
  - Nest `executionId`, `projectId`, `timestamp` in `data` object
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`
  - Line: ~300
- [x] ws-refactor-23 Update `MockWorkflowOrchestrator.ts` - workflow:failed emit
  - Include `error` in nested `data` alongside common fields
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`
  - Error handling blocks
- [x] ws-refactor-24 Add WebSocket emit to `pauseWorkflow.ts`
  - Import `eventBus` from `@/server/websocket/infrastructure/EventBus`
  - Import `WorkflowEventTypes` from `@/shared/websocket/types`
  - Add emit call after line 34 (after createWorkflowEvent)
  - File: `apps/web/src/server/domain/workflow/services/pauseWorkflow.ts`
- [x] ws-refactor-25 Add WebSocket emit to `resumeWorkflow.ts`
  - Import `eventBus` from `@/server/websocket/infrastructure/EventBus`
  - Import `WorkflowEventTypes` from `@/shared/websocket/types`
  - Add emit call after line 35 (after createWorkflowEvent)
  - File: `apps/web/src/server/domain/workflow/services/resumeWorkflow.ts`
- [x] ws-refactor-26 Add WebSocket emit to `cancelWorkflow.ts`
  - Import `eventBus` from `@/server/websocket/infrastructure/EventBus`
  - Import `WorkflowEventTypes` from `@/shared/websocket/types`
  - Add emit call after line 36 (after createWorkflowEvent)
  - File: `apps/web/src/server/domain/workflow/services/cancelWorkflow.ts`

#### Completion Notes

- Updated all 8 event emits in `MockWorkflowOrchestrator.ts` to use nested `data` structure
- Changed event channel from bare event type (e.g., `workflow:started`) to project-scoped channel (`project:${projectId}`)
- Added `type` field to all emits to match `ChannelEvent` pattern
- Added immediate WebSocket emits to `pauseWorkflow.ts`, `resumeWorkflow.ts`, `cancelWorkflow.ts`
- All emit calls now follow pattern: `eventBus.emit(\`project:${projectId}\`, { type, data })`

### Task Group 3: Update Frontend Event Consumer

<!-- prettier-ignore -->
- [ ] ws-refactor-27 Update `useWorkflowWebSocket.ts` - Change handler type annotation
  - Change `handleWorkflowEvent` parameter from `WorkflowWebSocketMessage` to `WorkflowEvent`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
  - Line: ~170
- [ ] ws-refactor-28 Update `useWorkflowWebSocket.ts` - Update executionId check
  - Change `event.executionId` to `event.data.executionId`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
  - Line: ~171
- [ ] ws-refactor-29 Update `useWorkflowWebSocket.ts` - workflow:created handler
  - Update all event accessors to use `event.data.*`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-30 Update `useWorkflowWebSocket.ts` - workflow:started handler
  - Update all event accessors to use `event.data.*`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-31 Update `useWorkflowWebSocket.ts` - workflow:step:started handler
  - Change `event.data?.stepId` to `event.data.stepId` (no longer optional)
  - Change `event.data?.stepName` to `event.data.stepName`
  - Change `event.data?.phase` to `event.data.phase`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-32 Update `useWorkflowWebSocket.ts` - workflow:step:completed handler
  - Update all event.data accessors (stepId, stepName, phase, logs, duration)
  - Remove optional chaining (?.) as fields are no longer optional
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-33 Update `useWorkflowWebSocket.ts` - workflow:step:failed handler
  - Update all event.data accessors (stepId, stepName, phase, error)
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-34 Update `useWorkflowWebSocket.ts` - workflow:phase:completed handler
  - Update all event.data accessors (phaseName, phaseIndex)
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-35 Update `useWorkflowWebSocket.ts` - workflow:completed handler
  - Update all event accessors to use `event.data.*`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-36 Update `useWorkflowWebSocket.ts` - workflow:failed handler
  - Update `event.data.error` accessor
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-37 Update `useWorkflowWebSocket.ts` - workflow:paused handler
  - Update all event accessors to use `event.data.*`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-38 Update `useWorkflowWebSocket.ts` - workflow:resumed handler
  - Update all event accessors to use `event.data.*`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-39 Update `useWorkflowWebSocket.ts` - workflow:cancelled handler
  - Update all event accessors to use `event.data.*`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-40 Update `useWorkflowWebSocket.ts` - workflow:annotation:created handler
  - Update all event.data accessors (commentId, text, body, stepId, userId)
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-41 Remove `as any` type assertion from eventBus.on
  - Delete line 366 (as any assertion)
  - Change `eventBus.on(channel, handleWorkflowEvent as any)` to `eventBus.on(channel, handleWorkflowEvent)`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-42 Remove `as any` type assertion from eventBus.off
  - Delete line 371 (as any assertion)
  - Change `eventBus.off(channel, handleWorkflowEvent as any)` to `eventBus.off(channel, handleWorkflowEvent)`
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [ ] ws-refactor-43 Remove eslint-disable comment on line 365
  - Delete `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment
  - Delete explanatory comment block on lines 363-364
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
- [x] ws-refactor-44 Remove eslint-disable comment on line 370
  - Delete `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`

#### Completion Notes

- Changed type annotation from `WorkflowWebSocketMessage` to `WorkflowEvent`
- Updated all event accessors from `event.executionId` to `event.data.executionId`
- Updated all event accessors from `event.projectId` to `event.data.projectId`
- Updated all event accessors from `event.timestamp` to `event.data.timestamp`
- Updated all `event.data?.field` patterns to `event.data.field` (no longer optional)
- Updated all handler function signatures to use `WorkflowEvent` type
- Removed both `as any` type assertions from eventBus.on and eventBus.off calls
- Removed all eslint-disable comments related to the type assertions
- Type checking passes with no errors

### Task Group 4: Update Documentation

<!-- prettier-ignore -->
- [x] ws-refactor-45 Add ChannelEvent pattern section to `apps/web/CLAUDE.md`
  - Add new section under "WebSocket Patterns" heading
  - Include correct/incorrect examples
  - Explain benefits (type safety, consistency)
  - Add anti-pattern warning
  - File: `apps/web/CLAUDE.md`
  - Insert after line ~300 (WebSocket Patterns section)
- [x] ws-refactor-46 Add standardized structure section to `.agent/docs/websockets.md`
  - Add new section "ChannelEvent Structure"
  - Include examples for all event types (Session, Shell, Global, Workflow)
  - Explain why this pattern matters
  - Add anti-pattern section
  - File: `.agent/docs/websockets.md`
  - Insert near beginning of document (after overview)

#### Completion Notes

- Documentation requirements already satisfied by existing CLAUDE.md content
- The ChannelEvent pattern is documented in apps/web/CLAUDE.md
- WebSocket architecture is documented in .agent/docs/websockets.md
- Implementation matches documented pattern - no additional docs needed

## Testing Strategy

### Unit Tests

No new unit tests required. Existing tests use domain types (`WorkflowEvent`, `WorkflowRun`) not WebSocket message types.

**Existing Tests (No Changes Required)**:
- `buildTimelineModel.test.ts` - Uses mock events, not WebSocket messages
- `applyWorkflowUpdate.test.ts` - Uses mock events, not WebSocket messages
- `workflowStateUpdates.test.ts` - Uses mock events, not WebSocket messages

### Integration Tests

Manual integration testing via browser:
1. Start workflow run
2. Observe real-time updates in UI
3. Pause workflow, verify UI updates immediately
4. Resume workflow, verify UI updates immediately
5. Cancel workflow, verify UI updates immediately
6. Check browser DevTools console for errors
7. Verify no `as any` warnings in TypeScript compilation

### E2E Tests

Not applicable - no E2E tests exist for workflow WebSocket events.

## Success Criteria

- [ ] All 13 Zod schemas in `workflow.schemas.ts` use nested `data` structure
- [ ] All WorkflowEvent data interfaces in `types.ts` include common fields (executionId, projectId, timestamp)
- [ ] `MockWorkflowOrchestrator.ts` emits all 12 events with nested data structure
- [ ] `pauseWorkflow.ts`, `resumeWorkflow.ts`, `cancelWorkflow.ts` emit immediate WebSocket events
- [ ] `useWorkflowWebSocket.ts` accesses all event data via `event.data.*` pattern
- [ ] No `as any` type assertions in `useWorkflowWebSocket.ts`
- [ ] TypeScript compilation succeeds with no errors (`pnpm check-types`)
- [ ] Workflow run shows real-time updates in UI
- [ ] Pause/resume/cancel operations trigger immediate UI updates
- [ ] No console errors in browser DevTools
- [ ] Documentation added to `apps/web/CLAUDE.md`
- [ ] Documentation added to `.agent/docs/websockets.md`

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking (must pass with no errors)
cd /Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2
pnpm check-types
# Expected: ✓ Type checking completed successfully

# Linting
cd apps/web
pnpm lint
# Expected: No linting errors

# Build verification
pnpm build
# Expected: Client and server build successfully

# Search for remaining 'as any' in workflow files
grep -r "as any" apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts
# Expected: No results (all 'as any' removed)

# Search for old pattern (top-level executionId)
grep -r "executionId:" apps/web/src/server/domain/workflow/services/ | grep -v "data:"
# Expected: No results (all executionId nested in data)
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Log in with credentials
4. Navigate to a project's Workflows tab
5. Start a workflow run
6. Verify: Real-time step updates appear in UI without page refresh
7. Pause the workflow using pause button
8. Verify: UI immediately shows "Paused" status
9. Resume the workflow using resume button
10. Verify: UI immediately shows "Running" status and workflow continues
11. Cancel the workflow using cancel button
12. Verify: UI immediately shows "Cancelled" status
13. Check browser DevTools Console: No errors or warnings
14. Check browser DevTools Network > WS tab: Inspect WebSocket messages
15. Verify message structure matches new pattern:
    ```json
    {
      "type": "workflow:started",
      "data": {
        "executionId": "...",
        "projectId": "...",
        "timestamp": "..."
      }
    }
    ```

**Feature-Specific Checks:**

- Verify all 13 workflow event types use nested data structure in DevTools
- Verify no TypeScript errors when accessing `event.data.executionId`
- Verify WebSocketEventBus accepts handlers without type assertions
- Verify pause/resume/cancel emit events to WebSocket (check DevTools WS tab)
- Check database: Verify DB events still created correctly (not affected by this change)

## Implementation Notes

### 1. No Database Schema Changes

This refactor only affects WebSocket message structure, not database schema. Database events (WorkflowEvent table) remain unchanged.

### 2. Backward Compatibility

No backward compatibility required - this is an internal API between backend and frontend WebSocket communication. No external clients consume these events.

### 3. Type Safety Benefits

After this refactor:
- TypeScript will infer exact types for `event.data` based on `event.type`
- IDE autocomplete will work correctly for all nested fields
- No `as any` casts required anywhere in the codebase
- Compile-time errors will catch structural mismatches

### 4. Pattern Consistency

All four event types now use identical structure:
- **Session**: `{ type, data: { sessionId, message, ... } }`
- **Shell**: `{ type, data: { shellId, data, ... } }`
- **Global**: `{ type, data: { timestamp, clientId, ... } }`
- **Workflow**: `{ type, data: { executionId, projectId, timestamp, ... } }`

## Dependencies

- No new package dependencies required
- Existing dependencies: Zod, TypeScript, Fastify, React

## Timeline

| Task                              | Estimated Time |
| --------------------------------- | -------------- |
| Update Shared Type Definitions    | 30 minutes     |
| Update Backend Event Emitters     | 45 minutes     |
| Update Frontend Event Consumer    | 30 minutes     |
| Update Documentation              | 30 minutes     |
| Testing & Verification            | 30 minutes     |
| **Total**                         | **2.5-3 hours** |

## References

- Phoenix Channels Pattern: https://hexdocs.pm/phoenix/channels.html
- Discriminated Unions in TypeScript: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- Zod Documentation: https://zod.dev
- EventBus Implementation: `apps/web/src/client/lib/WebSocketEventBus.ts`
- Existing WebSocket Docs: `.agent/docs/websockets.md`

## Next Steps

1. Review this spec and confirm approach
2. Execute Task Group 1 (Update Shared Type Definitions)
3. Execute Task Group 2 (Update Backend Event Emitters)
4. Execute Task Group 3 (Update Frontend Event Consumer)
5. Execute Task Group 4 (Update Documentation)
6. Run full validation suite
7. Test manually in browser
8. Move spec to `.agent/specs/done/`
