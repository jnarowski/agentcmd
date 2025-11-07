import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../../types/engine.types";
import { generateInngestStepId } from "./utils/generateInngestStepId";
import { findOrCreateStep } from "./utils/findOrCreateStep";
import { updateStepStatus } from "./utils/updateStepStatus";
import { handleStepFailure } from "./utils/handleStepFailure";
import { toId } from "./utils/toId";
import { toName } from "./utils/toName";

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
