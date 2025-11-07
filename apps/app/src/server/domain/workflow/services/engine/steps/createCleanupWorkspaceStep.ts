import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../../types/engine.types";
import type {
  CleanupWorkspaceConfig,
  StepOptions,
} from "agentcmd-workflows";
import { removeWorktree } from "@/server/domain/git/services/removeWorktree";
import { generateInngestStepId } from "./utils/generateInngestStepId";
import { withTimeout } from "./utils/withTimeout";
import { toId } from "./utils/toId";

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
        executeCleanupWorkspace(config),
        timeout,
        "Cleanup workspace"
      );
    });
  };
}

async function executeCleanupWorkspace(
  config: CleanupWorkspaceConfig
): Promise<void> {
  const { workspaceResult } = config;

  // Only cleanup if mode was worktree
  if (workspaceResult.mode === "worktree" && workspaceResult.worktreePath) {
    // Extract project path from worktree path
    // worktreePath is like: /project/path/.worktrees/branch
    // projectPath is: /project/path
    const worktreePath = workspaceResult.worktreePath;
    const projectPath = worktreePath.replace(/\/\.worktrees\/[^/]+$/, "");

    await removeWorktree({
      projectPath,
      worktreePath,
    });
  }

  // For "branch" or "stay" modes, no cleanup needed
}
