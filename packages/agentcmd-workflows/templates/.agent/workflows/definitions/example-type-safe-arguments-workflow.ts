/**
 * Example: Type-Safe Arguments
 *
 * Demonstrates type-safe workflow arguments using defineSchema():
 * - Enum types for fixed choices (priority levels)
 * - Boolean flags for optional behavior (createPr, runE2e)
 * - Runtime validation before workflow executes
 * - Full TypeScript type inference in event.data.args
 * - Conditional execution based on argument values
 */
import { defineSchema, defineWorkflow } from "agentcmd-workflows";

// Define schema with type-safe arguments
const argsSchema = defineSchema({
  type: "object",
  properties: {
    priority: { enum: ["critical", "high", "medium", "low"] },
    createPr: { type: "boolean" },
    runE2e: { type: "boolean" },
  },
  required: ["priority"],
});

export default defineWorkflow(
  {
    id: "example-type-safe-arguments",
    name: "Example: Type-Safe Arguments",
    description: "Demonstrates type-safe workflow arguments with validation and conditional execution",
    argsSchema,
    phases: ["implement", "test", "finalize"],
  },
  async ({ event, step }) => {
    // Extract project path
    const projectPath = (event.data.projectPath as string) || process.cwd();

    // Destructure arguments with full type safety
    // priority: "critical" | "high" | "medium" | "low"
    // createPr: boolean | undefined
    // runE2e: boolean | undefined
    const { priority, createPr = false, runE2e = false } = event.data.args;

    // ========================================
    // PHASE 1: Implement
    // ========================================
    await step.phase("implement", async () => {
      await step.annotation("start-implementation", {
        message: `Starting ${priority} priority feature implementation`,
      });

      // Simulate feature implementation based on priority
      const buildTime = priority === "critical" ? "2s" : "4s";

      await step.cli("build-feature", {
        command: `echo 'Building feature (${priority} priority)...' && sleep ${buildTime.replace("s", "")} && echo 'Build complete'`,
        cwd: projectPath,
      });

      await step.annotation("implementation-complete", {
        message: `Feature implemented with ${priority} priority`,
      });
    });

    // ========================================
    // PHASE 2: Test
    // ========================================
    await step.phase("test", async () => {
      await step.annotation("start-tests", {
        message: "Running unit tests",
      });

      // Always run unit tests
      await step.cli("run-unit-tests", {
        command: "echo 'Running unit tests...' && sleep 2 && echo '✓ Unit tests passed'",
        cwd: projectPath,
      });

      // Conditionally run E2E tests based on runE2e flag
      if (runE2e) {
        await step.annotation("start-e2e", {
          message: "Running E2E tests (optional - enabled by runE2e flag)",
        });

        await step.cli("run-e2e-tests", {
          command: "echo 'Running E2E tests...' && sleep 3 && echo '✓ E2E tests passed'",
          cwd: projectPath,
        });

        await step.annotation("e2e-complete", {
          message: "E2E tests completed successfully",
        });
      } else {
        await step.annotation("e2e-skipped", {
          message: "Skipping E2E tests (runE2e flag not set)",
        });
      }

      // Create test results artifact
      await step.artifact("test-results", {
        name: "test-results.json",
        type: "text",
        content: JSON.stringify(
          {
            priority,
            unitTests: { status: "passed", count: 24 },
            e2eTests: runE2e
              ? { status: "passed", count: 8 }
              : { status: "skipped" },
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
      });
    });

    // ========================================
    // PHASE 3: Finalize
    // ========================================
    await step.phase("finalize", async () => {
      // Conditionally create PR based on createPr flag
      if (createPr) {
        await step.annotation("creating-pr", {
          message: "Creating pull request (enabled by createPr flag)",
        });

        await step.git("create-pr", {
          operation: "pr",
          title: `feat: ${priority} priority feature implementation`,
          body: `## Summary\n\nImplemented feature with ${priority} priority.\n\n## Tests\n- Unit tests: ✓ Passed\n${runE2e ? "- E2E tests: ✓ Passed" : "- E2E tests: Skipped"}`,
        });

        await step.annotation("pr-created", {
          message: "Pull request created successfully",
        });
      } else {
        await step.annotation("pr-skipped", {
          message: "Skipping PR creation (createPr flag not set)",
        });
      }

      await step.annotation("workflow-complete", {
        message: `Workflow completed - ${priority} priority feature ready`,
      });
    });

    // Return summary
    return {
      success: true,
      priority,
      testsRun: {
        unit: true,
        e2e: runE2e,
      },
      prCreated: createPr,
      completedAt: new Date().toISOString(),
    };
  }
);
