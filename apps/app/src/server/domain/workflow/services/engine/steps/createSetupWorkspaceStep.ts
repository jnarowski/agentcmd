import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../../types/engine.types";
import type {
  SetupWorkspaceConfig,
  WorkspaceResult,
  StepOptions,
} from "agentcmd-workflows";
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { createAndSwitchBranch } from "@/server/domain/git/services/createAndSwitchBranch";
import { createWorktree } from "@/server/domain/git/services/createWorktree";
import { getGitStatus } from "@/server/domain/git/services/getGitStatus";
import { generateInngestStepId } from "./utils/generateInngestStepId";
import { withTimeout } from "./utils/withTimeout";
import { toId } from "./utils/toId";

const DEFAULT_SETUP_WORKSPACE_TIMEOUT = 120000; // 2 minutes

/**
 * Create setupWorkspace step factory function
 * Decides workspace strategy (worktree, branch, or stay) and executes it
 */
export function createSetupWorkspaceStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function setupWorkspace(
    idOrName: string,
    config: SetupWorkspaceConfig,
    options?: StepOptions
  ): Promise<WorkspaceResult> {
    const id = toId(idOrName);
    const timeout = options?.timeout ?? DEFAULT_SETUP_WORKSPACE_TIMEOUT;

    // Generate phase-prefixed Inngest step ID
    const inngestStepId = generateInngestStepId(context, id);

    return await inngestStep.run(inngestStepId, async () => {
      return await withTimeout(
        executeSetupWorkspace(config),
        timeout,
        "Setup workspace"
      );
    });
  };
}

async function executeSetupWorkspace(
  config: SetupWorkspaceConfig
): Promise<WorkspaceResult> {
  const { projectPath, branch, baseBranch, worktreeName } = config;

  // Decision tree:
  // 1. If worktreeName provided → Create worktree
  // 2. Else if branch provided AND different from current → Switch/create branch
  // 3. Else → Stay on current branch

  const currentBranch = await getCurrentBranch({ projectPath });

  // Mode 1: Worktree
  if (worktreeName) {
    const targetBranch = branch ?? currentBranch ?? "main";
    const worktreePath = await createWorktree({
      projectPath,
      branch: targetBranch,
    });

    return {
      workingDir: worktreePath,
      branch: targetBranch,
      mode: "worktree",
      worktreePath,
    };
  }

  // Mode 2: Branch switch/create
  if (branch && branch !== currentBranch) {
    // Check for uncommitted changes
    const status = await getGitStatus({ projectPath });
    if (status.files.length > 0) {
      // Auto-commit uncommitted changes before branching
      await commitChanges({
        projectPath,
        message: "WIP: Auto-commit before branching",
        files: ["."],
      });
    }

    // Create and switch to branch
    await createAndSwitchBranch({
      projectPath,
      branchName: branch,
      from: baseBranch,
    });

    return {
      workingDir: projectPath,
      branch,
      mode: "branch",
    };
  }

  // Mode 3: Stay on current branch
  return {
    workingDir: projectPath,
    branch: currentBranch ?? "main",
    mode: "stay",
  };
}
