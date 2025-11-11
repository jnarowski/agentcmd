import { prisma } from "@/shared/prisma";
import type { WorkflowRun } from "@prisma/client";
import { createWorkflowEvent } from "../events/createWorkflowEvent";
import { broadcastWorkflowEvent } from "../events/broadcastWorkflowEvent";
import type { ResumeWorkflowOptions } from "@/server/domain/workflow/types/ResumeWorkflowOptions";
import { WorkflowWebSocketEventTypes } from "@/shared/types/websocket.types";

/**
 * STUB: Resume a paused workflow execution (future implementation)
 * Currently just updates status to 'running'
 * Logs warning that resume not implemented
 */
export async function resumeWorkflow({ runId, userId, logger }: ResumeWorkflowOptions
): Promise<WorkflowRun> {
  logger?.warn({ runId }, "Resume workflow not implemented - stubbed");

  const resumedAt = new Date();
  const execution = await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: "running",
      paused_at: null, // Clear paused_at when resuming
    },
  });

  // Create workflow_resumed event
  await createWorkflowEvent({
    workflow_run_id: runId,
    event_type: "workflow_resumed",
    event_data: {
      title: "Resumed",
      body: "Workflow execution resumed",
    },
    created_by_user_id: userId,
    created_at: resumedAt,
    logger,
  });

  // Emit WebSocket event immediately for real-time updates
  broadcastWorkflowEvent(execution.project_id, {
    type: WorkflowWebSocketEventTypes.RUN_UPDATED,
    data: {
      run_id: execution.id,
      project_id: execution.project_id,
      changes: {
        status: 'running',
      },
    },
  });

  // Future: Resume execution from checkpoint
  return execution;
}
