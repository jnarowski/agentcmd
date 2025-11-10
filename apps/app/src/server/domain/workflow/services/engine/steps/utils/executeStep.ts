import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import { findOrCreateStep } from "./findOrCreateStep";
import { updateStepStatus } from "./updateStepStatus";
import { handleStepFailure } from "./handleStepFailure";
import { generateInngestStepId } from "./generateInngestStepId";

/**
 * Execute a step function with automatic status tracking and Inngest memoization
 *
 * @param context - Runtime context
 * @param stepId - User-provided step ID (will be prefixed with phase)
 * @param stepName - Step display name
 * @param fn - Step function to execute
 * @param inngestStep - Inngest step instance for memoization
 * @returns Step result
 */
export async function executeStep<T>(
  context: RuntimeContext,
  stepId: string,
  stepName: string,
  fn: () => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
): Promise<T> {
  // Generate phase-prefixed Inngest step ID
  const inngestStepId = generateInngestStepId(context, stepId);

  // Wrap entire step in inngestStep.run for idempotency
  return (await inngestStep.run(inngestStepId, async () => {
    // Find or create step in database
    const step = await findOrCreateStep(context, inngestStepId, stepName);

    // Update to running
    await updateStepStatus(context, step.id, "running");

    try {
      // Execute step function
      const result = await fn();

      // Update to completed
      await updateStepStatus(
        context,
        step.id,
        "completed",
        result as Record<string, unknown>
      );

      return result;
    } catch (error) {
      // Handle failure
      await handleStepFailure(context, step.id, error as Error);
      throw error;
    }
  })) as unknown as Promise<T>;
}
