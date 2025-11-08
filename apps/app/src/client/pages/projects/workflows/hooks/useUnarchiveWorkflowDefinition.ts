import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import { toast } from 'sonner';
import type { WorkflowDefinition } from '../types';

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
      // Invalidate all workflow-definitions queries for this project
      queryClient.invalidateQueries({
        queryKey: ['workflow-definitions'],
      });
      toast.success(`"${data.name}" unarchived successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unarchive workflow');
    },
  });
}
