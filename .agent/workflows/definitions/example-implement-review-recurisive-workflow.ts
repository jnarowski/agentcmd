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
    id: "implement-review-recurisive-workflow",
    name: "Implement Review Recurisive Workflow",
    description:
      "Implements a spec file and reviews the implementation recursively",
    phases: [
      { id: "setup", label: "Setup" },
      { id: "implement", label: "Implement" },
      { id: "review", label: "Review" },
    ],
  },
  async ({ event, step }) => {
    const { workingDir, specFile } = event.data;

    /**
     * Implements spec with retry until success (up to 10 attempts).
     * Resumes from last checked task if agent stops mid-implementation.
     *
     * Calls: /cmd:implement-spec (see .claude/commands/cmd/implement-spec.md)
     */
    async function implementUntilComplete() {
      const MAX_ITERATIONS = 10;
      let lastResponse: CmdImplementSpecResponse | undefined;

      for (let i = 1; i <= MAX_ITERATIONS; i++) {
        const result = await step.agent<CmdImplementSpecResponse>(
          `implement-spec-${i}`,
          {
            agent: "claude",
            json: true,
            prompt: buildSlashCommand("/cmd:implement-spec", {
              specIdOrNameOrPath: specFile,
              format: "json",
            }),
            workingDir,
          }
        );

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

      return response;
    });
  }
);
