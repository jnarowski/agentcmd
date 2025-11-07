import { defineWorkflow } from "../../../packages/agentcmd-workflows/dist";

/**
 * Example workflow demonstrating step.agent with Claude CLI integration.
 * Shows how to use AI agents within workflow steps for automated tasks.
 */
export default defineWorkflow(
  {
    id: "agent-example-workflow",
    trigger: "workflow/agent-example",
    name: "Agent Example Workflow",
    description: "Demonstrates Claude Code integration via step.agent",
    phases: [{ id: "implement", label: "Implement" }],
  },
  async ({ event, step }) => {
    const {
      specFile,
      specContent,
      branchFrom,
      branchName,
      worktreeName,
      projectPath,
    } = event.data;

    await step.phase("implement", async () => {
      await step.agent("Implement Spec", {
        agent: "claude",
        prompt: `
          Project: ${projectPath}
          Spec: ${specFile}
          Branch from: ${branchFrom} → ${branchName}
          Worktree: ${worktreeName}

          ${specContent}
        `,
        permissionMode: "plan",
      });
    });

    return { success: true };
  }
);
