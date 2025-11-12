/**
 * TanStack Query mutation hook for rescanning tasks
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/client/utils/api";

/**
 * Trigger task rescan (clears server cache and rescans all projects)
 */
async function rescanTasks(): Promise<void> {
  await api.post("/api/tasks/rescan");
}

/**
 * Hook to rescan tasks (clear server cache and refetch from all projects)
 */
export function useRescanTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rescanTasks,
    onSuccess: () => {
      // Invalidate tasks query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tasks rescanned");
    },
    onError: (error) => {
      console.error("Failed to rescan tasks:", error);
      toast.error("Failed to rescan tasks");
    },
  });
}
