import { prisma } from '@/shared/prisma';
import type { WorkflowEvent } from '@prisma/client';

/**
 * Get events for a workflow execution or specific step
 * Includes: created_by_user, artifacts (attached to event)
 * Orders by created_at asc
 */
export async function getWorkflowEvents(
  runId: string,
  stepId?: string
): Promise<WorkflowEvent[]> {
  const events = await prisma.workflowEvent.findMany({
    where: {
      workflow_run_id: runId,
      ...(stepId && { workflow_run_step_id: stepId }),
    },
    include: {
      created_by_user: {
        select: {
          id: true,
          email: true,
        },
      },
      artifacts: true,
    },
    orderBy: { created_at: 'asc' },
  });

  return events;
}
