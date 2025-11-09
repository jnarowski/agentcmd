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
      // Invalidate workflow definitions for this project
      if (data.project_id) {
        queryClient.invalidateQueries({
          queryKey: workflowKeys.definitionsList(data.project_id),
        });
      }
      toast.success(`"${data.name}" unarchived successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unarchive workflow');
    },
  });
}
