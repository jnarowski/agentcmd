import { prisma } from "@/shared/prisma";
import type { WorkflowRun } from "@prisma/client";
import { createWorkflowEvent } from "../events/createWorkflowEvent";
import { broadcastWorkflowEvent } from "../events/broadcastWorkflowEvent";
import type { CancelWorkflowOptions } from "@/server/domain/workflow/types/CancelWorkflowOptions";

/**
 * Cancels a workflow execution
 * Updates status to 'cancelled' and sets cancelled_at timestamp
 */
export async function cancelWorkflow({ runId, userId, reason, logger }: CancelWorkflowOptions
): Promise<WorkflowRun> {
  const cancelledAt = new Date();
  const execution = await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: "cancelled",
      cancelled_at: cancelledAt,
    },
  });

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
    type: 'workflow:run:updated',
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
