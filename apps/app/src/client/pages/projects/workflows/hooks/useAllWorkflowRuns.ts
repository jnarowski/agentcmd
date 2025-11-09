import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import type { WorkflowRunListItem } from '../types';
import { workflowKeys } from './queryKeys';

interface WorkflowRunsResponse {
  data: WorkflowRunListItem[];
}

async function fetchAllWorkflowRuns(status?: string | string[]): Promise<WorkflowRunListItem[]> {
  const params = new URLSearchParams();
  if (status) {
    // If array, join with comma; otherwise use as-is
    const statusParam = Array.isArray(status) ? status.join(',') : status;
    params.append('status', statusParam);
  }

  const url = `/api/workflow-runs${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.get<WorkflowRunsResponse>(url);
  return response.data;
}

/**
 * Fetch all workflow runs for the current user (across all projects)
 * Used for user-wide views like sidebar activities
 */
export function useAllWorkflowRuns(status?: string | string[]) {
  return useQuery({
    queryKey: workflowKeys.allRuns(),
    queryFn: () => fetchAllWorkflowRuns(status),
  });
}
