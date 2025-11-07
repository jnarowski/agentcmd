import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api-client';
import type { WorkflowDefinition } from '../types';

interface WorkflowDefinitionsResponse {
  data: WorkflowDefinition[];
}

async function fetchWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  const response = await api.get<WorkflowDefinitionsResponse>(
    '/api/workflow-definitions'
  );
  return response.data;
}

export function useWorkflowDefinitions() {
  return useQuery({
    queryKey: ['workflow-definitions'],
    queryFn: fetchWorkflowDefinitions,
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
  });
}
