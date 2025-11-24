import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import { updateWorkflowRun } from "@/server/domain/workflow/services/runs/updateWorkflowRun";

/**
 * Data that can be updated on a workflow run from within a workflow definition
 */
export interface UpdateRunData {
  pr_url?: string;
}

/**
 * Create updateRun step factory function.
 * Updates workflow run metadata (e.g., pr_url) with automatic WebSocket broadcasting.
 */
export function createUpdateRunStep(context: RuntimeContext) {
  return async function updateRun(data: UpdateRunData): Promise<void> {
    await updateWorkflowRun({
      runId: context.runId,
      data,
      logger: context.logger,
    });
  };
}
