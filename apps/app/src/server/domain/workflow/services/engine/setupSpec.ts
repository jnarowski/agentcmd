import type { WorkflowStep, WorkflowEvent } from "agentcmd-workflows";
import { type CmdGenerateSpecResponse } from "agentcmd-workflows";
import type { FastifyBaseLogger } from "fastify";
import type { WorkflowRun } from "@prisma/client";
import type { GetStepTools } from "inngest";
import { getSpecCommand } from "../getSpecCommand";
import { existsSync } from "fs";
import { resolve, isAbsolute, basename } from "path";
import { createWorkflowEvent } from "@/server/domain/workflow/services/events/createWorkflowEvent";
import { SYSTEM_PHASES } from "@/shared/constants/workflow";

/**
 * Setup spec file for workflow execution.
 * Ensures spec file exists and returns its absolute path.
 *
 * **Behavior:**
 * - If `event.data.specFile` exists: Verifies file exists, throws if not found
 * - Otherwise: Generates spec using `/cmd:generate-{specType}-spec` command
 * - Defaults to `specType: "feature"` if not specified
 * - Validates that required slash command exists before generation
 *
 * @returns Absolute path to spec file
 */
export async function setupSpec(params: {
  run: WorkflowRun & { project: { path: string } };
  event: WorkflowEvent;
  step: WorkflowStep;
  logger: FastifyBaseLogger;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>;
}): Promise<string | null> {
  const { run, event, step, logger, inngestStep } = params;

  // Guard: Skip if event has no data payload
  if (!event.data) {
    return null;
  }

  // CASE 1: Spec file already provided - verify it exists (memoized to prevent replay errors)
  if (event.data.specFile) {
    return await inngestStep.run("verify-spec-file", async () => {
      // Use workingDir (worktree) if available, otherwise fall back to project path
      const basePath = event.data.workingDir ?? run.project.path;

      // Convert relative paths to absolute
      // event.data.specFile is relative to .agent/specs/ (e.g., "todo/251117.../spec.md")
      const specFilePath = resolveProjectPath(
        basePath,
        `.agent/specs/${event.data.specFile}`
      );

      if (!existsSync(specFilePath)) {
        throw new Error(`Spec file not found: ${event.data.specFile}`);
      }

      const specFileName = basename(specFilePath);
      await createWorkflowEvent({
        workflow_run_id: run.id,
        event_type: "annotation_added",
        event_data: { message: `Spec file verified: ${specFileName}` },
        phase: SYSTEM_PHASES.setup.id,
        logger,
      });

      return specFilePath;
    });
  }

  // CASE 2: No spec file - generate one via AI agent

  // Determine which type of spec to generate (feature, bug, prd, etc.)
  // Defaults to "feature" if not specified
  const specType = event.data.specType ?? "feature";

  // Verify the slash command exists before calling agent (memoized for retry safety)
  // Command format: /cmd:generate-{specType}-spec
  // Example: /cmd:generate-feature-spec, /cmd:generate-bug-spec
  await inngestStep.run("validate-spec-command", () => {
    const basePath = event.data.workingDir ?? run.project.path;
    const commandPath = `${basePath}/.claude/commands/cmd/generate-${specType}-spec.md`;

    if (!existsSync(commandPath)) {
      throw new Error(
        `Spec command not found: /cmd:generate-${specType}-spec\n` +
          `Expected file: ${commandPath}\n` +
          `Available spec types can be found in .claude/commands/cmd/`
      );
    }
  });

  // Call agent to generate spec - handles both fresh generation and resuming from planning
  const specFile = await generateSpecFileWithAgent(event, step);

  return specFile;
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
 * Generate spec file using AI agent.
 * Handles two generation modes:
 * 1. Resume from planning session (uses existing session context)
 * 2. Fresh generation (uses provided spec content as context)
 *
 * @returns Absolute path to generated spec file
 * @throws Error if generation fails or no spec_file returned
 */
async function generateSpecFileWithAgent(
  event: WorkflowEvent,
  step: WorkflowStep
): Promise<string> {
  const {
    specFile,
    planningSessionId,
    specType,
    specCommandOverride,
    specContent,
    workingDir,
  } = event.data;
  // Guard: If spec file already exists, return it
  if (specFile) {
    return specFile;
  }

  const appendSystemPrompt =
    "CRITICAL: You are in an automated workflow. Users CANNOT respond to questions. Make all decisions autonomously using existing patterns and best practices. Document assumptions.";

  // Determine which slash command to use for generation
  // specType: Type of spec to generate (e.g., "feature", "bug", "prd", "issue")
  //   - Determines which .claude/commands/cmd/generate-{specType}-spec.md file to use
  //   - Examples: "feature" → /cmd:generate-feature-spec
  //              "bug" → /cmd:generate-bug-spec
  //              "prd" → /cmd:generate-prd-spec
  //
  // getSpecCommand(specType): Converts spec type to slash command format
  //   Input:  "feature"
  //   Output: "/cmd:generate-feature-spec"
  // specCommandOverride: Allows manually specifying a different command (bypasses type mapping)
  const command = specCommandOverride ?? getSpecCommand(specType ?? "feature");

  // MODE 1: Resume from existing planning session
  // Uses session history as context for spec generation
  if (planningSessionId) {
    const response = await step.agent<CmdGenerateSpecResponse>(
      "Generating Spec From Planning Session",
      {
        agent: "claude", // Use Claude for spec generation
        json: true, // Expect structured JSON response
        prompt: command,
        resume: planningSessionId, // Resume from this session
        workingDir,
        appendSystemPrompt,
      }
    );

    // Validate response contains spec file path
    if (!response.data?.spec_file) {
      throw new Error(
        `Spec generation failed: Planning session ${planningSessionId} did not return a spec_file. ` +
          `This may happen if the planning session was interrupted or didn't complete spec generation.`
      );
    }

    return response.data.spec_file;
  }

  const prompt = `${command} '${specContent}'`;

  await step.log("Generating spec from provided context, prompt:", prompt);

  // MODE 2: Fresh spec generation
  // Uses provided spec content/context as input
  const response = await step.agent<CmdGenerateSpecResponse>(
    "Generate Spec From Provided Context",
    {
      agent: "claude",
      json: true, // Expect structured JSON response with spec_file path
      prompt,
      workingDir,
      appendSystemPrompt,
    }
  );

  // Validate response contains spec file path
  if (!response.data?.spec_file) {
    throw new Error(
      `Spec generation failed: The generate-${specType ?? "feature"}-spec command did not return a spec_file. ` +
        `Check the command output for errors.`
    );
  }

  return response.data.spec_file;
}
