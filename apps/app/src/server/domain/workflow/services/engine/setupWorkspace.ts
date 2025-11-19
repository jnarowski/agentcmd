import type { Inngest, GetStepTools } from "inngest";
import type { WorkspaceResult } from "agentcmd-workflows";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { FastifyBaseLogger } from "fastify";
import type { WorkflowRun } from "@prisma/client";
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import { createSetupWorkspaceStep } from "./steps";

/**
 * Setup workspace based on run mode.
 * Determines isolation strategy for workflow execution to prevent conflicts.
 *
 * **Modes:**
 * - `worktree`: Creates isolated git worktree for parallel workflows on separate branches
 * - `stay`: Uses existing project directory (must coordinate concurrent runs manually)
 * - `null`/`undefined`: Defaults to stay mode with current branch
 */
export async function setupWorkspace(params: {
  run: WorkflowRun & { project: { path: string } };
  context: RuntimeContext;
  inngestStep: GetStepTools<Inngest.Any>;
  logger: FastifyBaseLogger;
}): Promise<WorkspaceResult> {
  const { run, context, inngestStep, logger } = params;
  // No mode specified - default to stay mode (use existing project directory)
  if (!run.mode) {
    const currentBranch = await getCurrentBranch({
      projectPath: run.project.path,
    });

    logger.info(
      { runId: run.id },
      "No workspace mode specified, staying in current branch"
    );

    return {
      mode: "stay",
      workingDir: run.project.path,
      branch: currentBranch ?? "main",
    };
  }

  // Explicit mode - delegate to workspace setup step (handles worktree/stay logic)
  const setupStep = createSetupWorkspaceStep(context, inngestStep);
  const worktreeName =
    run.mode === "worktree"
      ? `run-${run.id}-${run.branch_name || "main"}`
      : undefined;

  try {
    const workspace = await setupStep("setup-workspace", {
      branch: run.branch_name ?? undefined,
      baseBranch: run.base_branch ?? "main",
      projectPath: run.project.path,
      worktreeName,
    });

    logger.info(
      { runId: run.id, mode: run.mode, workingDir: workspace.workingDir },
      "Workspace setup completed"
    );

    return workspace;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Enhance git branch errors with user-friendly messages
    if (errorMsg.includes("a branch named")) {
      const branchName = run.branch_name || "unknown";
      throw new Error(
        `Git branch "${branchName}" already exists. Please choose a different branch name or delete the existing branch first.`
      );
    }

    if (errorMsg.includes("Invalid branch name")) {
      throw new Error(
        `Invalid git branch name "${run.branch_name}". Branch names can only contain letters, numbers, dashes, underscores, dots, and slashes.`
      );
    }

    // Re-throw original error for other failures
    throw error;
  }
}
