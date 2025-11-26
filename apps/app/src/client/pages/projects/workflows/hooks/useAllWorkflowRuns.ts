import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import type { WorkflowRunListItem } from '../types';
import { workflowKeys } from './queryKeys';

interface WorkflowRunsResponse {
  data: WorkflowRunListItem[];
}

async function fetchAllWorkflowRuns(
  status?: string | string[],
  projectId?: string | null
): Promise<WorkflowRunListItem[]> {
  const params = new URLSearchParams();
  if (status) {
    // If array, join with comma; otherwise use as-is
    const statusParam = Array.isArray(status) ? status.join(',') : status;
    params.append('status', statusParam);
  }
  if (projectId) {
    params.append('project_id', projectId);
  }

  const url = `/api/workflow-runs${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.get<WorkflowRunsResponse>(url);
  return response.data;
}

/**
 * Fetch workflow runs for the current user (optionally filtered by project)
 * Used for user-wide views like sidebar activities
 */
export function useAllWorkflowRuns(status?: string | string[], projectId?: string | null) {
  return useQuery({
    queryKey: workflowKeys.allRuns(status, projectId),
    queryFn: () => fetchAllWorkflowRuns(status, projectId),
  });
}
