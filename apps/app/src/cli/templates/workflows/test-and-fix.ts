import { defineWorkflow } from "agentcmd-workflows";

export default defineWorkflow(
  {
    id: "test-and-fix",
    name: "Run Tests & Fix Issues",
    description: "Run tests and automatically fix any failures with AI assistance",
    phases: [
      { id: "test", label: "Test" },
      { id: "analyze", label: "Analyze" },
      { id: "fix", label: "Fix" },
    ] as const,
  },
  async ({ step }) => {
    await step.phase("test", async () => {
      // Run tests
      const testResult = await step.cli("run-tests", {
        command: "npm test || true", // Continue even if tests fail
      });

      if (testResult.data.exitCode === 0) {
        await step.annotation("tests-passed", {
          message: "## All Tests Passed ✓\n\nNo fixes needed!",
        });
        return;
      }

      await step.phase("analyze", async () => {
        // Analyze test failures with AI
        const analysis = await step.ai("analyze-failures", {
          model: "claude",
          prompt: `Analyze the following test output and suggest fixes:

${testResult.data.stdout}
${testResult.data.stderr}

Provide:
1. Summary of what failed
2. Root cause analysis
3. Specific code changes needed to fix`,
        });

        await step.phase("fix", async () => {
          // Let user review AI suggestions
          await step.annotation("fix-suggestions", {
            message: `## Test Failure Analysis

${analysis.data.text}

**Next Steps:** Review the suggestions above and apply the recommended fixes.`,
          });
        });
      });
    });
  }
);
