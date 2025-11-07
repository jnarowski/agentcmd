# Workflow Engine Implementation (Inngest + Phase-Based)

**Status**: draft
**Created**: 2025-01-25
**Package**: apps/web, packages/workflow-sdk
**Estimated Effort**: 40-60 hours

## Overview

Implement a production-ready workflow orchestration engine using Inngest as the underlying execution runtime, with custom phase-based workflows, dynamic step creation, automatic retry logic, and a published SDK for type-safe workflow definitions in external projects. This replaces MockWorkflowOrchestrator with real execution capabilities including agent integration, git operations, CLI commands, file uploads, and real-time WebSocket updates.

## User Story

As a developer
I want to define multi-phase workflows (plan, implement, review, test) in my project using TypeScript
So that I can automate complex agent-driven development tasks with full type safety, automatic retries, and real-time progress tracking

## Technical Approach

**Architecture**: Self-hosted Inngest running in-process within the web app, with dynamic workflow loading from user projects' `.workflows/` directories. Published SDK (`@repo/workflow-sdk`) provides TypeScript interfaces that are hydrated with real implementations at runtime by the web app.

**Key Patterns**:

1. **Runtime Injection**: SDK defines type-safe interfaces, web app provides implementations
2. **Phase-based Execution**: Workflows organized into phases with automatic retry logic
3. **Dynamic Step Creation**: Steps created on-demand during execution (not pre-created)
4. **Startup Scanning**: All projects scanned for workflows on server startup
5. **Database-backed**: WorkflowDefinition records stored, workflows loaded from filesystem paths

## Key Design Decisions

1. **In-process Inngest**: Runs inside web app process for direct access to domain services, database, and WebSocket infrastructure. Can be separated later if needed for scaling.

2. **Published SDK Package**: External projects install `@repo/workflow-sdk` from npm. SDK contains only TypeScript types and builder functions - no runtime logic or Inngest dependency.

3. **Dynamic Loading**: Workflows discovered from user projects' `.workflows/` directories (like slash commands pattern). Loaded on startup and re-scannable via API.

4. **Phase Retry Logic**: Each phase can retry automatically on failure (default: 3 attempts). Configurable per phase with `{ retries: N, retryDelay: ms }`.

5. **Dynamic Step Creation**: WorkflowRunStep records created on-demand as workflow executes. Flexible for conditional logic and dynamic workflows.

6. **Database Storage**: WorkflowDefinition records created during scan. Stored metadata used for UI listing, but workflow code loaded fresh from filesystem on execution.

## Configuration Decisions

**Memoization & Persistence:**

- SQLite memoization store at `apps/web/prisma/workflows.db` (durable, survives restarts)
- No TTL/cleanup for MVP (infinite cache persistence)
- Memoization restore failure = fail entire workflow (prevent inconsistent state)

**Timeout Configuration:**

- Step-level timeouts via 3rd parameter: `step.agent(name, config, { timeout: ms })`
- Default timeouts: agent 30min, cli 5min, git 2min
- Timeout behavior: Graceful shutdown (SIGTERM → 30s wait → SIGKILL)
- Timeout fails step only (phase retry logic handles recovery)

**Execution Model:**

- Parallel execution allowed (separate memoization per executionId)
- Inngest Dev Server required for local development
- Inngest automatically resumes from last successful step on retry (never re-runs completed steps)

**Authentication:**

- Inngest endpoint (`/api/workflows/inngest`) bypasses JWT auth
- Uses Inngest signing key validation instead

**Development Workflow:**

- Single command via `concurrently` runs Inngest Dev Server + web app
- Inngest Dev Server UI available at http://localhost:8288

**Known Limitations (MVP):**

- Don't modify workflow code during active execution (memoization may use stale code)
- No cache cleanup (infinite persistence)
- Project deletion during execution not handled gracefully

## Architecture

### File Structure

```
packages/workflow-sdk/                    # NEW: Published SDK
├── src/
│   ├── types/
│   │   ├── workflow.ts
│   │   ├── steps.ts
│   │   ├── phases.ts
│   │   └── index.ts
│   ├── builder/
│   │   ├── defineWorkflow.ts
│   │   └── index.ts
│   ├── runtime/
│   │   ├── adapter.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json

apps/web/src/server/workflows/            # NEW: Workflow infrastructure
├── engine/
│   ├── client.ts                         # Inngest client initialization
│   ├── runtime.ts                        # Runtime adapter (implements SDK interfaces)
│   ├── loader.ts                         # Dynamic workflow loading
│   ├── scanner.ts                        # Startup project scanning
│   ├── registry.ts                       # Workflow registration
│   └── steps/                            # Step implementations
│       ├── phase.ts                      # step.phase() with retry logic
│       ├── agent.ts                      # step.agent() - calls executeAgent()
│       ├── slash.ts                      # step.slash() - slash command execution
│       ├── git.ts                        # step.git() - git operations
│       ├── cli.ts                        # step.cli() - shell commands
│       ├── artifact.ts                   # step.artifact() - file uploads
│       ├── annotation.ts                 # step.annotation() - progress notes
│       ├── helpers.ts                    # Shared utilities
│       └── index.ts
└── types.ts

apps/web/src/server/routes/
└── workflows.ts                          # NEW: Workflow routes (refresh, list)

User's External Project:
my-project/
├── .workflows/                           # User-created workflows
│   ├── implement-feature.ts
│   └── fix-bug.ts
└── package.json
    └── dependencies:
        @repo/workflow-sdk: "^1.0.0"
```

### Integration Points

**Domain Services** (existing, used by workflow steps):

- `apps/web/src/server/domain/session/services/executeAgent.ts` - Agent execution
- `apps/web/src/server/domain/git/services/createCommit.ts` - Git operations
- `apps/web/src/server/domain/git/services/createBranch.ts` - Branch creation
- `apps/web/src/server/domain/git/services/createPullRequest.ts` - PR creation

**WebSocket Infrastructure** (existing, used for real-time updates):

- `apps/web/src/server/websocket/infrastructure/subscriptions.ts` - Event broadcasting
- `apps/web/src/shared/websocket/channels.ts` - Channel management

**Database Models** (existing, already support phases):

- `WorkflowDefinition` - Stores discovered workflows (type, path, phases)
- `WorkflowRun` - Runtime instances (current_phase tracking)
- `WorkflowRunStep` - Individual steps (phase-tagged, dynamically created)
- `WorkflowEvent` - Audit trail (phase_started, phase_completed, step events)
- `WorkflowArtifact` - File uploads

**Server Startup**:

- `apps/web/src/server/index.ts` - Integrate workflow engine initialization and scanning

## Implementation Details

### 1. Published SDK Package (`@repo/workflow-sdk`)

Lightweight npm package containing only TypeScript types and builder functions. No runtime dependencies (Inngest is peer dependency).

**Key Exports**:

- `defineWorkflow()` - Type-safe workflow builder
- `WorkflowStep` interface - All step method signatures
- Type definitions for configs/results (AgentStepConfig, GitStepResult, etc.)
- `WorkflowRuntime` interface - Implemented by web app

**Design**:

- SDK provides type signatures only
- User writes type-safe code against interfaces
- Web app provides runtime implementations when executing
- Pattern similar to tRPC or React Server Components

### 2. Phase Step with Automatic Retry

`step.phase(name, fn, options)` executes a workflow phase with configurable retry logic.

**Features**:

- Automatic retry on failure (default: 3 attempts, configurable)
- Delay between retries (default: 5000ms, configurable)
- Updates `WorkflowRun.current_phase`
- Creates `phase_started`, `phase_completed`, `phase_failed` events
- Broadcasts WebSocket events: `workflow:phase:started`, `workflow:phase:retry`, `workflow:phase:completed`
- All nested steps tagged with phase name

**Retry Behavior**:

```typescript
// Phase fails → wait 5s → retry
// Retry 1 fails → wait 5s → retry
// Retry 2 fails → wait 5s → retry
// Retry 3 fails → phase fails → workflow halts
```

### 3. Custom Step Methods

All step methods follow same pattern:

1. Find or create WorkflowRunStep (dynamically, tagged with current phase)
2. Update step status to 'running'
3. Create step_started event + broadcast WebSocket
4. Execute actual operation (delegate to domain service)
5. Update step status to 'completed' or 'failed'
6. Create completion event + broadcast WebSocket
7. Handle errors with cleanup

**Available Methods**:

- `step.agent(name, config)` - Execute AI agent (claude, codex, gemini)
- `step.slash(command, args)` - Execute slash command (wrapper around agent)
- `step.git(name, config)` - Git operations (commit, branch, pr)
- `step.cli(name, command, options)` - Shell command execution
- `step.artifact(name, config)` - Upload files/directories/screenshots
- `step.annotation(message)` - Add progress note to timeline

### 4. Startup Workflow Scanning

On server startup, scan all projects for `.workflows/` directories and create/update WorkflowDefinition records.

**Scan Process**:

1. Load all projects from database
2. For each project, check for `.workflows/` directory
3. Find all `.ts`/`.js` files in directory (recursive)
4. Dynamic import each file
5. Extract workflow definition (supports multiple export patterns)
6. Create or update WorkflowDefinition record with metadata
7. Store filesystem path for later loading

**Database Record**:

```typescript
WorkflowDefinition {
  name: 'implement-feature'
  type: 'code'
  path: '/Users/john/my-project/.workflows/implement-feature.ts'
  phases: ['implement', 'review', 'test']
  description: '...'
}
```

### 5. Dynamic Workflow Loading at Runtime

When workflow is triggered, load from stored filesystem path:

1. Get WorkflowDefinition from database
2. Dynamic import from `definition.path`
3. Create runtime context with executionId, projectId, userId
4. Call workflow factory to create Inngest function
5. Execute workflow

**Runtime Context**:

```typescript
{
  executionId: 'exec-123',
  projectId: 'proj-456',
  userId: 'user-789',
  currentPhase: 'implement',  // Tracked for nested steps
  logger: FastifyBaseLogger
}
```

### 6. Dynamic Step Creation

Steps are NOT pre-created. Created on-demand as workflow executes.

**Behavior**:

```typescript
// User calls: step.agent('analyze', {...})
// Implementation:
const step = await findOrCreateStep(executionId, "analyze", currentPhase);
// If not exists → create WorkflowRunStep
// If exists → use existing record
```

**Benefits**:

- Supports conditional logic (`if (x) { step.agent('fix', ...) }`)
- No need to predict all steps upfront
- Flexible for dynamic workflows

## Files to Create/Modify

### New Files (26)

1. `packages/workflow-sdk/src/types/workflow.ts` - Workflow config interfaces
2. `packages/workflow-sdk/src/types/steps.ts` - Step method signatures
3. `packages/workflow-sdk/src/types/phases.ts` - Phase interfaces
4. `packages/workflow-sdk/src/types/index.ts` - Type exports
5. `packages/workflow-sdk/src/builder/defineWorkflow.ts` - Workflow builder
6. `packages/workflow-sdk/src/builder/index.ts` - Builder exports
7. `packages/workflow-sdk/src/runtime/adapter.ts` - Runtime interface
8. `packages/workflow-sdk/src/runtime/index.ts` - Runtime exports
9. `packages/workflow-sdk/src/index.ts` - Public API
10. `packages/workflow-sdk/package.json` - Package config
11. `packages/workflow-sdk/tsconfig.json` - TypeScript config
12. `packages/workflow-sdk/README.md` - SDK documentation
13. `apps/web/src/server/workflows/engine/client.ts` - Inngest client
14. `apps/web/src/server/workflows/engine/runtime.ts` - Runtime adapter implementation
15. `apps/web/src/server/workflows/engine/loader.ts` - Dynamic workflow loading
16. `apps/web/src/server/workflows/engine/scanner.ts` - Startup scanning
17. `apps/web/src/server/workflows/engine/registry.ts` - Workflow registration
18. `apps/web/src/server/workflows/engine/steps/phase.ts` - Phase step with retry
19. `apps/web/src/server/workflows/engine/steps/agent.ts` - Agent step
20. `apps/web/src/server/workflows/engine/steps/slash.ts` - Slash command step
21. `apps/web/src/server/workflows/engine/steps/git.ts` - Git step
22. `apps/web/src/server/workflows/engine/steps/cli.ts` - CLI step
23. `apps/web/src/server/workflows/engine/steps/artifact.ts` - Artifact upload step
24. `apps/web/src/server/workflows/engine/steps/annotation.ts` - Annotation step
25. `apps/web/src/server/workflows/engine/steps/helpers.ts` - Shared utilities
26. `apps/web/src/server/workflows/engine/steps/index.ts` - Step exports

### Modified Files (5)

1. `apps/web/src/server/index.ts` - Add workflow engine initialization and scanning
2. `apps/web/src/server/routes/workflows.ts` - Add refresh endpoint, list workflows API
3. `apps/web/src/server/domain/workflow/services/executeWorkflow.ts` - Replace MockWorkflowOrchestrator with Inngest trigger
4. `apps/web/package.json` - Add inngest dependency
5. `turbo.json` - Add workflow-sdk to pipeline

### Files to Delete (1)

1. `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts` - Replaced by Inngest

## Step by Step Tasks

### Task Group 1: Setup SDK Package

<!-- prettier-ignore -->
- [x] sdk-001 Create SDK package directory structure
  - Create `packages/workflow-sdk/` with src, types, builder, runtime subdirectories
  - Command: `mkdir -p packages/workflow-sdk/src/{types,builder,runtime}`
- [x] sdk-002 Create package.json for SDK
  - File: `packages/workflow-sdk/package.json`
  - Set name to `@repo/workflow-sdk`, version `1.0.0`
  - Add inngest as peerDependency `^3.x.x`
  - Add bunchee as devDependency for building
- [x] sdk-003 Create tsconfig.json for SDK
  - File: `packages/workflow-sdk/tsconfig.json`
  - Extend from `@repo/typescript-config/base.json`
  - Set `moduleResolution: "bundler"`, `module: "ESNext"`
- [x] sdk-004 Define WorkflowStep interface with all step methods
  - File: `packages/workflow-sdk/src/types/steps.ts`
  - Include phase(), agent(), slash(), git(), cli(), artifact(), annotation()
  - Include native Inngest methods: run(), sleep(), waitForEvent()
  - Define all config/result types (AgentStepConfig, GitStepConfig, etc.)
  - Add StepOptions interface: `{ timeout?: number }`
  - All step methods accept optional 3rd parameter: `options?: StepOptions`
- [x] sdk-005 Define WorkflowConfig interface and types
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - WorkflowConfig: id, trigger, name, description, phases[], timeout
  - WorkflowContext: event, step
  - PhaseOptions: retries, retryDelay
- [x] sdk-006 Implement defineWorkflow() builder
  - File: `packages/workflow-sdk/src/builder/defineWorkflow.ts`
  - Return factory function with __type marker
  - Include createInngestFunction() method that accepts runtime
- [x] sdk-007 Define WorkflowRuntime interface
  - File: `packages/workflow-sdk/src/runtime/adapter.ts`
  - createWorkflowStep(context): WorkflowStep
- [x] sdk-008 Create public API exports
  - File: `packages/workflow-sdk/src/index.ts`
  - Export all types, defineWorkflow, WorkflowRuntime
  - Export version constant
- [x] sdk-009 Add SDK to workspace
  - File: `turbo.json`
  - Add workflow-sdk to pipeline with build task

#### Completion Notes

- Created complete SDK package structure with types, builder, and runtime adapter interface
- All WorkflowStep methods defined with proper TypeScript interfaces including timeout support
- defineWorkflow() builder returns factory with \_\_type marker for runtime detection
- WorkflowRuntime interface designed for dependency injection pattern
- SDK has zero runtime dependencies (Inngest as peer dependency only)
- Ready for building and local testing

### Task Group 2: Web App Workflow Infrastructure

<!-- prettier-ignore -->
- [x] infra-001 Create workflow engine directory structure
  - Create `apps/web/src/server/workflows/engine/steps/`
  - Command: `mkdir -p apps/web/src/server/workflows/engine/steps`
- [x] infra-002 Implement Inngest client initialization
  - File: `apps/web/src/server/workflows/engine/client.ts`
  - createWorkflowClient() function
  - Configure with appId, eventKey (from env), isDev
  - Configure SQLite memoization store at `./prisma/workflows.db`
  - Enable signing key validation for webhook auth
- [x] infra-003 Create runtime context type
  - File: `apps/web/src/server/workflows/types.ts`
  - RuntimeContext interface: executionId, projectId, userId, currentPhase, logger
- [x] infra-004 Implement step helper: findOrCreateStep()
  - File: `apps/web/src/server/workflows/engine/steps/helpers.ts`
  - Dynamic step creation with phase tagging
  - Find existing or create new WorkflowRunStep
- [x] infra-005 Implement step helper: updateStepStatus()
  - File: `apps/web/src/server/workflows/engine/steps/helpers.ts`
  - Update WorkflowRunStep status
  - Create WorkflowEvent
  - Broadcast WebSocket event
- [x] infra-006 Implement step helper: handleStepFailure()
  - File: `apps/web/src/server/workflows/engine/steps/helpers.ts`
  - Update step to failed
  - Broadcast failure event
  - Cleanup resources
- [x] infra-007 Implement phase step with retry logic
  - File: `apps/web/src/server/workflows/engine/steps/phase.ts`
  - createPhaseStep() factory function
  - Update WorkflowRun.current_phase
  - Retry loop with configurable attempts and delay
  - Create phase_started, phase_completed, phase_failed events
  - Broadcast workflow:phase:started, workflow:phase:retry, workflow:phase:completed
- [x] infra-008 Implement agent step
  - File: `apps/web/src/server/workflows/engine/steps/agent.ts`
  - createAgentStep() factory
  - Accept optional 3rd parameter: `options?: { timeout?: number }`
  - Default timeout: 1800000ms (30 minutes)
  - Timeout handling: Graceful shutdown (SIGTERM → 30s wait → SIGKILL)
  - Create AgentSession, link to WorkflowRunStep
  - Call executeAgent() service with WebSocket streaming
  - Handle errors with cleanup (terminate agent, mark failed)
- [x] infra-009 Implement slash command step
  - File: `apps/web/src/server/workflows/engine/steps/slash.ts`
  - createSlashStep() factory
  - Wrapper around agent step that formats slash command
  - Format: `${command} ${args.join(' ')}`
- [x] infra-010 Implement git step
  - File: `apps/web/src/server/workflows/engine/steps/git.ts`
  - createGitStep() factory
  - Accept optional 3rd parameter: `options?: { timeout?: number }`
  - Default timeout: 120000ms (2 minutes)
  - Timeout handling: Graceful shutdown (SIGTERM → 30s wait → SIGKILL)
  - Support operations: commit, branch, pr
  - Delegate to domain services (createCommit, createBranch, createPullRequest)
  - Create WorkflowArtifact for git operations
- [x] infra-011 Implement CLI step
  - File: `apps/web/src/server/workflows/engine/steps/cli.ts`
  - createCliStep() factory
  - Accept optional 3rd parameter: `options?: { timeout?: number }`
  - Default timeout: 300000ms (5 minutes)
  - Timeout handling: Graceful shutdown (SIGTERM → 30s wait → SIGKILL)
  - Use promisify(exec) or execAsync
  - Support cwd, env options
  - Capture stdout, stderr, exitCode
- [x] infra-012 Implement artifact upload step
  - File: `apps/web/src/server/workflows/engine/steps/artifact.ts`
  - createArtifactStep() factory
  - Support content (text), file (single), directory (multiple)
  - Create WorkflowArtifact records
  - Broadcast workflow:artifact:uploaded
- [x] infra-013 Implement annotation step
  - File: `apps/web/src/server/workflows/engine/steps/annotation.ts`
  - createAnnotationStep() factory
  - Create WorkflowEvent with type annotation_added
  - Broadcast workflow:annotation:created
- [x] infra-014 Create step exports index
  - File: `apps/web/src/server/workflows/engine/steps/index.ts`
  - Export all step factory functions
- [x] infra-015 Implement runtime adapter
  - File: `apps/web/src/server/workflows/engine/runtime.ts`
  - createWorkflowRuntime() function
  - Returns WorkflowRuntime implementation
  - createWorkflowStep() injects all step methods
  - Binds native Inngest methods, injects custom step factories

#### Completion Notes

- All workflow engine infrastructure files created and implemented
- Inngest client configured with SQLite memoization at ./prisma/workflows.db
- Step helper functions implemented with phase tagging and WebSocket broadcasting
- Phase step implements configurable retry logic with event broadcasting
- All custom step types implemented: agent, slash, git, cli, artifact, annotation
- Runtime adapter created to inject step implementations into SDK interfaces
- All step methods support optional timeout configuration (3rd parameter)
- Error handling and cleanup implemented across all step types

### Task Group 3: Workflow Discovery & Loading

<!-- prettier-ignore -->
- [x] load-001 Implement workflow file finder
  - File: `apps/web/src/server/workflows/engine/loader.ts`
  - findWorkflowFiles(dir): Promise<string[]>
  - Recursive directory traversal for .ts/.js files
- [x] load-002 Implement workflow module extraction
  - File: `apps/web/src/server/workflows/engine/loader.ts`
  - Support export patterns: default, workflow, createWorkflow
  - Check for __type: 'workflow' marker
- [x] load-003 Implement loadProjectWorkflows()
  - File: `apps/web/src/server/workflows/engine/loader.ts`
  - Check for .workflows/ directory
  - Find all workflow files
  - Dynamic import with pathToFileURL()
  - Extract workflow definitions
  - Call createInngestFunction() with runtime
  - Return array of Inngest functions
- [x] load-004 Implement scanProjectWorkflows()
  - File: `apps/web/src/server/workflows/engine/scanner.ts`
  - Load workflows from project path
  - Create/update WorkflowDefinition records in database
  - Use upsert with unique constraint on (project_id, name)
  - Store: name, description, type, path, phases
- [x] load-005 Implement scanAllProjectWorkflows()
  - File: `apps/web/src/server/workflows/engine/scanner.ts`
  - Load all projects from database
  - Scan each project sequentially
  - Collect results: scanned, discovered, errors
  - Return ScanResult
- [x] load-006 Implement workflow registry initialization
  - File: `apps/web/src/server/workflows/engine/registry.ts`
  - initializeWorkflowEngine(fastify)
  - Create Inngest client
  - Load all WorkflowDefinition records from database
  - Dynamic import from stored paths
  - Create runtime contexts
  - Call createInngestFunction() for each
  - Register Inngest endpoint at /api/workflows/inngest
  - Configure endpoint to bypass JWT auth (use Inngest signing key validation)
  - Decorate fastify with workflowClient

#### Completion Notes

- Workflow file finder implemented with recursive directory traversal
- Dynamic workflow loading from filesystem with pathToFileURL()
- Multiple export patterns supported (default, workflow, createWorkflow)
- Project scanning implemented with WorkflowDefinition upsert
- Registry initialization creates Inngest client and registers endpoint
- Fastify decorated with workflowClient for triggering workflows
- Scan results tracked (projects scanned, workflows discovered, errors)

### Task Group 4: API Endpoints & Routes

<!-- prettier-ignore -->
- [x] api-001 Create workflow refresh endpoint
  - File: `apps/web/src/server/routes/workflows.ts`
  - POST /api/projects/:projectId/workflows/refresh
  - Re-scan project for workflows
  - Call scanProjectWorkflows()
  - Return discovered workflows count
- [x] api-002 Create list workflows endpoint
  - File: `apps/web/src/server/routes/workflows.ts`
  - GET /api/projects/:projectId/workflows
  - Query WorkflowDefinition by project_id
  - Return workflow metadata (id, name, description, phases)
- [x] api-003 Create get workflow definition endpoint
  - File: `apps/web/src/server/routes/workflows.ts`
  - GET /api/workflow-definitions/:definitionId
  - Return full WorkflowDefinition record
- [x] api-004 Register workflow routes
  - File: `apps/web/src/server/routes/index.ts`
  - Import and register workflow routes

#### Completion Notes

- Added POST /api/projects/:projectId/workflows/refresh endpoint for project re-scanning
- Added GET /api/projects/:projectId/workflows endpoint to list workflows by project
- GET /api/workflow-definitions/:definitionId already existed in workflow-definitions.ts
- Workflow routes already registered in routes/index.ts
- All endpoints implement authentication and authorization (verify project ownership)
- Endpoints use scanProjectWorkflows() and prisma queries for data access

### Task Group 5: Server Integration

<!-- prettier-ignore -->
- [x] server-001 Add Inngest dependency and concurrently
  - File: `apps/web/package.json`
  - Add inngest: `^3.x.x`
  - Add concurrently: `^9.1.0` (devDependency)
  - Add script: `"inngest": "npx inngest-cli@latest dev -u http://localhost:3456/api/workflows/inngest"`
  - Update script: `"dev": "concurrently \"pnpm inngest\" \"pnpm dev:server\" \"pnpm dev:client\""`
  - Run: `pnpm install`
- [x] server-002 Integrate workflow engine into server startup
  - File: `apps/web/src/server/index.ts`
  - Import initializeWorkflowEngine, scanAllProjectWorkflows
  - Call initializeWorkflowEngine(fastify) before server start
  - Call scanAllProjectWorkflows(fastify) after engine init
  - Log scan results
- [x] server-003 Replace MockWorkflowOrchestrator in executeWorkflow
  - File: `apps/web/src/server/domain/workflow/services/executeWorkflow.ts`
  - Remove MockWorkflowOrchestrator import and usage
  - Update to trigger Inngest workflow via fastify.workflowClient.send()
  - Pass executionId, projectId, userId, projectPath, args in event data
- [x] server-004 Delete MockWorkflowOrchestrator
  - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`
  - Delete entire file
- [x] server-005 Add workflow engine environment variables
  - File: `apps/web/.env.example`
  - WORKFLOW_ENGINE_ENABLED (default: true)
  - INNGEST_EVENT_KEY (signing key for webhook auth, optional for dev)
  - INNGEST_MEMOIZATION_DB_PATH (default: ./prisma/workflows.db)
  - INNGEST_SERVE_PATH (default: /api/workflows/inngest)
  - INNGEST_DEV_MODE (default: true for development)

#### Completion Notes

- Added inngest ^3.44.5 and updated concurrently script in package.json
- Added "inngest" script to run Inngest dev server alongside web app
- Updated "dev" script to run inngest, server, and client concurrently
- Integrated initializeWorkflowEngine and scanAllProjectWorkflows into server/index.ts startup
- Removed MockWorkflowOrchestrator and updated executeWorkflow to use Inngest
- executeWorkflow now triggers workflows via fastify.workflowClient.send()
- Added comprehensive workflow engine environment variables to .env.example
- Server now logs workflow scanning results on startup

### Task Group 6: Example Workflow & Testing

<!-- prettier-ignore -->
- [x] example-001 Create example workflow in test project
  - Create test project at `apps/web/test-project/.workflows/`
  - File: `apps/web/test-project/.workflows/example-workflow.ts`
  - Install @repo/workflow-sdk
  - Define simple phase-based workflow (implement, review, test)
  - Use step.agent(), step.git(), step.annotation()
- [ ] test-001 Write unit tests for phase step retry logic
  - File: `apps/web/src/server/workflows/engine/steps/phase.test.ts`
  - Test retry on failure
  - Test broadcast of retry events
  - Test phase failure after max retries
- [ ] test-002 Write unit tests for dynamic step creation
  - File: `apps/web/src/server/workflows/engine/steps/helpers.test.ts`
  - Test findOrCreateStep()
  - Test step tagging with phase
- [ ] test-003 Write integration tests for workflow scanning
  - File: `apps/web/src/server/workflows/engine/scanner.test.ts`
  - Test scanProjectWorkflows()
  - Test WorkflowDefinition creation/update
- [ ] test-004 Write integration tests for workflow run
  - File: `apps/web/src/server/workflows/engine/registry.test.ts`
  - Test workflow trigger
  - Test phase execution sequence
  - Test WebSocket event broadcasting
- [ ] test-005 Write E2E test for full workflow run
  - File: `apps/web/src/server/workflows/engine/workflow-execution.e2e.test.ts`
  - Create test WorkflowRun
  - Trigger execution
  - Wait for completion
  - Verify phase progression, events, WebSocket broadcasts

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 7: Documentation & Publishing

<!-- prettier-ignore -->
- [ ] docs-001 Write SDK README
  - File: `packages/workflow-sdk/README.md`
  - Installation instructions
  - Quick start guide
  - API reference for all step methods
  - Example workflows
  - Phase options documentation
- [ ] docs-002 Update web app CLAUDE.md
  - File: `apps/web/CLAUDE.md`
  - Add workflow engine section
  - Document workflow discovery process
  - Document custom step methods
  - Add troubleshooting guide
- [ ] docs-003 Create workflow implementation guide
  - File: `apps/web/docs/workflows.md`
  - How to create workflows
  - Phase-based workflow patterns
  - Error handling and retry strategies
  - WebSocket event reference
- [ ] publish-001 Build and test SDK package
  - Run: `cd packages/workflow-sdk && pnpm build`
  - Verify dist/ output
  - Test types: `tsc --noEmit`
- [ ] publish-002 Publish SDK to npm (when ready)
  - Update version in package.json
  - Run: `pnpm publish --access public`
  - Verify published on npmjs.com

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

**`apps/web/src/server/workflows/engine/steps/phase.test.ts`** - Phase retry logic:

```typescript
describe("step.phase() retry logic", () => {
  it("retries phase on failure up to max attempts", async () => {
    let attempts = 0;
    await step.phase(
      "test-phase",
      async () => {
        attempts++;
        if (attempts < 3) throw new Error("Fail");
        return "success";
      },
      { retries: 3 }
    );

    expect(attempts).toBe(3);
  });

  it("broadcasts retry events between attempts", async () => {
    const broadcastSpy = jest.spyOn(subscriptions, "broadcast");

    let attempt = 0;
    try {
      await step.phase(
        "test",
        async () => {
          attempt++;
          throw new Error("Always fails");
        },
        { retries: 2 }
      );
    } catch {}

    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "workflow:phase:retry",
        data: expect.objectContaining({ attempt: 1, maxRetries: 2 }),
      })
    );
  });

  it("updates current_phase in WorkflowRun", async () => {
    await step.phase("implement", async () => {
      const execution = await prisma.workflowExecution.findUnique({
        where: { id: executionId },
      });
      expect(execution.current_phase).toBe("implement");
    });
  });
});
```

**`apps/web/src/server/workflows/engine/steps/helpers.test.ts`** - Dynamic step creation:

```typescript
describe("findOrCreateStep()", () => {
  it("creates step if not exists", async () => {
    const step = await findOrCreateStep(executionId, "new-step", "implement");

    expect(step.name).toBe("new-step");
    expect(step.phase).toBe("implement");
    expect(step.status).toBe("pending");
  });

  it("returns existing step if already created", async () => {
    const step1 = await findOrCreateStep(executionId, "existing", "test");
    const step2 = await findOrCreateStep(executionId, "existing", "test");

    expect(step1.id).toBe(step2.id);
  });

  it("tags step with current phase", async () => {
    await step.phase("review", async () => {
      await step.agent("review-code", { agent: "claude", prompt: "Review" });
    });

    const steps = await prisma.workflowExecutionStep.findMany({
      where: { workflow_run_id: executionId },
    });

    expect(steps[0].phase).toBe("review");
  });
});
```

**`apps/web/src/server/workflows/engine/steps/artifact.test.ts`** - Artifact upload:

```typescript
describe("step.artifact()", () => {
  it("uploads text content as artifact", async () => {
    await step.artifact("test-results", {
      name: "results.txt",
      content: "All tests passed",
      type: "text",
    });

    const artifacts = await prisma.workflowArtifact.findMany({
      where: { workflow_run_step_id: stepId },
    });

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].name).toBe("results.txt");
    expect(artifacts[0].file_type).toBe("text");
  });

  it("uploads all files in directory", async () => {
    // Create test directory with files
    await fs.mkdir("./test-artifacts", { recursive: true });
    await fs.writeFile("./test-artifacts/file1.txt", "content1");
    await fs.writeFile("./test-artifacts/file2.txt", "content2");

    await step.artifact("screenshots", {
      name: "test-screenshots",
      directory: "./test-artifacts",
      type: "image",
    });

    const artifacts = await prisma.workflowArtifact.findMany();
    expect(artifacts.length).toBeGreaterThanOrEqual(2);
  });
});
```

### Integration Tests

**`apps/web/src/server/workflows/engine/scanner.test.ts`** - Workflow scanning:

```typescript
describe("Workflow Scanning", () => {
  it("discovers workflows from .workflows directory", async () => {
    // Create test project with workflow
    const testProjectPath = "/tmp/test-project";
    await fs.mkdir(`${testProjectPath}/.workflows`, { recursive: true });
    await fs.writeFile(
      `${testProjectPath}/.workflows/test-workflow.ts`,
      `
      import { defineWorkflow } from '@repo/workflow-sdk';
      export default defineWorkflow({
        id: 'test-workflow',
        trigger: 'workflow/test'
      }, async ({ step }) => {});
    `
    );

    const project = await prisma.project.create({
      data: { name: "Test", path: testProjectPath, user_id: userId },
    });

    // Scan project
    const workflows = await scanProjectWorkflows(
      project.id,
      testProjectPath,
      fastify
    );

    expect(workflows).toHaveLength(1);
    expect(workflows[0].name).toBe("test-workflow");
  });

  it("creates WorkflowDefinition records", async () => {
    await scanProjectWorkflows(projectId, projectPath, fastify);

    const definitions = await prisma.workflowDefinition.findMany({
      where: { project_id: projectId },
    });

    expect(definitions.length).toBeGreaterThan(0);
    expect(definitions[0].type).toBe("code");
    expect(definitions[0].path).toContain(".workflows/");
  });

  it("updates existing WorkflowDefinition on rescan", async () => {
    // First scan
    await scanProjectWorkflows(projectId, projectPath, fastify);
    const before = await prisma.workflowDefinition.findFirst({
      where: { project_id: projectId },
    });

    // Wait and rescan
    await new Promise((resolve) => setTimeout(resolve, 100));
    await scanProjectWorkflows(projectId, projectPath, fastify);

    const after = await prisma.workflowDefinition.findUnique({
      where: { id: before.id },
    });

    expect(after.updated_at).not.toEqual(before.updated_at);
  });
});
```

**`apps/web/src/server/workflows/engine/registry.test.ts`** - Workflow run:

```typescript
describe("Workflow Run", () => {
  it("triggers workflow via Inngest", async () => {
    const sendSpy = jest.spyOn(fastify.workflowClient, "send");

    await executeWorkflow(executionId, fastify);

    expect(sendSpy).toHaveBeenCalledWith({
      name: expect.stringContaining("workflow/"),
      data: expect.objectContaining({
        executionId,
        projectId,
        userId,
      }),
    });
  });

  it("loads workflow from stored path", async () => {
    // Create workflow definition
    const definition = await prisma.workflowDefinition.create({
      data: {
        project_id: projectId,
        name: "test-workflow",
        type: "code",
        path: testWorkflowPath,
        phases: ["test"],
      },
    });

    // Initialize engine (should load workflow)
    await initializeWorkflowEngine(fastify);

    // Verify workflow registered
    // (Check Inngest client has workflow registered)
  });
});
```

### E2E Tests

**`apps/web/src/server/workflows/engine/workflow-execution.e2e.test.ts`** - Full workflow run:

```typescript
describe("Full Workflow Run E2E", () => {
  it("executes phase-based workflow end-to-end", async () => {
    // Create test workflow file
    const workflowPath = `${testProjectPath}/.workflows/e2e-test.ts`;
    await fs.writeFile(
      workflowPath,
      `
      import { defineWorkflow } from '@repo/workflow-sdk';

      export default defineWorkflow({
        id: 'e2e-test',
        trigger: 'workflow/e2e-test',
        phases: ['phase1', 'phase2']
      }, async ({ event, step }) => {
        await step.phase('phase1', async () => {
          await step.annotation('Phase 1 started');
        });

        await step.phase('phase2', async () => {
          await step.annotation('Phase 2 started');
        });

        return { success: true };
      });
    `
    );

    // Scan and create definition
    await scanProjectWorkflows(projectId, testProjectPath, fastify);

    // Create execution
    const execution = await prisma.workflowExecution.create({
      data: {
        project_id: projectId,
        user_id: userId,
        workflow_definition_id: definitionId,
        name: "E2E Test",
        args: {},
        status: "pending",
      },
    });

    // Setup WebSocket spy
    const broadcastSpy = jest.spyOn(subscriptions, "broadcast");

    // Trigger execution
    await executeWorkflow(execution.id, fastify);

    // Wait for completion (poll WorkflowRun status)
    await waitFor(
      async () => {
        const updated = await prisma.workflowExecution.findUnique({
          where: { id: execution.id },
        });
        return updated.status === "completed";
      },
      { timeout: 30000 }
    );

    // Verify phases completed in order
    const events = await prisma.workflowEvent.findMany({
      where: {
        workflow_run_id: execution.id,
        event_type: "phase_completed",
      },
      orderBy: { created_at: "asc" },
    });

    expect(events).toHaveLength(2);
    expect(events[0].event_data.phase).toBe("phase1");
    expect(events[1].event_data.phase).toBe("phase2");

    // Verify WebSocket broadcasts
    expect(broadcastSpy).toHaveBeenCalledWith(
      Channels.project(projectId),
      expect.objectContaining({
        type: "workflow:started",
      })
    );

    expect(broadcastSpy).toHaveBeenCalledWith(
      Channels.project(projectId),
      expect.objectContaining({
        type: "workflow:phase:started",
        data: expect.objectContaining({ phase: "phase1" }),
      })
    );

    expect(broadcastSpy).toHaveBeenCalledWith(
      Channels.project(projectId),
      expect.objectContaining({
        type: "workflow:completed",
      })
    );
  }, 60000);
});
```

## Success Criteria

- [ ] SDK package published to npm with full TypeScript types
- [ ] Server scans all projects for workflows on startup
- [ ] WorkflowDefinition records created for discovered workflows
- [ ] Manual refresh API re-scans project workflows
- [ ] Workflows load dynamically from filesystem paths
- [ ] Phase retry logic works (default 3 attempts, configurable)
- [ ] Steps created dynamically during execution (tagged with phase)
- [ ] All custom step methods implemented and tested
- [ ] Agent execution streams to WebSocket in real-time
- [ ] Git operations delegate to existing domain services
- [ ] Artifacts uploaded and WorkflowArtifact records created
- [ ] WebSocket events broadcast for all lifecycle transitions
- [ ] MockWorkflowOrchestrator deleted, replaced with Inngest
- [ ] Frontend displays phase-based timeline (no changes needed)
- [ ] Unit tests pass for all step methods
- [ ] Integration tests pass for scanning and execution
- [ ] E2E test verifies full workflow run
- [ ] Example workflow runs successfully in test project
- [ ] No type errors, no lint errors
- [ ] Documentation complete (SDK README, web app guide)

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build SDK package
cd packages/workflow-sdk
pnpm build
# Expected: dist/ contains compiled JS + .d.ts files

# Build web app
cd ../../apps/web
pnpm build
# Expected: Successful build with no errors

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests
pnpm test
# Expected: All workflow engine tests pass

# Integration tests (if written)
pnpm test:integration
# Expected: Workflow scanning and execution tests pass

# E2E tests (if written)
pnpm test:e2e
# Expected: Full workflow run test passes

# Verify memoization database created
ls -la apps/web/prisma/workflows.db
# Expected: SQLite database file exists
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Check server logs for workflow scanning:
   ```
   ✓ Workflow engine initialized
   ✓ Scanning projects for workflows...
   ✓ Scanned 3 projects, discovered 5 workflows
   ```
3. Open UI: http://localhost:5173
4. Navigate to a project
5. Check workflows are listed (if UI implemented)
6. Trigger a workflow run
7. Verify real-time WebSocket updates in browser DevTools
8. Check timeline shows phases and steps
9. Verify WorkflowRun record updated in database
10. Check logs/app.log for workflow run logs

**Feature-Specific Checks:**

- Create test project with `.workflows/test-workflow.ts`
- Install SDK: `npm install @repo/workflow-sdk`
- Define simple workflow with phases
- Restart server, verify workflow discovered
- Trigger workflow, verify execution completes
- Check WorkflowRunStep records created dynamically
- Verify phase retry: modify workflow to fail, check retries in logs
- Test artifact upload: add `step.artifact()` call, verify WorkflowArtifact created
- Test WebSocket: open browser DevTools Network tab, filter for WS, verify events
- Test slash command: add `step.slash('/commit')`, verify agent execution
- Verify frontend timeline displays phases hierarchically
- Test step timeout: Set short timeout, verify graceful shutdown (SIGTERM then SIGKILL)
- Test parallel execution: Trigger same workflow twice, verify separate memoization
- Test memoization: Fail workflow at step 3, verify steps 1-2 cached on retry
- Verify Inngest Dev Server UI at http://localhost:8288
- Check `workflows.db` grows with memoization data

## Implementation Notes

### 1. Inngest In-Process vs Separate Server

Running Inngest in-process simplifies development and deployment. The workflow engine has direct access to domain services, database, and WebSocket infrastructure. This can be separated into a microservice later if scaling requires it, but for MVP, in-process is the right choice.

### 2. SDK Type-Only Pattern

The SDK contains NO runtime logic. It's purely TypeScript interfaces and builder functions. This keeps the SDK lightweight and allows the web app to provide implementations. User projects get full type safety without pulling in heavy dependencies.

### 3. Phase Retry Configuration

Retry logic is configurable per phase:

```typescript
await step.phase(
  "implement",
  async () => {
    // Phase logic
  },
  { retries: 5, retryDelay: 10000 }
);
```

Default: 3 retries, 5000ms delay. Retries are automatic - phases that fail are retried until max attempts or success.

### 4. Dynamic Step Creation Rationale

Pre-creating steps would require analyzing workflow code statically, which breaks with conditional logic (`if (x) { step.agent(...) }`). Dynamic creation is simpler and more flexible. Frontend can show steps as they appear, which actually provides better real-time feedback.

### 5. Database vs Filesystem as Source of Truth

WorkflowDefinition stores metadata for UI listing, but workflow CODE is loaded fresh from filesystem on execution. This ensures latest code is always executed (no cache staleness) while still providing searchable workflow catalog.

### 6. WebSocket Event Consistency

All WebSocket events follow existing patterns:

- `workflow:phase:started`
- `workflow:phase:retry`
- `workflow:phase:completed`
- `workflow:step:started`
- `workflow:step:completed`
- `workflow:artifact:uploaded`

Frontend already handles these event types. No changes needed to timeline rendering.

### 7. Error Recovery and Cleanup

All step methods include try/finally blocks for cleanup:

- Terminate agent processes
- Mark sessions as failed
- Clean up temp files
- Broadcast failure events

This prevents resource leaks when steps fail.

## Dependencies

- `inngest: ^3.x.x` (web app) - Workflow run engine
- `inngest: ^3.x.x` (SDK peer dependency) - Type definitions only
- No new dependencies required in SDK package itself

## Timeline

| Task Group                   | Estimated Time |
| ---------------------------- | -------------- |
| Setup SDK Package            | 6 hours        |
| Web App Infrastructure       | 16 hours       |
| Workflow Discovery & Loading | 8 hours        |
| API Endpoints & Routes       | 3 hours        |
| Server Integration           | 4 hours        |
| Example Workflow & Testing   | 10 hours       |
| Documentation & Publishing   | 5 hours        |
| **Total**                    | **52 hours**   |

**Breakdown by Phase:**

- Phase 1 (SDK + Infrastructure): 22 hours
- Phase 2 (Loading + Integration): 15 hours
- Phase 3 (Testing + Documentation): 15 hours

## References

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest TypeScript SDK](https://www.inngest.com/docs/sdk/overview)
- Existing workflow database schema: `apps/web/prisma/schema.prisma`
- Existing WebSocket infrastructure: `apps/web/src/server/websocket/infrastructure/`
- Domain services for integration: `apps/web/src/server/domain/*/services/`
- POC implementation: `apps/inngest-poc/src/`

## Next Steps

1. Create SDK package structure and types
2. Implement phase step with retry logic
3. Implement all custom step methods (agent, git, cli, artifact, annotation)
4. Implement workflow scanner for startup discovery
5. Integrate workflow engine into server startup
6. Replace MockWorkflowOrchestrator with Inngest trigger
7. Create example workflow and test end-to-end
8. Write comprehensive tests (unit, integration, E2E)
9. Document SDK and workflow implementation patterns
10. Publish SDK to npm when ready for external use
