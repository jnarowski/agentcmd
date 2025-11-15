import {
  buildSlashCommand,
  defineWorkflow,
  type CmdImplementSpecResponse,
  type CmdReviewSpecImplementationResponse,
} from "../../../packages/agentcmd-workflows/dist";

/**
 * Example workflow demonstrating automatic workspace lifecycle.
 * Workspace setup and cleanup happen automatically via _system_setup and _system_finalize.
 * Spec file resolution happens automatically in system setup phase.
 */

export default defineWorkflow(
  {
    id: "example-kitchen-sink-workflow",
    name: "Example Kitchen Sink Workflow",
    description:
      "Example workflow demonstrating all features of the workflow engine",
    phases: [
      { id: "setup", label: "Setup" },
      { id: "implement", label: "Implement" },
      { id: "review", label: "Review" },
    ],
  },
  async ({ event, step }) => {
    const { workingDir, specFile } = event.data;
  }
);
