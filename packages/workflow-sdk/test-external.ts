import { defineWorkflow } from "./dist/index.js";

export default defineWorkflow(
  {
    id: "test",
    trigger: "test",
    phases: [
      { id: "validate", label: "Validate" },
      { id: "build", label: "Build" },
    ],
  },
  async ({ step }) => {
    await step.phase("valisdate", async () => {}); // Typo - should error
  }
);
