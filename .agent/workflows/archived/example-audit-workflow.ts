import { defineWorkflow } from "../../../packages/agentcmd-workflows/dist";
import { buildSlashCommand } from "../../generated/slash-commands";
/**
 * Example workflow demonstrating step.agent with Claude CLI integration.
 * Shows how to use AI agents within workflow steps for automated tasks.
 */
export default defineWorkflow(
  {
    id: "example-audit-workflow",
    name: "Example Audit Workflow",
    description:
      "Example workflow demonstrating step.agent with Claude CLI integration",
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
        prompt: buildSlashCommand("/audit"),
        permissionMode: "plan",
      });
    });

    // return { success: true, output: response.output };
    return response;
  }
);
