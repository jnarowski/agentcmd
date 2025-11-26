import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import { existsSync } from "node:fs";
import { getGitStatus } from "@/server/domain/git/services/getGitStatus";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { switchBranch } from "@/server/domain/git/services/switchBranch";
import { removeWorktree } from "@/server/domain/git/services/removeWorktree";
import { executeStep } from "@/server/domain/workflow/services/engine/steps/utils/executeStep";
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
  /** If true, preserve work context for review (stay on branch / keep worktree) */
  preserve?: boolean;
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
    _idOrName: string,
    config: FinalizeWorkspaceConfig
  ): Promise<void> {
    await executeFinalizeWorkspace(config, context, inngestStep);
  };
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

async function executeFinalizeWorkspace(
  config: FinalizeWorkspaceConfig,
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
): Promise<void> {
  const {
    mode,
    baseBranch,
    projectPath,
    workingDir,
    worktreePath,
    workflowName = "Workflow",
    preserve = false,
  } = config;

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
    // Worktree mode: main project is NEVER touched, so nothing to do on retry
    return;
  }

  // Step 1: Auto-commit uncommitted changes (memoized for idempotency)
  await autoCommitIfNeeded(workingDir, workflowName, context, inngestStep);

  // Step 2: Mode-specific cleanup
  switch (mode) {
    case "stay":
      context.logger.info({ mode: "stay" }, "Finalized in stay mode");
      break;

    case "branch":
      if (!preserve && baseBranch) {
        await restoreBranch(workingDir, baseBranch, context, inngestStep);
        context.logger.info({ baseBranch }, "Restored original branch");
      } else {
        context.logger.info("Staying on feature branch for review");
      }
      break;

    case "worktree":
      // IMPORTANT: Main project is NEVER touched in worktree mode
      if (worktreePath) {
        if (!preserve) {
          await removeWorktreeStep(
            projectPath,
            worktreePath,
            context,
            inngestStep
          );
          context.logger.info({ worktreePath }, "Removed worktree");
        } else {
          context.logger.info({ worktreePath }, "Keeping worktree for review");
        }
      }
      break;
  }
}

async function autoCommitIfNeeded(
  workingDir: string,
  workflowName: string,
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
): Promise<void> {
  // Check status outside executeStep (read-only, safe to retry)
  const status = await getGitStatus({ projectPath: workingDir });

  if (status.files.length === 0) {
    context.logger.info({ workingDir }, "No changes to commit");
    return;
  }

  context.logger.info(
    { workingDir, fileCount: status.files.length },
    "Auto-committing changes..."
  );

  // Wrap commit in executeStep for memoization (prevents duplicate events on retry)
  await executeStep({
    context,
    stepId: toId(`auto-commit-${workflowName}`),
    stepName: "auto-commit",
    stepType: "git",
    inngestStep,
    input: {
      operation: "commit",
      projectPath: workingDir,
      message: `chore: Workflow '${workflowName}' auto-commit`,
    },
    fn: async () => {
      const startTime = Date.now();
      const { commands } = await commitChanges({
        projectPath: workingDir,
        message: `chore: Workflow '${workflowName}' auto-commit`,
      });
      const duration = Date.now() - startTime;

      return {
        data: { committed: true },
        success: true,
        trace: commands.map((cmd) => ({ command: cmd, duration })),
      };
    },
  });
}

async function restoreBranch(
  projectPath: string,
  branchName: string,
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
): Promise<void> {
  await executeStep({
    context,
    stepId: toId(`restore-branch-${branchName}`),
    stepName: "restore-branch",
    stepType: "git",
    inngestStep,
    input: {
      operation: "checkout",
      projectPath,
      branch: branchName,
    },
    fn: async () => {
      const startTime = Date.now();
      await switchBranch({ projectPath, branchName });
      const duration = Date.now() - startTime;

      return {
        data: { branch: branchName },
        success: true,
        trace: [{ command: `git checkout ${branchName}`, duration }],
      };
    },
  });
}

async function removeWorktreeStep(
  projectPath: string,
  worktreePath: string,
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
): Promise<void> {
  await executeStep({
    context,
    stepId: toId(`remove-worktree`),
    stepName: "remove-worktree",
    stepType: "git",
    inngestStep,
    input: {
      operation: "worktree-remove",
      projectPath,
      worktreePath,
    },
    fn: async () => {
      const startTime = Date.now();
      await removeWorktree({ projectPath, worktreePath });
      const duration = Date.now() - startTime;

      return {
        data: { worktreePath },
        success: true,
        trace: [{ command: `git worktree remove ${worktreePath}`, duration }],
      };
    },
  });
}

