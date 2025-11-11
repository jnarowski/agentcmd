import {
  buildSlashCommand,
  defineWorkflow,
  type WorkflowStep,
  type CmdGenerateSpecResponse,
  type CmdImplementSpecResponse,
  type CmdReviewSpecImplementationResponse,
} from "../../../packages/agentcmd-workflows/dist";

/**
 * Example workflow demonstrating automatic workspace lifecycle.
 * Workspace setup and cleanup happen automatically via _system_setup and _system_finalize.
 */

interface ImplementReviewWorkflowContext {
  specFile?: string;
}

export default defineWorkflow(
  {
    id: "implement-review-workflow",
    name: "Implement Review Workflow",
    description: "Implements a spec file and reviews the implementation",
    phases: [
      { id: "implement", label: "Implement" },
      { id: "review", label: "Review" },
    ],
  },
  async ({ event, step }) => {
    const { specContent, workingDir } = event.data;
    const ctx: ImplementReviewWorkflowContext = {};

    await step.phase("implement", async () => {
      ctx.specFile = await getSpecFile({ event, step });

      const response = await step.agent<CmdImplementSpecResponse>(
        "implement-spec",
        {
          agent: "claude",
          json: true,
          prompt: buildSlashCommand("/cmd:implement-spec", {
            specIdOrNameOrPath: ctx.specFile!,
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
            specIdOrNameOrPath: ctx.specFile!,
            format: "json",
          }),
          workingDir,
        }
      );

      return response;
    });
  }
);

const getSpecFile = async ({
  event,
  step,
}: {
  event: any;
  step: WorkflowStep;
}) => {
  if (event.data.specFile) {
    return event.data.specFile;
  }

  const response = await step.agent<CmdGenerateSpecResponse>(
    "Generate Spec File",
    {
      agent: "claude",
      json: true,
      prompt: buildSlashCommand("/cmd:generate-spec", {
        context: event.data.specContent,
      }),
      workingDir: event.data.workingDir,
    }
  );

  return response.data?.spec_file;
};
