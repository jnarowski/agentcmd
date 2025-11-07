import { defineWorkflow } from "agentcmd-workflows";

/**
 * Basic workflow example demonstrating simple sequential steps
 */
export const basicWorkflow = defineWorkflow({
  name: "basic-workflow",
  description: "A simple workflow with sequential steps",

  async execute({ step, logger, config }) {
    // Step 1: Initial setup
    await step({
      name: "setup",
      execute: async () => {
        logger.info("Starting workflow setup");
        return { initialized: true };
      },
    });

    // Step 2: Process data
    const result = await step({
      name: "process-data",
      execute: async () => {
        logger.info("Processing data");
        // Your processing logic here
        return { processed: true, count: 42 };
      },
    });

    // Step 3: Finalize
    await step({
      name: "finalize",
      execute: async () => {
        logger.info("Finalizing workflow", { result });
        return { completed: true };
      },
    });

    return { success: true };
  },
});
