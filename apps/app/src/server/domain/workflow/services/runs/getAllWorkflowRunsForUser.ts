import { getWorkflowRuns } from './getWorkflowRuns';
import type { WorkflowRun } from '@prisma/client';

/**
 * Get all workflow runs for a user across all projects
 * Used in sidebar activities to avoid N+1 queries
 */
export async function getAllWorkflowRunsForUser(
  userId: string
): Promise<WorkflowRun[]> {
  return await getWorkflowRuns({ user_id: userId });
}
