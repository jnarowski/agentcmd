import { prisma } from '@/shared/prisma';
import type { WorkflowRunStep } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Find workflow execution step by execution ID, name, and optional phase
 * Returns null if not found
 */
export async function findWorkflowStepByName(
  runId: string,
  stepName: string,
  phase?: string,
  logger?: FastifyBaseLogger
): Promise<WorkflowRunStep | null> {
  logger?.debug(
    { runId, stepName, phase },
    'Finding workflow step by name'
  );

  const step = await prisma.workflowRunStep.findFirst({
    where: {
      workflow_run_id: runId,
      name: stepName,
      ...(phase && { phase }),
    },
  });

  if (step) {
    logger?.debug({ stepId: step.id }, 'Workflow step found');
  } else {
    logger?.debug('Workflow step not found');
  }

  return step;
}
