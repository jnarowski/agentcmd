import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type {
  SetupWorkspaceConfig,
  WorkspaceResult,
} from "agentcmd-workflows";
import path from "node:path";
import simpleGit from "simple-git";
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import { createAndSwitchBranch } from "@/server/domain/git/services/createAndSwitchBranch";
import { createWorktree } from "@/server/domain/git/services/createWorktree";
import { executeStep } from "@/server/domain/workflow/services/engine/steps/utils/executeStep";
import { slugify as toId } from "@/server/utils/slugify";

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
    config: SetupWorkspaceConfig
  ): Promise<WorkspaceResult> {
    // Use provided config with defaults
    const finalConfig: SetupWorkspaceConfig = {
      projectPath: config.projectPath || context.projectPath,
      branch: config.branch,
      baseBranch: config.baseBranch || "main",
      worktreeName: config.worktreeName,
    };

    return await executeSetupWorkspace(finalConfig, context, inngestStep);
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
        const trace: { command: string; duration: number }[] = [];
        const git = simpleGit(projectPath);

        // Auto-commit uncommitted changes before creating worktree
        // (worktrees check out from git history, so uncommitted changes won't be available)
        const commitStartTime = Date.now();
        const status = await git.status();
        if (status.files.length > 0) {
          const message = `Auto-commit before creating worktree "${worktreeName}"`;
          await git.add(".");
          await git.commit(message);
          trace.push({
            command: `git add . && git commit -m "${message}"`,
            duration: Date.now() - commitStartTime,
          });
        }

        const worktreeStartTime = Date.now();
        const absoluteWorktreePath = await createWorktree({
          projectPath,
          branch: targetBranch,
          worktreePath: customWorktreePath,
        });
        trace.push({
          command: `git worktree add ${absoluteWorktreePath} ${targetBranch}`,
          duration: Date.now() - worktreeStartTime,
        });

        return {
          data: {
            worktreePath: absoluteWorktreePath,
            branch: targetBranch,
            worktreeName,
          },
          success: true,
          trace,
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

  // Mode 2: Branch switch/create - uses executeStep for proper Git Step display
  if (branch && branch !== currentBranch) {
    await executeStep({
      context,
      stepId: toId(`setup-branch-${branch}`),
      stepName: "setup-branch",
      stepType: "git",
      inngestStep,
      input: {
        operation: "branch",
        projectPath,
        branch,
        baseBranch,
      },
      fn: async () => {
        const startTime = Date.now();
        const branchResult = await createAndSwitchBranch({
          projectPath,
          branchName: branch,
          from: baseBranch,
        });
        const duration = Date.now() - startTime;

        return {
          data: { branch },
          success: true,
          trace: branchResult.commands.map((cmd) => ({ command: cmd, duration })),
        };
      },
    });

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
