import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import type { WorkflowRunListItem, WorkflowFilter } from '../types';

interface WorkflowRunsResponse {
  data: WorkflowRunListItem[];
}

async function fetchWorkflowRuns(
  projectId: string,
  filter?: WorkflowFilter
): Promise<WorkflowRunListItem[]> {
  const params = new URLSearchParams();
  params.append('project_id', projectId);

  if (filter?.status) {
    params.append('status', filter.status);
  }
  if (filter?.search) {
    params.append('search', filter.search);
  }
  if (filter?.definitionId) {
    params.append('definition_id', filter.definitionId);
  }

  const response = await api.get<WorkflowRunsResponse>(
    `/api/workflow-runs?${params.toString()}`
  );
  return response.data;
}

export function useWorkflowRuns(
  projectId: string,
  filter?: WorkflowFilter
) {
  return useQuery({
    queryKey: ['workflow-runs', projectId, filter],
    queryFn: () => fetchWorkflowRuns(projectId, filter),
    refetchInterval: 10000, // 10 seconds as fallback if WebSocket disconnects
    enabled: !!projectId,
  });
}
