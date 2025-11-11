import {
  defineWorkflow,
  type WorkflowStep,
} from "../../../packages/agentcmd-workflows/dist";

/**
 * Example workflow demonstrating automatic workspace lifecycle.
 * Workspace setup and cleanup happen automatically via _system_setup and _system_finalize.
 */

interface ImplementReviewWorkflowContext {
  specFile?: string;
}

interface AgentGenerateSpecResult {
  specFile: string;
}

export default defineWorkflow(
  {
    id: "agent-example-workflow",
    name: "Implement Review Recursive Workflow",
    description:
      "Implements a spec file and reviews the implementation recursively until no issues are found",
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

      const response = await step.agent("implement-spec", {
        agent: "claude",
        prompt: `/cmd:implement-spec ${ctx.specFile}`,
        workingDir,
        permissionMode: "bypassPermissions",
      });

      return {
        success: response.success,
        output: response.output,
        message: response.message,
        sessionId: response.sessionId,
      };
    });

    await step.phase("review", async () => {
      const response = await step.agent("review-spec-implementation", {
        agent: "claude",
        prompt: `/cmd:review-spec-implementation ${ctx.specFile}`,
        workingDir,
        permissionMode: "bypassPermissions",
      });

      return {
        success: response.success,
        output: response.output,
        message: response.message,
        sessionId: response.sessionId,
      };
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

  const response = await step.agent<AgentGenerateSpecResult>(
    "Generate Spec File",
    {
      agent: "claude",
      prompt: `/cmd:generate-spec "${event.data.specContent}"`,
      permissionMode: "bypassPermissions",
      json: true,
    }
  );

  return response.data?.specFile;
};
