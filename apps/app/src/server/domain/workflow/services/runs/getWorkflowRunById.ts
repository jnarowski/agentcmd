import { prisma } from '@/shared/prisma';
import type { WorkflowRun } from '@prisma/client';
import type { GetWorkflowRunByIdOptions } from '@/server/domain/workflow/types/GetWorkflowRunByIdOptions';
import { SYSTEM_PHASES } from '@/shared/constants/workflow';
import { config } from '@/server/config';

/**
 * Build URLs from container ports using externalHost config
 */
function buildContainerUrls(ports: Record<string, number>): Record<string, string> {
  const { externalHost } = config.server;
  return Object.entries(ports).reduce(
    (acc, [name, port]) => {
      acc[name] = `http://${externalHost}:${port}`;
      return acc;
    },
    {} as Record<string, string>
  );
}

/**
 * Gets a single workflow run by ID with all relations
 * Includes: steps (with agent sessions), events, workflow_definition, artifacts
 * Note: Artifacts are now organized by phase, not by step
 */
export async function getWorkflowRunById({ id }: GetWorkflowRunByIdOptions): Promise<WorkflowRun | null> {
  const run = await prisma.workflowRun.findUnique({
    where: { id },
    include: {
      workflow_definition: true,
      container: true,
      steps: {
        include: {
          session: true, // Agent session relation
        },
        orderBy: { created_at: 'asc' },
      },
      events: true, // Include all events at run level
    },
  });

  if (!run) {
    return null;
  }

  // Fetch all artifacts for this run using direct relationship
  const allArtifacts = await prisma.workflowArtifact.findMany({
    where: {
      workflow_run_id: id,
    },
    orderBy: { created_at: 'asc' },
  });

  // Fetch all events for this run
  const allEvents = await prisma.workflowEvent.findMany({
    where: {
      workflow_run_id: id,
    },
    include: {
      created_by_user: {
        select: {
          id: true,
          email: true,
        },
      },
      artifacts: true,
    },
    orderBy: { created_at: 'asc' },
  });

  // Parse JSON fields (Prisma stores JSON as strings in SQLite)
  // Transform field names to match frontend types
  let phases = run.workflow_definition?.phases
    ? (typeof run.workflow_definition.phases === 'string'
        ? JSON.parse(run.workflow_definition.phases)
        : run.workflow_definition.phases)
    : [];

  // Always inject system phases (Setup at start, Finalize at end)
  phases = [SYSTEM_PHASES.setup, ...phases, SYSTEM_PHASES.finalize];

  // Transform container to include computed urls
  const containerWithUrls = run.container ? {
    ...run.container,
    ports: run.container.ports && typeof run.container.ports === 'string'
      ? JSON.parse(run.container.ports)
      : run.container.ports,
    urls: run.container.ports
      ? buildContainerUrls(
          typeof run.container.ports === 'string'
            ? JSON.parse(run.container.ports)
            : run.container.ports as Record<string, number>
        )
      : null,
  } : null;

  const parsedRun = {
    ...run,
    args: run.args && typeof run.args === 'string'
      ? JSON.parse(run.args)
      : run.args,
    container: containerWithUrls,
    workflow_definition: run.workflow_definition ? {
      ...run.workflow_definition,
      phases,
      args_schema: run.workflow_definition.args_schema && typeof run.workflow_definition.args_schema === 'string'
        ? JSON.parse(run.workflow_definition.args_schema)
        : run.workflow_definition.args_schema,
    } : run.workflow_definition,
    // Transform steps to match frontend types (step_name, phase_name, logs)
    steps: run.steps.map(step => ({
      ...step,
      stepName: step.name,
      phaseName: step.phase,
      logs: null,
    })),
    // Use all events fetched separately
    events: allEvents.map(event => ({
      ...event,
      eventData: event.event_data && typeof event.event_data === 'string'
        ? JSON.parse(event.event_data)
        : event.event_data,
      artifacts: event.artifacts?.map(artifact => ({
        ...artifact,
        fileName: artifact.name,
      })),
    })),
    // Use all artifacts fetched separately (includes phase-level artifacts)
    artifacts: allArtifacts,
  };

  return parsedRun as WorkflowRun;
}
