import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import { generateInngestStepId } from "@/server/domain/workflow/services/engine/steps/utils/generateInngestStepId";
import { findOrCreateStep } from "@/server/domain/workflow/services/engine/steps/utils/findOrCreateStep";
import { updateStepStatus } from "@/server/domain/workflow/services/engine/steps/utils/updateStepStatus";
import { handleStepFailure } from "@/server/domain/workflow/services/engine/steps/utils/handleStepFailure";
import { toId } from "@/server/domain/workflow/services/engine/steps/utils/toId";
import { toName } from "@/server/domain/workflow/services/engine/steps/utils/toName";

/**
 * Create generic run step factory function
 * Wraps Inngest's native step.run() with phase prefixing and status tracking
 */
export function createRunStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function run<T>(
    idOrName: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const id = toId(idOrName);
    const name = toName(idOrName);

    // Generate phase-prefixed Inngest step ID
    const inngestStepId = generateInngestStepId(context, id);

    return (await inngestStep.run(inngestStepId, async () => {
      // Find or create step in database
      const step = await findOrCreateStep(context, inngestStepId, name);

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
  };
}
