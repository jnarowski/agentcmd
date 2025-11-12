import { createWorkflowEvent } from "@/server/domain/workflow/services";
import { broadcastWorkflowEvent } from "@/server/domain/workflow/services/events/broadcastWorkflowEvent";
import type { RuntimeContext } from "@/server/domain/workflow/types/engine.types";
import { updateWorkflowStep } from "@/server/domain/workflow/services/steps/updateWorkflowStep";
import { WorkflowWebSocketEventTypes } from "@/shared/types/websocket.types";

/**
 * Update workflow execution step status and create event
 *
 * @param context - Runtime context
 * @param stepId - Step ID
 * @param status - New status
 * @param args - Optional args data (arguments passed to step)
 * @param output - Optional output data (result from step execution)
 * @param error - Optional error message
 */
export async function updateStepStatus(
  context: RuntimeContext,
  stepId: string,
  status: "pending" | "running" | "completed" | "failed",
  args?: unknown,
  output?: unknown,
  error?: string
): Promise<void> {
  const { runId, projectId, logger } = context;

  // Update step using domain service
  const step = await updateWorkflowStep({
    stepId,
    status,
    args,
    output,
    errorMessage: error,
    startedAt: status === "running" ? new Date() : undefined,
    completedAt:
      status === "completed" || status === "failed" ? new Date() : undefined,
    logger,
  });

  // Create event only for failed steps (skip step_started and step_completed)
  if (status === "failed") {
    const eventData = {
      title: `Step Failed: ${step.name}`,
      body: `Step "${step.name}" failed${error ? `: ${error}` : ""}`,
      stepId,
      error,
    };

    await createWorkflowEvent({
      workflow_run_id: runId,
      event_type: "step_failed",
      event_data: eventData,
      phase: step.phase,
      logger,
    });
  }

  // Emit step:updated WebSocket event
  const changes: Record<string, unknown> = { status };
  if (status === "running" && step.started_at) {
    changes.started_at = step.started_at;
  }
  if ((status === "completed" || status === "failed") && step.completed_at) {
    changes.completed_at = step.completed_at;
  }
  if (status === "failed" && error) {
    changes.error_message = error;
  }
  if (args !== undefined && step.args) {
    changes.args = step.args;
  }
  if (output !== undefined && step.output) {
    changes.output = step.output;
  }

  broadcastWorkflowEvent(projectId, {
    type: WorkflowWebSocketEventTypes.STEP_UPDATED,
    data: {
      run_id: runId,
      step_id: stepId,
      changes,
    },
  });

  logger.info(
    { runId, stepId, stepName: step.name, status, phase: step.phase },
    `Step ${status}`
  );
}
