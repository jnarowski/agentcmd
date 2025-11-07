# Workflow Phase 2: Workflow Engine Package

**Status**: draft
**Created**: 2025-01-02
**Package**: @repo/workflow-engine (new package)
**Estimated Effort**: 50-60 hours

## Overview

Create a new TypeScript package (`@repo/workflow-engine`) that provides the core workflow orchestration engine for defining and executing multi-step AI agent workflows. This package will parse workflow definitions (TypeScript and YAML), execute steps (agent/script/function), manage checkpoints for pause/resume, and integrate with the existing `@repo/agent-cli-sdk` for agent step execution. The package structure and conventions will mirror `@repo/agent-cli-sdk` for consistency.

## User Story

As a developer using the workflow system
I want to define workflows as code (TypeScript) or configuration (YAML)
So that I can orchestrate complex multi-step AI agent tasks with automatic state persistence, checkpoint/resume capability, and seamless integration with Claude, Codex, and Gemini agents

## Technical Approach

**Architecture Pattern**: Separate package following agent-cli-sdk structure with:

- Pure workflow orchestration logic (no database, no HTTP, no WebSocket dependencies)
- Parser layer for TypeScript and YAML workflow definitions
- Execution engine with WorkflowContext API for step execution
- Checkpoint system for save/restore state
- Filesystem storage for execution artifacts
- Callback-based integration with web app (database updates, WebSocket events)

**Integration Strategy**:

- Workflow engine package is pure business logic
- Web app provides callbacks for database/WebSocket operations
- Agent steps executed via existing `@repo/agent-cli-sdk`
- Script steps executed via Node.js `child_process`
- Function steps executed directly (TypeScript functions)

## Key Design Decisions

1. **Separate Package vs. Part of Web App**
   - **Decision**: Create `@repo/workflow-engine` as separate package
   - **Rationale**:
     - Enables reusability (CLI tools, background workers, other apps)
     - Clean separation of workflow logic from web concerns
     - Follows existing monorepo pattern (similar to agent-cli-sdk)
     - Zero web-specific dependencies (no Prisma, Fastify, WebSocket)
     - Future-proof for standalone workflow CLI

2. **Mirror agent-cli-sdk Structure**
   - **Decision**: Use exact same package structure, naming conventions, and tooling as agent-cli-sdk
   - **Rationale**:
     - Consistency across monorepo packages
     - Proven patterns (camelCase files, co-located tests, bunchee build)
     - Same TypeScript/ESLint/Vitest configuration
     - Developers familiar with one package can navigate the other

3. **Callback-Based Integration**
   - **Decision**: Engine accepts callbacks for database/WebSocket operations instead of direct imports
   - **Rationale**:
     - Keeps engine pure and database-agnostic
     - Web app controls how state updates and events are emitted
     - Enables testing with mock callbacks
     - Could swap Prisma for another DB without changing engine

4. **Agent Step Execution via agent-cli-sdk**
   - **Decision**: Use peer dependency on `@repo/agent-cli-sdk` for agent steps
   - **Rationale**:
     - Reuse existing Claude/Codex/Gemini integration
     - Consistent API across agent types
     - No duplicate CLI spawning logic
     - Agent session management already solved

5. **Checkpoint After Every Step**
   - **Decision**: Save checkpoint automatically after each step completes
   - **Rationale**:
     - Enables resume from any point
     - Minimal data loss on failure
     - Simplifies resume logic (just skip completed steps)
     - Small performance cost acceptable for reliability

6. **TypeScript + YAML Workflow Support**
   - **Decision**: Support both code-based (TypeScript) and config-based (YAML) workflows
   - **Rationale**:
     - TypeScript for complex conditional logic and dynamic behavior
     - YAML for simple linear pipelines (easier for non-developers)
     - Both compile to same internal WorkflowDefinition format

## Architecture

### Package Structure (Following agent-cli-sdk)

```
packages/workflow-engine/
├── src/
│   ├── types/
│   │   ├── workflow.ts          # WorkflowConfig, WorkflowDefinition, WorkflowStatus
│   │   ├── step.ts              # StepConfig, StepResult, StepStatus
│   │   ├── context.ts           # WorkflowContext interface
│   │   └── index.ts             # Barrel export
│   │
│   ├── parser/
│   │   ├── yamlParser.ts        # Parse YAML workflows
│   │   ├── yamlParser.test.ts   # Co-located unit tests
│   │   ├── codeParser.ts        # Parse TypeScript workflows
│   │   ├── codeParser.test.ts   # Co-located unit tests
│   │   └── index.ts             # Barrel export
│   │
│   ├── execution/
│   │   ├── WorkflowContext.ts       # Context API implementation
│   │   ├── WorkflowContext.test.ts  # Co-located unit tests
│   │   ├── WorkflowExecutor.ts      # Main execution engine
│   │   ├── WorkflowExecutor.test.ts # Co-located unit tests
│   │   └── index.ts                 # Barrel export
│   │
│   ├── checkpoint/
│   │   ├── CheckpointManager.ts       # Save/restore state
│   │   ├── CheckpointManager.test.ts  # Co-located unit tests
│   │   └── index.ts                   # Barrel export
│   │
│   ├── storage/
│   │   ├── FileSystemStorage.ts       # File operations
│   │   ├── FileSystemStorage.test.ts  # Co-located unit tests
│   │   └── index.ts                   # Barrel export
│   │
│   ├── utils/
│   │   ├── pathEncoding.ts        # Encode project paths
│   │   ├── pathEncoding.test.ts   # Co-located unit tests
│   │   └── index.ts               # Barrel export
│   │
│   └── index.ts                   # Main package export
│
├── tests/
│   └── e2e/
│       ├── basic-execution.test.ts      # Basic workflow run
│       ├── checkpoint-resume.test.ts    # Checkpoint/resume flow
│       └── agent-integration.test.ts    # Integration with agent-cli-sdk
│
├── package.json               # Following agent-cli-sdk structure
├── tsconfig.json              # Exact copy from agent-cli-sdk
├── vitest.config.ts           # Exact copy from agent-cli-sdk
├── vitest.e2e.config.ts       # E2E test config (sequential)
├── README.md                  # Package documentation
├── CLAUDE.md                  # Claude-specific guidance
└── CHANGELOG.md               # Version history
```

### Integration Points

**Web App Domain Services** (`apps/web/src/server/domain/workflow/services/`):

- `executeWorkflow.ts` - Remove stub, instantiate WorkflowExecutor with callbacks
- `resumeWorkflow.ts` - Remove stub, instantiate WorkflowExecutor with resumeFromCheckpoint=true

**Agent CLI SDK** (`@repo/agent-cli-sdk`):

- Used as peer dependency for executing agent steps (Claude, Codex, Gemini)
- WorkflowContext imports executeClaude, executeCodex, executeGemini

**Filesystem** (`.agent/workflows/`):

- `definitions/` - Workflow template files (code/YAML)
- `executions/{id}/` - Per-execution directories with checkpoints, logs, artifacts

## Implementation Details

### 1. Package Setup Files

Following agent-cli-sdk conventions exactly:

**package.json**:

- Name: `@repo/workflow-engine`
- Version: `0.1.0`
- Type: `module` (ESM-only)
- Main: `dist/index.js`
- Types: `dist/index.d.ts`
- Scripts: build, dev, check, check-types, lint, format, test, test:watch, test:e2e
- Build tool: bunchee
- Test tool: vitest
- Dependencies: yaml, simple-git
- Peer dependencies: zod, @repo/agent-cli-sdk
- Dev dependencies: Same as agent-cli-sdk (typescript, bunchee, vitest, eslint, etc.)
- Engines: node >=22.0.0

**tsconfig.json**:

- Exact copy from agent-cli-sdk
- Target: ES2022
- Module: ESNext
- Module resolution: bundler
- Strict mode enabled with additional strictness flags
- Output to dist/ with declaration maps and source maps

**vitest.config.ts**:

- Exact copy from agent-cli-sdk
- Node environment
- Coverage with v8
- Exclude e2e tests from regular suite

**vitest.e2e.config.ts**:

- Sequential execution (singleFork: true)
- 180s timeout for workflow run
- Include only tests/e2e/\*_/_.test.ts

### 2. Type Definitions

**src/types/workflow.ts**:

- `WorkflowStatus` - 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
- `WorkflowConfig` - TypeScript workflow definition (name, phases, argsSchema, execute)
- `WorkflowDefinition` - Unified model from parsers (supports both code and YAML)

**src/types/step.ts**:

- `StepStatus` - 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
- `StepConfig` - Union type: AgentStepConfig | ScriptStepConfig | FunctionStepConfig
- `AgentStepConfig` - Agent step (agent: 'claude'|'codex'|'gemini', prompt, permission)
- `ScriptStepConfig` - Script step (command, cwd)
- `FunctionStepConfig` - Function step (fn: async function)
- `StepResult` - Result object (stepId, status, data, error, timestamps)

**src/types/context.ts**:

- `WorkflowContext` - Interface for workflow run context
  - `executionId`, `projectPath`, `args` - Execution metadata
  - `step(id, config)` - Execute step
  - `checkpoint()` - Save checkpoint
  - `comment(text, stepId?)` - Create comment
  - `exec(command, cwd?)` - Execute shell command
  - `getStepResult(id)` - Retrieve step result
- `ExecResult` - Shell command result (stdout, stderr, exitCode)

### 3. YAML Parser

**src/parser/yamlParser.ts**:

- `parseYamlWorkflow(content: string): WorkflowDefinition`
- Parse YAML files using `yaml` package
- Validate required fields (name, phases, steps)
- Parse step configurations (agent/script types)
- Handle template variables (e.g., `{{args.environment}}`)
- Convert args_schema JSON schema to WorkflowDefinition format

**Example YAML workflow**:

```yaml
name: Build Pipeline
description: Build, test, and deploy
phases: [build, test, deploy]
argsSchema:
  type: object
  properties:
    environment:
      type: string
      enum: [dev, staging, production]
steps:
  - id: build-app
    phase: build
    type: script
    command: pnpm build
  - id: run-tests
    phase: test
    type: script
    command: pnpm test
```

### 4. TypeScript Parser

**src/parser/codeParser.ts**:

- `loadCodeWorkflow(filePath: string): Promise<WorkflowDefinition>`
- Dynamic import of TypeScript workflow file
- Validate WorkflowConfig structure (name, phases, execute)
- Convert Zod schema to JSON schema if present
- Return WorkflowDefinition with execute function

**Example TypeScript workflow**:

```typescript
export default defineWorkflow({
  name: "Implement Feature",
  phases: ["research", "implement", "test"],
  argsSchema: z.object({
    featureName: z.string(),
    requirements: z.string(),
  }),
  async execute(ctx) {
    await ctx.step("research", {
      type: "agent",
      agent: "claude",
      prompt: `Research: ${ctx.args.featureName}`,
    });
    await ctx.checkpoint();
    await ctx.step("implement", {
      type: "agent",
      agent: "claude",
      prompt: "Implement the feature",
    });
  },
});
```

### 5. WorkflowContext Implementation

**src/execution/WorkflowContext.ts**:

- `WorkflowContextImpl` - Implementation of WorkflowContext interface
- Constructor accepts executionId, projectPath, args, callbacks
- `step()` method:
  - Calls onStepStart callback
  - Routes to executeAgentStep, executeScriptStep, or executeFunctionStep based on type
  - Calls onStepComplete callback
  - Returns StepResult
- `executeAgentStep()`:
  - Imports executeClaude/executeCodex/executeGemini from agent-cli-sdk
  - Resolves prompt (string or function)
  - Executes agent with cwd and permission mode
  - Returns result
- `executeScriptStep()`:
  - Spawns child process with shell: true
  - Captures stdout/stderr
  - Returns result with exit code
- `executeFunctionStep()`:
  - Invokes async function with context
  - Catches errors and returns failed result
- `checkpoint()`:
  - Delegates to CheckpointManager
- `comment()`, `exec()`, `getStepResult()`:
  - Utility methods for workflow logic

### 6. WorkflowExecutor

**src/execution/WorkflowExecutor.ts**:

- `WorkflowExecutor` - Main execution engine class
- Constructor config:
  - executionId, projectPath, args - Required
  - onStepStart, onStepComplete, onPhaseChange - Optional callbacks
  - resumeFromCheckpoint - Boolean flag for resume mode
- `execute()` method:
  - Load workflow definition from filesystem
  - Create WorkflowContext instance
  - If code workflow: Call definition.execute(context)
  - If YAML workflow: Iterate steps and call context.step()
  - Handle errors and update status
- `resume()` method:
  - Load latest checkpoint from CheckpointManager
  - Create WorkflowContext
  - Skip steps with status='completed' in checkpoint
  - Continue execution from current_step_index
- Private methods:
  - `loadWorkflowDefinition()` - Load from .agent/workflows/definitions/
  - `executeSteps()` - Iterate YAML steps

### 7. CheckpointManager

**src/checkpoint/CheckpointManager.ts**:

- `CheckpointManager` - Handles checkpoint save/restore
- Constructor: executionId, basePath
- `save(checkpoint: Checkpoint)` - Save to filesystem
  - Path: `.agent/workflows/executions/{id}/checkpoints/step-{index}.json`
  - Format: JSON with current_phase, current_step_index, completed_step_ids, step_results
- `load(): Checkpoint | null` - Load latest checkpoint
  - Find highest step-{index}.json in checkpoints directory
  - Parse and return, or null if none exist
- `Checkpoint` interface:
  - execution_id - UUID
  - timestamp - ISO string
  - current_phase - Current phase name
  - current_step_index - Index in steps array
  - completed_step_ids - Array of completed step IDs
  - step_results - Map of stepId → StepResult

### 8. FileSystemStorage

**src/storage/FileSystemStorage.ts**:

- `FileSystemStorage` - Handles filesystem operations for workflow run
- Constructor: executionId, projectPath
- `initialize()` - Create directory structure
  - `.agent/workflows/executions/{executionId}/`
  - `definition.json` - Immutable snapshot of workflow definition
  - `args.json` - Immutable snapshot of execution arguments
  - `checkpoints/` - Checkpoint JSON files
  - `artifacts/` - Uploaded files by step
  - `logs/` - Step logs (input, output, events, summary)
- `saveLog(stepId, type, content)` - Save step log file
  - Types: 'input', 'output', 'events', 'summary'
  - Path: `logs/{stepId}/{type}.json` or `.md`
- `saveArtifact(stepId, filename, content)` - Save artifact file
  - Path: `artifacts/{stepId}/{filename}`
  - Returns relative path for database storage
- `createLogDirectory(stepId)` - Create logs/{stepId}/ directory

### 9. Web App Integration

Remove stubs from web app domain services and integrate with workflow engine:

**apps/web/src/server/domain/workflow/services/executeWorkflow.ts**:

```typescript
import { WorkflowExecutor } from "@repo/workflow-engine";
import { prisma } from "@/shared/prisma";
import { emitWorkflowEvent } from "@/server/websocket/handlers/workflow.handler";

export async function executeWorkflow(executionId: string): Promise<void> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: { project: true, workflow_definition: true },
  });

  if (!execution) throw new Error("Execution not found");

  const executor = new WorkflowExecutor({
    executionId,
    projectPath: execution.project.path,
    args: execution.args as Record<string, any>,

    onStepStart: async (stepId) => {
      await prisma.workflowExecutionStep.update({
        where: { id: stepId },
        data: { status: "running", started_at: new Date() },
      });
      emitWorkflowEvent("workflow.step.started", { executionId, stepId });
    },

    onStepComplete: async (stepId, result) => {
      await prisma.workflowExecutionStep.update({
        where: { id: stepId },
        data: {
          status: result.status,
          completed_at: new Date(),
          error_message: result.error,
        },
      });
      emitWorkflowEvent("workflow.step.completed", { executionId, stepId });
    },

    onPhaseChange: async (phase) => {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { current_phase: phase },
      });
      emitWorkflowEvent("workflow.execution.phase_changed", {
        executionId,
        phase,
      });
    },
  });

  await executor.execute();
}
```

**apps/web/src/server/domain/workflow/services/resumeWorkflow.ts**:

```typescript
export async function resumeWorkflow(
  executionId: string
): Promise<WorkflowRun> {
  const execution = await getWorkflowRunById(executionId);
  if (!execution) throw new Error("Execution not found");

  const executor = new WorkflowExecutor({
    executionId,
    projectPath: execution.project.path,
    args: execution.args as Record<string, any>,
    resumeFromCheckpoint: true,
    onStepStart: async (stepId) => {
      /* same as executeWorkflow */
    },
    onStepComplete: async (stepId, result) => {
      /* same */
    },
    onPhaseChange: async (phase) => {
      /* same */
    },
  });

  await executor.resume();

  return await prisma.workflowExecution.update({
    where: { id: executionId },
    data: { status: "running" },
  });
}
```

## Files to Create/Modify

### New Files (30)

**Package Configuration (4 files)**:

1. `packages/workflow-engine/package.json` - Package manifest
2. `packages/workflow-engine/tsconfig.json` - TypeScript config
3. `packages/workflow-engine/vitest.config.ts` - Unit test config
4. `packages/workflow-engine/vitest.e2e.config.ts` - E2E test config

**Type Definitions (4 files)**: 5. `packages/workflow-engine/src/types/workflow.ts` - Workflow types 6. `packages/workflow-engine/src/types/step.ts` - Step types 7. `packages/workflow-engine/src/types/context.ts` - Context types 8. `packages/workflow-engine/src/types/index.ts` - Barrel export

**Parser (5 files)**: 9. `packages/workflow-engine/src/parser/yamlParser.ts` - YAML parser 10. `packages/workflow-engine/src/parser/yamlParser.test.ts` - YAML parser tests 11. `packages/workflow-engine/src/parser/codeParser.ts` - TypeScript parser 12. `packages/workflow-engine/src/parser/codeParser.test.ts` - TypeScript parser tests 13. `packages/workflow-engine/src/parser/index.ts` - Barrel export

**Execution (5 files)**: 14. `packages/workflow-engine/src/execution/WorkflowContext.ts` - Context implementation 15. `packages/workflow-engine/src/execution/WorkflowContext.test.ts` - Context tests 16. `packages/workflow-engine/src/execution/WorkflowExecutor.ts` - Executor implementation 17. `packages/workflow-engine/src/execution/WorkflowExecutor.test.ts` - Executor tests 18. `packages/workflow-engine/src/execution/index.ts` - Barrel export

**Checkpoint (3 files)**: 19. `packages/workflow-engine/src/checkpoint/CheckpointManager.ts` - Checkpoint manager 20. `packages/workflow-engine/src/checkpoint/CheckpointManager.test.ts` - Checkpoint tests 21. `packages/workflow-engine/src/checkpoint/index.ts` - Barrel export

**Storage (3 files)**: 22. `packages/workflow-engine/src/storage/FileSystemStorage.ts` - Storage implementation 23. `packages/workflow-engine/src/storage/FileSystemStorage.test.ts` - Storage tests 24. `packages/workflow-engine/src/storage/index.ts` - Barrel export

**Package Export (1 file)**: 25. `packages/workflow-engine/src/index.ts` - Main package export

**E2E Tests (3 files)**: 26. `packages/workflow-engine/tests/e2e/basic-execution.test.ts` - Basic execution test 27. `packages/workflow-engine/tests/e2e/checkpoint-resume.test.ts` - Checkpoint/resume test 28. `packages/workflow-engine/tests/e2e/agent-integration.test.ts` - Agent integration test

**Documentation (3 files)**: 29. `packages/workflow-engine/README.md` - Package documentation 30. `packages/workflow-engine/CLAUDE.md` - Claude-specific guidance 31. `packages/workflow-engine/CHANGELOG.md` - Version history

### Modified Files (3)

1. `apps/web/src/server/domain/workflow/services/executeWorkflow.ts` - Replace stub with WorkflowExecutor
2. `apps/web/src/server/domain/workflow/services/resumeWorkflow.ts` - Replace stub with WorkflowExecutor
3. `apps/web/package.json` - Add @repo/workflow-engine dependency

## Step by Step Tasks

### Task Group 1: Package Setup

<!-- prettier-ignore -->
- [ ] WF2-001 Create package directory structure
  - Create: `packages/workflow-engine/`
  - Create: `packages/workflow-engine/src/{types,parser,execution,checkpoint,storage,utils}`
  - Create: `packages/workflow-engine/tests/e2e/`
- [ ] WF2-002 Create package.json (copy from agent-cli-sdk and modify)
  - File: `packages/workflow-engine/package.json`
  - Name: `@repo/workflow-engine`
  - Version: `0.1.0`
  - Dependencies: yaml, simple-git
  - Peer dependencies: zod, @repo/agent-cli-sdk
  - Dev dependencies: Same as agent-cli-sdk
  - Scripts: build, dev, check, check-types, lint, format, test, test:watch, test:e2e
- [ ] WF2-003 Copy tsconfig.json from agent-cli-sdk
  - File: `packages/workflow-engine/tsconfig.json`
  - Exact copy, no modifications needed
- [ ] WF2-004 Copy vitest.config.ts from agent-cli-sdk
  - File: `packages/workflow-engine/vitest.config.ts`
  - Exact copy, no modifications needed
- [ ] WF2-005 Create vitest.e2e.config.ts
  - File: `packages/workflow-engine/vitest.e2e.config.ts`
  - Sequential execution (singleFork: true)
  - 180s timeout
  - Include only tests/e2e/**
- [ ] WF2-006 Install dependencies
  - Run: `cd packages/workflow-engine && pnpm install`
  - Expected: Dependencies installed successfully

#### Completion Notes

(To be filled in during implementation)

### Task Group 2: Type Definitions

<!-- prettier-ignore -->
- [ ] WF2-007 Create workflow types
  - File: `packages/workflow-engine/src/types/workflow.ts`
  - Define: WorkflowStatus, WorkflowConfig, WorkflowDefinition
  - Export all types
- [ ] WF2-008 Create step types
  - File: `packages/workflow-engine/src/types/step.ts`
  - Define: StepStatus, StepConfig (union), AgentStepConfig, ScriptStepConfig, FunctionStepConfig, StepResult
  - Export all types
- [ ] WF2-009 Create context types
  - File: `packages/workflow-engine/src/types/context.ts`
  - Define: WorkflowContext interface, ExecResult
  - Export all types
- [ ] WF2-010 Create types barrel export
  - File: `packages/workflow-engine/src/types/index.ts`
  - Export * from workflow, step, context
- [ ] WF2-011 Type check
  - Run: `cd packages/workflow-engine && pnpm check-types`
  - Expected: No type errors

#### Completion Notes

(To be filled in during implementation)

### Task Group 3: YAML Parser

<!-- prettier-ignore -->
- [ ] WF2-012 Implement YAML parser
  - File: `packages/workflow-engine/src/parser/yamlParser.ts`
  - Function: `parseYamlWorkflow(content: string): WorkflowDefinition`
  - Parse YAML using yaml package
  - Validate required fields
  - Handle template variables
- [ ] WF2-013 Write YAML parser unit tests
  - File: `packages/workflow-engine/src/parser/yamlParser.test.ts`
  - Test: Valid YAML workflow
  - Test: Missing required fields
  - Test: Invalid step types
  - Test: Template variable substitution
- [ ] WF2-014 Create parser barrel export
  - File: `packages/workflow-engine/src/parser/index.ts`
  - Export parseYamlWorkflow
- [ ] WF2-015 Run parser tests
  - Run: `cd packages/workflow-engine && pnpm test yamlParser`
  - Expected: All tests pass

#### Completion Notes

(To be filled in during implementation)

### Task Group 4: TypeScript Parser

<!-- prettier-ignore -->
- [ ] WF2-016 Implement TypeScript parser
  - File: `packages/workflow-engine/src/parser/codeParser.ts`
  - Function: `loadCodeWorkflow(filePath: string): Promise<WorkflowDefinition>`
  - Dynamic import of workflow file
  - Validate WorkflowConfig structure
  - Convert Zod schema to JSON schema
- [ ] WF2-017 Write TypeScript parser unit tests
  - File: `packages/workflow-engine/src/parser/codeParser.test.ts`
  - Test: Valid TypeScript workflow
  - Test: Missing required fields
  - Test: Zod schema conversion
- [ ] WF2-018 Update parser barrel export
  - File: `packages/workflow-engine/src/parser/index.ts`
  - Export loadCodeWorkflow
- [ ] WF2-019 Run parser tests
  - Run: `cd packages/workflow-engine && pnpm test codeParser`
  - Expected: All tests pass

#### Completion Notes

(To be filled in during implementation)

### Task Group 5: WorkflowContext Implementation

<!-- prettier-ignore -->
- [ ] WF2-020 Implement WorkflowContext class
  - File: `packages/workflow-engine/src/execution/WorkflowContext.ts`
  - Class: WorkflowContextImpl implements WorkflowContext
  - Constructor: executionId, projectPath, args, callbacks
  - Method: step() - Routes to agent/script/function
  - Method: executeAgentStep() - Use agent-cli-sdk
  - Method: executeScriptStep() - Use child_process
  - Method: executeFunctionStep() - Direct invocation
  - Method: checkpoint() - Delegate to CheckpointManager
  - Method: comment(), exec(), getStepResult()
- [ ] WF2-021 Write WorkflowContext unit tests
  - File: `packages/workflow-engine/src/execution/WorkflowContext.test.ts`
  - Test: Agent step execution (mock agent-cli-sdk)
  - Test: Script step execution
  - Test: Function step execution
  - Test: Error handling
  - Test: Callbacks invoked correctly
- [ ] WF2-022 Create execution barrel export
  - File: `packages/workflow-engine/src/execution/index.ts`
  - Export WorkflowContextImpl
- [ ] WF2-023 Run context tests
  - Run: `cd packages/workflow-engine && pnpm test WorkflowContext`
  - Expected: All tests pass

#### Completion Notes

(To be filled in during implementation)

### Task Group 6: WorkflowExecutor Implementation

<!-- prettier-ignore -->
- [ ] WF2-024 Implement WorkflowExecutor class
  - File: `packages/workflow-engine/src/execution/WorkflowExecutor.ts`
  - Class: WorkflowExecutor
  - Constructor: config with executionId, projectPath, args, callbacks, resumeFromCheckpoint
  - Method: execute() - Load definition, create context, execute workflow
  - Method: resume() - Load checkpoint, skip completed, continue
  - Private: loadWorkflowDefinition() - Load from filesystem
  - Private: executeSteps() - Iterate YAML steps
- [ ] WF2-025 Write WorkflowExecutor unit tests
  - File: `packages/workflow-engine/src/execution/WorkflowExecutor.test.ts`
  - Test: Execute code workflow
  - Test: Execute YAML workflow
  - Test: Resume from checkpoint
  - Test: Error handling
  - Test: Callbacks invoked correctly
- [ ] WF2-026 Update execution barrel export
  - File: `packages/workflow-engine/src/execution/index.ts`
  - Export WorkflowExecutor
- [ ] WF2-027 Run executor tests
  - Run: `cd packages/workflow-engine && pnpm test WorkflowExecutor`
  - Expected: All tests pass

#### Completion Notes

(To be filled in during implementation)

### Task Group 7: CheckpointManager Implementation

<!-- prettier-ignore -->
- [ ] WF2-028 Implement CheckpointManager class
  - File: `packages/workflow-engine/src/checkpoint/CheckpointManager.ts`
  - Class: CheckpointManager
  - Constructor: executionId, basePath
  - Method: save(checkpoint) - Save to filesystem as JSON
  - Method: load() - Load latest checkpoint
  - Private: getCheckpointPath(stepIndex) - Build path
  - Interface: Checkpoint with execution_id, timestamp, current_phase, current_step_index, completed_step_ids, step_results
- [ ] WF2-029 Write CheckpointManager unit tests
  - File: `packages/workflow-engine/src/checkpoint/CheckpointManager.test.ts`
  - Test: Save checkpoint
  - Test: Load checkpoint
  - Test: Load returns null if no checkpoints
  - Test: Multiple checkpoints (load latest)
- [ ] WF2-030 Create checkpoint barrel export
  - File: `packages/workflow-engine/src/checkpoint/index.ts`
  - Export CheckpointManager, Checkpoint
- [ ] WF2-031 Run checkpoint tests
  - Run: `cd packages/workflow-engine && pnpm test CheckpointManager`
  - Expected: All tests pass

#### Completion Notes

(To be filled in during implementation)

### Task Group 8: FileSystemStorage Implementation

<!-- prettier-ignore -->
- [ ] WF2-032 Implement FileSystemStorage class
  - File: `packages/workflow-engine/src/storage/FileSystemStorage.ts`
  - Class: FileSystemStorage
  - Constructor: executionId, projectPath
  - Method: initialize() - Create directory structure
  - Method: saveLog(stepId, type, content) - Save step log
  - Method: saveArtifact(stepId, filename, content) - Save artifact
  - Method: createLogDirectory(stepId) - Create logs dir
- [ ] WF2-033 Write FileSystemStorage unit tests
  - File: `packages/workflow-engine/src/storage/FileSystemStorage.test.ts`
  - Test: Initialize creates directories
  - Test: Save log file
  - Test: Save artifact file
  - Test: Create log directory
- [ ] WF2-034 Create storage barrel export
  - File: `packages/workflow-engine/src/storage/index.ts`
  - Export FileSystemStorage
- [ ] WF2-035 Run storage tests
  - Run: `cd packages/workflow-engine && pnpm test FileSystemStorage`
  - Expected: All tests pass

#### Completion Notes

(To be filled in during implementation)

### Task Group 9: Package Export & Build

<!-- prettier-ignore -->
- [ ] WF2-036 Create main package export
  - File: `packages/workflow-engine/src/index.ts`
  - Export types from types/
  - Export parsers from parser/
  - Export WorkflowExecutor, WorkflowContextImpl from execution/
  - Export CheckpointManager from checkpoint/
  - Export FileSystemStorage from storage/
- [ ] WF2-037 Build package
  - Run: `cd packages/workflow-engine && pnpm build`
  - Expected: dist/ directory created with index.js and index.d.ts
- [ ] WF2-038 Type check entire package
  - Run: `cd packages/workflow-engine && pnpm check-types`
  - Expected: No type errors
- [ ] WF2-039 Lint package
  - Run: `cd packages/workflow-engine && pnpm lint`
  - Expected: No lint errors
- [ ] WF2-040 Run all unit tests
  - Run: `cd packages/workflow-engine && pnpm test`
  - Expected: All unit tests pass

#### Completion Notes

(To be filled in during implementation)

### Task Group 10: E2E Tests

<!-- prettier-ignore -->
- [ ] WF2-041 Write basic execution E2E test
  - File: `packages/workflow-engine/tests/e2e/basic-execution.test.ts`
  - Test: Create simple workflow, execute end-to-end
  - Test: Verify step results
  - Test: Verify callbacks invoked
- [ ] WF2-042 Write checkpoint/resume E2E test
  - File: `packages/workflow-engine/tests/e2e/checkpoint-resume.test.ts`
  - Test: Execute workflow partially
  - Test: Save checkpoint
  - Test: Resume from checkpoint
  - Test: Verify skipped completed steps
- [ ] WF2-043 Write agent integration E2E test
  - File: `packages/workflow-engine/tests/e2e/agent-integration.test.ts`
  - Test: Execute agent step via agent-cli-sdk
  - Test: Verify agent session created
  - Test: Verify agent output
- [ ] WF2-044 Run E2E tests
  - Run: `cd packages/workflow-engine && pnpm test:e2e`
  - Expected: All E2E tests pass (sequential, 180s timeout)

#### Completion Notes

(To be filled in during implementation)

### Task Group 11: Documentation

<!-- prettier-ignore -->
- [ ] WF2-045 Write README.md
  - File: `packages/workflow-engine/README.md`
  - Package overview
  - Installation instructions
  - Usage examples (TypeScript and YAML workflows)
  - API reference
- [ ] WF2-046 Write CLAUDE.md
  - File: `packages/workflow-engine/CLAUDE.md`
  - Following agent-cli-sdk pattern
  - Essential commands (build, test, check)
  - Architecture overview
  - Key patterns (file naming, co-located tests, barrel exports)
  - Testing strategy
  - TypeScript configuration notes
- [ ] WF2-047 Write CHANGELOG.md
  - File: `packages/workflow-engine/CHANGELOG.md`
  - Version 0.1.0 initial release

#### Completion Notes

(To be filled in during implementation)

### Task Group 12: Web App Integration

<!-- prettier-ignore -->
- [ ] WF2-048 Add workflow-engine dependency to web app
  - File: `apps/web/package.json`
  - Add: `"@repo/workflow-engine": "workspace:*"`
  - Run: `cd apps/web && pnpm install`
- [ ] WF2-049 Update executeWorkflow service
  - File: `apps/web/src/server/domain/workflow/services/executeWorkflow.ts`
  - Remove stub implementation
  - Import WorkflowExecutor from @repo/workflow-engine
  - Instantiate with callbacks for DB updates and WebSocket events
  - Call executor.execute()
- [ ] WF2-050 Update resumeWorkflow service
  - File: `apps/web/src/server/domain/workflow/services/resumeWorkflow.ts`
  - Remove stub implementation
  - Import WorkflowExecutor
  - Instantiate with resumeFromCheckpoint=true
  - Call executor.resume()
- [ ] WF2-051 Test web app integration
  - Run: `cd apps/web && pnpm check-types`
  - Expected: No type errors
  - Run: `cd apps/web && pnpm build`
  - Expected: Clean build

#### Completion Notes

(To be filled in during implementation)

### Task Group 13: Final Validation

<!-- prettier-ignore -->
- [ ] WF2-052 Build entire monorepo
  - Run: `pnpm build` (from root)
  - Expected: All packages build successfully
- [ ] WF2-053 Type check entire monorepo
  - Run: `pnpm check-types` (from root)
  - Expected: No type errors
- [ ] WF2-054 Lint entire monorepo
  - Run: `pnpm lint` (from root)
  - Expected: No lint errors
- [ ] WF2-055 Run all workflow-engine tests
  - Run: `cd packages/workflow-engine && pnpm check`
  - Expected: All unit + E2E tests pass

#### Completion Notes

(To be filled in during implementation)

## Testing Strategy

### Unit Tests (Co-located with Source)

Following agent-cli-sdk pattern:

**Parser Tests**:

- `src/parser/yamlParser.test.ts` - Parse valid/invalid YAML, template variables
- `src/parser/codeParser.test.ts` - Parse valid/invalid TypeScript, Zod schema conversion

**Execution Tests**:

- `src/execution/WorkflowContext.test.ts` - Step execution (agent/script/function), callbacks, error handling
- `src/execution/WorkflowExecutor.test.ts` - Execute/resume workflows, load definitions, error handling

**Checkpoint Tests**:

- `src/checkpoint/CheckpointManager.test.ts` - Save/load checkpoints, multiple checkpoints

**Storage Tests**:

- `src/storage/FileSystemStorage.test.ts` - Initialize directories, save logs/artifacts

### E2E Tests (Sequential Execution)

**`tests/e2e/basic-execution.test.ts`**:

```typescript
describe('Basic Workflow Run', () => {
  it('should execute simple YAML workflow', async () => {
    const yaml = `
      name: Test Workflow
      phases: [test]
      steps:
        - id: echo-test
          phase: test
          type: script
          command: echo "test"
    `;
    const definition = parseYamlWorkflow(yaml);
    const executor = new WorkflowExecutor({ ... });
    await executor.execute();
    // Assert callbacks called, steps completed
  });
});
```

**`tests/e2e/checkpoint-resume.test.ts`**:

```typescript
describe("Checkpoint and Resume", () => {
  it("should save checkpoint and resume", async () => {
    // Execute workflow partially
    // Save checkpoint
    // Create new executor with resumeFromCheckpoint=true
    // Resume execution
    // Verify skipped completed steps
  });
});
```

**`tests/e2e/agent-integration.test.ts`**:

```typescript
describe("Agent Integration", () => {
  it("should execute agent step via agent-cli-sdk", async () => {
    // Mock agent-cli-sdk
    // Execute workflow with agent step
    // Verify agent called with correct params
  });
});
```

## Success Criteria

- [ ] Package structure matches agent-cli-sdk conventions (camelCase files, co-located tests, barrel exports)
- [ ] All unit tests co-located with source files
- [ ] E2E tests run sequentially with 180s timeout
- [ ] TypeScript strict mode enabled with same config as agent-cli-sdk
- [ ] Bunchee build outputs ESM with type declarations
- [ ] Can parse YAML workflows with template variables
- [ ] Can parse TypeScript workflows with Zod schemas
- [ ] Can execute agent steps via @repo/agent-cli-sdk integration
- [ ] Can execute script steps via child_process
- [ ] Can execute function steps directly
- [ ] Checkpoint save/restore works correctly
- [ ] Resume skips completed steps
- [ ] FileSystemStorage creates correct directory structure
- [ ] Web app stubs replaced with WorkflowExecutor
- [ ] All tests pass (unit + E2E)
- [ ] Documentation complete (README, CLAUDE.md, CHANGELOG)
- [ ] No type errors, no lint errors
- [ ] Clean monorepo build

## Validation

**Automated Verification:**

```bash
# Build verification
cd packages/workflow-engine && pnpm build
# Expected: dist/ created with index.js, index.d.ts, declaration maps, source maps

# Type checking
cd packages/workflow-engine && pnpm check-types
# Expected: No type errors

# Linting
cd packages/workflow-engine && pnpm lint
# Expected: No lint errors

# Unit tests
cd packages/workflow-engine && pnpm test
# Expected: All unit tests pass

# E2E tests
cd packages/workflow-engine && pnpm test:e2e
# Expected: All E2E tests pass (sequential, 180s timeout)

# Full check
cd packages/workflow-engine && pnpm check
# Expected: Lint, type-check, and all tests pass

# Monorepo build
cd ../.. && pnpm build
# Expected: All packages build successfully

# Monorepo type check
pnpm check-types
# Expected: No type errors across monorepo
```

**Manual Verification:**

1. Verify package structure matches agent-cli-sdk
2. Check all unit tests co-located with source files
3. Verify tsconfig.json is exact copy from agent-cli-sdk
4. Check package.json follows agent-cli-sdk conventions
5. Verify E2E tests run sequentially (singleFork: true)
6. Check dist/ output includes .js, .d.ts, .d.ts.map, .js.map files
7. Verify README, CLAUDE.md, CHANGELOG exist and are complete

**Feature-Specific Checks:**

- Create simple YAML workflow and verify it parses
- Create TypeScript workflow and verify it parses
- Execute workflow with script step and verify output
- Execute workflow with checkpoint and verify file created
- Resume workflow from checkpoint and verify skips completed steps
- Verify web app executeWorkflow service uses WorkflowExecutor
- Verify web app resumeWorkflow service uses WorkflowExecutor
- Check no stub implementations remain in web app

## Implementation Notes

### 1. File Naming Conventions

Following agent-cli-sdk:

- **camelCase** for all files: `yamlParser.ts`, `WorkflowContext.ts`, `loadSession.ts`
- **PascalCase** for classes: `WorkflowExecutor`, `CheckpointManager`, `FileSystemStorage`
- **One primary export per file**: File name matches primary export
- **Co-located tests**: `yamlParser.test.ts` next to `yamlParser.ts`

### 2. Barrel Exports

Each subdirectory has `index.ts` for clean imports:

```typescript
// packages/workflow-engine/src/execution/index.ts
export { WorkflowExecutor } from "./WorkflowExecutor";
export { WorkflowContextImpl } from "./WorkflowContext";
```

Usage:

```typescript
import { WorkflowExecutor } from "@repo/workflow-engine";
// or
import { WorkflowExecutor } from "@repo/workflow-engine/execution";
```

### 3. Agent-CLI-SDK Integration

Agent steps use peer dependency:

```typescript
import {
  executeClaude,
  executeCodex,
  executeGemini,
} from "@repo/agent-cli-sdk";

// In WorkflowContext
const executeAgent =
  config.agent === "claude"
    ? executeClaude
    : config.agent === "codex"
      ? executeCodex
      : executeGemini;

const result = await executeAgent(prompt, {
  cwd: this.projectPath,
  permissionMode: config.permission || "default",
});
```

### 4. Error Handling

Use try/catch in context methods, return StepResult with error:

```typescript
try {
  const data = await executeAgent(prompt, options);
  return { stepId, status: "completed", data };
} catch (error) {
  return {
    stepId,
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
  };
}
```

### 5. Checkpoint Format

JSON structure saved to filesystem:

```json
{
  "execution_id": "cuid",
  "timestamp": "2025-01-02T10:05:00Z",
  "current_phase": "implement",
  "current_step_index": 2,
  "completed_step_ids": ["research", "plan"],
  "step_results": {
    "research": { "stepId": "research", "status": "completed", "data": {...} }
  }
}
```

## Dependencies

**Production**:

- `yaml` - YAML parsing for workflow definitions
- `simple-git` - Git operations (already in monorepo)

**Peer Dependencies**:

- `zod` - Schema validation (optional peer dependency)
- `@repo/agent-cli-sdk` - Agent execution (workspace peer dependency)

**Development** (Same as agent-cli-sdk):

- `typescript` - Type checking
- `bunchee` - Build tool
- `vitest` - Test runner
- `eslint` - Linting
- `prettier` - Formatting
- `tsx` - TypeScript execution

## Timeline

| Task                               | Estimated Time |
| ---------------------------------- | -------------- |
| Task Group 1: Package Setup        | 2 hours        |
| Task Group 2: Type Definitions     | 3 hours        |
| Task Group 3: YAML Parser          | 6 hours        |
| Task Group 4: TypeScript Parser    | 5 hours        |
| Task Group 5: WorkflowContext      | 8 hours        |
| Task Group 6: WorkflowExecutor     | 8 hours        |
| Task Group 7: CheckpointManager    | 5 hours        |
| Task Group 8: FileSystemStorage    | 4 hours        |
| Task Group 9: Package Export       | 2 hours        |
| Task Group 10: E2E Tests           | 6 hours        |
| Task Group 11: Documentation       | 2 hours        |
| Task Group 12: Web App Integration | 4 hours        |
| Task Group 13: Final Validation    | 2 hours        |
| **Total**                          | **57 hours**   |

## References

- **Phase 1 Spec**: `.agent/specs/todo/37-workflow-phase-1-db-endpoints-spec.md`
- **Overall Design**: `.agent/specs/todo/36-workflow-design-attempt-3-spec.md`
- **Reference Package**: `packages/agent-cli-sdk/` (structure, conventions, tooling)
- **Agent CLI SDK Docs**: `packages/agent-cli-sdk/CLAUDE.md`
- **Web App Backend Guide**: `apps/web/src/server/CLAUDE.md`

## Next Steps

1. Create `packages/workflow-engine/` directory
2. Copy package.json, tsconfig.json, vitest configs from agent-cli-sdk
3. Install dependencies
4. Implement type definitions
5. Build YAML parser with tests
6. Build TypeScript parser with tests
7. Implement WorkflowContext with agent-cli-sdk integration
8. Implement WorkflowExecutor
9. Build CheckpointManager
10. Build FileSystemStorage
11. Write E2E tests
12. Write documentation
13. Integrate with web app (remove stubs)
14. Run full validation

---

**Ready to implement with: `/implement-spec 38`**
