# Workflow Engine Documentation

**Status**: In Development (Phase 1 Complete)
**Last Updated**: 2025-01-25
**Version**: 1.0.0

## Overview

The Workflow Engine is a hybrid code/YAML workflow orchestration system for managing AI agent tasks with kanban visualization. It enables developers to define reusable workflow templates and execute them as tasks that progress through user-defined phases, with full state persistence, checkpoint/resume capability, and real-time monitoring.

## Goals

### Primary Goals

1. **Flexible Workflow Definition**: Support both TypeScript (for complex logic) and YAML (for simple pipelines) workflow definitions
2. **Durable Execution**: Persist execution state to enable pause/resume across system restarts
3. **Real-Time Monitoring**: Provide live updates on workflow progress via WebSocket events
4. **AI Agent Integration**: Seamlessly integrate with AI CLI tools (Claude, Codex, Gemini) via `@repo/agent-cli-sdk`
5. **Kanban Visualization**: Track workflow runs on a visual kanban board grouped by phase
6. **Rich Context**: Support comments and artifacts at both workflow and step levels
7. **Developer Experience**: Simple API for defining workflows, intuitive UI for monitoring

### Secondary Goals

- Resume workflows from any checkpoint (failure recovery)
- Link workflow steps to full agent session logs (JSONL files)
- Support artifact uploads (screenshots, videos, documents, code)
- Enable collaborative workflows with multi-user comments
- Provide detailed step logging (input, output, events, summary)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Application                          │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ Kanban Board   │  │  Step Details  │  │  Templates Page  │  │
│  │  (React UI)    │  │    (Modals)    │  │   (React UI)     │  │
│  └───────┬────────┘  └───────┬────────┘  └────────┬──────────┘  │
│          │                   │                     │              │
│          └───────────────────┼─────────────────────┘              │
│                              │                                    │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │              Fastify API + WebSocket Server              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │   │
│  │  │  Routes    │  │  Domain    │  │  WebSocket Events  │ │   │
│  │  │ /workflows │  │  Services  │  │  workflow.*        │ │   │
│  │  └─────┬──────┘  └─────┬──────┘  └──────────┬─────────┘ │   │
│  │        │               │                     │           │   │
│  │        └───────────────┼─────────────────────┘           │   │
│  │                        │                                 │   │
│  │  ┌─────────────────────▼──────────────────────────────┐ │   │
│  │  │               Prisma ORM                           │ │   │
│  │  │  ┌───────────────────────────────────────────┐    │ │   │
│  │  │  │  SQLite Database                          │    │ │   │
│  │  │  │  - WorkflowDefinition (templates)         │    │ │   │
│  │  │  │  - WorkflowRun (task instances)     │    │ │   │
│  │  │  │  - WorkflowRunStep (step tracking)  │    │ │   │
│  │  │  │  - WorkflowComment (annotations)          │    │ │   │
│  │  │  │  - WorkflowArtifact (file metadata)       │    │ │   │
│  │  │  └───────────────────────────────────────────┘    │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              @repo/workflow-engine Package                       │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │    Parsers     │  │    Executor    │  │  Checkpoint Mgr  │  │
│  │  - YAML        │  │ - Context API  │  │  - Save/Restore  │  │
│  │  - TypeScript  │  │ - Step Loop    │  │  - Skip Complete │  │
│  └────────┬───────┘  └────────┬───────┘  └────────┬─────────┘  │
│           │                   │                    │             │
│           └───────────────────┼────────────────────┘             │
│                               │                                  │
│  ┌────────────────────────────▼───────────────────────────────┐ │
│  │          Filesystem Storage (.agent/workflows)            │ │
│  │  - definitions/         (workflow templates)              │ │
│  │  - executions/{id}/     (per-execution data)              │ │
│  │    - checkpoints/       (state snapshots)                 │ │
│  │    - artifacts/         (uploaded files)                  │ │
│  │    - logs/              (step logs)                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                @repo/agent-cli-sdk Package                       │
│  Execute AI agent steps (Claude, Codex, Gemini)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Strategy

The system uses a hybrid storage approach:

| Data Type                                   | Storage Location | Rationale                     |
| ------------------------------------------- | ---------------- | ----------------------------- |
| Execution state (status, phase, step index) | Database         | Fast queries for kanban board |
| Step status, error messages                 | Database         | Quick filtering/sorting       |
| Artifact metadata (name, size, type)        | Database         | Fast queries                  |
| Comments (text, timestamps)                 | Database         | Fast queries with relations   |
| Workflow template files                     | Filesystem       | Source code/YAML files        |
| Artifact files (images, videos)             | Filesystem       | Large binary data             |
| Step logs (input, output, events)           | Filesystem       | Large text data, streaming    |
| Checkpoints                                 | Filesystem       | Immutable snapshots           |

### Key Patterns

1. **Template vs Execution Separation**
   - `WorkflowDefinition` = reusable template (blueprint)
   - `WorkflowRun` = specific run with arguments (task instance)
   - One template can be executed many times with different inputs

2. **Phase-Based Organization**
   - Workflows divided into user-defined phases (e.g., "research", "implement", "test")
   - Kanban board columns = phases
   - Executions move through phases as they progress

3. **Step-Based Execution**
   - Workflows composed of sequential steps
   - Each step can be: agent call, script, or function
   - Steps tracked individually for granular progress monitoring

4. **Artifact-Comment Relationships**
   - Artifacts always belong to a step (ownership)
   - Artifacts can optionally be attached to comments (annotation)
   - Comments can be workflow-level or step-level

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────┐
│  WorkflowDefinition     │
│  (Template)             │
├─────────────────────────┤
│ id: String (PK)         │
│ name: String            │
│ description: String?    │
│ type: String            │ (code/yaml)
│ path: String            │ (filesystem path)
│ phases: Json            │ (array of phase names)
│ args_schema: Json?      │ (JSON schema)
│ is_template: Boolean    │
│ created_at: DateTime    │
│ updated_at: DateTime    │
└──────────┬──────────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────────┐
│  WorkflowRun      │
│  (Task Instance)        │
├─────────────────────────┤
│ id: String (PK)         │
│ project_id: String (FK) │───────┐
│ user_id: String (FK)    │───┐   │
│ workflow_definition_id  │   │   │
│ name: String            │   │   │
│ args: Json              │   │   │
│ current_phase: String?  │   │   │
│ current_step_index: Int │   │   │
│ status: String          │   │   │ (pending/running/paused/completed/failed/cancelled)
│ error_message: String?  │   │   │
│ started_at: DateTime?   │   │   │
│ completed_at: DateTime? │   │   │
│ paused_at: DateTime?    │   │   │
│ cancelled_at: DateTime? │   │   │
│ created_at: DateTime    │   │   │
│ updated_at: DateTime    │   │   │
└──────────┬──────────────┘   │   │
           │                  │   │
           │ 1:N              │   │
           │                  │   │
           ▼                  │   │
┌─────────────────────────┐   │   │
│ WorkflowRunStep   │   │   │
│ (Step Instance)         │   │   │
├─────────────────────────┤   │   │
│ id: String (PK)         │   │   │
│ workflow_run_id   │   │   │
│ step_id: String         │   │   │ (identifier from template)
│ name: String            │   │   │
│ phase: String           │   │   │
│ status: String          │   │   │ (pending/running/completed/failed/skipped)
│ log_directory_path: Str?│   │   │
│ agent_session_id: Str?  │───┼───┼──┐ (nullable - only for agent steps)
│ error_message: String?  │   │   │  │
│ started_at: DateTime?   │   │   │  │
│ completed_at: DateTime? │   │   │  │
│ created_at: DateTime    │   │   │  │
│ updated_at: DateTime    │   │   │  │
└──────────┬──────────────┘   │   │  │
           │                  │   │  │
           │ 1:N              │   │  │
           │                  │   │  │
           ▼                  │   │  │
┌─────────────────────────┐   │   │  │
│  WorkflowArtifact       │   │   │  │
│  (File Metadata)        │   │   │  │
├─────────────────────────┤   │   │  │
│ id: String (PK)         │   │   │  │
│ workflow_execution_     │   │   │  │
│   step_id: String (FK)  │   │   │  │
│ workflow_comment_id: ?  │───┼───┼──┼──┐
│ name: String            │   │   │  │  │
│ file_path: String       │   │   │  │  │ (relative to project root)
│ file_type: String       │   │   │  │  │ (image/video/document/code/other)
│ mime_type: String       │   │   │  │  │
│ size_bytes: Int         │   │   │  │  │
│ created_at: DateTime    │   │   │  │  │
│ updated_at: DateTime    │   │   │  │  │
└─────────────────────────┘   │   │  │  │
                              │   │  │  │
┌─────────────────────────┐   │   │  │  │
│  WorkflowComment        │   │   │  │  │
│  (Annotations)          │   │   │  │  │
├─────────────────────────┤   │   │  │  │
│ id: String (PK)         │◄──┘   │  │  │
│ workflow_run_id   │       │  │  │
│ workflow_execution_     │       │  │  │
│   step_id: String? (FK) │       │  │  │
│ text: String            │       │  │  │
│ comment_type: String    │       │  │  │ (user/system/agent)
│ created_by: String (FK) │───────┘  │  │
│ created_at: DateTime    │          │  │
│ updated_at: DateTime    │          │  │
└─────────────────────────┘          │  │
                                     │  │
┌─────────────────────────┐          │  │
│  Project                │◄─────────┘  │
├─────────────────────────┤             │
│ id: String (PK)         │             │
│ ...existing fields...   │             │
└─────────────────────────┘             │
                                        │
┌─────────────────────────┐             │
│  User                   │◄────────────┘
├─────────────────────────┤
│ id: String (PK)         │
│ ...existing fields...   │
└─────────────────────────┘

┌─────────────────────────┐
│  AgentSession           │◄─── Bidirectional relation
├─────────────────────────┤     (links agent steps to full logs)
│ id: String (PK)         │
│ ...existing fields...   │
│ workflowSteps: [...]    │ (new relation)
└─────────────────────────┘
```

### Status Enums

**WorkflowRun.status:**

- `pending` - Created but not started
- `running` - Currently executing
- `paused` - Temporarily stopped (can resume)
- `completed` - Finished successfully
- `failed` - Finished with error
- `cancelled` - Stopped by user

**WorkflowRunStep.status:**

- `pending` - Not started yet
- `running` - Currently executing
- `completed` - Finished successfully
- `failed` - Finished with error
- `skipped` - Skipped (conditional logic)

**WorkflowComment.comment_type:**

- `user` - User-created comment
- `system` - Auto-generated system message
- `agent` - AI agent-generated comment

**WorkflowArtifact.file_type:**

- `image` - Image files (png, jpg, gif, etc.)
- `video` - Video files (mp4, webm, etc.)
- `document` - Documents (pdf, docx, etc.)
- `code` - Code files (ts, py, etc.)
- `other` - Other file types

## Workflow Engine Package (@repo/workflow-engine)

### Package Structure

```
packages/workflow-engine/
├── src/
│   ├── parser/
│   │   ├── CodeParser.ts           # Parse TypeScript workflows
│   │   ├── YamlParser.ts           # Parse YAML workflows
│   │   └── WorkflowDefinition.ts   # Unified workflow model
│   ├── execution/
│   │   ├── WorkflowContext.ts      # Execution context API
│   │   ├── WorkflowExecutor.ts     # Main execution engine
│   │   └── CheckpointManager.ts    # Checkpoint save/restore
│   ├── storage/
│   │   └── FileSystemStorage.ts    # File operations
│   ├── types/
│   │   ├── workflow.ts             # Workflow types
│   │   ├── step.ts                 # Step types
│   │   └── context.ts              # Context types
│   └── index.ts                    # Package exports
├── tests/
│   ├── parser.test.ts
│   ├── executor.test.ts
│   └── checkpoint.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Key Interfaces

```typescript
// Workflow definition (unified model from parsers)
interface WorkflowDefinition {
  name: string;
  description?: string;
  phases: string[]; // e.g., ["research", "implement", "test"]
  argsSchema?: JSONSchema; // JSON schema for validation
  steps: StepConfig[];
}

// Step configuration
type StepConfig = AgentStepConfig | FunctionStepConfig | ScriptStepConfig;

interface AgentStepConfig {
  id: string;
  name: string;
  phase: string;
  type: "agent";
  agent: "claude" | "codex" | "gemini";
  prompt: string | ((ctx: WorkflowContext) => string);
  permission?: "default" | "plan" | "acceptEdits" | "bypassPermissions";
}

interface ScriptStepConfig {
  id: string;
  name: string;
  phase: string;
  type: "script";
  command: string;
  cwd?: string;
}

interface FunctionStepConfig {
  id: string;
  name: string;
  phase: string;
  type: "function";
  fn: (ctx: WorkflowContext) => Promise<any>;
}

// Workflow run context
interface WorkflowContext {
  runId: string;
  projectPath: string;
  args: Record<string, any>;

  // Step execution
  step(stepId: string, config: StepConfig): Promise<StepResult>;

  // Checkpointing
  checkpoint(): Promise<void>;

  // Utilities
  comment(text: string, stepId?: string): Promise<void>;
  exec(command: string, cwd?: string): Promise<ExecResult>;
  getStepResult(stepId: string): StepResult | undefined;
}

// Step result
interface StepResult {
  stepId: string;
  status: "completed" | "failed" | "skipped";
  data?: any;
  error?: string;
}

// Checkpoint format
interface Checkpoint {
  execution_id: string;
  timestamp: string;
  current_phase: string;
  current_step_index: number;
  completed_step_ids: string[];
  step_results: Record<string, StepResult>;
}
```

### Usage Examples

**TypeScript Workflow Definition:**

```typescript
// .agent/workflows/definitions/implement-feature.ts
import { defineWorkflow } from "@repo/workflow-engine";
import { z } from "zod";

export default defineWorkflow({
  name: "Implement Feature",
  description: "Research, plan, implement, and test a new feature",

  argsSchema: z.object({
    featureName: z.string(),
    requirements: z.string(),
  }),

  phases: ["research", "plan", "implement", "test"],

  async execute(ctx) {
    // Research phase
    const researchResult = await ctx.step("research-codebase", {
      phase: "research",
      type: "agent",
      agent: "claude",
      prompt: `Research the codebase to understand how to implement: ${ctx.args.featureName}`,
      permission: "plan",
    });

    await ctx.checkpoint();

    // Plan phase
    const planResult = await ctx.step("create-spec", {
      phase: "plan",
      type: "agent",
      agent: "claude",
      prompt: `Create a spec for implementing ${ctx.args.featureName}. Requirements: ${ctx.args.requirements}`,
      permission: "acceptEdits",
    });

    await ctx.checkpoint();

    // Implement phase
    const implementResult = await ctx.step("implement", {
      phase: "implement",
      type: "agent",
      agent: "claude",
      prompt: `Implement the feature according to the spec in the previous step.`,
      permission: "acceptEdits",
    });

    await ctx.checkpoint();

    // Test phase
    await ctx.step("run-tests", {
      phase: "test",
      type: "script",
      command: "pnpm test",
      cwd: ctx.projectPath,
    });

    await ctx.step("build", {
      phase: "test",
      type: "script",
      command: "pnpm build",
      cwd: ctx.projectPath,
    });

    await ctx.comment("Feature implementation complete!");
  },
});
```

**YAML Workflow Definition:**

```yaml
# .agent/workflows/definitions/simple-pipeline.yaml
name: Simple Build Pipeline
description: Build, test, and deploy

argsSchema:
  type: object
  properties:
    environment:
      type: string
      enum: [dev, staging, production]
  required: [environment]

phases:
  - build
  - test
  - deploy

steps:
  - id: install-deps
    name: Install Dependencies
    phase: build
    type: script
    command: pnpm install

  - id: build-app
    name: Build Application
    phase: build
    type: script
    command: pnpm build

  - id: run-tests
    name: Run Tests
    phase: test
    type: script
    command: pnpm test

  - id: deploy
    name: Deploy
    phase: deploy
    type: script
    command: pnpm deploy --env {{ args.environment }}
```

## API Endpoints

### Workflow Run Endpoints

#### `POST /api/workflow-executions`

Create and start a workflow run.

**Request:**

```json
{
  "project_id": "cuid",
  "workflow_definition_id": "cuid",
  "name": "Implement authentication",
  "args": {
    "featureName": "User authentication",
    "requirements": "JWT-based auth with refresh tokens"
  }
}
```

**Response (201):**

```json
{
  "data": {
    "id": "cuid",
    "project_id": "cuid",
    "user_id": "cuid",
    "workflow_definition_id": "cuid",
    "name": "Implement authentication",
    "args": { "featureName": "...", "requirements": "..." },
    "current_phase": "research",
    "current_step_index": 0,
    "status": "pending",
    "created_at": "2025-01-25T10:00:00Z",
    "updated_at": "2025-01-25T10:00:00Z"
  }
}
```

#### `GET /api/workflow-executions?project_id={id}&status={status}`

List workflow runs for a project.

**Response (200):**

```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Implement authentication",
      "status": "running",
      "current_phase": "implement",
      "started_at": "2025-01-25T10:00:00Z",
      "steps": [...],
      "workflow_definition": {...},
      "_count": {
        "comments": 3,
        "artifacts": 2
      }
    }
  ]
}
```

#### `GET /api/workflow-executions/:id`

Get detailed execution information.

**Response (200):**

```json
{
  "data": {
    "id": "cuid",
    "name": "Implement authentication",
    "status": "running",
    "current_phase": "implement",
    "current_step_index": 2,
    "steps": [
      {
        "id": "cuid",
        "step_id": "research-codebase",
        "name": "Research codebase",
        "phase": "research",
        "status": "completed",
        "started_at": "2025-01-25T10:00:00Z",
        "completed_at": "2025-01-25T10:05:00Z",
        "session": {...}  // AgentSession if agent step
      }
    ],
    "comments": [...],
    "workflow_definition": {...}
  }
}
```

#### `POST /api/workflow-executions/:id/pause`

Pause a running workflow.

**Response (200):**

```json
{
  "data": {
    "id": "cuid",
    "status": "paused",
    "paused_at": "2025-01-25T10:30:00Z"
  }
}
```

#### `POST /api/workflow-executions/:id/resume`

Resume a paused workflow.

**Response (200):**

```json
{
  "data": {
    "id": "cuid",
    "status": "running"
  }
}
```

#### `POST /api/workflow-executions/:id/cancel`

Cancel a workflow.

**Response (200):**

```json
{
  "data": {
    "id": "cuid",
    "status": "cancelled",
    "cancelled_at": "2025-01-25T10:35:00Z"
  }
}
```

### Step Endpoints

#### `GET /api/workflow-steps/:id`

Get step details including agent session.

**Response (200):**

```json
{
  "data": {
    "id": "cuid",
    "step_id": "research-codebase",
    "name": "Research codebase",
    "phase": "research",
    "status": "completed",
    "log_directory_path": ".agent/workflows/executions/{id}/logs/research-codebase",
    "session": {...},  // AgentSession if agent step
    "artifacts": [...],
    "comments": [...]
  }
}
```

#### `GET /api/workflow-steps/:id/logs/:type`

Stream step logs (input/output/events/summary).

**Path Params:**

- `type`: `input` | `output` | `events` | `summary`

**Response (200):**

```json
{
  "data": {
    "type": "output",
    "step_id": "cuid",
    "content": "..." // Log content
  }
}
```

### Artifact Endpoints

#### `POST /api/workflow-executions/:id/artifacts`

Upload an artifact (multipart form).

**Request:** Multipart form with:

- `file`: File (max 100MB)
- `step_id`: string
- `name`: string (optional, defaults to filename)
- `file_type`: `image` | `video` | `document` | `code` | `other`

**Response (201):**

```json
{
  "data": {
    "id": "cuid",
    "workflow_run_step_id": "cuid",
    "name": "screenshot.png",
    "file_path": ".agent/workflows/executions/{id}/artifacts/{stepId}/screenshot.png",
    "file_type": "image",
    "mime_type": "image/png",
    "size_bytes": 102400,
    "created_at": "2025-01-25T10:40:00Z"
  }
}
```

#### `GET /api/artifacts/:id`

Download an artifact.

**Response (200):** File stream with appropriate headers

#### `PATCH /api/artifacts/:id/attach`

Attach artifact to a comment.

**Request:**

```json
{
  "comment_id": "cuid"
}
```

**Response (200):**

```json
{
  "data": {
    "id": "cuid",
    "workflow_comment_id": "cuid",
    ...
  }
}
```

#### `DELETE /api/artifacts/:id/detach`

Detach artifact from comment.

**Response (200):**

```json
{
  "data": {
    "id": "cuid",
    "workflow_comment_id": null,
    ...
  }
}
```

### Comment Endpoints

#### `POST /api/workflow-executions/:id/comments`

Create a comment.

**Request:**

```json
{
  "text": "This step looks good!",
  "step_id": "cuid", // Optional - for step-level comments
  "comment_type": "user" // Optional, defaults to 'user'
}
```

**Response (201):**

```json
{
  "data": {
    "id": "cuid",
    "workflow_run_id": "cuid",
    "workflow_run_step_id": "cuid",
    "text": "This step looks good!",
    "comment_type": "user",
    "created_by": "cuid",
    "created_at": "2025-01-25T10:45:00Z",
    "creator": {...}
  }
}
```

#### `GET /api/workflow-executions/:id/comments?step_id={id}`

List comments.

**Response (200):**

```json
{
  "data": [
    {
      "id": "cuid",
      "text": "This step looks good!",
      "comment_type": "user",
      "created_at": "2025-01-25T10:45:00Z",
      "creator": {...},
      "artifacts": [...]  // Attached artifacts
    }
  ]
}
```

## WebSocket Events

All workflow events broadcast to connected clients for real-time updates.

### Event Format

```typescript
{
  type: string;
  data: Record<string, any>;
}
```

### Event Types

#### `workflow.execution.status_changed`

Emitted when execution status changes.

```json
{
  "type": "workflow.execution.status_changed",
  "data": {
    "execution_id": "cuid",
    "status": "paused",
    "project_id": "cuid"
  }
}
```

#### `workflow.execution.phase_changed`

Emitted when execution moves to new phase.

```json
{
  "type": "workflow.execution.phase_changed",
  "data": {
    "execution_id": "cuid",
    "current_phase": "implement",
    "project_id": "cuid"
  }
}
```

#### `workflow.step.started`

Emitted when a step begins.

```json
{
  "type": "workflow.step.started",
  "data": {
    "execution_id": "cuid",
    "step_id": "cuid",
    "step_name": "Research codebase",
    "phase": "research",
    "project_id": "cuid"
  }
}
```

#### `workflow.step.completed`

Emitted when a step finishes.

```json
{
  "type": "workflow.step.completed",
  "data": {
    "execution_id": "cuid",
    "step_id": "cuid",
    "status": "completed",
    "project_id": "cuid"
  }
}
```

#### `workflow.step.progress`

Emitted for streaming step output.

```json
{
  "type": "workflow.step.progress",
  "data": {
    "execution_id": "cuid",
    "step_id": "cuid",
    "output": "Building project...",
    "project_id": "cuid"
  }
}
```

#### `workflow.comment.created`

Emitted when a comment is created.

```json
{
  "type": "workflow.comment.created",
  "data": {
    "execution_id": "cuid",
    "comment_id": "cuid",
    "step_id": "cuid",
    "project_id": "cuid"
  }
}
```

#### `workflow.artifact.created`

Emitted when an artifact is uploaded.

```json
{
  "type": "workflow.artifact.created",
  "data": {
    "execution_id": "cuid",
    "artifact_id": "cuid",
    "step_id": "cuid",
    "project_id": "cuid"
  }
}
```

#### `workflow.artifact.attached`

Emitted when artifact attached to comment.

```json
{
  "type": "workflow.artifact.attached",
  "data": {
    "execution_id": "cuid",
    "artifact_id": "cuid",
    "comment_id": "cuid",
    "project_id": "cuid"
  }
}
```

## Filesystem Structure

```
.agent/workflows/
├── definitions/                    # Workflow templates
│   ├── implement-feature.ts        # TypeScript workflow
│   ├── simple-pipeline.yaml        # YAML workflow
│   └── fix-bug.ts
│
└── executions/                     # Execution data
    └── {runId}/
        ├── definition.json         # Immutable snapshot of workflow definition
        ├── args.json               # Immutable snapshot of execution arguments
        │
        ├── checkpoints/            # State snapshots
        │   ├── step-0.json
        │   ├── step-1.json
        │   └── step-2.json
        │
        ├── artifacts/              # Uploaded files
        │   ├── {stepId}/
        │   │   ├── screenshot.png
        │   │   └── diagram.svg
        │   └── {stepId}/
        │       └── video-demo.mp4
        │
        └── logs/                   # Step logs
            └── {stepId}/
                ├── input.json      # Step input parameters
                ├── output.json     # Step output/result
                ├── events.jsonl    # Streaming events (JSONL)
                └── summary.md      # Human-readable summary
```

### Checkpoint Format

Checkpoints are saved after each step completion:

```json
{
  "execution_id": "cuid",
  "timestamp": "2025-01-25T10:05:00Z",
  "current_phase": "implement",
  "current_step_index": 2,
  "completed_step_ids": [
    "research-codebase",
    "create-spec"
  ],
  "step_results": {
    "research-codebase": {
      "stepId": "research-codebase",
      "status": "completed",
      "data": {
        "patterns": ["..."]
      }
    },
    "create-spec": {
      "stepId": "create-spec",
      "status": "completed",
      "data": {
        "spec": {...}
      }
    }
  }
}
```

## Domain Services

Backend business logic organized by domain following the functional architecture pattern.

### Workflow Domain

**Location:** `apps/web/src/server/domain/workflow/`

**Services:**

- `createWorkflowRun.ts` - Create execution record
- `getWorkflowRunById.ts` - Get single execution with relations
- `getWorkflowRuns.ts` - Query executions with filters
- `executeWorkflow.ts` - Execute workflow (currently stubbed)
- `pauseWorkflow.ts` - Pause running workflow
- `resumeWorkflow.ts` - Resume from checkpoint (currently stubbed)
- `cancelWorkflow.ts` - Cancel workflow

**Schemas:** `domain/workflow/schemas/`

- `workflow.schemas.ts` - Zod schemas for workflow operations

**Types:** `domain/workflow/types/`

- `workflow.types.ts` - TypeScript type definitions

### Artifact Domain

**Services:**

- `uploadArtifact.ts` - Save file to filesystem, create DB record
- `downloadArtifact.ts` - Stream file from filesystem
- `attachArtifactToComment.ts` - Link artifact to comment
- `detachArtifactFromComment.ts` - Unlink artifact from comment

### Comment Domain

**Services:**

- `createComment.ts` - Create workflow or step-level comment
- `getComments.ts` - Query comments with filters

## Implementation Phases

### Phase 1: Database & Endpoints (COMPLETED)

**Status:** ✅ Complete

**What was delivered:**

- ✅ Database schema (5 new models, 3 updated models)
- ✅ Migration applied successfully
- ✅ Domain folder structure created
- ✅ All type definitions and Zod schemas

**What was stubbed:**

- Workflow run logic (`executeWorkflow` creates 'pending' record only)
- Workflow resume logic (`resumeWorkflow` just updates status)
- Step log streaming (endpoint returns placeholder)

### Phase 2: Workflow Engine Package (PLANNED)

**Scope:**

- Create `@repo/workflow-engine` package
- Implement YAML and TypeScript parsers
- Implement WorkflowExecutor and WorkflowContext
- Implement CheckpointManager
- Integrate with `@repo/agent-cli-sdk`
- Write workflow engine tests

**Estimated Effort:** 60-70 hours

### Phase 3: Frontend UI (PLANNED)

**Scope:**

- Create kanban board components
- Implement real-time updates via WebSocket
- Add workflow templates page
- Add step detail modals
- Add comment/artifact UI
- Integrate with backend API

**Estimated Effort:** 40-50 hours

### Phase 4: Full Execution (PLANNED)

**Scope:**

- Remove stubs from `executeWorkflow` and `resumeWorkflow`
- Implement background job queue (optional)
- Add step log streaming
- Add checkpoint/resume functionality
- Create example workflows
- End-to-end testing

**Estimated Effort:** 20-30 hours

## Testing Strategy

### Unit Tests

**Workflow Engine Package:**

- Parser tests (YAML, TypeScript)
- WorkflowContext tests (step execution)
- CheckpointManager tests (save/restore)
- FileSystemStorage tests

**Backend Domain:**

- Service tests (mocked Prisma)
- Schema validation tests (Zod)

### Integration Tests

**API Tests:**

- Create execution → Verify DB state
- Pause execution → Resume execution
- Upload artifact → Download artifact
- Create comment → Attach artifact

### E2E Tests (Playwright)

**UI Flow:**

- Navigate to workflows tab
- Create execution from template
- Watch kanban board update
- Click card, view details
- Add comment, upload artifact
- Pause and resume

## Configuration

### Environment Variables

No new environment variables required. Uses existing:

- `DATABASE_URL` - Prisma database connection
- `JWT_SECRET` - Authentication
- `ANTHROPIC_API_KEY` - For Claude agent steps

### Runtime Configuration

Workflow templates location: `.agent/workflows/definitions/`
Workflow runs location: `.agent/workflows/executions/`

## Migration Guide

### Database Migration

```bash
# Apply workflow tables migration
cd apps/web
pnpm prisma migrate dev

# Verify migration
pnpm prisma studio
```

### Adding Workflow Templates

**TypeScript workflow:**

1. Create file in `.agent/workflows/definitions/{name}.ts`
2. Use `defineWorkflow()` helper
3. Define phases, argsSchema, execute function
4. Template automatically available in UI

**YAML workflow:**

1. Create file in `.agent/workflows/definitions/{name}.yaml`
2. Define name, phases, steps
3. Template automatically available in UI

## Troubleshooting

### Common Issues

**Issue:** Workflow run stuck in 'pending' status
**Cause:** Phase 2 not implemented (execution engine stubbed)
**Solution:** Wait for Phase 2 completion

**Issue:** Cannot upload large artifacts
**Cause:** 100MB upload limit
**Solution:** Increase limit in multipart config or split file

**Issue:** Checkpoint not restoring correctly
**Cause:** Phase 2 not implemented (resume stubbed)
**Solution:** Wait for Phase 2 completion

**Issue:** WebSocket events not received
**Cause:** Not connected to WebSocket server
**Solution:** Check WebSocket connection in browser DevTools

## Future Enhancements

- [ ] Parallel step execution (currently sequential only)
- [ ] Conditional step execution based on previous results
- [ ] Step retry logic with exponential backoff
- [ ] Workflow templates marketplace
- [ ] Workflow versioning and rollback
- [ ] Multi-user workflow collaboration
- [ ] Workflow metrics and analytics
- [ ] Integration with external tools (GitHub, Slack, etc.)

## References

- **Parent Specs:**
  - [36-workflow-design-attempt-3-spec.md](/.agent/specs/todo/36-workflow-design-attempt-3-spec.md)
  - [37-workflow-phase-1-db-endpoints-spec.md](/.agent/specs/todo/37-workflow-phase-1-db-endpoints-spec.md)

- **Inspiration:**
  - [Temporal Workflows](https://docs.temporal.io/workflows)
  - [Inngest Durable Execution](https://www.inngest.com/docs/learn/how-functions-are-executed)
  - [Restate Workflows](https://www.restate.dev/what-is-durable-execution)
  - [GitHub Actions](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
  - [Argo Workflows](https://argo-workflows.readthedocs.io/)

- **Related Documentation:**
  - [CLAUDE.md](/CLAUDE.md) - Project conventions
  - [apps/web/CLAUDE.md](/apps/web/CLAUDE.md) - Web app architecture
  - [packages/agent-cli-sdk/CLAUDE.md](/packages/agent-cli-sdk/CLAUDE.md) - SDK details

---

**Last Updated:** 2025-01-25
**Maintained By:** Development Team
**Questions?** See [CLAUDE.md](/CLAUDE.md) or ask in project discussions
