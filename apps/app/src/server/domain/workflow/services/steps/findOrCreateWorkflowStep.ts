import type { WorkflowRunStep, StepType } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { findWorkflowStepByName } from './findWorkflowStepByName';
import { createWorkflowStep } from './createWorkflowStep';

/**
 * Find existing workflow step or create new one if not found
 * Convenience function that combines findWorkflowStepByName + createWorkflowStep
 */
export async function findOrCreateWorkflowStep(
  runId: string,
  inngestStepId: string,
  stepName: string,
  stepType: StepType,
  phase?: string,
  logger?: FastifyBaseLogger
): Promise<WorkflowRunStep> {
  // Try to find existing step
  let step = await findWorkflowStepByName(runId, stepName, phase, logger);

  // Create if not found
  if (!step) {
    logger?.debug(
      { runId, inngestStepId, stepName, phase },
      'Step not found, creating new step'
    );
    step = await createWorkflowStep(runId, inngestStepId, stepName, stepType, phase, logger);
  }

  return step;
}
