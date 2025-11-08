import { defineWorkflow } from "../../../packages/agentcmd-workflows/dist";

/**
 * Example workflow demonstrating workspace setup and agent integration.
 * Shows how to use setupWorkspace/cleanupWorkspace for smart git management.
 */
export default defineWorkflow(
  {
    id: "agent-example-workflow",
    name: "Agent Example Workflow",
    description: "Demonstrates workspace setup and Claude Code integration",
    phases: [
      { id: "setup", label: "Setup Workspace" },
      { id: "implement", label: "Implement" },
      { id: "cleanup", label: "Cleanup" },
    ],
  },
  async ({ event, step }) => {
    const {
      specFile,
      specContent,
      baseBranch,
      branchName,
      worktreeName,
      projectPath,
    } = event.data;

    // Phase 1: Setup workspace
    const workspace = await step.phase("setup", async () => {
      return await step.setupWorkspace("setup-workspace", {
        projectPath,
        branch: branchName,
        baseBranch,
        worktreeName,
      });
    });

    // Phase 2: Implement using the workspace
    await step.phase("implement", async () => {
      await step.agent("implement-spec", {
        agent: "claude",
        prompt: `/implement-spec ${specFile}`,
        projectPath: workspace.workingDir, // Use workspace directory
        permissionMode: "bypassPermissions",
      });
    });

    // Phase 3: Cleanup workspace
    await step.phase("cleanup", async () => {
      await step.cleanupWorkspace("cleanup-workspace", {
        workspaceResult: workspace,
      });
    });

    return { success: true };
  }
);
