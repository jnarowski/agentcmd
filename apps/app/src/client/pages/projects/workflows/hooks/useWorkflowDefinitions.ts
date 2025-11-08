import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import type { WorkflowDefinition } from '../types';

interface WorkflowDefinitionsResponse {
  data: WorkflowDefinition[];
}

async function fetchWorkflowDefinitions(projectId: string): Promise<WorkflowDefinition[]> {
  const response = await api.get<WorkflowDefinitionsResponse>(
    `/api/projects/${projectId}/workflow-definitions`
  );
  return response.data;
}

export function useWorkflowDefinitions(projectId: string) {
  return useQuery({
    queryKey: ['workflow-definitions', projectId],
    queryFn: () => fetchWorkflowDefinitions(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
  });
}
