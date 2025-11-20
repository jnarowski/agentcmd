import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import { webhookKeys } from "./queryKeys";

interface WorkflowDefinition {
  id: string;
  identifier: string;
  name: string;
  description: string | null;
  is_archived: boolean;
}

/**
 * Fetch all non-archived workflow definitions for a project
 * Used in webhook form to select target workflow
 */
export function useWorkflowsForWebhook(projectId: string | undefined) {
  return useQuery({
    queryKey: webhookKeys.workflows(projectId!),
    queryFn: async (): Promise<WorkflowDefinition[]> => {
      const response = await api.get<{ data: WorkflowDefinition[] }>(`/api/projects/${projectId}/workflows/definitions`);

      // Filter out archived workflows
      return response.data.filter((wf) => !wf.is_archived);
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
