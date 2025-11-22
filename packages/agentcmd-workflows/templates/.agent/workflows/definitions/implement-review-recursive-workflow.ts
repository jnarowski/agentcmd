import {
  buildSlashCommand,
  defineWorkflow,
  type WorkflowStep,
  type CmdImplementSpecResponse,
  type CmdReviewSpecImplementationResponse,
} from "agentcmd-workflows";

/**
 * Workflow context for sharing state between phases via closure.
 * Stores latest implementation and review results for PR generation.
 */
interface WorkflowContext {
  lastImplement?: CmdImplementSpecResponse;
  lastReview?: CmdReviewSpecImplementationResponse;
}

/**
 * Advanced recursive workflow with implement → review → implement cycles.
 *
 * This workflow demonstrates:
 * - Closure-based context sharing between phases
 * - Recursive retry logic with configurable limits
 * - Type-safe helper functions with object parameters
 * - Automatic PR generation from workflow data
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
 * 4. Move spec to done folder and create PR
 */

export default defineWorkflow(
  {
    id: "implement-review-workflow",
    name: "Implement & Review Recursive Workflow",
    description:
      "Implements a spec file and reviews the implementation recursively until it passes",
    phases: [
      { id: "implement-review-cycle", label: "Implement & Review Cycle" },
      { id: "complete", label: "Complete" },
    ],
  },
  async ({ event, step }) => {
    const { workingDir, specFile } = event.data;

    // Context object shared across phases via closure
    // Helper functions mutate this to pass data between steps
    const ctx: WorkflowContext = {};

    await step.phase("implement-review-cycle", async () => {
      const MAX_CYCLES = 3; // Adjustable based on complexity

      // Try up to 3 implement→review cycles
      for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
        // Implement spec (updates ctx.lastImplement)
        await implementUntilComplete({
          cycle,
          step,
          specFile,
          workingDir,
          ctx,
        });

        // Review implementation (updates ctx.lastReview)
        const review = await reviewImplementation({
          cycle,
          step,
          specFile,
          workingDir,
          ctx,
        });

        await step.annotation("review-cycle-completed", {
          message: `Review cycle ${cycle} ${review.success ? "passed" : "failed"}. ${review.summary}`,
        });

        if (review.success) {
          break; // Review passed, exit cycle
        }

        if (review.max_iterations_reached) {
          break; // Review hit max iterations, exit cycle
        }
      }

      // If loop completes without breaking, all cycles attempted
      // ctx.lastImplement and ctx.lastReview contain final attempt data
    });

    await step.phase("complete", async () => {
      // Safety check: ensure we have implementation and review data
      if (!ctx.lastImplement || !ctx.lastReview) {
        throw new Error("Missing implementation or review data");
      }

      // Move spec to done folder and updates index.json
      await step.agent("complete-spec", {
        agent: "claude",
        prompt: buildSlashCommand("/cmd:move-spec", {
          specIdOrNameOrPath: specFile,
          targetFolder: "done",
        }),
      });

      // Create PR with implementation summary and review status
      await step.git("create-pull-request", {
        operation: "pr",
        title: `feat: ${ctx.lastImplement.feature_name}`,
        body: generatePrBody({
          summary: ctx.lastImplement.summary,
          issuesFound: ctx.lastReview.issues_found,
          specFile,
        }),
        baseBranch: event.data.baseBranch,
      });
    });
  }
);

// ------------------------------------------------------------------------------------------------
// PRIVATE HELPERS
// ------------------------------------------------------------------------------------------------

/**
 * Implements spec with retry until success (up to 10 attempts).
 *
 * Retries implementation if agent stops early (e.g., context limits).
 * Updates ctx.lastImplement with each attempt for downstream use.
 *
 * @param cycle - Current implement/review cycle number
 * @param step - Workflow step interface
 * @param specFile - Spec file path or identifier
 * @param workingDir - Project working directory
 * @param ctx - Shared context object (mutated)
 * @returns Implementation response data
 *
 * Calls: /cmd:implement-spec (see .claude/commands/cmd/implement-spec.md)
 */
async function implementUntilComplete({
  cycle,
  step,
  specFile,
  workingDir,
  ctx,
}: {
  cycle: number;
  step: WorkflowStep;
  specFile: string;
  workingDir: string;
  ctx: WorkflowContext;
}) {
  const MAX_ATTEMPTS = 10;
  let lastResponse: CmdImplementSpecResponse | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const stepName = `implement-cycle-${cycle}-attempt-${attempt}`;
    const result = await step.agent<CmdImplementSpecResponse>(stepName, {
      agent: "claude",
      json: true,
      prompt: buildSlashCommand("/cmd:implement-spec", {
        specIdOrNameOrPath: specFile,
      }),
      workingDir,
    });

    step.annotation(`${stepName}-summary`, {
      message: `Implement cycle ${cycle} attempt ${attempt} ${result.data.success ? "passed" : "failed"}. ${result.data.summary}`,
    });

    lastResponse = result.data;
    ctx.lastImplement = result.data;

    // See success in <json_output> of .claude/commands/cmd/implement-spec.md
    if (result.data.success) return result.data;
  }

  return lastResponse;
}

/**
 * Reviews implementation and returns findings.
 *
 * Checks implementation against spec requirements.
 * Updates ctx.lastReview with findings for PR generation.
 *
 * @param cycle - Current implement/review cycle number
 * @param step - Workflow step interface
 * @param specFile - Spec file path or identifier
 * @param workingDir - Project working directory
 * @param ctx - Shared context object (mutated)
 * @returns Review response with success status and issues found
 *
 * Calls: /cmd:review-spec-implementation (see .claude/commands/cmd/review-spec-implementation.md)
 */
async function reviewImplementation({
  cycle,
  step,
  specFile,
  workingDir,
  ctx,
}: {
  cycle: number;
  step: WorkflowStep;
  specFile: string;
  workingDir: string;
  ctx: WorkflowContext;
}) {
  const result = await step.agent<CmdReviewSpecImplementationResponse>(
    `review-cycle-${cycle}`,
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

  ctx.lastReview = result.data;
  return result.data;
}

/**
 * Generate PR body from implementation and review data.
 *
 * Creates a formatted markdown description including:
 * - Implementation summary
 * - Spec file reference
 * - Review status (ready or issues count)
 * - Workflow attribution
 *
 * @param summary - Implementation summary text
 * @param issuesFound - Number of issues found in review
 * @param specFile - Spec file path for reference
 * @returns Formatted PR body markdown
 */
function generatePrBody({
  summary,
  issuesFound,
  specFile,
}: {
  summary: string;
  issuesFound: number;
  specFile: string;
}): string {
  const status =
    issuesFound === 0 ? "Ready for review" : `${issuesFound} issues found`;

  return `${summary}

**Spec**: \`${specFile}\`
**Status**: ${status}

🤖 Generated with implement-review-workflow`;
}
