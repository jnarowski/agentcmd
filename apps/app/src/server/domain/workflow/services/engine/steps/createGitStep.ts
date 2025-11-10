import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import type { GitStepConfig, GitStepResult } from "agentcmd-workflows";
import type { GitStepOptions } from "@/server/domain/workflow/types/event.types";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { createAndSwitchBranch } from "@/server/domain/git/services/createAndSwitchBranch";
import { createPullRequest } from "@/server/domain/git/services/createPullRequest";
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import { getGitStatus } from "@/server/domain/git/services/getGitStatus";
import { createWorkflowEventCommand } from "@/server/domain/workflow/services/engine/steps/utils/createWorkflowEventCommand";
import { generateInngestStepId } from "@/server/domain/workflow/services/engine/steps/utils/generateInngestStepId";
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
    const timeout = options?.timeout ?? DEFAULT_GIT_TIMEOUT;

    // Generate phase-prefixed Inngest step ID
    const inngestStepId = generateInngestStepId(context, id);

    return await inngestStep.run(inngestStepId, async () => {
      const { projectPath } = context;

      const operation = await withTimeout(
        executeGitOperation(projectPath, config, context),
        timeout,
        "Git operation"
      );

      return operation;
    });
  };
}

async function executeGitOperation(
  projectPath: string,
  config: GitStepConfig,
  context: RuntimeContext
): Promise<GitStepResult> {
  switch (config.operation) {
    case "commit": {
      if (!config.message) {
        throw new Error("Commit message is required for commit operation");
      }
      // commitChanges expects object with projectPath, message, files[]
      // files defaults to ['.'] to stage all changes
      const startTime = Date.now();
      const commitSha = await commitChanges({
        projectPath,
        message: config.message,
        files: ["."],
      });
      const duration = Date.now() - startTime;

      await createWorkflowEventCommand(
        context,
        "git",
        ["commit", "-m", config.message],
        duration
      );

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
      // createAndSwitchBranch expects object with projectPath, branchName, from?
      const startTime = Date.now();
      await createAndSwitchBranch({
        projectPath,
        branchName: config.branch,
        from: config.baseBranch,
      });
      const duration = Date.now() - startTime;

      await createWorkflowEventCommand(
        context,
        "git",
        ["checkout", "-b", config.branch],
        duration
      );

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
      // createPullRequest expects object with projectPath, title, description, baseBranch
      const startTime = Date.now();
      const result = await createPullRequest({
        projectPath,
        title: config.title,
        description: config.body ?? "",
        baseBranch: config.baseBranch ?? "main",
      });
      const duration = Date.now() - startTime;

      await createWorkflowEventCommand(
        context,
        "gh",
        ["pr", "create", "--title", config.title, "--base", config.baseBranch ?? "main"],
        duration
      );

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
          const commitStartTime = Date.now();
          commitSha = await commitChanges({
            projectPath,
            message: commitMessage,
            files: ["."],
          });
          const commitDuration = Date.now() - commitStartTime;

          await createWorkflowEventCommand(
            context,
            "git",
            ["commit", "-m", commitMessage],
            commitDuration
          );
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
        const commitStartTime = Date.now();
        commitSha = await commitChanges({
          projectPath,
          message: commitMessage,
          files: ["."],
        });
        const commitDuration = Date.now() - commitStartTime;

        await createWorkflowEventCommand(
          context,
          "git",
          ["commit", "-m", commitMessage],
          commitDuration
        );
      }

      // Create and switch to new branch
      const branchStartTime = Date.now();
      await createAndSwitchBranch({
        projectPath,
        branchName: config.branch,
        from: config.baseBranch,
      });
      const branchDuration = Date.now() - branchStartTime;

      await createWorkflowEventCommand(
        context,
        "git",
        ["checkout", "-b", config.branch],
        branchDuration
      );

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
