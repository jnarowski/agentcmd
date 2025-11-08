import { defineWorkflow } from "../../../packages/agentcmd-workflows/dist";

/**
 * Simple Git Workflow with Branch Setup
 *
 * Demonstrates setupWorkspace for branch-based git operations
 *
 * Usage: step.setupWorkspace("step-id", event.data)
 *
 * Event data fields:
 * - projectPath: string (defaults to context.projectPath)
 * - branchName: string (target branch)
 * - baseBranch: string (base branch, defaults to "main")
 */
export default defineWorkflow(
  {
    id: "simple-git-workflow",
    name: "Simple Git Workflow",
    description: "Basic git workflow with branch setup",

    phases: [{ id: "setup", label: "Setup" }] as const,
  },
  async ({ event, step }) => {
    const workspace = await step.phase("setup", async () => {
      return await step.setupWorkspace("Initialize Git", event.data);
    });

    console.log(`Working on branch: ${workspace.branch}`);
    console.log(`Working directory: ${workspace.workingDir}`);
    console.log(`Mode: ${workspace.mode}`);

    return {
      success: true,
      branch: workspace.branch,
      mode: workspace.mode,
    };
  }
);
