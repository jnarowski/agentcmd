import { defineWorkflow } from "agentcmd-workflows";

export default defineWorkflow(
  {
    id: "setup-typescript",
    name: "Setup TypeScript Project",
    description: "Initialize a new TypeScript project with common configuration",
    phases: [
      { id: "init", label: "Initialize" },
      { id: "configure", label: "Configure" },
      { id: "test", label: "Test" },
    ] as const,
  },
  async ({ step }) => {
    await step.phase("init", async () => {
      // Initialize package.json
      await step.cli("npm-init", {
        command: "npm init -y",
      });

      // Install TypeScript and dependencies
      await step.cli("install-deps", {
        command: "npm install --save-dev typescript @types/node tsx",
      });
    });

    await step.phase("configure", async () => {
      // Initialize TypeScript config
      await step.cli("init-tsconfig", {
        command: "npx tsc --init",
      });

      // Create src directory
      await step.cli("create-src", {
        command: "mkdir -p src && echo 'console.log(\"Hello, TypeScript!\");' > src/index.ts",
      });
    });

    await step.phase("test", async () => {
      // Test TypeScript compilation
      await step.cli("test-compile", {
        command: "npx tsc --noEmit",
      });

      await step.annotation("setup-complete", {
        message: "## TypeScript Project Setup Complete\n\nYour TypeScript project is ready! Run `npx tsx src/index.ts` to execute.",
      });
    });
  }
);
