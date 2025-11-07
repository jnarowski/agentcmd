import { defineWorkflow } from "agentcmd-workflows";

/**
 * AI-powered workflow example demonstrating agent integration
 *
 * This shows how to integrate AI steps for tasks like:
 * - Code generation
 * - Analysis and research
 * - Automated decision making
 */
export const aiWorkflow = defineWorkflow({
  name: "ai-workflow",
  description: "Workflow with AI-powered steps",

  async execute({ step, logger, config, ai }) {
    // Step 1: Analyze requirements
    const analysis = await step({
      name: "analyze-requirements",
      execute: async () => {
        logger.info("Analyzing requirements with AI");

        // Use AI step for analysis
        const result = await ai({
          prompt:
            "Analyze the project requirements and suggest implementation approach",
          context: {
            projectPath: config.projectPath,
          },
        });

        return result;
      },
    });

    // Step 2: Generate code
    await step({
      name: "generate-code",
      execute: async () => {
        logger.info("Generating code based on analysis");

        const result = await ai({
          prompt: `Generate implementation based on: ${analysis.summary}`,
          context: {
            analysis,
          },
        });

        return result;
      },
    });

    // Step 3: Review and validate
    await step({
      name: "review",
      execute: async () => {
        logger.info("Reviewing generated code");

        // Add validation logic
        return { validated: true };
      },
    });

    return { success: true };
  },
});
