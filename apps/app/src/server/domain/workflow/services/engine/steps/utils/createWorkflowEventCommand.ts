import type { RuntimeContext } from "../../../../types/engine.types";
import { createWorkflowEvent } from "../../../events/createWorkflowEvent";

/**
 * Create a workflow event for command execution
 *
 * Logs state-changing commands (git, npm, etc.) to the workflow timeline
 * with execution details (command, args, duration, exit code).
 *
 * @param context - Runtime context with runId, phase, logger
 * @param command - Command name (e.g., "git", "npm", "gh")
 * @param args - Command arguments array
 * @param duration - Execution duration in milliseconds
 * @param exitCode - Command exit code (default: 0 for success)
 */
export async function createWorkflowEventCommand(
  context: RuntimeContext,
  command: string,
  args: string[],
  duration: number,
  exitCode: number = 0
): Promise<void> {
  const { runId, currentPhase, logger } = context;

  await createWorkflowEvent({
    workflow_run_id: runId,
    event_type: "command_executed",
    event_data: {
      title: "Command executed",
      body: `${command} ${args.join(" ")}`,
      command,
      args,
      exitCode,
      duration,
    },
    phase: currentPhase,
    logger,
  });
}
