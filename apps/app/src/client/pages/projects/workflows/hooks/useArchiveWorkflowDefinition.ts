import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import { toast } from 'sonner';
import type { WorkflowDefinition } from '../types';
import { workflowKeys } from './queryKeys';

interface ArchiveWorkflowDefinitionResponse {
  data: WorkflowDefinition;
}

async function archiveWorkflowDefinition(definitionId: string): Promise<WorkflowDefinition> {
  const response = await api.patch<ArchiveWorkflowDefinitionResponse>(
    `/api/workflow-definitions/${definitionId}/archive`
  );
  return response.data;
}

export function useArchiveWorkflowDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveWorkflowDefinition,
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
      toast.success(`"${data.name}" archived successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive workflow');
    },
  });
}
