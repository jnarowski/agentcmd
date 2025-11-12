import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
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

  // Store error details in output
  const errorOutput = {
    error: error.message,
    name: error.name,
    stack: error.stack,
  };

  await updateStepStatus(
    context,
    stepId,
    "failed",
    undefined, // no input update
    errorOutput, // error details as output
    error.message // simple error message
  );
}
