import { prisma } from '@/shared/prisma';
import type { WorkflowRun } from '@prisma/client';
import type { UpdateWorkflowRunOptions } from '../../types/UpdateWorkflowRunOptions';

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

  // TODO: Add WebSocket broadcasting when event bus is available
  // eventBus.emit('workflow.run.updated', { runId, data });

  return run;
}
