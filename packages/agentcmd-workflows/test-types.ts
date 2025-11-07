import { defineWorkflow, defineSchema } from "./src/index";

// Test the new typed args schema feature
const argsSchema = defineSchema({
  type: "object",
  properties: {
    projectName: { type: "string" },
    buildType: { enum: ["production", "development"] },
    includeTests: { type: "boolean" },
    tags: { type: "array", items: { type: "string" } },
    config: {
      properties: {
        timeout: { type: "number" },
        retries: { type: "number" },
      },
    },
  },
  required: ["projectName", "buildType"],
});

const workflow = defineWorkflow(
  {
    id: "test",
    trigger: "workflow/test",
    argsSchema,
  },
  async ({ event }) => {
    // Type test: these should all be properly typed
    const { projectName, buildType, includeTests, tags, config } = event.data.args;

    // Test required fields (no undefined)
    const name: string = projectName;
    const type: "production" | "development" = buildType;

    // Test optional fields
    const tests: boolean | undefined = includeTests;
    const tagList: string[] | undefined = tags;
    const cfg: { timeout?: number; retries?: number } | undefined = config;

    // Test array access
    tags?.forEach((tag) => {
      const t: string = tag;
    });

    // Test nested object access
    const timeout: number | undefined = config?.timeout;
  }
);

console.log("Type test passed!");
