# Preview Containers

**Status**: draft
**Created**: 2025-11-27
**Package**: apps/app
**Total Complexity**: 98 points
**Phases**: 5
**Tasks**: 18
**Overall Avg Complexity**: 5.4/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Database & Types | 3 | 14 | 4.7/10 | 6/10 |
| Phase 2: Core Services | 5 | 32 | 6.4/10 | 8/10 |
| Phase 3: Workflow SDK Integration | 3 | 18 | 6.0/10 | 7/10 |
| Phase 4: API Routes | 3 | 14 | 4.7/10 | 5/10 |
| Phase 5: Frontend UI | 4 | 20 | 5.0/10 | 6/10 |
| **Total** | **18** | **98** | **5.4/10** | **8/10** |

## Overview

Docker-based preview environments triggered by `step.preview()` in workflows. Allows users to spin up containerized instances of their application after workflow completion for testing and review. Supports both Dockerfile and Docker Compose configurations with dynamic port allocation.

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

1. **Docker as interface contract**: Users provide Dockerfile/docker-compose.yml - AgentCmd only orchestrates, doesn't need framework-specific knowledge
2. **Config-based port allocation**: Named ports (`PREVIEW_PORT_SERVER`, `PREVIEW_PORT_CLIENT`) passed as env vars, user maps in compose file
3. **Project-level defaults**: Preview config (ports, env, resources) stored at project level, step can override
4. **Manual cleanup only**: No TTL or auto-cleanup - user controls lifecycle via UI
5. **Container model (generic)**: Named "Container" not "Preview" to allow future uses (dev environments, etc.)
6. **step.preview() API**: User-friendly SDK method name, maps to Container model internally

## Architecture

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
│   └── healthChecker.ts
└── index.ts

apps/app/src/server/domain/workflow/services/engine/steps/
└── createPreviewStep.ts

apps/app/src/server/routes/
└── containers.ts

apps/app/src/client/pages/projects/containers/
├── components/
│   ├── ContainerCard.tsx
│   ├── ContainerList.tsx
│   └── ContainerLogs.tsx
├── hooks/
│   └── useContainers.ts
└── ProjectContainers.tsx

packages/agentcmd-workflows/src/types/
└── steps.ts (modify - add PreviewStepConfig)
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
- `ProjectLayout.tsx` - Add Previews tab/section

## Implementation Details

### 1. Container Model

Tracks preview container instances with status, ports, and Docker metadata.

**Key Points**:
- `workflow_run_id` optional to allow standalone containers later
- `ports` stored as JSON map (`{ server: 5000, client: 5001 }`)
- `container_ids` is array (compose can have multiple containers)
- `compose_project` stores the `-p` project name for compose commands

### 2. Project Preview Config

Stored as JSON in Project model, defines defaults for all previews.

**Key Points**:
- `ports` - Array of port names (e.g., `["server", "client"]`)
- `env` - Environment variables to pass to containers
- `maxMemory` / `maxCpus` - Resource limits
- Step config merges with/overrides project config

### 3. Port Manager

Allocates ports from 5000-5999 range, tracks usage in database.

**Key Points**:
- Query existing containers to find used ports
- Allocate sequential ports for multi-port requests
- Release ports when container stops

### 4. Docker Client

Wrapper around Docker CLI for build/run/stop operations.

**Key Points**:
- Detect docker-compose.yml vs Dockerfile
- Build with appropriate command
- Pass PREVIEW_PORT_{NAME} env vars
- Health check polling after start

### 5. Preview Step

SDK step that triggers container deployment from workflow.

**Key Points**:
- Merge project config with step overrides
- Call container services
- Return URLs in result
- Update workflow run with preview info

## Files to Create/Modify

### New Files (14)

1. `apps/app/src/server/domain/container/services/createContainer.ts` - Create and start container
2. `apps/app/src/server/domain/container/services/stopContainer.ts` - Stop and remove container
3. `apps/app/src/server/domain/container/services/getContainerById.ts` - Get single container
4. `apps/app/src/server/domain/container/services/getContainersByProject.ts` - List project containers
5. `apps/app/src/server/domain/container/services/getContainerLogs.ts` - Fetch container logs
6. `apps/app/src/server/domain/container/services/types.ts` - Shared types
7. `apps/app/src/server/domain/container/utils/portManager.ts` - Port allocation
8. `apps/app/src/server/domain/container/utils/dockerClient.ts` - Docker CLI wrapper
9. `apps/app/src/server/domain/container/utils/healthChecker.ts` - Health check polling
10. `apps/app/src/server/domain/container/index.ts` - Domain exports
11. `apps/app/src/server/domain/workflow/services/engine/steps/createPreviewStep.ts` - Preview step
12. `apps/app/src/server/routes/containers.ts` - REST API routes
13. `apps/app/src/client/pages/projects/containers/ProjectContainers.tsx` - Container list page
14. `apps/app/src/client/pages/projects/containers/components/ContainerCard.tsx` - Container card UI

### Modified Files (6)

1. `apps/app/prisma/schema.prisma` - Add Container model, preview_config to Project
2. `packages/agentcmd-workflows/src/types/steps.ts` - Add PreviewStepConfig types
3. `apps/app/src/server/domain/workflow/services/engine/steps/index.ts` - Export createPreviewStep
4. `apps/app/src/server/domain/workflow/services/engine/createWorkflowRuntime.ts` - Add preview to extended steps
5. `apps/app/src/server/routes.ts` - Register container routes
6. `apps/app/src/client/routes.tsx` - Add container routes

## Step by Step Tasks

### Phase 1: Database & Types

**Phase Complexity**: 14 points (avg 4.7/10)

- [ ] 1.1 [5/10] Add Container model to Prisma schema
  - Add model with id, workflow_run_id, project_id, status, ports, container_ids, compose_project, working_dir, error_message, timestamps
  - Add relation to WorkflowRun (optional) and Project
  - File: `apps/app/prisma/schema.prisma`
  - Run: `pnpm prisma:migrate` (name: "add-container-model")

- [ ] 1.2 [3/10] Add preview_config to Project model
  - Add `preview_config Json?` field to Project model
  - Document expected shape in comments
  - File: `apps/app/prisma/schema.prisma`
  - Migration included in 1.1

- [ ] 1.3 [6/10] Add PreviewStepConfig types to workflow SDK
  - Add PreviewStepConfig interface with ports, env, resources overrides
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

**Phase Complexity**: 32 points (avg 6.4/10)

- [ ] 2.1 [5/10] Create port manager utility
  - Implement allocatePorts(names: string[]): Promise<Record<string, number>>
  - Implement releasePorts(ports: number[]): Promise<void>
  - Query Container table for used ports in 5000-5999 range
  - File: `apps/app/src/server/domain/container/utils/portManager.ts`

- [ ] 2.2 [8/10] Create Docker client utility
  - Detect docker-compose.yml vs Dockerfile in working directory
  - Implement buildAndRun(config): Promise<ContainerResult>
  - Handle PREVIEW_PORT_{NAME} env var injection
  - Support resource limits (--memory, --cpus)
  - Implement stop(containerIds, composeProject): Promise<void>
  - Implement getLogs(containerId): Promise<string>
  - File: `apps/app/src/server/domain/container/utils/dockerClient.ts`

- [ ] 2.3 [4/10] Create health checker utility
  - Implement waitForHealth(url, timeout): Promise<boolean>
  - Poll health endpoint with exponential backoff
  - Return false on timeout, true on 200 response
  - File: `apps/app/src/server/domain/container/utils/healthChecker.ts`

- [ ] 2.4 [7/10] Create createContainer service
  - Accept workflowRunId, projectId, config overrides
  - Merge project preview_config with step config
  - Allocate ports via portManager
  - Call dockerClient.buildAndRun
  - Wait for health check
  - Create Container record in DB
  - Return container with URLs
  - File: `apps/app/src/server/domain/container/services/createContainer.ts`

- [ ] 2.5 [8/10] Create stopContainer service
  - Accept containerId
  - Call dockerClient.stop with container_ids and compose_project
  - Release ports via portManager
  - Update Container status to "stopped"
  - Set stopped_at timestamp
  - File: `apps/app/src/server/domain/container/services/stopContainer.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Workflow SDK Integration

**Phase Complexity**: 18 points (avg 6.0/10)

- [ ] 3.1 [7/10] Create preview step implementation
  - Implement createPreviewStep(context, inngestStep) factory
  - Call createContainer service
  - Emit step events (started, completed, failed)
  - Return PreviewStepResult with URLs
  - Handle errors and cleanup on failure
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
  - Test error handling
  - Test port allocation
  - File: `apps/app/src/server/domain/workflow/services/engine/steps/createPreviewStep.test.ts`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 4: API Routes

**Phase Complexity**: 14 points (avg 4.7/10)

- [ ] 4.1 [5/10] Create container routes
  - GET /api/projects/:projectId/containers - List project containers
  - GET /api/containers/:id - Get container details
  - DELETE /api/containers/:id - Stop container
  - GET /api/containers/:id/logs - Get container logs
  - Add Zod schemas for request/response validation
  - File: `apps/app/src/server/routes/containers.ts`

- [ ] 4.2 [4/10] Create container query services
  - Implement getContainerById
  - Implement getContainersByProject with pagination
  - Implement getContainerLogs (calls dockerClient)
  - File: `apps/app/src/server/domain/container/services/getContainerById.ts`
  - File: `apps/app/src/server/domain/container/services/getContainersByProject.ts`
  - File: `apps/app/src/server/domain/container/services/getContainerLogs.ts`

- [ ] 4.3 [5/10] Register routes and add tests
  - Register container routes in routes.ts
  - Add route tests for CRUD operations
  - File: `apps/app/src/server/routes.ts`
  - File: `apps/app/src/server/routes/containers.test.ts`

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
  - File: `apps/app/src/client/pages/projects/containers/hooks/useContainers.ts`
  - File: `apps/app/src/client/pages/projects/containers/types.ts`

- [ ] 5.2 [6/10] Create ContainerCard component
  - Display status badge (running/stopped/failed)
  - Show port URLs as clickable links
  - Stop button with confirmation
  - View logs button
  - Timestamps (created, started, stopped)
  - File: `apps/app/src/client/pages/projects/containers/components/ContainerCard.tsx`

- [ ] 5.3 [5/10] Create ProjectContainers page
  - List all containers for project
  - Empty state when no containers
  - Filter by status (optional)
  - Integrate with project layout
  - File: `apps/app/src/client/pages/projects/containers/ProjectContainers.tsx`

- [ ] 5.4 [4/10] Add container section to WorkflowRunDetails
  - Show preview card if workflow has associated container
  - Link to container details
  - Quick actions (stop, view logs, open URL)
  - File: `apps/app/src/client/pages/projects/workflows/components/WorkflowRunDetails.tsx`

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

**`createPreviewStep.test.ts`** - Preview step logic:
- Creates container with correct config
- Merges project and step config correctly
- Handles Docker errors gracefully
- Emits correct step events

**`portManager.test.ts`** - Port allocation:
- Allocates sequential ports
- Avoids used ports
- Releases ports correctly

**`dockerClient.test.ts`** - Docker operations:
- Detects Dockerfile vs docker-compose.yml
- Builds correct command strings
- Passes env vars correctly

### Integration Tests

**`containers.test.ts`** - API routes:
- List containers returns correct data
- Get container by ID works
- Stop container updates status
- Get logs returns output

### E2E Tests

**`container-preview.e2e.spec.ts`** - Full flow:
- Run workflow with step.preview()
- Verify container starts
- Check URLs are accessible
- Stop container via UI
- Verify cleanup

## Success Criteria

- [ ] Container model created with all required fields
- [ ] Project preview_config field added
- [ ] Port manager allocates/releases correctly
- [ ] Docker client handles both Dockerfile and docker-compose.yml
- [ ] step.preview() works in workflows
- [ ] Containers can be stopped via API
- [ ] UI displays container status and URLs
- [ ] Container logs are viewable
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
3. Configure project preview_config via API/DB
4. Run a workflow with `step.preview("deploy")`
5. Verify container starts and URLs are returned
6. Check container appears in UI
7. Open preview URL in browser
8. Stop container via UI
9. Verify container status updates to "stopped"

**Feature-Specific Checks:**

- Verify port allocation doesn't conflict
- Test with both Dockerfile and docker-compose.yml projects
- Verify env vars (PREVIEW_PORT_*) are passed correctly
- Check logs endpoint returns container output
- Verify stopped containers release their ports

## Implementation Notes

### 1. Docker Availability

The feature requires Docker to be installed on the host machine. If Docker is not available, the preview step should fail gracefully with a clear error message.

### 2. Port Range

Ports 5000-5999 are reserved for previews. This provides 1000 slots. If exhausted, the allocation should fail with a clear error.

### 3. Compose Project Naming

Use `preview-{containerId}` as the compose project name to ensure isolation between previews and easy cleanup.

### 4. Health Check Timeout

Default health check timeout is 120 seconds. For slow-starting applications, users should configure appropriate health check settings in their Dockerfile/compose.

## Dependencies

- Docker CLI must be available on host
- Docker Compose v2 recommended (uses `docker compose` not `docker-compose`)
- No new npm packages required (uses child_process for Docker CLI)

## References

- [Docker Compose CLI Reference](https://docs.docker.com/compose/reference/)
- [Docker Run Reference](https://docs.docker.com/engine/reference/run/)
- Existing workflow step implementations: `apps/app/src/server/domain/workflow/services/engine/steps/`

## Next Steps

1. Run migration to add Container model
2. Implement port manager utility
3. Implement Docker client utility
4. Create container services
5. Add preview step to workflow SDK
6. Create API routes
7. Build frontend UI
8. Write tests
9. Manual testing with sample project
