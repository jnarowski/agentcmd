import type { WorkflowStep, WorkflowEvent } from "agentcmd-workflows";
import {
  buildSlashCommand,
  type CmdGenerateSpecResponse,
  type SlashCommandName,
} from "agentcmd-workflows";
import type { FastifyBaseLogger } from "fastify";
import type { WorkflowRun } from "@prisma/client";
import { getSpecCommand } from "../getSpecCommand";
import { existsSync } from "fs";
import { join, resolve, isAbsolute } from "path";

/**
 * Setup spec file for workflow execution.
 * Ensures event.data.specFile is populated, either from provided file or by generating new spec.
 *
 * **Behavior:**
 * - If `event.data.specFile` exists: Verifies file exists, throws if not found
 * - Otherwise: Generates spec using `/cmd:generate-{specType}-spec` command
 * - Defaults to `specType: "feature"` if not specified
 * - Validates that required slash command exists before generation
 */
export async function setupSpec(params: {
  run: WorkflowRun & { project: { path: string } };
  event: WorkflowEvent;
  step: WorkflowStep;
  logger: FastifyBaseLogger;
}): Promise<void> {
  const { run, event, step, logger } = params;
  // Early return if no data
  if (!event.data) {
    return;
  }

  // If specFile already provided, verify it exists
  if (event.data.specFile) {
    // Resolve relative paths from project directory
    const specFilePath = resolveProjectPath(
      run.project.path,
      event.data.specFile
    );

    if (!existsSync(specFilePath)) {
      throw new Error(`Spec file not found: ${event.data.specFile}`);
    }

    // Update to absolute path
    event.data.specFile = specFilePath;

    logger.info(
      { runId: run.id, specFile: specFilePath },
      "Using provided spec file"
    );
    return;
  }

  // Default to "feature" spec type if not specified
  const specType = event.data.specType ?? "feature";

  // Verify slash command exists
  const commandPath = join(
    run.project.path,
    ".claude",
    "commands",
    "cmd",
    `generate-${specType}-spec.md`
  );

  if (!existsSync(commandPath)) {
    throw new Error(
      `Spec command not found: /cmd:generate-${specType}-spec\n` +
        `Expected file: ${commandPath}\n` +
        `Available spec types can be found in .claude/commands/cmd/`
    );
  }

  // Generate spec file
  logger.info({ runId: run.id, specType }, "Generating spec file");

  const specFile = await resolveSpecFile(event, step);

  if (event.data) {
    event.data.specFile = specFile;
  }

  logger.info({ runId: run.id, specFile }, "Spec file generated");
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Resolve file path relative to project directory.
 * Handles both absolute and relative paths.
 */
function resolveProjectPath(projectPath: string, filePath: string): string {
  return isAbsolute(filePath) ? filePath : resolve(projectPath, filePath);
}

/**
 * Resolve spec file by generating it via agent step.
 * Handles both fresh generation and resuming from planning session.
 */
async function resolveSpecFile(
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
