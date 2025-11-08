import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import type { WorkflowDefinition } from '../types';

interface WorkflowDefinitionsResponse {
  data: WorkflowDefinition[];
}

async function fetchWorkflowDefinitions(
  projectId: string,
  status?: 'active' | 'archived'
): Promise<WorkflowDefinition[]> {
  const params = new URLSearchParams();
  if (status) {
    params.append('status', status);
  }

  const url = `/api/projects/${projectId}/workflow-definitions${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.get<WorkflowDefinitionsResponse>(url);
  return response.data;
}

export function useWorkflowDefinitions(projectId: string, status?: 'active' | 'archived') {
  return useQuery({
    queryKey: ['workflow-definitions', projectId, status],
    queryFn: () => fetchWorkflowDefinitions(projectId, status),
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
  });
}
