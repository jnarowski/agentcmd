/**
 * E2E Test Workflow
 *
 * Minimal workflow for end-to-end testing of the workflow engine.
 * Designed to execute quickly and produce verifiable outputs.
 *
 * Features:
 * - 2 phases (setup → execute)
 * - 1 AI step with simple JSON prompt
 * - 3 annotations (start, processing, complete)
 * - 1 artifact (e2e-test-results.json)
 * - Fast execution (~20-30s)
 * - Deterministic outputs
 */

import { defineWorkflow } from "agentcmd-workflows";

const SIMPLE_PROMPT = `Generate a simple test result.

Return JSON with:
{
  "testName": "e2e-workflow-test",
  "status": "passed",
  "timestamp": "${new Date().toISOString()}",
  "message": "Workflow executed successfully"
}

Keep response simple and fast.`;

export default defineWorkflow(
  {
    id: "e2e-test-workflow",
    name: "E2E Test Workflow",
    description: "Minimal workflow for E2E testing - fast execution with verifiable outputs",
    phases: [
      { id: "setup", label: "Setup" },
      { id: "execute", label: "Execute" },
    ],
  },
  async ({ event, step }) => {
    const startTime = Date.now();

    // ========================================
    // PHASE 1: Setup
    // ========================================
    await step.phase("setup", async () => {
      await step.annotation("test-start", {
        message: "Starting E2E test workflow execution",
      });
    });

    // ========================================
    // PHASE 2: Execute
    // ========================================
    await step.phase("execute", async () => {
      await step.annotation("test-processing", {
        message: "Processing test workflow with AI step",
      });

      // Simple AI step with JSON output
      const testResult = await step.agent<{
        testName: string;
        status: string;
        timestamp: string;
        message: string;
      }>("run-test", {
        agent: "claude",
        json: true,
        prompt: SIMPLE_PROMPT,
      });

      // Create artifact with test results
      await step.artifact("test-results", {
        name: "e2e-test-results.json",
        type: "text",
        content: JSON.stringify(
          {
            ...testResult.data,
            executionTime: Date.now() - startTime,
            workflowId: "e2e-test-workflow",
            runId: event.data.runId,
          },
          null,
          2
        ),
      });

      await step.annotation("test-complete", {
        message: `✓ E2E test workflow completed successfully`,
      });
    });

    // Return summary
    return {
      success: true,
      executionTime: Date.now() - startTime,
      phasesCompleted: 2,
      completedAt: new Date().toISOString(),
    };
  }
);
