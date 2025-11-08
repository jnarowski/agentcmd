# Temporal + Docker Migration Evaluation

**Date**: 2025-11-08
**Status**: Research Complete
**Recommendation**: Option B (Docker Only) for CLI use case

---

## Executive Summary

**Current Architecture**: Inngest orchestration, native execution, SQLite memoization, spawned child process (port 8288)

**Proposed Architecture**: Temporal orchestration, Docker containers, PostgreSQL event history, worker processes

**Overall Assessment**: Temporal provides better long-term architecture but requires significant effort (3-4 weeks). Docker containerization addresses isolation needs with less risk (1-2 weeks).

---

## Part 1: Inngest Integration Audit

### Current Architecture

**Event-Driven Workflow Model**:
- Trigger: `workflowClient.send({ name: 'workflow/${id}', data })`
- Execution: Async background processing via Inngest
- Memoization: SQLite database at `./prisma/workflows.db`
- Monitoring: Inngest Dev UI (separate process, port 8288)

**Step Types** (10 total):
1. **agent** - Execute AI agents (Claude, Codex) via SDK
2. **git** - Git operations (commit, branch, pr, commit-and-branch)
3. **cli** - Shell command execution
4. **phase** - Phase boundary markers
5. **artifact** - File upload tracking
6. **annotation** - Workflow comments
7. **ai** - AI generation (non-agent)
8. **setupWorkspace** - Create git worktree
9. **cleanupWorkspace** - Remove git worktree
10. **run** - Generic step wrapper

**Integration Points** (24 core files):

**Engine Initialization**:
- `initializeWorkflowEngine.ts` - Loads workflows from `.agent/workflows/definitions/`, registers Fastify plugin
- `createWorkflowClient.ts` - Creates Inngest client with SQLite memoization
- `createWorkflowRuntime.ts` - Implements `WorkflowRuntime` interface, wraps Inngest with custom steps
- `loadProjectWorkflows.ts` - Dynamic TypeScript imports from filesystem

**Workflow Execution**:
- `executeWorkflow.ts` - Validates args (Ajv), sends Inngest event
- `getInngestRunStatus.ts` - Polls Inngest dev server at `http://localhost:8288/v1/runs/{runId}`

**Step Implementations** (10 files in `steps/`):
- All follow pattern: `inngestStep.run(id, async () => { ... })`
- Database tracking: Create `WorkflowRunStep`, update status (running → completed/failed)
- WebSocket broadcasting: Direct event emission from step functions
- Error handling: `handleStepFailure()` wrapper

**Configuration** (`config.ts`):
```typescript
workflow: {
  enabled: process.env.WORKFLOW_ENGINE_ENABLED !== "false",
  appId: process.env.INNGEST_APP_ID ?? "sourceborn-workflows",
  eventKey: process.env.INNGEST_EVENT_KEY,
  devMode: process.env.INNGEST_DEV_MODE !== "false",
  memoizationDbPath: "./prisma/workflows.db",
  servePath: "/api/workflows/inngest",
}
```

**CLI Integration** (`start.ts`):
```typescript
inngestProcess = spawn("npx", [
  "inngest-cli@latest", "dev",
  "-u", `http://localhost:${port}/api/workflows/inngest`,
  "--port", inngestPort.toString()
], { stdio: "inherit" });
```

**Graceful Shutdown**:
- SIGINT/SIGTERM handlers kill Inngest process
- Close Fastify server
- Exit cleanly

### Data Flow Architecture

```
User Request
    ↓
POST /api/workflow-runs
    ↓
createWorkflowRun() - Insert DB record
    ↓
executeWorkflow() - Validate args, send event
    ↓
Inngest Client: workflowClient.send({ name, data })
    ↓
[Inngest Server processes asynchronously]
    ↓
Inngest Function Handler
    ↓
createWorkflowRuntime Adapter
    ↓
Extended Step Object (agent, git, cli methods)
    ↓
Execute Step Logic
    ↓
Update Database (WorkflowRunStep, WorkflowEvent)
    ↓
Broadcast WebSocket (workflow:run:updated, step:*)
    ↓
Frontend Real-Time Updates
```

### State Management

**Database (SQLite via Prisma)**:
- `WorkflowRun` - Execution metadata, status, current phase, `inngest_run_id`
- `WorkflowRunStep` - Step status, timestamps, errors, `inngest_step_id`
- `WorkflowEvent` - Timeline events (workflow_started, phase_started, step_completed)
- `WorkflowArtifact` - File metadata

**Inngest Memoization (SQLite)**:
- Location: `./prisma/workflows.db`
- Purpose: Cache step outputs for resume/retry
- Scope: Per-step, keyed by `${phase}-${stepId}`
- Failure mode: Throw on restore failure (prevents inconsistent state)

**Filesystem**:
- Step logs: `.agent/workflows/executions/{runId}/logs/{stepId}/`
- Artifacts: `.agent/workflows/executions/{runId}/artifacts/{stepId}/`
- Workflow definitions: `.agent/workflows/definitions/*.ts`

**In-Memory**:
- Active WebSocket subscriptions (project rooms)
- Fastify decorators (`workflowClient`, `workflowRuntime`)

### Error Handling Strategy

**Validation Errors** (before execution):
```typescript
const validate = ajv.compile(workflowDefinition.args_schema);
if (!validate(execution.args)) {
  await updateWorkflowRun({ runId, status: "failed", error_message });
  throw new Error("Invalid workflow args");
}
```

**Step-Level Failures**:
```typescript
try {
  const result = await executeStepLogic();
  await updateStepStatus(step.id, "completed", result);
} catch (error) {
  await handleStepFailure(context, step.id, error);
  throw error; // Propagate to workflow
}
```

**Workflow-Level Failures**:
```typescript
catch (error) {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: "failed", completed_at: new Date(), error_message }
  });
  await createWorkflowEvent({ workflow_run_id: runId, event_type: "workflow_failed" });
  broadcastWorkflowEvent(projectId, { type: "workflow:run:updated", ... });
  throw error;
}
```

### Coupling Assessment

**Isolation Level**: Moderate
- Inngest code isolated to `domain/workflow/services/engine/`
- Clean abstraction via `WorkflowRuntime` interface
- Step implementations self-contained
- HTTP routes use generic `workflowClient` decorator

**Migration Impact**: ~30-40 files would need modification
- 10 step implementation files
- 4 engine core files (client, runtime, loader, initializer)
- 1 execution service
- Routes, schemas, types
- CLI start command

---

## Part 2: Containerization Analysis

### Current Deployment Model

**No Docker Infrastructure**:
- No Dockerfile, docker-compose.yml, or .dockerignore
- Native execution on host machine
- Single-user CLI tool deployment model
- Processes: Fastify server + Inngest child process

**Filesystem Dependencies**:
- Projects scattered across user's filesystem (e.g., `/Users/username/projects/foo`)
- Database: `apps/app/prisma/dev.db` (SQLite)
- Logs: `apps/app/logs/app.log`
- Config: `~/.agentcmd/config.json` (production CLI)
- CLI configs: `~/.claude/`, etc.

### Git Operations Architecture

**Git Worktree Pattern**:
- **Purpose**: Isolate workflow execution on separate branch without affecting main working tree
- **Location**: `{projectPath}/.worktrees/{branchName}`
- **Workflow**: `setupWorkspace` step creates worktree, `cleanupWorkspace` removes it

**Setup Modes** (`createSetupWorkspaceStep.ts`):
1. **Worktree mode**: `worktreeName` provided → create isolated workspace
2. **Branch switch**: `branch` provided → switch/create branch in main tree
3. **Stay current**: No params → work on current branch

**Git Services** (24 operations in `domain/git/services/`):
- Branch: `createAndSwitchBranch`, `switchBranch`, `getBranches`
- Commit: `commitChanges`, `stageFiles`, `unstageFiles`
- Remote: `pushToRemote`, `pullFromRemote`, `fetchFromRemote`
- Worktree: `createWorktree`, `removeWorktree`, `listWorktrees`
- PR: `createPullRequest` (requires `gh` CLI)

**Container Challenge**:
- Git worktrees require main repo and worktree on same filesystem
- `.worktrees/` must be within mounted volume
- Git operations assume direct filesystem access

### File Operations Architecture

**Domain Services** (`domain/file/services/`):

**Security Validation**:
```typescript
// All operations validate path within project directory
const absolutePath = path.resolve(projectPath, filePath);
if (!absolutePath.startsWith(projectPath)) {
  throw new Error("Path traversal detected");
}
```

**Core Operations**:
- `readFile()` - UTF-8 text content
- `writeFile()` - Create/update with parent directory creation
- `getFileTree()` - Recursive directory listing
- All scoped to project path from database

**Container Challenge**:
- Project paths in database are absolute host paths (`/Users/...`)
- Container needs mapped paths (`/workspace/...`)
- Requires path translation layer

### Agent Execution Architecture

**Agent Step** (`createAgentStep.ts`):
1. Create `AgentSession` in database
2. Spawn child process via `agent-cli-sdk` (`claude`, `codex` CLI)
3. Stream JSONL output via WebSocket
4. Store CLI session ID for resumption
5. Update step status

**Execution Details** (`executeAgent.ts`):
- Uses `agent-cli-sdk` package's `execute()` function
- Working directory: `projectPath` or custom `cwd`
- Process tracked in `activeSessions` Map
- Timeout: 30 minutes default

**Container Challenges**:
- Requires `claude`, `codex` CLIs installed in container
- CLI auth/config must be mounted as volumes
- Process spawning assumes shell access

### CLI Step Execution

**Implementation** (`createCliStep.ts`):
- Uses Node.js `child_process.exec()`
- Shell: `/bin/sh` default (configurable)
- Working directory: `projectPath` or custom `cwd`
- Environment variables passed through
- Output buffer: 10MB limit
- Timeout: 5 minutes default

**Container Challenges**:
- Shell commands assume host filesystem layout
- May reference absolute paths
- Environment variables may not transfer

### Critical Containerization Challenges

#### 1. Project Path Resolution

**Problem**:
- Database stores absolute host paths: `/Users/username/projects/foo`
- Container needs mapped paths: `/workspace/foo`

**Solutions**:
- Option A: Path translation layer (DB paths → container paths)
- Option B: Require all projects under single parent directory
- Option C: Store relative paths in database

**Complexity**: Medium

#### 2. Git Worktree Filesystem Requirements

**Problem**:
- Git worktree requires main repo + `.worktrees/` on same filesystem
- Cannot span container boundary without volume

**Solution**:
- Mount entire project directory (including `.worktrees/`)
- Ensure write permissions in container

**Complexity**: Low (if parent dir mounted)

#### 3. Multiple Project Management

**Problem**:
- Current: Projects scattered across filesystem
- Container: Each project needs volume mount
- Dynamic volume mounting not feasible

**Solutions**:
- **Recommended**: Require `~/projects/` consolidation, mount as single volume
- Alternative: Per-project containers (resource intensive)

**Complexity**: Medium (requires user workflow change)

#### 4. Agent CLI Installation & Auth

**Problem**:
- `claude`, `codex` CLIs not pre-installed
- Require authentication (API keys, OAuth)
- Configuration stored in `~/.claude/`, etc.

**Solutions**:
- Pre-install CLIs in Dockerfile
- Mount config directories as volumes: `~/.claude:/root/.claude`
- Document manual setup steps

**Complexity**: Medium (Dockerfile + docs)

#### 5. File Permissions

**Problem**:
- Container runs as `root` or container user
- Files created owned by wrong user on host

**Solutions**:
- Run container as host user: `--user $(id -u):$(id -g)`
- Use UID mapping in Docker daemon config

**Complexity**: Low

#### 6. WebSocket Terminal (node-pty)

**Problem**:
- PTY sessions require TTY allocation
- May not work properly in container

**Solutions**:
- Run container with `-t` flag (allocate TTY)
- May require `--privileged` for full PTY functionality
- Test thoroughly

**Complexity**: Medium (testing required)

#### 7. Database File Locking

**Problem**:
- SQLite file on host, accessed from container
- Concurrent access if multiple containers

**Solutions**:
- Single container instance only
- OR: Migrate to PostgreSQL for multi-container
- OR: Container-local SQLite with data volumes

**Complexity**: Low (single container) / High (PostgreSQL migration)

#### 8. Temp File Management

**Problem**:
- Uses `/tmp/agentcmd-*` for uploaded images
- Not shared between host and container

**Solutions**:
- Mount `/tmp` as volume
- OR: Use named volume for temp files

**Complexity**: Low

### Proposed Container Architecture

#### Option A: Single-Container Design (Recommended for CLI)

```yaml
# docker-compose.yml
version: '3.8'

services:
  agentcmd:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3456:3456"  # Main server
      - "8288:8288"  # Inngest dev UI
    volumes:
      - ~/projects:/workspace              # All projects consolidated
      - ~/.agentcmd:/root/.agentcmd        # Config + DB + logs
      - ~/.claude:/root/.claude            # Claude CLI config
      - ~/.codex:/root/.codex              # Codex CLI config (if exists)
      - /tmp:/tmp                          # Temp files
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_URL=file:/root/.agentcmd/database.db
      - WORKSPACE_ROOT=/workspace
    user: "${UID}:${GID}"  # Match host user for file permissions
```

**Dockerfile**:
```dockerfile
FROM node:22-bullseye

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Claude CLI
RUN curl -fsSL https://claude.ai/install.sh | sh

# Install Node dependencies
COPY package*.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build application
RUN pnpm build

# Expose ports
EXPOSE 3456 8288

# Start server
CMD ["pnpm", "start"]
```

**Pros**:
- Simple deployment (single container)
- Matches CLI tool philosophy
- Easy development workflow

**Cons**:
- No isolation between projects
- Single point of failure
- Resource sharing

#### Option B: Per-Project Containers (Better Isolation)

```yaml
# docker-compose.yml
version: '3.8'

services:
  agentcmd-shared:
    image: agentcmd:latest
    volumes:
      - ~/.agentcmd:/root/.agentcmd  # Shared database

  agentcmd-project1:
    extends: agentcmd-shared
    volumes:
      - ~/projects/project1:/workspace/project1
    environment:
      - PROJECT_ID=project1

  agentcmd-project2:
    extends: agentcmd-shared
    volumes:
      - ~/projects/project2:/workspace/project2
    environment:
      - PROJECT_ID=project2
```

**Pros**:
- Full isolation per project
- Independent resource limits
- Better security

**Cons**:
- Complex orchestration
- Higher resource usage
- Database contention

#### Option C: Hybrid (Development + Production)

**Development**: Native execution (current)
**Production**: Docker containers

**Pros**:
- Best local DX
- Production isolation

**Cons**:
- Two deployment paths
- Parity concerns

---

## Part 3: Temporal Architecture Analysis

### Core Architectural Differences

| Aspect | Inngest | Temporal |
|--------|---------|----------|
| **Execution Model** | Event-driven choreography | Workflow orchestration |
| **Code Style** | Normal functions, re-executed on resume | Deterministic workflows + Activities |
| **State Persistence** | Step memoization (SQLite) | Event history replay (PostgreSQL) |
| **Determinism** | Optional (code outside `step.run()` re-runs) | Required (workflow code must be pure) |
| **Dev UI** | Inngest CLI (port 8288) | Temporal Server (port 8233) |
| **Infrastructure** | Child process | Server cluster + Workers |
| **Deployment** | Serverless-first | Self-hosted or cloud |
| **Community** | 4,059 GitHub stars | 16,361 GitHub stars |

### Determinism Requirement Deep Dive

**Inngest (Permissive)**:
```typescript
// This code runs on EVERY re-execution/resume
console.log('Starting workflow at', new Date()); // ← Runs multiple times
const random = Math.random(); // ← Different on each run

const data = await step.run('fetch', async () => {
  return await fetchData(); // ← Only runs once (memoized)
});
```

**Temporal (Strict)**:
```typescript
// Workflow code MUST be deterministic
export async function myWorkflow(): Promise<void> {
  // ❌ BAD - non-deterministic operations
  const now = Date.now();           // Different on replay
  const random = Math.random();     // Different on replay
  await fetch('https://...');       // I/O not allowed

  // ✅ GOOD - deterministic orchestration
  const result = await proxyActivities<MyActivities>({
    startToCloseTimeout: '1 minute',
  }).fetchData(); // Activity handles I/O
}

// All side effects go in Activities
// activities.ts
export async function fetchData(): Promise<Data> {
  // Non-deterministic code allowed here
  const now = Date.now();
  return await fetch('https://...');
}
```

**Why This Matters**:
- Temporal replays entire workflow history on resume/crash recovery
- Non-deterministic code would produce different results on replay
- **Migration Impact**: Must audit all workflow code for determinism violations

### Code Structure Transformation

#### Current Inngest Pattern

```typescript
// createWorkflowRuntime.ts
inngest.createFunction(
  { id: config.id, name: config.name },
  { event: `workflow/${config.id}` },
  async ({ event, step: inngestStep, runId }) => {
    const context = { runId, projectId: event.data.projectId, ... };

    const extendedStep = {
      run: createRunStep(context, inngestStep),
      phase: createPhaseStep(context),
      agent: createAgentStep(context, inngestStep),
      git: createGitStep(context, inngestStep),
      cli: createCliStep(context, inngestStep),
      // ... 10 step types
    };

    // User's workflow definition
    return await fn({ event, step: extendedStep });
  }
);
```

**User Workflow**:
```typescript
// .agent/workflows/definitions/my-workflow.ts
export default defineWorkflow({
  id: 'generate-feature',
  phases: ['research', 'implement', 'review'],
  async execute({ step, event }) {
    step.phase('research');

    const docs = await step.agent({
      agent: 'claude',
      prompt: 'Research the feature',
    });

    step.phase('implement');

    await step.git({
      type: 'commit-and-branch',
      branch: 'feat/new-feature',
    });
  }
});
```

#### Temporal Pattern

**Activities** (all side effects):
```typescript
// activities.ts
import { createAgentSession, executeAgent } from '@/server/domain/session/services';
import { commitChanges, createAndSwitchBranch } from '@/server/domain/git/services';

export async function executeAgentActivity(config: AgentStepConfig): Promise<AgentStepResult> {
  // All current step logic from createAgentStep.ts
  const session = await createAgentSession({ ... });
  const result = await executeAgent({ ... });
  // Database updates, WebSocket broadcasts
  return result;
}

export async function executeGitActivity(config: GitStepConfig): Promise<GitStepResult> {
  // All current step logic from createGitStep.ts
  if (config.type === 'commit-and-branch') {
    await createAndSwitchBranch(config.branch);
    await commitChanges(config.message);
  }
  return { success: true };
}

export async function executeCliActivity(config: CliStepConfig): Promise<CliStepResult> {
  // All current step logic from createCliStep.ts
  return await execCommand(config.command, config.cwd);
}

// ... 10 activity functions (one per step type)
```

**Workflows** (deterministic orchestration):
```typescript
// workflows.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const {
  executeAgentActivity,
  executeGitActivity,
  executeCliActivity,
  // ... import all 10 activities
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: {
    initialInterval: '1s',
    maximumInterval: '60s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export async function generateFeatureWorkflow(input: WorkflowInput): Promise<void> {
  // Phase marker (could be Activity or workflow variable)
  await setPhase('research');

  // Execute agent (deterministic call to Activity)
  const docs = await executeAgentActivity({
    agent: 'claude',
    prompt: 'Research the feature',
    projectPath: input.projectPath,
  });

  await setPhase('implement');

  // Execute git (deterministic call to Activity)
  await executeGitActivity({
    type: 'commit-and-branch',
    branch: 'feat/new-feature',
    projectPath: input.projectPath,
  });
}
```

**Worker** (replaces Inngest client):
```typescript
// worker.ts
import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
  });

  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: 'agentcmd-workflows',
    workflowsPath: require.resolve('./workflows'),
    activities,
    maxConcurrentActivityExecutionSize: 10,
  });

  console.log('Worker started, listening on task queue: agentcmd-workflows');
  await worker.run();
}

run().catch(err => {
  console.error('Worker error:', err);
  process.exit(1);
});
```

**Client** (triggers workflows):
```typescript
// Updated executeWorkflow.ts
import { Client } from '@temporalio/client';

export async function executeWorkflow(params: ExecuteWorkflowParams) {
  const client = new Client({
    connection: await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
    }),
  });

  // Validate args
  const validate = ajv.compile(workflowDefinition.args_schema);
  if (!validate(execution.args)) {
    throw new Error('Invalid workflow args');
  }

  // Start workflow
  const handle = await client.workflow.start('generateFeatureWorkflow', {
    taskQueue: 'agentcmd-workflows',
    workflowId: `workflow-${execution.id}`,
    args: [{
      runId: execution.id,
      projectId: execution.project_id,
      projectPath: project.path,
      userId: execution.user_id,
      args: execution.args,
    }],
  });

  // Update database with Temporal run ID
  await prisma.workflowRun.update({
    where: { id: execution.id },
    data: { temporal_run_id: handle.workflowId },
  });

  return handle;
}
```

### WebSocket Streaming Integration

**Challenge**: Activities cannot directly emit WebSocket events during execution

**Inngest (Current)**:
```typescript
// Inside step execution
broadcastWorkflowEvent(projectId, {
  type: 'workflow:step:updated',
  data: { step_id, status: 'running' }
});
```

**Temporal Solutions**:

**Option 1: Heartbeats + Polling**
```typescript
// Activity
import { Context } from '@temporalio/activity';

export async function executeAgentActivity(config: AgentStepConfig): Promise<AgentStepResult> {
  for (let i = 0; i < 100; i++) {
    // Send progress via heartbeat
    Context.current().heartbeat({ progress: i });
    await doWork();
  }
}

// Frontend polls workflow status
const handle = client.workflow.getHandle(workflowId);
const status = await handle.describe();
// status includes heartbeat details
```

**Option 2: Signals (Workflow → External)**
```typescript
// Workflow sends signal to external service
export async function myWorkflow(): Promise<void> {
  await activities.sendWebSocketUpdate({
    projectId,
    event: { type: 'step:started', step_id }
  });
}

// Activity implementation
export async function sendWebSocketUpdate(params) {
  broadcastWorkflowEvent(params.projectId, params.event);
}
```

**Option 3: External Event Bus**
```typescript
// Activity publishes to Redis/EventBus
export async function executeAgentActivity(config) {
  await redis.publish('workflow:events', JSON.stringify({
    type: 'step:started',
    step_id,
  }));
}

// Separate service consumes and broadcasts via WebSocket
```

**Recommended**: Option 2 (Signals) - keeps logic in Activities, minimal architecture change

### Migration Complexity Breakdown

#### Phase 1: Infrastructure Setup (1 week)

**Tasks**:
- Docker Compose for Temporal Server + PostgreSQL
- Temporal Web UI configuration
- Worker scaffolding (boilerplate)
- Connection testing (Temporal Server ↔ Worker)

**Effort**: 20-30 hours

**Deliverables**:
- `docker-compose.temporal.yml`
- `src/server/temporal/worker.ts` (empty scaffold)
- `src/server/temporal/client.ts` (connection helper)
- Working Temporal Server UI at `http://localhost:8233`

#### Phase 2: Code Refactoring (2 weeks)

**Tasks**:
1. **Extract Activities** (8-12 hours)
   - Create `activities.ts` with 10 activity functions
   - Move logic from `createAgentStep.ts` → `executeAgentActivity()`
   - Move logic from `createGitStep.ts` → `executeGitActivity()`
   - ... repeat for all 10 step types

2. **Convert Workflows** (6-8 hours)
   - Audit workflows for non-deterministic code
   - Replace `step.agent()` → `await activities.executeAgentActivity()`
   - Replace `step.git()` → `await activities.executeGitActivity()`
   - Ensure deterministic orchestration only

3. **WebSocket Streaming** (8-10 hours)
   - Implement Activity → WebSocket bridge
   - Test real-time updates during execution
   - Handle reconnection scenarios

4. **Database Schema** (4-6 hours)
   - Remove `inngest_run_id`, `inngest_step_id` columns
   - Add `temporal_workflow_id`, `temporal_run_id` columns
   - Migration script for existing data

**Effort**: 60-80 hours

**Deliverables**:
- `activities.ts` with 10 functions
- `workflows.ts` with converted workflows
- Updated database schema
- WebSocket integration tests

#### Phase 3: Integration & Testing (1 week)

**Tasks**:
1. **Client Integration** (4-6 hours)
   - Update `executeWorkflow.ts` to use Temporal Client
   - Update `getWorkflowStatus.ts` to query Temporal
   - Remove Inngest dependencies

2. **CLI Updates** (2-3 hours)
   - Remove Inngest process spawning from `start.ts`
   - Update health checks
   - Update documentation

3. **Testing** (10-15 hours)
   - Unit tests for Activities
   - Integration tests for Workflows
   - E2E tests (full workflow execution)
   - WebSocket streaming tests
   - Performance benchmarks

4. **Parallel Execution** (8-10 hours)
   - Run Inngest + Temporal side-by-side
   - A/B test workflows
   - Validate equivalent behavior

**Effort**: 30-40 hours

**Deliverables**:
- Updated routes and services
- Test suite (90%+ coverage)
- Migration cutover plan
- Rollback procedure

**Total Effort**: 110-150 hours (3-4 weeks)

---

## Part 4: Docker + Temporal Integration

### Infrastructure Architecture

**Full Stack** (Temporal + Docker):

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Database for Temporal Event History
  postgresql:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: temporal
      POSTGRES_USER: temporal
      POSTGRES_DB: temporal
    volumes:
      - temporal-db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U temporal"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Temporal Server (orchestration engine)
  temporal:
    image: temporalio/auto-setup:1.22.0
    depends_on:
      postgresql:
        condition: service_healthy
    environment:
      - DB=postgresql12
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgresql
      - DYNAMIC_CONFIG_FILE_PATH=config/dynamicconfig/development-sql.yaml
    ports:
      - "7233:7233"   # gRPC endpoint
      - "8233:8233"   # Web UI
    volumes:
      - ./temporal-config:/etc/temporal/config/dynamicconfig

  # Application + Temporal Worker
  agentcmd:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      temporal:
        condition: service_started
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
      - DATABASE_URL=file:/root/.agentcmd/database.db
      - WORKSPACE_ROOT=/workspace
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    ports:
      - "3456:3456"  # Fastify server
    volumes:
      - ~/projects:/workspace
      - ~/.agentcmd:/root/.agentcmd
      - ~/.claude:/root/.claude
      - /tmp:/tmp
    user: "${UID}:${GID}"

volumes:
  temporal-db:
```

### Dockerfile for Worker

```dockerfile
FROM node:22-bullseye

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    gh \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install Claude CLI
RUN curl -fsSL https://claude.ai/install.sh | sh

# Enable pnpm
RUN corepack enable pnpm

# Install Node dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/app/package.json apps/app/
COPY packages/*/package.json packages/*/

RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Generate Prisma client
RUN cd apps/app && pnpm prisma:generate

# Expose ports
EXPOSE 3456

# Start both server and worker
CMD ["node", "apps/app/dist/server/index.js"]
```

### Worker Integration in Server

**Update `server/index.ts`**:
```typescript
import { startServer } from './server';
import { startTemporalWorker } from './temporal/worker';

async function main() {
  // Start Fastify server
  const server = await startServer({
    port: config.get('server').port,
    host: config.get('server').host,
  });

  // Start Temporal Worker (in same process)
  const worker = await startTemporalWorker();

  // Graceful shutdown
  const cleanup = async () => {
    console.log('Shutting down...');
    await worker.shutdown();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

### Networking Considerations

**Temporal gRPC** (port 7233):
- Worker ↔ Server communication
- Client ↔ Server (workflow start/query)
- Must be accessible from `agentcmd` container

**Temporal Web UI** (port 8233):
- Browser-based dashboard
- View workflows, history, errors
- Optional: Reverse proxy for external access

**Application Server** (port 3456):
- REST API + WebSocket
- Serves frontend
- Accessible to users

### Volume Mounting Strategy

**Required Volumes**:
1. **~/projects → /workspace** - All user projects
2. **~/.agentcmd → /root/.agentcmd** - App config, logs, database
3. **~/.claude → /root/.claude** - Claude CLI auth
4. **/tmp → /tmp** - Temp files for uploads

**Git Worktree Compatibility**:
- Worktrees created at `/workspace/{project}/.worktrees/{branch}`
- All within `/workspace` volume
- Git operations work seamlessly

**Path Translation**:
- Database stores `/workspace/foo`
- Container resolves to `/workspace/foo`
- Host sees `~/projects/foo`
- Transparent mapping

---

## Part 5: Migration Options

### Option A: Full Migration (Temporal + Docker)

**Description**: Complete replacement of Inngest with Temporal, containerize entire stack

**Timeline**: 3-4 weeks

**Infrastructure**:
- PostgreSQL database
- Temporal Server cluster
- Temporal Worker containers
- Docker Compose orchestration

**Code Changes**:
- 30-40 files modified
- Full Activity/Workflow refactor
- WebSocket streaming redesign
- Database schema updates

**Pros**:
✅ Industry-standard orchestration (16K GitHub stars, Netflix/Stripe use)
✅ Stronger guarantees (exactly-once execution, complete audit trail)
✅ Better observability (built-in Web UI, detailed event history)
✅ Advanced features (signals, queries, child workflows, versioning)
✅ Production-ready (mature tooling, extensive documentation)
✅ Self-hosted control (important for AI workflows with secrets)
✅ Containerized isolation (workflows execute in clean environments)

**Cons**:
❌ Heavy infrastructure (PostgreSQL + Temporal Server vs SQLite + child process)
❌ Steep learning curve (determinism requirements, Activity/Workflow separation)
❌ More boilerplate (separate files, proxies, explicit typing)
❌ Debugging complexity (code proxying, replay mechanics)
❌ High migration cost (3-4 weeks effort)
❌ Operational overhead (more services to maintain, monitor, scale)
❌ Increased resource usage (memory, CPU for Temporal stack)

**Best For**:
- Multi-tenant SaaS offering
- Enterprise customers (compliance, audit trails)
- Large teams (>5 engineers)
- Complex workflows (saga patterns, distributed transactions)
- Long-term production deployment

---

### Option B: Docker Only (Keep Inngest)

**Description**: Containerize current system without changing orchestration

**Timeline**: 1-2 weeks

**Infrastructure**:
- Single Docker container or per-project containers
- SQLite database (existing)
- Inngest child process (existing)

**Code Changes**:
- Path abstraction layer (DB paths ↔ container paths)
- Environment variable for `WORKSPACE_ROOT`
- Updated project services for path resolution
- Minimal service changes

**Pros**:
✅ Working system stays intact (low risk)
✅ Faster migration (1-2 weeks vs 3-4 weeks)
✅ Simpler architecture (fewer moving parts)
✅ Matches CLI tool philosophy (lightweight deployment)
✅ Easier debugging (familiar patterns)
✅ Lower resource usage (no PostgreSQL, Temporal Server)
✅ Containerized isolation (workflows in clean environments)

**Cons**:
❌ Inngest limitations remain (smaller community, fewer features)
❌ Less mature observability (compared to Temporal Web UI)
❌ No deterministic guarantees (workflow code can be non-deterministic)
❌ Limited enterprise features (no built-in versioning, saga patterns)
❌ Still requires containerization work (Dockerfile, volumes, path translation)

**Best For**:
- CLI tool use case (single-user deployment)
- MVP/prototype phase
- Small teams (<5 engineers)
- Simple workflows (linear execution, basic retry)
- Cost-conscious deployments

---

### Option C: Temporal Only (No Docker)

**Description**: Migrate to Temporal but keep native execution

**Timeline**: 2-3 weeks

**Infrastructure**:
- Temporal Server (native install or Docker)
- PostgreSQL (native or Docker)
- Temporal Worker (Node.js process)

**Code Changes**:
- Full Activity/Workflow refactor
- WebSocket streaming redesign
- Database schema updates
- No path translation needed

**Pros**:
✅ Better orchestration (Temporal benefits)
✅ No container complexity (simpler deployment)
✅ Easier local development (native debugging)
✅ Incremental rollout (can run Inngest + Temporal in parallel)

**Cons**:
❌ Doesn't address isolation goals (workflows share host filesystem)
❌ Still requires Temporal infrastructure (PostgreSQL, server)
❌ No containerized execution (original requirement unmet)
❌ Migration effort without isolation benefits

**Best For**:
- When orchestration is priority, isolation is not
- Teams wanting Temporal experience without Docker complexity
- Incremental migration path (add Docker later)

---

### Option D: Hybrid Staged Approach

**Description**: Two-phase migration - containerize first, then switch orchestration

**Timeline**: 4-6 weeks total

**Phase 1 (2 weeks): Containerize + Inngest**
- Dockerfile, docker-compose.yml
- Path abstraction layer
- Test git worktree, agent execution
- Validate containerized workflows

**Phase 2 (2-3 weeks): Switch to Temporal**
- PostgreSQL + Temporal Server
- Activity/Workflow refactor
- WebSocket streaming redesign
- Cutover and testing

**Pros**:
✅ Derisked migration (validate Docker strategy independently)
✅ Can stop after Phase 1 if Docker solves main problems
✅ Parallel work possible (infra + code)
✅ Incremental learning curve
✅ Easier rollback (two clear checkpoints)

**Cons**:
❌ Longest timeline (4-6 weeks total)
❌ Double work if committing to both anyway
❌ More testing overhead (two migration waves)
❌ Potential for scope creep between phases

**Best For**:
- Risk-averse teams
- Unclear requirements (can pivot after Phase 1)
- Learning-focused approach
- Validating containerization before architectural change

---

## Part 6: Recommendations

### For CLI Tool Use Case: **Option B (Docker Only)**

**Rationale**:

1. **Alignment with Product Vision**
   - CLI tool designed for single-user, lightweight deployment
   - SQLite + child process matches "single binary" philosophy
   - Container provides isolation without architectural complexity

2. **Lower Risk**
   - Working Inngest integration stays intact
   - 1-2 week timeline vs 3-4 weeks (50% faster)
   - Easier rollback (remove Dockerfile vs full code refactor)

3. **Better Fit for Workflow Patterns**
   - AI agent workflows are dynamic, exploratory
   - Inngest's "normal code" style better matches agent unpredictability
   - WebSocket streaming simpler with current architecture

4. **Resource Efficiency**
   - No PostgreSQL overhead
   - No Temporal Server resource usage
   - Smaller Docker image (fewer dependencies)

5. **Cost-Benefit Analysis**
   - Containerization solves: Isolation, reproducibility, deployment consistency
   - Temporal solves: Advanced orchestration, enterprise features, audit trails
   - **Current need**: Isolation > advanced orchestration

**Implementation Plan**:

**Week 1: Container Foundation**
- Create Dockerfile (Node 22, git, gh, claude CLI)
- `docker-compose.yml` with volume mounts
- Test git worktree operations in container
- Verify node-pty terminal functionality
- Test agent CLI execution

**Week 2: Path Abstraction & Integration**
- Add `WORKSPACE_ROOT` environment variable
- Implement path translation layer (`/Users/... ↔ /workspace/...`)
- Update project services (`domain/project/services/`)
- Update file services (`domain/file/services/`)
- Update git services (`domain/git/services/`)
- Migration script for existing project paths in database
- End-to-end testing (full workflow execution)

**Deliverables**:
- ✅ Working Docker container with Inngest
- ✅ Git operations (commit, branch, worktree) functional
- ✅ Agent execution (Claude) functional
- ✅ WebSocket streaming functional
- ✅ Terminal sessions functional
- ✅ Documentation (setup, usage, troubleshooting)

**Success Criteria**:
- [ ] Can run workflow in container
- [ ] Git worktree created successfully
- [ ] Agent executes and streams output
- [ ] Files written persist to host
- [ ] Terminal sessions work
- [ ] No permission issues

---

### For SaaS/Multi-User Use Case: **Option D (Hybrid Staged)**

**Rationale**:

1. **Risk Mitigation**
   - Validate containerization strategy first (Phase 1)
   - Can pivot if Docker introduces unexpected issues
   - Two clear checkpoints for stakeholder approval

2. **Strategic Flexibility**
   - Can stop after Phase 1 if containerization solves main pain points
   - Can defer Temporal investment if Inngest proves sufficient
   - Option to run Inngest + Temporal in parallel (gradual migration)

3. **Learning Curve Management**
   - Team learns Docker first (simpler)
   - Team learns Temporal second (more complex)
   - Avoids simultaneous learning of two major technologies

4. **Enterprise Readiness**
   - Phase 1 enables multi-tenancy (isolated containers)
   - Phase 2 adds compliance features (Temporal audit trails)
   - Aligns with typical SaaS maturity curve

**Implementation Plan**:

**Phase 1: Containerization (Weeks 1-2)**
- Same as Option B implementation
- Validate multi-tenant isolation
- Test resource limits per container

**Phase 2: Temporal Migration (Weeks 3-5)**
- Docker Compose for Temporal + PostgreSQL
- Extract Activities from step implementations
- Convert workflows to deterministic orchestration
- WebSocket streaming via Activity signals
- Database schema migration
- Parallel execution (Inngest + Temporal)
- Cutover and rollback plan

**Deliverables**:
- ✅ All Option B deliverables
- ✅ Temporal Server + Workers
- ✅ Activity/Workflow refactor
- ✅ Enhanced observability (Temporal Web UI)
- ✅ Production-ready orchestration

---

### When to Reconsider Temporal (Future Triggers)

**Immediate Migration to Temporal If**:
- ❗ Enterprise customer requires audit trails/compliance
- ❗ Workflow complexity exceeds Inngest capabilities (deep nesting, saga patterns)
- ❗ Team grows beyond 5 engineers (Temporal tooling scales better)
- ❗ Need advanced features (versioning, distributed transactions, cron)
- ❗ Multi-tenant SaaS launch imminent

**Stay on Inngest If**:
- ✅ CLI tool remains primary distribution model
- ✅ Workflows remain relatively simple (linear, basic retry)
- ✅ Team stays small (<5 engineers)
- ✅ Cost/complexity concerns outweigh orchestration benefits
- ✅ Faster iteration more valuable than enterprise features

---

## Part 7: Implementation Checklist

### Pre-Migration Audit

- [ ] Document all workflow definitions (count, complexity)
- [ ] Audit workflow code for non-deterministic operations (if going Temporal)
- [ ] Inventory projects (paths, count, consolidation feasibility)
- [ ] Check agent CLI installations (claude, codex, etc.)
- [ ] Review git worktree usage patterns
- [ ] Assess WebSocket streaming requirements
- [ ] Define success criteria (performance, reliability)

### Docker Setup (Option B or D Phase 1)

**Infrastructure**:
- [ ] Create Dockerfile (Node 22, system deps)
- [ ] Install git, gh CLI
- [ ] Install agent CLIs (claude, codex)
- [ ] Create docker-compose.yml
- [ ] Configure volume mounts (projects, config, temp)
- [ ] Set user/group for file permissions
- [ ] Configure environment variables

**Path Abstraction**:
- [ ] Add `WORKSPACE_ROOT` env var
- [ ] Create path translation utility (`translatePath()`)
- [ ] Update `domain/project/services/getProjectById.ts`
- [ ] Update `domain/file/services/readFile.ts`
- [ ] Update `domain/file/services/writeFile.ts`
- [ ] Update `domain/git/services/*` (all git operations)
- [ ] Update `executeAgent.ts` (working directory)
- [ ] Database migration (update existing project paths)

**Testing**:
- [ ] Git operations (commit, branch, push)
- [ ] Git worktree (create, remove, list)
- [ ] Agent execution (Claude, Codex)
- [ ] File read/write across volume boundary
- [ ] Terminal sessions (node-pty)
- [ ] WebSocket streaming
- [ ] SQLite concurrent access
- [ ] File permissions (host vs container user)
- [ ] Workflow execution end-to-end

**Documentation**:
- [ ] Docker setup instructions
- [ ] Volume mounting requirements
- [ ] Project organization guidelines (~/projects/)
- [ ] Agent CLI configuration
- [ ] Troubleshooting guide
- [ ] Performance tuning

### Temporal Migration (Option A, C, or D Phase 2)

**Infrastructure**:
- [ ] Docker Compose for Temporal + PostgreSQL
- [ ] Temporal Server health check
- [ ] Temporal Web UI access
- [ ] Worker connection testing
- [ ] Database initialization (Temporal schema)

**Code Refactoring**:
- [ ] Create `activities.ts` (10 activity functions)
- [ ] Extract `createAgentStep` → `executeAgentActivity`
- [ ] Extract `createGitStep` → `executeGitActivity`
- [ ] Extract `createCliStep` → `executeCliActivity`
- [ ] Extract remaining 7 step types
- [ ] Create `workflows.ts` (deterministic orchestration)
- [ ] Audit workflows for non-determinism
- [ ] Replace `step.agent()` → `activities.executeAgentActivity()`
- [ ] Replace `step.git()` → `activities.executeGitActivity()`
- [ ] Implement WebSocket streaming (Activity signals)
- [ ] Create `worker.ts` (Temporal Worker)
- [ ] Create `client.ts` (Temporal Client helper)

**Integration**:
- [ ] Update `executeWorkflow.ts` (Temporal Client)
- [ ] Update `getWorkflowStatus.ts` (query Temporal)
- [ ] Remove Inngest dependencies (package.json)
- [ ] Remove Inngest process spawn (CLI start.ts)
- [ ] Update routes (no breaking API changes)
- [ ] Database schema migration (temporal_run_id fields)
- [ ] Data migration (existing runs)

**Testing**:
- [ ] Unit tests (Activities)
- [ ] Integration tests (Workflows)
- [ ] E2E tests (full workflow execution)
- [ ] WebSocket streaming tests
- [ ] Parallel execution (Inngest + Temporal)
- [ ] Performance benchmarks
- [ ] Rollback testing

**Deployment**:
- [ ] Staging environment validation
- [ ] Production cutover plan
- [ ] Rollback procedure
- [ ] Monitoring setup (Temporal metrics)
- [ ] Alerting configuration
- [ ] Documentation updates

---

## Part 8: Unresolved Questions

### Product Strategy

1. **Primary Distribution Model?**
   - CLI tool for single-user (Option B recommended)
   - SaaS platform for multi-user (Option D recommended)
   - Both (prioritize which?)

2. **Timeline Constraints?**
   - Hard deadline driving urgency?
   - Can migration be staged over quarters?
   - Beta vs production launch timing?

3. **Scale Expectations?**
   - Concurrent workflows expected: <10, 10-100, >100?
   - Users per instance: 1, 10s, 100s?
   - Workflow executions per day: <100, 100-1000, >1000?

### Technical Requirements

4. **Project Organization Policy?**
   - Require users consolidate projects under `~/projects/`?
   - Support scattered project paths (more complex Docker setup)?
   - Provide migration tool for existing setups?

5. **Multi-Tenancy Model?**
   - Single container for all users (shared resources)?
   - Per-user containers (better isolation)?
   - Per-project containers (maximum isolation)?

6. **Database Strategy?**
   - Keep SQLite for simplicity?
   - Migrate to PostgreSQL for multi-container?
   - When to make this transition?

7. **Agent CLI Packaging?**
   - Pre-install all agent CLIs in Docker image?
   - Document manual setup process?
   - Support subset of agents (Claude only initially)?

### Operational Concerns

8. **Resource Limits?**
   - Memory caps per workflow?
   - CPU limits per container?
   - Disk space quotas?

9. **Persistence Strategy?**
   - How to handle container restart with active workflows?
   - Workflow pause/resume requirements?
   - Data retention policies?

10. **Networking Security?**
    - WebSocket exposure (localhost, VPN, public)?
    - Temporal gRPC exposure (internal only)?
    - TLS/SSL requirements?

11. **Cost Sensitivity?**
    - Budget for infrastructure complexity?
    - Prefer lower costs vs better features?
    - DevOps time available for maintenance?

12. **Team Capabilities?**
    - Team experience with Docker?
    - Team experience with Temporal?
    - Preference for learning new technologies vs staying familiar?

---

## Appendix: Technology Comparison Matrix

| Feature | Inngest | Temporal | Docker |
|---------|---------|----------|--------|
| **Execution Model** | Event-driven | Workflow orchestration | Container isolation |
| **State Persistence** | SQLite memoization | PostgreSQL event history | Volumes |
| **Code Style** | Normal functions | Deterministic workflows | N/A |
| **Infrastructure** | Child process | Server cluster | Container runtime |
| **Deployment** | npm package | Self-hosted/cloud | Image registry |
| **Observability** | Basic dev UI | Rich web UI | Logs/metrics |
| **Learning Curve** | Low | High | Medium |
| **Resource Usage** | Low | High | Medium |
| **Community** | 4K stars | 16K stars | Ubiquitous |
| **Maturity** | Emerging | Production-proven | Industry standard |
| **Best For** | Simple workflows | Complex workflows | Isolation |

---

## Summary

**Key Insights**:
1. Inngest integration well-architected, moderately coupled (24 files)
2. Containerization feasible but requires path abstraction layer
3. Temporal migration significant but structured (3-4 weeks)
4. Docker + Inngest best for CLI use case (lower complexity)
5. Docker + Temporal best for SaaS use case (enterprise features)

**Recommended Path**: **Option B (Docker Only)** for current CLI tool use case

**Next Steps**:
1. Answer unresolved questions (especially product strategy)
2. Create Dockerfile and docker-compose.yml
3. Implement path abstraction layer
4. Test git worktree + agent execution in container
5. Document setup and usage

**Future Considerations**:
- Revisit Temporal when enterprise features needed
- Monitor Inngest maturity and feature development
- Evaluate Temporal adoption costs as team grows
