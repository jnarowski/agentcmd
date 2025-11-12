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
import { toId } from "@/server/domain/workflow/services/engine/steps/utils/toId";

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
      fn: async () => {
        const { projectPath } = context;

        const operation = await withTimeout(
          executeGitOperation(projectPath, config),
          timeout,
          "Git operation"
        );

        return operation;
      },
    });

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
      const commitSha = await commitChanges({
        projectPath,
        message: config.message,
        files: ["."],
      });

      return {
        operation: "commit",
        commitSha,
        success: true,
      };
    }

    case "branch": {
      if (!config.branch) {
        throw new Error("Branch name is required for branch operation");
      }
      await createAndSwitchBranch({
        projectPath,
        branchName: config.branch,
        from: config.baseBranch,
      });

      return {
        operation: "branch",
        branch: config.branch,
        success: true,
      };
    }

    case "pr": {
      if (!config.title) {
        throw new Error("PR title is required for pr operation");
      }
      const result = await createPullRequest({
        projectPath,
        title: config.title,
        description: config.body ?? "",
        baseBranch: config.baseBranch ?? "main",
      });

      return {
        operation: "pr",
        prUrl: result.prUrl,
        success: result.success,
      };
    }

    case "commit-and-branch": {
      if (!config.branch) {
        throw new Error("Branch name is required for commit-and-branch operation");
      }

      // Get current branch
      const currentBranch = await getCurrentBranch({ projectPath });

      // Check if already on target branch
      if (currentBranch === config.branch) {
        // Already on target branch - just commit if needed
        const status = await getGitStatus({ projectPath });
        const hasUncommittedChanges = status.files.length > 0;

        let commitSha: string | undefined;
        if (hasUncommittedChanges) {
          const commitMessage = config.commitMessage ?? "WIP: Auto-commit";
          commitSha = await commitChanges({
            projectPath,
            message: commitMessage,
            files: ["."],
          });
        }

        return {
          operation: "commit-and-branch",
          branch: config.branch,
          commitSha,
          hadUncommittedChanges: hasUncommittedChanges,
          alreadyOnBranch: true,
          success: true,
        };
      }

      // Not on target branch - check for uncommitted changes
      const status = await getGitStatus({ projectPath });
      const hasUncommittedChanges = status.files.length > 0;

      let commitSha: string | undefined;

      // If uncommitted changes exist, commit them
      if (hasUncommittedChanges) {
        const commitMessage = config.commitMessage ?? "WIP: Auto-commit before branching";
        commitSha = await commitChanges({
          projectPath,
          message: commitMessage,
          files: ["."],
        });
      }

      // Create and switch to new branch
      await createAndSwitchBranch({
        projectPath,
        branchName: config.branch,
        from: config.baseBranch,
      });

      return {
        operation: "commit-and-branch",
        branch: config.branch,
        commitSha,
        hadUncommittedChanges: hasUncommittedChanges,
        alreadyOnBranch: false,
        success: true,
      };
    }

    default:
      throw new Error(`Unknown git operation: ${config.operation}`);
  }
}
