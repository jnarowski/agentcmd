import { defineWorkflow } from "agentcmd-workflows";

export default defineWorkflow(
  {
    id: "pr-review",
    name: "PR Review",
    description: "AI-powered code review workflow",
    phases: [
      { id: "review", label: "Review" },
      { id: "feedback", label: "Feedback" },
    ] as const,
  },
  async ({ step, event }) => {
    const { spec } = event.data.args as { spec?: string };

    await step.phase("review", async () => {
      // Review the code changes
      const review = await step.ai("review-code", {
        model: "claude-sonnet-4-5-20250929",
        prompt: `You are a code reviewer. Review the following specification and provide feedback:

${spec || "No specification provided"}

Provide:
1. Overall assessment
2. Potential issues or bugs
3. Suggestions for improvement
4. Code quality notes`,
      });

      await step.phase("feedback", async () => {
        // Create annotation with review feedback
        await step.annotation("review-feedback", {
          message: `## Code Review Complete

${review.data.text}`,
        });
      });
    });
  }
);
