import { defineWorkflow } from "../../../packages/workflow-sdk/dist";

/**
 * Example workflow that demonstrates basic text output functionality.
 * This workflow runs through three phases and outputs text at each step.
 */
export default defineWorkflow(
  {
    id: "implmenent-review-workflow",
    trigger: "workflow/implmenent-review",
    name: "Implmenent Review",
    description:
      "Accepts a plan, implements it and reviews it until it is accepted",
    phases: [
      { id: "initialize", label: "Initialize" },
      { id: "process", label: "Process" },
      { id: "complete", label: "Complete" },
    ],
  },
  async ({ event, step }) => {
    // Phase 1: Initialize

    await step.phase("initialize", async () => {
      await step.annotation("init-annotation", {
        message: "Starting example workflow - initialization phase",
      });
      await step.sleep("sleep-for-5-seconds", 10000);
      await step.run("log-start", async () => {
        console.log("Workflow started at:", new Date().toISOString());
        return { message: "Initialization complete" };
      });
    });

    // Phase 2: Process
    await step.phase("process", async () => {
      await step.annotation("process-annotation-1", {
        message: "Processing data - this is the main work phase",
      });
      await step.sleep("sleep-for-5-seconds", 10000);
      await step.annotation("process-annotation-2", {
        message: "Let's do this thing!",
      });
      // Output some text data
      await step.run("process-data", async () => {
        const data = {
          input: event.data,
          processed: true,
          timestamp: new Date().toISOString(),
          result: "Data processing complete",
        };

        console.log("Processing data:", JSON.stringify(data, null, 2));
        return data;
      });

      // Create a text artifact
      await step.artifact("process-results", {
        name: "processing-results.txt",
        type: "text",
        content: `Workflow Execution Results
===========================
Workflow ID: example-text-workflow
Execution Time: ${new Date().toISOString()}
Status: Processing Complete
Input Data: ${JSON.stringify(event.data, null, 2)}

This is a simple text output demonstrating the workflow system.
All phases are executing correctly.
`,
      });
    });

    // Phase 3: Complete
    await step.phase("complete", async () => {
      await step.annotation("complete-annotation-1", {
        message: "Finalizing workflow - cleanup phase",
      });
      await step.annotation("complete-annotation-2", {
        message: "Stand by me when you're in trouble...and you need a friend",
      });

      await step.run("finalize", async () => {
        const summary = {
          workflowId: "example-text-workflow",
          status: "completed",
          phasesExecuted: ["initialize", "process", "complete"],
          completedAt: new Date().toISOString(),
          message: "Workflow execution successful!",
        };

        console.log("Workflow Summary:", JSON.stringify(summary, null, 2));
        return summary;
      });
    });

    // Return final result
    return {
      success: true,
      message: "Example workflow completed successfully",
      timestamp: new Date().toISOString(),
    };
  }
);
