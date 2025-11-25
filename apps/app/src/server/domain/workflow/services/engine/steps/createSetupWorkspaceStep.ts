import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type {
  SetupWorkspaceConfig,
  WorkspaceResult,
  StepOptions,
} from "agentcmd-workflows";
import path from "node:path";
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import { createAndSwitchBranch } from "@/server/domain/git/services/createAndSwitchBranch";
import { createWorktree } from "@/server/domain/git/services/createWorktree";
import { createWorkflowEventCommand } from "@/server/domain/workflow/services/engine/steps/utils/createWorkflowEventCommand";
import { executeStep } from "@/server/domain/workflow/services/engine/steps/utils/executeStep";
import { withTimeout } from "@/server/domain/workflow/services/engine/steps/utils/withTimeout";
import { slugify as toId } from "@/server/utils/slugify";

const DEFAULT_SETUP_WORKSPACE_TIMEOUT = 120000; // 2 minutes

/**
 * Parse command string and log to workflow timeline
 * Handles full command strings like "git add ." or "git checkout -b branch"
 */
async function logCommandsToTimeline(
  context: RuntimeContext,
  commandStrings: string[],
  totalDuration: number
): Promise<void> {
  const durationPerCommand = totalDuration / commandStrings.length;

  for (const cmdString of commandStrings) {
    const parts = cmdString.split(/\s+/);
    if (parts.length === 0) continue;

    const command = parts[0];
    const args = parts.slice(1);

    await createWorkflowEventCommand(
      context,
      command,
      args,
      durationPerCommand
    );
  }
}

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
    _idOrName: string,
    config: SetupWorkspaceConfig,
    options?: StepOptions
  ): Promise<WorkspaceResult> {
    const timeout = options?.timeout ?? DEFAULT_SETUP_WORKSPACE_TIMEOUT;

    // Use provided config with defaults
    const finalConfig: SetupWorkspaceConfig = {
      projectPath: config.projectPath || context.projectPath,
      branch: config.branch,
      baseBranch: config.baseBranch || "main",
      worktreeName: config.worktreeName,
    };

    return await withTimeout(
      executeSetupWorkspace(finalConfig, context, inngestStep),
      timeout,
      "Setup workspace"
    );
  };
}

async function executeSetupWorkspace(
  config: SetupWorkspaceConfig,
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
): Promise<WorkspaceResult> {
  const { projectPath, branch, baseBranch, worktreeName } = config;

  // Decision tree:
  // 1. If worktreeName provided → Create worktree
  // 2. Else if branch provided AND different from current → Switch/create branch
  // 3. Else → Stay on current branch

  const currentBranch = await getCurrentBranch({ projectPath });

  // Mode 1: Worktree - uses executeStep for proper Git Step display
  if (worktreeName) {
    const targetBranch = branch ?? currentBranch ?? "main";
    const customWorktreePath = path.join(
      projectPath,
      ".worktrees",
      worktreeName
    );

    const { result } = await executeStep({
      context,
      stepId: toId(`setup-worktree-${worktreeName}`),
      stepName: `setup-worktree`,
      stepType: "git",
      inngestStep,
      input: {
        operation: "worktree-add",
        projectPath,
        branch: targetBranch,
        worktreeName,
      },
      fn: async () => {
        const startTime = Date.now();
        const absoluteWorktreePath = await createWorktree({
          projectPath,
          branch: targetBranch,
          worktreePath: customWorktreePath,
        });
        const duration = Date.now() - startTime;

        return {
          data: {
            worktreePath: absoluteWorktreePath,
            branch: targetBranch,
            worktreeName,
          },
          success: true,
          trace: [
            {
              command: `git worktree add ${absoluteWorktreePath} ${targetBranch}`,
              duration,
            },
          ],
        };
      },
    });

    return {
      workingDir: result.data.worktreePath,
      branch: targetBranch,
      mode: "worktree",
      worktreePath: result.data.worktreePath,
      worktreeName,
      originalBranch: currentBranch ?? "main",
    };
  }

  // Mode 2: Branch switch/create
  if (branch && branch !== currentBranch) {
    // Create and switch to branch (handles uncommitted changes internally)
    const checkoutStartTime = Date.now();
    const branchResult = await createAndSwitchBranch({
      projectPath,
      branchName: branch,
      from: baseBranch,
    });
    const checkoutDuration = Date.now() - checkoutStartTime;
    await logCommandsToTimeline(
      context,
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
