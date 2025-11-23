import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type {
  CleanupWorkspaceConfig,
  StepOptions,
} from "agentcmd-workflows";
import { getGitStatus } from "@/server/domain/git/services/getGitStatus";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { switchBranch } from "@/server/domain/git/services/switchBranch";
import { removeWorktree } from "@/server/domain/git/services/removeWorktree";
import { createWorkflowEventCommand } from "@/server/domain/workflow/services/engine/steps/utils/createWorkflowEventCommand";
import { generateInngestStepId } from "@/server/domain/workflow/services/engine/steps/utils/generateInngestStepId";
import { withTimeout } from "@/server/domain/workflow/services/engine/steps/utils/withTimeout";
import { toId } from "@/server/domain/workflow/services/engine/steps/utils/toId";
import { prisma } from "@/shared/prisma";

const DEFAULT_FINALIZE_WORKSPACE_TIMEOUT = 120000; // 2 minutes

/**
 * Create finalizeWorkspace step factory function
 * Auto-commits changes and performs mode-specific cleanup
 */
export function createFinalizeWorkspaceStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function finalizeWorkspace(
    idOrName: string,
    config: CleanupWorkspaceConfig,
    options?: StepOptions
  ): Promise<void> {
    const id = toId(idOrName);
    const timeout = options?.timeout ?? DEFAULT_FINALIZE_WORKSPACE_TIMEOUT;

    // Generate phase-prefixed Inngest step ID
    const inngestStepId = generateInngestStepId(context, id);

    await inngestStep.run(inngestStepId, async () => {
      await withTimeout(
        executeFinalizeWorkspace(config, context),
        timeout,
        "Finalize workspace"
      );
    });
  };
}

async function executeFinalizeWorkspace(
  config: CleanupWorkspaceConfig,
  context: RuntimeContext
): Promise<void> {
  const { workspaceResult } = config;

  // Get workflow run name for commit message
  const run = await prisma.workflowRun.findUnique({
    where: { id: context.runId }
  });
  const workflowName = run?.name || "Workflow";

  // Step 1: Check for uncommitted changes and auto-commit
  const workingDir = workspaceResult.workingDir;
  const status = await getGitStatus({ projectPath: workingDir });

  if (status.files.length > 0) {
    context.logger.info({ workingDir, fileCount: status.files.length }, "Auto-committing changes...");

    const commitStartTime = Date.now();
    await commitChanges({
      projectPath: workingDir,
      message: `wip: Workflow '${workflowName}' auto-commit`,
      files: ["."],
    });
    const commitDuration = Date.now() - commitStartTime;

    await createWorkflowEventCommand(
      context,
      "git",
      ["commit", "-m", `wip: Workflow '${workflowName}' auto-commit`],
      commitDuration
    );
  } else {
    context.logger.info({ workingDir }, "No changes to commit");
  }

  // Step 2: Mode-specific cleanup
  if (workspaceResult.mode === "stay") {
    // Stay mode: No checkout needed, already committed
    context.logger.info({ mode: "stay" }, "Finalized in stay mode");
  } else if (workspaceResult.mode === "branch") {
    // Branch mode: Checkout original branch
    const originalBranch = (workspaceResult as { mode: string; originalBranch?: string }).originalBranch;
    if (originalBranch) {
      const checkoutStartTime = Date.now();
      const projectPath = workingDir;

      await switchBranch({
        projectPath,
        branchName: originalBranch,
      });
      const checkoutDuration = Date.now() - checkoutStartTime;

      await createWorkflowEventCommand(
        context,
        "git",
        ["checkout", originalBranch],
        checkoutDuration
      );

      context.logger.info({ originalBranch }, "Restored original branch");
    }
  } else if (workspaceResult.mode === "worktree" && workspaceResult.worktreePath) {
    // Worktree mode: Remove worktree and restore original branch
    const worktreePath = workspaceResult.worktreePath;
    // Extract project path from worktree path
    const projectPath = worktreePath.replace(/\/\.worktrees\/[^/]+$/, "");

    const removeStartTime = Date.now();
    await removeWorktree({
      projectPath,
      worktreePath,
    });
    const removeDuration = Date.now() - removeStartTime;

    await createWorkflowEventCommand(
      context,
      "git",
      ["worktree", "remove", worktreePath],
      removeDuration
    );

    // Checkout original branch in main project
    const originalBranch = (workspaceResult as { mode: string; originalBranch?: string; worktreePath?: string }).originalBranch;
    if (originalBranch) {
      const checkoutStartTime = Date.now();

      await switchBranch({
        projectPath,
        branchName: originalBranch,
      });
      const checkoutDuration = Date.now() - checkoutStartTime;

      await createWorkflowEventCommand(
        context,
        "git",
        ["checkout", originalBranch],
        checkoutDuration
      );

      context.logger.info({ originalBranch, worktreePath }, "Removed worktree and restored original branch");
    }
  }
}
