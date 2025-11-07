# Workflow Orchestration System

**Status**: draft
**Created**: 2025-01-02
**Package**: apps/web, packages/workflow-sdk
**Estimated Effort**: 6-8 hours

## Overview

Build a workflow orchestration system that allows users to define TypeScript-based workflows for full SDLC automation. Workflows can execute CLI agents (Claude, Codex, Gemini), perform git operations, run tests, and create pull requests. All execution data is tracked with full audit trails, real-time WebSocket updates, and comprehensive artifact storage.

## User Story

As a developer
I want to automate complex SDLC workflows (spec generation, implementation, testing, PR creation)
So that I can execute multi-step development tasks with full traceability and observability

## Technical Approach

**Phase-based implementation:**
1. Database schema (Prisma) - 4 new tables + extend AgentSession
2. TypeScript SDK package (`@repo/workflow-sdk`) - workflow definition and execution
3. Server-side workflow engine (domain services, REST API, WebSocket handlers)
4. Example workflow demonstrating all features

**Key characteristics:**
- Workflows defined as TypeScript files in `.agent/workflows/templates/`
- Auto-discovery on app startup
- State stored as JSON on WorkflowRun
- Steps create separate rows for iterative workflows
- Agent sessions linked to steps with names
- All file paths relative to project.path
- Real-time updates via WebSocket

## Key Design Decisions

1. **Separate table for steps**: Provides granular progress tracking, retry capability, and organization for comments/artifacts/agent sessions
2. **State as JSON field**: Simple key-value storage on WorkflowRun for ctx.set()/ctx.get() with in-memory caching during execution
3. **Allow duplicate step names**: Supports iterative workflows where steps like "review" and "implement" can run multiple times
4. **Agent session naming**: Add `name` field to distinguish multiple agent calls within a single step
5. **File paths relative to project**: All workflow data lives inside the project directory for portability
6. **Cascade delete strategy**: CASCADE for project/execution deletions, RESTRICT for workflow definition to preserve history

## Architecture

### File Structure
```
.agent/workflows/
├── templates/                          # Workflow definitions
│   ├── simple-sdlc.ts
│   ├── build-feature.ts
│   └── full-sdlc.ts
│
└── executions/                         # Execution data
    └── {execution_id}/
        ├── logs/
        │   ├── execution.log
        │   └── step-{n}-{name}.log
        ├── artifacts/
        │   ├── {step_id}/
        │   │   └── *.jsonl, *.png, *.json
        │   └── execution/
        └── metadata.json

packages/workflow-sdk/
├── src/
│   ├── index.ts
│   ├── workflow.ts          # createWorkflow()
│   ├── context.ts           # WorkflowContext
│   ├── executor.ts          # Execution engine
│   ├── logger.ts
│   ├── storage.ts
│   ├── types.ts
│   └── utils/
│       ├── git.ts
│       ├── files.ts
│       └── retry.ts
└── tests/

apps/web/src/server/domain/workflow/
├── services/
│   ├── discoverWorkflows.ts
│   ├── registerWorkflow.ts
│   ├── executeWorkflow.ts
│   ├── createWorkflowContext.ts
│   ├── getExecution.ts
│   ├── listExecutions.ts
│   ├── cancelExecution.ts
│   ├── storeArtifact.ts
│   ├── addComment.ts
│   └── createAgentSession.ts
├── schemas/
└── types/
```

### Integration Points

**Database (Prisma)**:
- `apps/web/prisma/schema.prisma` - Add 4 new models, extend AgentSession

**Existing Packages**:
- `@repo/agent-cli-sdk` - Used by workflow SDK to execute CLI agents
- `simple-git` - Git operations in workflow context

**WebSocket Infrastructure**:
- `apps/web/src/server/websocket/handlers/workflowHandler.ts` - Real-time execution updates

**REST API**:
- `apps/web/src/server/routes/workflows.ts` - Workflow CRUD and execution endpoints

## Implementation Details

### 1. Database Schema

Add 4 new models to Prisma schema with snake_case naming convention.

**Key Points**:
- `WorkflowDefinition` - Template metadata (name, file_path, config)
- `WorkflowRun` - Execution instance (status, input/output, state, current_step)
- `WorkflowStep` - Individual steps (step_number, name, status, timing, output)
- `WorkflowComment` - Audit trail comments (can attach to execution or step)
- Extend `AgentSession` with `workflow_step_id` and `name` fields
- Cascade: Project→Executions (CASCADE), WorkflowDef→Executions (RESTRICT)
- File paths stored relative to project.path

### 2. Workflow SDK (`@repo/workflow-sdk`)

TypeScript package for defining and executing workflows.

**Key Points**:
- `createWorkflow()` - Define workflows with config and execute function
- `WorkflowContext` - Provides ctx.run(), ctx.runCli(), ctx.git.*, ctx.files.*, ctx.shell()
- `ctx.comment()` - Add audit trail comments to current step
- `ctx.set()` / `ctx.get()` - In-memory state cache, persisted to WorkflowRun.state
- Integration with @repo/agent-cli-sdk for CLI agent execution
- Automatic step tracking and current_workflow_step_id updates
- Artifact storage with proper file path generation

### 3. Workflow Engine (Server Domain)

Server-side services for workflow discovery, registration, and execution.

**Key Points**:
- Auto-discovery scans `.agent/workflows/templates/*.ts` on startup
- Execution runs in Fastify server process (simplicity for MVP)
- State management: in-memory during execution, flushed to DB on completion
- WebSocket broadcasts for step updates, comments, agent sessions, artifacts
- Logging to both Pino log files and WorkflowComment table
- File paths constructed relative to project.path

### 4. REST API Endpoints

CRUD operations for workflows and executions.

**Key Points**:
- GET /api/workflows - List workflow definitions
- POST /api/workflows/:id/execute - Start execution with input
- GET /api/executions/:id - Get execution details (includes current_step)
- POST /api/executions/:id/cancel - Cancel running execution
- GET /api/artifacts/:id/download - Download artifact files
- All responses include current_step for real-time progress display

### 5. WebSocket Integration

Real-time execution updates via existing WebSocket infrastructure.

**Key Points**:
- `workflow:execution:started` - Workflow begins
- `workflow:step:updated` - Step status changes (updates current_workflow_step_id)
- `workflow:comment:added` - New audit comment
- `workflow:agent:updated` - Agent session progress
- `workflow:artifact:created` - New artifact attached
- `workflow:execution:completed` - Workflow finishes
- Subscription model: clients subscribe to specific execution IDs

## Files to Create/Modify

### New Files (25)

1. `apps/web/prisma/migrations/XXX_add_workflow_tables.sql` - Database migration
2. `packages/workflow-sdk/package.json` - Package manifest
3. `packages/workflow-sdk/tsconfig.json` - TypeScript config
4. `packages/workflow-sdk/src/index.ts` - Main exports
5. `packages/workflow-sdk/src/workflow.ts` - createWorkflow() implementation
6. `packages/workflow-sdk/src/context.ts` - WorkflowContext class
7. `packages/workflow-sdk/src/executor.ts` - Execution engine
8. `packages/workflow-sdk/src/logger.ts` - Logging utilities
9. `packages/workflow-sdk/src/storage.ts` - Artifact storage
10. `packages/workflow-sdk/src/types.ts` - Type definitions
11. `packages/workflow-sdk/src/utils/git.ts` - Git operations
12. `packages/workflow-sdk/src/utils/files.ts` - File operations
13. `packages/workflow-sdk/src/utils/retry.ts` - Retry logic
14. `apps/web/src/server/domain/workflow/services/discoverWorkflows.ts` - Auto-discovery
15. `apps/web/src/server/domain/workflow/services/registerWorkflow.ts` - Registration
16. `apps/web/src/server/domain/workflow/services/executeWorkflow.ts` - Execution
17. `apps/web/src/server/domain/workflow/services/createWorkflowContext.ts` - Context builder
18. `apps/web/src/server/domain/workflow/services/getExecution.ts` - Query execution
19. `apps/web/src/server/domain/workflow/services/listExecutions.ts` - List executions
20. `apps/web/src/server/domain/workflow/services/cancelExecution.ts` - Cancel execution
21. `apps/web/src/server/domain/workflow/services/storeArtifact.ts` - Artifact storage
22. `apps/web/src/server/domain/workflow/services/addComment.ts` - Add comment
23. `apps/web/src/server/domain/workflow/services/createAgentSession.ts` - Create session
24. `apps/web/src/server/domain/workflow/schemas/workflowDefinition.ts` - Zod schemas
25. `apps/web/src/server/domain/workflow/schemas/workflowExecution.ts` - Zod schemas

### Modified Files (6)

1. `apps/web/prisma/schema.prisma` - Add WorkflowDefinition, WorkflowRun, WorkflowStep, WorkflowComment models, extend AgentSession
2. `apps/web/src/server/routes/index.ts` - Register workflow routes
3. `apps/web/src/server/routes/workflows.ts` - Create workflow endpoints
4. `apps/web/src/server/websocket/handlers/index.ts` - Register workflow handler
5. `apps/web/src/server/websocket/handlers/workflowHandler.ts` - Create WebSocket handler
6. `CLAUDE.md` - Document snake_case convention and workflow system

## Step by Step Tasks

### Task Group 1: Database Schema

<!-- prettier-ignore -->
- [ ] wf-db-1 Create WorkflowDefinition model in schema.prisma
  - Fields: id, name (unique), description, version, file_path, config (Json), is_active, created_at, updated_at
  - Index: [name, is_active]
  - File: `apps/web/prisma/schema.prisma`
- [ ] wf-db-2 Create WorkflowRun model in schema.prisma
  - Fields: id, workflow_def_id, project_id, run_id (unique), status, current_workflow_step_id, started_at, completed_at, duration, branch_name, commit_sha, pr_url, input (Json), output (Json), error, state (Json), log_file_path, created_at, updated_at
  - Relations: workflow_def (onDelete: Restrict), project (onDelete: Cascade), current_step (onDelete: SetNull), steps, artifacts, comments
  - Indexes: [workflow_def_id, status], [project_id, status], [current_workflow_step_id], [branch_name], [started_at]
  - File: `apps/web/prisma/schema.prisma`
- [ ] wf-db-3 Create WorkflowStep model in schema.prisma
  - Fields: id, execution_id, step_number, name, status, started_at, completed_at, duration, input (Json), output (Json), error (Json), attempt_number (default: 1), max_attempts (default: 3), log_file_path, created_at, updated_at
  - Relations: execution (ExecutionSteps), current_in_executions (CurrentStep), agent_sessions, artifacts, comments
  - Unique: [execution_id, step_number]
  - Indexes: [execution_id, status], [name, status]
  - File: `apps/web/prisma/schema.prisma`
- [ ] wf-db-4 Create WorkflowComment model in schema.prisma
  - Fields: id, execution_id, step_id (nullable), message, metadata (Json), created_at
  - Relations: execution (onDelete: Cascade), step (onDelete: Cascade)
  - Indexes: [execution_id, created_at], [step_id, created_at]
  - File: `apps/web/prisma/schema.prisma`
- [ ] wf-db-5 Add WorkflowArtifact model in schema.prisma
  - Fields: id, execution_id, step_id (nullable), agent_session_id (nullable), name, type (enum), storage_path, storage_type (enum, default: FILESYSTEM), mime_type, size_bytes, metadata (Json), created_at
  - Relations: execution (onDelete: Cascade), step (onDelete: Cascade), agent_session (onDelete: Cascade)
  - Indexes: [execution_id, type], [step_id], [agent_session_id]
  - File: `apps/web/prisma/schema.prisma`
- [ ] wf-db-6 Add enums for WorkflowStatus, StepStatus, ArtifactType, StorageType
  - WorkflowStatus: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, TIMED_OUT
  - StepStatus: PENDING, RUNNING, COMPLETED, FAILED, RETRYING, SKIPPED, CANCELLED
  - ArtifactType: SCREENSHOT, LOG_FILE, SESSION_FILE, TEST_REPORT, BUILD_OUTPUT, DOCUMENT, OTHER
  - StorageType: FILESYSTEM
  - File: `apps/web/prisma/schema.prisma`
- [ ] wf-db-7 Extend AgentSession model with workflow fields
  - Add: workflow_step_id (String, nullable), name (String, nullable)
  - Add relation: workflow_step (onDelete: Cascade)
  - Add index: [workflow_step_id]
  - File: `apps/web/prisma/schema.prisma`
- [ ] wf-db-8 Create and run migration
  - Command: `cd apps/web && pnpm prisma:migrate`
  - Expected: Migration created and applied successfully
- [ ] wf-db-9 Generate Prisma client
  - Command: `cd apps/web && pnpm prisma:generate`
  - Expected: Prisma client generated with new models

#### Completion Notes

(To be filled in during implementation)

### Task Group 2: Workflow SDK Package Setup

<!-- prettier-ignore -->
- [ ] wf-sdk-1 Create workflow-sdk package directory structure
  - Command: `mkdir -p packages/workflow-sdk/src/utils packages/workflow-sdk/tests`
  - File: `packages/workflow-sdk/`
- [ ] wf-sdk-2 Create package.json for workflow-sdk
  - Name: @repo/workflow-sdk
  - Dependencies: @repo/agent-cli-sdk (workspace:*), simple-git, zod
  - DevDependencies: vitest, typescript, @types/node
  - Scripts: build, test, test:watch
  - Type: module
  - File: `packages/workflow-sdk/package.json`
- [ ] wf-sdk-3 Create tsconfig.json for workflow-sdk
  - Extend from @repo/typescript-config/base.json
  - ModuleResolution: bundler
  - File: `packages/workflow-sdk/tsconfig.json`
- [ ] wf-sdk-4 Create types.ts with core type definitions
  - WorkflowConfig, WorkflowDefinition, WorkflowContext, WorkflowStatus, StepStatus, ArtifactType
  - File: `packages/workflow-sdk/src/types.ts`

#### Completion Notes

(To be filled in during implementation)

### Task Group 3: Workflow SDK Core Implementation

<!-- prettier-ignore -->
- [ ] wf-sdk-5 Implement workflow.ts with createWorkflow() function
  - Accept WorkflowConfig and execute function
  - Return WorkflowDefinition object
  - Validate config (name required, timeout defaults to 3600000ms)
  - File: `packages/workflow-sdk/src/workflow.ts`
- [ ] wf-sdk-6 Implement WorkflowContext class in context.ts
  - Constructor accepts executionId, projectId, projectPath, input
  - Implement ctx.run() - creates WorkflowStep, executes function, tracks timing
  - Implement ctx.runCli() - creates AgentSession, executes CLI adapter, stores session
  - Implement ctx.comment() and ctx.commentExecution()
  - Implement state management: ctx.set(), ctx.get(), ctx.has(), ctx.delete() with in-memory cache
  - File: `packages/workflow-sdk/src/context.ts`
- [ ] wf-sdk-7 Implement git operations in utils/git.ts
  - Use simple-git library
  - Functions: ensureBranch, getCurrentBranch, commit, push, createPr, getCurrentCommit, stageAll, status
  - All operations work relative to projectPath
  - File: `packages/workflow-sdk/src/utils/git.ts`
- [ ] wf-sdk-8 Implement file operations in utils/files.ts
  - Functions: read, write, exists, delete, list, copy
  - All operations work relative to projectPath
  - File: `packages/workflow-sdk/src/utils/files.ts`
- [ ] wf-sdk-9 Implement retry logic in utils/retry.ts
  - Exponential, linear, and fixed backoff strategies
  - Configurable max attempts and delay
  - File: `packages/workflow-sdk/src/utils/retry.ts`
- [ ] wf-sdk-10 Implement logger.ts with Pino integration
  - Log levels: trace, debug, info, warn, error, fatal
  - Write to both console and log files
  - File: `packages/workflow-sdk/src/logger.ts`
- [ ] wf-sdk-11 Implement storage.ts for artifact management
  - Function to generate artifact storage paths relative to project
  - Function to copy artifacts to execution directory
  - File: `packages/workflow-sdk/src/storage.ts`
- [ ] wf-sdk-12 Implement executor.ts with execution engine
  - Load workflow definition
  - Create WorkflowContext
  - Execute workflow function
  - Handle errors and update execution status
  - Update current_workflow_step_id as steps progress
  - Flush state to database on completion
  - File: `packages/workflow-sdk/src/executor.ts`
- [ ] wf-sdk-13 Create index.ts with public exports
  - Export: createWorkflow, WorkflowContext, types
  - File: `packages/workflow-sdk/src/index.ts`

#### Completion Notes

(To be filled in during implementation)

### Task Group 4: Server Domain Services

<!-- prettier-ignore -->
- [ ] wf-srv-1 Create workflow domain directory structure
  - Command: `mkdir -p apps/web/src/server/domain/workflow/services apps/web/src/server/domain/workflow/schemas apps/web/src/server/domain/workflow/types`
- [ ] wf-srv-2 Implement discoverWorkflows.ts
  - Scan .agent/workflows/templates/*.ts using glob
  - Dynamically import workflow files
  - Extract workflow definitions
  - Return array of WorkflowDefinition objects
  - File: `apps/web/src/server/domain/workflow/services/discoverWorkflows.ts`
- [ ] wf-srv-3 Implement registerWorkflow.ts
  - Upsert WorkflowDefinition to database
  - Store file_path, name, description, config
  - Handle versioning (increment if name exists)
  - File: `apps/web/src/server/domain/workflow/services/registerWorkflow.ts`
- [ ] wf-srv-4 Implement createWorkflowContext.ts
  - Create WorkflowContext instance
  - Inject database access (Prisma client)
  - Setup state cache
  - Return configured context
  - File: `apps/web/src/server/domain/workflow/services/createWorkflowContext.ts`
- [ ] wf-srv-5 Implement executeWorkflow.ts
  - Create WorkflowRun record with PENDING status
  - Create WorkflowContext via createWorkflowContext
  - Execute workflow.execute() function
  - Update execution status (RUNNING → COMPLETED/FAILED)
  - Store output and duration
  - Flush state to database
  - Broadcast WebSocket events
  - File: `apps/web/src/server/domain/workflow/services/executeWorkflow.ts`
- [ ] wf-srv-6 Implement getExecution.ts
  - Query WorkflowRun with includes (current_step, steps, comments, artifacts)
  - Return full execution details
  - File: `apps/web/src/server/domain/workflow/services/getExecution.ts`
- [ ] wf-srv-7 Implement listExecutions.ts
  - Support filtering by project_id, workflow_def_id, status
  - Support pagination (page, limit)
  - Support sorting by started_at
  - Include current_step in results
  - File: `apps/web/src/server/domain/workflow/services/listExecutions.ts`
- [ ] wf-srv-8 Implement cancelExecution.ts
  - Update execution status to CANCELLED
  - Set cancellation flag in context
  - Broadcast WebSocket event
  - File: `apps/web/src/server/domain/workflow/services/cancelExecution.ts`
- [ ] wf-srv-9 Implement storeArtifact.ts
  - Generate storage path relative to project.path
  - Copy file to .agent/workflows/executions/{id}/artifacts/{step_id}/
  - Create WorkflowArtifact record
  - Broadcast WebSocket event
  - File: `apps/web/src/server/domain/workflow/services/storeArtifact.ts`
- [ ] wf-srv-10 Implement addComment.ts
  - Create WorkflowComment record
  - Associate with execution or step
  - Broadcast WebSocket event
  - File: `apps/web/src/server/domain/workflow/services/addComment.ts`
- [ ] wf-srv-11 Implement createAgentSession.ts
  - Create AgentSession record with workflow_step_id and name
  - Store session_file_path
  - Link to workflow step
  - File: `apps/web/src/server/domain/workflow/services/createAgentSession.ts`
- [ ] wf-srv-12 Create Zod schemas for validation
  - workflowDefinition.ts: Validation schemas for workflow definitions
  - workflowExecution.ts: Validation schemas for executions and input/output
  - File: `apps/web/src/server/domain/workflow/schemas/`

#### Completion Notes

(To be filled in during implementation)

### Task Group 5: REST API Endpoints

<!-- prettier-ignore -->
- [ ] wf-api-1 Create workflows.ts route file
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-2 Implement GET /api/workflows endpoint
  - List all workflow definitions
  - Filter by is_active
  - Use Zod schema for response
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-3 Implement GET /api/workflows/:id endpoint
  - Get single workflow definition
  - Return 404 if not found
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-4 Implement POST /api/workflows/:id/execute endpoint
  - Validate request body (input, projectId)
  - Call executeWorkflow service
  - Return execution ID and status
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-5 Implement GET /api/executions endpoint
  - Call listExecutions service
  - Support query params: status, workflowId, projectId, page, limit
  - Return paginated results with current_step
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-6 Implement GET /api/executions/:id endpoint
  - Call getExecution service
  - Include all relations (steps, comments, artifacts, current_step)
  - Return 404 if not found
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-7 Implement POST /api/executions/:id/cancel endpoint
  - Call cancelExecution service
  - Return updated execution status
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-8 Implement GET /api/executions/:id/logs endpoint
  - Read log file from log_file_path
  - Support filtering by stepId, level
  - Return log entries
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-9 Implement GET /api/executions/:id/logs/download endpoint
  - Stream log file for download
  - Set Content-Disposition header
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-10 Implement GET /api/executions/:id/artifacts endpoint
  - List all artifacts for execution
  - Support filtering by stepId, type
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-11 Implement GET /api/artifacts/:id/download endpoint
  - Stream artifact file for download
  - Set appropriate Content-Type and Content-Disposition headers
  - File: `apps/web/src/server/routes/workflows.ts`
- [ ] wf-api-12 Register workflow routes in route index
  - Import workflows.ts
  - Register with /api prefix
  - File: `apps/web/src/server/routes/index.ts`

#### Completion Notes

(To be filled in during implementation)

### Task Group 6: WebSocket Integration

<!-- prettier-ignore -->
- [ ] wf-ws-1 Create workflowHandler.ts WebSocket handler
  - File: `apps/web/src/server/websocket/handlers/workflowHandler.ts`
- [ ] wf-ws-2 Implement workflow:subscribe event handler
  - Store subscription: executionId → connectionId mapping
  - File: `apps/web/src/server/websocket/handlers/workflowHandler.ts`
- [ ] wf-ws-3 Implement workflow:unsubscribe event handler
  - Remove subscription from mapping
  - File: `apps/web/src/server/websocket/handlers/workflowHandler.ts`
- [ ] wf-ws-4 Implement workflow:cancel event handler
  - Call cancelExecution service
  - Broadcast cancellation event
  - File: `apps/web/src/server/websocket/handlers/workflowHandler.ts`
- [ ] wf-ws-5 Create broadcast functions for workflow events
  - workflow:execution:started
  - workflow:step:updated (includes current_workflow_step_id change)
  - workflow:comment:added
  - workflow:agent:updated
  - workflow:artifact:created
  - workflow:execution:completed
  - File: `apps/web/src/server/websocket/handlers/workflowHandler.ts`
- [ ] wf-ws-6 Integrate broadcast calls into domain services
  - executeWorkflow: broadcast execution:started, step:updated, execution:completed
  - addComment: broadcast comment:added
  - createAgentSession: broadcast agent:updated
  - storeArtifact: broadcast artifact:created
  - Files: Various domain service files
- [ ] wf-ws-7 Register workflow handler in WebSocket handler index
  - Import workflowHandler
  - Register event handlers
  - File: `apps/web/src/server/websocket/handlers/index.ts`

#### Completion Notes

(To be filled in during implementation)

### Task Group 7: Example Workflow

<!-- prettier-ignore -->
- [ ] wf-ex-1 Create .agent/workflows/templates directory
  - Command: `mkdir -p .agent/workflows/templates`
- [ ] wf-ex-2 Create simple-sdlc.ts example workflow
  - Demonstrates: ctx.run(), ctx.runCli(), ctx.git.*, ctx.comment(), ctx.set/get()
  - Steps: load-spec, setup-branch, generate-plan, implement, run-tests, create-pr
  - Uses Claude for planning, Codex for implementation
  - Attaches artifacts (test results)
  - Creates PR with summary
  - File: `.agent/workflows/templates/simple-sdlc.ts`
- [ ] wf-ex-3 Add workflow auto-discovery to server startup
  - Call discoverWorkflows() on app initialization
  - Register discovered workflows via registerWorkflow()
  - Log discovered workflow count
  - File: `apps/web/src/server/index.ts`

#### Completion Notes

(To be filled in during implementation)

### Task Group 8: Testing

<!-- prettier-ignore -->
- [ ] wf-test-1 Create unit tests for workflow SDK
  - Test createWorkflow() with various configs
  - Test WorkflowContext.run() step creation
  - Test state management (set/get/has/delete)
  - Test git operations (mock simple-git)
  - Test file operations
  - File: `packages/workflow-sdk/tests/workflow.test.ts`
- [ ] wf-test-2 Create integration tests for workflow run
  - Test full workflow run end-to-end
  - Verify database records created correctly
  - Verify step tracking and current_workflow_step_id updates
  - Verify state persistence
  - File: `packages/workflow-sdk/tests/executor.test.ts`
- [ ] wf-test-3 Create tests for domain services
  - Test discoverWorkflows with sample workflow files
  - Test executeWorkflow with mock workflow
  - Test getExecution, listExecutions with filtering
  - Test cancelExecution
  - File: `apps/web/src/server/domain/workflow/services/__tests__/`
- [ ] wf-test-4 Create API endpoint tests
  - Test GET /api/workflows
  - Test POST /api/workflows/:id/execute
  - Test GET /api/executions/:id with current_step
  - Test artifact download endpoints
  - File: `apps/web/src/server/routes/__tests__/workflows.test.ts`
- [ ] wf-test-5 Create WebSocket handler tests
  - Test subscription/unsubscription
  - Test event broadcasting
  - Test workflow cancellation via WebSocket
  - File: `apps/web/src/server/websocket/handlers/__tests__/workflowHandler.test.ts`

#### Completion Notes

(To be filled in during implementation)

### Task Group 9: Documentation

<!-- prettier-ignore -->
- [ ] wf-doc-1 Update CLAUDE.md with snake_case convention
  - Document database naming: tables and columns use snake_case
  - Document file path convention: relative to project.path
  - Document workflow system overview
  - File: `CLAUDE.md`
- [ ] wf-doc-2 Create workflow-sdk/CLAUDE.md
  - Document SDK API (createWorkflow, WorkflowContext)
  - Document workflow definition patterns
  - Document state management strategy
  - Provide examples
  - File: `packages/workflow-sdk/CLAUDE.md`
- [ ] wf-doc-3 Update apps/web/CLAUDE.md
  - Document workflow domain services
  - Document WebSocket events
  - Document REST API endpoints
  - Document file storage structure
  - File: `apps/web/CLAUDE.md`

#### Completion Notes

(To be filled in during implementation)

## Testing Strategy

### Unit Tests

**`packages/workflow-sdk/tests/workflow.test.ts`** - Workflow SDK core functionality:
```typescript
describe('createWorkflow', () => {
  it('should create workflow definition with config');
  it('should validate required config fields');
  it('should apply default timeout');
});

describe('WorkflowContext', () => {
  it('should track step execution');
  it('should manage state with set/get');
  it('should execute CLI adapters');
  it('should perform git operations');
});
```

**`apps/web/src/server/domain/workflow/services/__tests__/*.test.ts`** - Domain services:
```typescript
describe('discoverWorkflows', () => {
  it('should find workflow files in templates directory');
  it('should extract workflow definitions');
});

describe('executeWorkflow', () => {
  it('should create execution record');
  it('should update current_workflow_step_id as steps progress');
  it('should store final output');
  it('should flush state to database');
});
```

### Integration Tests

**`packages/workflow-sdk/tests/executor.test.ts`** - End-to-end workflow run:
- Create test workflow with multiple steps
- Verify database records (execution, steps, comments, artifacts)
- Verify state persistence
- Verify agent session creation with names
- Verify current_workflow_step_id tracking

### API Tests

**`apps/web/src/server/routes/__tests__/workflows.test.ts`** - REST endpoints:
- Test all CRUD operations
- Test execution start/cancel
- Test filtering and pagination
- Test artifact downloads
- Verify response schemas

### WebSocket Tests

**`apps/web/src/server/websocket/handlers/__tests__/workflowHandler.test.ts`** - Real-time updates:
- Test subscription management
- Test event broadcasting
- Verify clients receive step updates with current_step info

## Success Criteria

- [ ] Database migration applies cleanly with 4 new tables
- [ ] Workflow SDK package builds and exports all required types
- [ ] Example workflow executes successfully from start to finish
- [ ] All workflow steps tracked in database with correct step_numbers
- [ ] Agent sessions linked to steps with descriptive names
- [ ] Comments appear in database and are associated with correct steps
- [ ] Artifacts stored in correct filesystem locations relative to project.path
- [ ] State persists across step executions
- [ ] current_workflow_step_id updates as workflow progresses
- [ ] REST API endpoints return correct data with proper schemas
- [ ] WebSocket events broadcast in real-time during execution
- [ ] File paths resolve correctly relative to project.path
- [ ] Cascade delete behaviors work as specified
- [ ] All unit tests pass (>80% coverage)
- [ ] Integration tests pass with real database
- [ ] TypeScript compilation succeeds with no errors
- [ ] ESLint passes with no violations

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd packages/workflow-sdk && pnpm build
# Expected: Build succeeds, dist/ directory created

# Type checking (SDK)
cd packages/workflow-sdk && pnpm tsc --noEmit
# Expected: No type errors

# Type checking (Web)
cd apps/web && pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests (SDK)
cd packages/workflow-sdk && pnpm test
# Expected: All tests pass

# Unit tests (Web domain)
cd apps/web && pnpm test -- workflow
# Expected: All workflow-related tests pass

# Database migration
cd apps/web && pnpm prisma:migrate
# Expected: Migration applies successfully

# Prisma client generation
cd apps/web && pnpm prisma:generate
# Expected: Client generated with new models
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Verify auto-discovery: Check logs for "Discovered X workflows"
3. Create execution via API:
   ```bash
   curl -X POST http://localhost:3456/api/workflows/{id}/execute \
     -H "Content-Type: application/json" \
     -d '{"projectId": "...", "input": {"featureName": "test", "specPath": "..."}}'
   ```
4. Verify WebSocket events: Connect WebSocket client and subscribe to execution
5. Check database: Verify WorkflowRun, WorkflowStep, WorkflowComment records created
6. Check filesystem: Verify logs and artifacts in `.agent/workflows/executions/{id}/`
7. Verify step progression: Check current_workflow_step_id updates in database
8. Check agent sessions: Verify workflow_step_id and name populated correctly

**Feature-Specific Checks:**

- Verify workflow templates discovered from `.agent/workflows/templates/`
- Verify execution status transitions: PENDING → RUNNING → COMPLETED
- Verify step numbers increment correctly (including retries/iterations)
- Verify duplicate step names allowed (review, implement, review pattern)
- Verify state persists: ctx.set() in step 1, ctx.get() in step 3 returns same value
- Verify file paths: All paths relative to project.path, resolve correctly
- Verify cascade deletes: Delete project, verify executions deleted
- Verify restrict: Cannot delete workflow definition with executions
- Verify current_step nulled: If step deleted, current_workflow_step_id becomes null

## Implementation Notes

### 1. Execution Model Simplification

For MVP, workflows execute in the Fastify server process. This keeps implementation simple but has limitations:
- Long-running workflows block server thread (consider worker processes later)
- No execution recovery on server restart (mark as FAILED on startup)
- Single-machine only (no distributed execution)

Future: Consider worker queue (Bull, BullMQ) for production deployments.

### 2. State Management Strategy

State uses in-memory cache during execution, flushed to database on completion:
- Fast reads during workflow run (no DB queries)
- Durable storage after completion
- Lost if server crashes mid-execution (acceptable for MVP)

Future: Periodic state flushes to DB during long-running workflows.

### 3. File Path Resolution

All paths stored relative to `project.path`. Helper function for resolution:
```typescript
function getFullPath(project: Project, relativePath: string): string {
  return path.join(project.path, relativePath);
}
```

### 4. Agent Session Naming

The `name` field on AgentSession comes from the first parameter of `ctx.runCli()`:
```typescript
await ctx.runCli('research', claude, prompt); // name = "research"
await ctx.runCli('implement', codex, prompt); // name = "implement"
```

### 5. Iterative Workflow Pattern

Allow steps with same name to run multiple times:
```typescript
Step 1: review
Step 2: implement
Step 3: review  // Same name, different step_number
Step 4: implement
```

No unique constraint on `[execution_id, name]`.

## Dependencies

- `@repo/agent-cli-sdk` (workspace:*) - CLI agent execution
- `simple-git` (^3.x) - Git operations
- `zod` (^3.x) - Schema validation
- `glob` (^10.x) - File discovery
- No new system dependencies required

## Timeline

| Task                        | Estimated Time |
| --------------------------- | -------------- |
| Database schema             | 30 minutes     |
| Workflow SDK package setup  | 30 minutes     |
| Workflow SDK implementation | 2 hours        |
| Server domain services      | 2 hours        |
| REST API endpoints          | 1 hour         |
| WebSocket integration       | 1 hour         |
| Example workflow            | 30 minutes     |
| Testing                     | 1.5 hours      |
| Documentation               | 30 minutes     |
| **Total**                   | **8-10 hours** |

## References

- Temporal.io workflows: https://docs.temporal.io/workflows
- Inngest TypeScript SDK: https://www.inngest.com/docs/reference/typescript
- Restate durable execution: https://docs.restate.dev/
- Existing codebase patterns: `apps/web/src/server/domain/` for domain service structure

## Next Steps

1. Create database migration for 4 new tables
2. Set up workflow-sdk package structure
3. Implement WorkflowContext with core features (run, runCli, state, git)
4. Build server domain services for discovery and execution
5. Create REST API endpoints
6. Integrate WebSocket broadcasting
7. Create example simple-sdlc workflow
8. Write comprehensive tests
9. Document conventions in CLAUDE.md
