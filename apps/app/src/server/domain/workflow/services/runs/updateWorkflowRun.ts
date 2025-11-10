import { prisma } from '@/shared/prisma';
import type { WorkflowRun } from '@prisma/client';
import type { UpdateWorkflowRunOptions } from '../../types/UpdateWorkflowRunOptions';
import { broadcastWorkflowEvent } from '../events/broadcastWorkflowEvent';

/**
 * Update workflow run fields
 * Supports partial updates (e.g., current_phase, status, error_message)
 * Includes WebSocket broadcasting for real-time updates
 */
export async function updateWorkflowRun({
  runId,
  data,
  logger,
}: UpdateWorkflowRunOptions): Promise<WorkflowRun> {
  logger?.debug(
    { runId, updates: Object.keys(data) },
    'Updating workflow run'
  );

  const run = await prisma.workflowRun.update({
    where: { id: runId },
    data,
  });

  logger?.debug({ runId }, 'Workflow run updated');

  // Broadcast status change to WebSocket clients
  broadcastWorkflowEvent(run.project_id, {
    type: 'workflow:run:updated',
    data: {
      run_id: run.id,
      project_id: run.project_id,
      // @ts-ignore - Prisma WorkflowRunUpdateInput type incompatibility
      changes: data,
    },
  });

  return run;
}
