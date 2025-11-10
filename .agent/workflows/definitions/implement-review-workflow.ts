import { defineWorkflow } from "../../../packages/agentcmd-workflows/dist";

/**
 * Example workflow demonstrating automatic workspace lifecycle.
 * Workspace setup and cleanup happen automatically via _system_setup and _system_finalize.
 */
export default defineWorkflow(
  {
    id: "agent-example-workflow",
    name: "Agent Example Workflow",
    description: "Demonstrates automatic workspace lifecycle and Claude Code integration",
    phases: [{ id: "implement", label: "Implement" }],
  },
  async ({ event, step, workspace }) => {
    const { specFile, projectPath } = event.data;

    // Workspace is automatically set up before this runs (_system_setup)
    // Use workspace.workingDir for all operations
    const workingDir = workspace?.workingDir || projectPath;

    // Phase 1: Implement using the workspace
    await step.phase("implement", async () => {
      await step.agent("implement-spec", {
        agent: "claude",
        prompt: `/implement-spec ${specFile}`,
        projectPath: workingDir, // Use workspace directory
        permissionMode: "bypassPermissions",
      });
    });

    // Workspace is automatically cleaned up after this returns (_system_finalize)

    return { success: true };
  }
);
