import { prisma } from '@/shared/prisma';
import type { WorkflowRun } from '@prisma/client';
import type { GetWorkflowRunByIdOptions } from '@/server/domain/workflow/types/GetWorkflowRunByIdOptions';

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
  const parsedRun = {
    ...run,
    args: run.args && typeof run.args === 'string'
      ? JSON.parse(run.args)
      : run.args,
    workflowDefinition: run.workflow_definition ? {
      ...run.workflow_definition,
      phases: typeof run.workflow_definition.phases === 'string'
        ? JSON.parse(run.workflow_definition.phases)
        : run.workflow_definition.phases,
      argsSchema: run.workflow_definition.args_schema && typeof run.workflow_definition.args_schema === 'string'
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
