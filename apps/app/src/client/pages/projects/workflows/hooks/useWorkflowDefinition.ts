import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import type { WorkflowDefinition } from '../types';
import { workflowKeys } from './queryKeys';

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
    queryKey: definitionId ? workflowKeys.definition(definitionId) : ['workflow-definition'],
    queryFn: () => fetchWorkflowDefinition(definitionId!),
    enabled: !!definitionId,
  });
}
