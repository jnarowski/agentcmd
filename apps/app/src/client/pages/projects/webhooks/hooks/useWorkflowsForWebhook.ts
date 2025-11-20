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
      const result = await api.get(`/api/projects/${projectId}/workflows/definitions`);

      // Filter out archived workflows
      return result.data.filter((wf: WorkflowDefinition) => !wf.is_archived);
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
