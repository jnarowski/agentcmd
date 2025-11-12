import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
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
import { createWorkflowEventCommand } from "@/server/domain/workflow/services/engine/steps/utils/createWorkflowEventCommand";
import { generateInngestStepId } from "@/server/domain/workflow/services/engine/steps/utils/generateInngestStepId";
import { withTimeout } from "@/server/domain/workflow/services/engine/steps/utils/withTimeout";
import { toId } from "@/server/domain/workflow/services/engine/steps/utils/toId";

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

    // Use provided config with defaults
    const finalConfig: SetupWorkspaceConfig = {
      projectPath: config.projectPath || context.projectPath,
      branch: config.branch,
      baseBranch: config.baseBranch || 'main',
      worktreeName: config.worktreeName,
    };

    // Generate phase-prefixed Inngest step ID
    const inngestStepId = generateInngestStepId(context, id);

    return await inngestStep.run(inngestStepId, async () => {
      return await withTimeout(
        executeSetupWorkspace(finalConfig, context),
        timeout,
        "Setup workspace"
      );
    });
  };
}

async function executeSetupWorkspace(
  config: SetupWorkspaceConfig,
  context: RuntimeContext
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

    const startTime = Date.now();
    const worktreePath = await createWorktree({
      projectPath,
      branch: targetBranch,
    });
    const duration = Date.now() - startTime;
    await createWorkflowEventCommand(
      context,
      "git",
      ["worktree", "add", worktreePath, targetBranch],
      duration
    );

    return {
      workingDir: worktreePath,
      branch: targetBranch,
      mode: "worktree",
      worktreePath,
      originalBranch: currentBranch ?? "main",
    };
  }

  // Mode 2: Branch switch/create
  if (branch && branch !== currentBranch) {
    // Check for uncommitted changes
    const status = await getGitStatus({ projectPath });
    if (status.files.length > 0) {
      // Auto-commit uncommitted changes before branching
      const commitStartTime = Date.now();
      const commitResult = await commitChanges({
        projectPath,
        message: "WIP: Auto-commit before branching",
        files: ["."],
      });
      const commitDuration = Date.now() - commitStartTime;
      await createWorkflowEventCommand(
        context,
        "git",
        commitResult.commands,
        commitDuration
      );
    }

    // Create and switch to branch
    const checkoutStartTime = Date.now();
    const branchResult = await createAndSwitchBranch({
      projectPath,
      branchName: branch,
      from: baseBranch,
    });
    const checkoutDuration = Date.now() - checkoutStartTime;
    await createWorkflowEventCommand(
      context,
      "git",
      branchResult.commands,
      checkoutDuration
    );

    return {
      workingDir: projectPath,
      branch,
      mode: "branch",
      originalBranch: currentBranch ?? "main",
    };
  }

  // Mode 3: Stay on current branch
  return {
    workingDir: projectPath,
    branch: currentBranch ?? "main",
    mode: "stay",
  };
}
