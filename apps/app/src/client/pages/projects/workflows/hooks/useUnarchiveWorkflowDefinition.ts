import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import { toast } from 'sonner';
import type { WorkflowDefinition } from '../types';
import { workflowKeys } from './queryKeys';

interface UnarchiveWorkflowDefinitionResponse {
  data: WorkflowDefinition;
}

async function unarchiveWorkflowDefinition(definitionId: string): Promise<WorkflowDefinition> {
  const response = await api.patch<UnarchiveWorkflowDefinitionResponse>(
    `/api/workflow-definitions/${definitionId}/unarchive`
  );
  return response.data;
}

export function useUnarchiveWorkflowDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unarchiveWorkflowDefinition,
    onSuccess: (data) => {
      // Invalidate all workflow definition queries for this project (active + archived)
      if (data.project_id) {
        const baseKey = workflowKeys.definitions();
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            // Match ["workflows", "definitions", projectId, ...any status]
            return key[0] === baseKey[0] &&
                   key[1] === baseKey[1] &&
                   key[2] === data.project_id;
          },
        });
      }
      toast.success(`"${data.name}" unarchived successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unarchive workflow');
    },
  });
}
