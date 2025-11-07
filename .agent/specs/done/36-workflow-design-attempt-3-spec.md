# Workflow Orchestration System

**Status**: draft
**Created**: 2025-01-25
**Package**: @repo/workflow-engine (new), apps/web
**Estimated Effort**: 120-160 hours

## Overview

A hybrid code/YAML workflow orchestration system for managing AI agent tasks with kanban visualization. Workflows are defined as reusable templates (code or YAML) and executed as tasks that move through user-defined phases. The system stores state in the database for fast queries, files on disk for logs/artifacts, and provides real-time updates via WebSocket.

## User Story

As a developer orchestrating AI agent workflows
I want to define workflows as code or YAML templates and track their execution on a kanban board
So that I can manage complex multi-step AI tasks, resume from failures, and monitor progress in real-time

## Technical Approach

**Architecture**: Separate workflow definitions (templates) from workflow runs (tasks). Templates define phases and steps; executions track state as they progress through phases.

**Storage Strategy**:
- Database: Execution state, step status, comments, artifact metadata
- Filesystem: Logs, artifact files, checkpoints, immutable snapshots

**Key Patterns**:
- Async/await execution model (inspired by Temporal/Inngest)
- YAML definitions for simple pipelines (inspired by GitHub Actions/Argo)
- Step-based checkpointing for resume capability
- Artifact-comment relationships for rich context

## Key Design Decisions

1. **Hybrid Code/YAML Support**: Developers use TypeScript for complex conditional workflows, YAML for simple linear pipelines. Both compile to same execution model.

2. **Template vs Execution Separation**: WorkflowDefinition (reusable template) vs WorkflowRun (specific run with args). Same template can be run many times with different inputs.

3. **DB-First State Management**: Current phase, status, step progress stored in database for fast kanban queries. Filesystem only for large files and checkpoints.

4. **Simple Step Model**: No sub-steps. Complex orchestration achieved by sequential/conditional steps. Each step can be: agent call, script, or function.

5. **Artifacts Belong to Steps, Optionally Attach to Comments**: Clear ownership hierarchy. Comments can reference artifacts (screenshots, diagrams).

## Architecture

### File Structure

```
packages/
  workflow-engine/              # NEW PACKAGE
    src/
      parser/
        CodeParser.ts           # Parse TypeScript workflows
        YamlParser.ts           # Parse YAML workflows
        WorkflowDefinition.ts   # Unified workflow model
      execution/
        WorkflowContext.ts      # Execution context for workflows
        WorkflowExecutor.ts     # Main execution engine
        CheckpointManager.ts    # Checkpoint save/restore
      storage/
        FileSystemStorage.ts    # Artifact/log filesystem ops
      types/
        workflow.ts             # Type definitions
        step.ts
        context.ts
      index.ts

apps/
  web/
    prisma/
      schema.prisma             # UPDATED: Add workflow tables
      migrations/               # NEW: Migration files

    src/
      server/
        domain/
          workflow/             # NEW DOMAIN
            services/
              createWorkflowRun.ts
              executeWorkflow.ts
              pauseWorkflow.ts
              resumeWorkflow.ts
              getWorkflowRuns.ts
            schemas/
              index.ts
            types/
              index.ts

          workflow-artifact/    # NEW DOMAIN
            services/
              uploadArtifact.ts
              downloadArtifact.ts
              attachToComment.ts

          workflow-comment/     # NEW DOMAIN
            services/
              createComment.ts
              getComments.ts

        routes/
          workflows.ts          # NEW: Workflow CRUD routes
          workflow-steps.ts     # NEW: Step logs/details
          workflow-artifacts.ts # NEW: Upload/download
          workflow-comments.ts  # NEW: Comment CRUD

        websocket/
          handlers/
            workflow.ts         # NEW: Workflow WebSocket events

      client/
        pages/
          projects/
            workflows/          # NEW: Workflow UI
              components/
                WorkflowTemplatesPage.tsx
                KanbanBoard.tsx
                WorkflowCard.tsx
                StepDetailModal.tsx
                CommentsList.tsx
                ArtifactsList.tsx
              hooks/
                useWorkflowRuns.ts
                useWorkflowWebSocket.ts
              stores/
                workflowStore.ts
              WorkflowsPage.tsx

.agent/workflows/               # NEW: Workflow data directory
  definitions/                  # Templates
    implement-feature.ts
    fix-bug.yaml
  executions/                   # Runs
    {executionId}/
      definition.json
      args.json
      checkpoints/
      artifacts/
      logs/
```

### Integration Points

**Database (Prisma)**:
- `prisma/schema.prisma` - Add 7 new models: WorkflowDefinition, WorkflowRun, WorkflowRunStep, WorkflowComment, WorkflowArtifact, plus updates to Project, User, AgentSession

**Backend API**:
- `server/routes/workflows.ts` - Workflow CRUD, start/pause/resume/cancel
- `server/routes/workflow-steps.ts` - Step details, log streaming
- `server/routes/workflow-artifacts.ts` - File upload/download
- `server/websocket/handlers/workflow.ts` - Real-time events

**Frontend**:
- `client/pages/projects/workflows/` - New workflows tab in projects
- `client/pages/projects/workflows/components/KanbanBoard.tsx` - Main UI

**Existing Integrations**:
- `@repo/agent-cli-sdk` - Used by workflow engine to execute agent steps
- `AgentSession` model - Linked to WorkflowRunStep for full logs

## Implementation Details

### 1. Database Schema (Prisma)

Complete schema with 7 new models and updates to 3 existing models.

**New Models**:
- **WorkflowDefinition**: Template/blueprint (name, type, path, phases, is_template)
- **WorkflowRun**: Task instance (name, args, current_phase, status, current_step_index)
- **WorkflowRunStep**: Step instance (step_id, name, phase, status, log_directory_path, agent_session_id)
- **WorkflowComment**: Comments on workflows/steps (text, comment_type, created_by, workflow_run_step_id nullable)
- **WorkflowArtifact**: File metadata (name, file_path, file_type, mime_type, size_bytes, workflow_comment_id nullable)

**Key Points**:
- All columns use snake_case
- Artifacts always belong to step, optionally attach to comment
- Comments can be workflow-level (step_id null) or step-level
- State stored in DB (current_phase, status, current_step_index)
- Cascading deletes configured properly

### 2. Workflow Engine Package (@repo/workflow-engine)

Core execution engine with parsers, context, and checkpoint system.

**Key Points**:
- Parses TypeScript and YAML workflows to unified model
- WorkflowContext provides async/await API for steps
- Supports agent steps, function steps, script steps
- Checkpoint manager saves/restores execution state
- Integrates with @repo/agent-cli-sdk for agent execution

### 3. Filesystem Storage

Organized directory structure for execution artifacts.

**Key Points**:
- `.agent/workflows/definitions/` - Template files (code/YAML)
- `.agent/workflows/executions/{id}/` - Per-execution directory
- `checkpoints/` - State snapshots for resume
- `artifacts/{stepId}/` - Step artifacts (images, videos, etc)
- `logs/{stepId}/` - Step logs (input.json, output.json, events.jsonl, summary.md)

### 4. Backend API Routes

RESTful endpoints for workflow management.

**Key Points**:
- POST /api/workflow-executions - Create execution (start workflow)
- GET /api/workflow-executions - List executions (kanban data)
- GET /api/workflow-executions/:id - Get details
- POST /api/workflow-executions/:id/pause|resume|cancel - Control execution
- POST /api/workflow-executions/:id/comments - Add comment
- POST /api/workflow-executions/:id/artifacts - Upload artifact
- GET /api/workflow-steps/:id/logs/:type - Stream logs

### 5. WebSocket Real-Time Events

Live updates for kanban board.

**Key Points**:
- workflow.step.started - Step begins
- workflow.step.progress - Streaming output
- workflow.step.completed - Step finishes
- workflow.comment.created - New comment
- workflow.artifact.created - New artifact
- workflow.execution.status_changed - Status update

### 6. Kanban Board UI

React components for workflow visualization.

**Key Points**:
- Columns = phases (user-defined in template)
- Cards = WorkflowRun instances
- Drag-and-drop to move between phases
- Real-time updates via WebSocket
- Click card to see step details, logs, artifacts, comments

## Files to Create/Modify

### New Files (47)

**Package: @repo/workflow-engine**
1. `packages/workflow-engine/package.json` - Package config
2. `packages/workflow-engine/tsconfig.json` - TypeScript config
3. `packages/workflow-engine/src/index.ts` - Package exports
4. `packages/workflow-engine/src/parser/CodeParser.ts` - Parse TypeScript workflows
5. `packages/workflow-engine/src/parser/YamlParser.ts` - Parse YAML workflows
6. `packages/workflow-engine/src/parser/WorkflowDefinition.ts` - Unified model
7. `packages/workflow-engine/src/execution/WorkflowContext.ts` - Execution context
8. `packages/workflow-engine/src/execution/WorkflowExecutor.ts` - Execution engine
9. `packages/workflow-engine/src/execution/CheckpointManager.ts` - Checkpoint system
10. `packages/workflow-engine/src/storage/FileSystemStorage.ts` - File operations
11. `packages/workflow-engine/src/types/workflow.ts` - Workflow types
12. `packages/workflow-engine/src/types/step.ts` - Step types
13. `packages/workflow-engine/src/types/context.ts` - Context types

**Database**
14. `apps/web/prisma/migrations/xxx_add_workflows.sql` - Migration

**Backend - Domain Services**
15. `apps/web/src/server/domain/workflow/services/createWorkflowRun.ts`
16. `apps/web/src/server/domain/workflow/services/executeWorkflow.ts`
17. `apps/web/src/server/domain/workflow/services/pauseWorkflow.ts`
18. `apps/web/src/server/domain/workflow/services/resumeWorkflow.ts`
19. `apps/web/src/server/domain/workflow/services/cancelWorkflow.ts`
20. `apps/web/src/server/domain/workflow/services/getWorkflowRuns.ts`
21. `apps/web/src/server/domain/workflow/services/getWorkflowRunById.ts`
22. `apps/web/src/server/domain/workflow/services/index.ts`
23. `apps/web/src/server/domain/workflow/schemas/index.ts`
24. `apps/web/src/server/domain/workflow/types/index.ts`
25. `apps/web/src/server/domain/workflow-artifact/services/uploadArtifact.ts`
26. `apps/web/src/server/domain/workflow-artifact/services/downloadArtifact.ts`
27. `apps/web/src/server/domain/workflow-artifact/services/attachToComment.ts`
28. `apps/web/src/server/domain/workflow-artifact/services/index.ts`
29. `apps/web/src/server/domain/workflow-comment/services/createComment.ts`
30. `apps/web/src/server/domain/workflow-comment/services/getComments.ts`
31. `apps/web/src/server/domain/workflow-comment/services/index.ts`

**Backend - Routes**
32. `apps/web/src/server/routes/workflows.ts` - Workflow routes
33. `apps/web/src/server/routes/workflow-steps.ts` - Step routes
34. `apps/web/src/server/routes/workflow-artifacts.ts` - Artifact routes
35. `apps/web/src/server/routes/workflow-comments.ts` - Comment routes

**Backend - WebSocket**
36. `apps/web/src/server/websocket/handlers/workflow.ts` - WebSocket handler

**Frontend - Pages & Components**
37. `apps/web/src/client/pages/projects/workflows/WorkflowsPage.tsx`
38. `apps/web/src/client/pages/projects/workflows/components/WorkflowTemplatesPage.tsx`
39. `apps/web/src/client/pages/projects/workflows/components/KanbanBoard.tsx`
40. `apps/web/src/client/pages/projects/workflows/components/WorkflowCard.tsx`
41. `apps/web/src/client/pages/projects/workflows/components/StepDetailModal.tsx`
42. `apps/web/src/client/pages/projects/workflows/components/CommentsList.tsx`
43. `apps/web/src/client/pages/projects/workflows/components/ArtifactsList.tsx`

**Frontend - Hooks & Store**
44. `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowRuns.ts`
45. `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
46. `apps/web/src/client/pages/projects/workflows/stores/workflowStore.ts`

**Example Workflows**
47. `.agent/workflows/definitions/implement-feature.ts` - Example code workflow

### Modified Files (6)

1. `apps/web/prisma/schema.prisma` - Add workflow models, update Project/User/AgentSession
2. `apps/web/src/server/routes/index.ts` - Register workflow routes
3. `apps/web/src/client/pages/projects/ProjectsPage.tsx` - Add workflows tab
4. `packages/workflow-engine/README.md` - Package documentation
5. `turbo.json` - Add workflow-engine to build pipeline
6. `pnpm-workspace.yaml` - Ensure workspace includes workflow-engine

## Step by Step Tasks

### Task Group 1: Database Schema & Migrations

<!-- prettier-ignore -->
- [ ] WF-001 Create Prisma schema models
  - Add WorkflowDefinition, WorkflowRun, WorkflowRunStep, WorkflowComment, WorkflowArtifact models
  - Update Project, User, AgentSession with new relations
  - File: `apps/web/prisma/schema.prisma`
  - Use snake_case for all columns
  - Add all indexes as specified in design
- [ ] WF-002 Generate Prisma migration
  - Run: `cd apps/web && pnpm prisma migrate dev --name add_workflows`
  - Verify migration file created
  - File: `apps/web/prisma/migrations/xxx_add_workflows/migration.sql`
- [ ] WF-003 Generate Prisma client
  - Run: `cd apps/web && pnpm prisma generate`
  - Verify types generated
  - Test import: `import { prisma } from '@/shared/prisma'`

#### Completion Notes

(To be filled in during implementation)

### Task Group 2: Workflow Engine Package Foundation

<!-- prettier-ignore -->
- [ ] WF-004 Create package structure
  - Create: `packages/workflow-engine/` directory
  - File: `packages/workflow-engine/package.json`
  - Dependencies: zod, @repo/agent-cli-sdk, simple-git
  - DevDependencies: typescript, vitest, bunchee
- [ ] WF-005 Setup TypeScript config
  - File: `packages/workflow-engine/tsconfig.json`
  - Extend from `@repo/typescript-config/base.json`
  - Set moduleResolution: "bundler"
- [ ] WF-006 Create type definitions
  - File: `packages/workflow-engine/src/types/workflow.ts`
  - Define: WorkflowConfig, StepConfig, StepResult, WorkflowStatus, StepStatus
  - File: `packages/workflow-engine/src/types/context.ts`
  - Define: WorkflowContext interface
  - File: `packages/workflow-engine/src/types/step.ts`
  - Define: AgentStepConfig, FunctionStepConfig, ScriptStepConfig
- [ ] WF-007 Update workspace config
  - File: `pnpm-workspace.yaml`
  - Verify `packages/*` includes workflow-engine
  - File: `turbo.json`
  - Add workflow-engine to build pipeline with dependencies

#### Completion Notes

(To be filled in during implementation)

### Task Group 3: Workflow Parsers

<!-- prettier-ignore -->
- [ ] WF-008 Implement YAML parser
  - File: `packages/workflow-engine/src/parser/YamlParser.ts`
  - Parse YAML files to WorkflowDefinition model
  - Support args schema, phases, steps
  - Validate step types: agent, script
- [ ] WF-009 Implement code parser
  - File: `packages/workflow-engine/src/parser/CodeParser.ts`
  - Load TypeScript workflow files
  - Support defineWorkflow() function
  - Extract argsSchema, phases, execute function
- [ ] WF-010 Create unified workflow model
  - File: `packages/workflow-engine/src/parser/WorkflowDefinition.ts`
  - Normalize code/YAML to same structure
  - Validate phases, steps, args schema

#### Completion Notes

(To be filled in during implementation)

### Task Group 4: Execution Engine Core

<!-- prettier-ignore -->
- [ ] WF-011 Implement WorkflowContext
  - File: `packages/workflow-engine/src/execution/WorkflowContext.ts`
  - Implement: step(), checkpoint(), comment(), exec(), getStepResult()
  - Handle agent steps via @repo/agent-cli-sdk
  - Handle function steps
  - Handle script steps via child_process
- [ ] WF-012 Implement WorkflowExecutor
  - File: `packages/workflow-engine/src/execution/WorkflowExecutor.ts`
  - Main execution loop
  - Load workflow definition
  - Create WorkflowContext
  - Execute workflow.execute(ctx)
  - Handle errors, update DB state
- [ ] WF-013 Implement CheckpointManager
  - File: `packages/workflow-engine/src/execution/CheckpointManager.ts`
  - Save checkpoints to filesystem
  - Load checkpoints for resume
  - Include: current_phase, current_step_index, step_results
  - Path: `.agent/workflows/executions/{id}/checkpoints/`

#### Completion Notes

(To be filled in during implementation)

### Task Group 5: Filesystem Storage

<!-- prettier-ignore -->
- [ ] WF-014 Implement FileSystemStorage
  - File: `packages/workflow-engine/src/storage/FileSystemStorage.ts`
  - Create execution directory structure
  - Save: definition.json, args.json (immutable)
  - Create: checkpoints/, artifacts/, logs/ directories
  - Methods: saveLog(), saveArtifact(), createLogDirectory()
- [ ] WF-015 Create package exports
  - File: `packages/workflow-engine/src/index.ts`
  - Export: WorkflowExecutor, WorkflowContext, parsers, types
  - Build package: `pnpm build`

#### Completion Notes

(To be filled in during implementation)

### Task Group 6: Backend Domain Services - Workflow

<!-- prettier-ignore -->
- [ ] WF-016 Create workflow domain structure
  - Directory: `apps/web/src/server/domain/workflow/services/`
  - Directory: `apps/web/src/server/domain/workflow/schemas/`
  - Directory: `apps/web/src/server/domain/workflow/types/`
- [ ] WF-017 Implement createWorkflowRun service
  - File: `apps/web/src/server/domain/workflow/services/createWorkflowRun.ts`
  - Create WorkflowRun in DB
  - Set initial state: status=running, current_phase=first_phase
  - Return execution record
- [ ] WF-018 Implement executeWorkflow service
  - File: `apps/web/src/server/domain/workflow/services/executeWorkflow.ts`
  - Load workflow definition
  - Create WorkflowExecutor instance
  - Execute workflow with WebSocket events
  - Update DB state during execution
- [ ] WF-019 Implement pauseWorkflow service
  - File: `apps/web/src/server/domain/workflow/services/pauseWorkflow.ts`
  - Update status to 'paused'
  - Set paused_at timestamp
- [ ] WF-020 Implement resumeWorkflow service
  - File: `apps/web/src/server/domain/workflow/services/resumeWorkflow.ts`
  - Load checkpoint from filesystem
  - Resume execution from current_step_index
  - Skip completed steps
- [ ] WF-021 Implement cancelWorkflow service
  - File: `apps/web/src/server/domain/workflow/services/cancelWorkflow.ts`
  - Update status to 'cancelled'
  - Set cancelled_at timestamp
- [ ] WF-022 Implement getWorkflowRuns service
  - File: `apps/web/src/server/domain/workflow/services/getWorkflowRuns.ts`
  - Query executions by project_id, status
  - Include: steps, workflow_definition, _count for comments/artifacts
  - Order by started_at desc
- [ ] WF-023 Implement getWorkflowRunById service
  - File: `apps/web/src/server/domain/workflow/services/getWorkflowRunById.ts`
  - Get single execution with all relations
  - Include: steps, comments, artifacts (via steps), workflow_definition
- [ ] WF-024 Create domain barrel export
  - File: `apps/web/src/server/domain/workflow/services/index.ts`
  - Export all service functions

#### Completion Notes

(To be filled in during implementation)

### Task Group 7: Backend Domain Services - Artifacts & Comments

<!-- prettier-ignore -->
- [ ] WF-025 Create artifact domain structure
  - Directory: `apps/web/src/server/domain/workflow-artifact/services/`
- [ ] WF-026 Implement uploadArtifact service
  - File: `apps/web/src/server/domain/workflow-artifact/services/uploadArtifact.ts`
  - Save file to `.agent/workflows/executions/{id}/artifacts/{stepId}/`
  - Create WorkflowArtifact DB record with file_path, size_bytes, mime_type
- [ ] WF-027 Implement downloadArtifact service
  - File: `apps/web/src/server/domain/workflow-artifact/services/downloadArtifact.ts`
  - Get artifact by ID
  - Stream file from file_path
- [ ] WF-028 Implement attachToComment service
  - File: `apps/web/src/server/domain/workflow-artifact/services/attachToComment.ts`
  - Update artifact.workflow_comment_id
- [ ] WF-029 Create comment domain structure
  - Directory: `apps/web/src/server/domain/workflow-comment/services/`
- [ ] WF-030 Implement createComment service
  - File: `apps/web/src/server/domain/workflow-comment/services/createComment.ts`
  - Create WorkflowComment record
  - Support workflow-level (step_id null) and step-level
- [ ] WF-031 Implement getComments service
  - File: `apps/web/src/server/domain/workflow-comment/services/getComments.ts`
  - Get comments for execution/step
  - Include: creator, artifacts
  - Order by created_at asc

#### Completion Notes

(To be filled in during implementation)

### Task Group 8: Backend API Routes

<!-- prettier-ignore -->
- [ ] WF-032 Create workflow routes
  - File: `apps/web/src/server/routes/workflows.ts`
  - POST /api/workflow-executions - Create execution
  - GET /api/workflow-executions - List executions
  - GET /api/workflow-executions/:id - Get details
  - POST /api/workflow-executions/:id/pause - Pause
  - POST /api/workflow-executions/:id/resume - Resume
  - POST /api/workflow-executions/:id/cancel - Cancel
- [ ] WF-033 Create step routes
  - File: `apps/web/src/server/routes/workflow-steps.ts`
  - GET /api/workflow-steps/:id - Get step details
  - GET /api/workflow-steps/:id/logs/:type - Stream logs (input/output/events/summary)
- [ ] WF-034 Create artifact routes
  - File: `apps/web/src/server/routes/workflow-artifacts.ts`
  - POST /api/workflow-executions/:id/artifacts - Upload (multipart)
  - GET /api/artifacts/:id - Download
  - PATCH /api/artifacts/:id/attach - Attach to comment
  - DELETE /api/artifacts/:id/detach - Detach from comment
- [ ] WF-035 Create comment routes
  - File: `apps/web/src/server/routes/workflow-comments.ts`
  - POST /api/workflow-executions/:id/comments - Create comment
  - GET /api/workflow-executions/:id/comments - List comments
- [ ] WF-036 Register routes
  - File: `apps/web/src/server/routes/index.ts`
  - Import and register workflow routes

#### Completion Notes

(To be filled in during implementation)

### Task Group 9: WebSocket Events

<!-- prettier-ignore -->
- [ ] WF-037 Implement workflow WebSocket handler
  - File: `apps/web/src/server/websocket/handlers/workflow.ts`
  - Events: workflow.step.started, workflow.step.progress, workflow.step.completed
  - Events: workflow.comment.created, workflow.artifact.created
  - Events: workflow.execution.status_changed, workflow.execution.phase_changed
  - Broadcast to all connected clients for project
- [ ] WF-038 Integrate with WebSocket server
  - File: `apps/web/src/server/websocket/infrastructure/EventBus.ts`
  - Register workflow event types
  - Route to workflow handler

#### Completion Notes

(To be filled in during implementation)

### Task Group 10: Frontend - Zustand Store

<!-- prettier-ignore -->
- [ ] WF-039 Create workflow store
  - File: `apps/web/src/client/pages/projects/workflows/stores/workflowStore.ts`
  - State: executions, currentExecution, filters
  - Actions: setExecutions, addExecution, updateExecution, deleteExecution
  - Immutable updates for all state changes

#### Completion Notes

(To be filled in during implementation)

### Task Group 11: Frontend - Hooks

<!-- prettier-ignore -->
- [ ] WF-040 Create useWorkflowRuns hook
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowRuns.ts`
  - Use TanStack Query to fetch executions
  - Query key: ['workflow-executions', projectId, filters]
  - Support filtering by status
- [ ] WF-041 Create useWorkflowWebSocket hook
  - File: `apps/web/src/client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`
  - Subscribe to workflow events
  - Update workflowStore on events
  - Invalidate queries on status changes

#### Completion Notes

(To be filled in during implementation)

### Task Group 12: Frontend - Kanban Board Components

<!-- prettier-ignore -->
- [ ] WF-042 Create KanbanBoard component
  - File: `apps/web/src/client/pages/projects/workflows/components/KanbanBoard.tsx`
  - Columns = phases from workflow definition
  - Cards = WorkflowRun grouped by current_phase
  - Use react-beautiful-dnd or @dnd-kit for drag-and-drop
  - Real-time updates via useWorkflowWebSocket
- [ ] WF-043 Create WorkflowCard component
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowCard.tsx`
  - Display: name, status, progress (X/Y steps)
  - Show: artifact count, comment count badges
  - Click to open StepDetailModal
- [ ] WF-044 Create StepDetailModal component
  - File: `apps/web/src/client/pages/projects/workflows/components/StepDetailModal.tsx`
  - Tabs: Steps, Logs, Artifacts, Comments
  - Fetch step details on open
  - Stream logs in real-time
- [ ] WF-045 Create CommentsList component
  - File: `apps/web/src/client/pages/projects/workflows/components/CommentsList.tsx`
  - Display comments with creator, timestamp
  - Show attached artifacts inline
  - Support adding new comments
- [ ] WF-046 Create ArtifactsList component
  - File: `apps/web/src/client/pages/projects/workflows/components/ArtifactsList.tsx`
  - Grid view of artifacts
  - Preview images/videos
  - Download links for other types

#### Completion Notes

(To be filled in during implementation)

### Task Group 13: Frontend - Templates & Main Pages

<!-- prettier-ignore -->
- [ ] WF-047 Create WorkflowTemplatesPage component
  - File: `apps/web/src/client/pages/projects/workflows/components/WorkflowTemplatesPage.tsx`
  - List workflow definitions
  - "Run" button to create execution
  - Show: name, description, times used
- [ ] WF-048 Create WorkflowsPage component
  - File: `apps/web/src/client/pages/projects/workflows/WorkflowsPage.tsx`
  - Tabs: Active (kanban), Templates, Completed
  - Active tab shows KanbanBoard
- [ ] WF-049 Add workflows tab to ProjectsPage
  - File: `apps/web/src/client/pages/projects/ProjectsPage.tsx`
  - Add "Workflows" tab alongside Sessions, Files, Shell
  - Route to WorkflowsPage

#### Completion Notes

(To be filled in during implementation)

### Task Group 14: Example Workflows

<!-- prettier-ignore -->
- [ ] WF-050 Create example TypeScript workflow
  - File: `.agent/workflows/definitions/implement-feature.ts`
  - Define phases: research, plan, implement, test
  - Show async/await step execution
  - Include conditional logic based on args
- [ ] WF-051 Create example YAML workflow
  - File: `.agent/workflows/definitions/simple-pipeline.yaml`
  - Simple build/test/deploy pipeline
  - Show script steps

#### Completion Notes

(To be filled in during implementation)

### Task Group 15: Testing & Documentation

<!-- prettier-ignore -->
- [ ] WF-052 Write workflow engine tests
  - Directory: `packages/workflow-engine/src/__tests__/`
  - Test: YAML parser, code parser, WorkflowContext, CheckpointManager
  - Run: `cd packages/workflow-engine && pnpm test`
- [ ] WF-053 Write backend integration tests
  - Test: createWorkflowRun, executeWorkflow, pause/resume
  - Test: artifact upload/download, comments
- [ ] WF-054 Write workflow engine README
  - File: `packages/workflow-engine/README.md`
  - Usage examples, API reference
- [ ] WF-055 Update main README
  - File: `README.md`
  - Add workflows section
  - Link to workflow engine package

#### Completion Notes

(To be filled in during implementation)

## Testing Strategy

### Unit Tests

**`packages/workflow-engine/src/parser/YamlParser.test.ts`** - YAML parsing:
```typescript
describe('YamlParser', () => {
  it('should parse YAML workflow with steps', () => {
    const yaml = `
      name: Test Workflow
      phases: [build, test]
      steps:
        - id: build
          phase: build
          type: script
          command: pnpm build
    `;
    const result = parseYaml(yaml);
    expect(result.name).toBe('Test Workflow');
    expect(result.phases).toEqual(['build', 'test']);
    expect(result.steps).toHaveLength(1);
  });
});
```

**`packages/workflow-engine/src/execution/WorkflowContext.test.ts`** - Step execution:
```typescript
describe('WorkflowContext', () => {
  it('should execute agent step', async () => {
    const ctx = new WorkflowContext({ executionId: 'test', args: {} });
    const result = await ctx.step('test-step', {
      phase: 'test',
      agent: 'claude',
      prompt: 'Test prompt'
    });
    expect(result.status).toBe('completed');
  });
});
```

### Integration Tests

**Backend Integration Tests**:
- Create execution → Execute workflow → Verify DB state
- Pause execution → Resume execution → Verify continues from checkpoint
- Upload artifact → Download artifact → Verify file integrity
- Create comment → Attach artifact → Verify relationship

**E2E Tests (Playwright)**:
- Navigate to workflows tab
- Create new execution from template
- Watch kanban board update in real-time
- Click card, view step details
- Add comment, upload artifact
- Pause and resume execution

## Success Criteria

- [ ] Can create workflow definitions in TypeScript and YAML
- [ ] Can execute workflows with agent, function, and script steps
- [ ] Workflow state persists in database (current_phase, status, step statuses)
- [ ] Can pause and resume workflows from checkpoint
- [ ] Kanban board shows executions grouped by phase
- [ ] Real-time updates via WebSocket (step progress, comments, artifacts)
- [ ] Can view step logs (input, output, events, summary)
- [ ] Can upload artifacts to steps
- [ ] Can attach artifacts to comments
- [ ] Can add comments at workflow and step level
- [ ] All TypeScript code compiles with no errors
- [ ] All tests pass (unit + integration)
- [ ] Database migrations apply cleanly
- [ ] No console errors in development

## Validation

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: All packages build successfully

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests
cd packages/workflow-engine && pnpm test
# Expected: All tests pass

# Integration tests
cd apps/web && pnpm test
# Expected: All tests pass

# Database migration
cd apps/web && pnpm prisma migrate dev
# Expected: Migration applies successfully
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{projectId}/workflows`
3. Verify: Workflows tab appears
4. Create workflow template: Upload TypeScript workflow to `.agent/workflows/definitions/`
5. Start execution: Click "Run" on template
6. Verify: Card appears on kanban board in first phase
7. Watch: Real-time updates as workflow executes
8. Click card: View step details modal
9. Check logs: Input, output, events display correctly
10. Add comment: Comment appears in list
11. Upload artifact: File uploads successfully
12. Attach to comment: Artifact shows inline with comment
13. Pause execution: Verify status changes to "paused"
14. Resume execution: Verify continues from checkpoint
15. Check database: Query WorkflowRun, WorkflowRunStep tables

**Feature-Specific Checks:**

- Verify checkpoint files created in `.agent/workflows/executions/{id}/checkpoints/`
- Verify artifacts saved to `.agent/workflows/executions/{id}/artifacts/{stepId}/`
- Verify logs saved to `.agent/workflows/executions/{id}/logs/{stepId}/`
- Verify AgentSession linked to WorkflowRunStep
- Verify cascading deletes work (delete step → artifacts/comments deleted)
- Test YAML and TypeScript workflows both work
- Test conditional logic in TypeScript workflows
- Test agent step execution with real Claude CLI

## Implementation Notes

### 1. Checkpoint Format

Checkpoints save full execution state for resume:
```json
{
  "execution_id": "uuid",
  "timestamp": "2025-01-25T10:30:00Z",
  "current_phase": "implement",
  "current_step_index": 2,
  "completed_step_ids": ["research-codebase", "create-spec"],
  "step_results": {
    "research-codebase": { "data": { "patterns": [...] } },
    "create-spec": { "data": { "spec": {...} } }
  }
}
```

### 2. Step Execution Order

Steps execute sequentially in order defined in workflow. Use `current_step_index` to track progress. On resume, skip steps with status='completed' in DB.

### 3. WebSocket Event Payload Format

All events follow this structure:
```typescript
{
  type: "workflow.step.completed",
  data: {
    execution_id: "uuid",
    step_id: "research-codebase",
    result: { ... },
    phase: "research"
  }
}
```

### 4. File Upload Handling

Artifacts uploaded via multipart form data. Server saves to filesystem, creates DB record with metadata. Use `multer` or `@fastify/multipart` for upload handling.

### 5. Agent Session Integration

When executing agent step, create AgentSession first, then create WorkflowRunStep with agent_session_id. This links step to full agent logs (JSONL session file).

## Dependencies

- **@dnd-kit/core** - Drag-and-drop for kanban board
- **@dnd-kit/sortable** - Sortable items for kanban
- **yaml** - YAML parsing for workflow definitions
- **zod** - Schema validation for workflows
- All other dependencies already in monorepo

## Timeline

| Task                                    | Estimated Time |
| --------------------------------------- | -------------- |
| Database schema & migrations            | 6 hours        |
| Workflow engine package foundation      | 12 hours       |
| Workflow parsers (YAML + code)          | 16 hours       |
| Execution engine core                   | 20 hours       |
| Filesystem storage                      | 8 hours        |
| Backend domain services - workflow      | 16 hours       |
| Backend domain services - artifacts     | 8 hours        |
| Backend API routes                      | 12 hours       |
| WebSocket events                        | 6 hours        |
| Frontend - Zustand store & hooks        | 8 hours        |
| Frontend - Kanban board components      | 20 hours       |
| Frontend - Templates & main pages       | 12 hours       |
| Example workflows                       | 4 hours        |
| Testing & documentation                 | 12 hours       |
| **Total**                               | **160 hours**  |

## References

- Temporal Workflows: https://docs.temporal.io/workflows
- Inngest Durable Execution: https://www.inngest.com/docs/learn/how-functions-are-executed
- Restate Workflows: https://www.restate.dev/what-is-durable-execution
- GitHub Actions Workflow Syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Argo Workflows: https://argo-workflows.readthedocs.io/
- Prefect: https://docs.prefect.io/

## Next Steps

1. Create database migrations: `cd apps/web && pnpm prisma migrate dev --name add_workflows`
2. Create workflow-engine package structure
3. Implement YAML parser first (simpler than code parser)
4. Build execution engine with basic step support
5. Create backend API routes
6. Build minimal kanban UI
7. Add real-time WebSocket updates
8. Iterate and add features

---

**Ready to implement with `/implement-spec 36`**
