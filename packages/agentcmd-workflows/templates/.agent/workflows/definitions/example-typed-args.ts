import { defineSchema, defineWorkflow } from "agentcmd-workflows";

/**
 * Example: Type-safe workflow arguments with defineSchema
 *
 * NEW: No `as const` required! defineSchema automatically preserves literal types.
 *
 * Simple:
 * 1. Use defineSchema() to define typed schema (no `as const` needed)
 * 2. Pass argsSchema to defineWorkflow config
 * 3. event.data.args is automatically typed - no manual casting!
 */

export default defineWorkflow(
  {
    id: "typed-build-workflow",
    name: "Type-Safe Build Workflow",
    phases: [{ id: "validate", label: "Validate" }],
    argsSchema: defineSchema({
      type: "object",
      properties: {
        projectName: { type: "string" },
        buildType: { enum: ["production", "development"] }, // ✅ No `as const` needed
        includeTests: { type: "boolean" },
        tags: { type: "array", items: { type: "string" } }, // ✅ Array support!
        config: {
          properties: {
            timeout: { type: "number" },
            retries: { type: "number" },
          },
        }, // ✅ Nested objects!
      },
      required: ["projectName", "buildType"], // ✅ No `as const` needed
    }),
  },
  async ({ event, step }) => {
    // Return all params user provided via custom args
    await step.run("return-params", async () => {
      return {
        success: true,
        providedParams: event.data.args,
        message: `Received workflow with projectName: ${event.data.args.projectName}, buildType: ${event.data.args.buildType}`,
      };
    });

    return {
      success: true,
      params: event.data.args,
    };
  }
);
