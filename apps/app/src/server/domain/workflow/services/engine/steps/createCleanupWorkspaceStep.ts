import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type {
  CleanupWorkspaceConfig,
  StepOptions,
} from "agentcmd-workflows";
import { removeWorktree } from "@/server/domain/git/services/removeWorktree";
import { createWorkflowEventCommand } from "@/server/domain/workflow/services/engine/steps/utils/createWorkflowEventCommand";
import { generateInngestStepId } from "@/server/domain/workflow/services/engine/steps/utils/generateInngestStepId";
import { withTimeout } from "@/server/domain/workflow/services/engine/steps/utils/withTimeout";
import { slugify as toId } from "@/server/utils/slugify";

const DEFAULT_CLEANUP_WORKSPACE_TIMEOUT = 60000; // 1 minute

/**
 * Create cleanupWorkspace step factory function
 * Removes worktrees created during setupWorkspace
 */
export function createCleanupWorkspaceStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function cleanupWorkspace(
    idOrName: string,
    config: CleanupWorkspaceConfig,
    options?: StepOptions
  ): Promise<void> {
    const id = toId(idOrName);
    const timeout = options?.timeout ?? DEFAULT_CLEANUP_WORKSPACE_TIMEOUT;

    // Generate phase-prefixed Inngest step ID
    const inngestStepId = generateInngestStepId(context, id);

    await inngestStep.run(inngestStepId, async () => {
      await withTimeout(
        executeCleanupWorkspace(config, context),
        timeout,
        "Cleanup workspace"
      );
    });
  };
}

async function executeCleanupWorkspace(
  config: CleanupWorkspaceConfig,
  context: RuntimeContext
): Promise<void> {
  const { workspaceResult } = config;

  // Only cleanup if mode was worktree
  if (workspaceResult.mode === "worktree" && workspaceResult.worktreePath) {
    // Extract project path from worktree path
    // worktreePath is like: /project/path/.worktrees/branch
    // projectPath is: /project/path
    const worktreePath = workspaceResult.worktreePath;
    const projectPath = worktreePath.replace(/\/\.worktrees\/[^/]+$/, "");

    const startTime = Date.now();
    await removeWorktree({
      projectPath,
      worktreePath,
    });
    const duration = Date.now() - startTime;

    await createWorkflowEventCommand(
      context,
      "git",
      ["worktree", "remove", worktreePath],
      duration
    );
  }

  // For "branch" or "stay" modes, no cleanup needed
}
