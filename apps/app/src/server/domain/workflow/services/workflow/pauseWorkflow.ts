import { prisma } from "@/shared/prisma";
import type { WorkflowRun } from "@prisma/client";
import { createWorkflowEvent } from "../events/createWorkflowEvent";
import { broadcastWorkflowEvent } from "../events/broadcastWorkflowEvent";
import type { PauseWorkflowOptions } from "@/server/domain/workflow/types/PauseWorkflowOptions";
import { WorkflowWebSocketEventTypes } from "@/shared/types/websocket.types";

/**
 * Pauses a running workflow execution
 * Updates status to 'paused' and sets paused_at timestamp
 */
export async function pauseWorkflow({ runId, userId, logger }: PauseWorkflowOptions): Promise<WorkflowRun> {
  const pausedAt = new Date();
  const execution = await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: "paused",
      paused_at: pausedAt,
    },
  });

  // Create workflow_paused event
  await createWorkflowEvent({
    workflow_run_id: runId,
    event_type: "workflow_paused",
    event_data: {
      title: "Paused",
      body: "Workflow execution paused",
    },
    created_by_user_id: userId,
    created_at: pausedAt,
    logger,
  });

  // Emit WebSocket event immediately for real-time updates
  broadcastWorkflowEvent(execution.project_id, {
    type: WorkflowWebSocketEventTypes.RUN_UPDATED,
    data: {
      run_id: execution.id,
      project_id: execution.project_id,
      changes: {
        status: 'paused',
      },
    },
  });

  return execution;
}
