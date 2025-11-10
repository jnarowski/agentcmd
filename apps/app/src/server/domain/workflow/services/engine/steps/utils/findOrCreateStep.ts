import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { WorkflowRunStep } from "@prisma/client";
import { findOrCreateWorkflowStep } from "@/server/domain/workflow/services/steps/findOrCreateWorkflowStep";

/**
 * Find existing or create new workflow execution step
 * Steps are created dynamically as workflow executes
 *
 * @param context - Runtime context
 * @param inngestStepId - Inngest step ID for memoization
 * @param stepName - Step display name
 * @returns WorkflowRunStep record
 */
export async function findOrCreateStep(
  context: RuntimeContext,
  inngestStepId: string,
  stepName: string
): Promise<WorkflowRunStep> {
  const { runId, currentPhase, logger } = context;

  // Use domain service for find-or-create logic
  const step = await findOrCreateWorkflowStep(
    runId,
    inngestStepId,
    stepName,
    currentPhase ?? undefined,
    logger
  );

  return step;
}
