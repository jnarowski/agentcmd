import type { Inngest, GetStepTools } from "inngest";
import type { WorkflowStep } from "agentcmd-workflows";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { FastifyBaseLogger } from "fastify";
import type { WorkflowRun } from "@prisma/client";
import { createFinalizeWorkspaceStep } from "./steps";

/**
 * System-reserved phase name for workspace cleanup
 */
const SYSTEM_FINALIZE_PHASE = "_system_finalize";

/**
 * Options for finalizing workspace
 */
interface FinalizeWorkspaceOptions {
  run: WorkflowRun;
  context: RuntimeContext;
  event: {
    data?: { name?: string; workingDir?: string; worktreePath?: string };
  };
  extendedStep: WorkflowStep;
  inngestStep: GetStepTools<Inngest.Any>;
  logger: FastifyBaseLogger;
}

/**
 * Finalize workspace cleanup (non-fatal).
 * Runs in finally block to ensure cleanup even on workflow failure. Errors are logged but don't fail workflow.
 *
 * **Behavior:**
 * - Worktree mode: Removes temporary worktree and cleans up git objects
 * - Stay mode: No cleanup needed (uses original project directory)
 * - No mode: Skips cleanup
 */
export async function finalizeWorkspace({
  run,
  context,
  event,
  extendedStep,
  inngestStep,
  logger,
}: FinalizeWorkspaceOptions): Promise<void> {
  const { workingDir } = event.data ?? {};

  if (!workingDir || !run.mode) {
    return;
  }

  try {
    await extendedStep.phase(SYSTEM_FINALIZE_PHASE, async () => {
      const finalizeStep = createFinalizeWorkspaceStep(context, inngestStep);

      await finalizeStep("finalize-workspace", {
        mode: run.mode,
        baseBranch: run.base_branch,
        projectPath: context.projectPath,
        workingDir,
        worktreePath: event.data?.worktreePath,
        workflowName: event.data?.name,
      });

      // Add success annotation so finalize phase always has at least one visible record
      await extendedStep.annotation("workflow-completed", {
        message: "Workflow completed successfully",
      });
    });

    logger.info({ runId: run.id, mode: run.mode }, "Workspace finalized");
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      { runId: run.id, error: err.message },
      "Failed to finalize workspace (non-fatal)"
    );
  }
}
