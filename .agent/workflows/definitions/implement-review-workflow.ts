import {
  defineWorkflow,
  type WorkflowStep,
} from "../../../packages/agentcmd-workflows/dist";

// Type definitions from monorepo-wide generated types
import {
  buildSlashCommand,
  type CmdImplementSpecResponse,
  type CmdReviewSpecImplementationResponse,
  type CmdCreatePrResponse,
} from "../../generated/slash-commands";

/**
 * Workflow context for sharing state between phases via closure.
 * Stores implementation and review results for PR generation.
 */
interface WorkflowContext {
  implement?: CmdImplementSpecResponse;
  review?: CmdReviewSpecImplementationResponse;
}

/**
 * Simple implement and review workflow with single-pass execution.
 *
 * This workflow demonstrates:
 * - Closure-based context sharing between phases
 * - Retry logic for implementation attempts
 * - Type-safe helper functions with object parameters
 * - Automatic PR generation from workflow data
 *
 * Features:
 * - Implements spec with retry (up to 10 attempts)
 * - Reviews implementation once
 * - Creates PR with implementation summary and review status
 *
 * Flow:
 * 1. Implement phase: calls /cmd:implement-spec up to 10 times until success
 * 2. Review phase: calls /cmd:review-spec-implementation once
 * 3. Complete phase: moves spec to done folder and creates PR
 */

export default defineWorkflow(
  {
    id: "implement-workflow",
    name: "Implement & Review Workflow",
    description: "Implements a spec iteratively until it is complete",
    phases: [
      { id: "implement", label: "Implement" },
      { id: "review", label: "Review" },
      { id: "complete", label: "Complete" },
    ],
  },
  async ({ event, step }) => {
    const { workingDir, specFile } = event.data;

    // Context object shared across phases via closure
    // Helper functions mutate this to pass data between steps
    const ctx: WorkflowContext = {};

    await step.phase("implement", async () => {
      // iteratively calls implement until success
      // this helps with implementing large specs that may fill multiple context windows
      await implementUntilComplete({
        step,
        specFile,
        workingDir,
        ctx,
      });

      // Commit implementation changes
      await step.git("commit-implementation", {
        operation: "commit",
        message: `feat: implement ${event.data.name}`,
      });
    });

    await step.phase("review", async () => {
      await reviewImplementation({
        step,
        specFile,
        workingDir,
        ctx,
      });

      // Commit review changes (safe even if no changes)
      await step.git("commit-review-fixes", {
        operation: "commit",
        message: `chore: address review feedback`,
      });
    });

    await step.phase("complete", async () => {
      // Safety check: ensure we have implementation and review data
      if (!ctx.implement || !ctx.review) {
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
      await step.agent<CmdCreatePrResponse>("commit-push-and-create-pr", {
        agent: "claude",
        json: true,
        prompt: buildSlashCommand("/cmd:create-pr", {
          title: `feat: ${event.data.name}`,
        }),
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
 * Updates ctx.implement with each attempt for downstream use.
 *
 * @param step - Workflow step interface
 * @param specFile - Spec file path or identifier
 * @param workingDir - Project working directory
 * @param ctx - Shared context object (mutated)
 *
 * Calls: /cmd:implement-spec (see .claude/commands/cmd/implement-spec.md)
 */
async function implementUntilComplete({
  step,
  specFile,
  workingDir,
  ctx,
}: {
  step: WorkflowStep;
  specFile: string;
  workingDir: string;
  ctx: WorkflowContext;
}) {
  const MAX_ITERATIONS = 10; // Adjustable based on complexity

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    const stepName = `implement-spec-${i}`;
    const result = await step.agent<CmdImplementSpecResponse>(stepName, {
      agent: "claude",
      json: true,
      prompt: buildSlashCommand("/cmd:implement-spec", {
        specIdOrNameOrPath: specFile,
      }),
      workingDir,
    });

    ctx.implement = result.data;

    step.annotation(`${stepName}-summary`, {
      message: `Implement attempt ${i} ${result.data.success ? "passed" : "failed"}. ${result.data.summary}`,
    });

    if (result.data.success) {
      return;
    }
  }
}

/**
 * Reviews implementation and returns findings.
 *
 * Checks implementation against spec requirements.
 * Updates ctx.review with findings for PR generation.
 *
 * @param step - Workflow step interface
 * @param specFile - Spec file path or identifier
 * @param workingDir - Project working directory
 * @param ctx - Shared context object (mutated)
 *
 * Calls: /cmd:review-spec-implementation (see .claude/commands/cmd/review-spec-implementation.md)
 */
async function reviewImplementation({
  step,
  specFile,
  workingDir,
  ctx,
}: {
  step: WorkflowStep;
  specFile: string;
  workingDir: string;
  ctx: WorkflowContext;
}) {
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

  ctx.review = response.data;

  await step.annotation("review-completed", {
    message: `Review ${response.data.success ? "passed" : "failed"}. ${response.data.summary}`,
  });
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
