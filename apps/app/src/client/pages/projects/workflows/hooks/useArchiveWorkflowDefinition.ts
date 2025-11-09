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
      // Invalidate workflow definitions for this project
      if (data.project_id) {
        queryClient.invalidateQueries({
          queryKey: workflowKeys.definitionsList(data.project_id),
        });
      }
      toast.success(`"${data.name}" archived successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive workflow');
    },
  });
}
