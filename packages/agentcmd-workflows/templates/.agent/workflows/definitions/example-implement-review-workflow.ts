import { buildSlashCommand, defineWorkflow, type CmdImplementSpecResponse, type CmdReviewSpecImplementationResponse } from "agentcmd-workflows";

/**
 * Example workflow demonstrating automatic workspace lifecycle.
 * Workspace setup and cleanup happen automatically via _system_setup and _system_finalize.
 * Spec file resolution happens automatically in system setup phase.
 */

export default defineWorkflow(
  {
    id: "implement-review-workflow",
    name: "Implement Review Workflow",
    description: "Implements a spec file and reviews the implementation",
    phases: [
      { id: "setup", label: "Setup" },
      { id: "implement", label: "Implement" },
      { id: "review", label: "Review" },
    ],
  },
  async ({ event, step }) => {
    const { workingDir, specFile } = event.data;

    await step.phase("implement", async () => {
      const response = await step.agent<CmdImplementSpecResponse>(
        "implement-spec",
        {
          agent: "claude",
          json: true,
          prompt: buildSlashCommand("/cmd:implement-spec", {
            specIdOrNameOrPath: specFile,
            format: "json",
          }),
          workingDir,
        }
      );

      return response;
    });

    await step.phase("review", async () => {
      const response = await step.agent<CmdReviewSpecImplementationResponse>(
        "review-spec-implementation",
        {
          agent: "claude",
          json: true,
          prompt: buildSlashCommand("/cmd:review-spec-implementation", {
            specIdOrNameOrPath: specFile,
            format: "json",
          }),
          workingDir,
        }
      );

      return response;
    });
  }
);
