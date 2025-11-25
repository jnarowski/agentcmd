import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { GitStepConfig, GitStepResult } from "agentcmd-workflows";
import type { GitStepOptions } from "@/server/domain/workflow/types/event.types";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { createAndSwitchBranch } from "@/server/domain/git/services/createAndSwitchBranch";
import { createPullRequest } from "@/server/domain/git/services/createPullRequest";
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import { getGitStatus } from "@/server/domain/git/services/getGitStatus";
import { executeStep } from "@/server/domain/workflow/services/engine/steps/utils/executeStep";
import { withTimeout } from "@/server/domain/workflow/services/engine/steps/utils/withTimeout";
import { slugify as toId } from "@/server/utils/slugify";
import { prisma } from "@/shared/prisma";

const DEFAULT_GIT_TIMEOUT = 120000; // 2 minutes

/**
 * Create git step factory function
 * Executes git operations (commit, branch, pr)
 */
export function createGitStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function git(
    idOrName: string,
    config: GitStepConfig,
    options?: GitStepOptions
  ): Promise<GitStepResult> {
    const id = toId(idOrName);
    const name = idOrName; // Use original name for display
    const timeout = options?.timeout ?? DEFAULT_GIT_TIMEOUT;

    const { result } = await executeStep({
      context,
      stepId: id,
      stepName: name,
      stepType: "git",
      inngestStep,
      input: config,
      fn: async () => {
        const { workingDir } = context;

        const operation = await withTimeout(
          executeGitOperation(workingDir, config),
          timeout,
          "Git operation"
        );

        return operation;
      },
    });

    // Update workflow_run with PR URL if PR was created successfully
    if (config.operation === "pr" && result.success) {
      // Type guard: check if result has prUrl
      if ("prUrl" in result.data && result.data.prUrl) {
        await prisma.workflowRun.update({
          where: { id: context.runId },
          data: { pr_url: result.data.prUrl },
        });
      }
    }

    return result;
  };
}

async function executeGitOperation(
  projectPath: string,
  config: GitStepConfig
): Promise<GitStepResult> {
  switch (config.operation) {
    case "commit": {
      if (!config.message) {
        throw new Error("Commit message is required for commit operation");
      }

      // Check for changes before attempting commit
      const status = await getGitStatus({ projectPath });
      const hasChanges = status.files.length > 0;

      if (!hasChanges) {
        // No changes to commit - return success with hadChanges: false
        return {
          data: {
            hadChanges: false,
          },
          success: true,
          trace: [],
        };
      }

      // Commit changes
      const startTime = Date.now();
      const { commitSha, commands } = await commitChanges({
        projectPath,
        message: config.message,
      });
      const duration = Date.now() - startTime;

      return {
        data: {
          commitSha,
          hadChanges: true,
        },
        success: true,
        trace: commands.map((cmd) => ({ command: cmd, duration })),
      };
    }

    case "branch": {
      if (!config.branch) {
        throw new Error("Branch name is required for branch operation");
      }
      const startTime = Date.now();
      const { branch, commands } = await createAndSwitchBranch({
        projectPath,
        branchName: config.branch,
        from: config.baseBranch,
      });
      const duration = Date.now() - startTime;

      return {
        data: {
          branch: branch.name,
        },
        success: true,
        trace: commands.map((cmd) => ({ command: cmd, duration })),
      };
    }

    case "pr": {
      if (!config.title) {
        throw new Error("PR title is required for pr operation");
      }
      const startTime = Date.now();
      const result = await createPullRequest({
        projectPath,
        title: config.title,
        description: config.body ?? "",
        baseBranch: config.baseBranch ?? "main",
      });
      const duration = Date.now() - startTime;

      return {
        data: {
          prUrl: result.prUrl,
        },
        success: result.success,
        error: result.success ? undefined : result.error || "Failed to create pull request",
        trace: result.commands.map((cmd) => ({ command: cmd, duration })),
      };
    }

    case "commit-and-branch": {
      if (!config.branch) {
        throw new Error("Branch name is required for commit-and-branch operation");
      }

      const startTime = Date.now();
      const allCommands: string[] = [];

      // Get current branch
      allCommands.push('git branch --show-current');
      const currentBranch = await getCurrentBranch({ projectPath });

      // Check if already on target branch
      if (currentBranch === config.branch) {
        // Already on target branch - just commit if needed
        allCommands.push('git status');
        const status = await getGitStatus({ projectPath });
        const hasUncommittedChanges = status.files.length > 0;

        let commitSha: string | undefined;
        if (hasUncommittedChanges) {
          const commitMessage = config.commitMessage ?? "WIP: Auto-commit";
          const result = await commitChanges({
            projectPath,
            message: commitMessage,
          });
          commitSha = result.commitSha;
          allCommands.push(...result.commands);
        }

        const duration = Date.now() - startTime;
        return {
          data: {
            branch: config.branch,
            commitSha,
            hadUncommittedChanges: hasUncommittedChanges,
            alreadyOnBranch: true,
          },
          success: true,
          trace: allCommands.map((cmd) => ({ command: cmd, duration })),
        };
      }

      // Not on target branch - check for uncommitted changes
      allCommands.push('git status');
      const status = await getGitStatus({ projectPath });
      const hasUncommittedChanges = status.files.length > 0;

      let commitSha: string | undefined;

      // If uncommitted changes exist, commit them
      if (hasUncommittedChanges) {
        const commitMessage = config.commitMessage ?? "WIP: Auto-commit before branching";
        const result = await commitChanges({
          projectPath,
          message: commitMessage,
        });
        commitSha = result.commitSha;
        allCommands.push(...result.commands);
      }

      // Create and switch to new branch
      const branchResult = await createAndSwitchBranch({
        projectPath,
        branchName: config.branch,
        from: config.baseBranch,
      });
      allCommands.push(...branchResult.commands);

      const duration = Date.now() - startTime;
      return {
        data: {
          branch: config.branch,
          commitSha,
          hadUncommittedChanges: hasUncommittedChanges,
          alreadyOnBranch: false,
        },
        success: true,
        trace: allCommands.map((cmd) => ({ command: cmd, duration })),
      };
    }

    default:
      // This should never happen with correct types, but handle it for runtime safety
      throw new Error(`Unknown git operation: ${(config as GitStepConfig).operation}`);
  }
}
