import {
  buildSlashCommand,
  defineWorkflow,
  type CmdImplementSpecResponse,
  type CmdReviewSpecImplementationResponse,
} from "../../../packages/agentcmd-workflows/dist";

/**
 * Recursive workflow that implements and reviews a spec with automatic retry.
 *
 * Features:
 * - Recursive implementation: retries if agent stops before completion (e.g., context limits)
 * - Automatic workspace lifecycle via _system_setup and _system_finalize
 * - Spec file resolution happens automatically in system setup phase
 *
 * Flow:
 * 1. Implement phase: calls /cmd:implement-spec up to 10 times until success
 * 2. Review phase: calls /cmd:review-spec-implementation once
 */

export default defineWorkflow(
  {
    id: "implement-workflow",
    name: "Implement Workflow",
    description: "Implements a spec iteratively until it is complete",
    phases: [
      { id: "implement", label: "Implement" },
      { id: "review", label: "Review" },
      { id: "complete", label: "Complete" },
    ],
  },
  async ({ event, step }) => {
    const { workingDir, specFile } = event.data;
    async function implementUntilComplete() {
      const MAX_ITERATIONS = 10;
      let lastResponse: CmdImplementSpecResponse | undefined;

      for (let i = 1; i <= MAX_ITERATIONS; i++) {
        const stepName = `implement-spec-${i}`;
        const prompt = buildSlashCommand("/cmd:implement-spec", {
          specIdOrNameOrPath: specFile,
          format: "json",
        });

        const result = await step.agent<CmdImplementSpecResponse>(stepName, {
          agent: "claude",
          json: true,
          prompt,
          workingDir,
        });

        lastResponse = result.data;

        // See success in <json_output> of .claude/commands/cmd/implement-spec.md
        if (result.data.success) {
          return result.data;
        }
      }

      return lastResponse;
    }

    await step.phase("implement", implementUntilComplete);

    await step.phase("review", async () => {
      const response = await step.agent<CmdReviewSpecImplementationResponse>(
        "review-spec-implementation",
        {
          agent: "claude",
          json: true,
          prompt: buildSlashCommand("/cmd:review-spec-implementation", {
            specIdOrNameOrPath: specFile,
            format: "json",
          }),
          workingDir,
        }
      );

      if (!response.success) {
        await step.annotation("review-failed", {
          message:
            "Review did not pass. Explanation: " + response.data.explanation,
        });
      }

      return response;
    });

    await step.phase("complete", async () => {
      await step.agent("complete-spec", {
        agent: "claude",
        prompt: buildSlashCommand("/cmd:move-spec", {
          specIdOrNameOrPath: specFile,
          targetFolder: "done",
        }),
      });
    });
  }
);
