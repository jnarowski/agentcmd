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

  // Step 1: Auto-commit uncommitted changes
  await autoCommitIfNeeded(workingDir, workflowName, context);

  // Step 2: Mode-specific cleanup
  switch (mode) {
    case "stay":
      context.logger.info({ mode: "stay" }, "Finalized in stay mode");
      break;

    case "branch":
      if (!preserve && baseBranch) {
        await restoreBranch(workingDir, baseBranch, context);
        context.logger.info({ baseBranch }, "Restored original branch");
      } else {
        context.logger.info("Staying on feature branch for review");
      }
      break;

    case "worktree":
      // IMPORTANT: Main project is NEVER touched in worktree mode
      if (worktreePath) {
        if (!preserve) {
          await removeWorktree({ projectPath, worktreePath });
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

