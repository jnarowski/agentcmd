import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { WorkflowRunStep, StepType } from "@prisma/client";
import { findOrCreateWorkflowStep } from "@/server/domain/workflow/services/steps/findOrCreateWorkflowStep";

/**
 * Find existing or create new workflow execution step
 * Steps are created dynamically as workflow executes
 */
export async function findOrCreateStep(params: {
  context: RuntimeContext;
  inngestStepId: string;
  stepName: string;
  stepType: StepType;
  args?: unknown;
}): Promise<WorkflowRunStep> {
  const { context, inngestStepId, stepName, stepType, args } = params;
  const { runId, currentPhase, logger } = context;

  // Use domain service for find-or-create logic
  const step = await findOrCreateWorkflowStep(
    runId,
    inngestStepId,
    stepName,
    stepType,
    currentPhase ?? undefined,
    logger,
    args
  );

  return step;
}
