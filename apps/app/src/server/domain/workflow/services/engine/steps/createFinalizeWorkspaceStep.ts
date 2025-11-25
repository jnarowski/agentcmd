import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import { existsSync } from "node:fs";
import { getGitStatus } from "@/server/domain/git/services/getGitStatus";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { switchBranch } from "@/server/domain/git/services/switchBranch";
import { removeWorktree } from "@/server/domain/git/services/removeWorktree";
import { createWorkflowEventCommand } from "@/server/domain/workflow/services/engine/steps/utils/createWorkflowEventCommand";
import { generateInngestStepId } from "@/server/domain/workflow/services/engine/steps/utils/generateInngestStepId";
import { slugify as toId } from "@/server/utils/slugify";

/**
 * Config for finalize workspace step
 */
export interface FinalizeWorkspaceConfig {
  /** Workspace mode: stay, branch, or worktree */
  mode: string | null;
  /** Base branch to restore after cleanup */
  baseBranch: string | null;
  /** Original project path (for worktree cleanup) */
  projectPath: string;
  /** Working directory path (project or worktree) */
  workingDir: string;
  /** Worktree path (only for worktree mode) */
  worktreePath?: string;
  /** Workflow name for commit message */
  workflowName?: string;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Create finalizeWorkspace step factory function.
 * Factory takes minimal params, step call takes explicit config.
 *
 * Auto-commits changes and performs mode-specific cleanup.
 */
export function createFinalizeWorkspaceStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function finalizeWorkspace(
    idOrName: string,
    config: FinalizeWorkspaceConfig
  ): Promise<void> {
    const id = toId(idOrName);
    const inngestStepId = generateInngestStepId(context, id);

    await inngestStep.run(inngestStepId, async () => {
      await executeFinalizeWorkspace(config, context);
    });
  };
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

async function executeFinalizeWorkspace(
  config: FinalizeWorkspaceConfig,
  context: RuntimeContext
): Promise<void> {
  const { mode, baseBranch, projectPath, workingDir, worktreePath, workflowName = "Workflow" } = config;

  if (!workingDir || !mode) {
    return;
  }

  // Handle retry after partial completion (worktree already removed)
  // This makes the step idempotent - safe to retry after failure
  if (!existsSync(workingDir)) {
    context.logger.info(
      { workingDir, mode },
      "Working directory already cleaned up, skipping git operations"
    );

    // For worktree mode, still switch back to original branch in main project
    if (mode === "worktree" && worktreePath && baseBranch) {
      await restoreBranch(projectPath, baseBranch, context);
      context.logger.info(
        { baseBranch },
        "Restored original branch after retry"
      );
    }

    return;
  }

  // Step 1: Auto-commit uncommitted changes
  await autoCommitIfNeeded(workingDir, workflowName, context);

  // Step 2: Mode-specific cleanup
  switch (mode) {
    case "stay":
      context.logger.info({ mode: "stay" }, "Finalized in stay mode");
      break;

    case "branch":
      if (baseBranch) {
        await restoreBranch(workingDir, baseBranch, context);
        context.logger.info({ baseBranch }, "Restored original branch");
      }
      break;

    case "worktree":
      if (worktreePath) {
        await cleanupWorktree(projectPath, worktreePath, baseBranch, context);
        context.logger.info(
          { baseBranch, worktreePath },
          "Removed worktree and restored original branch"
        );
      }
      break;
  }
}

async function autoCommitIfNeeded(
  workingDir: string,
  workflowName: string,
  context: RuntimeContext
): Promise<void> {
  const status = await getGitStatus({ projectPath: workingDir });

  if (status.files.length === 0) {
    context.logger.info({ workingDir }, "No changes to commit");
    return;
  }

  context.logger.info(
    { workingDir, fileCount: status.files.length },
    "Auto-committing changes..."
  );

  const commitStartTime = Date.now();
  await commitChanges({
    projectPath: workingDir,
    message: `chore: Workflow '${workflowName}' auto-commit`,
    files: ["."],
  });
  const commitDuration = Date.now() - commitStartTime;

  await createWorkflowEventCommand(
    context,
    "git",
    ["commit", "-m", `chore: Workflow '${workflowName}' auto-commit`],
    commitDuration
  );
}

async function restoreBranch(
  projectPath: string,
  branchName: string,
  context: RuntimeContext
): Promise<void> {
  const startTime = Date.now();
  await switchBranch({ projectPath, branchName });
  const duration = Date.now() - startTime;

  await createWorkflowEventCommand(
    context,
    "git",
    ["checkout", branchName],
    duration
  );
}

async function cleanupWorktree(
  projectPath: string,
  worktreePath: string,
  baseBranch: string | null,
  context: RuntimeContext
): Promise<void> {
  // Remove worktree
  const removeStartTime = Date.now();
  await removeWorktree({ projectPath, worktreePath });
  const removeDuration = Date.now() - removeStartTime;

  await createWorkflowEventCommand(
    context,
    "git",
    ["worktree", "remove", worktreePath],
    removeDuration
  );

  // Restore original branch in main project
  if (baseBranch) {
    await restoreBranch(projectPath, baseBranch, context);
  }
}
