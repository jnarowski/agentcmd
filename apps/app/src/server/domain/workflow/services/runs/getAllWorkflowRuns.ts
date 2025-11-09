import { getWorkflowRuns } from './getWorkflowRuns';
import type { WorkflowRun } from '@prisma/client';
import type { WorkflowStatus } from '../../types/workflow.types';

/**
 * Get all workflow runs for a user (across all projects)
 *
 * Used for user-wide views like sidebar activities.
 * Returns same optimized data as getWorkflowRuns but without project filtering.
 */
export async function getAllWorkflowRuns({
  userId,
  status,
}: {
  userId: string;
  status?: WorkflowStatus | WorkflowStatus[];
}): Promise<WorkflowRun[]> {
  return getWorkflowRuns({ user_id: userId, status });
}
