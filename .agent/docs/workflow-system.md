# Workflow System

Comprehensive guide to the workflow engine in agentcmd - a visual workflow builder with drag-and-drop interface powered by Inngest.

## Overview

The workflow system allows users to create, execute, and monitor automated workflows with AI agents, bash commands, and conditional logic.

**Key Technologies:**
- **Inngest** - Background job orchestration
- **@xyflow/react** - Visual workflow builder UI
- **WebSocket** - Real-time execution updates
- **Prisma** - Workflow storage (WorkflowDefinition, WorkflowRun, WorkflowRunStep)

## Architecture

### Backend Structure

```
apps/app/src/server/domain/workflow/
├── services/
│   ├── engine/                    # Core runtime
│   │   └── createWorkflowRuntime.ts
│   ├── executeWorkflow.ts
│   ├── getWorkflowById.ts
│   └── createWorkflowRun.ts
├── types/
│   ├── workflow-definition.types.ts
│   ├── workflow-execution.types.ts
│   └── step.types.ts
└── schemas/
    └── workflow.schemas.ts        # Zod validation
```

### Frontend Structure

```
apps/app/src/client/pages/projects/workflows/
├── components/
│   ├── WorkflowBuilder.tsx        # @xyflow/react canvas
│   ├── StepConfigPanel.tsx
│   └── ExecutionMonitor.tsx
├── hooks/
│   └── useWorkflowWebSocket.ts    # Real-time updates
├── stores/
│   └── workflowEditorStore.ts
└── types/
    └── workflow.types.ts
```

### Database Models

```prisma
model WorkflowDefinition {
  id          String   @id @default(cuid())
  name        String
  description String?
  projectId   String
  steps       Json     // Array of step definitions
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project @relation(fields: [projectId], references: [id])
  runs        WorkflowRun[]
}

model WorkflowRun {
  id           String   @id @default(cuid())
  workflowId   String
  status       String   // pending, running, completed, failed
  startedAt    DateTime?
  completedAt  DateTime?
  error        String?

  workflow     WorkflowDefinition @relation(fields: [workflowId], references: [id])
  steps        WorkflowRunStep[]
}

model WorkflowRunStep {
  id           String   @id @default(cuid())
  runId        String
  stepId       String   // References step in workflow definition
  status       String   // pending, running, completed, failed
  output       Json?
  error        String?
  startedAt    DateTime?
  completedAt  DateTime?

  run          WorkflowRun @relation(fields: [runId], references: [id])
}
```

## Workflow Execution

### Inngest Integration

Workflows execute as Inngest background jobs for reliability and observability.

**Pattern:**
```typescript
// Inngest function definition
export const executeWorkflow = inngest.createFunction(
  { id: "execute-workflow" },
  { event: "workflow/execute" },
  async ({ event, step }) => {
    const { workflowId, runId } = event.data;

    // Load workflow definition
    const workflow = await step.run("load-workflow", async () => {
      return await getWorkflowById({ id: workflowId });
    });

    // Execute each step sequentially
    for (const workflowStep of workflow.steps) {
      await step.run(`execute-step-${workflowStep.id}`, async () => {
        return await executeStep({
          workflowStep,
          runId,
          context: {},
        });
      });
    }

    // Mark run complete
    await step.run("complete-run", async () => {
      return await completeWorkflowRun({ runId });
    });
  }
);
```

**Benefits:**
- Automatic retries on failure
- Execution history
- Dev server UI at http://localhost:8288
- Observable step-by-step execution

### Inngest Persistence

The workflow system uses different Inngest modes for development and production:

**Development Mode (pnpm dev)**:
- Uses `inngest dev` command
- Ephemeral execution history (lost on restart)
- Fast startup (~2-3 seconds)
- Ideal for rapid iteration
- WebSocket connection to app server for function discovery

**Production Mode (pnpm start)**:
- Uses `inngest start` command
- Persistent execution history via SQLite
- History survives server restarts
- Slightly slower startup (~5-10 seconds)
- Event key and signing key authentication

**Mode Detection:**
- Automatically selected based on `NODE_ENV`
- `NODE_ENV=production` → persistent mode
- `NODE_ENV=development` → ephemeral mode
- Can override with CLI flag: `agentcmd start --production`

**Data Persistence:**

Development mode stores execution state in-memory:
- Workflow run history
- Step execution traces
- Event logs
- All cleared on server restart

Production mode persists to SQLite database:
- Default location: `~/.inngest/` (Inngest's default)
- Workflow run history preserved
- Execution traces retained
- Event logs maintained across restarts

**Configuration:**

Development (no config needed):
```bash
pnpm dev  # Uses inngest dev automatically
```

Production (optional keys):
```bash
# Optional: Set custom keys in .env
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key  # Generate: openssl rand -hex 32

pnpm start  # Uses inngest start with persistence
```

If keys aren't provided, secure defaults are generated at runtime.

### Workflow Runtime

The runtime engine executes workflow steps with context management.

**Pattern:**
```typescript
// apps/app/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts

interface StepExecutionContext {
  workflow: WorkflowDefinition;
  run: WorkflowRun;
  step: WorkflowDefinitionStep;
  projectPath: string;
  variables: Record<string, unknown>;
  stepOutputs: Record<string, StepOutput>;
  onEvent: (event: WorkflowEvent) => void;
}

export function createWorkflowRuntime() {
  return {
    async executeStep(context: StepExecutionContext) {
      const { step, onEvent } = context;

      // Emit start event
      onEvent({
        type: `workflow.${context.run.id}.step.${step.id}.started`,
        data: { stepId: step.id },
      });

      // Execute step based on type
      let output: StepOutput;
      switch (step.type) {
        case "ai":
          output = await executeAIStep(context);
          break;
        case "bash":
          output = await executeBashStep(context);
          break;
        case "conditional":
          output = await executeConditionalStep(context);
          break;
        case "loop":
          output = await executeLoopStep(context);
          break;
      }

      // Emit completion event
      onEvent({
        type: `workflow.${context.run.id}.step.${step.id}.completed`,
        data: { stepId: step.id, output },
      });

      return output;
    },
  };
}
```

## Step Types

### AI Step

Executes AI agent (Claude, Codex, Gemini) with prompt.

**Definition:**
```typescript
interface AIStep {
  type: "ai";
  id: string;
  name: string;
  agentType: "claude" | "codex" | "gemini";
  prompt: string; // Supports template variables: {{ variables.foo }}
  model?: string;
  temperature?: number;
}
```

**Execution:**
```typescript
async function executeAIStep(context: StepExecutionContext) {
  const { step, projectPath, variables } = context;

  // Interpolate template variables in prompt
  const prompt = interpolateTemplate(step.prompt, variables);

  // Execute agent via agent-cli-sdk
  const session = await executeAgent({
    agentType: step.agentType,
    prompt,
    projectPath,
    onEvent: (event) => {
      context.onEvent({
        type: `workflow.${context.run.id}.step.${step.id}.progress`,
        data: event,
      });
    },
  });

  return {
    success: true,
    output: session.messages,
  };
}
```

### Bash Step

Runs shell command in project directory.

**Definition:**
```typescript
interface BashStep {
  type: "bash";
  id: string;
  name: string;
  command: string; // Supports template variables
  workingDirectory?: string;
}
```

**Execution:**
```typescript
async function executeBashStep(context: StepExecutionContext) {
  const { step, projectPath } = context;

  const command = interpolateTemplate(step.command, context.variables);

  const result = await execAsync(command, {
    cwd: path.join(projectPath, step.workingDirectory || ""),
  });

  return {
    success: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}
```

### Conditional Step

Branches execution based on condition.

**Definition:**
```typescript
interface ConditionalStep {
  type: "conditional";
  id: string;
  name: string;
  condition: string; // JavaScript expression: {{ steps.test.exitCode === 0 }}
  onTrue: WorkflowDefinitionStep[];
  onFalse: WorkflowDefinitionStep[];
}
```

**Execution:**
```typescript
async function executeConditionalStep(context: StepExecutionContext) {
  const { step, stepOutputs } = context;

  // Evaluate condition with step outputs
  const conditionResult = evaluateCondition(step.condition, {
    steps: stepOutputs,
    variables: context.variables,
  });

  // Execute appropriate branch
  const branch = conditionResult ? step.onTrue : step.onFalse;

  for (const branchStep of branch) {
    await executeStep({ ...context, step: branchStep });
  }

  return {
    success: true,
    branch: conditionResult ? "true" : "false",
  };
}
```

### Loop Step

Iterates over array or range.

**Definition:**
```typescript
interface LoopStep {
  type: "loop";
  id: string;
  name: string;
  items: string; // Array variable or range: {{ variables.files }} or "0..10"
  steps: WorkflowDefinitionStep[];
}
```

**Execution:**
```typescript
async function executeLoopStep(context: StepExecutionContext) {
  const { step, variables } = context;

  // Resolve items
  const items = resolveItems(step.items, variables);

  const results = [];

  for (const [index, item] of items.entries()) {
    // Execute loop body with item context
    const loopContext = {
      ...context,
      variables: {
        ...context.variables,
        item,
        index,
      },
    };

    for (const loopStep of step.steps) {
      const result = await executeStep({ ...loopContext, step: loopStep });
      results.push(result);
    }
  }

  return {
    success: true,
    iterations: items.length,
    results,
  };
}
```

## Real-Time Updates

### WebSocket Event Streaming

Workflows emit events via WebSocket for live UI updates.

**Event Types:**
- `workflow.{runId}.started` - Workflow execution started
- `workflow.{runId}.step.{stepId}.started` - Step started
- `workflow.{runId}.step.{stepId}.progress` - Step progress (AI streaming, bash output)
- `workflow.{runId}.step.{stepId}.completed` - Step completed
- `workflow.{runId}.completed` - Workflow completed
- `workflow.{runId}.failed` - Workflow failed

**Frontend Hook:**
```typescript
// pages/projects/workflows/hooks/useWorkflowWebSocket.ts

export function useWorkflowWebSocket(runId: string) {
  const { socket, isConnected } = useWebSocket();
  const [status, setStatus] = useState<WorkflowStatus>("pending");
  const [steps, setSteps] = useState<StepStatus[]>([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to workflow run channel
    socket.emit("subscribe", `workflow:${runId}`);

    // Handle events
    const handleStepProgress = (event: WorkflowEvent) => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === event.data.stepId
            ? { ...s, status: "running", progress: event.data }
            : s
        )
      );
    };

    socket.on("workflow.*.step.*.progress", handleStepProgress);

    return () => {
      socket.off("workflow.*.step.*.progress", handleStepProgress);
      socket.emit("unsubscribe", `workflow:${runId}`);
    };
  }, [socket, isConnected, runId]);

  return { status, steps, isConnected };
}
```

## Visual Builder

### @xyflow/react Integration

The workflow builder uses @xyflow/react for drag-drop interface.

**Component:**
```typescript
// components/WorkflowBuilder.tsx

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from "@xyflow/react";

export function WorkflowBuilder() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Node types for different steps
  const nodeTypes = {
    ai: AIStepNode,
    bash: BashStepNode,
    conditional: ConditionalStepNode,
    loop: LoopStepNode,
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
```

**Custom Nodes:**
```typescript
function AIStepNode({ data }: NodeProps<AIStepData>) {
  return (
    <div className="workflow-node">
      <div className="node-header">
        <BrainIcon />
        <span>{data.name}</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <label>Agent:</label>
          <span>{data.agentType}</span>
        </div>
        <div className="node-field">
          <label>Prompt:</label>
          <span className="truncate">{data.prompt}</span>
        </div>
      </div>
      <Handle type="source" position="bottom" />
      <Handle type="target" position="top" />
    </div>
  );
}
```

## Template Variables

### Variable Interpolation

Steps can reference variables and previous step outputs.

**Syntax:**
- `{{ variables.foo }}` - Access workflow variables
- `{{ steps.stepId.output }}` - Access previous step output
- `{{ steps.stepId.exitCode }}` - Access bash exit code
- `{{ item }}` - Access loop item
- `{{ index }}` - Access loop index

**Example:**
```typescript
// AI step prompt with variables
const prompt = `
Review the changes in {{ variables.branch }}.
The previous step found {{ steps.analyze.issueCount }} issues.
`;

// Bash command with step output
const command = `git checkout {{ steps.createBranch.branchName }}`;
```

### Variable Scope

Variables have hierarchical scope:

1. **Workflow variables** - Set at workflow start
2. **Step outputs** - Available to subsequent steps
3. **Loop variables** - Available within loop body (item, index)

## Best Practices

### Workflow Design

✅ DO:
- Break workflows into logical steps
- Use descriptive step names
- Handle errors with conditional steps
- Test workflows with small inputs first
- Use template variables for reusability

❌ DON'T:
- Create overly long workflows (> 20 steps)
- Hardcode values (use variables)
- Skip error handling
- Execute destructive commands without confirmation

### Performance

- Use parallel execution where possible (Inngest supports parallel steps)
- Minimize AI step calls (expensive)
- Cache results in variables
- Use conditional steps to skip unnecessary work

### Monitoring

- Check Inngest UI (http://localhost:8288) for execution history
- Watch WebSocket events in browser DevTools
- Monitor logs (`apps/app/logs/app.log`) for errors
- Set up alerts for failed workflows

## Quick Reference

**Key Files:**
- Runtime: `domain/workflow/services/engine/createWorkflowRuntime.ts`
- Inngest: `domain/workflow/services/executeWorkflow.ts`
- Builder UI: `client/pages/projects/workflows/`
- WebSocket Hook: `client/pages/projects/workflows/hooks/useWorkflowWebSocket.ts`

**Ports:**
- Inngest Dev Server: http://localhost:8288

**Related Docs:**
- `.agent/docs/websocket-architecture.md` - WebSocket patterns
- `.agent/docs/backend-patterns.md` - Domain services
- `packages/agentcmd-workflows/CLAUDE.md` - Workflow SDK
