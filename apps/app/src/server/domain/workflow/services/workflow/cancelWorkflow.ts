import { prisma } from "@/shared/prisma";
import type { WorkflowRun } from "@prisma/client";
import { createWorkflowEvent } from "../events/createWorkflowEvent";
import { broadcastWorkflowEvent } from "../events/broadcastWorkflowEvent";
import type { CancelWorkflowOptions } from "@/server/domain/workflow/types/CancelWorkflowOptions";
import { WorkflowWebSocketEventTypes } from "@/shared/types/websocket.types";

/**
 * Cancels a workflow execution
 * Updates status to 'cancelled' and sets cancelled_at timestamp
 * Also cancels any pending/running steps
 */
export async function cancelWorkflow({ runId, userId, reason, logger, workflowClient }: CancelWorkflowOptions
): Promise<WorkflowRun> {
  const cancelledAt = new Date();

  // Update run and cancel all pending/running steps in a transaction
  const [execution] = await prisma.$transaction([
    prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: "cancelled",
        cancelled_at: cancelledAt,
      },
    }),
    prisma.workflowRunStep.updateMany({
      where: {
        workflow_run_id: runId,
        status: { in: ["pending", "running"] },
      },
      data: {
        status: "cancelled",
        completed_at: cancelledAt,
      },
    }),
  ]);

  // Send Inngest cancel event to terminate running workflow
  try {
    await workflowClient.send({
      name: "workflow/cancel",
      data: {
        runId,
        reason,
        userId,
        cancelledAt: cancelledAt.toISOString(),
      },
    });
    logger?.info({ runId }, "Sent Inngest cancel event");
  } catch (error) {
    logger?.error({ error, runId }, "Failed to send Inngest cancel event");
    // Don't throw - DB update already succeeded, graceful degradation
  }

  // Create workflow_cancelled event
  await createWorkflowEvent({
    workflow_run_id: runId,
    event_type: "workflow_cancelled",
    event_data: {
      title: "Cancelled",
      body: reason || "Workflow execution cancelled",
      reason,
    },
    created_by_user_id: userId,
    created_at: cancelledAt,
    logger,
  });

  // Emit WebSocket event for real-time updates
  broadcastWorkflowEvent(execution.project_id, {
    type: WorkflowWebSocketEventTypes.RUN_UPDATED,
    data: {
      run_id: execution.id,
      project_id: execution.project_id,
      changes: {
        status: 'cancelled',
      },
    },
  });

  return execution;
}
