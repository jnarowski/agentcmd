import { defineWorkflow } from "agentcmd-workflows";

/**
 * Example workflow demonstrating step.agent with Claude CLI integration.
 * Shows how to use AI agents within workflow steps for automated tasks.
 */
export default defineWorkflow(
  {
    id: "audit-workflow",
    name: "Audit Slash Command",
    description: "Audits the codebase",
    phases: [{ id: "audit", label: "Audit" }],
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

    const response = await step.phase("audit", async () => {
      return await step.agent("Audit", {
        agent: "claude",
        prompt: `/cmd:audit`,
        permissionMode: "plan",
      });
    });

    // return { success: true, output: response.output };
    return response;
  }
);
