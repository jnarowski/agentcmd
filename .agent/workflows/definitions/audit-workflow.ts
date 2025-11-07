import { defineWorkflow } from "../../../packages/agentcmd-workflows/dist";

/**
 * Example workflow demonstrating step.agent with Claude CLI integration.
 * Shows how to use AI agents within workflow steps for automated tasks.
 */
export default defineWorkflow(
  {
    id: "audit-workflow",
    trigger: "workflow/audit",
    name: "Audit Slash Command",
    description: "Audits the codebase",
    phases: [{ id: "audit", label: "Audit" }],
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

    const response = await step.phase("audit", async () => {
      console.log("Audit phase", event.data);

      return await step.agent("Audit", {
        agent: "claude",
        prompt: `/audit`,
        permissionMode: "plan",
      });
    });

    return { success: true, response };
  }
);
