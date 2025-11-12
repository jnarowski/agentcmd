import { getWorkflowRuns } from './getWorkflowRuns';
import type { WorkflowRun } from '@prisma/client';
import type { WorkflowStatus } from '../../types/workflow.types';

/**
 * Get all workflow runs for a user (optionally filtered by project)
 *
 * Used for user-wide views like sidebar activities.
 * Returns same optimized data as getWorkflowRuns.
 */
export async function getAllWorkflowRuns({
  userId,
  projectId,
  status,
}: {
  userId: string;
  projectId?: string;
  status?: WorkflowStatus | WorkflowStatus[];
}): Promise<WorkflowRun[]> {
  return getWorkflowRuns({
    user_id: userId,
    project_id: projectId,
    status
  });
}
