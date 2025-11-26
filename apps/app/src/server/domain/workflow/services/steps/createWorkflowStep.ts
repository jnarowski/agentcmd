import { prisma } from '@/shared/prisma';
import { Prisma, type WorkflowRunStep, type StepType } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { broadcastWorkflowEvent } from '@/server/domain/workflow/services/events/broadcastWorkflowEvent';
import { WorkflowWebSocketEventTypes } from '@/shared/types/websocket.types';
import { sanitizeJson } from '@/server/domain/workflow/utils/sanitizeJson';

/**
 * Create a new workflow execution step
 * Steps are created as "running" since they execute immediately
 * Includes WebSocket broadcasting for real-time updates
 */
export async function createWorkflowStep(
  runId: string,
  inngestStepId: string,
  stepName: string,
  stepType: StepType,
  phase?: string,
  logger?: FastifyBaseLogger,
  args?: unknown
): Promise<WorkflowRunStep> {
  logger?.debug(
    { runId, inngestStepId, stepName, phase },
    'Creating workflow step'
  );

  const step = await prisma.workflowRunStep.create({
    data: {
      workflow_run_id: runId,
      inngest_step_id: inngestStepId,
      name: stepName,
      step_type: stepType,
      status: 'running',
      started_at: new Date(),
      phase: phase || '',
      args: args !== undefined ? sanitizeJson(args) as Prisma.InputJsonValue : undefined,
    },
  });

  logger?.debug({ stepId: step.id }, 'Workflow step created');

  // Broadcast STEP_CREATED WebSocket event
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    select: { project_id: true },
  });

  if (run) {
    broadcastWorkflowEvent(run.project_id, {
      type: WorkflowWebSocketEventTypes.STEP_CREATED,
      data: {
        run_id: runId,
        step: {
          id: step.id,
          workflow_run_id: step.workflow_run_id,
          inngest_step_id: step.inngest_step_id,
          name: step.name,
          step_type: step.step_type,
          status: step.status,
          phase: step.phase,
          created_at: step.created_at,
          started_at: step.started_at,
        },
      },
    });
  }

  return step;
}
