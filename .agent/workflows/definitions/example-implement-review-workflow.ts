import {
  buildSlashCommand,
  defineWorkflow,
  type CmdImplementSpecResponse,
  type CmdReviewSpecImplementationResponse,
} from "../../../packages/agentcmd-workflows/dist";

/**
 * Advanced recursive workflow with implement → review → implement cycles.
 *
 * Features:
 * - Implements spec with retry (up to 10 attempts per cycle)
 * - Reviews implementation automatically
 * - Re-implements if review finds issues (up to 3 review cycles)
 * - Stops when review passes or max review iterations reached
 *
 * Flow:
 * 1. Implement → Review → Check success
 * 2. If review fails → Implement again → Review again
 * 3. Repeat until review passes or 3 review cycles complete
 */

export default defineWorkflow(
  {
    id: "implement-review-workflow",
    name: "Implement Review Workflow",
    description:
      "Implements a spec file and reviews the implementation recursively until it passes",
    phases: [
      { id: "implement-review-cycle", label: "Implement & Review Cycle" },
    ],
  },
  async ({ event, step }) => {
    const { workingDir, specFile } = event.data;

    /**
     * Implements spec with retry until success (up to 10 attempts).
     * Calls: /cmd:implement-spec (see .claude/commands/cmd/implement-spec.md)
     */
    async function implementUntilComplete(cycle: number) {
      const MAX_ATTEMPTS = 10;
      let lastResponse: CmdImplementSpecResponse | undefined;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const result = await step.agent<CmdImplementSpecResponse>(
          `implement-c${cycle}-a${attempt}`,
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
        if (result.data.success) return result.data;
      }

      return lastResponse;
    }

    /**
     * Reviews implementation and returns findings.
     * Calls: /cmd:review-spec-implementation (see .claude/commands/cmd/review-spec-implementation.md)
     */
    async function reviewImplementation(cycle: number) {
      const result = await step.agent<CmdReviewSpecImplementationResponse>(
        `review-c${cycle}`,
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

      return result.data;
    }

    await step.phase("implement-review-cycle", async () => {
      const MAX_CYCLES = 3;

      for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
        const impl = await implementUntilComplete(cycle);
        const review = await reviewImplementation(cycle);

        // See success in <json_output> of .claude/commands/cmd/review-spec-implementation.md
        if (review.success) {
          return { success: true, cycles_completed: cycle, impl, review };
        }

        // See max_iterations_reached in <json_output> of .claude/commands/cmd/review-spec-implementation.md
        if (review.max_iterations_reached) {
          return {
            success: false,
            cycles_completed: cycle,
            reason: "Max review iterations",
            impl,
            review,
          };
        }
      }

      return {
        success: false,
        cycles_completed: MAX_CYCLES,
        reason: "Max cycles completed",
      };
    });
  }
);
