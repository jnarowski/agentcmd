import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import type { WorkflowDefinition } from '../types';

interface WorkflowDefinitionResponse {
  data: WorkflowDefinition;
}

async function fetchWorkflowDefinition(
  definitionId: string
): Promise<WorkflowDefinition> {
  const response = await api.get<WorkflowDefinitionResponse>(
    `/api/workflow-definitions/${definitionId}`
  );
  return response.data;
}

export function useWorkflowDefinition(definitionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-definition', definitionId],
    queryFn: () => fetchWorkflowDefinition(definitionId!),
    staleTime: 5 * 60 * 1000, // 5 minutes - definitions rarely change
    enabled: !!definitionId,
  });
}
