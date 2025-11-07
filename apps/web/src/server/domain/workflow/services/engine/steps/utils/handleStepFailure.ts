import type { RuntimeContext } from "../../../../types/engine.types";
import { updateStepStatus } from "./updateStepStatus";

/**
 * Handle step failure with cleanup
 *
 * @param context - Runtime context
 * @param stepId - Step ID
 * @param error - Error that occurred
 */
export async function handleStepFailure(
  context: RuntimeContext,
  stepId: string,
  error: Error
): Promise<void> {
  const { logger } = context;

  logger.error(
    { runId: context.runId, stepId, error: error.message },
    "Step failed"
  );

  await updateStepStatus(context, stepId, "failed", undefined, error.message);
}
