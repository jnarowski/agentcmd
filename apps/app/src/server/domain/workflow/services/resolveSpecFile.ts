import {
  buildSlashCommand,
  type CmdGenerateSpecResponse,
  type SlashCommandName,
  type WorkflowEvent,
  type WorkflowStep,
} from "agentcmd-workflows";
import { getSpecCommand } from "./getSpecCommand";

export async function resolveSpecFile(
  event: WorkflowEvent,
  step: WorkflowStep
): Promise<string> {
  // 1. Use provided spec if available
  if (event.data.specFile) {
    return event.data.specFile;
  }

  // Determine which command to use
  const specType = event.data.specType ?? "feature";
  const command = event.data.specCommandOverride ?? getSpecCommand(specType);

  // 2. Resume from planning session
  if (event.data.planningSessionId) {
    const response = await step.agent<CmdGenerateSpecResponse>(
      "Generate Spec",
      {
        agent: "claude",
        json: true,
        prompt: buildSlashCommand(command as SlashCommandName),
        resume: event.data.planningSessionId,
        workingDir: event.data.workingDir,
      }
    );

    if (!response.data?.spec_file) {
      throw new Error("Spec generation failed: no spec_file returned");
    }

    return response.data.spec_file;
  }

  // 3. Generate fresh spec
  const response = await step.agent<CmdGenerateSpecResponse>(
    "Generate Spec File",
    {
      agent: "claude",
      json: true,
      prompt: buildSlashCommand(command as SlashCommandName, {
        context: event.data.specContent,
      }),
      workingDir: event.data.workingDir,
    }
  );

  if (!response.data?.spec_file) {
    throw new Error("Spec generation failed: no spec_file returned");
  }

  return response.data.spec_file;
}
