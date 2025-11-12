import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import { toast } from "sonner";
import { workflowKeys } from "./queryKeys";

interface ResyncDiff {
  new: Array<{ id: string; name: string }>;
  updated: Array<{ id: string; name: string }>;
  archived: Array<{ id: string; name: string }>;
  errors: Array<{ id: string; name: string; error: string }>;
}

interface ResyncResponse {
  data: {
    summary: {
      total: number;
      new: number;
      updated: number;
      archived: number;
      errors: number;
    };
    workflows: ResyncDiff;
  };
}

async function resyncWorkflows() {
  const response = await api.post<ResyncResponse>(
    "/api/workflow-definitions/resync"
  );
  return response.data;
}

/**
 * Hook to resync workflow definitions from filesystem
 * Reloads workflows without restarting the server
 */
export function useResyncWorkflows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resyncWorkflows,
    onSuccess: (data) => {
      // Invalidate all workflow definition queries
      queryClient.invalidateQueries({ queryKey: workflowKeys.definitions() });

      // Build toast message
      const parts = [];
      if (data.summary.new > 0) parts.push(`${data.summary.new} new`);
      if (data.summary.updated > 0) parts.push(`${data.summary.updated} updated`);
      if (data.summary.archived > 0) parts.push(`${data.summary.archived} archived`);
      if (data.summary.errors > 0) parts.push(`${data.summary.errors} errors`);

      const message = parts.length > 0
        ? `${parts.join(", ")}`
        : "No workflow changes detected";

      toast.success(`Workflows resynced: ${message}`);

      if (data.summary.errors > 0) {
        // Show error details
        data.workflows.errors.forEach((error) => {
          toast.error(`${error.name}: ${error.error}`);
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to resync workflows");
    },
  });
}
