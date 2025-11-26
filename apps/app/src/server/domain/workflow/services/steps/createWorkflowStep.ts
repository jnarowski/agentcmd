import { prisma } from '@/shared/prisma';
import type { WorkflowRunStep, StepType } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Create a new workflow execution step
 * Includes WebSocket broadcasting for real-time updates
 */
export async function createWorkflowStep(
  runId: string,
  inngestStepId: string,
  stepName: string,
  stepType: StepType,
  phase?: string,
  logger?: FastifyBaseLogger
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
      status: 'pending',
      phase: phase || '',
    },
  });

  logger?.debug({ stepId: step.id }, 'Workflow step created');

  // TODO: Add WebSocket broadcasting when event bus is available
  // eventBus.emit('workflow.step.created', { stepId: step.id, runId });

  return step;
}
