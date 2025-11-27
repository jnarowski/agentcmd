# Preview Containers

**Status**: draft
**Created**: 2025-11-27
**Package**: apps/app
**Total Complexity**: 106 points
**Phases**: 5
**Tasks**: 20
**Overall Avg Complexity**: 5.3/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Database & Types | 4 | 18 | 4.5/10 | 6/10 |
| Phase 2: Core Services | 5 | 34 | 6.8/10 | 8/10 |
| Phase 3: Workflow SDK Integration | 3 | 18 | 6.0/10 | 7/10 |
| Phase 4: API Routes | 4 | 16 | 4.0/10 | 5/10 |
| Phase 5: Frontend UI | 4 | 20 | 5.0/10 | 6/10 |
| **Total** | **20** | **106** | **5.3/10** | **8/10** |

## Overview

Docker-based preview environments triggered by `step.preview()` in workflows. Users provide Dockerfile/docker-compose.yml, AgentCmd orchestrates container lifecycle. Supports multiple concurrent previews with dynamic port allocation.

## User Story

As a developer
I want to automatically spin up a preview environment when my workflow completes
So that I can test and review changes in an isolated, production-like environment

## Technical Approach

1. Add `Container` model to database for tracking preview instances
2. Add `preview_config` JSON field to `Project` model for default configuration
3. Create container domain services for Docker/Compose orchestration
4. Implement `step.preview()` in workflow SDK
5. Add REST API routes for container management
6. Build frontend UI for viewing and managing previews

## Key Design Decisions

| Decision | Choice |
|----------|--------|
| Container runtime | Docker + Docker Compose |
| Build strategy | Pre-built (workflow builds, preview just runs) |
| Database handling | User's responsibility in Dockerfile/Compose |
| Networking | Local only (`localhost:{port}`) |
| Port allocation | Config-based named ports (`PREVIEW_PORT_{NAME}`) |
| Default port | `["app"]` if no config specified |
| Config location | Project-level in DB (`preview_config` JSON field) |
| Config UI | Add to existing Project Edit modal |
| Resource limits | Project-level config (optional) |
| Multiple previews | Allowed - each gets unique ports |
| Cleanup | Manual only via UI |
| Triggering | Explicit `step.preview()` in workflow |
| Model name | `Container` (generic for future uses) |
| Step name | `step.preview()` (user-friendly) |
| Working directory | Uses workflow's `workingDir` (worktree or project path) |
| Health checks | User handles in Docker HEALTHCHECK directive |
| WebSocket updates | Yes - broadcast on container status changes |
| UI location | ProjectHome + WorkflowRun details (no separate tab) |
| Docker unavailable | Skip with warning, workflow continues |
| Volume mounts | User handles in their compose (no auto-mount) |
| Restart stopped | No - run new workflow for new preview |
| Cascade on delete | Auto-stop containers when workflow/project deleted |
| Concurrent creation | Port manager uses DB transaction for atomicity |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Project Config (DB)                         │
├─────────────────────────────────────────────────────────────────┤
│  preview_config: {                                              │
│    ports: ["server", "client"],      // Named ports             │
│    env: { API_KEY: "..." },          // Environment vars        │
│    maxMemory: "1g",                  // Resource limits         │
│    maxCpus: "1.0"                                               │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Workflow Step                               │
├─────────────────────────────────────────────────────────────────┤
│  await step.preview("deploy");         // Uses project config   │
│  await step.preview("deploy", {...});  // Override if needed    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Preview Service                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Check Docker available (skip with warning if not)           │
│  2. Detect: docker-compose.yml or Dockerfile                    │
│  3. Allocate ports from 5000-5999 (check existing containers)   │
│  4. Build & run: PREVIEW_PORT_{NAME}=X docker compose up        │
│  5. Create Container record in DB                               │
│  6. Broadcast via WebSocket                                     │
│  7. Return URLs to workflow                                     │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
apps/app/src/server/domain/container/
├── services/
│   ├── createContainer.ts
│   ├── stopContainer.ts
│   ├── getContainerById.ts
│   ├── getContainersByProject.ts
│   ├── getContainerLogs.ts
│   └── types.ts
├── utils/
│   ├── portManager.ts
│   ├── dockerClient.ts
│   └── detectDockerConfig.ts
└── index.ts

apps/app/src/server/domain/workflow/services/engine/steps/
└── createPreviewStep.ts

apps/app/src/server/routes/
└── containers.ts

apps/app/src/client/pages/projects/containers/
├── components/
│   └── ContainerCard.tsx
└── hooks/
    └── useContainers.ts

packages/agentcmd-workflows/src/types/
└── steps.ts (add PreviewStepConfig)
```

### Integration Points

**Database**:
- `prisma/schema.prisma` - Add Container model, preview_config to Project

**Workflow Engine**:
- `createWorkflowRuntime.ts` - Add preview step to extended steps
- `steps/index.ts` - Export createPreviewStep

**Routes**:
- `routes.ts` - Register container routes

**Frontend**:
- `ProjectHome.tsx` - Add containers section
- `WorkflowRunDetails.tsx` - Add container card
- `ProjectEditModal.tsx` - Add preview config

## Implementation Details

### 1. Database Schema

**Container Model (new)**:
```prisma
model Container {
  id                String   @id @default(cuid())
  workflow_run_id   String?  @unique
  project_id        String

  status            String   // pending | starting | running | stopped | failed
  ports             Json     // { server: 5000, client: 5001 }

  container_ids     Json?    // Array of Docker container IDs
  compose_project   String?  // docker compose -p {this}
  working_dir       String   // Path where docker build ran

  error_message     String?
  created_at        DateTime @default(now())
  started_at        DateTime?
  stopped_at        DateTime?

  workflow_run      WorkflowRun? @relation(fields: [workflow_run_id], references: [id], onDelete: Cascade)
  project           Project      @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@index([project_id])
  @@index([status])
}
```

**Project Model (modified)**:
```prisma
model Project {
  // ... existing fields
  preview_config    Json?    // ProjectPreviewConfig
  containers        Container[]
}
```

### 2. ProjectPreviewConfig Shape

```typescript
interface ProjectPreviewConfig {
  ports?: string[];              // Default: ["app"]
  env?: Record<string, string>;  // Environment variables
  maxMemory?: string;            // e.g., "1g"
  maxCpus?: string;              // e.g., "1.0"
}
```

### 3. Port Allocation Strategy

- Reserved range: 5000-5999 (1000 slots)
- Query `Container` table for `status = "running"` to find used ports
- Allocate sequential ports for multi-port requests
- Use DB transaction for atomicity (prevent race conditions)
- Environment variables: `PREVIEW_PORT_{NAME}` (uppercase)

### 4. Docker Execution

**Detection Priority**:
1. `docker-compose.yml` / `docker-compose.yaml` / `compose.yml` → use Compose
2. `Dockerfile` → use Docker
3. Neither → error

**Commands**:
```bash
# Docker Compose
PREVIEW_PORT_APP=5000 docker compose -p container-{id} up -d --build

# Dockerfile only
docker build -t container-{id} .
docker run -d -e PREVIEW_PORT_APP=5000 -p 5000:3000 --name container-{id} container-{id}

# Stop
docker compose -p container-{id} down  # or
docker stop container-{id} && docker rm container-{id}
```

### 5. WebSocket Events

Broadcast to `project:{projectId}` channel:

```typescript
// Container created
{ type: "container.created", data: { containerId, status, ports } }

// Container status changed
{ type: "container.status_changed", data: { containerId, status } }

// Container stopped
{ type: "container.stopped", data: { containerId } }
```

### 6. Cascade Deletion

**Workflow Run deleted**:
- Stop associated container (if running) via `onDelete: Cascade`
- Container record deleted automatically

**Project deleted**:
- Stop all project containers (if running) via `onDelete: Cascade`
- All Container records deleted automatically

## Files to Create/Modify

### New Files (13)

1. `apps/app/src/server/domain/container/services/createContainer.ts` - Create and start container
2. `apps/app/src/server/domain/container/services/stopContainer.ts` - Stop and remove container
3. `apps/app/src/server/domain/container/services/getContainerById.ts` - Get single container
4. `apps/app/src/server/domain/container/services/getContainersByProject.ts` - List project containers
5. `apps/app/src/server/domain/container/services/getContainerLogs.ts` - Fetch container logs
6. `apps/app/src/server/domain/container/services/types.ts` - Shared types
7. `apps/app/src/server/domain/container/utils/portManager.ts` - Port allocation
8. `apps/app/src/server/domain/container/utils/dockerClient.ts` - Docker CLI wrapper
9. `apps/app/src/server/domain/container/index.ts` - Domain exports
10. `apps/app/src/server/domain/workflow/services/engine/steps/createPreviewStep.ts` - Preview step
11. `apps/app/src/server/routes/containers.ts` - REST API routes
12. `apps/app/src/client/pages/projects/containers/components/ContainerCard.tsx` - Container card UI
13. `apps/app/src/client/pages/projects/containers/hooks/useContainers.ts` - Container hooks

### Modified Files (7)

1. `apps/app/prisma/schema.prisma` - Add Container model, preview_config to Project
2. `packages/agentcmd-workflows/src/types/steps.ts` - Add PreviewStepConfig types
3. `apps/app/src/server/domain/workflow/services/engine/steps/index.ts` - Export createPreviewStep
4. `apps/app/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts` - Add preview to extended steps
5. `apps/app/src/server/routes.ts` - Register container routes
6. `apps/app/src/client/pages/projects/ProjectHome.tsx` - Add containers section
7. `apps/app/src/client/pages/projects/components/ProjectEditModal.tsx` - Add preview config

## Step by Step Tasks

### Phase 1: Database & Types

**Phase Complexity**: 18 points (avg 4.5/10)

- [ ] 1.1 [5/10] Add Container model to Prisma schema
  - Add model with all fields (id, workflow_run_id, project_id, status, ports, container_ids, compose_project, working_dir, error_message, timestamps)
  - Add relations to WorkflowRun (optional, cascade) and Project (cascade)
  - Add indexes on project_id and status
  - File: `apps/app/prisma/schema.prisma`

- [ ] 1.2 [3/10] Add preview_config to Project model
  - Add `preview_config Json?` field to Project model
  - Add `containers Container[]` relation
  - File: `apps/app/prisma/schema.prisma`

- [ ] 1.3 [4/10] Run migration
  - Run: `cd apps/app && pnpm prisma:migrate` (name: "add-container-model")
  - Verify migration created successfully

- [ ] 1.4 [6/10] Add PreviewStepConfig types to workflow SDK
  - Add PreviewStepConfig interface with ports, env overrides
  - Add PreviewStepResult interface with urls map, containerId, status
  - Add preview method signature to WorkflowStep interface
  - File: `packages/agentcmd-workflows/src/types/steps.ts`
  - Run: `pnpm --filter agentcmd-workflows build`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Core Services

**Phase Complexity**: 34 points (avg 6.8/10)

- [ ] 2.1 [6/10] Create port manager utility
  - Implement allocatePorts(names: string[]): Promise<Record<string, number>>
  - Query Container table for running containers to find used ports
  - Use DB transaction for atomicity
  - Allocate from 5000-5999 range
  - Implement releasePorts (update container status, ports auto-freed)
  - File: `apps/app/src/server/domain/container/utils/portManager.ts`

- [ ] 2.2 [8/10] Create Docker client utility
  - Implement checkDockerAvailable(): Promise<boolean>
  - Implement detectConfig(workingDir): "compose" | "dockerfile" | null
  - Implement buildAndRun(config): Promise<{ containerIds, composeProject }>
  - Handle PREVIEW_PORT_{NAME} env var injection
  - Support resource limits (--memory, --cpus)
  - Implement stop(containerIds?, composeProject?): Promise<void>
  - Implement getLogs(containerIds): Promise<string>
  - File: `apps/app/src/server/domain/container/utils/dockerClient.ts`

- [ ] 2.3 [8/10] Create createContainer service
  - Accept workflowRunId (optional), projectId, workingDir, config overrides
  - Merge project preview_config with overrides
  - Check Docker available (skip with warning if not)
  - Allocate ports via portManager
  - Call dockerClient.buildAndRun
  - Create Container record in DB with status "starting"
  - Update status to "running" on success, "failed" on error
  - Broadcast WebSocket event
  - Return container with URLs
  - File: `apps/app/src/server/domain/container/services/createContainer.ts`

- [ ] 2.4 [6/10] Create stopContainer service
  - Accept containerId
  - Call dockerClient.stop with container_ids and compose_project
  - Update Container status to "stopped"
  - Set stopped_at timestamp
  - Broadcast WebSocket event
  - File: `apps/app/src/server/domain/container/services/stopContainer.ts`

- [ ] 2.5 [6/10] Create query services
  - Implement getContainerById
  - Implement getContainersByProject with status filter
  - Implement getContainerLogs (calls dockerClient.getLogs)
  - File: `apps/app/src/server/domain/container/services/getContainerById.ts`
  - File: `apps/app/src/server/domain/container/services/getContainersByProject.ts`
  - File: `apps/app/src/server/domain/container/services/getContainerLogs.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Workflow SDK Integration

**Phase Complexity**: 18 points (avg 6.0/10)

- [ ] 3.1 [7/10] Create preview step implementation
  - Implement createPreviewStep(context, inngestStep) factory
  - Get project preview_config from DB
  - Merge with step config overrides
  - Call createContainer service
  - Emit step events (started, completed, failed)
  - Handle Docker unavailable (skip with warning, return success with empty URLs)
  - Return PreviewStepResult with URLs
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createPreviewStep.ts`

- [ ] 3.2 [5/10] Register preview step in workflow runtime
  - Export createPreviewStep from steps/index.ts
  - Add preview method to extendInngestSteps in createWorkflowRuntime.ts
  - Wire up to createPreviewStep factory
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/index.ts`
  - File: `apps/app/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts`

- [ ] 3.3 [6/10] Add preview step tests
  - Test successful container creation
  - Test config merging (project + step)
  - Test Docker unavailable handling (skip with warning)
  - Test error handling
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createPreviewStep.test.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 4: API Routes

**Phase Complexity**: 16 points (avg 4.0/10)

- [ ] 4.1 [5/10] Create container routes
  - GET /api/projects/:projectId/containers - List project containers
  - GET /api/containers/:id - Get container details
  - DELETE /api/containers/:id - Stop container
  - GET /api/containers/:id/logs - Get container logs
  - Add Zod schemas for request/response validation
  - File: `apps/app/src/server/routes/containers.ts`

- [ ] 4.2 [3/10] Register routes
  - Register container routes in routes.ts
  - File: `apps/app/src/server/routes.ts`

- [ ] 4.3 [4/10] Add route tests
  - Test list containers returns correct data
  - Test get container by ID
  - Test stop container updates status
  - Test get logs returns output
  - File: `apps/app/src/server/routes/containers.test.ts`

- [ ] 4.4 [4/10] Add container domain exports
  - Create index.ts with all service exports
  - Create types.ts with shared types (ContainerStatus, etc.)
  - File: `apps/app/src/server/domain/container/index.ts`
  - File: `apps/app/src/server/domain/container/services/types.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 5: Frontend UI

**Phase Complexity**: 20 points (avg 5.0/10)

- [ ] 5.1 [5/10] Create container hooks and types
  - Add Container type to client types
  - Create useContainers hook (list by project)
  - Create useContainer hook (single container)
  - Create useStopContainer mutation
  - Wire up WebSocket for real-time updates
  - File: `apps/app/src/client/pages/projects/containers/hooks/useContainers.ts`

- [ ] 5.2 [6/10] Create ContainerCard component
  - Display status badge (running/stopped/failed with colors)
  - Show port URLs as clickable links (open in new tab)
  - Stop button with confirmation
  - View logs button (opens modal or drawer)
  - Timestamps (created, started, stopped)
  - File: `apps/app/src/client/pages/projects/containers/components/ContainerCard.tsx`

- [ ] 5.3 [5/10] Add containers section to ProjectHome
  - Add "Active Previews" section
  - List running containers using ContainerCard
  - Empty state when no containers
  - Subscribe to WebSocket for real-time updates
  - File: `apps/app/src/client/pages/projects/ProjectHome.tsx`

- [ ] 5.4 [4/10] Add preview config to Project Edit modal
  - Add "Preview Settings" section to modal
  - Port names input (comma-separated or tag input)
  - Environment variables (key-value pairs)
  - Resource limits (memory, CPU dropdowns)
  - File: `apps/app/src/client/pages/projects/components/ProjectEditModal.tsx`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

**`portManager.test.ts`** - Port allocation:
- Allocates sequential ports
- Avoids used ports (from running containers)
- Uses transaction for atomicity
- Handles exhausted port range

**`dockerClient.test.ts`** - Docker operations:
- Detects Dockerfile vs docker-compose.yml
- Builds correct command strings
- Passes env vars correctly
- Handles Docker unavailable

**`createPreviewStep.test.ts`** - Preview step logic:
- Creates container with correct config
- Merges project and step config correctly
- Skips gracefully when Docker unavailable
- Emits correct step events

### Integration Tests

**`containers.test.ts`** - API routes:
- List containers returns correct data
- Get container by ID works
- Stop container updates status
- Get logs returns output

## Success Criteria

- [ ] Container model created with all required fields
- [ ] Project preview_config field added
- [ ] Port manager allocates/releases correctly with atomicity
- [ ] Docker client handles both Dockerfile and docker-compose.yml
- [ ] step.preview() works in workflows
- [ ] Docker unavailable handled gracefully (skip with warning)
- [ ] Containers can be stopped via API
- [ ] UI displays container status and URLs on ProjectHome
- [ ] Container card shown on WorkflowRun details
- [ ] Preview config editable in Project Edit modal
- [ ] WebSocket broadcasts container status changes
- [ ] Cascade deletion works (workflow/project delete stops containers)
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No lint errors

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: Build completes without errors

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests
pnpm --filter app test
# Expected: All tests pass

# SDK build
pnpm --filter agentcmd-workflows build
# Expected: Build completes without errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Create a project with a Dockerfile or docker-compose.yml
3. Edit project → add preview config (ports: ["app"])
4. Run a workflow with `step.preview("deploy")`
5. Verify container starts and URLs are returned
6. Check ProjectHome shows container card
7. Check WorkflowRun details shows container
8. Open preview URL in browser
9. Stop container via UI
10. Verify container status updates to "stopped"
11. Delete workflow run → verify container is stopped/deleted

**Feature-Specific Checks:**

- Verify port allocation doesn't conflict between multiple previews
- Test with both Dockerfile and docker-compose.yml projects
- Verify env vars (PREVIEW_PORT_*) are passed correctly
- Check logs endpoint returns container output
- Test WebSocket updates when container status changes
- Test cascade deletion (delete project with running container)

## User Documentation Examples

### Basic docker-compose.yml (single port)
```yaml
services:
  app:
    build: .
    ports:
      - "${PREVIEW_PORT_APP:-3000}:3000"
    environment:
      - PORT=3000
```

### Multi-service docker-compose.yml (hot-reload)
```yaml
services:
  server:
    build: .
    ports:
      - "${PREVIEW_PORT_SERVER:-4100}:4100"
    volumes:
      - .:/app
      - /app/node_modules
    command: pnpm dev:server

  client:
    build: .
    ports:
      - "${PREVIEW_PORT_CLIENT:-4101}:4101"
    volumes:
      - .:/app
      - /app/node_modules
    command: pnpm dev:client

  db:
    image: postgres:15
    ports:
      - "${PREVIEW_PORT_DB:-5432}:5432"
    environment:
      POSTGRES_PASSWORD: preview
```

### Basic Dockerfile
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Implementation Notes

### 1. Docker Availability

The feature requires Docker to be installed on the host machine. If Docker is not available, the preview step skips gracefully with a warning - workflow continues without preview.

### 2. Port Range

Ports 5000-5999 are reserved for previews. This provides 1000 slots. If exhausted, allocation fails with clear error.

### 3. Compose Project Naming

Use `container-{containerId}` as the compose project name to ensure isolation between previews and easy cleanup.

### 4. Health Checks

User handles health checks in their Docker HEALTHCHECK directive. AgentCmd doesn't wait for health - just starts containers and returns.

### 5. Volume Mounts

User handles volume mounts in their compose file. AgentCmd doesn't auto-mount - preserves user control and follows "Dockerfile is the contract" philosophy.

## Dependencies

- Docker CLI must be available on host
- Docker Compose v2 recommended (uses `docker compose` not `docker-compose`)
- No new npm packages required (uses child_process for Docker CLI)

## References

- [Docker Compose CLI Reference](https://docs.docker.com/compose/reference/)
- [Docker Run Reference](https://docs.docker.com/engine/reference/run/)
- Plan file: `/Users/jnarowski/.claude/plans/pure-prancing-tower.md`
- Existing workflow step implementations: `apps/app/src/server/domain/workflow/services/engine/steps/`

## Next Steps

1. Implement Phase 1 (Database & Types)
2. Implement Phase 2 (Core Services)
3. Implement Phase 3 (Workflow SDK Integration)
4. Implement Phase 4 (API Routes)
5. Implement Phase 5 (Frontend UI)
